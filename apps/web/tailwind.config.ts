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
        // ── Design system tokens (CSS vars) ──────────────────────────────────
        "accent":           "var(--color-accent)",
        "bg":               "var(--color-bg)",
        "bg-surface":       "var(--color-bg-surface)",
        "bg-card":          "var(--color-bg-card)",
        "border":           "var(--color-border)",
        "text":             "var(--color-text)",
        "text-muted":       "var(--color-text-muted)",
        "text-secondary":   "var(--color-text-secondary)",
        "text-faint":       "var(--color-text-faint)",
        "purple":           "var(--color-purple)",
        "rose":             "var(--color-rose)",
        "emerald":          "var(--color-emerald)",
        "amber":            "var(--color-amber)",
        "cyan":             "var(--color-cyan)",
        "error":            "var(--color-error)",
        "success":          "var(--color-success)",
        "warning":          "var(--color-warning)",

        // ── Branding tokens (from branding.json — BookingForm uses these) ────
        primary:    branding.colors.primary,
        secondary:  branding.colors.secondary,
        background: branding.colors.background,
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
