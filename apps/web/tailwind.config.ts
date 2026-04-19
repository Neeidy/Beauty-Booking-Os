import type { Config } from "tailwindcss";
import { loadBranding } from "./lib/load-branding";

const branding = loadBranding();

// Parse "150ms ease-out" → { duration: "150ms", timing: "ease-out" }
function parseTransition(value: string): { duration: string; timing: string } {
  const spaceIdx = value.indexOf(" ");
  if (spaceIdx === -1) return { duration: value, timing: "ease-out" };
  return {
    duration: value.slice(0, spaceIdx),
    timing: value.slice(spaceIdx + 1),
  };
}

const fast = parseTransition(branding.transition.fast);
const base = parseTransition(branding.transition.base);
const slow = parseTransition(branding.transition.slow);

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── Existing branding tokens (keep unchanged) ──────────────────────────
        primary: branding.colors.primary,
        secondary: branding.colors.secondary,
        accent: branding.colors.accent,
        background: branding.colors.background,
        text: branding.colors.text,
        "text-muted": branding.colors.textMuted,

        // ── Material Design 3 surface tokens ───────────────────────────────────
        "surface": "#f8f9fa",
        "surface-bright": "#f8f9fa",
        "surface-dim": "#d9dadb",
        "surface-variant": "#e1e3e4",
        "surface-container-lowest": "#ffffff",
        "surface-container-low": "#f3f4f5",
        "surface-container": "#edeeef",
        "surface-container-high": "#e7e8e9",
        "surface-container-highest": "#e1e3e4",
        "on-surface": "#191c1d",
        "on-surface-variant": "#5b4041",
        "on-background": "#191c1d",
        "outline": "#8f6f71",
        "outline-variant": "#e3bdbf",
        "inverse-surface": "#2e3132",
        "inverse-on-surface": "#f0f1f2",
        "inverse-primary": "#ffb2b7",
        "surface-tint": "#bc0b3b",

        // ── MD3 primary tokens (non-conflicting) ───────────────────────────────
        "primary-container": "#dc2c4f",
        "primary-fixed": "#ffdadb",
        "primary-fixed-dim": "#ffb2b7",
        "on-primary": "#ffffff",
        "on-primary-container": "#fffbff",
        "on-primary-fixed": "#40000d",
        "on-primary-fixed-variant": "#92002a",

        // ── MD3 secondary tokens (non-conflicting) ─────────────────────────────
        "secondary-container": "#8455ef",
        "secondary-fixed": "#e9ddff",
        "secondary-fixed-dim": "#d0bcff",
        "on-secondary": "#ffffff",
        "on-secondary-container": "#fffbff",
        "on-secondary-fixed": "#23005c",
        "on-secondary-fixed-variant": "#5516be",

        // ── MD3 tertiary tokens ────────────────────────────────────────────────
        "tertiary": "#0058bc",
        "tertiary-container": "#0070eb",
        "tertiary-fixed": "#d8e2ff",
        "tertiary-fixed-dim": "#adc6ff",
        "on-tertiary": "#ffffff",
        "on-tertiary-container": "#fefcff",
        "on-tertiary-fixed": "#001a41",
        "on-tertiary-fixed-variant": "#004494",

        // ── MD3 error tokens ───────────────────────────────────────────────────
        "error": "#ba1a1a",
        "error-container": "#ffdad6",
        "on-error": "#ffffff",
        "on-error-container": "#93000a",

        // ── VGS brand tokens (vgs-prefixed to avoid conflict) ──────────────────
        "vgs-primary": "#b90538",
        "vgs-primary-container": "#dc2c4f",
        "vgs-primary-fixed": "#ffdadb",
        "vgs-primary-fixed-dim": "#ffb2b7",
        "on-vgs-primary": "#ffffff",
        "on-vgs-primary-container": "#fffbff",
        "on-vgs-primary-fixed": "#40000d",
        "vgs-secondary": "#6b38d4",
        "vgs-secondary-container": "#8455ef",
        "on-vgs-secondary": "#ffffff",
        "vgs-tertiary": "#0058bc",
        "vgs-tertiary-container": "#0070eb",
        "on-vgs-tertiary": "#ffffff",
      },
      spacing: {
        xs: branding.spacing.xs,
        sm: branding.spacing.sm,
        md: branding.spacing.md,
        lg: branding.spacing.lg,
        xl: branding.spacing.xl,
        "2xl": branding.spacing["2xl"],
      },
      borderRadius: {
        none: branding.radius.none,
        sm: branding.radius.sm,
        md: branding.radius.md,
        lg: branding.radius.lg,
        full: branding.radius.full,
      },
      boxShadow: {
        sm: branding.shadow.sm,
        md: branding.shadow.md,
        lg: branding.shadow.lg,
      },
      transitionDuration: {
        fast: fast.duration,
        base: base.duration,
        slow: slow.duration,
      },
      transitionTimingFunction: {
        fast: fast.timing,
        base: base.timing,
        slow: slow.timing,
      },
      fontFamily: {
        heading: ["var(--font-heading)", "serif"],
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
        headline: ["Plus Jakarta Sans", "sans-serif"],
        body: ["Inter", "sans-serif"],
        label: ["Inter", "sans-serif"],
      },
    },
  },
};

export default config;
