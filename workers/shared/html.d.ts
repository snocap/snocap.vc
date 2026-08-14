// A `.html` import resolves to the file's text: wrangler bundles it via
// `[[rules]] type = "Text"`, and `node --test` via the `workers/html.mjs` loader
// (registered from the root `test` script). This declaration lets `tsc` type the
// import as the string it is.
declare module "*.html" {
  const content: string;
  export default content;
}
