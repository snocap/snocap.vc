import { renderGatePage } from "./gate-page";
import { derivePassword, refFromEmail } from "./password";
import { listFolder, streamFile } from "./drive";

interface Env {
  DB: D1Database;
  HMAC_SECRET: string;
  ADMIN_TOKEN: string;
  DEALROOM_PW_SECRET: string;
  DEALROOM_SA_KEY: string;
  DRIVE_ROOT_FOLDER_ID: string;
}

const COOKIE_NAME = "dealroom_viewer";
const COOKIE_MAX_AGE = 60 * 60 * 24; // 24h — shorter-lived than deck's 30 days

async function hmacSign(data: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return [...new Uint8Array(sig)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hmacVerify(
  data: string,
  signature: string,
  secret: string,
): Promise<boolean> {
  const expected = await hmacSign(data, secret);
  if (expected.length !== signature.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return mismatch === 0;
}

function makeCookieValue(email: string, hmac: string): string {
  return btoa(email) + "." + hmac;
}

function parseCookieValue(
  value: string,
): { email: string; hmac: string } | null {
  const dot = value.indexOf(".");
  if (dot === -1) return null;
  try {
    const email = atob(value.slice(0, dot));
    const hmac = value.slice(dot + 1);
    if (!email || !hmac) return null;
    return { email, hmac };
  } catch {
    return null;
  }
}

function getCookie(request: Request, name: string): string | null {
  const header = request.headers.get("Cookie") || "";
  const match = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

async function verifiedEmailFromCookie(
  request: Request,
  secret: string,
): Promise<string | null> {
  const cookieRaw = getCookie(request, COOKIE_NAME);
  if (!cookieRaw) return null;
  const parsed = parseCookieValue(cookieRaw);
  if (!parsed) return null;
  const valid = await hmacVerify(parsed.email, parsed.hmac, secret);
  return valid ? parsed.email : null;
}

async function handleAdmin(
  request: Request,
  env: Env,
): Promise<Response | null> {
  const url = new URL(request.url);
  if (url.pathname !== "/dealroom/admin") return null;

  const token = url.searchParams.get("token");
  if (token !== env.ADMIN_TOKEN) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { results } = await env.DB.prepare(
    `SELECT email, MIN(viewed_at) as first_viewed, COUNT(*) as views, country, ref
     FROM viewers GROUP BY email ORDER BY MAX(viewed_at) DESC LIMIT 200`,
  ).all();

  const rows = (results || [])
    .map(
      (r: Record<string, unknown>) =>
        `<tr><td>${r.email}</td><td>${r.first_viewed}</td><td>${r.views}</td><td>${r.country || "—"}</td><td>${r.ref || "—"}</td></tr>`,
    )
    .join("");

  return new Response(
    `<!doctype html><html><head><title>Deal Room Viewers</title>
<style>
  body { font-family: system-ui; background: #0a0a0a; color: #fff; padding: 40px; }
  h1 { font-weight: 300; margin-bottom: 24px; }
  table { border-collapse: collapse; width: 100%; }
  th, td { text-align: left; padding: 10px 16px; border-bottom: 1px solid #222; font-size: 14px; }
  th { color: #9f9f9f; text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em; }
</style></head><body>
<h1>Deal Room Viewers</h1>
<table><thead><tr><th>Email</th><th>First Viewed</th><th>Views</th><th>Country</th><th>Ref</th></tr></thead>
<tbody>${rows || "<tr><td colspan=5>No viewers yet</td></tr>"}</tbody></table>
</body></html>`,
    { headers: { "Content-Type": "text/html", "Cache-Control": "no-store" } },
  );
}

async function handleApi(
  request: Request,
  env: Env,
  email: string,
): Promise<Response | null> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/dealroom/api/")) return null;

  if (!env.DEALROOM_SA_KEY) {
    return Response.json(
      { error: "Drive integration not configured yet" },
      { status: 503 },
    );
  }

  try {
    if (url.pathname === "/dealroom/api/list") {
      const folderId =
        url.searchParams.get("folder") || env.DRIVE_ROOT_FOLDER_ID;
      const { folder, files } = await listFolder(env.DEALROOM_SA_KEY, folderId);
      return Response.json({
        folder,
        files,
        isRoot: folderId === env.DRIVE_ROOT_FOLDER_ID,
      });
    }

    if (url.pathname === "/dealroom/api/file") {
      const fileId = url.searchParams.get("id");
      if (!fileId)
        return Response.json({ error: "missing id" }, { status: 400 });
      return await streamFile(env.DEALROOM_SA_KEY, fileId);
    }
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 502 });
  }

  return new Response("Not found", { status: 404 });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    const adminResponse = await handleAdmin(request, env);
    if (adminResponse) return adminResponse;

    if (!url.pathname.startsWith("/dealroom")) {
      return fetch(request);
    }

    // POST: gate form submission
    if (request.method === "POST" && url.pathname === "/dealroom") {
      const formData = await request.formData();
      const returnTo = (formData.get("return_to") as string) || "/dealroom";
      const safeReturn = returnTo.startsWith("/dealroom")
        ? returnTo
        : "/dealroom";
      const refField = (formData.get("ref") as string) || "";

      const email = ((formData.get("email") as string) || "")
        .trim()
        .toLowerCase();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return new Response(
          renderGatePage(
            "Please enter a valid email address.",
            returnTo,
            refField,
          ),
          {
            status: 400,
            headers: {
              "Content-Type": "text/html",
              "Cache-Control": "no-store",
            },
          },
        );
      }

      const ref = refField || refFromEmail(email);
      const password = (formData.get("password") as string) || "";
      const expected = await derivePassword(email, ref, env.DEALROOM_PW_SECRET);
      if (!env.DEALROOM_PW_SECRET || password !== expected) {
        return new Response(
          renderGatePage("Invalid access code.", returnTo, refField),
          {
            status: 400,
            headers: {
              "Content-Type": "text/html",
              "Cache-Control": "no-store",
            },
          },
        );
      }

      try {
        await env.DB.prepare(
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

      const hmac = await hmacSign(email, env.HMAC_SECRET);
      const headers = new Headers({ Location: safeReturn });
      headers.append(
        "Set-Cookie",
        `${COOKIE_NAME}=${encodeURIComponent(makeCookieValue(email, hmac))}; Path=/dealroom; Max-Age=${COOKIE_MAX_AGE}; Secure; SameSite=Lax; HttpOnly`,
      );
      return new Response(null, { status: 302, headers });
    }

    // Cookie is the sole bypass past this point — no ref/password shortcut.
    const email = await verifiedEmailFromCookie(request, env.HMAC_SECRET);
    if (!email) {
      const refParam = url.searchParams.get("ref") || undefined;
      return new Response(renderGatePage(undefined, url.pathname, refParam), {
        status: 200,
        headers: { "Content-Type": "text/html", "Cache-Control": "no-store" },
      });
    }

    const apiResponse = await handleApi(request, env, email);
    if (apiResponse) return apiResponse;

    // Authenticated, non-API path — let origin serve the static folder-browser shell.
    return fetch(request);
  },
};
