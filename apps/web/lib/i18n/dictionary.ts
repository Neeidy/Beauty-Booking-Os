import type { Locale } from "./locales";
import de from "./dictionaries/de.json";
import en from "./dictionaries/en.json";

/** The dictionary shape is derived from de.json — the source of truth for key structure. */
export type Dictionary = typeof de;

// Type both dictionaries against Dictionary so a missing/extra/renamed key
// in either file becomes a compile-time error.
const dictionaries: Record<Locale, Dictionary> = {
  de: de as Dictionary,
  en: en as Dictionary,
};

export function getDictionary(locale: Locale): Dictionary {
  return locale === "de" ? dictionaries.de : dictionaries.en;
}
