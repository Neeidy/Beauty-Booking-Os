"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import type { Dictionary } from "@/lib/i18n/dictionary";

interface StaffMember {
  id: string;
  name: string;
  title: string;
  active: boolean;
  serviceIds: string[];
  joinedAt?: string;
}

function getTenureLabel(joinedAt: string | undefined, tenure: Dictionary["admin"]["staff"]["tenure"]): string | null {
  if (!joinedAt) return null;
  const joined = new Date(joinedAt);
  const now = new Date();
  const years = now.getFullYear() - joined.getFullYear();
  const months = now.getMonth() - joined.getMonth();
  const totalMonths = years * 12 + months;
  if (totalMonths < 1) return tenure.new;
  if (totalMonths < 12) return tenure.months.replace("{count}", String(totalMonths));
  const y = Math.floor(totalMonths / 12);
  return y > 1 ? tenure.yearsMany.replace("{count}", String(y)) : tenure.yearsOne;
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
  const { dict } = useI18n();
  const t = dict.admin.staff;
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
      setError(t.messages.loadError);
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
      setSaveMessage((member.active ? t.messages.deactivated : t.messages.activated).replace("{name}", member.name));
      await loadAll();
    } catch {
      setSaveMessage(t.messages.saveError);
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
      setSaveMessage(t.messages.updated.replace("{name}", member.name));
      await loadAll();
    } catch {
      setSaveMessage(t.messages.saveError);
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
      setSaveMessage(t.messages.saved);
      await loadAll();
    } catch {
      setSaveMessage(t.messages.saveError);
    }
  }

  async function handleDelete(member: StaffMember) {
    if (!confirm(t.messages.confirmDelete.replace("{name}", member.name))) return;
    setSaveMessage(null);
    try {
      const res = await fetch(`/api/admin/staff?id=${member.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setSaveMessage(t.messages.deleted.replace("{name}", member.name));
      await loadAll();
    } catch {
      setSaveMessage(t.messages.deleteError);
    }
  }

  async function handleAdd() {
    if (!newName.trim() || !newTitle.trim()) {
      setSaveMessage(t.messages.nameRequired);
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
      setSaveMessage(t.messages.added);
      setNewName("");
      setNewTitle("");
      setNewServiceIds([]);
      setShowAddForm(false);
      await loadAll();
    } catch {
      setSaveMessage(t.messages.addError);
    } finally {
      setIsAdding(false);
    }
  }

  const activeCount = staff.filter((m) => m.active).length;
  const inactiveCount = staff.filter((m) => !m.active).length;

  if (isLoading) return (
    <div className="adm-body">
      <div className="loading-text">{t.loading}</div>
    </div>
  );

  if (error) return (
    <div className="adm-body">
      <div className="empty">
        <div className="empty-ico">⚠</div>
        <h4>{t.errorTitle}</h4>
        <p>{error}</p>
      </div>
    </div>
  );

  return (
    <>
      <div className="adm-toolbar">
        <div className="adm-search">
          <input type="search" placeholder={t.toolbar.searchPlaceholder} readOnly />
        </div>
        <span className="staff-count-badge">
          {inactiveCount > 0
            ? t.toolbar.countActiveInactive.replace("{active}", String(activeCount)).replace("{inactive}", String(inactiveCount))
            : t.toolbar.countActive.replace("{active}", String(activeCount))}
        </span>
        <button className="btn btn-primary btn-sm" onClick={() => setShowAddForm(true)}>
          {t.toolbar.add}
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
            {t.addForm.addCardCta}
          </button>
        </div>

        {showAddForm && (
          <div className="staff-form-panel">
            <h3 className="staff-form-title">{t.addForm.title}</h3>
            <div className="staff-form-grid">
              <div>
                <label className="form-label">{t.addForm.name}</label>
                <input
                  className="form-input"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder={t.addForm.namePlaceholder}
                />
              </div>
              <div>
                <label className="form-label">{t.addForm.titleLabel}</label>
                <input
                  className="form-input"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder={t.addForm.titlePlaceholder}
                />
              </div>
            </div>

            {services.length > 0 && (
              <div className="staff-svc-list">
                <label className="form-label">{t.addForm.services}</label>
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
                {isAdding ? t.addForm.adding : t.addForm.submit}
              </button>
              <button
                type="button"
                onClick={() => { setShowAddForm(false); setNewName(""); setNewTitle(""); setNewServiceIds([]); }}
                className="btn btn-ghost btn-sm"
              >
                {t.addForm.cancel}
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
  const { dict } = useI18n();
  const t = dict.admin.staff;
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

          {getTenureLabel(member.joinedAt, t.tenure) && (
            <div className="staff-tenure">{getTenureLabel(member.joinedAt, t.tenure)}</div>
          )}

          <div className="staff-services">
            {(member.serviceIds?.length > 0)
              ? member.serviceIds.map((sid) => {
                  const svc = services.find((s) => s.id === sid);
                  return svc ? <span key={sid} className="staff-svc-chip">{svc.serviceName}</span> : null;
                })
              : <span className="staff-svc-chip">{t.card.allServices}</span>
            }
          </div>

          <div className="staff-card-spacer" />

          <div className="staff-card-bot">
            <label className="toggle">
              <input type="checkbox" checked={member.active} onChange={onToggleActive} />
              <span className="toggle-slider" />
            </label>
            <div className="staff-card-bot-actions">
              <button className="btn btn-ghost btn-sm" onClick={() => setIsEditing(true)}>{t.card.edit}</button>
              <button className="btn btn-ghost btn-sm btn-danger" onClick={onDelete}>{t.card.delete}</button>
            </div>
          </div>
        </>
      ) : (
        <div>
          <div className="staff-form-grid">
            <div>
              <label className="form-label">{t.card.name}</label>
              <input className="form-input" value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div>
              <label className="form-label">{t.card.titleLabel}</label>
              <input className="form-input" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
            </div>
          </div>

          {services.length > 0 && (
            <div className="staff-svc-list">
              <label className="form-label">{t.card.services}</label>
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
              {t.card.save}
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
              {t.card.cancel}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
