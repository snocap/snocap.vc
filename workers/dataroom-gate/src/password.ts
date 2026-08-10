import { base32Encode, hmacSha256 } from "../../shared/crypto.ts";
import { normalizeEmail } from "../../shared/email.ts";

// password = base32(HMAC-SHA256(secret, email)).slice(0, 8) — deterministic for
// a stable email, so it can be re-derived on demand instead of stored. Same
// primitive as the viewer cookie's signature, different secret.
//
// The code is keyed on the EMAIL alone. `ref` is attribution (who sent this
// person), never part of the credential, so the link someone clicks can no
// longer decide which code is valid. scripts/derive-password.mjs calls this
// exact function, so the code that hands a partner their access code can never
// drift from the code that checks it.
export async function derivePassword(
  email: string,
  secret: string,
): Promise<string> {
  const sig = await hmacSha256(normalizeEmail(email), secret);
  return base32Encode(sig).slice(0, 8);
}
