/**
 * Build-time PDF generation for the fundraising deck.
 * Serves the built dist/ directory, opens the deck in headless Chrome,
 * and uses the deck-stage's @media print styles to produce a clean PDF.
 *
 * Requires Chrome/Chromium system libraries. Skips gracefully if Chrome
 * can't launch (e.g. local dev without system deps).
 */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join, extname } from "node:path";

const DIST = new URL("../dist", import.meta.url).pathname;
const PORT = 4321;
const DECK_URL = `http://localhost:${PORT}/deck/`;
const PDF_OUT = join(DIST, "deck.pdf");

const MIME = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".jsx": "text/javascript",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".mp4": "video/mp4",
  ".ico": "image/x-icon",
};

const server = createServer(async (req, res) => {
  let path = new URL(req.url, `http://localhost`).pathname;
  if (path.endsWith("/")) path += "index.html";

  const file = join(DIST, path);
  try {
    const data = await readFile(file);
    const ext = extname(file);
    res.writeHead(200, {
      "content-type": MIME[ext] || "application/octet-stream",
    });
    res.end(data);
  } catch {
    res.writeHead(404).end("not found");
  }
});

let browser;
try {
  await new Promise((resolve) => server.listen(PORT, resolve));
  console.log(`serving dist/ on :${PORT}`);

  const puppeteer = await import("puppeteer");
  browser = await puppeteer.default.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  await page.goto(DECK_URL, { waitUntil: "networkidle0", timeout: 30000 });

  await page.waitForSelector("deck-stage section", { timeout: 15000 });
  const slideCount = await page.$$eval(
    "deck-stage section",
    (els) => els.length,
  );
  console.log(`deck loaded: ${slideCount} slides`);

  const pdf = await page.pdf({
    path: PDF_OUT,
    width: "1920px",
    height: "1080px",
    printBackground: true,
    preferCSSPageSize: false,
  });

  console.log(
    `PDF generated: ${PDF_OUT} (${(pdf.byteLength / 1048576).toFixed(1)}MB)`,
  );
} catch (err) {
  if (
    err.message?.includes("Failed to launch") ||
    err.message?.includes("shared libraries")
  ) {
    console.warn(
      "⚠ Chrome not available — skipping PDF generation (CI will handle it)",
    );
  } else {
    throw err;
  }
} finally {
  if (browser) await browser.close();
  server.close();
}
