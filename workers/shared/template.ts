// A tiny, dependency-free renderer for external HTML templates.
//
// The maxim it exists to serve: never build user-facing HTML by interpolating
// values into a template literal in the code. The markup lives in a `.html`
// file (which prettier/an HTML linter can see and format) and the code only
// passes values in. A `.html` import resolves to the file's text — bundled by
// wrangler's `[[rules]] type = "Text"` in the Worker, and by `workers/html.mjs`
// under `node --test`.
//
// Two placeholder forms, both trimmed of inner whitespace:
//   {{ name }}   → the value, HTML-escaped. The default; safe in text and in a
//                  double-quoted attribute (`"` is escaped).
//   {{{ name }}} → the value inserted raw, for a fragment already known to be
//                  HTML — e.g. another rendered template spliced in. Use rarely.
//
// A placeholder with no matching value is a thrown error, not a silent blank,
// so a typo in a template surfaces the first time it renders rather than
// shipping an empty hole into a page.

import { escapeHtml } from "./viewers.ts";

export type TemplateValues = Record<string, string | number | null | undefined>;

const PLACEHOLDER = /\{\{\{\s*([\w.-]+)\s*\}\}\}|\{\{\s*([\w.-]+)\s*\}\}/g;

export function renderTemplate(
  template: string,
  values: TemplateValues,
): string {
  const resolve = (name: string): string => {
    if (!(name in values)) {
      throw new Error(`template: no value for placeholder "${name}"`);
    }
    const value = values[name];
    return value === null || value === undefined ? "" : String(value);
  };
  // One pass, raw alternative listed first so `{{{x}}}` wins over `{{x}}`. A
  // value substituted here is never re-scanned, so an escaped value that happens
  // to contain braces cannot smuggle in another placeholder.
  return template.replace(PLACEHOLDER, (_match, rawName, escName) =>
    rawName !== undefined ? resolve(rawName) : escapeHtml(resolve(escName)),
  );
}
