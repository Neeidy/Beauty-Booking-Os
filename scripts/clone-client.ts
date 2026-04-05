/**
 * Clone Client Script
 *
 * Usage:  npx tsx scripts/clone-client.ts <slug>
 * Example: npx tsx scripts/clone-client.ts elegant-nails-vienna
 *
 * Steps:
 * 1. Load + validate all config files from clients/<slug>/
 * 2. Insert client record into DB (upsert by slug)
 * 3. Insert services into DB
 * 4. Print feature flag summary
 * 5. Print dry-run report
 */

import { join, resolve } from "path";
import { loadSalonConfig } from "../packages/config/src/loader.js";
import { getDb, clients, services } from "../packages/db/src/index.js";
import { eq } from "drizzle-orm";

const CLIENTS_DIR = resolve(process.cwd(), "clients");

const PACKAGE_FEATURES: Record<string, Record<string, boolean | number | string[]>> = {
  starter: {
    aiIntake: false,
    aiBooking: false,
    aiFollowUp: false,
    instagramDmFlow: false,
    recoveryFlow: false,
    multiLanguage: false,
    advancedReporting: false,
    maxReminders: 1,
    channels: ["website"],
  },
  growth: {
    aiIntake: true,
    aiBooking: true,
    aiFollowUp: true,
    instagramDmFlow: false,
    recoveryFlow: true,
    multiLanguage: true,
    advancedReporting: false,
    maxReminders: 2,
    channels: ["website", "whatsapp"],
  },
  premium: {
    aiIntake: true,
    aiBooking: true,
    aiFollowUp: true,
    instagramDmFlow: true,
    recoveryFlow: true,
    multiLanguage: true,
    advancedReporting: true,
    maxReminders: 3,
    channels: ["website", "whatsapp", "instagram_dm", "email"],
  },
};

async function main() {
  const slug = process.argv[2];

  if (!slug) {
    console.error("Usage: npx tsx scripts/clone-client.ts <slug>");
    console.error("Example: npx tsx scripts/clone-client.ts elegant-nails-vienna");
    process.exit(1);
  }

  console.log(`\n🔧 Cloning salon: ${slug}`);
  console.log("─".repeat(50));

  // ── Step 1: Load + validate config ───────────────────────────────────────────
  let salonConfig;
  try {
    salonConfig = loadSalonConfig(CLIENTS_DIR, slug);
    console.log(`✓ Config loaded and validated`);
    console.log(`  - Client: ${salonConfig.client.clientName}`);
    console.log(`  - Package: ${salonConfig.client.packageType}`);
    console.log(`  - Languages: ${salonConfig.client.languages.join(", ")}`);
    console.log(`  - Services: ${salonConfig.services.categories.flatMap(c => c.services).length} total`);
  } catch (err) {
    console.error(`✗ Config validation failed: ${(err as Error).message}`);
    process.exit(1);
  }

  const { client: clientData, services: servicesData } = salonConfig;

  // ── Step 2: Package feature flags ────────────────────────────────────────────
  const packageFlags = PACKAGE_FEATURES[clientData.packageType];
  console.log(`\n📦 Package: ${clientData.packageType}`);
  console.log(`  - AI Intake: ${packageFlags.aiIntake}`);
  console.log(`  - AI Booking: ${packageFlags.aiBooking}`);
  console.log(`  - Recovery Flow: ${packageFlags.recoveryFlow}`);
  console.log(`  - Multi-language: ${packageFlags.multiLanguage}`);
  console.log(`  - Max Reminders: ${packageFlags.maxReminders}`);

  // ── Step 3: Insert into DB ────────────────────────────────────────────────────
  const db = getDb();

  // Check if client already exists
  const existing = await db.select().from(clients).where(eq(clients.slug, slug));
  let clientId: string;

  if (existing.length > 0) {
    clientId = existing[0]!.id;
    await db.update(clients)
      .set({
        name: clientData.clientName,
        packageType: clientData.packageType as never,
        timezone: clientData.timezone,
        languages: clientData.languages,
        configSnapshot: salonConfig as never,
        gdprContactEmail: clientData.gdpr.dataControllerEmail,
        dataRetentionDays: clientData.gdpr.dataRetentionDays,
        updatedAt: new Date(),
      })
      .where(eq(clients.slug, slug));
    console.log(`\n✓ Client updated in DB (id: ${clientId})`);
  } else {
    const [newClient] = await db.insert(clients)
      .values({
        name: clientData.clientName,
        slug: clientData.slug,
        status: "active",
        packageType: clientData.packageType as never,
        timezone: clientData.timezone,
        languages: clientData.languages,
        configSnapshot: salonConfig as never,
        gdprContactEmail: clientData.gdpr.dataControllerEmail,
        dataRetentionDays: clientData.gdpr.dataRetentionDays,
      })
      .returning({ id: clients.id });
    clientId = newClient!.id;
    console.log(`\n✓ Client inserted into DB (id: ${clientId})`);
  }

  // ── Step 4: Insert services ───────────────────────────────────────────────────
  const allServices = servicesData.categories.flatMap((cat, catIdx) =>
    cat.services.map((svc, svcIdx) => ({
      clientId,
      serviceName: svc.name,
      category: cat.slug,
      durationMinutes: svc.duration,
      priceEur: svc.priceEur ?? null,
      description: svc.description ?? null,
      active: true,
      sortOrder: catIdx * 100 + svcIdx,
    }))
  );

  if (allServices.length > 0) {
    // Delete existing services first (clean re-seed)
    await db.delete(services).where(eq(services.clientId, clientId));
    await db.insert(services).values(allServices);
    console.log(`✓ ${allServices.length} services inserted`);
  }

  // ── Step 5: Dry-run verification ──────────────────────────────────────────────
  console.log(`\n📋 Dry-run verification:`);
  console.log(`  - Lead intake path: ${clientData.features.aiIntake ? "AI (Intake Agent)" : "→ Human review (starter package)"}`);
  console.log(`  - Booking: ${clientData.features.aiBooking ? "AI (Booking Agent)" : "→ Manual"}`);
  console.log(`  - Reminders: max ${clientData.bookingRules.reminderHoursBefore.length} per booking`);
  console.log(`  - GDPR controller: ${clientData.gdpr.dataControllerEmail}`);
  console.log(`  - Brand voice: ${salonConfig.branding.brandTone.formalityLevel} / emojis: ${salonConfig.branding.brandTone.allowEmojis}`);

  console.log(`\n✅ Clone complete: ${clientData.clientName}`);
  console.log(`   slug:      ${clientData.slug}`);
  console.log(`   client_id: ${clientId}`);
  console.log(`   package:   ${clientData.packageType}`);
  console.log("─".repeat(50));
}

main().catch((err) => {
  console.error("Clone failed:", err);
  process.exit(1);
});
