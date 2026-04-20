"use client";

import Link from "next/link";

interface ClientBooking {
  id: string;
  appointmentAt: string;
  appointmentTime: string;
  status: string;
  serviceName: string | null;
  durationMinutes: number;
  notes: string | null;
  createdAt: string;
}

interface ClientProfileResponse {
  identifier: string;
  customer: {
    name: string | null;
    email: string | null;
    phone: string | null;
    language: string | null;
    firstSeenAt: string;
  } | null;
  summary: {
    totalBookings: number;
    completedBookings: number;
    cancelledBookings: number;
    noshowCount: number;
    showRate: number;
  };
  bookings: ClientBooking[];
}

interface ClientProfileViewProps {
  data: ClientProfileResponse;
}

const LANGUAGE_LABELS: Record<string, string> = {
  de: "Deutsch",
  tr: "Türkisch",
  en: "Englisch",
};

const STATUS_CONFIG: Record<string, { label: string; cssClass: string }> = {
  pending:     { label: "Ausstehend",    cssClass: "pending" },
  reminded:    { label: "Erinnert",      cssClass: "pending" },
  confirmed:   { label: "Bestätigt",     cssClass: "ok" },
  completed:   { label: "Abgeschlossen", cssClass: "ok" },
  cancelled:   { label: "Abgesagt",      cssClass: "cancel" },
  no_show:     { label: "Nicht erschienen", cssClass: "cancel" },
  rescheduled: { label: "Verschoben",    cssClass: "cancel" },
};

function getInitials(name: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export default function ClientProfileView({ data }: ClientProfileViewProps) {
  const { customer, summary, bookings } = data;

  if (!customer) return null;

  const firstSeenFormatted = new Intl.DateTimeFormat("de-AT", {
    month: "short",
    year: "numeric",
  }).format(new Date(customer.firstSeenAt));

  return (
    <div className="profile-layout">
      {/* Sidebar card */}
      <aside className="profile-card">
        <div className="profile-hero">
          <div className="profile-avatar">{getInitials(customer.name)}</div>
          <div className="profile-name">{customer.name ?? "Unbekannt"}</div>
          <div className="profile-sub">Kundin seit {firstSeenFormatted}</div>
        </div>
        <div className="profile-kv">
          {customer.email && (
            <div className="profile-kv-row">
              <span className="profile-kv-label">E-Mail</span>
              <span className="profile-kv-val">{customer.email}</span>
            </div>
          )}
          {customer.phone && (
            <div className="profile-kv-row">
              <span className="profile-kv-label">Telefon</span>
              <span className="profile-kv-val">{customer.phone}</span>
            </div>
          )}
          {customer.language && (
            <div className="profile-kv-row">
              <span className="profile-kv-label">Sprache</span>
              <span className="profile-kv-val">{LANGUAGE_LABELS[customer.language] ?? customer.language}</span>
            </div>
          )}
          <div className="profile-kv-row">
            <span className="profile-kv-label">Show Rate</span>
            <span className="profile-kv-val">{Math.round(summary.showRate * 100)}%</span>
          </div>
        </div>
        <div className="profile-actions">
          {customer.phone && (
            <a href={`tel:${customer.phone}`} className="btn btn-ghost btn-sm">☎ Anrufen</a>
          )}
          {customer.email && (
            <a href={`mailto:${customer.email}`} className="btn btn-ghost btn-sm">✉ E-Mail</a>
          )}
        </div>
      </aside>

      {/* Main content */}
      <div className="profile-main">
        {/* Stats */}
        <div className="profile-stats">
          <div className="profile-stat">
            <div className="profile-stat-val">{summary.totalBookings}</div>
            <div className="profile-stat-lbl">Termine gesamt</div>
          </div>
          <div className="profile-stat">
            <div className="profile-stat-val" style={{ color: "var(--color-emerald)" }}>
              {summary.completedBookings}
            </div>
            <div className="profile-stat-lbl">Abgeschlossen</div>
          </div>
          <div className="profile-stat">
            <div className="profile-stat-val" style={{ color: "var(--color-amber)" }}>
              {summary.cancelledBookings}
            </div>
            <div className="profile-stat-lbl">Abgesagt</div>
          </div>
          <div className="profile-stat">
            <div className="profile-stat-val" style={{ color: "var(--color-rose)" }}>
              {summary.noshowCount}
            </div>
            <div className="profile-stat-lbl">No-Shows</div>
          </div>
        </div>

        {/* History */}
        <div>
          <div className="profile-tabs">
            <button className="profile-tab active">Historie ({summary.totalBookings})</button>
          </div>
          {bookings.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 0", color: "var(--color-text-muted)", fontSize: "14px" }}>
              Keine Termine vorhanden
            </div>
          ) : (
            <div className="timeline">
              {bookings.map((b) => {
                const statusCfg = STATUS_CONFIG[b.status] ?? { label: b.status, cssClass: "cancel" };
                const dateLabel = new Intl.DateTimeFormat("de-AT", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                }).format(new Date(b.appointmentAt));

                return (
                  <div key={b.id} className="timeline-item">
                    <div className="timeline-dot" />
                    <div className="timeline-content">
                      <div className="timeline-head">
                        <span className="timeline-date">{dateLabel} · {b.appointmentTime}</span>
                        <span className={`status-pill ${statusCfg.cssClass}`}>{statusCfg.label}</span>
                      </div>
                      <div className="timeline-title">{b.serviceName ?? "—"}</div>
                      {b.notes && (
                        <div className="timeline-meta">{b.notes}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
