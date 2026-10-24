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
  /** Airtable's error code from the body, e.g. INVALID_FILTER_BY_FORMULA. */
  readonly type: string;

  constructor(status: number, path: string, body: string) {
    super(`Airtable ${status} on ${path}: ${body.slice(0, 200)}`);
    this.status = status;
    this.path = path;
    this.type = errorType(body);
  }

  /** "Airtable 429 RATE_LIMIT_REACHED": the small print on an error page. */
  get label(): string {
    return ["Airtable", this.status, this.type].filter(Boolean).join(" ");
  }
}

/** The code out of any of Airtable's three error shapes: `{error: "CODE"}`,
 * `{error: {type: "CODE"}}` and `{errors: [{error: "CODE"}]}`. */
function errorType(body: string): string {
  let parsed: {
    error?: string | { type?: unknown };
    errors?: { error?: unknown }[];
  } | null;
  try {
    parsed = JSON.parse(body);
  } catch {
    return ""; // Not JSON (a proxy's HTML page): the status alone says it.
  }
  const code =
    typeof parsed?.error === "string"
      ? parsed.error
      : (parsed?.error?.type ?? parsed?.errors?.[0]?.error);
  return typeof code === "string" ? code : "";
}

/** A 429 that outlasted every retry. */
export function isRateLimited(err: unknown): boolean {
  return err instanceof AirtableError && err.status === 429;
}

export interface Clock {
  now(): number;
  sleep(ms: number): Promise<void>;
}

/** The wall clock. Mutable so a test can swap in a virtual one rather than
 * really waiting out the pacing. */
export const clock: Clock = {
  now: () => Date.now(),
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
};

/** Airtable allows five requests a second per base, and a 429 locks the base
 * out for thirty seconds. Every call waits its turn, at most four a second,
 * which leaves room for KB's own jobs on the same base. */
export const CALL_SPACING_MS = 250;
/** The waits before each retry of a 429 when Airtable sends no Retry-After. */
const RETRY_DELAYS_MS = [1_000, 2_000, 4_000, 8_000];
/** All the 429 waiting one request may do, so the page still answers well
 * inside the time a person (and the Worker) will wait. */
export const RETRY_BUDGET_MS = 15_000;

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

/** Airtable refuses a URL over 16,000 characters; this leaves a margin. */
export const MAX_URL_LENGTH = 15_000;
/** A page holds at most 100 records, so a bigger chunk only adds offset pages. */
const PAGE_SIZE = 100;
/** Room for the offset a later page of a lookup carries. */
const OFFSET_ALLOWANCE = 100;

/** How many ids one OR(RECORD_ID()=…) lookup can carry: as many as fit under
 * the URL cap, given the URL with no ids and the longest id, up to one page. */
export function idsPerLookup(emptyUrlLength: number, idLength: number): number {
  const perId =
    new URLSearchParams({
      f: `RECORD_ID()='${"r".repeat(idLength)}',`,
    }).toString().length - "f=".length;
  const fit = Math.floor((MAX_URL_LENGTH - emptyUrlLength) / perId);
  return Math.max(1, Math.min(PAGE_SIZE, fit));
}

export class Airtable {
  private readonly token: string;
  private readonly fetchImpl: typeof fetch;
  private readonly base: string;
  /** When the next call may start. One instance serves one request, so this is
   * the per-request limiter, and it holds across lookups run side by side. */
  private nextCallAt = 0;
  private retryBudgetMs = RETRY_BUDGET_MS;

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

  /** Waits for this call's slot. The slot is claimed before the wait, so calls
   * started together still go out CALL_SPACING_MS apart. */
  private async turn(): Promise<void> {
    const now = clock.now();
    const at = Math.max(now, this.nextCallAt);
    this.nextCallAt = at + CALL_SPACING_MS;
    if (at > now) await clock.sleep(at - now);
  }

  /** One paced request, retried on a 429 while the retry budget lasts. */
  private async call<T>(
    path: string,
    init: RequestInit = {},
    host: string = API,
  ): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      await this.turn();
      const response = await this.fetchImpl(`${host}${path}`, {
        ...init,
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/json",
          ...(init.headers ?? {}),
        },
      });
      if (response.ok) return (await response.json()) as T;
      const error = new AirtableError(
        response.status,
        path,
        await response.text(),
      );
      const wait =
        response.status === 429 ? retryWait(response, attempt) : null;
      if (wait === null || wait > this.retryBudgetMs) throw error;
      this.retryBudgetMs -= wait;
      console.warn(
        JSON.stringify({
          event: "followup_airtable_retry",
          status: error.status,
          type: error.type,
          path: path.split("?")[0],
          attempt: attempt + 1,
          waitMs: wait,
        }),
      );
      await clock.sleep(wait);
    }
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
      query.set("pageSize", String(PAGE_SIZE));
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
    const lookup = (chunk: string[], offset?: string): string => {
      const query = new URLSearchParams({
        filterByFormula: `OR(${chunk.map((id) => `RECORD_ID()='${id}'`).join(",")})`,
        pageSize: String(PAGE_SIZE),
      });
      for (const field of fields) query.append("fields[]", field);
      if (offset) query.set("offset", offset);
      return `/${this.base}/${table}?${query}`;
    };
    const size = idsPerLookup(
      `${API}${lookup([])}`.length + OFFSET_ALLOWANCE,
      Math.max(0, ...unique.map((id) => id.length)),
    );
    const chunks: string[][] = [];
    for (let i = 0; i < unique.length; i += size) {
      chunks.push(unique.slice(i, i + size));
    }
    const records: AirtableRecord[] = [];
    for (const chunk of chunks) {
      let offset: string | undefined;
      do {
        const page = await this.call<{
          records: AirtableRecord[];
          offset?: string;
        }>(lookup(chunk, offset));
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

/** How long to wait before retrying a 429: Retry-After when Airtable sends one,
 * else the next step of the backoff; null once the steps run out. */
function retryWait(response: Response, attempt: number): number | null {
  if (attempt >= RETRY_DELAYS_MS.length) return null;
  const seconds = Number(response.headers.get("Retry-After"));
  return seconds > 0 ? seconds * 1000 : RETRY_DELAYS_MS[attempt];
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
