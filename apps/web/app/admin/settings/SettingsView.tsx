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

interface EditableService extends ServiceRow {
  editName: string;
  editCategory: string;
  editDuration: string;
  editPrice: string;
  deleted: boolean;
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

export default function SettingsView({
  onDirty,
  onSave,
  onDiscard,
  triggerSave,
  triggerDiscard,
}: {
  onDirty?: (dirty: boolean) => void;
  onSave?: (fn: () => Promise<void>) => void;
  onDiscard?: (fn: () => void) => void;
  triggerSave?: number;
  triggerDiscard?: number;
}) {
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [editableServices, setEditableServices] = useState<EditableService[]>([]);
  const [config, setConfig] = useState<AdminConfig | null>(null);
  const [editedConfig, setEditedConfig] = useState<AdminConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [activeSection, setActiveSection] = useState("sec-services");

  // Closed dates add
  const [newClosedDate, setNewClosedDate] = useState("");
  const [newClosedLabel, setNewClosedLabel] = useState("");

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
      const svcs: ServiceRow[] = svcData.services ?? [];
      setServices(svcs);
      setEditableServices(svcs.map((s) => ({
        ...s,
        editName: s.serviceName,
        editCategory: s.category,
        editDuration: String(s.durationMinutes),
        editPrice: formatPrice(s.priceEur),
        deleted: false,
      })));
      setConfig(cfgData.config);
      setEditedConfig(cfgData.config);
    } catch {
      setError("Einstellungen konnten nicht geladen werden.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, []);

  async function saveAll() {
    if (!editedConfig) return;
    setIsSaving(true);
    setSaveMessage(null);
    try {
      // Save config sections in parallel
      await Promise.all([
        fetch("/api/admin/config", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ operatingHours: editedConfig.operatingHours }),
        }),
        fetch("/api/admin/config", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ closedDates: editedConfig.closedDates }),
        }),
        fetch("/api/admin/config", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookingRules: editedConfig.bookingRules }),
        }),
      ]);

      // Save each edited existing service (skip new ones without a real id)
      const servicePatches = editableServices
        .filter((s) => !s.deleted && !s.id.startsWith("new_"))
        .map((s) =>
          fetch(`/api/admin/services/${s.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              serviceName: s.editName.trim(),
              category: s.editCategory.trim(),
              durationMinutes: parseInt(s.editDuration, 10) || s.durationMinutes,
              priceEur: parsePrice(s.editPrice),
              active: s.active,
            }),
          })
        );

      // Mark removed existing services inactive (no DELETE endpoint — deactivate instead)
      const serviceDeactivates = editableServices
        .filter((s) => s.deleted && !s.id.startsWith("new_"))
        .map((s) =>
          fetch(`/api/admin/services/${s.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ active: false }),
          }).catch(() => {})
        );

      await Promise.all([...servicePatches, ...serviceDeactivates]);

      setSaveMessage("Gespeichert ✓");
      await loadAll();
    } catch {
      setSaveMessage("Speichern fehlgeschlagen.");
    } finally {
      setIsSaving(false);
    }
  }

  function discardAll() {
    setEditedConfig(config);
    setEditableServices(services.map((s) => ({
      ...s,
      editName: s.serviceName,
      editCategory: s.category,
      editDuration: String(s.durationMinutes),
      editPrice: formatPrice(s.priceEur),
      deleted: false,
    })));
    setSaveMessage(null);
  }

  // Expose save/discard to parent (page.tsx header buttons)
  useEffect(() => {
    if (onSave) onSave(saveAll);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editableServices, editedConfig]);

  useEffect(() => {
    if (onDiscard) onDiscard(discardAll);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, services]);

  useEffect(() => {
    if (triggerSave !== undefined && triggerSave > 0) saveAll();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggerSave]);

  useEffect(() => {
    if (triggerDiscard !== undefined && triggerDiscard > 0) discardAll();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggerDiscard]);

  function scrollTo(id: string) {
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  }

  function updateService(id: string, patch: Partial<EditableService>) {
    setEditableServices((prev) => prev.map((s) => s.id === id ? { ...s, ...patch } : s));
  }

  function addService() {
    const newSvc: EditableService = {
      id: `new_${Date.now()}`,
      serviceName: "",
      category: "",
      durationMinutes: 60,
      priceEur: null,
      active: true,
      description: null,
      sortOrder: editableServices.length,
      editName: "",
      editCategory: "",
      editDuration: "60",
      editPrice: "",
      deleted: false,
    };
    setEditableServices((prev) => [...prev, newSvc]);
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

  const activeServiceCount = editableServices.filter((s) => !s.deleted && s.active).length;

  return (
    <div className="adm-body">
      {saveMessage && (
        <div className="save-banner" style={{ marginBottom: "16px" }}>{saveMessage}</div>
      )}

      <div className="settings-layout">
        <nav className="settings-side">
          {["sec-services", "sec-hours", "sec-closed", "sec-rules"].map((id, i) => {
            const labels = ["Leistungen & Preise", "Öffnungszeiten", "Geschlossene Tage", "Buchungsregeln"];
            return (
              <div
                key={id}
                className={`settings-side-link${activeSection === id ? " active" : ""}`}
                onClick={() => scrollTo(id)}
              >
                {labels[i]}
              </div>
            );
          })}
        </nav>

        <div className="settings-main">

          {/* Leistungen & Preise */}
          <section id="sec-services" className="settings-section">
            <div className="settings-section-title">
              <div>
                <h4>Leistungen & Preise</h4>
                <div className="hint">{activeServiceCount} aktive Leistungen</div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={addService}>+ Leistung hinzufügen</button>
            </div>

            <div className="svc-edit-row svc-head">
              <div>Name</div>
              <div>Dauer (Min)</div>
              <div>Preis (€)</div>
              <div>Kategorie</div>
              <div></div>
            </div>

            {editableServices.filter((s) => !s.deleted).map((svc) => (
              <div key={svc.id} className="svc-edit-row">
                <input
                  value={svc.editName}
                  onChange={(e) => updateService(svc.id, { editName: e.target.value })}
                  placeholder="Leistungsname"
                />
                <input
                  type="number"
                  value={svc.editDuration}
                  onChange={(e) => updateService(svc.id, { editDuration: e.target.value })}
                  style={{ width: "70px" }}
                />
                <input
                  type="text"
                  value={svc.editPrice}
                  onChange={(e) => updateService(svc.id, { editPrice: e.target.value })}
                  placeholder="0.00"
                  style={{ width: "80px" }}
                />
                <input
                  value={svc.editCategory}
                  onChange={(e) => updateService(svc.id, { editCategory: e.target.value })}
                  placeholder="Kategorie"
                />
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ padding: "4px 8px" }}
                  onClick={() => updateService(svc.id, { deleted: true })}
                >
                  ✕
                </button>
              </div>
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
          </section>

          {/* Geschlossene Tage */}
          <section id="sec-closed" className="settings-section">
            <div className="settings-section-title">
              <div>
                <h4>Geschlossene Tage & Feiertage</h4>
                <div className="hint">Einzelne Tage oder Zeiträume, an denen keine Buchungen möglich sind</div>
              </div>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  if (!newClosedDate) return;
                  if (editedConfig.closedDates.includes(newClosedDate)) return;
                  setEditedConfig({
                    ...editedConfig,
                    closedDates: [...editedConfig.closedDates, newClosedDate].sort(),
                  });
                  setNewClosedDate("");
                  setNewClosedLabel("");
                }}
              >
                + Tag hinzufügen
              </button>
            </div>

            <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "16px" }}>
              <input
                type="date"
                className="form-input"
                style={{ width: "160px" }}
                value={newClosedDate}
                onChange={(e) => setNewClosedDate(e.target.value)}
              />
              <input
                type="text"
                className="form-input"
                style={{ flex: 1 }}
                placeholder="Bezeichnung (z.B. Staatsfeiertag)"
                value={newClosedLabel}
                onChange={(e) => setNewClosedLabel(e.target.value)}
              />
            </div>

            <div className="closed-dates">
              {editedConfig.closedDates.length === 0 && (
                <div style={{ color: "var(--color-text-muted)", fontSize: "13px" }}>Keine geschlossenen Tage eingetragen.</div>
              )}
              {editedConfig.closedDates.map((date) => (
                <div key={date} className="closed-date-row">
                  <div>
                    <strong>{new Date(date + "T00:00:00").toLocaleDateString("de-AT", { day: "2-digit", month: "long", year: "numeric" })}</strong>
                  </div>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => setEditedConfig({
                      ...editedConfig,
                      closedDates: editedConfig.closedDates.filter((d) => d !== date),
                    })}
                  >
                    Entfernen
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* Buchungsregeln */}
          <section id="sec-rules" className="settings-section">
            <div className="settings-section-title">
              <div>
                <h4>Buchungsregeln</h4>
                <div className="hint">Gültig für Online-Buchungen über die Website und Google Business</div>
              </div>
            </div>

            <div className="form-grid">
              <div className="form-row">
                <label className="form-label">Minimale Vorlaufzeit</label>
                <select
                  className="form-input"
                  value={editedConfig.bookingRules.minAdvanceBookingHours}
                  onChange={(e) => setEditedConfig({
                    ...editedConfig,
                    bookingRules: { ...editedConfig.bookingRules, minAdvanceBookingHours: parseInt(e.target.value, 10) },
                  })}
                >
                  <option value={0}>0 Stunden (sofort buchbar)</option>
                  <option value={2}>2 Stunden</option>
                  <option value={4}>4 Stunden</option>
                  <option value={12}>12 Stunden</option>
                  <option value={24}>24 Stunden</option>
                </select>
              </div>

              <div className="form-row">
                <label className="form-label">Stornierung bis</label>
                <select
                  className="form-input"
                  value={editedConfig.bookingRules.cancellationPolicyHours}
                  onChange={(e) => setEditedConfig({
                    ...editedConfig,
                    bookingRules: { ...editedConfig.bookingRules, cancellationPolicyHours: parseInt(e.target.value, 10) },
                  })}
                >
                  <option value={0}>Jederzeit</option>
                  <option value={24}>24 Stunden vor Termin</option>
                  <option value={48}>48 Stunden vor Termin</option>
                </select>
              </div>

              <div className="form-row">
                <label className="form-label">Max. Nachfassversuche</label>
                <select
                  className="form-input"
                  value={editedConfig.bookingRules.maxFollowUpAttempts}
                  onChange={(e) => setEditedConfig({
                    ...editedConfig,
                    bookingRules: { ...editedConfig.bookingRules, maxFollowUpAttempts: parseInt(e.target.value, 10) },
                  })}
                >
                  <option value={1}>1 Versuch</option>
                  <option value={2}>2 Versuche</option>
                  <option value={3}>3 Versuche</option>
                </select>
              </div>

              <div className="form-row">
                <label className="form-label">Wartezeit Rückgewinnung (Std.)</label>
                <select
                  className="form-input"
                  value={editedConfig.bookingRules.recoveryWaitHours}
                  onChange={(e) => setEditedConfig({
                    ...editedConfig,
                    bookingRules: { ...editedConfig.bookingRules, recoveryWaitHours: parseInt(e.target.value, 10) },
                  })}
                >
                  <option value={24}>24 Stunden</option>
                  <option value={48}>48 Stunden</option>
                  <option value={72}>72 Stunden</option>
                  <option value={168}>1 Woche</option>
                </select>
              </div>
            </div>

            {isSaving && (
              <p style={{ marginTop: "12px", fontSize: "13px", color: "var(--color-text-muted)" }}>
                Wird gespeichert...
              </p>
            )}
          </section>

        </div>
      </div>
    </div>
  );
}
