// Files posted from a card. Any file Airtable accepts: screenshots mostly, but
// a PDF or a forwarded document goes the same way. With the user's own token
// they are saved on one new Interaction on the Campaign (Summary "New Interaction
// Attachment", Channel blank), and the comment that follows carries an @KB
// instruction to fill that record in. That comment is KB's only signal: it
// arrives through the ordinary Campaign comment intake (snocap/kernelbot,
// campaign-tracker), which reads the files and sets the Channel, date,
// Summary and Details, or folds them into an Interaction that already records
// the same exchange.

import { Airtable } from "./airtable.ts";
import { AIRTABLE, ATTACHMENT_LIMITS, FIELD } from "./config.ts";
import { dayValue, pacificDay } from "./dates.ts";

export const PLACEHOLDER_SUMMARY = "New Interaction Attachment";

/** The line every comment with attachments ends with, in Airtable's mention
 * form; Airtable shows it as "@Kernel Bottie extract …". */
export const EXTRACT_INSTRUCTION = `@[${AIRTABLE.kbUserId}] extract and update relevant information from recent interaction`;

export interface Upload {
  name: string;
  type: string;
  size: number;
  arrayBuffer(): Promise<ArrayBuffer>;
}

/** The files a submit carries; an empty file input sends one nameless 0-byte
 * part, which is not a file. */
export function uploadsOf(form: FormData): Upload[] {
  return form
    .getAll("files")
    .filter(
      (f): f is File => typeof f === "object" && f !== null && f.size > 0,
    );
}

/** Why these files cannot be posted, or null when they can. The page has
 * already shrunk images and refused the rest; this is the check that holds. */
export function uploadProblem(files: Upload[]): string | null {
  if (files.length > ATTACHMENT_LIMITS.maxFiles) {
    return `Attach at most ${ATTACHMENT_LIMITS.maxFiles} files at a time.`;
  }
  const big = files.find((f) => f.size > ATTACHMENT_LIMITS.maxBytes);
  return big
    ? `${big.name || "A file"} is over Airtable's 5 MB upload limit.`
    : null;
}

/** The comment a submit with attachments posts: what the user typed, if
 * anything, then the instruction on its own line. */
export function attachmentComment(typed: string): string {
  const text = typed.trim();
  return text ? `${text}\n${EXTRACT_INSTRUCTION}` : EXTRACT_INSTRUCTION;
}

/** The placeholder Interaction with the files on it. `onFile` hears each
 * file's 1-based number as its upload starts. Throws when Airtable refuses a
 * write. */
export async function saveAttachments(
  airtable: Airtable,
  campaign: string,
  files: Upload[],
  now: number,
  onFile: (n: number) => void = () => {},
): Promise<string> {
  // Who is posting, from Airtable itself rather than the session cookie.
  const user = await airtable.whoami();
  const record = await airtable.createRecord(AIRTABLE.interactions, {
    [FIELD.interactionCampaign]: [campaign],
    [FIELD.triggeredBy]: { id: user.id },
    [FIELD.occurredOn]: dayValue(pacificDay(now)),
    [FIELD.summary]: PLACEHOLDER_SUMMARY,
  });
  for (const [i, file] of files.entries()) {
    onFile(i + 1);
    await airtable.uploadAttachment(record.id, FIELD.attachments, {
      contentType: file.type || "application/octet-stream",
      filename: file.name || "attachment",
      bytes: new Uint8Array(await file.arrayBuffer()),
    });
  }
  return record.id;
}
