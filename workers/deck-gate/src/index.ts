import { renderGatePage } from "./gate-page";

interface Env {
  DB: D1Database;
  HMAC_SECRET: string;
  ADMIN_TOKEN: string;
  POSTHOG_API_KEY: string;
}

const COOKIE_NAME = "snocap_viewer";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

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

function isUngatedPath(path: string): boolean {
  return (
    path === "/deck.pdf" ||
    path === "/deck/deck.pdf" ||
    path === "/deck/download"
  );
}

async function handleAdmin(
  request: Request,
  env: Env,
): Promise<Response | null> {
  const url = new URL(request.url);
  if (url.pathname !== "/deck/admin") return null;

  const token = url.searchParams.get("token");
  if (token !== env.ADMIN_TOKEN) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { results } = await env.DB.prepare(
    `SELECT email, MIN(viewed_at) as first_viewed, COUNT(*) as views, country
     FROM viewers GROUP BY email ORDER BY MAX(viewed_at) DESC LIMIT 200`,
  ).all();

  const rows = (results || [])
    .map(
      (r: Record<string, unknown>) =>
        `<tr><td>${r.email}</td><td>${r.first_viewed}</td><td>${r.views}</td><td>${r.country || "—"}</td></tr>`,
    )
    .join("");

  return new Response(
    `<!doctype html><html><head><title>Deck Viewers</title>
<style>
  body { font-family: system-ui; background: #0a0a0a; color: #fff; padding: 40px; }
  h1 { font-weight: 300; margin-bottom: 24px; }
  table { border-collapse: collapse; width: 100%; }
  th, td { text-align: left; padding: 10px 16px; border-bottom: 1px solid #222; font-size: 14px; }
  th { color: #9f9f9f; text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em; }
</style></head><body>
<h1>Deck Viewers</h1>
<table><thead><tr><th>Email</th><th>First Viewed</th><th>Views</th><th>Country</th></tr></thead>
<tbody>${rows || "<tr><td colspan=4>No viewers yet</td></tr>"}</tbody></table>
</body></html>`,
    { headers: { "Content-Type": "text/html", "Cache-Control": "no-store" } },
  );
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (isUngatedPath(url.pathname)) {
      return fetch(request);
    }

    const adminResponse = await handleAdmin(request, env);
    if (adminResponse) return adminResponse;

    if (!url.pathname.startsWith("/deck")) {
      return fetch(request);
    }

    // POST: email form submission
    if (request.method === "POST" && url.pathname === "/deck") {
      const formData = await request.formData();
      const email = ((formData.get("email") as string) || "")
        .trim()
        .toLowerCase();

      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return new Response(
          renderGatePage("Please enter a valid email address."),
          {
            status: 400,
            headers: {
              "Content-Type": "text/html",
              "Cache-Control": "no-store",
            },
          },
        );
      }

      const hmac = await hmacSign(email, env.HMAC_SECRET);
      const cookieValue = makeCookieValue(email, hmac);

      try {
        await env.DB.prepare(
          "INSERT INTO viewers (email, user_agent, country) VALUES (?, ?, ?)",
        )
          .bind(
            email,
            request.headers.get("User-Agent") || "",
            (request.cf?.country as string) || "",
          )
          .run();
      } catch {
        // non-fatal: don't block access if D1 write fails
      }

      return new Response(null, {
        status: 302,
        headers: {
          Location: "/deck",
          "Set-Cookie": `${COOKIE_NAME}=${encodeURIComponent(cookieValue)}; Path=/deck; Max-Age=${COOKIE_MAX_AGE}; Secure; SameSite=Lax`,
        },
      });
    }

    // GET: check cookie
    const cookieRaw = getCookie(request, COOKIE_NAME);
    if (cookieRaw) {
      const parsed = parseCookieValue(cookieRaw);
      if (
        parsed &&
        (await hmacVerify(parsed.email, parsed.hmac, env.HMAC_SECRET))
      ) {
        return fetch(request);
      }
    }

    // No valid cookie: show gate
    return new Response(renderGatePage(), {
      status: 200,
      headers: { "Content-Type": "text/html", "Cache-Control": "no-store" },
    });
  },
};
