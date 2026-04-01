import { readFileSync } from "fs";
import { join } from "path";
import { clientConfigSchema, type ClientConfig } from "./schemas/client.schema.js";
import { servicesConfigSchema, type ServicesConfig } from "./schemas/services.schema.js";
import { brandingConfigSchema, type BrandingConfig } from "./schemas/branding.schema.js";
import { promptsConfigSchema, type PromptsConfig } from "./schemas/prompts.schema.js";

export interface SalonConfig {
  client: ClientConfig;
  services: ServicesConfig;
  branding: BrandingConfig;
  prompts: PromptsConfig;
}

function loadJson(filePath: string): unknown {
  try {
    const content = readFileSync(filePath, "utf-8");
    return JSON.parse(content);
  } catch (err) {
    throw new Error(
      `Failed to load config file at ${filePath}: ${(err as Error).message}`
    );
  }
}

export function loadSalonConfig(
  clientsDir: string,
  slug: string
): SalonConfig {
  const dir = join(clientsDir, slug);

  const rawClient = loadJson(join(dir, "client.config.json"));
  const rawServices = loadJson(join(dir, "services.json"));
  const rawBranding = loadJson(join(dir, "branding.json"));

  // prompts.json is optional
  let rawPrompts: unknown = {};
  try {
    rawPrompts = loadJson(join(dir, "prompts.json"));
  } catch {
    // file is optional — use empty defaults
  }

  const clientResult = clientConfigSchema.safeParse(rawClient);
  if (!clientResult.success) {
    throw new Error(
      `Invalid client config for "${slug}": ${clientResult.error.message}`
    );
  }

  const servicesResult = servicesConfigSchema.safeParse(rawServices);
  if (!servicesResult.success) {
    throw new Error(
      `Invalid services config for "${slug}": ${servicesResult.error.message}`
    );
  }

  const brandingResult = brandingConfigSchema.safeParse(rawBranding);
  if (!brandingResult.success) {
    throw new Error(
      `Invalid branding config for "${slug}": ${brandingResult.error.message}`
    );
  }

  const promptsResult = promptsConfigSchema.safeParse(rawPrompts);
  if (!promptsResult.success) {
    throw new Error(
      `Invalid prompts config for "${slug}": ${promptsResult.error.message}`
    );
  }

  // Ensure slug in file matches directory slug
  if (clientResult.data.slug !== slug) {
    throw new Error(
      `Config slug mismatch: directory is "${slug}" but config says "${clientResult.data.slug}"`
    );
  }

  return {
    client: clientResult.data,
    services: servicesResult.data,
    branding: brandingResult.data,
    prompts: promptsResult.data,
  };
}

// Simple in-memory cache — one load per slug per process lifetime
const configCache = new Map<string, SalonConfig>();

export function getCachedSalonConfig(
  clientsDir: string,
  slug: string
): SalonConfig {
  const cached = configCache.get(slug);
  if (cached) return cached;

  const config = loadSalonConfig(clientsDir, slug);
  configCache.set(slug, config);
  return config;
}

export function clearConfigCache(): void {
  configCache.clear();
}
