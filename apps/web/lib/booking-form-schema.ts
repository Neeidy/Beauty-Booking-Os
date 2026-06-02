import { z } from "zod";
import type { Dictionary } from "./i18n/dictionary";

/**
 * Builds the booking form schema with validation messages from the active dictionary.
 * Validation rules, fields and the contact-required refine are unchanged from the
 * original static schema — only the message strings are now localized.
 */
export function makeBookingFormSchema(dict: Dictionary) {
  const e = dict.booking.schema;
  return z
    .object({
      customerName: z.string().min(2, e.nameMin),
      customerEmail: z.string().email(e.emailInvalid).optional().or(z.literal("")),
      customerPhone: z.string().min(6, e.phoneInvalid).optional().or(z.literal("")),
      serviceId: z.string().min(1, e.servicePick),
      notes: z.string().max(500, e.notesMax).optional(),
      gdprDataProcessing: z.literal(true, {
        errorMap: () => ({ message: e.gdprRequired }),
      }),
      gdprReminders: z.boolean(),
      gdprMarketing: z.boolean(),
    })
    .refine((data) => data.customerEmail || data.customerPhone, {
      message: e.contactRequired,
      path: ["customerEmail"],
    });
}

export type BookingFormData = z.infer<ReturnType<typeof makeBookingFormSchema>>;
