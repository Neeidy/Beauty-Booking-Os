import { describe, it, expect } from "vitest";
import { makeBookingFormSchema, type BookingFormData } from "@/lib/booking-form-schema";
import { getDictionary } from "../dictionary";

function firstMessageForPath(
  result: ReturnType<ReturnType<typeof makeBookingFormSchema>["safeParse"]>,
  path: string
): string | undefined {
  if (result.success) return undefined;
  return result.error.issues.find((i) => i.path.join(".") === path)?.message;
}

describe("makeBookingFormSchema — localized messages", () => {
  const deSchema = makeBookingFormSchema(getDictionary("de"));
  const enSchema = makeBookingFormSchema(getDictionary("en"));

  const invalidName = {
    customerName: "A", // too short → triggers nameMin
    customerEmail: "a@b.co",
    customerPhone: "",
    serviceId: "svc-1",
    notes: "",
    gdprDataProcessing: true,
    gdprReminders: false,
    gdprMarketing: false,
  } as unknown as BookingFormData;

  it("produces the German name message on an invalid name", () => {
    const result = deSchema.safeParse(invalidName);
    expect(firstMessageForPath(result, "customerName")).toBe(
      getDictionary("de").booking.schema.nameMin
    );
    expect(firstMessageForPath(result, "customerName")).toContain("erforderlich");
  });

  it("produces the English name message on an invalid name", () => {
    const result = enSchema.safeParse(invalidName);
    expect(firstMessageForPath(result, "customerName")).toBe(
      getDictionary("en").booking.schema.nameMin
    );
    expect(firstMessageForPath(result, "customerName")).toContain("required");
  });

  it("contact-required refine fires when both email and phone are empty (DE)", () => {
    const noContact = {
      customerName: "Valid Name",
      customerEmail: "",
      customerPhone: "",
      serviceId: "svc-1",
      notes: "",
      gdprDataProcessing: true,
      gdprReminders: false,
      gdprMarketing: false,
    } as unknown as BookingFormData;

    const result = deSchema.safeParse(noContact);
    expect(result.success).toBe(false);
    expect(firstMessageForPath(result, "customerEmail")).toBe(
      getDictionary("de").booking.schema.contactRequired
    );
  });

  it("contact-required refine fires in English too", () => {
    const noContact = {
      customerName: "Valid Name",
      customerEmail: "",
      customerPhone: "",
      serviceId: "svc-1",
      notes: "",
      gdprDataProcessing: true,
      gdprReminders: false,
      gdprMarketing: false,
    } as unknown as BookingFormData;

    const result = enSchema.safeParse(noContact);
    expect(result.success).toBe(false);
    expect(firstMessageForPath(result, "customerEmail")).toBe(
      getDictionary("en").booking.schema.contactRequired
    );
  });

  it("passes with a valid payload (email present)", () => {
    const valid = {
      customerName: "Valid Name",
      customerEmail: "a@b.co",
      customerPhone: "",
      serviceId: "svc-1",
      notes: "",
      gdprDataProcessing: true,
      gdprReminders: false,
      gdprMarketing: false,
    } as unknown as BookingFormData;

    expect(deSchema.safeParse(valid).success).toBe(true);
  });

  it("gdprDataProcessing must be true (German message)", () => {
    const noGdpr = {
      customerName: "Valid Name",
      customerEmail: "a@b.co",
      customerPhone: "",
      serviceId: "svc-1",
      notes: "",
      gdprDataProcessing: false,
      gdprReminders: false,
      gdprMarketing: false,
    } as unknown as BookingFormData;

    const result = deSchema.safeParse(noGdpr);
    expect(firstMessageForPath(result, "gdprDataProcessing")).toBe(
      getDictionary("de").booking.schema.gdprRequired
    );
  });
});
