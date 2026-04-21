"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { bookingFormSchema, type BookingFormData } from "../lib/booking-form-schema";
import servicesData from "../../../clients/demo-salon/services.json";

interface PublicStaffMember {
  id: string;
  name: string;
  title: string;
  serviceIds?: string[];
}
import DatePicker from "./DatePicker";
import SlotPicker from "./SlotPicker";

// Flatten services into a single list for the dropdown
const allServices = servicesData.categories.flatMap((cat) =>
  cat.services.map((svc) => ({
    id: svc.id,
    label: `${svc.name} — ${cat.name} (${Math.floor(svc.duration / 60) > 0 ? Math.floor(svc.duration / 60) + " Std. " : ""}${svc.duration % 60 > 0 ? (svc.duration % 60) + " Min. " : ""}· € ${(svc.priceEur / 100).toFixed(0)})`,
  }))
);

const DEMO_CLIENT_ID = process.env["NEXT_PUBLIC_DEMO_CLIENT_ID"] ?? "00000000-0000-0000-0000-000000000001";
const DEMO_CLIENT_SLUG = process.env["NEXT_PUBLIC_DEFAULT_CLIENT_SLUG"] ?? "demo-salon";

export default function BookingForm() {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlotDatetime, setSelectedSlotDatetime] = useState<string | null>(null);
  const [selectedSlotTime, setSelectedSlotTime] = useState<string | null>(null);
  const [reservationToken, setReservationToken] = useState<string | null>(null);
  const [staffList, setStaffList] = useState<PublicStaffMember[]>([]);
  const [staffLoadError, setStaffLoadError] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState<string>("");
  const [bookingSource, setBookingSource] = useState<"web_form" | "google_business">("web_form");

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<BookingFormData>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      gdprReminders: false,
      gdprMarketing: false,
    },
  });

  const selectedServiceId = watch("serviceId");
  const selectedService = allServices.find((s) => s.id === selectedServiceId);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/public/staff")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: { staff: PublicStaffMember[] }) => {
        if (!cancelled) setStaffList(data.staff ?? []);
      })
      .catch(() => {
        if (!cancelled) setStaffLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get("source") === "google_business") {
        setBookingSource("google_business");
      }
    }
  }, []);

  const onSubmit = async (data: BookingFormData) => {
    setIsSubmitting(true);
    setSubmitError(null);

    // Slot selection is required
    if (!selectedSlotDatetime) {
      setSubmitError("Lütfen randevu saati seçin");
      setIsSubmitting(false);
      return;
    }

    // Valid reservation token required when a slot is selected
    if (selectedSlotDatetime && !reservationToken) {
      setSubmitError("Lütfen geçerli bir slot seçin.");
      setIsSubmitting(false);
      return;
    }

    try {
      // Build the lead payload
      const gdprConsents = [
        {
          consentType: "data_processing",
          granted: true,
          method: "web_form",
        },
      ];
      if (data.gdprReminders) {
        gdprConsents.push({
          consentType: "reminder_messages",
          granted: true,
          method: "web_form",
        });
      }
      if (data.gdprMarketing) {
        gdprConsents.push({
          consentType: "marketing",
          granted: true,
          method: "web_form",
        });
      }

      // Build staff preference note
      const selectedStaff = selectedStaffId
        ? staffList.find((s) => s.id === selectedStaffId)
        : null;
      const baseNotes = data.notes ?? "";
      const notesValue = selectedStaff
        ? `Mitarbeiter-Wunsch: ${selectedStaff.name}${baseNotes ? `\n${baseNotes}` : ""}`
        : baseNotes;

      // Build raw message from form data
      const messageParts = [`Name: ${data.customerName}`];
      if (selectedService) messageParts.push(`Leistung: ${selectedService.label}`);
      if (selectedDate && selectedSlotTime) {
        messageParts.push(`Termin: ${selectedDate} um ${selectedSlotTime}`);
      }
      if (data.notes) messageParts.push(`Notiz: ${data.notes}`);

      const response = await fetch("/api/booking/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-client-id": DEMO_CLIENT_ID,
        },
        body: JSON.stringify({
          clientSlug: DEMO_CLIENT_SLUG,
          source: "web_form",
          customerName: data.customerName,
          customerEmail: data.customerEmail || undefined,
          customerPhone: data.customerPhone || undefined,
          rawMessage: messageParts.join(" | "),
          language: "de",
          gdprConsents,
          notes: notesValue || undefined,
          reservationToken: reservationToken ?? undefined,
          metadata: {
            serviceId: data.serviceId,
            appointmentAt: selectedSlotDatetime,
            appointmentTime: selectedSlotTime,
            appointmentDate: selectedDate,
            bookingSource: bookingSource,
          },
        }),
      });

      const result = await response.json() as { success: boolean; leadId?: string; error?: string };

      if (!response.ok || !result.success) {
        setSubmitError(result.error ?? "Es ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut.");
        return;
      }

      // Trigger auto-classify in background (fire and forget)
      if (result.leadId) {
        fetch(`/api/lead/${result.leadId}/classify`, { method: "POST" }).catch(() => {});
      }

      router.push("/booking/thank-you");
    } catch {
      setSubmitError("Verbindungsfehler. Bitte prüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
      {/* Personal info */}
      <fieldset className="space-y-4">
        <legend
          className="text-sm font-semibold uppercase tracking-wider"
          style={{ color: "var(--color-secondary)" }}
        >
          Ihre Daten
        </legend>

        {/* Name */}
        <div>
          <label
            htmlFor="customerName"
            className="mb-1 block text-sm font-medium"
            style={{ color: "var(--color-primary)" }}
          >
            Name <span aria-hidden="true">*</span>
          </label>
          <input
            id="customerName"
            type="text"
            autoComplete="name"
            placeholder="Ihr vollständiger Name"
            className="w-full rounded-sm border px-4 py-2.5 text-sm outline-none transition-colors focus:ring-1"
            style={{
              borderColor: errors.customerName ? "#dc2626" : "var(--color-accent)",
              backgroundColor: "#fff",
              color: "var(--color-primary)",
            }}
            {...register("customerName")}
          />
          {errors.customerName && (
            <p className="mt-1 text-xs text-red-600">{errors.customerName.message}</p>
          )}
        </div>

        {/* Email */}
        <div>
          <label
            htmlFor="customerEmail"
            className="mb-1 block text-sm font-medium"
            style={{ color: "var(--color-primary)" }}
          >
            E-Mail
          </label>
          <input
            id="customerEmail"
            type="email"
            autoComplete="email"
            placeholder="ihre@email.at"
            className="w-full rounded-sm border px-4 py-2.5 text-sm outline-none transition-colors focus:ring-1"
            style={{
              borderColor: errors.customerEmail ? "#dc2626" : "var(--color-accent)",
              backgroundColor: "#fff",
              color: "var(--color-primary)",
            }}
            {...register("customerEmail")}
          />
          {errors.customerEmail && (
            <p className="mt-1 text-xs text-red-600">{errors.customerEmail.message}</p>
          )}
        </div>

        {/* Phone */}
        <div>
          <label
            htmlFor="customerPhone"
            className="mb-1 block text-sm font-medium"
            style={{ color: "var(--color-primary)" }}
          >
            Telefon
          </label>
          <input
            id="customerPhone"
            type="tel"
            autoComplete="tel"
            placeholder="+43 660 1234567"
            className="w-full rounded-sm border px-4 py-2.5 text-sm outline-none transition-colors focus:ring-1"
            style={{
              borderColor: errors.customerPhone ? "#dc2626" : "var(--color-accent)",
              backgroundColor: "#fff",
              color: "var(--color-primary)",
            }}
            {...register("customerPhone")}
          />
          {errors.customerPhone && (
            <p className="mt-1 text-xs text-red-600">{errors.customerPhone.message}</p>
          )}
          <p className="mt-1 text-xs" style={{ color: "var(--color-text-muted)" }}>
            E-Mail oder Telefon — mind. eine Angabe erforderlich.
          </p>
        </div>
      </fieldset>

      {/* Service selection */}
      <fieldset className="space-y-4">
        <legend
          className="text-sm font-semibold uppercase tracking-wider"
          style={{ color: "var(--color-secondary)" }}
        >
          Leistung & Termin
        </legend>

        {/* Service */}
        <div>
          <label
            htmlFor="serviceId"
            className="mb-1 block text-sm font-medium"
            style={{ color: "var(--color-primary)" }}
          >
            Gewünschte Leistung <span aria-hidden="true">*</span>
          </label>
          <select
            id="serviceId"
            className="w-full rounded-sm border px-4 py-2.5 text-sm outline-none transition-colors focus:ring-1"
            style={{
              borderColor: errors.serviceId ? "#dc2626" : "var(--color-accent)",
              backgroundColor: "#fff",
              color: "var(--color-primary)",
            }}
            {...register("serviceId")}
          >
            <option value="">Bitte wählen…</option>
            {servicesData.categories.map((cat) => (
              <optgroup key={cat.slug} label={cat.name}>
                {cat.services.map((svc) => (
                  <option key={svc.id} value={svc.id}>
                    {svc.name} · {svc.duration} Min. · € {(svc.priceEur / 100).toFixed(0)}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          {errors.serviceId && (
            <p className="mt-1 text-xs text-red-600">{errors.serviceId.message}</p>
          )}
        </div>

        {/* Date picker */}
        <div>
          <label
            className="mb-2 block text-sm font-medium"
            style={{ color: "var(--color-primary)" }}
          >
            Datum wählen
          </label>
          <div
            className="rounded-sm border p-3"
            style={{ borderColor: "var(--color-accent)" }}
          >
            <DatePicker
              selectedDate={selectedDate}
              onDateChange={(d) => {
                setSelectedDate(d);
                setSelectedSlotDatetime(null);
                setSelectedSlotTime(null);
                setReservationToken(null);
              }}
              disabled={!selectedServiceId}
            />
          </div>
          {!selectedServiceId && (
            <p className="mt-1 text-xs" style={{ color: "var(--color-text-muted)" }}>
              Zuerst eine Leistung auswählen
            </p>
          )}
        </div>

        {/* Slot picker */}
        {selectedDate && selectedServiceId && (
          <div>
            <label
              className="mb-2 block text-sm font-medium"
              style={{ color: "var(--color-primary)" }}
            >
              Uhrzeit wählen
            </label>
            <SlotPicker
              date={selectedDate}
              serviceId={selectedServiceId ?? null}
              clientId={DEMO_CLIENT_ID}
              selectedSlot={selectedSlotDatetime}
              onSlotSelect={(dt, t, tok) => {
                setSelectedSlotDatetime(dt);
                setSelectedSlotTime(t);
                setReservationToken(tok);
              }}
            />
          </div>
        )}

        {/* Staff preference dropdown — only shown if staff loaded successfully */}
        {!staffLoadError && staffList.length > 0 && (() => {
          // Filter staff by selected service — show all if no match (fallback)
          const filtered = staffList.filter(s => {
            if (!s.serviceIds || s.serviceIds.length === 0) return true;
            if (!selectedServiceId) return true;
            return s.serviceIds.includes(selectedServiceId);
          });
          const filteredStaff = filtered.length > 0 ? filtered : staffList;
          return (
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label
                style={{
                  fontSize: "13px",
                  color: "var(--color-text-muted)",
                  fontWeight: 500,
                }}
              >
                Wunsch-Mitarbeiter{" "}
                <span style={{ fontWeight: 400, color: "var(--color-text-muted)" }}>
                  (optional)
                </span>
              </label>
              <select
                value={selectedStaffId}
                onChange={(e) => setSelectedStaffId(e.target.value)}
                style={{
                  border: "1px solid var(--color-accent)",
                  borderRadius: "6px",
                  padding: "10px 12px",
                  fontSize: "14px",
                  color: "var(--color-text)",
                  background: "var(--color-background)",
                  width: "100%",
                  minHeight: "44px",
                  cursor: "pointer",
                }}
              >
                <option value="">Keine Vorauswahl</option>
                {filteredStaff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} — {s.title}
                  </option>
                ))}
              </select>
            </div>
          );
        })()}

        {/* Notes */}
        <div>
          <label
            htmlFor="notes"
            className="mb-1 block text-sm font-medium"
            style={{ color: "var(--color-primary)" }}
          >
            Anmerkungen
          </label>
          <textarea
            id="notes"
            rows={3}
            placeholder="Gibt es etwas Besonderes, das wir wissen sollten? (optional)"
            className="w-full rounded-sm border px-4 py-2.5 text-sm outline-none resize-none"
            style={{
              borderColor: errors.notes ? "#dc2626" : "var(--color-accent)",
              backgroundColor: "#fff",
              color: "var(--color-primary)",
            }}
            {...register("notes")}
          />
          {errors.notes && (
            <p className="mt-1 text-xs text-red-600">{errors.notes.message}</p>
          )}
        </div>
      </fieldset>

      {/* GDPR Consents */}
      <fieldset className="space-y-3 rounded-sm border p-5" style={{ borderColor: "var(--color-accent)" }}>
        <legend
          className="px-1 text-sm font-semibold uppercase tracking-wider"
          style={{ color: "var(--color-secondary)" }}
        >
          Datenschutz
        </legend>

        {/* Mandatory: data processing */}
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 shrink-0 rounded-sm border"
            style={{ accentColor: "var(--color-secondary)" }}
            {...register("gdprDataProcessing")}
          />
          <span className="text-sm leading-relaxed" style={{ color: "var(--color-text)" }}>
            Ich stimme der Verarbeitung meiner Daten für die Terminvereinbarung zu.{" "}
            <a
              href="/datenschutz"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:opacity-70"
              style={{ color: "var(--color-secondary)" }}
            >
              Datenschutzerklärung lesen
            </a>{" "}
            <span className="text-red-600" aria-hidden="true">*</span>
          </span>
        </label>
        {errors.gdprDataProcessing && (
          <p className="text-xs text-red-600">{errors.gdprDataProcessing.message}</p>
        )}

        {/* Mandatory: reminders */}
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 shrink-0 rounded-sm border"
            style={{ accentColor: "var(--color-secondary)" }}
            {...register("gdprReminders")}
          />
          <span className="text-sm leading-relaxed" style={{ color: "var(--color-text)" }}>
            Ich möchte Terminerinnerungen per E-Mail oder WhatsApp erhalten.
          </span>
        </label>

        {/* Optional: marketing */}
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 shrink-0 rounded-sm border"
            style={{ accentColor: "var(--color-secondary)" }}
            {...register("gdprMarketing")}
          />
          <span className="text-sm leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
            Ich möchte über Angebote und Neuigkeiten informiert werden. (optional)
          </span>
        </label>

        <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
          * Pflichtfeld. Ihre Daten werden ausschließlich zur Terminvereinbarung verwendet
          und gemäß DSGVO verarbeitet. Sie können Ihre Einwilligung jederzeit widerrufen.
        </p>
      </fieldset>

      {/* API error */}
      {submitError && (
        <div className="rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {submitError}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-sm py-3.5 text-sm font-semibold transition-opacity disabled:opacity-60"
        style={{
          backgroundColor: "var(--color-primary)",
          color: "var(--color-background)",
        }}
      >
        {isSubmitting ? "Wird gesendet…" : "Anfrage senden"}
      </button>

      <p className="text-center text-xs" style={{ color: "var(--color-text-muted)" }}>
        Wir melden uns innerhalb von 24 Stunden bei Ihnen zur Terminbestätigung.
      </p>
    </form>
  );
}
