#!/usr/bin/env node
/**
 * Multi-tenant smoke test.
 * Assumes dev server is already running on port 3030.
 * Runs ONCE — to test both salons, run this script twice with different env:
 *
 *   NEXT_PUBLIC_DEFAULT_CLIENT_SLUG=demo-salon pnpm dev        (terminal 1)
 *   node apps/web/scripts/smoke-multitenant.mjs demo-salon     (terminal 2)
 *
 * Then stop, restart dev with elegant-nails-vienna, run again.
 */

const expectedContent = {
  "demo-salon": {
    clientName: "Vienna Glow Studio",
    phone: "+43 1 234 5678",
    hasWhatsApp: true,
    primaryColor: "#2D2926",
  },
  "elegant-nails-vienna": {
    clientName: "Elegant Nails Vienna",
    phone: "+43 1 987 6543",
    hasWhatsApp: false,
    primaryColor: "#1A1A2E",
  },
};

const slug = process.argv[2];
if (!slug || !expectedContent[slug]) {
  console.error(`Usage: node smoke-multitenant.mjs <demo-salon|elegant-nails-vienna>`);
  process.exit(1);
}

const expected = expectedContent[slug];
const url = "http://localhost:3030/";

try {
  const res = await fetch(url);
  if (!res.ok) {
    console.error(`FAIL: HTTP ${res.status} from ${url}`);
    process.exit(1);
  }
  const html = await res.text();

  const checks = [
    {
      name: "clientName in page",
      pass: html.includes(expected.clientName),
      detail: `expected "${expected.clientName}"`,
    },
    {
      name: "phone in page",
      pass: html.includes(expected.phone),
      detail: `expected "${expected.phone}"`,
    },
    {
      name: "primary color in injected style",
      pass: html.includes(`--brand-primary: ${expected.primaryColor}`),
      detail: `expected CSS var "--brand-primary: ${expected.primaryColor}"`,
    },
    {
      name: expected.hasWhatsApp ? "WhatsApp link present" : "WhatsApp link absent",
      pass: expected.hasWhatsApp
        ? html.includes("wa.me/")
        : !html.includes("wa.me/"),
      detail: expected.hasWhatsApp
        ? "expected wa.me/ link in HTML"
        : "expected NO wa.me/ link in HTML",
    },
  ];

  let allPassed = true;
  for (const c of checks) {
    const icon = c.pass ? "PASS" : "FAIL";
    console.log(`[${icon}] ${c.name} — ${c.detail}`);
    if (!c.pass) allPassed = false;
  }

  if (!allPassed) {
    console.error(`\nSmoke test FAILED for slug "${slug}"`);
    process.exit(1);
  }
  console.log(`\nSmoke test PASSED for slug "${slug}"`);
} catch (err) {
  console.error(`FAIL: ${err.message}`);
  console.error("Is the dev server running on port 3030?");
  process.exit(1);
}
