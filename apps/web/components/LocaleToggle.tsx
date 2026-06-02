"use client";

import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/I18nProvider";
import type { Locale } from "@/lib/i18n/locales";

export default function LocaleToggle() {
  const { locale } = useI18n();
  const router = useRouter();

  const nextLocale: Locale = locale === "de" ? "en" : "de";

  function switchTo(target: Locale) {
    // Cookie only — no localStorage/sessionStorage.
    document.cookie = `locale=${target}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }

  // Own floating-controls wrapper, offset to the left of ThemeToggle's wrapper
  // (both are position: fixed at right: 20px otherwise). Reuses existing classes;
  // inline offset only — no new class, no new color.
  return (
    <div className="floating-controls" style={{ right: "72px" }}>
      <button
        type="button"
        className="theme-toggle"
        onClick={() => switchTo(nextLocale)}
        aria-label={nextLocale === "de" ? "Auf Deutsch umschalten" : "Switch to English"}
      >
        {locale === "de" ? "DE · EN" : "EN · DE"}
      </button>
    </div>
  );
}
