// A node:module load hook that lets `import x from "./thing.html"` resolve to
// the file's text under `node --test`, mirroring what wrangler's
// `[[rules]] type = "Text"` does when it bundles the Worker. Registered by the
// root `test` script: `node --import ./workers/html-register.mjs --test ...`.
//
// Zero-dependency on purpose — the workers CI installs nothing, so the test run
// leans only on node built-ins.
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

export async function load(url, context, next) {
  if (url.endsWith(".html")) {
    const source = await readFile(fileURLToPath(url), "utf8");
    return {
      format: "module",
      shortCircuit: true,
      source: `export default ${JSON.stringify(source)};`,
    };
  }
  return next(url, context);
}
