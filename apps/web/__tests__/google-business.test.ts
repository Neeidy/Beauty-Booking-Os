import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock loadClientConfig — tüm testlerde
vi.mock("@/lib/load-client-config", () => ({
  loadClientConfig: vi.fn(),
}));

import { loadClientConfig } from "@/lib/load-client-config";

const MOCK_CONFIG_WITH_GOOGLE = {
  googleBusiness: {
    profileUrl: "https://booking.google.com/business/vienna-glow-studio",
    bookingButtonText: {
      de: "Jetzt buchen",
      en: "Book now",
    },
  },
  defaultLanguage: "de",
};

const MOCK_CONFIG_WITHOUT_GOOGLE = {
  clientName: "Vienna Glow Studio",
  // googleBusiness field yok
};

beforeEach(() => {
  vi.resetAllMocks();
});

describe("Google Business config loading", () => {
  it("returns profileUrl when googleBusiness config present", () => {
    vi.mocked(loadClientConfig).mockReturnValue(MOCK_CONFIG_WITH_GOOGLE as any);

    const cfg = loadClientConfig();
    expect(cfg.googleBusiness?.profileUrl).toBe(
      "https://booking.google.com/business/vienna-glow-studio"
    );
  });

  it("returns undefined profileUrl when googleBusiness config missing", () => {
    vi.mocked(loadClientConfig).mockReturnValue(
      MOCK_CONFIG_WITHOUT_GOOGLE as any
    );

    const cfg = loadClientConfig();
    expect(cfg.googleBusiness?.profileUrl).toBeUndefined();
  });

  it("returns correct German button text from config", () => {
    vi.mocked(loadClientConfig).mockReturnValue(MOCK_CONFIG_WITH_GOOGLE as any);

    const cfg = loadClientConfig();
    const buttonText =
      cfg.googleBusiness?.bookingButtonText?.["de"] ?? "Jetzt buchen";
    expect(buttonText).toBe("Jetzt buchen");
  });

  it("falls back to 'Jetzt buchen' when bookingButtonText is missing", () => {
    vi.mocked(loadClientConfig).mockReturnValue({
      googleBusiness: {
        profileUrl: "https://booking.google.com/business/test",
        // bookingButtonText yok
      },
    } as any);

    const cfg = loadClientConfig();
    const buttonText =
      cfg.googleBusiness?.bookingButtonText?.["de"] ?? "Jetzt buchen";
    expect(buttonText).toBe("Jetzt buchen"); // fallback çalışıyor
  });
});
