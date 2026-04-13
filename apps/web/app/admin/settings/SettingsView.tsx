"use client";

import { useEffect, useState } from "react";

// ── Types ──────────────────────────────────────────────────────────────────

interface ServiceRow {
  id: string;
  serviceName: string;
  category: string;
  durationMinutes: number;
  priceEur: number | null;
  active: boolean;
  description: string | null;
  sortOrder: number;
}

interface DayHours {
  open: string;
  close: string;
}

interface OperatingHours {
  monday: DayHours | null;
  tuesday: DayHours | null;
  wednesday: DayHours | null;
  thursday: DayHours | null;
  friday: DayHours | null;
  saturday: DayHours | null;
  sunday: DayHours | null;
}

interface BookingRules {
  minAdvanceBookingHours: number;
  cancellationPolicyHours: number;
  maxFollowUpAttempts: number;
  recoveryWaitHours: number;
}

interface AdminConfig {
  operatingHours: OperatingHours;
  bookingRules: BookingRules;
  closedDates: string[];
}

// ── Helpers ────────────────────────────────────────────────────────────────

const WEEKDAY_LABELS: Record<string, string> = {
  monday: "Montag", tuesday: "Dienstag", wednesday: "Mittwoch",
  thursday: "Donnerstag", friday: "Freitag", saturday: "Samstag", sunday: "Sonntag",
};

const WEEKDAY_ORDER = [
  "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
] as const;

function formatPrice(cents: number | null): string {
  if (cents === null) return "";
  return (cents / 100).toFixed(2);
}

function parsePrice(value: string): number | null {
  const num = parseFloat(value.replace(",", "."));
  if (isNaN(num) || num < 0) return null;
  return Math.round(num * 100);
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function SettingsView() {
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [config, setConfig] = useState<AdminConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [savingService, setSavingService] = useState<string | null>(null);
  const [savingConfig, setSavingConfig] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const [editedConfig, setEditedConfig] = useState<AdminConfig | null>(null);

  async function loadAll() {
    setIsLoading(true);
    setError(null);
    try {
      const [svcRes, cfgRes] = await Promise.all([
        fetch("/api/admin/services"),
        fetch("/api/admin/config"),
      ]);
      if (!svcRes.ok || !cfgRes.ok) throw new Error("Load failed");
      const svcData = await svcRes.json();
      const cfgData = await cfgRes.json();
      setServices(svcData.services ?? []);
      setConfig(cfgData.config);
      setEditedConfig(cfgData.config);
    } catch {
      setError("Ayarlar yüklenemedi.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, []);

  // ── Service Price/Active Edit ──────────────────────────────────────────

  async function handleServiceSave(service: ServiceRow, newPrice: string, newActive: boolean) {
    setSavingService(service.id);
    setSaveMessage(null);
    try {
      const priceEur = parsePrice(newPrice);
      const res = await fetch(`/api/admin/services/${service.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceEur, active: newActive }),
      });
      if (!res.ok) throw new Error("Save failed");
      setSaveMessage("Gespeichert ✓");
      await loadAll();
    } catch {
      setSaveMessage("Speichern fehlgeschlagen.");
    } finally {
      setSavingService(null);
    }
  }

  // ── Config Section Save ────────────────────────────────────────────────

  async function handleConfigSave(section: keyof AdminConfig) {
    if (!editedConfig) return;
    setSavingConfig(section);
    setSaveMessage(null);
    try {
      const res = await fetch("/api/admin/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [section]: editedConfig[section] }),
      });
      if (!res.ok) throw new Error("Save failed");
      setSaveMessage("Gespeichert ✓");
      await loadAll();
    } catch {
      setSaveMessage("Speichern fehlgeschlagen.");
    } finally {
      setSavingConfig(null);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────

  if (isLoading) return (
    <p style={{ padding: "2rem", color: "var(--color-text-muted)" }}>Lädt...</p>
  );
  if (error) return (
    <p style={{ padding: "2rem", color: "var(--color-text-muted)" }}>⚠ {error}</p>
  );
  if (!editedConfig) return <></>;

  return (
    <div style={{ padding: "2rem", maxWidth: "900px" }}>
      <h1 style={{ color: "var(--color-text)", fontSize: "1.5rem", fontWeight: 600, marginBottom: "2rem" }}>
        Einstellungen
      </h1>

      {saveMessage && (
        <div style={{
          marginBottom: "1rem", padding: "8px 12px",
          border: "1px solid var(--color-primary)", borderRadius: "6px",
          fontSize: "13px", color: "var(--color-primary)",
        }}>
          {saveMessage}
        </div>
      )}

      {/* ── Section 1: Leistungen ── */}
      <Section title="Leistungen">
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--color-secondary)" }}>
              {["Leistung", "Kategorie", "Dauer", "Preis (€)", "Aktiv", ""].map(h => (
                <th key={h} style={{ textAlign: "left", padding: "8px 10px",
                  fontSize: "12px", color: "var(--color-text-muted)", fontWeight: 500 }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {services.map(svc => (
              <ServiceRowItem
                key={svc.id}
                service={svc}
                onSave={handleServiceSave}
                isSaving={savingService === svc.id}
              />
            ))}
          </tbody>
        </table>
      </Section>

      {/* ── Section 2: Öffnungszeiten ── */}
      <Section title="Öffnungszeiten">
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--color-secondary)" }}>
              {["Tag", "Öffnung", "Schließung", "Geöffnet"].map(h => (
                <th key={h} style={{ textAlign: "left", padding: "8px 10px",
                  fontSize: "12px", color: "var(--color-text-muted)", fontWeight: 500 }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {WEEKDAY_ORDER.map(day => {
              const hours = editedConfig.operatingHours[day];
              const isOpen = hours !== null;
              return (
                <tr key={day} style={{ borderBottom: "1px solid var(--color-accent)" }}>
                  <td style={{ padding: "10px", fontSize: "14px", color: "var(--color-text)" }}>
                    {WEEKDAY_LABELS[day]}
                  </td>
                  <td style={{ padding: "10px" }}>
                    <input
                      type="time"
                      value={hours?.open ? `${hours.open.slice(0, 2)}:${hours.open.slice(2)}` : ""}
                      disabled={!isOpen}
                      onChange={e => {
                        const val = e.target.value.replace(":", "");
                        setEditedConfig({
                          ...editedConfig,
                          operatingHours: {
                            ...editedConfig.operatingHours,
                            [day]: { open: val, close: hours?.close ?? "1800" },
                          },
                        });
                      }}
                      style={{ ...inputStyle, width: "100px" }}
                    />
                  </td>
                  <td style={{ padding: "10px" }}>
                    <input
                      type="time"
                      value={hours?.close ? `${hours.close.slice(0, 2)}:${hours.close.slice(2)}` : ""}
                      disabled={!isOpen}
                      onChange={e => {
                        const val = e.target.value.replace(":", "");
                        setEditedConfig({
                          ...editedConfig,
                          operatingHours: {
                            ...editedConfig.operatingHours,
                            [day]: { open: hours?.open ?? "0900", close: val },
                          },
                        });
                      }}
                      style={{ ...inputStyle, width: "100px" }}
                    />
                  </td>
                  <td style={{ padding: "10px" }}>
                    <input
                      type="checkbox"
                      checked={isOpen}
                      onChange={e => {
                        setEditedConfig({
                          ...editedConfig,
                          operatingHours: {
                            ...editedConfig.operatingHours,
                            [day]: e.target.checked ? { open: "0900", close: "1800" } : null,
                          },
                        });
                      }}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <SaveButton
          onClick={() => handleConfigSave("operatingHours")}
          isSaving={savingConfig === "operatingHours"}
        />
      </Section>

      {/* ── Section 4: Geschlossene Tage ── */}
      <Section title="Geschlossene Tage">
        <p style={{ fontSize: "13px", color: "var(--color-text-muted)", marginBottom: "0.75rem" }}>
          Feiertage oder Betriebsurlaub — diese Tage sind für Buchungen gesperrt.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1rem" }}>
          {editedConfig.closedDates.map(date => (
            <span key={date} style={{
              display: "flex", alignItems: "center", gap: "4px",
              padding: "4px 10px", borderRadius: "999px",
              border: "1px solid var(--color-secondary)",
              fontSize: "13px", color: "var(--color-text)",
            }}>
              {date}
              <button
                type="button"
                onClick={() => setEditedConfig({
                  ...editedConfig,
                  closedDates: editedConfig.closedDates.filter(d => d !== date),
                })}
                style={{ background: "none", border: "none", cursor: "pointer",
                  color: "var(--color-text-muted)", fontSize: "14px", lineHeight: "1" }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <input
            type="date"
            id="new-closed-date"
            style={{ ...inputStyle, width: "160px" }}
          />
          <button
            type="button"
            onClick={() => {
              const input = document.getElementById("new-closed-date") as HTMLInputElement;
              const val = input?.value;
              if (!val || editedConfig.closedDates.includes(val)) return;
              setEditedConfig({
                ...editedConfig,
                closedDates: [...editedConfig.closedDates, val].sort(),
              });
              input.value = "";
            }}
            style={secondaryButtonStyle}
          >
            + Hinzufügen
          </button>
        </div>
        <SaveButton
          onClick={() => handleConfigSave("closedDates")}
          isSaving={savingConfig === "closedDates"}
        />
      </Section>

      {/* ── Section 5: Buchungsregeln ── */}
      <Section title="Buchungsregeln">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          {(Object.entries({
            minAdvanceBookingHours: "Mindestvorlaufzeit (Std.)",
            cancellationPolicyHours: "Stornierungsfrist (Std.)",
            maxFollowUpAttempts: "Max. Nachfassversuche",
            recoveryWaitHours: "Wartezeit Rückgewinnung (Std.)",
          }) as [keyof BookingRules, string][]).map(([key, label]) => (
            <div key={key}>
              <label style={{ fontSize: "12px", color: "var(--color-text-muted)",
                display: "block", marginBottom: "4px" }}>
                {label}
              </label>
              <input
                type="number"
                min={0}
                value={editedConfig.bookingRules[key] ?? ""}
                onChange={e => setEditedConfig({
                  ...editedConfig,
                  bookingRules: {
                    ...editedConfig.bookingRules,
                    [key]: parseInt(e.target.value, 10),
                  },
                })}
                style={{ ...inputStyle, width: "100%" }}
              />
            </div>
          ))}
        </div>
        <SaveButton
          onClick={() => handleConfigSave("bookingRules")}
          isSaving={savingConfig === "bookingRules"}
        />
      </Section>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: "2.5rem" }}>
      <h2 style={{ color: "var(--color-text)", fontSize: "1rem", fontWeight: 600,
        marginBottom: "1rem", paddingBottom: "0.5rem",
        borderBottom: "1px solid var(--color-accent)" }}>
        {title}
      </h2>
      {children}
    </section>
  );
}

function ServiceRowItem({ service, onSave, isSaving }: {
  service: ServiceRow;
  onSave: (s: ServiceRow, price: string, active: boolean) => void;
  isSaving: boolean;
}) {
  const [price, setPrice] = useState(formatPrice(service.priceEur));
  const [active, setActive] = useState(service.active);

  return (
    <tr style={{ borderBottom: "1px solid var(--color-accent)" }}>
      <td style={{ padding: "10px", fontSize: "14px", color: "var(--color-text)" }}>
        {service.serviceName}
      </td>
      <td style={{ padding: "10px", fontSize: "13px", color: "var(--color-text-muted)" }}>
        {service.category}
      </td>
      <td style={{ padding: "10px", fontSize: "13px", color: "var(--color-text-muted)" }}>
        {service.durationMinutes} Min.
      </td>
      <td style={{ padding: "10px" }}>
        <input
          type="text"
          value={price}
          onChange={e => setPrice(e.target.value)}
          style={{ ...inputStyle, width: "80px" }}
          placeholder="0.00"
        />
      </td>
      <td style={{ padding: "10px" }}>
        <input
          type="checkbox"
          checked={active}
          onChange={e => setActive(e.target.checked)}
        />
      </td>
      <td style={{ padding: "10px" }}>
        <button
          type="button"
          onClick={() => onSave(service, price, active)}
          disabled={isSaving}
          style={{ ...secondaryButtonStyle, opacity: isSaving ? 0.6 : 1 }}
        >
          {isSaving ? "..." : "Speichern"}
        </button>
      </td>
    </tr>
  );
}

function SaveButton({ onClick, isSaving }: { onClick: () => void; isSaving: boolean }) {
  return (
    <div style={{ marginTop: "1rem" }}>
      <button
        type="button"
        onClick={onClick}
        disabled={isSaving}
        style={{
          background: "var(--color-primary)",
          color: "var(--color-background)",
          border: "none",
          padding: "8px 20px",
          borderRadius: "6px",
          fontSize: "13px",
          cursor: isSaving ? "not-allowed" : "pointer",
          opacity: isSaving ? 0.6 : 1,
          minHeight: "36px",
        }}
      >
        {isSaving ? "Wird gespeichert..." : "Speichern"}
      </button>
    </div>
  );
}

// ── Shared Styles ──────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  border: "1px solid var(--color-accent)",
  borderRadius: "4px",
  padding: "6px 8px",
  fontSize: "13px",
  color: "var(--color-text)",
  background: "var(--color-background)",
};

const secondaryButtonStyle: React.CSSProperties = {
  background: "var(--color-background)",
  color: "var(--color-text)",
  border: "1px solid var(--color-accent)",
  padding: "6px 14px",
  borderRadius: "6px",
  fontSize: "13px",
  cursor: "pointer",
  minHeight: "32px",
};
