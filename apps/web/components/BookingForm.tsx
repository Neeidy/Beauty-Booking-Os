"use client";

import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { makeBookingFormSchema, type BookingFormData } from "../lib/booking-form-schema";
import { useI18n } from "@/lib/i18n/I18nProvider";
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
  const { dict, locale } = useI18n();

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

  const schema = useMemo(() => makeBookingFormSchema(dict), [dict]);

  const {
    register,
    handleSubmit,
    trigger,
    setValue,           // ← EKLE
    formState: { errors },
    getValues
  } = useForm<BookingFormData>({
    resolver: zodResolver(schema),
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
      setSubmitError(dict.booking.errors.pickTime);
      setIsSubmitting(false);
      return;
    }
    if (selectedSlotDatetime && !reservationToken) {
      setSubmitError(dict.booking.errors.pickValidSlot);
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
          language: locale,
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
        setSubmitError(result.error ?? dict.booking.errors.generic);
        return;
      }
      if (result.leadId) fetch(`/api/lead/${result.leadId}/classify`, { method: "POST" }).catch(() => {});
      router.push("/booking/thank-you");
    } catch {
      setSubmitError(dict.booking.errors.connection);
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
  const STEPS = [
    dict.booking.steps.service,
    dict.booking.steps.appointment,
    dict.booking.steps.data,
    dict.booking.steps.confirmation,
  ];

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
          <h4 className="step-title">{dict.booking.step1.title}</h4>
          <p className="step-sub">{dict.booking.step1.sub}</p>

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
                    <span className="svc-dur">{svc.duration} {dict.booking.step4.unit}</span>
                  </div>
                  <div className="svc-price">€ {(svc.priceEur / 100).toFixed(2).replace(".", ",")}</div>
                  {isSelected && <span className="svc-check">✓</span>}
                </label>
              );
            })}
          </div>

          {!staffLoadError && displayStaff.length > 0 && (
            <div className="form-row">
              <label className="form-label">{dict.booking.step1.staffLabel}</label>
              <select
                className="form-input"
                value={selectedStaffId}
                onChange={(e) => setSelectedStaffId(e.target.value)}
              >
                <option value="">{dict.booking.step1.staffAny}</option>
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
            {dict.booking.step1.next}
          </button>
          {!selectedServiceId && (
            <p style={{ fontSize: "13px", color: "var(--color-text-muted)", marginTop: "8px", textAlign: "center" }}>
              {dict.booking.step1.pickServiceFirst}
            </p>
          )}
        </section>
      )}

      {/* ── STEP 2: Datum & Uhrzeit ── */}
      {step === 2 && (
        <section className="step-panel">
          <h4 className="step-title">{dict.booking.step2.title}</h4>
          <p className="step-sub">
            {dict.booking.step2.subAvailableFor.split("{service}")[0]}
            <strong>{selectedService?.name}</strong>
            {dict.booking.step2.subAvailableFor.split("{service}")[1] ?? ""}
            {selectedService
              ? dict.booking.step2.durationSuffix.replace("{duration}", String(selectedService.duration))
              : ""}
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
            <button className="btn btn-ghost" onClick={() => setStep(1)}>{dict.booking.step2.back}</button>
            <button
              className="btn btn-primary"
              disabled={!canGoStep3()}
              onClick={() => { if (canGoStep3()) setStep(3); }}
            >
              {dict.booking.step2.next}
            </button>
          </div>
          {!canGoStep3() && selectedDate && (
            <p style={{ fontSize: "13px", color: "var(--color-text-muted)", marginTop: "8px", textAlign: "center" }}>
              {dict.booking.step2.pickSlotHint}
            </p>
          )}
        </section>
      )}

      {/* ── STEP 3: Kontaktdaten ── */}
      {step === 3 && (
        <section className="step-panel">
          <h4 className="step-title">{dict.booking.step3.title}</h4>
          <p className="step-sub">{dict.booking.step3.sub}</p>

          <div className="form-grid">
            <div className="form-row">
              <label className="form-label">{dict.booking.step3.nameLabel}</label>
              <input
                className="form-input"
                placeholder={dict.booking.step3.namePlaceholder}
                autoComplete="name"
                {...register("customerName")}
              />
              {errors.customerName && (
                <span style={{ fontSize: "12px", color: "var(--color-rose)" }}>{errors.customerName.message}</span>
              )}
            </div>

            <div className="form-row">
              <label className="form-label">{dict.booking.step3.emailLabel}</label>
              <input
                className="form-input"
                type="email"
                placeholder={dict.booking.step3.emailPlaceholder}
                autoComplete="email"
                {...register("customerEmail")}
              />
              {errors.customerEmail && (
                <span style={{ fontSize: "12px", color: "var(--color-rose)" }}>{errors.customerEmail.message}</span>
              )}
            </div>

            <div className="form-row">
              <label className="form-label">{dict.booking.step3.phoneLabel}</label>
              <input
                className="form-input"
                type="tel"
                placeholder={dict.booking.step3.phonePlaceholder}
                autoComplete="tel"
                {...register("customerPhone")}
              />
              {errors.customerPhone && (
                <span style={{ fontSize: "12px", color: "var(--color-rose)" }}>{errors.customerPhone.message}</span>
              )}
            </div>

            <div className="form-row form-row-full">
              <label className="form-label">
                {dict.booking.step3.notesLabel} <span className="form-opt">{dict.booking.step3.optional}</span>
              </label>
              <textarea
                className="form-input"
                rows={3}
                placeholder={dict.booking.step3.notesPlaceholder}
                {...register("notes")}
              />
            </div>
          </div>

          <div className="step-nav">
            <button className="btn btn-ghost" onClick={() => setStep(2)}>{dict.booking.step3.back}</button>
            <button
              className="btn btn-primary"
              onClick={async () => {
                const ok = await trigger(["customerName", "customerEmail", "customerPhone"]);
                if (ok) setStep(4);
              }}
            >
              {dict.booking.step3.next}
            </button>
          </div>
        </section>
      )}

      {/* ── STEP 4: Bestätigung & GDPR ── */}
      {step === 4 && (
        <section className="step-panel">
          <h4 className="step-title">{dict.booking.step4.title}</h4>
          <p className="step-sub">{dict.booking.step4.sub}</p>

          <div className="summary">
            {selectedService && (
              <>
                <div className="summary-row">
                  <span>{dict.booking.step4.service}</span>
                  <strong>{selectedService.name}</strong>
                </div>
                <div className="summary-row">
                  <span>{dict.booking.step4.duration}</span>
                  <strong>{selectedService.duration} {dict.booking.step4.unit}</strong>
                </div>
              </>
            )}
            {selectedStaffId && staffList.find((s) => s.id === selectedStaffId) && (
              <div className="summary-row">
                <span>{dict.booking.step4.staff}</span>
                <strong>{staffList.find((s) => s.id === selectedStaffId)?.name}</strong>
              </div>
            )}
            {selectedDate && (
              <div className="summary-row">
                <span>{dict.booking.step4.date}</span>
                <strong>{new Date(selectedDate + "T00:00:00").toLocaleDateString(locale === "de" ? "de-AT" : "en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</strong>
              </div>
            )}
            {selectedSlotTime && (
              <div className="summary-row">
                <span>{dict.booking.step4.time}</span>
                <strong>{selectedSlotTime}</strong>
              </div>
            )}
            {getValues("customerName") && (
              <div className="summary-row">
                <span>{dict.booking.step4.customer}</span>
                <strong>{getValues("customerName")}</strong>
              </div>
            )}
            <div className="summary-divider" />
            {selectedService && (
              <div className="summary-row total">
                <span>{dict.booking.step4.total}</span>
                <strong>€ {(selectedService.priceEur / 100).toFixed(2).replace(".", ",")}</strong>
              </div>
            )}
            <div className="summary-note">{dict.booking.step4.payOnSite}</div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            {/* Hidden field so react-hook-form keeps serviceId */}
            <input type="hidden" value={selectedServiceId} {...register("serviceId")} />

            <div className="gdpr">
              <label className="gdpr-check">
                <input type="checkbox" {...register("gdprDataProcessing")} />
                <span>
                  {dict.booking.gdpr.dataProcessing}{" "}
                  <a href="/datenschutz" target="_blank" rel="noopener noreferrer">{dict.booking.gdpr.privacyLink}</a>{" "}
                  <span aria-hidden="true" style={{ color: "var(--color-rose)" }}>*</span>
                </span>
              </label>
              {errors.gdprDataProcessing && (
                <span style={{ fontSize: "12px", color: "var(--color-rose)" }}>{errors.gdprDataProcessing.message}</span>
              )}

              <label className="gdpr-check">
                <input type="checkbox" {...register("gdprReminders")} />
                <span>{dict.booking.gdpr.reminders}</span>
              </label>

              <label className="gdpr-check">
                <input type="checkbox" {...register("gdprMarketing")} />
                <span>{dict.booking.gdpr.marketing} <span className="form-opt">{dict.booking.step3.optional}</span></span>
              </label>
            </div>

            {submitError && (
              <div className="error-banner" style={{ marginBottom: "16px" }}>{submitError}</div>
            )}

            <div className="step-nav">
              <button type="button" className="btn btn-ghost" onClick={() => setStep(3)}>{dict.booking.step4.back}</button>
              <button
                type="submit"
                className={`btn btn-primary btn-lg${isSubmitting ? " btn-loading" : ""}`}
                disabled={isSubmitting}
              >
                {isSubmitting ? dict.booking.step4.submitting : dict.booking.step4.submit}
              </button>
            </div>
          </form>
        </section>
      )}
    </>
  );
}
