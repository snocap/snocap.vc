// The Airtable REST calls this tool makes, every one with the signed-in user's
// own OAuth token. There is no fallback credential: what the user's account
// cannot see, this client cannot fetch.

import { AIRTABLE } from "./config.ts";

const API = "https://api.airtable.com/v0";
/** uploadAttachment lives on its own host. */
const CONTENT_API = "https://content.airtable.com/v0";

export class AirtableError extends Error {
  readonly status: number;
  readonly path: string;

  constructor(status: number, path: string, body: string) {
    super(`Airtable ${status} on ${path}: ${body.slice(0, 200)}`);
    this.status = status;
    this.path = path;
  }
}

export interface AirtableRecord {
  id: string;
  createdTime?: string;
  fields: Record<string, unknown>;
}

export interface AirtableComment {
  id: string;
  author: { id: string; email?: string; name?: string };
  text: string;
  createdTime: string;
  /** The users and groups the text mentions as `@[usr…]`, keyed by id. */
  mentioned?: Record<
    string,
    { id: string; type: string; displayName?: string; email?: string }
  >;
}

export interface AirtableField {
  name: string;
  type?: string;
  options?: { choices?: unknown[] };
}

/** Records per OR(RECORD_ID()=…) lookup; keeps the formula well inside the
 * URL length Airtable accepts. */
const IDS_PER_LOOKUP = 40;

export class Airtable {
  private readonly token: string;
  private readonly fetchImpl: typeof fetch;
  private readonly base: string;

  // fetchImpl is resolved at call time, not bound here, so a test that stubs
  // globalThis.fetch after construction still reaches the stub.
  constructor(
    token: string,
    fetchImpl?: typeof fetch,
    base: string = AIRTABLE.base,
  ) {
    this.token = token;
    this.fetchImpl = fetchImpl ?? ((input, init) => fetch(input, init));
    this.base = base;
  }

  private async call<T>(
    path: string,
    init: RequestInit = {},
    host: string = API,
  ): Promise<T> {
    const response = await this.fetchImpl(`${host}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
      },
    });
    if (!response.ok) {
      throw new AirtableError(response.status, path, await response.text());
    }
    return (await response.json()) as T;
  }

  whoami(): Promise<{ id: string; email?: string }> {
    return this.call("/meta/whoami");
  }

  /** Every record in a view, in the view's order, across pages. */
  async listView(
    table: string,
    view: string,
    fields: string[],
    maxRecords?: number,
  ): Promise<AirtableRecord[]> {
    const records: AirtableRecord[] = [];
    let offset: string | undefined;
    do {
      const query = new URLSearchParams({ view });
      for (const field of fields) query.append("fields[]", field);
      if (maxRecords) query.set("maxRecords", String(maxRecords));
      if (offset) query.set("offset", offset);
      const page = await this.call<{
        records: AirtableRecord[];
        offset?: string;
      }>(`/${this.base}/${table}?${query}`);
      records.push(...page.records);
      offset = page.offset;
    } while (offset);
    return records;
  }

  getRecord(table: string, id: string): Promise<AirtableRecord> {
    return this.call(`/${this.base}/${table}/${encodeURIComponent(id)}`);
  }

  /** The named records, fetched a chunk at a time. Order is not preserved. */
  async recordsByIds(
    table: string,
    ids: string[],
    fields: string[],
  ): Promise<AirtableRecord[]> {
    const unique = [...new Set(ids)].filter((id) => /^rec\w+$/.test(id));
    const chunks: string[][] = [];
    for (let i = 0; i < unique.length; i += IDS_PER_LOOKUP) {
      chunks.push(unique.slice(i, i + IDS_PER_LOOKUP));
    }
    // One chunk at a time: Airtable allows five requests a second per base, and
    // a 429 costs a thirty-second lockout.
    const records: AirtableRecord[] = [];
    for (const chunk of chunks) {
      let offset: string | undefined;
      do {
        const query = new URLSearchParams({
          filterByFormula: `OR(${chunk.map((id) => `RECORD_ID()='${id}'`).join(",")})`,
        });
        for (const field of fields) query.append("fields[]", field);
        if (offset) query.set("offset", offset);
        const page = await this.call<{
          records: AirtableRecord[];
          offset?: string;
        }>(`/${this.base}/${table}?${query}`);
        records.push(...page.records);
        offset = page.offset;
      } while (offset);
    }
    return records;
  }

  async listComments(table: string, id: string): Promise<AirtableComment[]> {
    const comments: AirtableComment[] = [];
    let offset: string | undefined;
    do {
      const query = new URLSearchParams({ pageSize: "100" });
      if (offset) query.set("offset", offset);
      const page = await this.call<{
        comments: AirtableComment[];
        offset?: string | null;
      }>(`/${this.base}/${table}/${encodeURIComponent(id)}/comments?${query}`);
      comments.push(...page.comments);
      offset = page.offset ?? undefined;
    } while (offset);
    return comments;
  }

  createComment(
    table: string,
    id: string,
    text: string,
  ): Promise<AirtableComment> {
    return this.call(
      `/${this.base}/${table}/${encodeURIComponent(id)}/comments`,
      {
        method: "POST",
        body: JSON.stringify({ text }),
      },
    );
  }

  /** typecast stays off: a near-miss select label must fail, not mint an option. */
  updateRecord(
    table: string,
    id: string,
    fields: Record<string, unknown>,
  ): Promise<AirtableRecord> {
    return this.call(`/${this.base}/${table}/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify({ fields, typecast: false }),
    });
  }

  /** typecast stays off, as in updateRecord. */
  createRecord(
    table: string,
    fields: Record<string, unknown>,
  ): Promise<AirtableRecord> {
    return this.call(`/${this.base}/${table}`, {
      method: "POST",
      body: JSON.stringify({ fields, typecast: false }),
    });
  }

  /** Appends one file to a record's attachment field (Airtable's
   * uploadAttachment: base64 in JSON, at most 5 MB a file). */
  uploadAttachment(
    recordId: string,
    field: string,
    file: { contentType: string; filename: string; bytes: Uint8Array },
  ): Promise<unknown> {
    return this.call(
      `/${this.base}/${encodeURIComponent(recordId)}/${encodeURIComponent(field)}/uploadAttachment`,
      {
        method: "POST",
        body: JSON.stringify({
          contentType: file.contentType,
          filename: file.filename,
          file: base64(file.bytes),
        }),
      },
      CONTENT_API,
    );
  }

  /** A table's fields as the base schema describes them. */
  async tableFields(table: string): Promise<AirtableField[]> {
    const schema = await this.call<{
      tables: { id: string; fields: AirtableField[] }[];
    }>(`/meta/bases/${this.base}/tables`);
    return schema.tables.find((t) => t.id === table)?.fields ?? [];
  }
}

/** A select field's live option names. */
export function selectOptions(
  fields: AirtableField[],
  fieldName: string,
): string[] {
  const choices = fields.find((f) => f.name === fieldName)?.options?.choices;
  return (choices ?? [])
    .map((c) => (c as { name?: unknown }).name)
    .filter((n): n is string => typeof n === "string");
}

/** Bytes → base64, a chunk at a time so a 5 MB photo does not overflow the
 * argument list of String.fromCharCode. */
export function base64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}
