import { type NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "admin_session";
const ADMIN_SECRET = process.env["ADMIN_SECRET"] ?? "change-me-in-production";
// Shared secret sent to /api/internal/log so the sink can reject public callers.
// Mirrors the fallback chain in that route handler.
const INTERNAL_LOG_SECRET =
  process.env["INTERNAL_LOG_SECRET"] ?? process.env["WEBHOOK_SECRET"] ?? "";

/**
 * Constant-time string compare for the Edge runtime (no node:crypto here).
 * Pure-JS XOR accumulation over a fixed iteration count so the timing does not
 * reveal where a mismatch occurred or the secret's length. Mismatched lengths
 * still iterate the full span and always return false.
 */
function timingSafeStrEqual(a: string | undefined | null, b: string): boolean {
  if (a == null) return false;
  let diff = a.length ^ b.length;
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}

const REQUESTS_PER_MINUTE = Number(process.env["RATE_LIMIT_REQUESTS_PER_MINUTE"] ?? 30);
const WINDOW_MS = 60_000;

const PUBLIC_LIMIT  = { maxRequests: REQUESTS_PER_MINUTE,      windowMs: WINDOW_MS };
const ADMIN_LIMIT   = { maxRequests: REQUESTS_PER_MINUTE * 5,  windowMs: WINDOW_MS };

/** Public endpoints that should be rate limited */
const PUBLIC_RATE_LIMITED = ["/api/lead", "/api/booking", "/api/webhook"];

// ── Inline rate limiter ───────────────────────────────────────────────────────
// Inlined here because Next.js middleware runs in Edge Runtime, which has
// restricted module resolution and cannot import workspace packages via
// relative paths. The in-memory store is per-instance (single isolate).

interface RateLimitEntry { count: number; windowStartMs: number; }
const store = new Map<string, RateLimitEntry>();

function checkRateLimit(
  key: string,
  opts: { maxRequests: number; windowMs: number }
): { allowed: boolean; resetMs: number } {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now - entry.windowStartMs >= opts.windowMs) {
    store.set(key, { count: 1, windowStartMs: now });
    return { allowed: true, resetMs: opts.windowMs };
  }

  if (entry.count >= opts.maxRequests) {
    const resetMs = opts.windowMs - (now - entry.windowStartMs);
    return { allowed: false, resetMs };
  }

  entry.count++;
  return { allowed: true, resetMs: opts.windowMs - (now - entry.windowStartMs) };
}

// ── IP extraction ─────────────────────────────────────────────────────────────

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

// ── Middleware ────────────────────────────────────────────────────────────────

export function middleware(request: NextRequest) {
  const start = Date.now();
  const { pathname } = request.nextUrl;
  const ip = getClientIp(request);

  // ── Rate limiting: public API routes ─────────────────────────────────────
  const isPublicApi = PUBLIC_RATE_LIMITED.some((path) => pathname.startsWith(path));
  if (isPublicApi) {
    const result = checkRateLimit(`pub:${ip}`, PUBLIC_LIMIT);
    if (!result.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil(result.resetMs / 1000)),
            "X-RateLimit-Limit": String(PUBLIC_LIMIT.maxRequests),
            "X-RateLimit-Remaining": "0",
          },
        }
      );
    }
  }

  // ── Rate limiting: admin API routes ──────────────────────────────────────
  if (pathname.startsWith("/api/admin")) {
    const result = checkRateLimit(`adm:${ip}`, ADMIN_LIMIT);
    if (!result.allowed) {
      return NextResponse.json(
        { error: "Too many requests." },
        { status: 429, headers: { "Retry-After": String(Math.ceil(result.resetMs / 1000)) } }
      );
    }
  }

  // ── Admin page auth guard ─────────────────────────────────────────────────
  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
    const cookie = request.cookies.get(COOKIE_NAME);
    if (!timingSafeStrEqual(cookie?.value, ADMIN_SECRET)) {
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // ── API request logging ───────────────────────────────────────────────────
  // Middleware runs in Edge runtime — fs is unavailable, so we fire-and-forget
  // a POST to the internal log sink which runs in Node.js and can write to disk.
  // Status is always 0 here because Next.js middleware cannot intercept the
  // route handler's response (streaming limitation). Per-route logRequest calls
  // provide accurate status + duration for individually instrumented routes.
  if (pathname.startsWith("/api/") && !pathname.startsWith("/api/internal/")) {
    const duration = Date.now() - start;
    void fetch(new URL("/api/internal/log", request.url).toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Proves to the log sink that this POST originates from our middleware.
        "x-internal-log": INTERNAL_LOG_SECRET,
      },
      body: JSON.stringify({
        type: "request",
        method: request.method,
        path: pathname,
        status: 0,
        durationMs: duration,
        note: "response status unavailable in middleware",
      }),
    }).catch(() => {});
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/:path*"],
};
