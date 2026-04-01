import { describe, it, expect } from "vitest";
import { createLeadInputSchema } from "../types/lead.types.js";

describe("createLeadInputSchema", () => {
  const validInput = {
    clientSlug: "demo-salon",
    source: "web_form" as const,
    customerName: "Maria Muster",
    customerEmail: "maria@example.at",
    language: "de" as const,
    gdprConsents: [
      {
        consentType: "data_processing" as const,
        granted: true,
        method: "web_form" as const,
        consentText: "Ich stimme der Verarbeitung zu",
        ipAddress: "192.168.1.1",
      },
    ],
  };

  it("accepts valid input", () => {
    const result = createLeadInputSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("defaults language to 'de' when not provided", () => {
    const input = { ...validInput };
    // @ts-expect-error: intentionally omitting language to test default
    delete input.language;
    const result = createLeadInputSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.language).toBe("de");
    }
  });

  it("rejects invalid client slug with spaces", () => {
    const result = createLeadInputSchema.safeParse({
      ...validInput,
      clientSlug: "my salon",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email address", () => {
    const result = createLeadInputSchema.safeParse({
      ...validInput,
      customerEmail: "not-an-email",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty gdprConsents array", () => {
    const result = createLeadInputSchema.safeParse({
      ...validInput,
      gdprConsents: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid source channel", () => {
    const result = createLeadInputSchema.safeParse({
      ...validInput,
      source: "telegram",
    });
    expect(result.success).toBe(false);
  });

  it("rejects rawMessage over 2000 characters", () => {
    const result = createLeadInputSchema.safeParse({
      ...validInput,
      rawMessage: "a".repeat(2001),
    });
    expect(result.success).toBe(false);
  });

  it("accepts input without customerEmail and customerPhone (contact not validated here)", () => {
    const input = { ...validInput };
    delete (input as Record<string, unknown>)["customerEmail"];
    const result = createLeadInputSchema.safeParse(input);
    // Contact validation happens at the API layer, not in the schema
    expect(result.success).toBe(true);
  });
});

describe("createLeadInputSchema — GDPR consents", () => {
  it("accepts multiple consent types", () => {
    const result = createLeadInputSchema.safeParse({
      clientSlug: "demo-salon",
      source: "web_form",
      customerPhone: "+4312345678",
      gdprConsents: [
        {
          consentType: "data_processing",
          granted: true,
          method: "web_form",
        },
        {
          consentType: "reminder_messages",
          granted: true,
          method: "web_form",
        },
        {
          consentType: "marketing",
          granted: false,
          method: "web_form",
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid consent type", () => {
    const result = createLeadInputSchema.safeParse({
      clientSlug: "demo-salon",
      source: "web_form",
      customerEmail: "test@test.at",
      gdprConsents: [
        {
          consentType: "unknown_consent_type",
          granted: true,
          method: "web_form",
        },
      ],
    });
    expect(result.success).toBe(false);
  });
});
