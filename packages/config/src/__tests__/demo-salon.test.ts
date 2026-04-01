import { describe, it, expect } from "vitest";
import { join } from "path";
import { loadSalonConfig } from "../loader.js";

// Validates that the actual demo-salon config files are correct
describe("demo-salon config files", () => {
  const CLIENTS_DIR = join(
    import.meta.dirname,
    "..",
    "..",
    "..",
    "..",
    "clients"
  );

  it("demo-salon client config is valid", () => {
    const config = loadSalonConfig(CLIENTS_DIR, "demo-salon");
    expect(config.client.clientName).toBe("Vienna Glow Studio");
    expect(config.client.slug).toBe("demo-salon");
    expect(config.client.packageType).toBe("growth");
    expect(config.client.languages).toContain("de");
  });

  it("demo-salon has at least 3 service categories with services", () => {
    const config = loadSalonConfig(CLIENTS_DIR, "demo-salon");
    expect(config.services.categories.length).toBeGreaterThanOrEqual(3);
    for (const cat of config.services.categories) {
      expect(cat.services.length).toBeGreaterThan(0);
      for (const svc of cat.services) {
        expect(svc.id).toMatch(/^svc_/);
        expect(svc.duration).toBeGreaterThan(0);
      }
    }
  });

  it("demo-salon branding has valid hex colors", () => {
    const config = loadSalonConfig(CLIENTS_DIR, "demo-salon");
    const hexRegex = /^#[0-9A-Fa-f]{6}$/;
    expect(config.branding.colors.primary).toMatch(hexRegex);
    expect(config.branding.colors.secondary).toMatch(hexRegex);
  });

  it("demo-salon has message templates for all 3 languages", () => {
    const config = loadSalonConfig(CLIENTS_DIR, "demo-salon");
    const { bookingConfirmation, reminder24h, reminder3h } =
      config.branding.messageTemplates;
    for (const template of [bookingConfirmation, reminder24h, reminder3h]) {
      expect(template.de).toBeTruthy();
      expect(template.en).toBeTruthy();
      expect(template.tr).toBeTruthy();
    }
  });

  it("demo-salon GDPR config is complete", () => {
    const config = loadSalonConfig(CLIENTS_DIR, "demo-salon");
    expect(config.client.gdpr.dataControllerEmail).toMatch(/@/);
    expect(config.client.gdpr.dataRetentionDays).toBe(730);
    expect(config.client.gdpr.consentRequired).toContain("data_processing");
  });
});
