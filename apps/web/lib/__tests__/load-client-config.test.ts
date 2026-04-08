import { describe, it, expect } from "vitest";
import { loadClientConfig } from "../load-client-config";

describe("loadClientConfig", () => {
  it("loads demo-salon correctly", () => {
    const config = loadClientConfig("demo-salon");
    expect(config.clientName).toBe("Vienna Glow Studio");
    expect(config.slug).toBe("demo-salon");
    expect(typeof config.contact.whatsappNumber).toBe("string");
    expect(config.contact.whatsappNumber).not.toBe("");
  });

  it("loads elegant-nails-vienna correctly — no whatsappNumber", () => {
    const config = loadClientConfig("elegant-nails-vienna");
    expect(config.clientName).toBe("Elegant Nails Vienna");
    expect(config.slug).toBe("elegant-nails-vienna");
    expect(config.contact.whatsappNumber).toBeUndefined();
    expect(config.channels.whatsapp).toBe(false);
  });

  it("defaults to demo-salon when no slug argument and no env var", () => {
    const original = process.env["NEXT_PUBLIC_DEFAULT_CLIENT_SLUG"];
    delete process.env["NEXT_PUBLIC_DEFAULT_CLIENT_SLUG"];
    try {
      const config = loadClientConfig();
      expect(config.slug).toBe("demo-salon");
    } finally {
      if (original !== undefined) {
        process.env["NEXT_PUBLIC_DEFAULT_CLIENT_SLUG"] = original;
      }
    }
  });

  it("throws a descriptive error for an invalid slug", () => {
    expect(() => loadClientConfig("nonexistent-salon")).toThrow(
      /nonexistent-salon/
    );
  });

  it("optional fields are absent on elegant-nails-vienna without type error or crash", () => {
    const config = loadClientConfig("elegant-nails-vienna");
    // Required fields exist
    expect(config.contact.phone).toBeTruthy();
    expect(config.contact.email).toBeTruthy();
    // Optional fields are absent — accessing them does NOT throw
    expect(config.contact.instagramHandle).toBeUndefined();
    expect(config.contact.googleMapsUrl).toBeUndefined();
    expect(config.contact.whatsappNumber).toBeUndefined();
  });
});
