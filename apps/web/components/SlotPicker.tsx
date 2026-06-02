"use client";

import { useState, useEffect, useRef } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";

interface SlotItem {
  time: string;
  datetime: string;
  available: boolean;
}

type SlotsResponse = {
  isDayClosed?: boolean;
  slots: SlotItem[];
  serviceDurationMinutes: number;
  serviceName?: string | null;
};

interface SlotPickerProps {
  date: string | null;
  serviceId: string | null;
  clientId: string;
  selectedSlot: string | null;
  onSlotSelect: (datetime: string, time: string, token: string) => void;
}

export default function SlotPicker({
  date,
  serviceId,
  clientId,
  selectedSlot,
  onSlotSelect,
}: SlotPickerProps) {
  const { dict } = useI18n();
  const [slots, setSlots] = useState<SlotItem[]>([]);
  const [isDayClosed, setIsDayClosed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCounter, setRetryCounter] = useState(0);

  // Reservation state
  const [reservationToken, setReservationToken] = useState<string | null>(null);
  const [reservationExpiresAt, setReservationExpiresAt] = useState<Date | null>(null);
  const [reservationCountdownSeconds, setReservationCountdownSeconds] = useState<number>(0);
  const [lockError, setLockError] = useState<string | null>(null);

  // Waiting list state
  const [showWaitingForm, setShowWaitingForm] = useState(false);
  const [waitingSubmitted, setWaitingSubmitted] = useState(false);
  const [waitingLoading, setWaitingLoading] = useState(false);
  const [waitingError, setWaitingError] = useState<string | null>(null);

  useEffect(() => {
    if (!date || !serviceId) {
      setSlots([]);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setIsDayClosed(false);
    // Reset waiting list state when date/service changes
    setShowWaitingForm(false);
    setWaitingSubmitted(false);
    setWaitingError(null);
    const slotsUrl =
      `/api/booking/slots?date=${encodeURIComponent(date)}&serviceId=${encodeURIComponent(serviceId)}&clientId=${encodeURIComponent(clientId)}` +
      (reservationToken ? `&reservationToken=${encodeURIComponent(reservationToken)}` : "");

    fetch(slotsUrl, { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<SlotsResponse>;
      })
      .then((data) => {
        setIsDayClosed(data.isDayClosed ?? false);
        setSlots(data.slots ?? []);
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name !== "AbortError") {
          setError(dict.booking.slots.loadError);
        }
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, serviceId, clientId, retryCounter]);

  // Countdown timer — clears at 0, refetches, shows expiry message
  useEffect(() => {
    if (!reservationExpiresAt) return;

    const tick = () => {
      const remaining = Math.max(
        0,
        Math.floor((reservationExpiresAt.getTime() - Date.now()) / 1000)
      );
      setReservationCountdownSeconds(remaining);

      if (remaining === 0) {
        setReservationToken(null);
        setReservationExpiresAt(null);
        setLockError(dict.booking.slots.reservationExpired);
        setRetryCounter((c) => c + 1); // refetch availability
      }
    };

    const interval = setInterval(tick, 1000);
    tick(); // immediate first tick

    return () => clearInterval(interval); // prevent memory leak
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reservationExpiresAt]);

  // Release reservation only when the component unmounts due to a date/service change
  // (user abandoned this slot picker), NOT when advancing to the next step.
  // We track whether the slot was confirmed so we can skip release on step advance.
  const slotConfirmedRef = useRef(false);
  useEffect(() => {
    slotConfirmedRef.current = false;
  }, [date, serviceId]);

  useEffect(() => {
    return () => {
      if (reservationToken && !slotConfirmedRef.current) {
        fetch(`/api/booking/reservations/${reservationToken}`, {
          method: "DELETE",
          keepalive: true,
        }).catch(() => {});
      }
    };
  }, [reservationToken]);

  async function handleSlotSelect(slot: SlotItem) {
    setLockError(null);
    try {
      const res = await fetch("/api/booking/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId,
          date,
          time: slot.time,
          replaceToken: reservationToken ?? undefined,
        }),
      });

      if (res.status === 409) {
        setLockError(dict.booking.slots.slotJustTaken);
        setReservationToken(null);
        setReservationExpiresAt(null);
        setRetryCounter((c) => c + 1); // refetch availability
        return;
      }

      if (!res.ok) {
        setLockError(dict.booking.slots.reserveFailed);
        return;
      }

      const data = await res.json() as { reservationToken: string; expiresAt: string };
      setReservationToken(data.reservationToken);
      setReservationExpiresAt(new Date(data.expiresAt));
      slotConfirmedRef.current = true;
      onSlotSelect(slot.datetime, slot.time, data.reservationToken);
    } catch {
      setLockError(dict.booking.slots.connectionError);
    }
  }

  const allFull =
    !loading && !error && slots.length > 0 && slots.every((s) => !s.available);

  if (!date || !serviceId) {
    return (
      <p className="text-sm py-2" style={{ color: "var(--color-text-muted)" }}>
        {dict.booking.slots.pickDateFirst}
      </p>
    );
  }

  if (loading) {
    return (
      <p className="text-sm py-2" style={{ color: "var(--color-text-muted)" }}>
        {dict.booking.slots.loading}
      </p>
    );
  }

  if (error) {
    return (
      <div className="space-y-2">
        <p className="text-sm" style={{ color: "#dc2626" }}>
          {error}
        </p>
        <button
          type="button"
          onClick={() => setRetryCounter((c) => c + 1)}
          className="text-xs underline"
          style={{ color: "var(--color-secondary)" }}
        >
          {dict.booking.slots.retry}
        </button>
      </div>
    );
  }

  if (isDayClosed) {
    return (
      <p style={{
        color: "var(--color-text-muted)",
        fontSize: "14px",
        padding: "8px 0",
      }}>
        {dict.booking.slots.dayUnavailable}
      </p>
    );
  }

  if (slots.length === 0) {
    return (
      <p className="text-sm py-2" style={{ color: "var(--color-text-muted)" }}>
        {dict.booking.slots.noSlots}
      </p>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
        {slots.map((slot) => {
          const isSelected = slot.datetime === selectedSlot;
          const isAvailable = slot.available;

          return (
            <button
              key={slot.datetime}
              type="button"
              onClick={() => isAvailable && handleSlotSelect(slot)}
              disabled={!isAvailable}
              className="flex items-center justify-center text-sm font-medium rounded-sm relative transition-colors"
              style={{
                minHeight: "44px",
                opacity: !isAvailable ? 0.4 : 1,
                pointerEvents: !isAvailable ? "none" : "auto",
                backgroundColor: isSelected
                  ? "var(--color-accent)"
                  : "var(--color-background)",
                color: isSelected ? "#fff" : "var(--color-primary)",
                border: isSelected
                  ? "2px solid var(--color-accent)"
                  : "1px solid var(--color-primary)",
                cursor: !isAvailable ? "default" : "pointer",
              }}
            >
              {slot.time}
              {!isAvailable && (
                <span
                  className="absolute bottom-0.5 left-0 right-0 text-center"
                  style={{ fontSize: "9px", color: "var(--color-text-muted)", lineHeight: 1 }}
                >
                  {dict.booking.slots.full}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Reservation countdown */}
      {reservationToken && reservationCountdownSeconds > 0 && (
        <p style={{ fontSize: "12px", color: "var(--color-text-muted)", marginTop: "8px" }}>
          {dict.booking.slots.reservedCountdown
            .replace("{minutes}", String(Math.floor(reservationCountdownSeconds / 60)))
            .replace("{seconds}", String(reservationCountdownSeconds % 60).padStart(2, "0"))}
        </p>
      )}
      {lockError && (
        <p style={{
          fontSize: "13px",
          color: "var(--color-text)",
          padding: "8px",
          marginTop: "8px",
          border: "1px solid var(--color-accent)",
          borderRadius: "6px",
        }}>
          ⚠ {lockError}
        </p>
      )}

      {/* Waiting list UI — only shown when all slots are full */}
      {allFull && !waitingSubmitted && (
        <div
          style={{
            marginTop: "16px",
            padding: "12px",
            border: "1px solid var(--color-accent)",
            borderRadius: "8px",
          }}
        >
          <p style={{ color: "var(--color-text)", marginBottom: "8px", fontSize: "14px" }}>
            {dict.booking.slots.allBooked}
          </p>
          {!showWaitingForm ? (
            <button
              type="button"
              onClick={() => setShowWaitingForm(true)}
              style={{
                background: "var(--color-primary)",
                color: "var(--color-background)",
                border: "none",
                borderRadius: "6px",
                padding: "10px 16px",
                cursor: "pointer",
                fontSize: "14px",
                minHeight: "44px",
              }}
            >
              {dict.booking.slots.joinWaitlist}
            </button>
          ) : (
            <WaitingListForm
              date={date!}
              serviceId={serviceId!}
              clientId={clientId}
              onSuccess={() => setWaitingSubmitted(true)}
              onError={(msg) => setWaitingError(msg)}
              isLoading={waitingLoading}
              setIsLoading={setWaitingLoading}
            />
          )}
          {waitingError && (
            <p style={{
              color: "var(--color-text)",
              fontSize: "13px",
              marginTop: "8px",
              padding: "8px",
              border: "1px solid var(--color-accent)",
              borderRadius: "6px",
            }}>⚠ {waitingError}</p>
          )}
        </div>
      )}

      {allFull && waitingSubmitted && (
        <div
          style={{
            marginTop: "16px",
            padding: "12px",
            border: "1px solid var(--color-primary)",
            borderRadius: "8px",
            background: "color-mix(in srgb, var(--color-primary) 8%, var(--color-background))",
          }}
        >
          <p style={{ color: "var(--color-primary)", fontSize: "14px" }}>
            {dict.booking.slots.onWaitlist}
          </p>
        </div>
      )}
    </div>
  );
}

// ── WaitingListForm ────────────────────────────────────────────────────────────
// Intentionally NOT a <form> element — SlotPicker lives inside BookingForm's <form>.
// Uses <div> + <button type="button" onClick> to avoid nested form issues.

interface WaitingListFormProps {
  date: string;
  serviceId: string;
  clientId: string | null;
  onSuccess: () => void;
  onError: (msg: string) => void;
  isLoading: boolean;
  setIsLoading: (v: boolean) => void;
}

function WaitingListForm({
  date,
  serviceId,
  clientId,
  onSuccess,
  onError,
  isLoading,
  setIsLoading,
}: WaitingListFormProps) {
  const { dict } = useI18n();
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [gdprChecked, setGdprChecked] = useState(false);

  async function handleSubmit() {
    if (!customerName.trim() || !customerEmail.trim()) {
      onError(dict.booking.waitlist.errNameEmail);
      return;
    }
    if (!gdprChecked) {
      onError(dict.booking.waitlist.errGdpr);
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch("/api/waiting-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName,
          customerEmail,
          customerPhone: customerPhone || undefined,
          serviceId,
          requestedDate: date,
          clientId: clientId ?? undefined,
          gdprConsent: gdprChecked,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        onError(data.error ?? dict.booking.waitlist.errGeneric);
      } else {
        onSuccess();
      }
    } catch {
      onError(dict.booking.waitlist.errNetwork);
    } finally {
      setIsLoading(false);
    }
  }

  const inputStyle = {
    width: "100%",
    borderRadius: "4px",
    border: "1px solid var(--color-accent)",
    backgroundColor: "#fff",
    color: "var(--color-primary)",
    padding: "10px 12px",
    fontSize: "14px",
    outline: "none",
    boxSizing: "border-box" as const,
    minHeight: "44px",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "8px" }}>
      <input
        type="text"
        placeholder={dict.booking.waitlist.namePlaceholder}
        value={customerName}
        onChange={(e) => setCustomerName(e.target.value)}
        required
        style={inputStyle}
      />
      <input
        type="email"
        placeholder={dict.booking.waitlist.emailPlaceholder}
        value={customerEmail}
        onChange={(e) => setCustomerEmail(e.target.value)}
        required
        style={inputStyle}
      />
      <input
        type="tel"
        placeholder={dict.booking.waitlist.phonePlaceholder}
        value={customerPhone}
        onChange={(e) => setCustomerPhone(e.target.value)}
        style={inputStyle}
      />
      <label
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "8px",
          cursor: "pointer",
          fontSize: "13px",
          color: "var(--color-text)",
        }}
      >
        <input
          type="checkbox"
          checked={gdprChecked}
          onChange={(e) => setGdprChecked(e.target.checked)}
          style={{ marginTop: "2px", accentColor: "var(--color-secondary)" }}
        />
        <span>
          {dict.booking.waitlist.gdprConsent}{" "}
          <span style={{ color: "#dc2626" }}>*</span>
        </span>
      </label>
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!gdprChecked || isLoading}
        style={{
          background: "var(--color-primary)",
          color: "var(--color-background)",
          border: "none",
          borderRadius: "6px",
          padding: "10px 16px",
          cursor: !gdprChecked || isLoading ? "not-allowed" : "pointer",
          fontSize: "14px",
          minHeight: "44px",
          opacity: !gdprChecked || isLoading ? 0.6 : 1,
        }}
      >
        {isLoading ? dict.booking.waitlist.submitting : dict.booking.waitlist.submit}
      </button>
    </div>
  );
}
