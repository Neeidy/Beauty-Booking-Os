"use client";

import { useEffect, useState } from "react";

interface StaffMember {
  id: string;
  name: string;
  title: string;
  active: boolean;
  serviceIds: string[];
  joinedAt?: string;
}

function getTenureLabel(joinedAt?: string): string | null {
  if (!joinedAt) return null;
  const joined = new Date(joinedAt);
  const now = new Date();
  const years = now.getFullYear() - joined.getFullYear();
  const months = now.getMonth() - joined.getMonth();
  const totalMonths = years * 12 + months;
  if (totalMonths < 1) return "Neu im Team";
  if (totalMonths < 12) return `${totalMonths} Mon. im Team`;
  const y = Math.floor(totalMonths / 12);
  return `Seit ${y} Jahr${y > 1 ? "en" : ""} dabei`;
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

  const activeCount = staff.filter((m) => m.active).length;
  const inactiveCount = staff.filter((m) => !m.active).length;

  if (isLoading) return (
    <div className="adm-body">
      <div className="loading-text">Lädt...</div>
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
    <>
      <div className="adm-toolbar">
        <div className="adm-search">
          <input type="search" placeholder="Name, Leistung..." readOnly />
        </div>
        <span className="staff-count-badge">
          {activeCount} aktiv{inactiveCount > 0 ? ` · ${inactiveCount} inaktiv` : ""}
        </span>
        <button className="btn btn-primary btn-sm" onClick={() => setShowAddForm(true)}>
          + Mitarbeiter:in hinzufügen
        </button>
      </div>

      <div className="adm-body">
        {saveMessage && (
          <div className="save-banner">{saveMessage}</div>
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

          <button className="staff-card staff-card-add" onClick={() => setShowAddForm(true)}>
            + Neue:n Mitarbeiter:in hinzufügen
          </button>
        </div>

        {showAddForm && (
          <div className="staff-form-panel">
            <h3 className="staff-form-title">Neues Teammitglied</h3>
            <div className="staff-form-grid">
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
              <div className="staff-svc-list">
                <label className="form-label">Leistungen</label>
                <div className="staff-svc-chips">
                  {services.map((svc) => (
                    <label key={svc.id} className="staff-svc-checkbox">
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

            <div className="staff-form-actions">
              <button
                type="button"
                onClick={handleAdd}
                disabled={isAdding}
                className={`btn btn-primary btn-sm${isAdding ? " btn-loading" : ""}`}
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
    </>
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

          {getTenureLabel(member.joinedAt) && (
            <div className="staff-tenure">{getTenureLabel(member.joinedAt)}</div>
          )}

          <div className="staff-services">
            {(member.serviceIds?.length > 0)
              ? member.serviceIds.map((sid) => {
                  const svc = services.find((s) => s.id === sid);
                  return svc ? <span key={sid} className="staff-svc-chip">{svc.serviceName}</span> : null;
                })
              : <span className="staff-svc-chip">Alle Leistungen</span>
            }
          </div>

          <div className="staff-card-spacer" />

          <div className="staff-card-bot">
            <label className="toggle">
              <input type="checkbox" checked={member.active} onChange={onToggleActive} />
              <span className="toggle-slider" />
            </label>
            <div className="staff-card-bot-actions">
              <button className="btn btn-ghost btn-sm" onClick={() => setIsEditing(true)}>Bearbeiten</button>
              <button className="btn btn-ghost btn-sm btn-danger" onClick={onDelete}>Löschen</button>
            </div>
          </div>
        </>
      ) : (
        <div>
          <div className="staff-form-grid">
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
            <div className="staff-svc-list">
              <label className="form-label">Leistungen</label>
              <div className="staff-svc-chips">
                {services.map((svc) => (
                  <label key={svc.id} className="staff-svc-checkbox">
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

          <div className="staff-form-actions">
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
