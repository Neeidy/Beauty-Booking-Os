import { describe, it, expect, beforeEach } from "vitest";
import {
  checkRateLimit,
  clearAllRateLimits,
  resetRateLimit,
} from "../utils/rate-limiter.js";

const OPTS = { maxRequests: 3, windowMs: 60_000 };

describe("checkRateLimit", () => {
  beforeEach(() => { clearAllRateLimits(); });

  it("first request is allowed, remaining = maxRequests - 1", () => {
    const result = checkRateLimit("127.0.0.1", OPTS);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
  });

  it("requests up to maxRequests are all allowed", () => {
    for (let i = 0; i < 3; i++) {
      const r = checkRateLimit("10.0.0.1", OPTS);
      expect(r.allowed).toBe(true);
    }
  });

  it("request exceeding maxRequests is rejected with 429", () => {
    for (let i = 0; i < 3; i++) checkRateLimit("10.0.0.2", OPTS);
    const result = checkRateLimit("10.0.0.2", OPTS);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("different IPs have independent counters", () => {
    // Fill up IP A
    for (let i = 0; i < 3; i++) checkRateLimit("ip-a", OPTS);
    const a4 = checkRateLimit("ip-a", OPTS);
    expect(a4.allowed).toBe(false);

    // IP B is unaffected
    const b1 = checkRateLimit("ip-b", OPTS);
    expect(b1.allowed).toBe(true);
  });

  it("window resets after windowMs — new window starts fresh", () => {
    // Use a very short window for this test
    const shortOpts = { maxRequests: 2, windowMs: 1 }; // 1ms window
    checkRateLimit("reset-test", shortOpts);
    checkRateLimit("reset-test", shortOpts);
    const over = checkRateLimit("reset-test", shortOpts);
    expect(over.allowed).toBe(false);

    // Wait for window to expire
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        const fresh = checkRateLimit("reset-test", shortOpts);
        expect(fresh.allowed).toBe(true);
        resolve();
      }, 5);
    });
  });

  it("resetRateLimit clears a specific key", () => {
    for (let i = 0; i < 3; i++) checkRateLimit("reset-me", OPTS);
    expect(checkRateLimit("reset-me", OPTS).allowed).toBe(false);

    resetRateLimit("reset-me");
    expect(checkRateLimit("reset-me", OPTS).allowed).toBe(true);
  });

  it("returns correct resetMs", () => {
    const result = checkRateLimit("time-check", OPTS);
    expect(result.resetMs).toBeGreaterThan(0);
    expect(result.resetMs).toBeLessThanOrEqual(OPTS.windowMs);
  });
});
