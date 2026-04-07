/**
 * Smoke test for apps/web.
 * Ensures vitest finds at least one test file and exits 0.
 * Full E2E tests are handled by Playwright.
 */
import { describe, it, expect } from "vitest";

describe("web app smoke", () => {
  it("environment is test", () => {
    expect(process.env["NODE_ENV"]).toBe("test");
  });

  it("NEXT_PUBLIC_SUPABASE_URL shape is valid if set", () => {
    const url = process.env["NEXT_PUBLIC_SUPABASE_URL"];
    if (url) {
      expect(url).toMatch(/^https?:\/\//);
    } else {
      // Not set in test env — acceptable
      expect(url).toBeUndefined();
    }
  });
});
