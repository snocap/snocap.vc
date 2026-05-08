import { renderGatePage } from "./gate-page";

interface Env {
  DB: D1Database;
  HMAC_SECRET: string;
  ADMIN_TOKEN: string;
  POSTHOG_API_KEY: string;
  DECK_PASSWORD: string;
}

const COOKIE_NAME = "snocap_viewer";
const REF_COOKIE_NAME = "snocap_ref";
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

function refFromEmail(email: string): string {
  return email
    .split("@")[0]
    .replace(/[^a-z0-9]/gi, "")
    .toLowerCase();
}

function makeRefCookie(value: string): string {
  return `${REF_COOKIE_NAME}=${encodeURIComponent(value)}; Path=/; Max-Age=${COOKIE_MAX_AGE}; Secure; SameSite=Lax`;
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
    `<!doctype html><html><head><title>Deck Viewers</title>
<style>
  body { font-family: system-ui; background: #0a0a0a; color: #fff; padding: 40px; }
  h1 { font-weight: 300; margin-bottom: 24px; }
  table { border-collapse: collapse; width: 100%; }
  th, td { text-align: left; padding: 10px 16px; border-bottom: 1px solid #222; font-size: 14px; }
  th { color: #9f9f9f; text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em; }
</style></head><body>
<h1>Deck Viewers</h1>
<table><thead><tr><th>Email</th><th>First Viewed</th><th>Views</th><th>Country</th><th>Referral</th></tr></thead>
<tbody>${rows || "<tr><td colspan=5>No viewers yet</td></tr>"}</tbody></table>
</body></html>`,
    { headers: { "Content-Type": "text/html", "Cache-Control": "no-store" } },
  );
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    const adminResponse = await handleAdmin(request, env);
    if (adminResponse) return adminResponse;

    if (!url.pathname.startsWith("/deck")) {
      return fetch(request);
    }

    // POST: form submission
    if (request.method === "POST" && url.pathname === "/deck") {
      const formData = await request.formData();
      const returnTo = (formData.get("return_to") as string) || "/deck";
      const refField = (formData.get("ref") as string) || null;
      const refCookie = getCookie(request, REF_COOKIE_NAME);
      const safeReturn = returnTo.startsWith("/deck") ? returnTo : "/deck";

      const effectiveRef = refField || refCookie || null;
      const requirePassword = !effectiveRef;

      const email = ((formData.get("email") as string) || "")
        .trim()
        .toLowerCase();

      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return new Response(
          renderGatePage(
            "Please enter a valid email address.",
            returnTo,
            refField || undefined,
            requirePassword,
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

      // Validate password when no ref is present
      const password = (formData.get("password") as string) || "";
      if (requirePassword) {
        if (!env.DECK_PASSWORD || password !== env.DECK_PASSWORD) {
          return new Response(
            renderGatePage(
              "Invalid access code.",
              returnTo,
              refField || undefined,
              true,
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
      }

      // Determine ref to store: explicit ref > password default > email alias
      const ref = effectiveRef || (password ? "direct" : refFromEmail(email));

      try {
        await env.DB.prepare(
          "INSERT INTO viewers (email, user_agent, country, ref) VALUES (?, ?, ?, ?)",
        )
          .bind(
            email,
            request.headers.get("User-Agent") || "",
            (request.cf?.country as string) || "",
            ref,
          )
          .run();
      } catch {
        // non-fatal: don't block access if D1 write fails
      }

      const hmac = await hmacSign(email, env.HMAC_SECRET);
      const cookieValue = makeCookieValue(email, hmac);

      const headers = new Headers({ Location: safeReturn });
      headers.append(
        "Set-Cookie",
        `${COOKIE_NAME}=${encodeURIComponent(cookieValue)}; Path=/; Max-Age=${COOKIE_MAX_AGE}; Secure; SameSite=Lax`,
      );
      headers.append("Set-Cookie", makeRefCookie(ref));
      return new Response(null, { status: 302, headers });
    }

    // GET: email cookie is the only bypass
    const cookieRaw = getCookie(request, COOKIE_NAME);
    if (cookieRaw) {
      const parsed = parseCookieValue(cookieRaw);
      if (
        parsed &&
        (await hmacVerify(parsed.email, parsed.hmac, env.HMAC_SECRET))
      ) {
        const refCookie = getCookie(request, REF_COOKIE_NAME);
        const ref = refCookie || refFromEmail(parsed.email);

        // On the main deck page, ensure ref is in the URL so shared links carry it
        const isDeckRoot =
          url.pathname === "/deck" || url.pathname === "/deck/";
        if (isDeckRoot && !url.searchParams.has("ref")) {
          const redirectUrl = new URL(request.url);
          redirectUrl.searchParams.set("ref", ref);
          const headers = new Headers({ Location: redirectUrl.toString() });
          if (!refCookie) headers.append("Set-Cookie", makeRefCookie(ref));
          return new Response(null, { status: 302, headers });
        }

        if (refCookie) {
          return fetch(request);
        }
        // Email cookie set but no ref cookie — derive ref from email and set it
        const upstream = await fetch(request);
        const headers = new Headers(upstream.headers);
        headers.append("Set-Cookie", makeRefCookie(ref));
        return new Response(upstream.body, {
          status: upstream.status,
          statusText: upstream.statusText,
          headers,
        });
      }
    }

    // No valid email cookie: show gate
    // Ref param or ref cookie removes password requirement
    const refParam = url.searchParams.get("ref") || undefined;
    const refCookie = getCookie(request, REF_COOKIE_NAME);
    const requirePassword = !refParam && !refCookie;

    const gateHtml = renderGatePage(
      undefined,
      url.pathname,
      refParam,
      requirePassword,
    );
    const headers = new Headers({
      "Content-Type": "text/html",
      "Cache-Control": "no-store",
    });
    // Persist ref param as cookie for future visits to this gate
    if (refParam && !refCookie) {
      headers.append("Set-Cookie", makeRefCookie(refParam));
    }
    return new Response(gateHtml, { status: 200, headers });
  },
};
