// Authenticated encryption for the two cookies this worker sets: the session
// (which carries the user's Airtable tokens) and the short-lived OAuth state.
// AES-256-GCM under a key derived from FOLLOWUP_SESSION_SECRET and a purpose
// label, so a sealed OAuth-state value can never be replayed as a session.
//
// Value format: base64url(12-byte IV || ciphertext+tag). The payload carries its
// own expiry; open() refuses anything past it, so a copied cookie stops working
// server-side whatever the browser's Max-Age says.

const enc = new TextEncoder();
const dec = new TextDecoder();

export function base64url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function fromBase64url(value: string): Uint8Array {
  const b64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

export function randomToken(byteLength = 32): string {
  return base64url(crypto.getRandomValues(new Uint8Array(byteLength)));
}

async function keyFor(secret: string, purpose: string): Promise<CryptoKey> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    enc.encode(`followup:${purpose}:${secret}`),
  );
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
}

export async function seal(
  payload: { exp: number },
  secret: string,
  purpose: string,
): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      await keyFor(secret, purpose),
      enc.encode(JSON.stringify(payload)),
    ),
  );
  const out = new Uint8Array(iv.length + ciphertext.length);
  out.set(iv);
  out.set(ciphertext, iv.length);
  return base64url(out);
}

/** The payload, or null for anything tampered, sealed for another purpose,
 * malformed, or past its `exp` (epoch ms). */
export async function open<T extends { exp: number }>(
  value: string,
  secret: string,
  purpose: string,
  now: number = Date.now(),
): Promise<T | null> {
  try {
    const bytes = fromBase64url(value);
    if (bytes.length < 13) return null;
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: bytes.slice(0, 12) },
      await keyFor(secret, purpose),
      bytes.slice(12),
    );
    const payload = JSON.parse(dec.decode(plain)) as T;
    if (typeof payload?.exp !== "number" || payload.exp <= now) return null;
    return payload;
  } catch {
    // A failed GCM tag check throws; so does bad base64 or JSON. All of them
    // mean "no valid cookie", which the caller answers with a sign-in.
    return null;
  }
}
