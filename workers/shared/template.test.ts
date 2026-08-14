// The template renderer's contract: escape by default, splice raw only when
// explicitly asked, and refuse a placeholder nobody filled.
import assert from "node:assert/strict";
import { test } from "node:test";
import { renderTemplate } from "./template.ts";

test("a double-brace placeholder is substituted and HTML-escaped", () => {
  assert.equal(
    renderTemplate("<p>Hi {{ name }}</p>", { name: "Ada & <b>co</b>" }),
    "<p>Hi Ada &amp; &lt;b&gt;co&lt;/b&gt;</p>",
  );
});

test("escaping is safe inside a double-quoted attribute", () => {
  assert.equal(
    renderTemplate('<input value="{{ v }}" />', { v: '"><script>' }),
    '<input value="&quot;&gt;&lt;script&gt;" />',
  );
});

test("a triple-brace placeholder is spliced in raw", () => {
  assert.equal(
    renderTemplate("<div>{{{ html }}}</div>", { html: "<b>bold</b>" }),
    "<div><b>bold</b></div>",
  );
});

test("inner whitespace in a placeholder is ignored", () => {
  assert.equal(renderTemplate("{{v}}|{{   v   }}", { v: "x" }), "x|x");
});

test("null and undefined render as empty, and a key can repeat", () => {
  assert.equal(
    renderTemplate("[{{ a }}][{{ b }}]", { a: null, b: undefined }),
    "[][]",
  );
  assert.equal(renderTemplate("{{ a }}{{ a }}", { a: "z" }), "zz");
});

test("a substituted value is not re-scanned for placeholders", () => {
  // The value itself contains what looks like a placeholder; it must survive
  // verbatim (escaped), never trigger a second lookup.
  assert.equal(renderTemplate("{{ a }}", { a: "{{ b }}" }), "{{ b }}");
});

test("a placeholder with no value throws rather than rendering blank", () => {
  assert.throws(
    () => renderTemplate("{{ missing }}", {}),
    /no value for placeholder "missing"/,
  );
});
