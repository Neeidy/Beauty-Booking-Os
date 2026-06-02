"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n/I18nProvider";

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

// cssClass per status (presentation only); the display label comes from dict.admin.statusLabels.
const STATUS_CSS: Record<string, string> = {
  pending:     "pending",
  reminded:    "pending",
  confirmed:   "ok",
  completed:   "ok",
  cancelled:   "cancel",
  no_show:     "cancel",
  rescheduled: "cancel",
};

function getInitials(name: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export default function ClientProfileView({ data }: ClientProfileViewProps) {
  const { dict, locale } = useI18n();
  const t = dict.admin.clientProfile;
  const statusLabels = dict.admin.statusLabels as Record<string, string>;
  const languageLabels: Record<string, string> = {
    de: t.languageDe,
    tr: t.languageTr,
    en: t.languageEn,
  };
  const dateLocale = locale === "de" ? "de-AT" : "en-GB";
  const { customer, summary, bookings } = data;

  if (!customer) return null;

  const firstSeenFormatted = new Intl.DateTimeFormat(dateLocale, {
    month: "short",
    year: "numeric",
  }).format(new Date(customer.firstSeenAt));

  return (
    <div className="profile-layout">
      {/* Sidebar card */}
      <aside className="profile-card">
        <div className="profile-hero">
          <div className="profile-avatar">{getInitials(customer.name)}</div>
          <div className="profile-name">{customer.name ?? t.unknown}</div>
          <div className="profile-sub">{t.customerSince.replace("{date}", firstSeenFormatted)}</div>
        </div>
        <div className="profile-kv">
          {customer.email && (
            <div className="profile-kv-row">
              <span className="profile-kv-label">{t.kvEmail}</span>
              <span className="profile-kv-val">{customer.email}</span>
            </div>
          )}
          {customer.phone && (
            <div className="profile-kv-row">
              <span className="profile-kv-label">{t.kvPhone}</span>
              <span className="profile-kv-val">{customer.phone}</span>
            </div>
          )}
          {customer.language && (
            <div className="profile-kv-row">
              <span className="profile-kv-label">{t.kvLanguage}</span>
              <span className="profile-kv-val">{languageLabels[customer.language] ?? customer.language}</span>
            </div>
          )}
          <div className="profile-kv-row">
            <span className="profile-kv-label">{t.kvShowRate}</span>
            <span className="profile-kv-val">{Math.round(summary.showRate * 100)}%</span>
          </div>
        </div>
        <div className="profile-actions">
          {customer.phone && (
            <a href={`tel:${customer.phone}`} className="btn btn-ghost btn-sm">{t.actionCall}</a>
          )}
          {customer.email && (
            <a href={`mailto:${customer.email}`} className="btn btn-ghost btn-sm">{t.actionEmail}</a>
          )}
        </div>
      </aside>

      {/* Main content */}
      <div className="profile-main">
        {/* Stats */}
        <div className="profile-stats">
          <div className="profile-stat">
            <div className="profile-stat-val">{summary.totalBookings}</div>
            <div className="profile-stat-lbl">{t.statTotal}</div>
          </div>
          <div className="profile-stat">
            <div className="profile-stat-val profile-stat-val-emerald">
              {summary.completedBookings}
            </div>
            <div className="profile-stat-lbl">{t.statCompleted}</div>
          </div>
          <div className="profile-stat">
            <div className="profile-stat-val profile-stat-val-amber">
              {summary.cancelledBookings}
            </div>
            <div className="profile-stat-lbl">{t.statCancelled}</div>
          </div>
          <div className="profile-stat">
            <div className="profile-stat-val profile-stat-val-rose">
              {summary.noshowCount}
            </div>
            <div className="profile-stat-lbl">{t.statNoShows}</div>
          </div>
        </div>

        {/* History */}
        <div>
          <div className="profile-tabs">
            <button className="profile-tab active">{t.historyTab.replace("{count}", String(summary.totalBookings))}</button>
          </div>
          {bookings.length === 0 ? (
            <div className="profile-empty">
              {t.emptyHistory}
            </div>
          ) : (
            <div className="timeline">
              {bookings.map((b) => {
                const cssClass = STATUS_CSS[b.status] ?? "cancel";
                const statusLabel = statusLabels[b.status] ?? b.status;
                const dateLabel = new Intl.DateTimeFormat(dateLocale, {
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
                        <span className={`status-pill ${cssClass}`}>{statusLabel}</span>
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
