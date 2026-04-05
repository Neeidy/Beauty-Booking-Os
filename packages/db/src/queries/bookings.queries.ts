import { eq, desc } from "drizzle-orm";
import { getDb, bookings, type NewBooking, type Booking } from "../index";

export async function createBooking(data: NewBooking): Promise<Booking> {
  const db = getDb();
  const [booking] = await db.insert(bookings).values(data).returning();
  if (!booking) throw new Error("Failed to create booking");
  return booking;
}

export async function getBookingById(id: string): Promise<Booking | undefined> {
  const db = getDb();
  const [booking] = await db.select().from(bookings).where(eq(bookings.id, id));
  return booking;
}

export async function updateBookingStatus(
  id: string,
  status: Booking["status"]
): Promise<Booking> {
  const db = getDb();
  const [updated] = await db
    .update(bookings)
    .set({ status, updatedAt: new Date() })
    .where(eq(bookings.id, id))
    .returning();
  if (!updated) throw new Error(`Booking ${id} not found`);
  return updated;
}

export async function listBookingsByClient(
  clientId: string,
  limit = 50,
  offset = 0
): Promise<Booking[]> {
  const db = getDb();
  return db
    .select()
    .from(bookings)
    .where(eq(bookings.clientId, clientId))
    .orderBy(desc(bookings.appointmentAt))
    .limit(limit)
    .offset(offset);
}
