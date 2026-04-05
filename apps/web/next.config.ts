import type { NextConfig } from "next";

const ALLOWED_ORIGIN = process.env["NEXT_PUBLIC_SALON_DOMAIN"] ?? "*";

const nextConfig: NextConfig = {
  // Use standalone output for Docker/cloud deployment
  output: "standalone",

  // Security headers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline'", // unsafe-inline needed for Next.js
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "font-src 'self'",
              "connect-src 'self'",
              "frame-ancestors 'none'",
            ].join("; "),
          },
        ],
      },
      // CORS for public API endpoints — restrict to salon domain
      {
        source: "/api/lead/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: ALLOWED_ORIGIN },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type" },
        ],
      },
      {
        source: "/api/booking/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: ALLOWED_ORIGIN },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, PATCH, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type" },
        ],
      },
    ];
  },
};

export default nextConfig;
