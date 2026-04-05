import { type NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "../../packages/shared/src/utils/rate-limiter.js";

const COOKIE_NAME = "admin_session";
const ADMIN_SECRET = process.env["ADMIN_SECRET"] ?? "change-me-in-production";

const REQUESTS_PER_MINUTE = Number(process.env["RATE_LIMIT_REQUESTS_PER_MINUTE"] ?? 30);
const WINDOW_MS = 60_000;

const PUBLIC_LIMIT  = { maxRequests: REQUESTS_PER_MINUTE,      windowMs: WINDOW_MS };
const ADMIN_LIMIT   = { maxRequests: REQUESTS_PER_MINUTE * 5,  windowMs: WINDOW_MS };

/** Public endpoints that should be rate limited */
const PUBLIC_RATE_LIMITED = ["/api/lead", "/api/booking", "/api/webhook"];

/** Returns client IP from standard headers */
function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

export function middleware(request: NextRequest) {
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
    if (cookie?.value !== ADMIN_SECRET) {
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/:path*"],
};
