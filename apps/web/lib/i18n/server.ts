import { cookies } from "next/headers";
import { loadClientConfig } from "@/lib/load-client-config";
import { type Locale, FALLBACK_LOCALE, normalizeLocale } from "./locales";

/**
 * Resolves the active UI locale.
 * Resolution order: cookie `locale` → config `defaultLocale` → FALLBACK_LOCALE ("en").
 * `defaultLanguage` (used by AI agents) is intentionally NEVER consulted here.
 * Never throws — any failure falls through to the next source.
 */
export async function getLocale(): Promise<Locale> {
  // 1. Cookie
  try {
    const cookieStore = await cookies();
    const cookieValue = cookieStore.get("locale")?.value;
    if (cookieValue) {
      return normalizeLocale(cookieValue);
    }
  } catch {
    // cookies() unavailable — fall through to config
  }

  // 2. Config defaultLocale (decoupled from defaultLanguage)
  try {
    const cfg = loadClientConfig() as { defaultLocale?: unknown };
    if (cfg.defaultLocale != null) {
      return normalizeLocale(cfg.defaultLocale);
    }
  } catch {
    // config read failed — fall through to fallback
  }

  // 3. Fallback
  return FALLBACK_LOCALE;
}
