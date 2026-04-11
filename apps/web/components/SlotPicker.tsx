"use client";

import { useState, useEffect } from "react";

interface SlotItem {
  time: string;
  datetime: string;
  available: boolean;
}

interface SlotPickerProps {
  date: string | null;
  serviceId: string | null;
  clientId: string;
  selectedSlot: string | null;
  onSlotSelect: (datetime: string, time: string) => void;
}

export default function SlotPicker({
  date,
  serviceId,
  clientId,
  selectedSlot,
  onSlotSelect,
}: SlotPickerProps) {
  const [slots, setSlots] = useState<SlotItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCounter, setRetryCounter] = useState(0);

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
    // Reset waiting list state when date/service changes
    setShowWaitingForm(false);
    setWaitingSubmitted(false);
    setWaitingError(null);
    fetch(
      `/api/booking/slots?date=${encodeURIComponent(date)}&serviceId=${encodeURIComponent(serviceId)}&clientId=${encodeURIComponent(clientId)}`,
      { signal: controller.signal },
    )
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<{ slots: SlotItem[] }>;
      })
      .then((data) => {
        setSlots(data.slots ?? []);
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name !== "AbortError") {
          setError("Saatler yüklenemedi, lütfen tekrar deneyin");
        }
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [date, serviceId, clientId, retryCounter]);

  const allFull =
    !loading && !error && slots.length > 0 && slots.every((s) => !s.available);

  if (!date || !serviceId) {
    return (
      <p className="text-sm py-2" style={{ color: "var(--color-text-muted)" }}>
        Önce tarih seçin
      </p>
    );
  }

  if (loading) {
    return (
      <p className="text-sm py-2" style={{ color: "var(--color-text-muted)" }}>
        Müsait saatler yükleniyor…
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
          Tekrar dene
        </button>
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <p className="text-sm py-2" style={{ color: "var(--color-text-muted)" }}>
        Bu gün için müsait saat bulunmuyor
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
              onClick={() => isAvailable && onSlotSelect(slot.datetime, slot.time)}
              disabled={!isAvailable}
              className="flex items-center justify-center text-sm font-medium rounded-sm relative transition-colors"
              style={{
                minHeight: "44px",
                opacity: !isAvailable ? 0.4 : 1,
                pointerEvents: !isAvailable ? "none" : "auto",
                backgroundColor: isSelected
                  ? "var(--color-primary)"
                  : "var(--color-background)",
                color: isSelected ? "#fff" : "var(--color-primary)",
                border: isSelected
                  ? "2px solid var(--color-primary)"
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
                  Dolu
                </span>
              )}
            </button>
          );
        })}
      </div>

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
            Alle Termine für diesen Tag sind vergeben.
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
              Warteliste beitreten
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
            <p style={{ color: "#DC2626", fontSize: "13px", marginTop: "8px" }}>{waitingError}</p>
          )}
        </div>
      )}

      {allFull && waitingSubmitted && (
        <div
          style={{
            marginTop: "16px",
            padding: "12px",
            background: "#D1FAE5",
            borderRadius: "8px",
          }}
        >
          <p style={{ color: "#065F46", fontSize: "14px" }}>
            ✓ Sie stehen auf der Warteliste. Wir melden uns, sobald ein Termin frei wird.
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
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [gdprConsent, setGdprConsent] = useState(false);

  async function handleSubmit() {
    if (!customerName.trim() || !customerEmail.trim()) {
      onError("Name und E-Mail sind erforderlich.");
      return;
    }
    if (!gdprConsent) {
      onError("Bitte stimmen Sie der Datenschutzerklärung zu.");
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
          gdprConsent: true,
        }),
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
        placeholder="Name *"
        value={customerName}
        onChange={(e) => setCustomerName(e.target.value)}
        required
        style={inputStyle}
      />
      <input
        type="email"
        placeholder="E-Mail *"
        value={customerEmail}
        onChange={(e) => setCustomerEmail(e.target.value)}
        required
        style={inputStyle}
      />
      <input
        type="tel"
        placeholder="Telefon (optional)"
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
          checked={gdprConsent}
          onChange={(e) => setGdprConsent(e.target.checked)}
          style={{ marginTop: "2px", accentColor: "var(--color-secondary)" }}
        />
        <span>
          Ich stimme der Verarbeitung meiner Daten zur Wartelistenverwaltung zu.{" "}
          <span style={{ color: "#dc2626" }}>*</span>
        </span>
      </label>
      <button
        type="button"
        onClick={handleSubmit}
        disabled={isLoading}
        style={{
          background: isLoading ? "var(--color-accent)" : "var(--color-secondary)",
          color: "var(--color-primary)",
          border: "none",
          borderRadius: "6px",
          padding: "10px 16px",
          cursor: isLoading ? "default" : "pointer",
          fontSize: "14px",
          fontWeight: 600,
          minHeight: "44px",
          opacity: isLoading ? 0.7 : 1,
        }}
      >
        {isLoading ? "Wird eingetragen…" : "Auf Warteliste eintragen"}
      </button>
    </div>
  );
}
