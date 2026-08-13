// The authenticated create form. It carries its own stylesheet rather than
// reusing shared/gate-page.ts, whose shell is hardwired to an email + access
// code pair; teaching that shell arbitrary fields would mean editing a module
// the two LP-facing gates render from, for no benefit to them.

import { escapeHtml } from "../../shared/viewers.ts";

export interface FormValues {
  url?: string;
  pathname?: string;
  expires?: string;
}

export interface FormPageOptions {
  /** Signed-in address, shown so it is obvious who a link will be attributed to. */
  email: string;
  /** Slug just created, rendered as a copyable confirmation. */
  created?: string;
  error?: string;
  /** Echoed back on a rejected submission so a typo does not clear the form. */
  values?: FormValues;
}

export function renderFormPage({
  email,
  created,
  error,
  values = {},
}: FormPageOptions): string {
  const shortUrl = created ? `https://snocap.vc/link/${created}` : "";
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>SNØCAP Links</title>
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="robots" content="noindex,nofollow" />
  <link rel="icon" href="/favicon.ico" />
  <meta name="theme-color" content="#0a0a0a" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Fira+Mono:wght@400;500&display=swap" rel="stylesheet" />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { min-height: 100%; font-family: "Inter", system-ui, sans-serif; -webkit-font-smoothing: antialiased; }
    body { background: #0a0a0a; color: #fff; display: flex; align-items: center; justify-content: center; padding: 40px 20px; }
    .card { width: 100%; max-width: 460px; }
    h1 { font-size: 20px; font-weight: 400; margin-bottom: 4px; }
    .who { font-family: "Fira Mono", monospace; font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: #9f9f9f; margin-bottom: 32px; }
    form { display: flex; flex-direction: column; gap: 18px; }
    label { display: block; font-size: 13px; color: #bdbdbd; margin-bottom: 6px; }
    .hint { font-size: 12px; color: #666; margin-top: 6px; line-height: 1.5; }
    input { width: 100%; padding: 13px 15px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.15); border-radius: 0; color: #fff; font-family: "Inter", system-ui, sans-serif; font-size: 15px; font-weight: 300; outline: none; transition: border-color 150ms ease; }
    input::placeholder { color: #666; }
    input:focus { border-color: #F15800; }
    button { width: 100%; padding: 14px 20px; background: #F15800; color: #fff; border: none; border-radius: 0; font-family: "Fira Mono", monospace; font-size: 13px; font-weight: 500; letter-spacing: 0.04em; text-transform: uppercase; cursor: pointer; transition: background 120ms ease; }
    button:hover { background: #c24600; }
    .banner { padding: 12px 15px; font-size: 13px; line-height: 1.5; margin-bottom: 24px; border-left: 2px solid #F15800; background: rgba(241,88,0,0.08); }
    .banner code { font-family: "Fira Mono", monospace; word-break: break-all; }
    .error { color: #F15800; font-size: 13px; margin-bottom: 20px; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Short links</h1>
    <div class="who">Signed in as ${escapeHtml(email)}</div>
${
  created
    ? `    <div class="banner">Created <code>${escapeHtml(shortUrl)}</code></div>\n`
    : ""
}${error ? `    <div class="error">${escapeHtml(error)}</div>\n` : ""}    <form method="POST" action="/link/create">
      <div>
        <label for="url">Destination URL</label>
        <input id="url" type="url" name="url" placeholder="https://example.com/a/very/long/path" value="${escapeHtml(values.url ?? "")}" required autofocus />
      </div>
      <div>
        <label for="pathname">Short path</label>
        <input id="pathname" type="text" name="pathname" placeholder="fund-two" value="${escapeHtml(values.pathname ?? "")}" pattern="[A-Za-z0-9][A-Za-z0-9_-]*" maxlength="64" required />
        <div class="hint">Becomes snocap.vc/link/&lt;path&gt;. Letters, numbers, hyphens and underscores.</div>
      </div>
      <div>
        <label for="expires">Expires (optional)</label>
        <input id="expires" type="date" name="expires" value="${escapeHtml(values.expires ?? "")}" />
        <div class="hint">Works through the end of this day, UTC, then stops. Leave blank for a permanent link.</div>
      </div>
      <button type="submit">Create Link</button>
    </form>
  </div>
</body>
</html>`;
}
