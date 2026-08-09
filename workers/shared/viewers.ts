// The `viewers` D1 table and its admin view, shared by both gates. Each gate
// binds its OWN database (deck-viewers / dataroom-viewers) — only the schema
// and the queries are shared, never the data.

export function escapeHtml(value: unknown): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export interface ViewerVisit {
  email: string;
  ref: string;
  request: Request;
}

// Best-effort: a viewer who got past the gate is let through even if the
// logging write fails. Losing a row is better than locking out an LP.
export async function logViewer(
  db: D1Database,
  { email, ref, request }: ViewerVisit,
): Promise<void> {
  try {
    await db
      .prepare(
        "INSERT INTO viewers (email, ref, user_agent, country) VALUES (?, ?, ?, ?)",
      )
      .bind(
        email,
        ref,
        request.headers.get("User-Agent") || "",
        (request.cf?.country as string) || "",
      )
      .run();
  } catch {
    // non-fatal: don't block access if D1 write fails
  }
}

export interface AdminOptions {
  path: string;
  db: D1Database;
  adminToken: string;
  title: string;
}

// Returns null when the request isn't for this worker's admin path, so the
// caller can fall through to its own routing.
export async function handleViewerAdmin(
  request: Request,
  { path, db, adminToken, title }: AdminOptions,
): Promise<Response | null> {
  const url = new URL(request.url);
  if (url.pathname !== path) return null;

  if (url.searchParams.get("token") !== adminToken) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { results } = await db
    .prepare(
      `SELECT email, MIN(viewed_at) as first_viewed, COUNT(*) as views, country, ref
     FROM viewers GROUP BY email ORDER BY MAX(viewed_at) DESC LIMIT 200`,
    )
    .all();

  const rows = (results || [])
    .map(
      (r: Record<string, unknown>) =>
        `<tr><td>${escapeHtml(r.email)}</td><td>${escapeHtml(r.first_viewed)}</td><td>${escapeHtml(r.views)}</td><td>${r.country ? escapeHtml(r.country) : "-"}</td><td>${r.ref ? escapeHtml(r.ref) : "-"}</td></tr>`,
    )
    .join("");

  return new Response(
    `<!doctype html><html><head><title>${escapeHtml(title)}</title>
<style>
  body { font-family: system-ui; background: #0a0a0a; color: #fff; padding: 40px; }
  h1 { font-weight: 300; margin-bottom: 24px; }
  table { border-collapse: collapse; width: 100%; }
  th, td { text-align: left; padding: 10px 16px; border-bottom: 1px solid #222; font-size: 14px; }
  th { color: #9f9f9f; text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em; }
</style></head><body>
<h1>${escapeHtml(title)}</h1>
<table><thead><tr><th>Email</th><th>First Viewed</th><th>Views</th><th>Country</th><th>Ref</th></tr></thead>
<tbody>${rows || "<tr><td colspan=5>No viewers yet</td></tr>"}</tbody></table>
</body></html>`,
    { headers: { "Content-Type": "text/html", "Cache-Control": "no-store" } },
  );
}
