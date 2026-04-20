import type { BrandTokens } from "./load-branding";

/**
 * Converts a BrandTokens object into a CSS :root { ... } string for runtime injection.
 * Pure function — deterministic: same input → byte-identical output.
 * Does NOT include font variables (those are loaded by Next.js font optimization).
 */
export function brandingToCss(tokens: BrandTokens): string {
  const colors = tokens.colors;

  if (!colors || typeof colors !== "object") {
    throw new Error("brandingToCss: tokens.colors is missing or not an object");
  }

  const entries: [string, string][] = [
    ["--brand-primary", colors.primary],
    ["--brand-secondary", colors.secondary],
    ["--brand-accent", colors.accent],
    ["--brand-background", colors.background],
    ["--brand-text", colors.text],
    ["--brand-text-muted", colors.textMuted],
  ];

  for (const [prop, value] of entries) {
    if (value === undefined || value === null) {
      throw new Error(`brandingToCss: missing color value for ${prop}`);
    }
    if (typeof value !== "string") {
      throw new Error(
        `brandingToCss: color value for ${prop} must be a string, got ${typeof value}`
      );
    }
  }

  const declarations = entries
    .map(([prop, value]) => `  ${prop}: ${value};`)
    .join("\n");

  return `:root {\n${declarations}\n}`;
}
