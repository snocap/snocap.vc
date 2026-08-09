#!/usr/bin/env node
// On-demand access-code lookup for deal room visitors, so KB (or a partner)
// can hand out a code without one ever being stored. It calls the worker's own
// derivePassword, so the code handed out and the code checked at the gate
// cannot drift apart.
//
// Needs the Node in .node-version (22.18+ / 23.6+) — it imports TypeScript
// directly, relying on built-in type stripping.
import { derivePassword } from "../src/password.ts";
import { normalizeEmail, refFromEmail } from "../../shared/email.ts";

const [, , emailArg, refArg] = process.argv;
if (!emailArg) {
  console.error("usage: derive-password.mjs <email> [ref]");
  process.exit(1);
}

const secret = process.env.DEALROOM_PW_SECRET;
if (!secret) {
  console.error("DEALROOM_PW_SECRET is not set in the environment");
  process.exit(1);
}

const email = normalizeEmail(emailArg);
const ref = refArg || refFromEmail(email);

console.log(await derivePassword(email, ref, secret));
