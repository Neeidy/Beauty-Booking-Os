"use client";

import { useEffect, useState } from "react";

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

export default function SettingsView() {
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [config, setConfig] = useState<AdminConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [savingService, setSavingService] = useState<string | null>(null);
  const [savingConfig, setSavingConfig] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState("sec-services");

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

  function handleDiscard() {
    setEditedConfig(config);
    setSaveMessage(null);
  }

  function scrollTo(id: string) {
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  }

  if (isLoading) return (
    <div className="adm-body">
      <p style={{ color: "var(--color-text-muted)", fontSize: "14px" }}>Lädt...</p>
    </div>
  );
  if (error) return (
    <div className="adm-body">
      <div className="empty">
        <div className="empty-ico">⚠</div>
        <h4>Fehler beim Laden</h4>
        <p>{error}</p>
      </div>
    </div>
  );
  if (!editedConfig) return null;

  const activeServiceCount = services.filter((s) => s.active).length;

  return (
    <>
      <div className="adm-header-actions" style={{ display: "flex", gap: "8px", padding: "0 32px 12px", borderBottom: "1px solid var(--color-border)" }}>
        <button className="btn btn-ghost btn-sm" onClick={handleDiscard}>Verwerfen</button>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => {
            handleConfigSave("operatingHours");
            handleConfigSave("closedDates");
            handleConfigSave("bookingRules");
          }}
          disabled={!!savingConfig}
        >
          {savingConfig ? "Wird gespeichert..." : "Änderungen speichern"}
        </button>
        {saveMessage && (
          <span style={{ fontSize: "13px", color: "var(--color-text-muted)", alignSelf: "center", marginLeft: "8px" }}>
            {saveMessage}
          </span>
        )}
      </div>

      <div className="adm-body">
        <div className="settings-layout">
          <nav className="settings-side">
            <div
              className={`settings-side-link${activeSection === "sec-services" ? " active" : ""}`}
              onClick={() => scrollTo("sec-services")}
            >
              Leistungen & Preise
            </div>
            <div
              className={`settings-side-link${activeSection === "sec-hours" ? " active" : ""}`}
              onClick={() => scrollTo("sec-hours")}
            >
              Öffnungszeiten
            </div>
            <div
              className={`settings-side-link${activeSection === "sec-closed" ? " active" : ""}`}
              onClick={() => scrollTo("sec-closed")}
            >
              Geschlossene Tage
            </div>
            <div
              className={`settings-side-link${activeSection === "sec-rules" ? " active" : ""}`}
              onClick={() => scrollTo("sec-rules")}
            >
              Buchungsregeln
            </div>
          </nav>

          <div className="settings-main">

            {/* Leistungen & Preise */}
            <section id="sec-services" className="settings-section">
              <div className="settings-section-title">
                <div>
                  <h4>Leistungen & Preise</h4>
                  <div className="hint">{activeServiceCount} aktive Leistungen</div>
                </div>
              </div>

              <div className="svc-edit-row svc-head">
                <div>Name</div>
                <div>Dauer (Min)</div>
                <div>Preis (€)</div>
                <div>Aktiv</div>
                <div></div>
              </div>

              {services.map((svc) => (
                <ServiceEditRow
                  key={svc.id}
                  service={svc}
                  onSave={handleServiceSave}
                  isSaving={savingService === svc.id}
                />
              ))}
            </section>

            {/* Öffnungszeiten */}
            <section id="sec-hours" className="settings-section">
              <div className="settings-section-title">
                <div>
                  <h4>Öffnungszeiten</h4>
                  <div className="hint">Standard-Wochenzeiten · Ausnahmen unter &quot;Geschlossene Tage&quot;</div>
                </div>
              </div>

              <div className="hours-grid">
                {WEEKDAY_ORDER.map((day) => {
                  const hours = editedConfig.operatingHours[day];
                  const isOpen = hours !== null;
                  return (
                    <div key={day} className={`hours-row${isOpen ? "" : " closed"}`}>
                      <div className="day">{WEEKDAY_LABELS[day]}</div>
                      <label className="gdpr-check">
                        <input
                          type="checkbox"
                          checked={isOpen}
                          onChange={(e) => {
                            setEditedConfig({
                              ...editedConfig,
                              operatingHours: {
                                ...editedConfig.operatingHours,
                                [day]: e.target.checked ? { open: "0900", close: "1800" } : null,
                              },
                            });
                          }}
                        />
                        <span>geöffnet</span>
                      </label>
                      <input
                        type="time"
                        value={hours?.open ? `${hours.open.slice(0, 2)}:${hours.open.slice(2)}` : ""}
                        disabled={!isOpen}
                        onChange={(e) => {
                          const val = e.target.value.replace(":", "");
                          setEditedConfig({
                            ...editedConfig,
                            operatingHours: {
                              ...editedConfig.operatingHours,
                              [day]: { open: val, close: hours?.close ?? "1800" },
                            },
                          });
                        }}
                      />
                      <input
                        type="time"
                        value={hours?.close ? `${hours.close.slice(0, 2)}:${hours.close.slice(2)}` : ""}
                        disabled={!isOpen}
                        onChange={(e) => {
                          const val = e.target.value.replace(":", "");
                          setEditedConfig({
                            ...editedConfig,
                            operatingHours: {
                              ...editedConfig.operatingHours,
                              [day]: { open: hours?.open ?? "0900", close: val },
                            },
                          });
                        }}
                      />
                    </div>
                  );
                })}
              </div>

              <div style={{ marginTop: "16px" }}>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => handleConfigSave("operatingHours")}
                  disabled={savingConfig === "operatingHours"}
                >
                  {savingConfig === "operatingHours" ? "Wird gespeichert..." : "Speichern"}
                </button>
              </div>
            </section>

            {/* Geschlossene Tage */}
            <section id="sec-closed" className="settings-section">
              <div className="settings-section-title">
                <div>
                  <h4>Geschlossene Tage</h4>
                  <div className="hint">Feiertage oder Betriebsurlaub — gesperrt für Buchungen</div>
                </div>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "16px" }}>
                {editedConfig.closedDates.map((date) => (
                  <span key={date} style={{
                    display: "flex", alignItems: "center", gap: "4px",
                    padding: "4px 10px", borderRadius: "999px",
                    border: "1px solid var(--color-border)",
                    fontSize: "13px", color: "var(--color-text)",
                    background: "var(--color-bg-card)",
                  }}>
                    {date}
                    <button
                      type="button"
                      onClick={() => setEditedConfig({
                        ...editedConfig,
                        closedDates: editedConfig.closedDates.filter((d) => d !== date),
                      })}
                      style={{ background: "none", border: "none", cursor: "pointer",
                        color: "var(--color-text-muted)", fontSize: "14px", lineHeight: "1", padding: "0 2px" }}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>

              <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "16px" }}>
                <input
                  type="date"
                  id="new-closed-date"
                  className="form-input"
                  style={{ width: "160px" }}
                />
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
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
                >
                  + Hinzufügen
                </button>
              </div>

              <button
                className="btn btn-primary btn-sm"
                onClick={() => handleConfigSave("closedDates")}
                disabled={savingConfig === "closedDates"}
              >
                {savingConfig === "closedDates" ? "Wird gespeichert..." : "Speichern"}
              </button>
            </section>

            {/* Buchungsregeln */}
            <section id="sec-rules" className="settings-section">
              <div className="settings-section-title">
                <div>
                  <h4>Buchungsregeln</h4>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                {(Object.entries({
                  minAdvanceBookingHours: "Mindestvorlaufzeit (Std.)",
                  cancellationPolicyHours: "Stornierungsfrist (Std.)",
                  maxFollowUpAttempts: "Max. Nachfassversuche",
                  recoveryWaitHours: "Wartezeit Rückgewinnung (Std.)",
                }) as [keyof BookingRules, string][]).map(([key, label]) => (
                  <div key={key}>
                    <label className="form-label">{label}</label>
                    <input
                      type="number"
                      min={0}
                      className="form-input"
                      value={editedConfig.bookingRules[key] ?? ""}
                      onChange={(e) => setEditedConfig({
                        ...editedConfig,
                        bookingRules: {
                          ...editedConfig.bookingRules,
                          [key]: parseInt(e.target.value, 10),
                        },
                      })}
                    />
                  </div>
                ))}
              </div>

              <button
                className="btn btn-primary btn-sm"
                onClick={() => handleConfigSave("bookingRules")}
                disabled={savingConfig === "bookingRules"}
              >
                {savingConfig === "bookingRules" ? "Wird gespeichert..." : "Speichern"}
              </button>
            </section>

          </div>
        </div>
      </div>
    </>
  );
}

function ServiceEditRow({ service, onSave, isSaving }: {
  service: ServiceRow;
  onSave: (s: ServiceRow, price: string, active: boolean) => void;
  isSaving: boolean;
}) {
  const [price, setPrice] = useState(formatPrice(service.priceEur));
  const [active, setActive] = useState(service.active);

  return (
    <div className="svc-edit-row">
      <div style={{ fontSize: "13px", color: "var(--color-text)", fontWeight: 500 }}>
        {service.serviceName}
      </div>
      <input
        type="number"
        value={service.durationMinutes}
        readOnly
        style={{ width: "70px" }}
      />
      <input
        type="text"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        placeholder="0.00"
        style={{ width: "80px" }}
      />
      <label className="toggle" style={{ transform: "scale(0.85)", transformOrigin: "left center" }}>
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
        <span className="toggle-slider" />
      </label>
      <button
        className="btn btn-ghost btn-sm"
        style={{ padding: "4px 8px", opacity: isSaving ? 0.6 : 1 }}
        onClick={() => onSave(service, price, active)}
        disabled={isSaving}
      >
        {isSaving ? "..." : "Speichern"}
      </button>
    </div>
  );
}
