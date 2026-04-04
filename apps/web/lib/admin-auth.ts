import { type NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "admin_session";
const ADMIN_SECRET = process.env["ADMIN_SECRET"] ?? "change-me-in-production";

/** Check if the request has a valid admin session cookie. */
export function isAdminAuthenticated(request: NextRequest): boolean {
  const cookie = request.cookies.get(COOKIE_NAME);
  return cookie?.value === ADMIN_SECRET;
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
    path: "/admin",
    maxAge: 60 * 60 * 8, // 8 hours
    secure: process.env["NODE_ENV"] === "production",
  });
}

/** Clear the admin session cookie. */
export function clearAdminSession(response: NextResponse): void {
  response.cookies.delete(COOKIE_NAME);
}

/** For API routes: check Authorization header or cookie. */
export function isAdminApiAuthenticated(request: NextRequest): boolean {
  // Cookie-based (admin panel)
  if (isAdminAuthenticated(request)) return true;
  // Header-based (server-to-server or curl)
  const authHeader = request.headers.get("x-admin-secret");
  return authHeader === ADMIN_SECRET;
}
