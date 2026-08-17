// The record of a REJECTED sign-in, for both gates.
//
// Why this exists: only successful logins reach the `viewers` table, so a
// rejection left no trace and "it won't let me in" was undiagnosable — we could
// not tell a wrong code (re-issue it) from no code at all (they never got one)
// from our own secret being unset (nobody is getting in and it is our fault).
// The data room gate already built that line, but it went to `console.warn`,
// whose only destination is Cloudflare's ephemeral tail stream — which nobody
// collects, so in practice the line did not exist.
//
// Where it goes now: the kernelbot-api (exposed as api.sno.llc, tunnelled to
// http://api:3010 via cloudflared-web), which owns the logs and the Slack bot. A
// Worker cannot reach either from the edge, so this is a thin PASSTHROUGH with a
// shared-secret header, the same shape as workers/dataroom-gate/src/override.ts
// and workers/link/src/store.ts. The console.warn stays — it costs nothing and
// is still what `wrangler tail` shows while you are watching a live deploy.
//
// Endpoint contract (both repos must match exactly):
//   POST ${GATE_API_BASE}/gate/denied   header x-gate-secret: <GATE_DENIAL_SECRET>
//     body  { gate: "deck"|"dataroom", email, reason, ref }
//     200   recorded
//     400/401/503  malformed / bad secret / secret unset on the api side
//
// Failure mode: THE GATE NEVER WAITS AND NEVER FAILS. The report is handed to
// ctx.waitUntil so it runs after the visitor's response is already on the wire,
// it is bounded by REPORT_TIMEOUT_MS so a wedged api cannot pin a Worker
// instance, and every error — no secret, network, timeout, non-2xx — is logged
// and dropped. A visitor's 400 gate page is identical whether this succeeds,
// fails, or is not configured at all.
//
// NEVER send the submitted credential. The email, the gate, the reason and the
// attribution ref are what a denial is diagnosed from; the code or password is
// not, and an endpoint that never receives it cannot leak it.

const DEFAULT_API_BASE = "https://api.sno.llc";
const DENIED_PATH = "/gate/denied";

// Generous for a same-region round trip, short enough that a wedged api cannot
// hold a Worker instance open — the same reasoning as the link store's
// READ_TIMEOUT_MS. Nothing waits on this, so the only cost of the ceiling is a
// dropped report.
const REPORT_TIMEOUT_MS = 2000;

/** The config this module needs off a gate's Env. Both optional: until the var
 * and the secret are provisioned, denials simply are not reported. */
export interface DenyReportEnv {
  GATE_API_BASE?: string;
  GATE_DENIAL_SECRET?: string;
}

export interface GateDenial {
  /** Which gate turned them away — the two share this endpoint. */
  gate: "deck" | "dataroom";
  /** The normalized address they signed in with. */
  email: string;
  /** Why, in the vocabulary of the gate: `code-mismatch`, `code-missing`,
   * `secret-unset`, `override-mismatch` (data room) / `password-mismatch`,
   * `password-missing`, `password-unset` (deck). */
  reason: string;
  /** The attribution ref they arrived with, when the gate has one. */
  ref?: string | null;
}

async function send(env: DenyReportEnv, denial: GateDenial): Promise<void> {
  const base = (env.GATE_API_BASE ?? DEFAULT_API_BASE).replace(/\/+$/, "");
  const res = await fetch(base + DENIED_PATH, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-gate-secret": env.GATE_DENIAL_SECRET as string,
    },
    body: JSON.stringify({
      gate: denial.gate,
      email: denial.email,
      reason: denial.reason,
      ref: denial.ref ?? null,
    }),
    signal: AbortSignal.timeout(REPORT_TIMEOUT_MS),
  });
  if (!res.ok) {
    throw new Error(`api answered ${res.status}`);
  }
}

/**
 * Record a denial: one local log line, plus a fire-and-forget report to the
 * kernelbot-api. Returns nothing and throws nothing — a caller can put this on
 * the line before `return gateResponse(...)` without changing what the visitor
 * sees.
 *
 * `ctx` is the Worker's ExecutionContext; passing it is what keeps the request
 * alive past the response so the POST actually leaves the edge. Omitting it
 * (a unit test) still works — the promise is simply unsupervised.
 */
export function reportDenial(
  env: DenyReportEnv,
  denial: GateDenial,
  ctx?: ExecutionContext,
): void {
  console.warn(
    JSON.stringify({
      event: "gate_denied",
      gate: denial.gate,
      email: denial.email,
      submittedRef: denial.ref ?? null,
      reason: denial.reason,
    }),
  );

  // No secret provisioned → reporting is off. Not an error: the gate works
  // exactly as it did before this module existed.
  if (!env.GATE_DENIAL_SECRET) return;

  const posted = send(env, denial).catch((err) => {
    // Losing a denial report must be visible in `wrangler tail` even though it
    // is never visible to the visitor — a silent drop here would recreate the
    // blind spot this module exists to close.
    console.error("gate denial report failed:", String(err));
  });
  ctx?.waitUntil(posted);
}
