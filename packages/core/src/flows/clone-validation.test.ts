/**
 * Clone Validation Tests
 *
 * Verifies that the second salon (Elegant Nails Vienna) can run on the same
 * codebase with a different config, and that multi-tenant isolation holds.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { resolve } from "path";
import { loadSalonConfig } from "@beauty-booking/config";
import { buildContentPrompt } from "@beauty-booking/content-agent";
import {
  _setAnthropicClient,
  _resetAnthropicClient,
} from "@beauty-booking/shared";
import { generateMessage } from "@beauty-booking/content-agent";

// Load both configs from the filesystem
const CLIENTS_DIR = resolve(process.cwd(), "../../clients");

// ── Config Loading Tests ───────────────────────────────────────────────────────

describe("Clone: Config loading", () => {
  it("demo-salon config loads and validates", () => {
    expect(() => loadSalonConfig(CLIENTS_DIR, "demo-salon")).not.toThrow();
    const config = loadSalonConfig(CLIENTS_DIR, "demo-salon");
    expect(config.client.clientName).toBe("Vienna Glow Studio");
    expect(config.client.packageType).toBe("growth");
  });

  it("elegant-nails-vienna config loads and validates", () => {
    expect(() => loadSalonConfig(CLIENTS_DIR, "elegant-nails-vienna")).not.toThrow();
    const config = loadSalonConfig(CLIENTS_DIR, "elegant-nails-vienna");
    expect(config.client.clientName).toBe("Elegant Nails Vienna");
    expect(config.client.packageType).toBe("starter");
  });

  it("both configs have required fields", () => {
    const demo = loadSalonConfig(CLIENTS_DIR, "demo-salon");
    const nails = loadSalonConfig(CLIENTS_DIR, "elegant-nails-vienna");

    for (const config of [demo, nails]) {
      expect(config.client.slug).toBeTruthy();
      expect(config.client.gdpr.dataControllerEmail).toBeTruthy();
      expect(config.services.categories.length).toBeGreaterThan(0);
      expect(config.branding.brandTone.style).toBeTruthy();
    }
  });
});

// ── Feature Flag Isolation ─────────────────────────────────────────────────────

describe("Clone: Starter package feature flags", () => {
  it("elegant-nails-vienna is starter → AI features disabled", () => {
    const config = loadSalonConfig(CLIENTS_DIR, "elegant-nails-vienna");
    expect(config.client.features.aiIntake).toBe(false);
    expect(config.client.features.aiBooking).toBe(false);
    expect(config.client.features.aiFollowUp).toBe(false);
    expect(config.client.features.recoveryFlow).toBe(false);
  });

  it("demo-salon is growth → AI features enabled", () => {
    const config = loadSalonConfig(CLIENTS_DIR, "demo-salon");
    expect(config.client.features.aiIntake).toBe(true);
    expect(config.client.features.aiBooking).toBe(true);
    expect(config.client.features.recoveryFlow).toBe(true);
  });
});

// ── Brand Voice Isolation ──────────────────────────────────────────────────────

describe("Clone: Brand voice per salon", () => {
  it("demo-salon uses Sie-Form, no emojis", () => {
    const config = loadSalonConfig(CLIENTS_DIR, "demo-salon");
    expect(config.branding.brandTone.formalityLevel).toBe("Sie-Form");
    expect(config.branding.brandTone.allowEmojis).toBe(false);
  });

  it("elegant-nails-vienna uses Du-Form, emojis allowed", () => {
    const config = loadSalonConfig(CLIENTS_DIR, "elegant-nails-vienna");
    expect(config.branding.brandTone.formalityLevel).toBe("Du-Form");
    expect(config.branding.brandTone.allowEmojis).toBe(true);
  });

  it("Content Agent prompt differs between salons for same purpose", () => {
    const demoConfig = loadSalonConfig(CLIENTS_DIR, "demo-salon");
    const nailsConfig = loadSalonConfig(CLIENTS_DIR, "elegant-nails-vienna");

    const demoPrompt = buildContentPrompt(demoConfig, {
      purpose: "booking_confirmation",
      language: "de",
      context: { customerName: "Maria" },
    });

    const nailsPrompt = buildContentPrompt(nailsConfig, {
      purpose: "booking_confirmation",
      language: "de",
      context: { customerName: "Maria" },
    });

    // Prompts should differ: different salon names, different formality
    expect(demoPrompt).toContain("Vienna Glow Studio");
    expect(nailsPrompt).toContain("Elegant Nails Vienna");
    expect(demoPrompt).toContain("Sie-Form");
    expect(nailsPrompt).toContain("Du-Form");
    expect(demoPrompt).toContain("Do NOT use emojis");
    expect(nailsPrompt).toContain("Emojis are allowed");

    // They must be different
    expect(demoPrompt).not.toBe(nailsPrompt);
  });
});

// ── Multi-tenant Isolation ─────────────────────────────────────────────────────

describe("Clone: Multi-tenant isolation", () => {
  it("each config has its own client_id slug — no crossover", () => {
    const demo = loadSalonConfig(CLIENTS_DIR, "demo-salon");
    const nails = loadSalonConfig(CLIENTS_DIR, "elegant-nails-vienna");

    expect(demo.client.slug).toBe("demo-salon");
    expect(nails.client.slug).toBe("elegant-nails-vienna");
    expect(demo.client.slug).not.toBe(nails.client.slug);
  });

  it("each config has its own GDPR contact email", () => {
    const demo = loadSalonConfig(CLIENTS_DIR, "demo-salon");
    const nails = loadSalonConfig(CLIENTS_DIR, "elegant-nails-vienna");

    expect(demo.client.gdpr.dataControllerEmail).not.toBe(nails.client.gdpr.dataControllerEmail);
  });

  it("each config has its own services — no shared service IDs", () => {
    const demo = loadSalonConfig(CLIENTS_DIR, "demo-salon");
    const nails = loadSalonConfig(CLIENTS_DIR, "elegant-nails-vienna");

    const demoIds = new Set(demo.services.categories.flatMap(c => c.services.map(s => s.id)));
    const nailsIds = new Set(nails.services.categories.flatMap(c => c.services.map(s => s.id)));

    // No overlap in service IDs
    for (const id of nailsIds) {
      expect(demoIds.has(id)).toBe(false);
    }
  });

  it("brand colors are different between salons", () => {
    const demo = loadSalonConfig(CLIENTS_DIR, "demo-salon");
    const nails = loadSalonConfig(CLIENTS_DIR, "elegant-nails-vienna");

    expect(demo.branding.colors.primary).not.toBe(nails.branding.colors.primary);
    expect(demo.branding.colors.secondary).not.toBe(nails.branding.colors.secondary);
  });
});

// ── Content Agent with Du-Form Config ─────────────────────────────────────────

describe("Clone: Content Agent with elegant-nails-vienna config", () => {
  beforeEach(() => { _resetAnthropicClient(); });
  afterEach(() => { _resetAnthropicClient(); });

  it("generates Du-Form + emoji message for Elegant Nails", async () => {
    const nailsConfig = loadSalonConfig(CLIENTS_DIR, "elegant-nails-vienna");

    _setAnthropicClient({
      messages: {
        create: vi.fn().mockResolvedValue({
          id: "msg_test",
          type: "message",
          role: "assistant",
          content: [{ type: "text", text: JSON.stringify({
            message: "Hey Ayşe! 💅 Dein Termin für Gel Manikür ist bestätigt. Wir freuen uns auf dich!",
            tone_check: "on_brand",
            language: "de",
            character_count: 77,
          }) }],
          model: "claude-sonnet-4-0",
          stop_reason: "end_turn",
          stop_sequence: null,
          usage: { input_tokens: 200, output_tokens: 50 },
        }),
      },
    } as unknown as Parameters<typeof _setAnthropicClient>[0]);

    const result = await generateMessage({
      purpose: "booking_confirmation",
      language: "de",
      context: { customerName: "Ayşe", serviceName: "Gel Manikür" },
      clientConfig: nailsConfig,
    });

    expect(result.success).toBe(true);
    // Emoji in message + allowEmojis: true → should be on_brand
    expect(result.data?.tone_check).toBe("on_brand");
    expect(result.data?.message).toContain("💅");
  });

  it("brand guard does NOT flag emoji when allowEmojis is true", async () => {
    const nailsConfig = loadSalonConfig(CLIENTS_DIR, "elegant-nails-vienna");

    _setAnthropicClient({
      messages: {
        create: vi.fn().mockResolvedValue({
          id: "msg_test",
          type: "message",
          role: "assistant",
          content: [{ type: "text", text: JSON.stringify({
            message: "Hey! 🎉 Wir freuen uns auf deinen Besuch.",
            tone_check: "on_brand",
            language: "de",
            character_count: 43,
          }) }],
          model: "claude-sonnet-4-0",
          stop_reason: "end_turn",
          stop_sequence: null,
          usage: { input_tokens: 150, output_tokens: 40 },
        }),
      },
    } as unknown as Parameters<typeof _setAnthropicClient>[0]);

    const result = await generateMessage({
      purpose: "dm_reply",
      language: "de",
      context: {},
      clientConfig: nailsConfig,
    });

    expect(result.success).toBe(true);
    // Emoji allowed → stays on_brand
    expect(result.data?.tone_check).toBe("on_brand");
  });
});
