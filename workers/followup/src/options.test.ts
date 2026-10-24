// The Closed Lost Reason picker once drew white option text on the OS's white
// popup. The layout now gives options their own colors per OS theme; this reads
// those rules out of the stylesheet and holds each pair to WCAG AA contrast.
import assert from "node:assert/strict";
import { test } from "node:test";
import layout from "./templates/layout.html";

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** The option rule's colors: the first outside the light-theme block, then
 * the one inside it. */
function optionColors(css: string): { dark: string[]; light: string[] } {
  const rule = /select option,\s*select optgroup\s*\{([^}]*)\}/g;
  const pairs = [...css.matchAll(rule)].map((m) => [
    m[1].match(/background-color:\s*(#[0-9a-f]{6})/i)?.[1] ?? "",
    m[1].match(/[^-]color:\s*(#[0-9a-f]{6})/i)?.[1] ?? "",
  ]);
  const lightAt = css.indexOf("@media (prefers-color-scheme: light)");
  const lightRule = css.slice(lightAt).search(rule);
  assert.ok(lightAt > 0 && lightRule >= 0, "a light-theme option rule exists");
  return { dark: pairs[0], light: pairs[1] };
}

test("select options set both colors in both themes, with AA contrast", () => {
  const { dark, light } = optionColors(layout);
  for (const [bg, fg] of [dark, light]) {
    assert.ok(bg && fg, "both background-color and color are set");
    assert.ok(contrast(bg, fg) >= 4.5, `${fg} on ${bg}: ${contrast(bg, fg)}`);
  }
  assert.ok(luminance(light[0]) > luminance(dark[0]), "light theme is light");
});
