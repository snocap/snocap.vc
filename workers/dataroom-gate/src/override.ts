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
// file, its call-site in index.ts, and the OVERRIDE_API_BASE var + the
// DATAROOM_OVERRIDE_SECRET Worker secret. Nothing else depends on it.
//
// Storage: NOT here. The override lives in the kernelbot-host Redis and is checked
// server-side by the kernelbot-api container (exposed as api.sno.llc). This module
// is a thin PASSTHROUGH: it POSTs {email, password} to that endpoint and trusts its
// verdict. A Cloudflare Worker cannot open a raw TCP Redis connection, so rather
// than mirror the store in Cloudflare KV we call out to the host that already owns
// it. The PBKDF2 hashing + timing-safe compare that used to live here now live
// authoritatively server-side (kernelbot test/unit/local/dataroom-override.test.ts
// pins the hash vector).
//
// Endpoint contract (both repos must match exactly):
//   POST ${OVERRIDE_API_BASE}/dataroom/override-check
//   header  x-dataroom-secret: <DATAROOM_OVERRIDE_SECRET>   (mirrors x-apply-secret)
//   body    { email, password }
//   200 { override: false }                    → no override; fall through to derived
//   200 { override: true, match: <boolean> }   → override set; allow iff match
//   400/401                                    → bad request / bad secret
//
// Failure mode: FAIL-OPEN. A missing secret, network error, non-2xx response, or
// unparseable body all resolve to `null` (fall through to the derived code) — the
// same behavior the KV version had when its store was simply unbound: "override
// infra unavailable → everyone uses the derived code." That keeps a transient
// kernelbot-host outage from locking LPs out of the room; the derived code is a
// real credential, so this is not a security downgrade. The only property lost
// during an outage is the override's shadowing, which self-heals when the endpoint
// returns.
// ─────────────────────────────────────────────────────────────────────────────

// The default kernelbot-api origin. Overridable via the OVERRIDE_API_BASE var so a
// test or a staging deploy can point elsewhere without a code change.
const DEFAULT_API_BASE = "https://api.sno.llc";
const OVERRIDE_PATH = "/dataroom/override-check";

// The minimum config this module needs off the worker Env: the endpoint base and
// the shared secret it authenticates with. Both optional — absent until the var +
// secret are provisioned, in which case the gate falls through to the derived code
// for everyone.
export interface OverrideEnv {
  OVERRIDE_API_BASE?: string;
  DATAROOM_OVERRIDE_SECRET?: string;
}

// The endpoint's JSON verdict. `match` is only meaningful when `override` is true.
interface OverrideResponse {
  override?: boolean;
  match?: boolean;
}

// The gate's entry point. Returns:
//   true  → an override exists for this email and the password matches
//   false → an override exists but the password does NOT match
//   null  → no override set for this email (or the override infra is unavailable)
//           → caller falls through to the unchanged derived-code path
//
// When an override IS set it is authoritative: a mismatch returns false and does
// NOT fall back to the derived code. Setting an override shadows the default for
// that email, which is exactly "prefer the override over the default password."
export async function checkEmailOverride(
  env: OverrideEnv,
  email: string,
  password: string,
): Promise<boolean | null> {
  // No secret provisioned → override infra is off → fall through (see FAIL-OPEN).
  const secret = env.DATAROOM_OVERRIDE_SECRET;
  if (!secret) return null;

  const base = (env.OVERRIDE_API_BASE ?? DEFAULT_API_BASE).replace(/\/+$/, "");

  let res: Response;
  try {
    res = await fetch(base + OVERRIDE_PATH, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-dataroom-secret": secret,
      },
      body: JSON.stringify({ email, password }),
    });
  } catch {
    return null; // network error → fail open
  }

  if (!res.ok) return null; // 4xx/5xx (incl. a 400 on empty password) → fail open

  let data: OverrideResponse;
  try {
    data = (await res.json()) as OverrideResponse;
  } catch {
    return null; // non-JSON body → fail open
  }

  // No override for this email → fall through to the derived code.
  if (!data || data.override !== true) return null;
  // Override set → authoritative: allow iff the endpoint verified the password.
  return data.match === true;
}
