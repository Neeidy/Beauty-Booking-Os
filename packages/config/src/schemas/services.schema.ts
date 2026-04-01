import { z } from "zod";

export const serviceSchema = z.object({
  id: z
    .string()
    .min(1)
    .regex(/^svc_[a-z0-9_]+$/, "Service ID must start with svc_"),
  name: z.string().min(1),
  nameEn: z.string().min(1),
  duration: z.number().positive().int(),
  priceEur: z.number().nonnegative().int().optional(), // cents; null = "on request"
  description: z.string().optional(),
  popular: z.boolean().default(false),
});

export const serviceCategorySchema = z.object({
  name: z.string().min(1),
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/),
  services: z.array(serviceSchema).min(1),
});

export const servicesConfigSchema = z.object({
  categories: z.array(serviceCategorySchema).min(1),
});

export type ServiceConfig = z.infer<typeof serviceSchema>;
export type ServicesConfig = z.infer<typeof servicesConfigSchema>;
