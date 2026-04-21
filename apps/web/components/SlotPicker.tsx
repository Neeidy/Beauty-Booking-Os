"use client";

import { useState, useEffect } from "react";

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
  const [slots, setSlots] = useState<SlotItem[]>([]);
  const [isDayClosed, setIsDayClosed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCounter, setRetryCounter] = useState(0);

  const [reservationToken, setReservationToken] = useState<string | null>(null);
  const [reservationExpiresAt, setReservationExpiresAt] = useState<Date | null>(null);
  const [reservationCountdownSeconds, setReservationCountdownSeconds] = useState<number>(0);
  const [lockError, setLockError] = useState<string | null>(null);

  const [showWaitingForm, setShowWaitingForm] = useState(false);
  const [waitingSubmitted, setWaitingSubmitted] = useState(false);
  const [waitingLoading, setWaitingLoading] = useState(false);
  const [waitingError, setWaitingError] = useState<string | null>(null);

  useEffect(() => {
    if (!date || !serviceId) { setSlots([]); return; }
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setIsDayClosed(false);
    setShowWaitingForm(false);
    setWaitingSubmitted(false);
    setWaitingError(null);

    const slotsUrl =
      `/api/booking/slots?date=${encodeURIComponent(date)}&serviceId=${encodeURIComponent(serviceId)}&clientId=${encodeURIComponent(clientId)}` +
      (reservationToken ? `&reservationToken=${encodeURIComponent(reservationToken)}` : "");

    fetch(slotsUrl, { signal: controller.signal })
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() as Promise<SlotsResponse>; })
      .then((data) => { setIsDayClosed(data.isDayClosed ?? false); setSlots(data.slots ?? []); })
      .catch((err: unknown) => { if (err instanceof Error && err.name !== "AbortError") setError("Zeiten konnten nicht geladen werden. Bitte erneut versuchen."); })
      .finally(() => setLoading(false));
    return () => controller.abort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, serviceId, clientId, retryCounter]);

  useEffect(() => {
    if (!reservationExpiresAt) return;
    const tick = () => {
      const remaining = Math.max(0, Math.floor((reservationExpiresAt.getTime() - Date.now()) / 1000));
      setReservationCountdownSeconds(remaining);
      if (remaining === 0) {
        setReservationToken(null);
        setReservationExpiresAt(null);
        setLockError("Reservierungszeit abgelaufen. Bitte erneut wählen.");
        setRetryCounter((c) => c + 1);
      }
    };
    const interval = setInterval(tick, 1000);
    tick();
    return () => clearInterval(interval);
  }, [reservationExpiresAt]);

  useEffect(() => {
    return () => {
      if (reservationToken) {
        fetch(`/api/booking/reservations/${reservationToken}`, { method: "DELETE", keepalive: true }).catch(() => {});
      }
    };
  }, [reservationToken]);

  async function handleSlotSelect(slot: SlotItem) {
    setLockError(null);
    try {
      const res = await fetch("/api/booking/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceId, date, time: slot.time, replaceToken: reservationToken ?? undefined }),
      });
      if (res.status === 409) {
        setLockError("Dieser Slot ist gerade vergeben.");
        setReservationToken(null);
        setReservationExpiresAt(null);
        setRetryCounter((c) => c + 1);
        return;
      }
      if (!res.ok) { setLockError("Slot konnte nicht reserviert werden. Bitte erneut versuchen."); return; }
      const data = await res.json() as { reservationToken: string; expiresAt: string };
      setReservationToken(data.reservationToken);
      setReservationExpiresAt(new Date(data.expiresAt));
      onSlotSelect(slot.datetime, slot.time, data.reservationToken);
    } catch {
      setLockError("Verbindungsfehler. Bitte erneut versuchen.");
    }
  }

  const allFull = !loading && !error && slots.length > 0 && slots.every((s) => !s.available);

  if (!date || !serviceId) {
    return <p className="slots-label">Zuerst ein Datum wählen</p>;
  }
  if (loading) {
    return <p className="slots-label">Verfügbare Zeiten werden geladen…</p>;
  }
  if (error) {
    return (
      <div>
        <p className="slots-label" style={{ color: "var(--color-rose)" }}>{error}</p>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setRetryCounter((c) => c + 1)}>
          Erneut versuchen
        </button>
      </div>
    );
  }
  if (isDayClosed) {
    return <p className="slots-label">Dieser Tag ist nicht verfügbar. Bitte wählen Sie einen anderen Tag.</p>;
  }
  if (slots.length === 0) {
    return <p className="slots-label">Keine Termine für diesen Tag verfügbar</p>;
  }

  const countdownMins = Math.floor(reservationCountdownSeconds / 60);
  const countdownSecs = String(reservationCountdownSeconds % 60).padStart(2, "0");

  return (
    <div>
      <div className="slot-grid">
        {slots.map((slot) => {
          const isSelected = slot.datetime === selectedSlot;
          const isAvailable = slot.available;
          let cls = "slot";
          if (!isAvailable) cls += " disabled";
          else if (isSelected) cls += " selected";
          return (
            <button
              key={slot.datetime}
              type="button"
              className={cls}
              onClick={() => isAvailable && handleSlotSelect(slot)}
              disabled={!isAvailable}
            >
              {slot.time}
            </button>
          );
        })}
      </div>

      {reservationToken && reservationCountdownSeconds > 0 && (
        <div className="countdown">
          🔒 Slot reserviert — noch <strong>{countdownMins}:{countdownSecs}</strong>
        </div>
      )}

      {lockError && (
        <div className="countdown" style={{ color: "var(--color-rose)", background: "var(--color-rose-soft)" }}>
          ⚠ {lockError}
        </div>
      )}

      {allFull && !waitingSubmitted && (
        <div style={{ marginTop: "16px", padding: "14px 16px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)" }}>
          <p className="slots-label" style={{ marginBottom: "10px" }}>Alle Termine für diesen Tag sind vergeben.</p>
          {!showWaitingForm ? (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowWaitingForm(true)}>
              Auf Warteliste eintragen
            </button>
          ) : (
            <WaitingListForm
              date={date}
              serviceId={serviceId}
              clientId={clientId}
              onSuccess={() => setWaitingSubmitted(true)}
              onError={(msg) => setWaitingError(msg)}
              isLoading={waitingLoading}
              setIsLoading={setWaitingLoading}
            />
          )}
          {waitingError && <p className="slots-label" style={{ color: "var(--color-rose)", marginTop: "8px" }}>⚠ {waitingError}</p>}
        </div>
      )}

      {allFull && waitingSubmitted && (
        <div style={{ marginTop: "16px", padding: "14px 16px", background: "var(--color-accent-soft)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)" }}>
          <p className="slots-label" style={{ color: "var(--color-accent)" }}>
            ✓ Sie stehen auf der Warteliste. Wir melden uns, sobald ein Termin frei wird.
          </p>
        </div>
      )}
    </div>
  );
}

// ── WaitingListForm ────────────────────────────────────────────────────────────
interface WaitingListFormProps {
  date: string;
  serviceId: string;
  clientId: string | null;
  onSuccess: () => void;
  onError: (msg: string) => void;
  isLoading: boolean;
  setIsLoading: (v: boolean) => void;
}

function WaitingListForm({ date, serviceId, clientId, onSuccess, onError, isLoading, setIsLoading }: WaitingListFormProps) {
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [gdprChecked, setGdprChecked] = useState(false);

  async function handleSubmit() {
    if (!customerName.trim() || !customerEmail.trim()) { onError("Name und E-Mail sind erforderlich."); return; }
    if (!gdprChecked) { onError("Bitte stimmen Sie der Datenschutzerklärung zu."); return; }
    setIsLoading(true);
    try {
      const res = await fetch("/api/waiting-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerName, customerEmail, customerPhone: customerPhone || undefined, serviceId, requestedDate: date, clientId: clientId ?? undefined, gdprConsent: gdprChecked }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        onError(data.error ?? "Fehler beim Eintragen. Bitte versuchen Sie es erneut.");
      } else {
        onSuccess();
      }
    } catch {
      onError("Netzwerkfehler. Bitte versuchen Sie es erneut.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "8px" }}>
      <input className="form-input" type="text" placeholder="Name *" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
      <input className="form-input" type="email" placeholder="E-Mail *" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} />
      <input className="form-input" type="tel" placeholder="Telefon (optional)" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
      <label className="gdpr-check">
        <input type="checkbox" checked={gdprChecked} onChange={(e) => setGdprChecked(e.target.checked)} />
        <span>Ich stimme der Verarbeitung meiner Daten zur Wartelistenverwaltung zu. <span style={{ color: "var(--color-rose)" }}>*</span></span>
      </label>
      <button type="button" className="btn btn-primary btn-sm" onClick={handleSubmit} disabled={!gdprChecked || isLoading}>
        {isLoading ? "Bitte warten..." : "Auf Warteliste eintragen"}
      </button>
    </div>
  );
}
