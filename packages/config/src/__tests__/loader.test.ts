import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, writeFileSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import {
  loadSalonConfig,
  clearConfigCache,
  getCachedSalonConfig,
} from "../loader.js";

// ── Test helpers ───────────────────────────────────────────────────────────────

const VALID_CLIENT = {
  clientName: "Test Salon",
  slug: "test-salon",
  timezone: "Europe/Vienna",
  packageType: "growth",
  languages: ["de", "en"],
  defaultLanguage: "de",
  channels: { website: true, instagramDm: false, whatsapp: true, email: true },
  bookingRules: {
    allowAfterHoursLeadCapture: true,
    reminderHoursBefore: [24, 3],
    rescheduleWindowHours: 12,
    maxBookingsPerSlot: 1,
    minAdvanceBookingHours: 2,
    cancellationPolicyHours: 24,
    recoveryWaitHours: 48,
    maxFollowUpAttempts: 2,
  },
  operatingHours: {
    monday: { open: "09:00", close: "19:00" },
    tuesday: { open: "09:00", close: "19:00" },
    wednesday: { open: "09:00", close: "19:00" },
    thursday: { open: "09:00", close: "21:00" },
    friday: { open: "09:00", close: "19:00" },
    saturday: { open: "10:00", close: "17:00" },
    sunday: null,
  },
  contact: {
    phone: "+43 1 234 5678",
    email: "hello@test.at",
    address: "Teststraße 1, 1010 Wien",
  },
  gdpr: {
    dataControllerName: "Test GmbH",
    dataControllerEmail: "datenschutz@test.at",
    privacyPolicyUrl: "/datenschutz",
    dataRetentionDays: 730,
    consentRequired: ["data_processing"],
    marketingConsentOptional: true,
  },
  features: {
    aiIntake: true,
    aiBooking: true,
    aiFollowUp: true,
    instagramDmFlow: false,
    recoveryFlow: true,
    multiLanguage: true,
    advancedReporting: false,
  },
};

const VALID_SERVICES = {
  categories: [
    {
      name: "Nails",
      slug: "nails",
      services: [
        {
          id: "svc_test_service",
          name: "Test Service",
          nameEn: "Test Service EN",
          duration: 60,
          priceEur: 4500,
          description: "A test service",
          popular: true,
        },
      ],
    },
  ],
};

const VALID_BRANDING = {
  brandTone: {
    style: "premium, warm",
    personality: "Friendly expert",
    avoid: ["robotic"],
    allowEmojis: false,
    formalityLevel: "Sie-Form",
  },
  colors: {
    primary: "#2D2926",
    secondary: "#C9A96E",
    accent: "#E8DDD0",
    background: "#FAFAF8",
  },
  ctaTemplates: {
    de: { bookNow: "Termin buchen", contactUs: "Kontakt", learnMore: "Mehr" },
    en: { bookNow: "Book Now", contactUs: "Contact", learnMore: "Learn More" },
    tr: { bookNow: "Randevu Al", contactUs: "İletişim", learnMore: "Daha Fazla" },
  },
  messageTemplates: {
    bookingConfirmation: {
      de: "Termin bestätigt für {customerName}.",
      en: "Booking confirmed for {customerName}.",
      tr: "{customerName} için randevu onaylandı.",
    },
    reminder24h: {
      de: "Morgen Termin für {customerName}.",
      en: "Tomorrow appointment for {customerName}.",
      tr: "Yarın randevu {customerName}.",
    },
    reminder3h: {
      de: "Heute um {time}.",
      en: "Today at {time}.",
      tr: "Bugün saat {time}.",
    },
  },
};

function createTestSalon(
  baseDir: string,
  slug: string,
  overrides: {
    client?: Record<string, unknown>;
    services?: Record<string, unknown>;
    branding?: Record<string, unknown>;
  } = {}
): string {
  const dir = join(baseDir, slug);
  mkdirSync(dir, { recursive: true });

  writeFileSync(
    join(dir, "client.config.json"),
    JSON.stringify({ ...VALID_CLIENT, slug, ...overrides.client })
  );
  writeFileSync(
    join(dir, "services.json"),
    JSON.stringify({ ...VALID_SERVICES, ...overrides.services })
  );
  writeFileSync(
    join(dir, "branding.json"),
    JSON.stringify({ ...VALID_BRANDING, ...overrides.branding })
  );

  return dir;
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("loadSalonConfig", () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `beauty-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
    clearConfigCache();
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
    clearConfigCache();
  });

  it("loads and validates a valid salon config", () => {
    createTestSalon(testDir, "test-salon");
    const config = loadSalonConfig(testDir, "test-salon");

    expect(config.client.clientName).toBe("Test Salon");
    expect(config.client.slug).toBe("test-salon");
    expect(config.client.packageType).toBe("growth");
    expect(config.services.categories).toHaveLength(1);
    expect(config.branding.brandTone.allowEmojis).toBe(false);
    expect(config.prompts).toEqual({});
  });

  it("throws when client config has invalid slug format", () => {
    createTestSalon(testDir, "test-salon", {
      client: { slug: "INVALID SLUG!" },
    });
    expect(() => loadSalonConfig(testDir, "test-salon")).toThrow(
      /Invalid client config/
    );
  });

  it("throws when slug in config mismatches directory slug", () => {
    createTestSalon(testDir, "test-salon", {
      client: { slug: "different-slug" },
    });
    expect(() => loadSalonConfig(testDir, "test-salon")).toThrow(
      /slug mismatch/
    );
  });

  it("throws when service id does not start with svc_", () => {
    createTestSalon(testDir, "test-salon", {
      services: {
        categories: [
          {
            name: "Nails",
            slug: "nails",
            services: [
              {
                id: "invalid_id",
                name: "Test",
                nameEn: "Test EN",
                duration: 60,
                popular: false,
              },
            ],
          },
        ],
      },
    });
    expect(() => loadSalonConfig(testDir, "test-salon")).toThrow(
      /Invalid services config/
    );
  });

  it("throws when branding hex color is invalid", () => {
    createTestSalon(testDir, "test-salon", {
      branding: {
        ...VALID_BRANDING,
        colors: { ...VALID_BRANDING.colors, primary: "not-a-color" },
      },
    });
    expect(() => loadSalonConfig(testDir, "test-salon")).toThrow(
      /Invalid branding config/
    );
  });

  it("throws when directory does not exist", () => {
    expect(() => loadSalonConfig(testDir, "nonexistent-salon")).toThrow();
  });

  it("throws when required GDPR field is missing", () => {
    createTestSalon(testDir, "test-salon", {
      client: {
        gdpr: {
          ...VALID_CLIENT.gdpr,
          dataControllerEmail: "not-an-email",
        },
      },
    });
    expect(() => loadSalonConfig(testDir, "test-salon")).toThrow(
      /Invalid client config/
    );
  });
});

describe("getCachedSalonConfig", () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `beauty-cache-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
    clearConfigCache();
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
    clearConfigCache();
  });

  it("returns same object reference on second call (cache hit)", () => {
    createTestSalon(testDir, "test-salon");
    const first = getCachedSalonConfig(testDir, "test-salon");
    const second = getCachedSalonConfig(testDir, "test-salon");
    expect(first).toBe(second);
  });

  it("loads fresh config after cache clear", () => {
    createTestSalon(testDir, "test-salon");
    const first = getCachedSalonConfig(testDir, "test-salon");
    clearConfigCache();
    const second = getCachedSalonConfig(testDir, "test-salon");
    expect(first).not.toBe(second);
    expect(first.client.slug).toBe(second.client.slug);
  });
});
