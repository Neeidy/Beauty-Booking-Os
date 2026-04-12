import { and, inArray, lte } from "drizzle-orm";
import { getDb, slotReservations } from "@beauty-booking/db";

export const ACTIVE_TTL_MINUTES = 10;
export const SUBMITTED_TTL_MINUTES = 60;

/** Cryptographically safe token — edge-runtime compatible (no crypto.randomBytes). */
export function generateReservationToken(): string {
  return crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
  // Result: 64-char hex string
}

export function calculateReservationWindow(params: {
  appointmentAtUtc: Date;
  durationMinutes: number;
}): { slotStart: Date; slotEnd: Date } {
  const slotStart = params.appointmentAtUtc;
  const slotEnd = new Date(slotStart.getTime() + params.durationMinutes * 60 * 1000);
  return { slotStart, slotEnd };
}

export function createReservationExpiry(now: Date): Date {
  return new Date(now.getTime() + ACTIVE_TTL_MINUTES * 60 * 1000);
}

export function extendSubmittedExpiry(now: Date): Date {
  return new Date(now.getTime() + SUBMITTED_TTL_MINUTES * 60 * 1000);
}

/**
 * Marks stale active/submitted reservations as expired.
 * Always call on the main db instance (not inside a transaction) to avoid type issues.
 */
export async function expireStaleSlotReservations(
  db: ReturnType<typeof getDb>,
  now: Date
): Promise<void> {
  await db
    .update(slotReservations)
    .set({ status: "expired" })
    .where(
      and(
        inArray(slotReservations.status, ["active", "submitted"]),
        lte(slotReservations.expiresAt, now)
      )
    );
}
