import { z } from "zod";

export const bookingFormSchema = z
  .object({
    customerName: z.string().min(2, "Name ist erforderlich (mind. 2 Zeichen)"),
    customerEmail: z
      .string()
      .email("Ungültige E-Mail-Adresse")
      .optional()
      .or(z.literal("")),
    customerPhone: z
      .string()
      .min(6, "Ungültige Telefonnummer")
      .optional()
      .or(z.literal("")),
    serviceId: z.string().min(1, "Bitte wählen Sie eine Leistung aus"),
    preferredDate: z.string().optional(),
    preferredTime: z.string().optional(),
    notes: z
      .string()
      .max(500, "Maximale Länge: 500 Zeichen")
      .optional(),
    gdprDataProcessing: z.literal(true, {
      errorMap: () => ({
        message: "Ihre Zustimmung zur Datenverarbeitung ist erforderlich",
      }),
    }),
    gdprReminders: z.boolean(),
    gdprMarketing: z.boolean(),
  })
  .refine((data) => data.customerEmail || data.customerPhone, {
    message: "Bitte geben Sie eine E-Mail-Adresse oder Telefonnummer an",
    path: ["customerEmail"],
  });

export type BookingFormData = z.infer<typeof bookingFormSchema>;
