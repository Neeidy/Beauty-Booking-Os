"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { bookingFormSchema, type BookingFormData } from "../lib/booking-form-schema";
import servicesData from "../../../clients/demo-salon/services.json";
import DatePicker from "./DatePicker";
import SlotPicker from "./SlotPicker";

interface PublicStaffMember {
  id: string;
  name: string;
  title: string;
  serviceIds?: string[];
}

interface FlatService {
  id: string;
  name: string;
  duration: number;
  priceEur: number;
  categorySlug: string;
}

// Flatten services keeping category slug for accent colour
const allServices: FlatService[] = servicesData.categories.flatMap((cat) =>
  cat.services.map((svc) => ({
    id: svc.id,
    name: svc.name,
    duration: svc.duration,
    priceEur: svc.priceEur,
    categorySlug: cat.slug,
  }))
);

const ACCENT_MAP: Record<string, string> = {
  nails: "purple",
  skin: "emerald",
  "lashes-brows": "rose",
  hair: "amber",
};

const DEMO_CLIENT_ID = process.env["NEXT_PUBLIC_DEMO_CLIENT_ID"] ?? "00000000-0000-0000-0000-000000000001";
const DEMO_CLIENT_SLUG = process.env["NEXT_PUBLIC_DEFAULT_CLIENT_SLUG"] ?? "demo-salon";

export default function BookingForm() {
  const router = useRouter();

  // ── Step state ──
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // ── Business logic state (unchanged) ──
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlotDatetime, setSelectedSlotDatetime] = useState<string | null>(null);
  const [selectedSlotTime, setSelectedSlotTime] = useState<string | null>(null);
  const [reservationToken, setReservationToken] = useState<string | null>(null);
  const [staffList, setStaffList] = useState<PublicStaffMember[]>([]);
  const [staffLoadError, setStaffLoadError] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState<string>("");
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");
  const [bookingSource, setBookingSource] = useState<"web_form" | "google_business">("web_form");

  const selectedService = allServices.find((s) => s.id === selectedServiceId) ?? null;

  const {
    register,
    handleSubmit,
    trigger,
    setValue,           // ← EKLE
    formState: { errors },
    getValues
  } = useForm<BookingFormData>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      gdprReminders: false,
      gdprMarketing: false,
      serviceId: "",
    },
  });

  useEffect(() => {
    let cancelled = false;
    fetch("/api/public/staff")
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data: { staff: PublicStaffMember[] }) => { if (!cancelled) setStaffList(data.staff ?? []); })
      .catch(() => { if (!cancelled) setStaffLoadError(true); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get("source") === "google_business") setBookingSource("google_business");
    }
  });
  useEffect(() => {
    setValue("serviceId", selectedServiceId);
  }, [selectedServiceId, setValue]);

  const onSubmit = async (data: BookingFormData) => {
    setIsSubmitting(true);
    setSubmitError(null);

    if (!selectedSlotDatetime) {
      setSubmitError("Bitte wählen Sie eine Uhrzeit aus.");
      setIsSubmitting(false);
      return;
    }
    if (selectedSlotDatetime && !reservationToken) {
      setSubmitError("Bitte wählen Sie einen gültigen Slot aus.");
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
      if (selectedService) messageParts.push(`Leistung: ${selectedService.name}`);
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
            serviceId: selectedServiceId,
            appointmentAt: selectedSlotDatetime,
            appointmentTime: selectedSlotTime,
            appointmentDate: selectedDate,
            bookingSource,
          },
        }),
      });

      const result = await response.json() as { success: boolean; leadId?: string; error?: string };
      if (!response.ok || !result.success) {
        setSubmitError(result.error ?? "Es ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut.");
        return;
      }
      if (result.leadId) fetch(`/api/lead/${result.leadId}/classify`, { method: "POST" }).catch(() => {});
      router.push("/booking/thank-you");
    } catch {
      setSubmitError("Verbindungsfehler. Bitte prüfen Sie Ihre Internetverbindung.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Filtered staff for selected service ──
  const filteredStaff = staffList.filter((s) => {
    if (!s.serviceIds || s.serviceIds.length === 0) return true;
    if (!selectedServiceId) return true;
    return s.serviceIds.includes(selectedServiceId);
  });
  const displayStaff = filteredStaff.length > 0 ? filteredStaff : staffList;

  // ── Step helpers ──
  function canGoStep2() { return !!selectedServiceId; }
  function canGoStep3() { return !!selectedSlotDatetime && !!reservationToken; }

  // ── Stepper label ──
  const STEPS = ["Leistung", "Termin", "Daten", "Bestätigung"];

  return (
    <>
      {/* Stepper */}
      <ol className="stepper">
        {STEPS.map((label, i) => {
          const n = i + 1;
          const isActive = step === n;
          const isComplete = step > n;
          return (
            <li key={n} className={isActive ? "active" : isComplete ? "complete" : ""}>
              <span className="stepper-circle">{n}</span>
              <span className="stepper-label">{label}</span>
            </li>
          );
        })}
      </ol>

      {/* ── STEP 1: Leistung & Mitarbeiter ── */}
      {step === 1 && (
        <section className="step-panel">
          <h4 className="step-title">Welche Leistung möchten Sie buchen?</h4>
          <p className="step-sub">Wählen Sie Ihre Wunsch-Leistung und einen Mitarbeiter.</p>

          <div className="svc-grid">
            {allServices.map((svc) => {
              const accent = ACCENT_MAP[svc.categorySlug] ?? "purple";
              const isSelected = selectedServiceId === svc.id;
              return (
                <label
                  key={svc.id}
                  className={`svc-card${isSelected ? " selected" : ""}`}
                  data-accent={accent}
                  onClick={() => setSelectedServiceId(svc.id)}
                >
                  <input type="radio" name="svc" readOnly checked={isSelected} />
                  <div className="svc-top">
                    <span className="svc-name">{svc.name}</span>
                    <span className="svc-dur">{svc.duration} Min</span>
                  </div>
                  <div className="svc-price">€ {(svc.priceEur / 100).toFixed(2).replace(".", ",")}</div>
                  {isSelected && <span className="svc-check">✓</span>}
                </label>
              );
            })}
          </div>

          {!staffLoadError && displayStaff.length > 0 && (
            <div className="form-row">
              <label className="form-label">Mitarbeiter</label>
              <select
                className="form-input"
                value={selectedStaffId}
                onChange={(e) => setSelectedStaffId(e.target.value)}
              >
                <option value="">Egal — nächster verfügbarer</option>
                {displayStaff.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.title})</option>
                ))}
              </select>
            </div>
          )}

          <button
            className="btn btn-primary btn-lg btn-full"
            disabled={!canGoStep2()}
            onClick={() => { if (canGoStep2()) setStep(2); }}
          >
            Weiter →
          </button>
          {!selectedServiceId && (
            <p style={{ fontSize: "13px", color: "var(--color-text-muted)", marginTop: "8px", textAlign: "center" }}>
              Bitte zuerst eine Leistung auswählen
            </p>
          )}
        </section>
      )}

      {/* ── STEP 2: Datum & Uhrzeit ── */}
      {step === 2 && (
        <section className="step-panel">
          <h4 className="step-title">Datum &amp; Uhrzeit wählen</h4>
          <p className="step-sub">
            Verfügbare Termine für <strong>{selectedService?.name}</strong>
            {selectedService ? ` · ${selectedService.duration} Min` : ""}
          </p>

          <DatePicker
            selectedDate={selectedDate}
            onDateChange={(d) => {
              setSelectedDate(d);
              setSelectedSlotDatetime(null);
              setSelectedSlotTime(null);
              setReservationToken(null);
            }}
            disabled={false}
          />

          {selectedDate && selectedServiceId && (
            <SlotPicker
              date={selectedDate}
              serviceId={selectedServiceId}
              clientId={DEMO_CLIENT_ID}
              selectedSlot={selectedSlotDatetime}
              onSlotSelect={(dt, t, tok) => {
                setSelectedSlotDatetime(dt);
                setSelectedSlotTime(t);
                setReservationToken(tok);
              }}
            />
          )}

          <div className="step-nav">
            <button className="btn btn-ghost" onClick={() => setStep(1)}>← Zurück</button>
            <button
              className="btn btn-primary"
              disabled={!canGoStep3()}
              onClick={() => { if (canGoStep3()) setStep(3); }}
            >
              Weiter →
            </button>
          </div>
          {!canGoStep3() && selectedDate && (
            <p style={{ fontSize: "13px", color: "var(--color-text-muted)", marginTop: "8px", textAlign: "center" }}>
              Bitte einen verfügbaren Slot auswählen
            </p>
          )}
        </section>
      )}

      {/* ── STEP 3: Kontaktdaten ── */}
      {step === 3 && (
        <section className="step-panel">
          <h4 className="step-title">Ihre Daten</h4>
          <p className="step-sub">Wir brauchen diese Informationen für die Bestätigung und Erinnerung.</p>

          <div className="form-grid">
            <div className="form-row">
              <label className="form-label">Name *</label>
              <input
                className="form-input"
                placeholder="Ihr vollständiger Name"
                autoComplete="name"
                {...register("customerName")}
              />
              {errors.customerName && (
                <span style={{ fontSize: "12px", color: "var(--color-rose)" }}>{errors.customerName.message}</span>
              )}
            </div>

            <div className="form-row">
              <label className="form-label">E-Mail</label>
              <input
                className="form-input"
                type="email"
                placeholder="ihre@email.at"
                autoComplete="email"
                {...register("customerEmail")}
              />
              {errors.customerEmail && (
                <span style={{ fontSize: "12px", color: "var(--color-rose)" }}>{errors.customerEmail.message}</span>
              )}
            </div>

            <div className="form-row">
              <label className="form-label">Telefon</label>
              <input
                className="form-input"
                type="tel"
                placeholder="+43 660 1234567"
                autoComplete="tel"
                {...register("customerPhone")}
              />
              {errors.customerPhone && (
                <span style={{ fontSize: "12px", color: "var(--color-rose)" }}>{errors.customerPhone.message}</span>
              )}
            </div>

            <div className="form-row form-row-full">
              <label className="form-label">
                Anmerkungen <span className="form-opt">(optional)</span>
              </label>
              <textarea
                className="form-input"
                rows={3}
                placeholder="Allergien, Wünsche, Farbwunsch..."
                {...register("notes")}
              />
            </div>
          </div>

          <div className="step-nav">
            <button className="btn btn-ghost" onClick={() => setStep(2)}>← Zurück</button>
            <button
              className="btn btn-primary"
              onClick={async () => {
                const ok = await trigger(["customerName", "customerEmail", "customerPhone"]);
                if (ok) setStep(4);
              }}
            >
              Weiter →
            </button>
          </div>
        </section>
      )}

      {/* ── STEP 4: Bestätigung & GDPR ── */}
      {step === 4 && (
        <section className="step-panel">
          <h4 className="step-title">Termin bestätigen</h4>
          <p className="step-sub">Bitte überprüfen Sie Ihre Buchung.</p>

          <div className="summary">
            {selectedService && (
              <>
                <div className="summary-row">
                  <span>Leistung</span>
                  <strong>{selectedService.name}</strong>
                </div>
                <div className="summary-row">
                  <span>Dauer</span>
                  <strong>{selectedService.duration} Min</strong>
                </div>
              </>
            )}
            {selectedStaffId && staffList.find((s) => s.id === selectedStaffId) && (
              <div className="summary-row">
                <span>Mitarbeiter</span>
                <strong>{staffList.find((s) => s.id === selectedStaffId)?.name}</strong>
              </div>
            )}
            {selectedDate && (
              <div className="summary-row">
                <span>Datum</span>
                <strong>{new Date(selectedDate + "T00:00:00").toLocaleDateString("de-AT", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</strong>
              </div>
            )}
            {selectedSlotTime && (
              <div className="summary-row">
                <span>Uhrzeit</span>
                <strong>{selectedSlotTime}</strong>
              </div>
            )}
            {getValues("customerName") && (
              <div className="summary-row">
                <span>Kunde</span>
                <strong>{getValues("customerName")}</strong>
              </div>
            )}
            <div className="summary-divider" />
            {selectedService && (
              <div className="summary-row total">
                <span>Gesamt</span>
                <strong>€ {(selectedService.priceEur / 100).toFixed(2).replace(".", ",")}</strong>
              </div>
            )}
            <div className="summary-note">Zahlung vor Ort — bar oder Karte.</div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            {/* Hidden field so react-hook-form keeps serviceId */}
            <input type="hidden" value={selectedServiceId} {...register("serviceId")} />

            <div className="gdpr">
              <label className="gdpr-check">
                <input type="checkbox" {...register("gdprDataProcessing")} />
                <span>
                  Ich stimme der Verarbeitung meiner Daten für die Terminvereinbarung zu.{" "}
                  <a href="/datenschutz" target="_blank" rel="noopener noreferrer">Datenschutzerklärung lesen</a>{" "}
                  <span aria-hidden="true" style={{ color: "var(--color-rose)" }}>*</span>
                </span>
              </label>
              {errors.gdprDataProcessing && (
                <span style={{ fontSize: "12px", color: "var(--color-rose)" }}>{errors.gdprDataProcessing.message}</span>
              )}

              <label className="gdpr-check">
                <input type="checkbox" {...register("gdprReminders")} />
                <span>Ich möchte Terminerinnerungen per E-Mail oder WhatsApp erhalten.</span>
              </label>

              <label className="gdpr-check">
                <input type="checkbox" {...register("gdprMarketing")} />
                <span>Ich möchte über Angebote und Neuigkeiten informiert werden. <span className="form-opt">(optional)</span></span>
              </label>
            </div>

            {submitError && (
              <div className="error-banner" style={{ marginBottom: "16px" }}>{submitError}</div>
            )}

            <div className="step-nav">
              <button type="button" className="btn btn-ghost" onClick={() => setStep(3)}>← Zurück</button>
              <button
                type="submit"
                className={`btn btn-primary btn-lg${isSubmitting ? " btn-loading" : ""}`}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Wird gesendet…" : "Termin verbindlich buchen"}
              </button>
            </div>
          </form>
        </section>
      )}
    </>
  );
}
