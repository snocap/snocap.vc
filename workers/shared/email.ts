// Email handling shared by the gate workers: both gates take an email off a
// form, normalize it the same way, validate it the same way, and derive the
// same default referral slug from it.

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(raw: unknown): string {
  return (typeof raw === "string" ? raw : "").trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return EMAIL_PATTERN.test(email);
}

// The default per-viewer referral slug: the email's local part, stripped to
// letters and digits. Callers may override it with an explicit ref.
export function refFromEmail(email: string): string {
  return email
    .split("@")[0]
    .replace(/[^a-z0-9]/gi, "")
    .toLowerCase();
}
