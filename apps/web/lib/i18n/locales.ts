export type Locale = "de" | "en";

export const LOCALES: Locale[] = ["de", "en"];

export const FALLBACK_LOCALE: Locale = "en";

/**
 * Normalizes any input to a supported Locale.
 * Anything that is not exactly "de" or "en" (tr, empty, malformed, null) → FALLBACK_LOCALE ("en").
 */
export function normalizeLocale(value: unknown): Locale {
  return LOCALES.includes(value as Locale) ? (value as Locale) : FALLBACK_LOCALE;
}
