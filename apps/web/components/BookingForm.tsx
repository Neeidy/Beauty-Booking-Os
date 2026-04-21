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
    return () => { cancelled = true; };
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

    if (!selectedSlotDatetime) {
      setSubmitError("Lütfen randevu saati seçin");
      setIsSubmitting(false);
      return;
    }

    if (selectedSlotDatetime && !reservationToken) {
      setSubmitError("Lütfen geçerli bir slot seçin.");
      setIsSubmitting(false);
      return;
    }

    try {
      const gdprConsents = [{ consentType: "data_processing", granted: true, method: "web_form" }];
      if (data.gdprReminders) gdprConsents.push({ consentType: "reminder_messages", granted: true, method: "web_form" });
      if (data.gdprMarketing) gdprConsents.push({ consentType: "marketing", granted: true, method: "web_form" });

      const selectedStaff = selectedStaffId ? staffList.find((s) => s.id === selectedStaffId) : null;
      const baseNotes = data.notes ?? "";
      const notesValue = selectedStaff
        ? `Mitarbeiter-Wunsch: ${selectedStaff.name}${baseNotes ? `\n${baseNotes}` : ""}`
        : baseNotes;

      const messageParts = [`Name: ${data.customerName}`];
      if (selectedService) messageParts.push(`Leistung: ${selectedService.label}`);
      if (selectedDate && selectedSlotTime) messageParts.push(`Termin: ${selectedDate} um ${selectedSlotTime}`);
      if (data.notes) messageParts.push(`Notiz: ${data.notes}`);

      const response = await fetch("/api/booking/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-client-id": DEMO_CLIENT_ID },
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
    <form onSubmit={handleSubmit(onSubmit)} noValidate>

      {/* Persönliche Daten */}
      <div className="step-title">Ihre Daten</div>
      <div className="form-grid">
        <div className="form-row">
          <label className="form-label" htmlFor="customerName">
            Name <span style={{ color: "var(--color-rose)" }}>*</span>
          </label>
          <input
            id="customerName"
            type="text"
            autoComplete="name"
            placeholder="Ihr vollständiger Name"
            className={`form-input${errors.customerName ? " error" : ""}`}
            {...register("customerName")}
          />
          {errors.customerName && (
            <span className="form-error">{errors.customerName.message}</span>
          )}
        </div>

        <div className="form-row">
          <label className="form-label" htmlFor="customerEmail">E-Mail</label>
          <input
            id="customerEmail"
            type="email"
            autoComplete="email"
            placeholder="ihre@email.at"
            className={`form-input${errors.customerEmail ? " error" : ""}`}
            {...register("customerEmail")}
          />
          {errors.customerEmail && (
            <span className="form-error">{errors.customerEmail.message}</span>
          )}
        </div>

        <div className="form-row">
          <label className="form-label" htmlFor="customerPhone">Telefon</label>
          <input
            id="customerPhone"
            type="tel"
            autoComplete="tel"
            placeholder="+43 660 1234567"
            className={`form-input${errors.customerPhone ? " error" : ""}`}
            {...register("customerPhone")}
          />
          {errors.customerPhone && (
            <span className="form-error">{errors.customerPhone.message}</span>
          )}
          <span className="form-hint">E-Mail oder Telefon — mind. eine Angabe erforderlich.</span>
        </div>
      </div>

      {/* Leistung & Termin */}
      <div className="step-title" style={{ marginTop: "24px" }}>Leistung & Termin</div>
      <div className="form-grid">
        <div className="form-row form-row-full">
          <label className="form-label" htmlFor="serviceId">
            Gewünschte Leistung <span style={{ color: "var(--color-rose)" }}>*</span>
          </label>
          <select
            id="serviceId"
            className={`form-input${errors.serviceId ? " error" : ""}`}
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
            <span className="form-error">{errors.serviceId.message}</span>
          )}
        </div>

        <div className="form-row form-row-full">
          <label className="form-label">Datum wählen</label>
          <div className="datepicker">
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
            <span className="form-hint">Zuerst eine Leistung auswählen</span>
          )}
        </div>

        {selectedDate && selectedServiceId && (
          <div className="form-row form-row-full">
            <label className="form-label">Uhrzeit wählen</label>
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

        {!staffLoadError && staffList.length > 0 && (() => {
          const filtered = staffList.filter(s => {
            if (!s.serviceIds || s.serviceIds.length === 0) return true;
            if (!selectedServiceId) return true;
            return s.serviceIds.includes(selectedServiceId);
          });
          const filteredStaff = filtered.length > 0 ? filtered : staffList;
          return (
            <div className="form-row form-row-full">
              <label className="form-label">
                Wunsch-Mitarbeiter <span style={{ color: "var(--color-text-muted)", fontWeight: 400 }}>(optional)</span>
              </label>
              <select
                className="form-input"
                value={selectedStaffId}
                onChange={(e) => setSelectedStaffId(e.target.value)}
              >
                <option value="">Keine Vorauswahl</option>
                {filteredStaff.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} — {s.title}</option>
                ))}
              </select>
            </div>
          );
        })()}

        <div className="form-row form-row-full">
          <label className="form-label" htmlFor="notes">Anmerkungen</label>
          <textarea
            id="notes"
            rows={3}
            placeholder="Gibt es etwas Besonderes, das wir wissen sollten? (optional)"
            className="form-input"
            style={{ resize: "none" }}
            {...register("notes")}
          />
        </div>
      </div>

      {/* GDPR */}
      <div className="gdpr" style={{ marginTop: "24px" }}>
        <div className="step-title" style={{ marginBottom: "12px" }}>Datenschutz</div>

        <label className="gdpr-check">
          <input type="checkbox" {...register("gdprDataProcessing")} />
          <span>
            Ich stimme der Verarbeitung meiner Daten für die Terminvereinbarung zu.{" "}
            <a href="/datenschutz" target="_blank" rel="noopener noreferrer">
              Datenschutzerklärung lesen
            </a>{" "}
            <span style={{ color: "var(--color-rose)" }}>*</span>
          </span>
        </label>
        {errors.gdprDataProcessing && (
          <span className="form-error">{errors.gdprDataProcessing.message}</span>
        )}

        <label className="gdpr-check">
          <input type="checkbox" {...register("gdprReminders")} />
          <span>Ich möchte Terminerinnerungen per E-Mail oder WhatsApp erhalten.</span>
        </label>

        <label className="gdpr-check">
          <input type="checkbox" {...register("gdprMarketing")} />
          <span style={{ color: "var(--color-text-muted)" }}>
            Ich möchte über Angebote und Neuigkeiten informiert werden. (optional)
          </span>
        </label>

        <p className="form-hint" style={{ marginTop: "8px" }}>
          * Pflichtfeld. Ihre Daten werden ausschließlich zur Terminvereinbarung verwendet
          und gemäß DSGVO verarbeitet. Sie können Ihre Einwilligung jederzeit widerrufen.
        </p>
      </div>

      {submitError && (
        <div style={{
          marginTop: "16px", padding: "12px 16px",
          border: "1px solid var(--color-rose)",
          borderRadius: "var(--radius-md)",
          fontSize: "13px", color: "var(--color-rose)",
          background: "var(--color-rose-soft)",
        }}>
          {submitError}
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="btn btn-primary btn-lg btn-full"
        style={{ marginTop: "24px", opacity: isSubmitting ? 0.6 : 1 }}
      >
        {isSubmitting ? "Wird gesendet…" : "Anfrage senden"}
      </button>

      <p className="form-hint" style={{ textAlign: "center", marginTop: "12px" }}>
        Wir melden uns innerhalb von 24 Stunden bei Ihnen zur Terminbestätigung.
      </p>
    </form>
  );
}
