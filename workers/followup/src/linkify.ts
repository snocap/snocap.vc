// Plain text with its URLs made clickable: an Interaction's details or a
// comment, as the card and its timeline show them.

import { escapeHtml } from "../../shared/viewers.ts";
import { renderTemplate } from "../../shared/template.ts";
import textLinkTemplate from "./templates/text-link.html";

const URL_PATTERN = /\bhttps?:\/\/[^\s<>"]+|\bwww\.[^\s<>"]+/gi;

/** Sentence punctuation after a URL, and a closing bracket the URL never
 * opened ("(see https://x.com/a)"), belong to the prose, not the link. */
function trimUrl(raw: string): string {
  let url = raw.replace(/[.,;:!?'"]+$/, "");
  for (const [open, close] of [
    ["(", ")"],
    ["[", "]"],
  ]) {
    while (
      url.endsWith(close) &&
      url.split(close).length > url.split(open).length
    ) {
      url = url.slice(0, -1).replace(/[.,;:!?'"]+$/, "");
    }
  }
  return url;
}

/** `text` HTML-escaped, with each http(s):// or www. URL in it a link that
 * opens in a new tab. The result is HTML for a `{{{ }}}` placeholder. */
export function linkify(text: string): string {
  let html = "";
  let from = 0;
  for (const match of text.matchAll(URL_PATTERN)) {
    const url = trimUrl(match[0]);
    const at = match.index ?? 0;
    html += escapeHtml(text.slice(from, at));
    // trim(): the template file ends in a newline, and this text is pre-wrap.
    html += renderTemplate(textLinkTemplate, {
      href: /^www\./i.test(url) ? `https://${url}` : url,
      label: url,
    }).trim();
    from = at + url.length;
  }
  return html + escapeHtml(text.slice(from));
}
