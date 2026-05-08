/**
 * Build-time chart generation.
 *
 * Reads each .mmd file in src/data/seattle-investors/, renders it via
 * headless Chrome + mermaid (loaded once from CDN), and writes:
 *   - public/assets/charts/seattle-investors/<key>.svg  (inlined on the page)
 *   - public/assets/og/seattle-investors.png            (branded share image)
 *
 * Skips gracefully if Chrome can't launch (matching scripts/generate-pdf.mjs).
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import puppeteer from "puppeteer";

const projectRoot = new URL("..", import.meta.url).pathname;

const charts = [
  { key: "top" },
  { key: "direct" },
  { key: "angel" },
  { key: "small" },
  { key: "big" },
  { key: "phil" },
  { key: "full" },
];

const ogImage = {
  key: "top",
  output: "public/assets/og/seattle-investors.png",
  breadcrumb: "SNØCAP / TOOLS",
  title: "Navigating Seattle's Investing Landscape",
  footerText: "snocap.vc/tools/seattle-investors",
};

const mermaidConfig = {
  startOnLoad: true,
  securityLevel: "loose",
  theme: "base",
  themeVariables: {
    fontFamily: 'Arial, "Helvetica Neue", Helvetica, sans-serif',
    fontSize: "14px",
    primaryColor: "#f5f5f5",
    primaryBorderColor: "#9f9f9f",
    primaryTextColor: "#000000",
    secondaryColor: "#ffffff",
    tertiaryColor: "#f0f0f0",
    lineColor: "#9f9f9f",
    nodeTextColor: "#000000",
    mainBkg: "#f5f5f5",
    nodeBorder: "#9f9f9f",
    clusterBkg: "#ffffff",
    edgeLabelBackground: "#ffffff",
  },
  flowchart: {
    htmlLabels: true,
    curve: "basis",
    padding: 16,
    nodeSpacing: 40,
    rankSpacing: 60,
  },
};

const minimalHtml = (mmd) => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>
    <style>
      html, body { margin: 0; padding: 0; background: transparent; font-family: Arial, sans-serif; }
      .mermaid { display: inline-block; padding: 16px; }
    </style>
  </head>
  <body>
    <pre class="mermaid">${escapeHtml(mmd)}</pre>
    <script>
      mermaid.initialize(${JSON.stringify(mermaidConfig)});
    </script>
  </body>
</html>`;

const brandedHtml = ({ mmd, breadcrumb, title, footerText }) => {
  // Strip click callbacks for the OG render — irrelevant on a static image.
  const cleaned = mmd.replace(/^\s*click\s+.+$/gm, "");
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>
    <style>
      :root { color-scheme: light; }
      * { box-sizing: border-box; }
      html, body { margin: 0; padding: 0; }
      body {
        width: 1200px;
        height: 630px;
        background: #ffffff;
        font-family: Arial, "Helvetica Neue", Helvetica, sans-serif;
        color: #000;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }
      .header { padding: 36px 56px 0; }
      .breadcrumb {
        font-size: 13px;
        letter-spacing: 0.12em;
        color: #888;
        text-transform: uppercase;
        font-weight: 500;
      }
      .title {
        font-size: 40px;
        font-weight: 300;
        margin: 8px 0 0;
        line-height: 1.1;
      }
      .chart {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 16px 56px;
        min-height: 0;
      }
      .mermaid {
        width: 100%;
        max-height: 100%;
        display: flex;
        justify-content: center;
        align-items: center;
        background: none;
      }
      .mermaid svg { max-width: 100%; max-height: 480px; height: auto; }
      .footer {
        padding: 0 56px 28px;
        text-align: right;
        font-size: 13px;
        color: #6b7280;
        letter-spacing: 0.04em;
      }
    </style>
  </head>
  <body>
    <div class="header">
      <div class="breadcrumb">${breadcrumb}</div>
      <h1 class="title">${escapeHtml(title)}</h1>
    </div>
    <div class="chart">
      <pre class="mermaid">${escapeHtml(cleaned)}</pre>
    </div>
    <div class="footer">${escapeHtml(footerText)}</div>
    <script>
      mermaid.initialize(${JSON.stringify({ ...mermaidConfig, themeVariables: { ...mermaidConfig.themeVariables, fontSize: "15px" } })});
    </script>
  </body>
</html>`;
};

function escapeHtml(s) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

async function renderChart(browser, { key }) {
  const mmd = await readFile(
    join(projectRoot, `src/data/seattle-investors/${key}.mmd`),
    "utf-8",
  );
  const page = await browser.newPage();
  try {
    // Render at 2x device-scale so the resulting PNG is crisp on retina
    // displays and stays readable when CSS scales it down to fit a column.
    await page.setViewport({ width: 1600, height: 1200, deviceScaleFactor: 2 });
    await page.setContent(minimalHtml(mmd), { waitUntil: "networkidle0" });
    await page.waitForSelector('pre.mermaid[data-processed="true"]', {
      timeout: 15_000,
    });
    await new Promise((r) => setTimeout(r, 200));

    // Save a clean SVG (with explicit pixel dimensions from viewBox) for the
    // "open in new tab" magnifier button.
    const svg = await page.evaluate(() => {
      const el = document.querySelector("pre.mermaid svg");
      if (!el) return null;
      el.removeAttribute("style");
      el.removeAttribute("width");
      el.removeAttribute("height");
      const viewBox = el.getAttribute("viewBox");
      if (viewBox) {
        const parts = viewBox.split(/\s+/).map(Number);
        if (parts.length === 4 && Number.isFinite(parts[2])) {
          el.setAttribute("width", String(Math.round(parts[2])));
          el.setAttribute("height", String(Math.round(parts[3])));
        }
      }
      el.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      el.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
      return el.outerHTML;
    });

    if (!svg) throw new Error(`No SVG produced for ${key}`);

    const svgOut = join(
      projectRoot,
      `public/assets/charts/seattle-investors/${key}.svg`,
    );
    await mkdir(dirname(svgOut), { recursive: true });
    await writeFile(svgOut, `<?xml version="1.0" encoding="UTF-8"?>\n${svg}\n`);
    console.log(`[charts] wrote assets/charts/seattle-investors/${key}.svg`);

    // Now rasterize the SVG to PNG. PNGs are what the page actually displays
    // (no foreignObject scaling weirdness, no CSS-pixel vs SVG-coord drift).
    // We screenshot the SVG element's bounding box.
    const svgHandle = await page.$("pre.mermaid svg");
    const bbox = await svgHandle.boundingBox();
    if (!bbox) throw new Error(`No bbox for ${key}`);
    const pngOut = join(
      projectRoot,
      `public/assets/charts/seattle-investors/${key}.png`,
    );
    await page.screenshot({
      path: pngOut,
      type: "png",
      omitBackground: true,
      clip: {
        x: bbox.x,
        y: bbox.y,
        width: bbox.width,
        height: bbox.height,
      },
    });
    console.log(`[charts] wrote assets/charts/seattle-investors/${key}.png`);
  } finally {
    await page.close();
  }
}

async function renderOgPng(browser, opts) {
  const mmd = await readFile(
    join(projectRoot, `src/data/seattle-investors/${opts.key}.mmd`),
    "utf-8",
  );
  const page = await browser.newPage();
  try {
    await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 2 });
    await page.setContent(brandedHtml({ ...opts, mmd }), {
      waitUntil: "networkidle0",
    });
    await page.waitForSelector('pre.mermaid[data-processed="true"]', {
      timeout: 15_000,
    });
    await new Promise((r) => setTimeout(r, 300));
    const out = join(projectRoot, opts.output);
    await mkdir(dirname(out), { recursive: true });
    const buf = await page.screenshot({ type: "png", fullPage: false });
    await writeFile(out, buf);
    console.log(`[charts] wrote ${opts.output}`);
  } finally {
    await page.close();
  }
}

async function main() {
  let browser;
  try {
    browser = await puppeteer.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
  } catch (err) {
    console.warn(`[charts] Skipping — Chrome could not launch: ${err.message}`);
    return;
  }

  try {
    for (const chart of charts) {
      await renderChart(browser, chart);
    }
    await renderOgPng(browser, ogImage);
  } finally {
    await browser.close();
  }
}

await main();
