// ─────────────────────────────────────────────────────────────────────────────
// TEMPORARY per-email password override for the data room gate.
//
// Why this exists: the gate's default code is derived deterministically from the
// email alone (see password.ts). That is the right default, but a specific LP's
// derived code was causing friction (Philip Chow's diligence, Slack 2026-08-12),
// and a GP needs to be able to hand ONE person a manual password without changing
// the scheme for everyone else. This module is that override — additive and
// shadowing only. It never touches derivePassword().
//
// SUNSET CANDIDATE. This whole feature is scoped to Philip Chow's situation and is
// meant to be ripped out once his deal closes. To fully remove it: delete this
// file, its two call-sites in index.ts, and the [[kv_namespaces]] OVERRIDES
// binding in wrangler.toml. Nothing else depends on it.
//
// Storage: a Cloudflare KV namespace (binding OVERRIDES). The Slack ask said
// "redis", but this worker runs on Cloudflare Workers and cannot open a raw TCP
// connection to a Redis server; KV is the same Cloudflare account already in use
// and needs no new external signup. Values are the HASHED password only — never
// plaintext. The write path lives on the kernelbot side (a GP-gated capability);
// this module is read-only (verify on login).
//
// Hash format (shared with the kernelbot writer — keep the two in lockstep):
//   pbkdf2-sha256$<iterations>$<saltBase64>$<derivedKeyBase64>
// PBKDF2-HMAC-SHA256, 32-byte derived key, random 16-byte salt, compared in
// constant time. A pinned cross-repo vector in override.test.ts fails loudly if
// either side's format drifts.
// ─────────────────────────────────────────────────────────────────────────────

import { timingSafeEqual } from "../../shared/crypto.ts";
import { normalizeEmail } from "../../shared/email.ts";

// The KV key for an email's override. Keyed on the NORMALIZED email so the write
// and read sides agree regardless of case/whitespace.
const KV_PREFIX = "pw-override:";

// OWASP 2023 floor for PBKDF2-HMAC-SHA256. Logins are infrequent, so this is a
// non-issue for latency and buys margin against offline cracking of the KV blob.
export const OVERRIDE_ITERATIONS = 210_000;
const KEY_LEN = 32; // bytes

// The minimum shape we need off the KV binding. Cloudflare's real KVNamespace
// satisfies this (its text .get returns Promise<string | null>); typing it this
// narrowly keeps the worker free of @cloudflare/workers-types.
export interface OverrideKV {
  get(key: string): Promise<string | null>;
}

function b64encode(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function b64decode(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function pbkdf2(
  password: string,
  salt: Uint8Array,
  iterations: number,
): Promise<Uint8Array> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    keyMaterial,
    KEY_LEN * 8,
  );
  return new Uint8Array(bits);
}

// Hash a password with a fresh random salt into the shared encoded form. The
// production writer is the kernelbot-side capability; this is exported so the
// worker's own tests can mint a valid stored value without duplicating the
// format, which also documents exactly what the writer must produce.
export async function hashOverride(
  password: string,
  iterations: number = OVERRIDE_ITERATIONS,
): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await pbkdf2(password, salt, iterations);
  return `pbkdf2-sha256$${iterations}$${b64encode(salt)}$${b64encode(hash)}`;
}

// Verify a submitted password against a stored encoded hash. A malformed record
// verifies false (never throws) so a corrupt KV value can't 500 the gate.
export async function verifyOverride(
  password: string,
  stored: string,
): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2-sha256") return false;
  const iterations = Number(parts[1]);
  if (!Number.isInteger(iterations) || iterations <= 0) return false;
  let salt: Uint8Array;
  try {
    salt = b64decode(parts[2]);
  } catch {
    return false;
  }
  const actual = b64encode(await pbkdf2(password, salt, iterations));
  return timingSafeEqual(actual, parts[3]);
}

// The gate's entry point. Returns:
//   true  → an override exists for this email and the password matches
//   false → an override exists but the password does NOT match
//   null  → no override set for this email → caller falls through to the
//           unchanged derived-code path
//
// When an override IS set it is authoritative: a mismatch does NOT fall back to
// the derived code. Setting an override shadows the default for that email, which
// is exactly "prefer the override over the default password."
export async function checkEmailOverride(
  store: OverrideKV | undefined,
  email: string,
  password: string,
): Promise<boolean | null> {
  if (!store) return null;
  const stored = await store.get(KV_PREFIX + normalizeEmail(email));
  if (!stored) return null;
  if (!password) return false;
  return verifyOverride(password, stored);
}
