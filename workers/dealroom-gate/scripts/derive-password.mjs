#!/usr/bin/env node
// On-demand password lookup for LPs — mirrors src/password.ts's formula so KB
// (or a partner) can hand out a dealroom password without storing one. Reads
// the secret from DEALROOM_PW_SECRET so it never needs to be pasted on the CLI.
import crypto from "node:crypto";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32Encode(bytes) {
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
  if (bits > 0) output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  return output;
}

function refFromEmail(email) {
  return email
    .split("@")[0]
    .replace(/[^a-z0-9]/gi, "")
    .toLowerCase();
}

const [, , email, refArg] = process.argv;
if (!email) {
  console.error("usage: derive-password.mjs <email> [ref]");
  process.exit(1);
}

const secret = process.env.DEALROOM_PW_SECRET;
if (!secret) {
  console.error("DEALROOM_PW_SECRET is not set in the environment");
  process.exit(1);
}

const ref = refArg || refFromEmail(email);
const hmac = crypto
  .createHmac("sha256", secret)
  .update(`${email.trim().toLowerCase()}|${ref}`)
  .digest();

console.log(base32Encode(hmac).slice(0, 8));
