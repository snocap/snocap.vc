// Web Crypto helpers shared by the gate workers. Both gates sign with
// HMAC-SHA256 over the Workers runtime's `crypto.subtle`; only the secret and
// the message differ. Node 22.18+ runs these files directly (type stripping),
// which is what lets the unit tests and scripts/derive-password.mjs reuse them.

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export async function hmacSha256(
  data: string,
  secret: string,
): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return new Uint8Array(sig);
}

export async function hmacHex(data: string, secret: string): Promise<string> {
  const bytes = await hmacSha256(data, secret);
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Compares in constant time for equal-length inputs so a bad signature can't
// be recovered a character at a time from response timing.
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export async function verifyHmacHex(
  data: string,
  signature: string,
  secret: string,
): Promise<boolean> {
  return timingSafeEqual(await hmacHex(data, secret), signature);
}

// RFC 4648 base32 without padding. Used for the dataroom access code, which
// people read off a screen and type back in — base32 drops the characters
// that get confused by eye (0/O, 1/I).
export function base32Encode(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}
