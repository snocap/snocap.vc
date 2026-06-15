interface Env {
  APPLY_SHARED_SECRET: string;
}

const API_BASE = "https://api.sno.llc";

// Routes that need the X-Apply-Secret header injected before forwarding to api.sno.llc
const SECRET_ROUTES = new Set(["/apply/preflight", "/apply/submit"]);

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (!url.pathname.startsWith("/apply")) {
      return fetch(request);
    }

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "https://snocap.vc",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "content-type, authorization",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    // Proxy upload directly (auth is via Bearer token, not the shared secret)
    if (request.method === "POST" && url.pathname === "/apply/upload") {
      const headers = new Headers(request.headers);
      headers.delete("host");
      const upstream = await fetch(`${API_BASE}/upload`, {
        method: "POST",
        headers,
        body: request.body,
      });
      const response = new Response(upstream.body, upstream);
      response.headers.set("Access-Control-Allow-Origin", "https://snocap.vc");
      return response;
    }

    // Proxy preflight and submit with the shared secret header added
    if (request.method === "POST" && SECRET_ROUTES.has(url.pathname)) {
      const headers = new Headers(request.headers);
      headers.set("x-apply-secret", env.APPLY_SHARED_SECRET);
      headers.delete("host");
      const upstream = await fetch(`${API_BASE}${url.pathname}`, {
        method: "POST",
        headers,
        body: request.body,
      });
      const response = new Response(upstream.body, upstream);
      response.headers.set("Access-Control-Allow-Origin", "https://snocap.vc");
      return response;
    }

    // GET /apply and all other apply/* requests pass through to origin (Astro/GitHub Pages)
    return fetch(request);
  },
};
