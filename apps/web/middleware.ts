import { type NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "admin_session";
const ADMIN_SECRET = process.env["ADMIN_SECRET"] ?? "change-me-in-production";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only protect /admin routes (except login page and API)
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
  matcher: ["/admin/:path*"],
};
