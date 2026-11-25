// URLs in Interaction and comment text become links; everything else stays text.
import assert from "node:assert/strict";
import { test } from "node:test";
import { linkify as render } from "./linkify.ts";

// The link template is prettier-formatted across lines; compare its tags
// with that whitespace folded.
const linkify = (text: string) =>
  render(text)
    .replace(/\s*\n\s*>/g, ">")
    .replace(/\s*\n\s*/g, " ");

const link = (href: string, label = href) =>
  `<a class="text-link" href="${href}" rel="noopener" target="_blank" title="${href}">${label}</a>`;

test("an http(s) URL becomes a link that opens a new tab", () => {
  assert.equal(
    linkify("Deck: https://docsend.com/view/abc123 sent"),
    `Deck: ${link("https://docsend.com/view/abc123")} sent`,
  );
});

test("a bare www. URL links to its https:// form", () => {
  assert.equal(
    linkify("see www.snocap.vc"),
    `see ${link("https://www.snocap.vc", "www.snocap.vc")}`,
  );
});

test("trailing punctuation and an unopened bracket stay outside the link", () => {
  assert.equal(
    linkify("Read https://x.com/a. Then (https://x.com/b), done"),
    `Read ${link("https://x.com/a")}. Then (${link("https://x.com/b")}), done`,
  );
  // A bracket the URL opened is part of it.
  assert.equal(
    linkify("https://en.wikipedia.org/wiki/Foo_(bar)"),
    link("https://en.wikipedia.org/wiki/Foo_(bar)"),
  );
});

test("the text around links is escaped, and a URL cannot break out of the attribute", () => {
  assert.equal(
    linkify(`<b>hi</b> https://x.com/?q="><script>`),
    `&lt;b&gt;hi&lt;/b&gt; ${link("https://x.com/?q=")}&quot;&gt;&lt;script&gt;`,
  );
  assert.equal(
    linkify("https://x.com/?a=1&b=2"),
    link("https://x.com/?a=1&amp;b=2"),
  );
});

test("text with no URL is just escaped", () => {
  assert.equal(linkify("Call Tue & Wed"), "Call Tue &amp; Wed");
  assert.equal(linkify(""), "");
});
