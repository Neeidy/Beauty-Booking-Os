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

const AVATAR_GRADIENTS = [
  undefined,
  "linear-gradient(135deg,var(--color-rose),var(--color-amber))",
  "linear-gradient(135deg,var(--color-emerald),var(--color-cyan))",
  "linear-gradient(135deg,var(--color-purple),var(--color-rose))",
];

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
      const res = await fetch(`/api/admin/staff?id=${member.id}`, { method: "DELETE" });
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
    <div className="adm-body">
      <div style={{ color: "var(--color-text-muted)", fontSize: "14px" }}>Lädt...</div>
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

  return (
    <div className="adm-body">
      {saveMessage && (
        <div style={{
          marginBottom: "16px", padding: "8px 12px",
          border: "1px solid var(--color-accent)", borderRadius: "var(--radius-md)",
          fontSize: "13px", color: "var(--color-text)",
          background: "var(--color-bg-card)",
        }}>
          {saveMessage}
        </div>
      )}

      <div className="staff-grid">
        {staff.map((member, i) => (
          <StaffCard
            key={member.id}
            member={member}
            services={services}
            avatarGradient={AVATAR_GRADIENTS[i % AVATAR_GRADIENTS.length]}
            onToggleActive={() => handleToggleActive(member)}
            onUpdateServices={(ids) => handleUpdateServices(member, ids)}
            onUpdateName={(name, title) => handleUpdateName(member, name, title)}
            onDelete={() => handleDelete(member)}
          />
        ))}

        {/* Add new card */}
        <button
          className="staff-card"
          onClick={() => setShowAddForm(true)}
          style={{
            background: "transparent",
            border: "1.5px dashed var(--color-border)",
            cursor: "pointer",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "260px",
            color: "var(--color-text-muted)",
            fontSize: "14px",
            fontWeight: 500,
          }}
        >
          + Neue:n Mitarbeiter:in hinzufügen
        </button>
      </div>

      {/* Add form modal-style */}
      {showAddForm && (
        <div style={{
          marginTop: "24px",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-lg)",
          padding: "20px",
          background: "var(--color-bg-card)",
        }}>
          <h3 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "16px", color: "var(--color-text)" }}>
            Neues Teammitglied
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
            <div>
              <label className="form-label">Name *</label>
              <input
                className="form-input"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="z.B. Maria"
              />
            </div>
            <div>
              <label className="form-label">Titel *</label>
              <input
                className="form-input"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="z.B. Nageldesignerin"
              />
            </div>
          </div>

          {services.length > 0 && (
            <div style={{ marginBottom: "12px" }}>
              <label className="form-label">Leistungen</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {services.map((svc) => (
                  <label key={svc.id} style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "13px", color: "var(--color-text)", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={newServiceIds.includes(svc.id)}
                      onChange={(e) => {
                        setNewServiceIds((prev) =>
                          e.target.checked ? [...prev, svc.id] : prev.filter((id) => id !== svc.id)
                        );
                      }}
                    />
                    {svc.serviceName}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: "8px" }}>
            <button
              type="button"
              onClick={handleAdd}
              disabled={isAdding}
              className="btn btn-primary btn-sm"
              style={{ opacity: isAdding ? 0.6 : 1 }}
            >
              {isAdding ? "Wird hinzugefügt..." : "Hinzufügen"}
            </button>
            <button
              type="button"
              onClick={() => { setShowAddForm(false); setNewName(""); setNewTitle(""); setNewServiceIds([]); }}
              className="btn btn-ghost btn-sm"
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StaffCard({
  member, services, avatarGradient, onToggleActive, onUpdateServices, onUpdateName, onDelete,
}: {
  member: StaffMember;
  services: ServiceOption[];
  avatarGradient: string | undefined;
  onToggleActive: () => void;
  onUpdateServices: (ids: string[]) => void;
  onUpdateName: (name: string, title: string) => void;
  onDelete: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(member.name);
  const [editTitle, setEditTitle] = useState(member.title);
  const [editServiceIds, setEditServiceIds] = useState<string[]>(member.serviceIds ?? []);

  const initials = member.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className={`staff-card${member.active ? "" : " inactive"}`}>
      {!isEditing ? (
        <>
          <div className="staff-card-top">
            <div className="staff-avatar" style={avatarGradient ? { background: avatarGradient } : undefined}>
              {initials}
            </div>
            <div>
              <div className="staff-name">{member.name}</div>
              <div className="staff-title">{member.title}</div>
            </div>
          </div>

          <div className="staff-services">
            {(member.serviceIds?.length > 0)
              ? member.serviceIds.map((sid) => {
                  const svc = services.find((s) => s.id === sid);
                  return svc ? <span key={sid} className="staff-svc-chip">{svc.serviceName}</span> : null;
                })
              : <span className="staff-svc-chip">Alle Leistungen</span>
            }
          </div>

          <div className="staff-card-bot">
            <label className="toggle">
              <input type="checkbox" checked={member.active} onChange={onToggleActive} />
              <span className="toggle-slider" />
            </label>
            <div style={{ display: "flex", gap: "6px" }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setIsEditing(true)}>Bearbeiten</button>
              <button className="btn btn-ghost btn-sm" onClick={onDelete} style={{ color: "var(--color-rose)" }}>Löschen</button>
            </div>
          </div>
        </>
      ) : (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
            <div>
              <label className="form-label">Name</label>
              <input className="form-input" value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div>
              <label className="form-label">Titel</label>
              <input className="form-input" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
            </div>
          </div>

          {services.length > 0 && (
            <div style={{ marginBottom: "12px" }}>
              <label className="form-label">Leistungen</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {services.map((svc) => (
                  <label key={svc.id} style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "13px", color: "var(--color-text)", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={editServiceIds.includes(svc.id)}
                      onChange={(e) => {
                        setEditServiceIds((prev) =>
                          e.target.checked ? [...prev, svc.id] : prev.filter((id) => id !== svc.id)
                        );
                      }}
                    />
                    {svc.serviceName}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: "8px" }}>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => {
                onUpdateName(editName, editTitle);
                onUpdateServices(editServiceIds);
                setIsEditing(false);
              }}
            >
              Speichern
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setEditName(member.name);
                setEditTitle(member.title);
                setEditServiceIds(member.serviceIds ?? []);
                setIsEditing(false);
              }}
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
