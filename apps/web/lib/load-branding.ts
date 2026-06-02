/**
 * Build-time utility to load brand tokens from clients/{slug}/branding.json.
 * This file runs at build time (PostCSS / Tailwind config evaluation), not in the browser.
 */

export { brandingToCss } from "./branding-to-css";

import fs from "fs";
import path from "path";

/**
 * Resolves a clients/<slug>/<file> path across environments.
 * Local dev: cwd = apps/web/, so the monorepo root is two levels up.
 * Vercel/serverless: cwd is the monorepo root, so clients/ is directly under it.
 */
function resolveClientFile(slug: string, fileName: string): string {
  const cwd = process.cwd();
  const candidates = [
    path.resolve(cwd, "clients", slug, fileName),
    path.resolve(cwd, "..", "..", "clients", slug, fileName),
    path.resolve(cwd, "apps", "web", "..", "..", "clients", slug, fileName),
  ];
  return candidates.find((p) => fs.existsSync(p)) ?? candidates[candidates.length - 1]!;
}

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
  const brandingPath = resolveClientFile(slug, "branding.json");
  const raw = fs.readFileSync(brandingPath, "utf-8");
  return JSON.parse(raw) as BrandTokens;
}
