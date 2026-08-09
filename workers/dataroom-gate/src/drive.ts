// Live Google Drive read integration — the worker never caches or commits
// Drive content, so the deal room is always current and confidential bytes
// never touch the repo (azoff/kernelbot#253). Auth is a service-account JWT
// bearer flow signed with Web Crypto (no `googleapis` SDK — it assumes a
// Node runtime the Workers edge doesn't have).

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const DRIVE_API = "https://www.googleapis.com/drive/v3";
const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.readonly";

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  size?: string;
  iconLink?: string;
}

interface ServiceAccountKey {
  client_email: string;
  private_key: string;
}

function base64url(bytes: Uint8Array): string {
  let str = "";
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlFromString(input: string): string {
  return base64url(new TextEncoder().encode(input));
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");
  const raw = atob(b64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes.buffer;
}

async function signServiceAccountJwt(key: ServiceAccountKey): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claims = {
    iss: key.client_email,
    scope: DRIVE_SCOPE,
    aud: GOOGLE_TOKEN_URL,
    iat: now,
    exp: now + 3600,
  };
  const unsigned = `${base64urlFromString(JSON.stringify(header))}.${base64urlFromString(JSON.stringify(claims))}`;
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(key.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(unsigned),
  );
  return `${unsigned}.${base64url(new Uint8Array(sig))}`;
}

// Module-scope cache: best-effort reuse within a warm isolate. A cold start
// (or a different isolate) just re-mints a token — cheap, no correctness risk.
let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(saKeyJson: string): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 30_000)
    return cachedToken.token;

  const key: ServiceAccountKey = JSON.parse(saKeyJson);
  const assertion = await signServiceAccountJwt(key);
  const resp = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  if (!resp.ok) {
    throw new Error(`drive auth failed: ${resp.status} ${await resp.text()}`);
  }
  const data = (await resp.json()) as {
    access_token: string;
    expires_in: number;
  };
  cachedToken = {
    token: data.access_token,
    expiresAt: now + data.expires_in * 1000,
  };
  return data.access_token;
}

export async function listFolder(
  saKeyJson: string,
  folderId: string,
): Promise<{ folder: { id: string; name: string }; files: DriveFile[] }> {
  const token = await getAccessToken(saKeyJson);
  const auth = { Authorization: `Bearer ${token}` };

  const folderMeta = await fetch(
    `${DRIVE_API}/files/${folderId}?fields=${encodeURIComponent("id,name")}`,
    { headers: auth },
  );
  if (!folderMeta.ok) {
    throw new Error(
      `drive folder lookup failed: ${folderMeta.status} ${await folderMeta.text()}`,
    );
  }
  const folder = (await folderMeta.json()) as { id: string; name: string };

  const q = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
  const fields = encodeURIComponent(
    "files(id,name,mimeType,modifiedTime,size,iconLink)",
  );
  const listResp = await fetch(
    `${DRIVE_API}/files?q=${q}&fields=${fields}&orderBy=folder,name&pageSize=200`,
    { headers: auth },
  );
  if (!listResp.ok) {
    throw new Error(
      `drive list failed: ${listResp.status} ${await listResp.text()}`,
    );
  }
  const data = (await listResp.json()) as { files?: DriveFile[] };
  return { folder, files: data.files || [] };
}

interface DriveFileMeta {
  id: string;
  name: string;
  mimeType: string;
  exportLinks?: Record<string, string>;
}

const EXPORT_MIME_PREFERENCE: Record<string, string> = {
  "application/vnd.google-apps.document": "application/pdf",
  "application/vnd.google-apps.presentation": "application/pdf",
  "application/vnd.google-apps.spreadsheet":
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

export async function streamFile(
  saKeyJson: string,
  fileId: string,
): Promise<Response> {
  const token = await getAccessToken(saKeyJson);
  const auth = { Authorization: `Bearer ${token}` };

  const fields = encodeURIComponent("id,name,mimeType,exportLinks");
  const metaResp = await fetch(
    `${DRIVE_API}/files/${fileId}?fields=${fields}`,
    {
      headers: auth,
    },
  );
  if (!metaResp.ok) {
    return new Response("File not found", { status: 404 });
  }
  const meta = (await metaResp.json()) as DriveFileMeta;

  const isNative = meta.mimeType.startsWith("application/vnd.google-apps.");
  const sourceUrl = isNative
    ? meta.exportLinks?.[
        EXPORT_MIME_PREFERENCE[meta.mimeType] || "application/pdf"
      ]
    : `${DRIVE_API}/files/${fileId}?alt=media`;

  if (!sourceUrl) {
    return new Response(`No export available for ${meta.mimeType}`, {
      status: 415,
    });
  }

  const upstream = await fetch(sourceUrl, { headers: auth });
  const headers = new Headers();
  headers.set(
    "Content-Type",
    upstream.headers.get("Content-Type") || "application/octet-stream",
  );
  headers.set(
    "Content-Disposition",
    `inline; filename="${meta.name.replace(/"/g, "")}"`,
  );
  headers.set("Cache-Control", "private, no-store");
  return new Response(upstream.body, { status: upstream.status, headers });
}
