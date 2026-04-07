/**
 * Build-time utility to load brand tokens from clients/{slug}/branding.json.
 * This file runs at build time (PostCSS / Tailwind config evaluation), not in the browser.
 */

import fs from "fs";
import path from "path";

export interface BrandColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
  textMuted: string;
}

export interface BrandSpacing {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  "2xl": string;
}

export interface BrandRadius {
  none: string;
  sm: string;
  md: string;
  lg: string;
  full: string;
}

export interface BrandShadow {
  sm: string;
  md: string;
  lg: string;
}

export interface BrandTransition {
  fast: string;
  base: string;
  slow: string;
}

export interface BrandTokens {
  colors: BrandColors;
  spacing: BrandSpacing;
  radius: BrandRadius;
  shadow: BrandShadow;
  transition: BrandTransition;
}

const DEFAULT_SLUG =
  process.env["NEXT_PUBLIC_DEFAULT_CLIENT_SLUG"] ?? "demo-salon";

/**
 * Reads clients/{slug}/branding.json synchronously and returns typed brand tokens.
 * Path is resolved relative to the monorepo root (two levels above apps/web/).
 */
export function loadBranding(slug: string = DEFAULT_SLUG): BrandTokens {
  const brandingPath = path.resolve(
    process.cwd(),
    "..",
    "..",
    "clients",
    slug,
    "branding.json"
  );
  const raw = fs.readFileSync(brandingPath, "utf-8");
  return JSON.parse(raw) as BrandTokens;
}
