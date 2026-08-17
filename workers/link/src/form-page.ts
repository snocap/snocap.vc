// The authenticated create form. Its markup lives in the sibling `.html`
// templates rather than in a template literal here — the maxim is to keep
// user-facing HTML in a file a linter/formatter can see, and pass values in
// through `renderTemplate` instead of interpolating them (workers/shared/template.ts).
//
// It carries its own stylesheet rather than reusing shared/gate-page.ts, whose
// shell is hardwired to an email + access code pair; teaching that shell
// arbitrary fields would mean editing a module the two LP-facing gates render
// from, for no benefit to them.

import { qrPathFor, shortUrlFor } from "./links.ts";
import { renderTemplate } from "../../shared/template.ts";
import bannerTemplate from "./form-page.banner.html";
import errorTemplate from "./form-page.error.html";
import pageTemplate from "./form-page.html";

export interface FormValues {
  url?: string;
  pathname?: string;
  expires?: string;
}

export interface FormPageOptions {
  /** Signed-in address, shown so it is obvious who a link will be attributed to. */
  email: string;
  /** Slug just created, rendered as a copyable confirmation. */
  created?: string;
  error?: string;
  /** Echoed back on a rejected submission so a typo does not clear the form. */
  values?: FormValues;
}

export function renderFormPage({
  email,
  created,
  error,
  values = {},
}: FormPageOptions): string {
  // The banner carries the short URL three ways, because each one gets used:
  // clickable text (open it), the same text verbatim (select and copy it), and a
  // QR image at its own durable URL (scan it, embed it, or copy the image).
  const banner = created
    ? renderTemplate(bannerTemplate, {
        shortUrl: shortUrlFor(created),
        qrUrl: qrPathFor(created),
        slug: created,
      })
    : "";
  const errorBlock = error
    ? renderTemplate(errorTemplate, { message: error })
    : "";
  return renderTemplate(pageTemplate, {
    email,
    banner,
    error: errorBlock,
    url: values.url ?? "",
    pathname: values.pathname ?? "",
    expires: values.expires ?? "",
  });
}
