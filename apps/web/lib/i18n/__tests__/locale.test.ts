import { describe, it, expect, vi, beforeEach } from "vitest";
import { normalizeLocale, LOCALES, FALLBACK_LOCALE } from "../locales";
import de from "../dictionaries/de.json";
import en from "../dictionaries/en.json";

// ── Mocks ─────────────────────────────────────────────────────────────────────
const cookieGet = vi.fn();
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ get: cookieGet })),
}));

vi.mock("@/lib/load-client-config", () => ({
  loadClientConfig: vi.fn(),
}));

import { getLocale } from "../server";
import { loadClientConfig } from "@/lib/load-client-config";

beforeEach(() => {
  vi.clearAllMocks();
  cookieGet.mockReturnValue(undefined);
});

// ── normalizeLocale ─────────────────────────────────────────────────────────
describe("normalizeLocale", () => {
  it("maps de → de", () => {
    expect(normalizeLocale("de")).toBe("de");
  });
  it("maps en → en", () => {
    expect(normalizeLocale("en")).toBe("en");
  });
  it("maps tr → en (fallback)", () => {
    expect(normalizeLocale("tr")).toBe("en");
  });
  it('maps "" → en (fallback)', () => {
    expect(normalizeLocale("")).toBe("en");
  });
  it("maps undefined → en (fallback)", () => {
    expect(normalizeLocale(undefined)).toBe("en");
  });
  it("maps null → en (fallback)", () => {
    expect(normalizeLocale(null)).toBe("en");
  });
  it("maps malformed object → en (fallback)", () => {
    expect(normalizeLocale({ foo: "bar" })).toBe("en");
  });
  it("FALLBACK_LOCALE is en and both locales supported", () => {
    expect(FALLBACK_LOCALE).toBe("en");
    expect(LOCALES).toEqual(["de", "en"]);
  });
});

// ── getLocale resolution order ──────────────────────────────────────────────
describe("getLocale", () => {
  it("cookie present → that locale", async () => {
    cookieGet.mockReturnValue({ value: "de" });
    vi.mocked(loadClientConfig).mockReturnValue({ defaultLocale: "en" } as never);
    await expect(getLocale()).resolves.toBe("de");
  });

  it("cookie present but invalid (tr) → en", async () => {
    cookieGet.mockReturnValue({ value: "tr" });
    await expect(getLocale()).resolves.toBe("en");
  });

  it("cookie absent → config defaultLocale", async () => {
    cookieGet.mockReturnValue(undefined);
    vi.mocked(loadClientConfig).mockReturnValue({ defaultLocale: "de" } as never);
    await expect(getLocale()).resolves.toBe("de");
  });

  it("cookie absent + config defaultLocale invalid (tr) → en", async () => {
    cookieGet.mockReturnValue(undefined);
    vi.mocked(loadClientConfig).mockReturnValue({ defaultLocale: "tr" } as never);
    await expect(getLocale()).resolves.toBe("en");
  });

  it("cookie absent + config has no defaultLocale → en", async () => {
    cookieGet.mockReturnValue(undefined);
    vi.mocked(loadClientConfig).mockReturnValue({} as never);
    await expect(getLocale()).resolves.toBe("en");
  });

  it("cookie absent + config read throws → en", async () => {
    cookieGet.mockReturnValue(undefined);
    vi.mocked(loadClientConfig).mockImplementation(() => {
      throw new Error("config missing");
    });
    await expect(getLocale()).resolves.toBe("en");
  });
});

// ── Dictionary parity ───────────────────────────────────────────────────────
describe("dictionary parity", () => {
  function flattenKeys(obj: unknown, prefix = ""): string[] {
    if (obj === null || typeof obj !== "object") return [prefix];
    return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) =>
      flattenKeys(v, prefix ? `${prefix}.${k}` : k)
    );
  }

  it("de.json and en.json have identical key sets", () => {
    const deKeys = flattenKeys(de).sort();
    const enKeys = flattenKeys(en).sort();
    expect(enKeys).toEqual(deKeys);
  });
});
