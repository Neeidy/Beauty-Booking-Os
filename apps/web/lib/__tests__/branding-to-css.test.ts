import { describe, it, expect } from "vitest";
import { brandingToCss } from "../branding-to-css";
import type { BrandTokens } from "../load-branding";

const demoSalonTokens: BrandTokens = {
  colors: {
    primary: "#2D2926",
    secondary: "#C9A96E",
    accent: "#E8DDD0",
    background: "#FAFAF8",
    text: "#2D2926",
    textMuted: "#6B6460",
  },
  spacing: { xs: "0.5rem", sm: "1rem", md: "1.5rem", lg: "2.5rem", xl: "4rem", "2xl": "6rem" },
  radius: { none: "0", sm: "0.125rem", md: "0.375rem", lg: "0.75rem", full: "9999px" },
  shadow: {
    sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
    md: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
    lg: "0 10px 25px -5px rgb(0 0 0 / 0.1)",
  },
  transition: { fast: "150ms ease-out", base: "250ms ease-out", slow: "400ms ease-out" },
};

const elegantNailsTokens: BrandTokens = {
  colors: {
    primary: "#1A1A2E",
    secondary: "#E94560",
    accent: "#F5E6E8",
    background: "#FAFAFA",
    text: "#1A1A2E",
    textMuted: "#5A5A72",
  },
  spacing: { xs: "0.5rem", sm: "1rem", md: "1.5rem", lg: "2.5rem", xl: "4rem", "2xl": "6rem" },
  radius: { none: "0", sm: "0.125rem", md: "0.375rem", lg: "0.75rem", full: "9999px" },
  shadow: {
    sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
    md: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
    lg: "0 10px 25px -5px rgb(0 0 0 / 0.1)",
  },
  transition: { fast: "150ms ease-out", base: "250ms ease-out", slow: "400ms ease-out" },
};

describe("brandingToCss", () => {
  it("happy path — demo-salon tokens produce all six --brand-* lines with correct values", () => {
    const css = brandingToCss(demoSalonTokens);
    expect(css).toContain("--brand-primary: #2D2926;");
    expect(css).toContain("--brand-secondary: #C9A96E;");
    expect(css).toContain("--brand-accent: #E8DDD0;");
    expect(css).toContain("--brand-background: #FAFAF8;");
    expect(css).toContain("--brand-text: #2D2926;");
    expect(css).toContain("--brand-text-muted: #6B6460;");
  });

  it("happy path — elegant-nails tokens reflect navy/red palette, not demo-salon values", () => {
    const css = brandingToCss(elegantNailsTokens);
    expect(css).toContain("--brand-primary: #1A1A2E;");
    expect(css).toContain("--brand-secondary: #E94560;");
    expect(css).toContain("--brand-accent: #F5E6E8;");
    expect(css).toContain("--brand-background: #FAFAFA;");
    expect(css).toContain("--brand-text: #1A1A2E;");
    expect(css).toContain("--brand-text-muted: #5A5A72;");
    // Must NOT contain demo-salon primary
    expect(css).not.toContain("#2D2926");
  });

  it("different inputs produce different outputs", () => {
    const css1 = brandingToCss(demoSalonTokens);
    const css2 = brandingToCss(elegantNailsTokens);
    expect(css1).not.toEqual(css2);
  });

  it("missing color throws a descriptive error", () => {
    const badTokens = {
      ...demoSalonTokens,
      colors: {
        ...demoSalonTokens.colors,
        primary: undefined as unknown as string,
      },
    };
    expect(() => brandingToCss(badTokens)).toThrow(/--brand-primary/);
  });

  it("non-string color throws a descriptive error", () => {
    const badTokens = {
      ...demoSalonTokens,
      colors: {
        ...demoSalonTokens.colors,
        primary: 123 as unknown as string,
      },
    };
    expect(() => brandingToCss(badTokens)).toThrow(/--brand-primary/);
  });

  it("output contains :root { selector", () => {
    const css = brandingToCss(demoSalonTokens);
    expect(css).toContain(":root {");
  });

  it("output has matching braces and ends with }", () => {
    const css = brandingToCss(demoSalonTokens);
    const openCount = (css.match(/\{/g) ?? []).length;
    const closeCount = (css.match(/\}/g) ?? []).length;
    expect(openCount).toBe(closeCount);
    expect(css.trimEnd()).toMatch(/\}$/);
  });
});
