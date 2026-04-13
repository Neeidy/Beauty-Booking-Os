"use client";

import { useEffect, useState } from "react";

interface StaffMember {
  id: string;
  name: string;
  title: string;
  active: boolean;
  serviceIds: string[];
}

interface ServiceOption {
  id: string;
  serviceName: string;
  active: boolean;
}

export default function StaffManagementView() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newServiceIds, setNewServiceIds] = useState<string[]>([]);
  const [isAdding, setIsAdding] = useState(false);

  async function loadAll() {
    setIsLoading(true);
    setError(null);
    try {
      const [staffRes, svcRes] = await Promise.all([
        fetch("/api/admin/staff"),
        fetch("/api/admin/services"),
      ]);
      if (!staffRes.ok) throw new Error("Staff load failed");
      const staffData = await staffRes.json();
      setStaff(staffData.staff ?? []);

      if (svcRes.ok) {
        const svcData = await svcRes.json();
        setServices((svcData.services ?? []).filter((s: ServiceOption) => s.active));
      }
    } catch {
      setError("Team konnte nicht geladen werden.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, []);

  async function handleToggleActive(member: StaffMember) {
    setSaveMessage(null);
    try {
      const res = await fetch("/api/admin/staff", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: member.id, active: !member.active }),
      });
      if (!res.ok) throw new Error();
      setSaveMessage(member.active ? `${member.name} deaktiviert.` : `${member.name} aktiviert.`);
      await loadAll();
    } catch {
      setSaveMessage("Fehler beim Speichern.");
    }
  }

  async function handleUpdateServices(member: StaffMember, serviceIds: string[]) {
    setSaveMessage(null);
    try {
      const res = await fetch("/api/admin/staff", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: member.id, serviceIds }),
      });
      if (!res.ok) throw new Error();
      setSaveMessage(`${member.name} aktualisiert.`);
      await loadAll();
    } catch {
      setSaveMessage("Fehler beim Speichern.");
    }
  }

  async function handleUpdateName(member: StaffMember, name: string, title: string) {
    setSaveMessage(null);
    try {
      const res = await fetch("/api/admin/staff", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: member.id, name, title }),
      });
      if (!res.ok) throw new Error();
      setSaveMessage("Gespeichert ✓");
      await loadAll();
    } catch {
      setSaveMessage("Fehler beim Speichern.");
    }
  }

  async function handleDelete(member: StaffMember) {
    if (!confirm(`${member.name} wirklich löschen?`)) return;
    setSaveMessage(null);
    try {
      const res = await fetch(`/api/admin/staff?id=${member.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      setSaveMessage(`${member.name} gelöscht.`);
      await loadAll();
    } catch {
      setSaveMessage("Fehler beim Löschen.");
    }
  }

  async function handleAdd() {
    if (!newName.trim() || !newTitle.trim()) {
      setSaveMessage("Name und Titel sind erforderlich.");
      return;
    }
    setIsAdding(true);
    setSaveMessage(null);
    try {
      const res = await fetch("/api/admin/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          title: newTitle.trim(),
          active: true,
          serviceIds: newServiceIds,
        }),
      });
      if (!res.ok) throw new Error();
      setSaveMessage("Teammitglied hinzugefügt ✓");
      setNewName("");
      setNewTitle("");
      setNewServiceIds([]);
      setShowAddForm(false);
      await loadAll();
    } catch {
      setSaveMessage("Fehler beim Hinzufügen.");
    } finally {
      setIsAdding(false);
    }
  }

  if (isLoading) return (
    <p style={{ color: "var(--color-text-muted)", fontSize: "14px" }}>Lädt...</p>
  );

  if (error) return (
    <p style={{ color: "var(--color-text-muted)", fontSize: "14px" }}>⚠ {error}</p>
  );

  return (
    <div>
      {saveMessage && (
        <div style={{
          marginBottom: "1rem", padding: "8px 12px",
          border: "1px solid var(--color-primary)", borderRadius: "6px",
          fontSize: "13px", color: "var(--color-primary)",
        }}>
          {saveMessage}
        </div>
      )}

      {/* Staff kartları */}
      <div style={{ display: "grid", gap: "1rem", marginBottom: "2rem" }}>
        {staff.length === 0 && (
          <p style={{ color: "var(--color-text-muted)", fontSize: "14px" }}>
            Keine Teammitglieder konfiguriert.
          </p>
        )}
        {staff.map(member => (
          <StaffCard
            key={member.id}
            member={member}
            services={services}
            onToggleActive={() => handleToggleActive(member)}
            onUpdateServices={(ids) => handleUpdateServices(member, ids)}
            onUpdateName={(name, title) => handleUpdateName(member, name, title)}
            onDelete={() => handleDelete(member)}
          />
        ))}
      </div>

      {/* Yeni staff ekle */}
      {!showAddForm ? (
        <button
          type="button"
          onClick={() => setShowAddForm(true)}
          style={secondaryButtonStyle}
        >
          + Teammitglied hinzufügen
        </button>
      ) : (
        <div style={{
          border: "1px solid var(--color-accent)", borderRadius: "8px",
          padding: "1.25rem", background: "var(--color-background)",
        }}>
          <h3 style={{ color: "var(--color-text)", fontSize: "14px",
            fontWeight: 600, marginBottom: "1rem" }}>
            Neues Teammitglied
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
            <div>
              <label style={labelStyle}>Name *</label>
              <input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                style={{ ...inputStyle, width: "100%" }}
                placeholder="z.B. Maria"
              />
            </div>
            <div>
              <label style={labelStyle}>Titel *</label>
              <input
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                style={{ ...inputStyle, width: "100%" }}
                placeholder="z.B. Nageldesignerin"
              />
            </div>
          </div>

          {services.length > 0 && (
            <div style={{ marginBottom: "0.75rem" }}>
              <label style={labelStyle}>Leistungen</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                {services.map(svc => (
                  <label key={svc.id} style={{
                    display: "flex", alignItems: "center", gap: "4px",
                    fontSize: "13px", color: "var(--color-text)", cursor: "pointer",
                  }}>
                    <input
                      type="checkbox"
                      checked={newServiceIds.includes(svc.id)}
                      onChange={e => {
                        setNewServiceIds(prev =>
                          e.target.checked
                            ? [...prev, svc.id]
                            : prev.filter(id => id !== svc.id)
                        );
                      }}
                    />
                    {svc.serviceName}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              type="button"
              onClick={handleAdd}
              disabled={isAdding}
              style={{
                background: "var(--color-primary)",
                color: "var(--color-background)",
                border: "none", padding: "8px 16px",
                borderRadius: "6px", fontSize: "13px",
                cursor: isAdding ? "not-allowed" : "pointer",
                opacity: isAdding ? 0.6 : 1,
              }}
            >
              {isAdding ? "Wird hinzugefügt..." : "Hinzufügen"}
            </button>
            <button
              type="button"
              onClick={() => { setShowAddForm(false); setNewName(""); setNewTitle(""); setNewServiceIds([]); }}
              style={secondaryButtonStyle}
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── StaffCard Sub-Component ────────────────────────────────────────────────

function StaffCard({
  member, services, onToggleActive, onUpdateServices, onUpdateName, onDelete,
}: {
  member: { id: string; name: string; title: string; active: boolean; serviceIds: string[] };
  services: { id: string; serviceName: string }[];
  onToggleActive: () => void;
  onUpdateServices: (ids: string[]) => void;
  onUpdateName: (name: string, title: string) => void;
  onDelete: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(member.name);
  const [editTitle, setEditTitle] = useState(member.title);
  const [editServiceIds, setEditServiceIds] = useState<string[]>(member.serviceIds ?? []);

  return (
    <div style={{
      border: "1px solid var(--color-accent)", borderRadius: "8px",
      padding: "1rem", background: "var(--color-background)",
      opacity: member.active ? 1 : 0.6,
    }}>
      {!isEditing ? (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            {/* Avatar */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
              <div style={{
                width: "40px", height: "40px", borderRadius: "50%",
                background: "var(--color-secondary)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "1rem", fontWeight: 700, color: "var(--color-background)",
                flexShrink: 0,
              }}>
                {member.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: 600, color: "var(--color-text)", fontSize: "14px" }}>
                  {member.name}
                </div>
                <div style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>
                  {member.title}
                </div>
              </div>
            </div>

            {/* Bağlı hizmetler */}
            {services.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "0.5rem" }}>
                {member.serviceIds?.length > 0 ? (
                  member.serviceIds.map(sid => {
                    const svc = services.find(s => s.id === sid);
                    return svc ? (
                      <span key={sid} style={{
                        fontSize: "11px", padding: "2px 8px", borderRadius: "999px",
                        border: "1px solid var(--color-accent)", color: "var(--color-text-muted)",
                      }}>
                        {svc.serviceName}
                      </span>
                    ) : null;
                  })
                ) : (
                  <span style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>
                    Alle Leistungen
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Aksiyonlar */}
          <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
            <span style={{
              fontSize: "11px", padding: "2px 8px", borderRadius: "999px",
              border: member.active
                ? "1px solid var(--color-primary)"
                : "1px solid var(--color-text-muted)",
              color: member.active ? "var(--color-primary)" : "var(--color-text-muted)",
            }}>
              {member.active ? "Aktiv" : "Inaktiv"}
            </span>
            <button type="button" onClick={() => setIsEditing(true)} style={secondaryButtonStyle}>
              Bearbeiten
            </button>
            <button type="button" onClick={onToggleActive} style={secondaryButtonStyle}>
              {member.active ? "Deaktivieren" : "Aktivieren"}
            </button>
            <button
              type="button"
              onClick={onDelete}
              style={{
                ...secondaryButtonStyle,
                borderColor: "var(--color-text-muted)",
                color: "var(--color-text-muted)",
              }}
            >
              Löschen
            </button>
          </div>
        </div>
      ) : (
        // Edit mode
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
            <div>
              <label style={labelStyle}>Name</label>
              <input
                value={editName}
                onChange={e => setEditName(e.target.value)}
                style={{ ...inputStyle, width: "100%" }}
              />
            </div>
            <div>
              <label style={labelStyle}>Titel</label>
              <input
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                style={{ ...inputStyle, width: "100%" }}
              />
            </div>
          </div>

          {services.length > 0 && (
            <div style={{ marginBottom: "0.75rem" }}>
              <label style={labelStyle}>Leistungen</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                {services.map(svc => (
                  <label key={svc.id} style={{
                    display: "flex", alignItems: "center", gap: "4px",
                    fontSize: "13px", color: "var(--color-text)", cursor: "pointer",
                  }}>
                    <input
                      type="checkbox"
                      checked={editServiceIds.includes(svc.id)}
                      onChange={e => {
                        setEditServiceIds(prev =>
                          e.target.checked
                            ? [...prev, svc.id]
                            : prev.filter(id => id !== svc.id)
                        );
                      }}
                    />
                    {svc.serviceName}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              type="button"
              onClick={() => {
                onUpdateName(editName, editTitle);
                onUpdateServices(editServiceIds);
                setIsEditing(false);
              }}
              style={{
                background: "var(--color-primary)", color: "var(--color-background)",
                border: "none", padding: "8px 16px", borderRadius: "6px",
                fontSize: "13px", cursor: "pointer",
              }}
            >
              Speichern
            </button>
            <button
              type="button"
              onClick={() => {
                setEditName(member.name);
                setEditTitle(member.title);
                setEditServiceIds(member.serviceIds ?? []);
                setIsEditing(false);
              }}
              style={secondaryButtonStyle}
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}
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

const labelStyle: React.CSSProperties = {
  fontSize: "12px",
  color: "var(--color-text-muted)",
  display: "block",
  marginBottom: "4px",
};

const secondaryButtonStyle: React.CSSProperties = {
  background: "var(--color-background)",
  color: "var(--color-text)",
  border: "1px solid var(--color-accent)",
  padding: "6px 12px",
  borderRadius: "6px",
  fontSize: "12px",
  cursor: "pointer",
  minHeight: "32px",
};
