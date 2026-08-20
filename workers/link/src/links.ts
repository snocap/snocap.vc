// Link-record rules: slug and destination validation, expiry arithmetic, and
// record decoding. Deliberately free of the Workers runtime so `node --test` can
// exercise every rule without a network round trip. The store itself (read and
// write over the kernelbot-api) lives in store.ts.

/**
 * Paths the tool owns for itself. Only the ones the router actually serves
 * belong here: `create` is a live endpoint (`POST /link/create`) and `qr` is the
 * QR image endpoint (`GET /link/qr/<slug>.png`), so a link named either would
 * shadow one of them. The sign-in and form live at the bare `/link` root, which
 * has no slug, so nothing else needs reserving — a slug is otherwise free to be
 * anything (see `slugError`).
 */
export const RESERVED_SLUGS = new Set(["create", "qr", "peek"]);

/** How many `/`-separated segments a slug may carry. Mirrors MAX_SLUG_SEGMENTS
 * in kernelbot's src/local/api/link-store.ts, which is the store that enforces it. */
export const MAX_SLUG_SEGMENTS = 4;

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_PER_DAY = 86_400_000;

/** Hostname + path prefix of each surface this shortener answers on. */
const SHORTENER_SURFACES: [string, string][] = [
  ["snocap.vc", "/link"],
  ["sno.llc", "/r"],
];

export interface LinkRecord {
  url: string;
  /** Epoch ms at which the link dies, exclusive. `null` means permanent. */
  expiresAt: number | null;
  createdAt: number;
  createdBy: string;
}

/** Trims surrounding whitespace and slashes, then lowercases. Slugs are
 * case-insensitive because people retype them off a screen. */
export function normalizeSlug(raw: unknown): string {
  return (typeof raw === "string" ? raw : "")
    .trim()
    .replace(/^\/+|\/+$/g, "")
    .toLowerCase();
}

/**
 * The reason a slug is unusable, or null when it is fine. A slug may be almost
 * anything — letters, numbers, unicode, punctuation — so long as it survives a
 * URL round trip; it is escaped wherever it is rendered and percent-encoded
 * wherever it goes into a URL.
 *
 * A slug MAY nest: `deck/fund2` serves at snocap.vc/link/deck/fund2. Nesting is
 * spelled as segments joined by single slashes and checked SEGMENT BY SEGMENT,
 * which is what preserves the old no-slash rule's actual purpose — keeping `..`
 * and every traversal shape unrepresentable — now that the slash itself is legal.
 * An empty segment (a `//`, a trailing slash) is a missing segment, not a
 * permitted one, and `.`/`..` are refused by name.
 *
 * Only the FIRST segment is reserved-checked: the reserved names exist so a link
 * cannot shadow a path the tool serves itself, and those all root at the first
 * segment (`/link/create`, `/link/qr/<slug>.png`, `/link/peek`). `deck/create`
 * shadows nothing.
 */
export function slugError(slug: string): string | null {
  if (!slug) return "Choose a short path for the link.";
  const segments = slug.split("/");
  if (segments.length > MAX_SLUG_SEGMENTS) {
    return `A short path can be at most ${MAX_SLUG_SEGMENTS} segments deep.`;
  }
  for (const segment of segments) {
    if (!segment) return "A short path cannot have an empty segment.";
    if (segment === "." || segment === "..") {
      return 'A short path segment cannot be "." or "..".';
    }
    try {
      encodeURIComponent(segment);
    } catch {
      return "That short path has characters that cannot go in a URL.";
    }
  }
  if (RESERVED_SLUGS.has(segments[0])) return `"${segments[0]}" is reserved.`;
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

/**
 * The public short URL for a slug. One definition, because three places need to
 * agree on it: the success banner's text, the QR image the banner embeds, and the
 * payload encoded INTO that QR. If they ever drifted, a scan would land somewhere
 * other than the URL printed next to it.
 */
export function shortUrlFor(slug: string): string {
  return `https://snocap.vc/link/${slug}`;
}

/**
 * The durable URL of the slug's QR image. Percent-encoded because this one is
 * consumed as an `<img src>`, and a slug may legitimately contain characters that
 * would otherwise be read as URL syntax — a nested slug's own slashes included,
 * which is what keeps the QR path exactly two segments (`qr/<encoded>.png`) no
 * matter how deep the slug is.
 */
export function qrPathFor(slug: string): string {
  return `/link/qr/${encodeURIComponent(slug)}.png`;
}

export function isExpired(record: LinkRecord, now: number): boolean {
  return record.expiresAt !== null && now >= record.expiresAt;
}

/** Validates a record decoded from the api's JSON, returning null for anything
 * unreadable so the caller can treat corruption exactly like a miss. Takes the
 * already-parsed value (the api returns JSON, not a raw string), and trusts
 * nothing about its shape — a bad `url` must never reach a Location header. */
export function decodeRecord(raw: unknown): LinkRecord | null {
  const parsed = raw as Partial<LinkRecord> | null;
  if (!parsed || typeof parsed !== "object") return null;
  if (typeof parsed.url !== "string" || !parsed.url) return null;
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
