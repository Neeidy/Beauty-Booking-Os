"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/I18nProvider";
import type { Locale } from "@/lib/i18n/locales";

/** Austrian flag — three equal horizontal bands red / white / red. */
function FlagAT() {
  return (
    <svg
      className="lang-flag"
      viewBox="0 0 24 18"
      role="img"
      aria-hidden="true"
      focusable="false"
    >
      <rect width="24" height="18" fill="#fff" />
      <rect width="24" height="6" y="0" fill="#C8102E" />
      <rect width="24" height="6" y="12" fill="#C8102E" />
    </svg>
  );
}

/** United Kingdom flag — compact Union Jack (layered, no clip-path). */
function FlagGB() {
  return (
    <svg
      className="lang-flag"
      viewBox="0 0 24 18"
      role="img"
      aria-hidden="true"
      focusable="false"
    >
      <rect width="24" height="18" fill="#012169" />
      {/* White diagonal saltire */}
      <path d="M0 0 L24 18 M24 0 L0 18" stroke="#fff" strokeWidth="3.4" />
      {/* Red diagonal saltire (thinner, sits on the white) */}
      <path d="M0 0 L24 18 M24 0 L0 18" stroke="#C8102E" strokeWidth="1.6" />
      {/* White upright cross */}
      <rect x="9" width="6" height="18" fill="#fff" />
      <rect y="6" width="24" height="6" fill="#fff" />
      {/* Red upright cross */}
      <rect x="10" width="4" height="18" fill="#C8102E" />
      <rect y="7" width="24" height="4" fill="#C8102E" />
    </svg>
  );
}

function Flag({ locale }: { locale: Locale }) {
  return locale === "de" ? <FlagAT /> : <FlagGB />;
}

const OPTIONS: { locale: Locale; label: string }[] = [
  { locale: "de", label: "Deutsch" },
  { locale: "en", label: "English" },
];

export default function LocaleToggle() {
  const { locale } = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Close on outside click + Esc.
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function switchTo(target: Locale) {
    setOpen(false);
    if (target === locale) return;
    // Cookie only — no localStorage/sessionStorage.
    document.cookie = `locale=${target}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }

  return (
    <div className="lang-switcher" ref={wrapRef}>
      {open && (
        <div className="lang-popover" role="menu" aria-label="Sprache wählen / Choose language">
          {OPTIONS.map((opt) => (
            <button
              key={opt.locale}
              type="button"
              role="menuitemradio"
              aria-checked={opt.locale === locale}
              className={`lang-option${opt.locale === locale ? " is-active" : ""}`}
              onClick={() => switchTo(opt.locale)}
              aria-label={opt.label}
            >
              <Flag locale={opt.locale} />
              <span className="lang-option-label">{opt.label}</span>
              {opt.locale === locale && (
                <span className="lang-check" aria-hidden="true">
                  ✓
                </span>
              )}
            </button>
          ))}
        </div>
      )}
      <button
        type="button"
        className="lang-trigger"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Sprache wählen / Choose language"
      >
        <Flag locale={locale} />
        <span className="lang-chevron" aria-hidden="true">
          ▾
        </span>
      </button>
    </div>
  );
}
