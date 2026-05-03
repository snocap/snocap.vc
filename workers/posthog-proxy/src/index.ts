const POSTHOG_HOST = "https://us.i.posthog.com";
const POSTHOG_ASSETS = "https://us-assets.i.posthog.com";

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (!url.pathname.startsWith("/track/")) {
      return fetch(request);
    }

    const subpath = url.pathname.slice("/track".length);

    const upstream =
      subpath === "/static/array.js" || subpath.startsWith("/static/")
        ? POSTHOG_ASSETS
        : POSTHOG_HOST;

    const target = new URL(subpath + url.search, upstream);

    const headers = new Headers(request.headers);
    headers.set("host", new URL(upstream).host);
    headers.delete("cookie");

    const res = await fetch(target.toString(), {
      method: request.method,
      headers,
      body: request.method !== "GET" ? request.body : undefined,
    });

    const responseHeaders = new Headers(res.headers);
    responseHeaders.set(
      "access-control-allow-origin",
      request.headers.get("origin") || "*",
    );
    responseHeaders.set("access-control-allow-methods", "GET, POST, OPTIONS");
    responseHeaders.set("access-control-allow-headers", "content-type");

    return new Response(res.body, {
      status: res.status,
      headers: responseHeaders,
    });
  },
};
