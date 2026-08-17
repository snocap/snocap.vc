// The link store, reached over HTTP instead of a KV binding.
//
// Why not KV: the store now lives in the kernelbot-host Redis (namespace
// `link:slug:<slug>`), the same place the data room override moved to, so a
// short link is visible to and creatable by the agent stack — not sealed inside
// a Worker-only KV namespace. A Cloudflare Worker cannot open a raw TCP Redis
// connection from the edge, so this module is a thin PASSTHROUGH: it POSTs to
// the kernelbot-api (exposed as api.sno.llc, tunnelled to http://api:3010 via
// cloudflared-web), which owns the Redis read/write. It mirrors the shape of
// workers/dataroom-gate/src/override.ts, down to the shared-secret header.
//
// Endpoint contract (both repos must match exactly):
//   POST ${LINK_API_BASE}/link/resolve   header x-link-secret: <LINK_API_SECRET>
//     body   { slug }
//     200 { found: false }                 → no live record (unknown OR expired)
//     200 { found: true, record: {...} }   → the stored record (see field names below)
//   POST ${LINK_API_BASE}/link/create     header x-link-secret: <LINK_API_SECRET>
//     body   { slug, destination, createdBy, expiresAt }
//     200/201 { created: true }            → stored
//     409                                  → a LIVE record already holds the slug
//
// FIELD NAMES. The api is the owner of this vocabulary: a record is FLAT and its
// target is `destination`. This worker calls the same thing `url` internally, so
// the translation happens HERE, at the one boundary, rather than leaking either
// name into the other codebase. That split is not academic — the two repos
// shipped for weeks disagreeing about it (this worker sent a NESTED
// `{ slug, record: { url } }`), so every create was rejected 400 and every
// resolve decoded to null. Both test suites were green the whole time, because
// each mocked the other with its OWN shape. If you change a field name here,
// change src/local/api/routes/link.ts in kernelbot in the same breath, and make
// at least one test assert the literal bytes on the wire.
//
// Expiry is authoritative server-side: the api's resolve route drops a record
// whose expiresAt has passed (returning found:false) and enforces the
// check-then-set for create (409 only when the existing record is still live —
// an expired slug is claimable). The Worker keeps its own isExpired guard on
// read as defense-in-depth, so a record is never trusted past its date even if
// the api mis-serves it.
//
// Read failure mode: FAIL to a miss, never a redirect. Every failure — a miss,
// an unreachable api, a timeout, a 5xx, a malformed body — resolves to null, and
// handleRedirect turns null into the same uniform 302-to-home a genuine miss
// returns. A public redirect has nothing safe to fail open to: a 301 minted
// during a transient outage would be cached into a permanently wrong redirect,
// so an outage MUST degrade to the temporary miss, not a cached one.
import { decodeRecord } from "./links.ts";
import type { LinkRecord } from "./links.ts";

// The default kernelbot-api origin. Overridable via LINK_API_BASE so a test or a
// staging deploy can point elsewhere without a code change.
const DEFAULT_API_BASE = "https://api.sno.llc";
const RESOLVE_PATH = "/link/resolve";
const CREATE_PATH = "/link/create";

// A public redirect must not hang on a slow api. 2s is generous for a
// same-region round trip and short enough that a wedged api degrades to the
// uniform miss instead of holding the visitor's request open.
const READ_TIMEOUT_MS = 2000;
// The create path can wait a little longer — it is one authenticated admin, not
// a public redirect, and a false "store unavailable" is worse there than a brief
// pause.
const WRITE_TIMEOUT_MS = 5000;

export interface StoreEnv {
  /** The kernelbot-api origin. Optional — defaults to https://api.sno.llc. */
  LINK_API_BASE?: string;
  /** Shared secret sent as x-link-secret, mirroring the apply/override workers. */
  LINK_API_SECRET: string;
}

function apiBase(env: StoreEnv): string {
  return (env.LINK_API_BASE ?? DEFAULT_API_BASE).replace(/\/+$/, "");
}

function authHeaders(secret: string): HeadersInit {
  return { "Content-Type": "application/json", "x-link-secret": secret };
}

/**
 * Translate an api record into this worker's vocabulary: `destination` is the
 * api's name for the target, `url` is ours. Returns the input untouched when it
 * isn't an object, so decodeRecord still owns every validity decision and a
 * malformed body stays a plain miss.
 */
function fromApiRecord(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const record = raw as Record<string, unknown>;
  // Prefer our own name if the api ever sends both (it did during the
  // compatibility window), so this keeps working from either side.
  return { ...record, url: record.url ?? record.destination };
}

/**
 * Resolve a slug to its record. Returns null for EVERY failure mode — not-found,
 * an expired record the api has already dropped, a malformed body, a timeout, a
 * network error, any non-2xx — so the caller can render the one uniform miss.
 */
export async function readLink(
  env: StoreEnv,
  slug: string,
): Promise<LinkRecord | null> {
  let res: Response;
  try {
    res = await fetch(apiBase(env) + RESOLVE_PATH, {
      method: "POST",
      headers: authHeaders(env.LINK_API_SECRET),
      body: JSON.stringify({ slug }),
      signal: AbortSignal.timeout(READ_TIMEOUT_MS),
    });
  } catch {
    return null; // network error or timeout → miss
  }

  if (!res.ok) return null; // 5xx, 4xx, anything → miss

  let data: { found?: boolean; record?: unknown };
  try {
    data = (await res.json()) as { found?: boolean; record?: unknown };
  } catch {
    return null; // non-JSON body → miss
  }

  if (!data || data.found !== true) return null;

  const record = decodeRecord(fromApiRecord(data.record));
  if (!record) {
    // found:true but the record does not parse — a real anomaly (bad write),
    // not an ordinary miss. Log it, then treat it as a miss like the KV version
    // treated an unreadable value.
    console.error(
      "link: unreadable record from api, treating as a miss:",
      slug,
    );
    return null;
  }
  return record;
}

/** The outcome of a create: stored, refused because the slug is live, or the
 * store could not be reached / errored. */
export type CreateResult = "ok" | "conflict" | "error";

/**
 * Store a record for a slug. The api owns the check-then-set: it answers 409
 * when a LIVE record already holds the slug (an expired one is claimable), so
 * the atomicity KV never had now lives server-side. Returns "conflict" for that
 * 409, "error" for an unreachable / non-2xx store (the admin is told to retry —
 * a create has no safe silent fallback), and "ok" when stored.
 */
export async function createLink(
  env: StoreEnv,
  slug: string,
  record: LinkRecord,
): Promise<CreateResult> {
  let res: Response;
  try {
    res = await fetch(apiBase(env) + CREATE_PATH, {
      method: "POST",
      headers: authHeaders(env.LINK_API_SECRET),
      // FLAT, and `destination` not `url` — the api's vocabulary. `createdAt` is
      // deliberately not sent: the api stamps it, so there is one clock.
      body: JSON.stringify({
        slug,
        destination: record.url,
        createdBy: record.createdBy,
        expiresAt: record.expiresAt,
      }),
      signal: AbortSignal.timeout(WRITE_TIMEOUT_MS),
    });
  } catch {
    return "error";
  }

  if (res.status === 409) return "conflict";
  if (res.ok) return "ok";
  return "error";
}
