import { type NextRequest, NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "crypto";

const COOKIE_NAME = "admin_session";
const ADMIN_SECRET = process.env["ADMIN_SECRET"] ?? "change-me-in-production";

/**
 * Constant-time string comparison. Both inputs are SHA-256 hashed first so the
 * compared buffers are always 32 bytes — this avoids timingSafeEqual's
 * equal-length requirement and prevents leaking the secret's length via timing.
 * (Used in API routes only, which run in the Node.js runtime where node:crypto
 * is fully available; the Edge middleware has its own inline equivalent.)
 */
function safeEqual(a: string | undefined | null, b: string): boolean {
  if (a == null) return false;
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

/** Check if the request has a valid admin session cookie. */
export function isAdminAuthenticated(request: NextRequest): boolean {
  const cookie = request.cookies.get(COOKIE_NAME);
  return safeEqual(cookie?.value, ADMIN_SECRET);
}

/** Redirect to login if not authenticated. */
export function requireAdminAuth(request: NextRequest): NextResponse | null {
  if (!isAdminAuthenticated(request)) {
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }
  return null;
}

/** Set the admin session cookie. */
export function setAdminSession(response: NextResponse): void {
  response.cookies.set(COOKIE_NAME, ADMIN_SECRET, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8, // 8 hours
    secure: process.env["NODE_ENV"] === "production",
  });
}

/** Clear the admin session cookie. */
export function clearAdminSession(response: NextResponse): void {
  response.cookies.delete(COOKIE_NAME);
}

/** Constant-time check of a submitted password against ADMIN_SECRET (login). */
export function verifyAdminSecret(submitted: string | undefined | null): boolean {
  return safeEqual(submitted, ADMIN_SECRET);
}

/** For API routes: check Authorization header or cookie. */
export function isAdminApiAuthenticated(request: NextRequest): boolean {
  // Cookie-based (admin panel)
  if (isAdminAuthenticated(request)) return true;
  // Header-based (server-to-server or curl)
  const authHeader = request.headers.get("x-admin-secret");
  return safeEqual(authHeader, ADMIN_SECRET);
}
