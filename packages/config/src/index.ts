export { loadSalonConfig, getCachedSalonConfig, clearConfigCache } from "./loader.js";
export type { SalonConfig } from "./loader.js";

export { clientConfigSchema } from "./schemas/client.schema.js";
export type { ClientConfig } from "./schemas/client.schema.js";

export { servicesConfigSchema, serviceSchema, serviceCategorySchema } from "./schemas/services.schema.js";
export type { ServicesConfig, ServiceConfig } from "./schemas/services.schema.js";

export { brandingConfigSchema } from "./schemas/branding.schema.js";
export type { BrandingConfig } from "./schemas/branding.schema.js";

export { promptsConfigSchema } from "./schemas/prompts.schema.js";
export type { PromptsConfig } from "./schemas/prompts.schema.js";
