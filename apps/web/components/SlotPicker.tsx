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

  useEffect(() => {
    if (!date || !serviceId) {
      setSlots([]);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError(null);
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
  );
}
