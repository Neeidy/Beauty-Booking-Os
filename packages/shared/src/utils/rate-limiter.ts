/**
 * In-memory rate limiter.
 *
 * V1: works correctly for single-instance deployments.
 * Production multi-instance: replace the store with Redis.
 *
 * Uses a sliding window counter per key (typically IP address).
 */

interface RateLimitEntry {
  count: number;
  windowStartMs: number;
}

// Global store — shared across requests in the same Node.js process
const store = new Map<string, RateLimitEntry>();

export interface RateLimitOptions {
  /** Maximum requests allowed per window */
  maxRequests: number;
  /** Window duration in milliseconds */
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  /** How many requests remain in this window */
  remaining: number;
  /** Milliseconds until the window resets */
  resetMs: number;
}

/**
 * Check whether a key (e.g. IP address) is within its rate limit.
 * Mutates the internal store on every call.
 */
export function checkRateLimit(key: string, opts: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const existing = store.get(key);

  if (!existing || now - existing.windowStartMs >= opts.windowMs) {
    // New window
    store.set(key, { count: 1, windowStartMs: now });
    return {
      allowed: true,
      remaining: opts.maxRequests - 1,
      resetMs: opts.windowMs,
    };
  }

  existing.count += 1;
  const resetMs = opts.windowMs - (now - existing.windowStartMs);

  if (existing.count > opts.maxRequests) {
    return { allowed: false, remaining: 0, resetMs };
  }

  return {
    allowed: true,
    remaining: opts.maxRequests - existing.count,
    resetMs,
  };
}

/**
 * Resets the rate limit for a specific key (useful in tests).
 */
export function resetRateLimit(key: string): void {
  store.delete(key);
}

/**
 * Clears all rate limit entries (useful in tests).
 */
export function clearAllRateLimits(): void {
  store.clear();
}

// ── Default limits ────────────────────────────────────────────────────────────

const REQUESTS_PER_MINUTE = Number(process.env["RATE_LIMIT_REQUESTS_PER_MINUTE"] ?? 30);
const WINDOW_MS = 60_000;

export const PUBLIC_RATE_LIMIT: RateLimitOptions = {
  maxRequests: REQUESTS_PER_MINUTE,
  windowMs: WINDOW_MS,
};

export const ADMIN_RATE_LIMIT: RateLimitOptions = {
  maxRequests: REQUESTS_PER_MINUTE * 5, // 5× more lenient for admin
  windowMs: WINDOW_MS,
};
