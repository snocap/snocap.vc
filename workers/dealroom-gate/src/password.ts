const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32Encode(bytes: Uint8Array): string {
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

export function refFromEmail(email: string): string {
  return email
    .split("@")[0]
    .replace(/[^a-z0-9]/gi, "")
    .toLowerCase();
}

// password = base32(HMAC-SHA256(secret, email|ref)).slice(0, 8) — deterministic
// for a stable (email, ref) pair, so it can be re-derived on demand instead of
// stored. Same shape as deck-gate's HMAC cookie signing, different secret.
export async function derivePassword(
  email: string,
  ref: string,
  secret: string,
): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    enc.encode(`${email.trim().toLowerCase()}|${ref}`),
  );
  return base32Encode(new Uint8Array(sig)).slice(0, 8);
}
