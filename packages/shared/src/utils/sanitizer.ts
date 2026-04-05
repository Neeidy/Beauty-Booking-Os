/**
 * Input sanitization utilities.
 *
 * Provides XSS protection, max-length enforcement, and format validation
 * for all user-supplied strings before they touch the database.
 */

// ── Constants ─────────────────────────────────────────────────────────────────

export const MAX_MESSAGE_LENGTH = 2000;
export const MAX_NAME_LENGTH = 200;
export const MAX_SHORT_TEXT_LENGTH = 500;

// ── XSS / HTML stripping ─────────────────────────────────────────────────────

/**
 * Strips all HTML tags and dangerous tag content from a string to prevent XSS.
 * Removes content inside <script>, <style>, <iframe> tags entirely.
 */
export function stripHtml(input: string): string {
  return input
    // 1. Remove content + tags for dangerous elements (script, style, iframe)
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, "")
    // 2. Decode encoded entities that might smuggle tags
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    // 3. Remove dangerous re-encoded script tags
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    // 4. Strip all remaining HTML tags
    .replace(/<[^>]*>/g, "")
    .trim();
}

/**
 * Sanitizes a single user-supplied string:
 * 1. Strips HTML tags
 * 2. Trims whitespace
 * 3. Enforces maximum length
 *
 * Returns the cleaned string.
 */
export function sanitizeString(
  input: string,
  maxLength: number = MAX_MESSAGE_LENGTH
): string {
  const stripped = stripHtml(input);
  return stripped.slice(0, maxLength);
}

/**
 * Sanitizes a record of string values (e.g. request body).
 * Non-string values are passed through unchanged.
 */
export function sanitizeObject<T extends Record<string, unknown>>(
  obj: T,
  maxLength: number = MAX_MESSAGE_LENGTH
): T {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    result[key] = typeof value === "string" ? sanitizeString(value, maxLength) : value;
  }
  return result as T;
}

// ── Format validation ─────────────────────────────────────────────────────────

/**
 * Validates an email address.
 * RFC 5322 simplified — rejects obviously invalid formats.
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email.trim());
}

/**
 * Validates a phone number.
 * Accepts international format (+43 prefix, spaces, hyphens, parentheses).
 * Min 7 digits, max 15 digits (E.164 max).
 */
export function isValidPhone(phone: string): boolean {
  // Strip formatting characters
  const digits = phone.replace(/[\s\-().+]/g, "");
  // Must be 7–15 digits
  if (!/^\d{7,15}$/.test(digits)) return false;
  return true;
}

/**
 * Validates string length doesn't exceed maxLength.
 */
export function isWithinLength(input: string, maxLength: number): boolean {
  return input.length <= maxLength;
}
