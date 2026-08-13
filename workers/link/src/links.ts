// Link-record rules: slug and destination validation, expiry arithmetic, and
// the KV key. Deliberately free of the Workers runtime so `node --test` can
// exercise every rule without a KV binding.

/**
 * Paths the tool owns for itself. A stored link can never claim one, so a slug
 * cannot shadow the sign-in page or the create endpoint.
 */
export const RESERVED_SLUGS = new Set([
  "admin",
  "api",
  "create",
  "login",
  "logout",
  "new",
]);

// Conservative on purpose: no dots and no slashes, so `..` and any traversal
// shape fail the pattern outright rather than relying on path normalization.
const SLUG_PATTERN = /^[a-z0-9][a-z0-9_-]{0,63}$/;
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_PER_DAY = 86_400_000;

/** Hostname + path prefix of each surface this shortener answers on. */
const SHORTENER_SURFACES: [string, string][] = [
  ["snocap.vc", "/link"],
  ["www.snocap.vc", "/link"],
  ["sno.llc", "/r"],
  ["www.sno.llc", "/r"],
];

export interface LinkRecord {
  url: string;
  /** Epoch ms at which the link dies, exclusive. `null` means permanent. */
  expiresAt: number | null;
  createdAt: number;
  createdBy: string;
}

export function linkKey(slug: string): string {
  return `link:${slug}`;
}

/** Trims surrounding whitespace and slashes, then lowercases. Slugs are
 * case-insensitive because people retype them off a screen. */
export function normalizeSlug(raw: unknown): string {
  return (typeof raw === "string" ? raw : "")
    .trim()
    .replace(/^\/+|\/+$/g, "")
    .toLowerCase();
}

/** The reason a slug is unusable, or null when it is fine. */
export function slugError(slug: string): string | null {
  if (!slug) return "Choose a short path for the link.";
  if (!SLUG_PATTERN.test(slug)) {
    return "Use 1-64 characters — letters, numbers, hyphens or underscores, starting with a letter or number.";
  }
  if (RESERVED_SLUGS.has(slug)) return `"${slug}" is reserved.`;
  return null;
}

/**
 * Validates the destination. The scheme allowlist is the load-bearing part: a
 * redirector that echoes `javascript:` or `data:` into a Location header is an
 * XSS vector, not merely a bad link.
 */
export function parseTargetUrl(
  raw: unknown,
): { url: string } | { error: string } {
  const value = (typeof raw === "string" ? raw : "").trim();
  if (!value) return { error: "Enter the URL the link should point to." };

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return { error: "That is not a valid URL — include https://" };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { error: "Only http:// and https:// destinations are allowed." };
  }
  if (!parsed.hostname) return { error: "That URL has no host." };

  const host = parsed.hostname.toLowerCase();
  for (const [surfaceHost, prefix] of SHORTENER_SURFACES) {
    const onPrefix =
      parsed.pathname === prefix || parsed.pathname.startsWith(`${prefix}/`);
    if (host === surfaceHost && onPrefix) {
      return { error: "A short link cannot point at the shortener." };
    }
  }

  return { url: parsed.toString() };
}

/**
 * A submitted date means the END of that day in UTC: the link works through all
 * of YYYY-MM-DD and dies at 00:00:00Z the next day. One timezone, chosen so the
 * stored value is an absolute instant and the redirect path only ever compares
 * numbers.
 */
export function parseExpiry(
  raw: unknown,
  now: number,
): { expiresAt: number | null } | { error: string } {
  const value = (typeof raw === "string" ? raw : "").trim();
  if (!value) return { expiresAt: null };

  const match = DATE_PATTERN.exec(value);
  if (!match) return { error: "Use an expiration date in YYYY-MM-DD form." };

  const [, year, month, day] = match;
  const midnight = Date.UTC(Number(year), Number(month) - 1, Number(day));
  const asDate = new Date(midnight);
  // Date.UTC silently rolls 2026-02-30 forward into March, so round-trip the
  // parts to reject a date that does not exist.
  if (
    !Number.isFinite(midnight) ||
    asDate.getUTCFullYear() !== Number(year) ||
    asDate.getUTCMonth() !== Number(month) - 1 ||
    asDate.getUTCDate() !== Number(day)
  ) {
    return { error: "That is not a real date." };
  }

  const expiresAt = midnight + MS_PER_DAY;
  if (expiresAt <= now) {
    return { error: "That expiration date has already passed." };
  }
  return { expiresAt };
}

export function isExpired(record: LinkRecord, now: number): boolean {
  return record.expiresAt !== null && now >= record.expiresAt;
}

/**
 * KV's `expirationTtl` is the garbage collector, not the clock — its floor is
 * 60 seconds and deletion is eventual, so a link expiring in the next minute
 * would outlive its date if TTL were the only check. `isExpired` stays
 * authoritative on every read; this just stops dead keys accumulating.
 */
export function expirationTtl(
  expiresAt: number | null,
  now: number,
): number | undefined {
  if (expiresAt === null) return undefined;
  return Math.max(60, Math.ceil((expiresAt - now) / 1000));
}

/** Parses a stored record, returning null for anything unreadable so the
 * caller can treat corruption exactly like a miss. */
export function decodeRecord(raw: string | null): LinkRecord | null {
  if (!raw) return null;
  let parsed: Partial<LinkRecord>;
  try {
    parsed = JSON.parse(raw) as Partial<LinkRecord>;
  } catch {
    return null;
  }
  if (!parsed || typeof parsed.url !== "string" || !parsed.url) return null;
  return {
    url: parsed.url,
    expiresAt: typeof parsed.expiresAt === "number" ? parsed.expiresAt : null,
    createdAt: typeof parsed.createdAt === "number" ? parsed.createdAt : 0,
    createdBy: typeof parsed.createdBy === "string" ? parsed.createdBy : "",
  };
}

/**
 * Domain allowlist for who may sign in, on top of the shared access code.
 * An empty list allows any valid address — the list is a committed `[vars]`
 * entry, so "empty" is an explicit choice rather than a missing secret.
 */
export function emailAllowed(email: string, allowedDomains: unknown): boolean {
  const domains = (typeof allowedDomains === "string" ? allowedDomains : "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
  if (domains.length === 0) return true;
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  return domains.includes(domain);
}
