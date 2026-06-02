"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import type { Locale } from "@/lib/i18n/locales";

interface WaitingListEntry {
  id: string;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  requestedDate: string;
  requestedServiceId: string;
  notified: boolean;
  registeredAt: string;
  createdAt: string;
}

interface WaitingListResponse {
  entries: WaitingListEntry[];
  total: number;
  page: number;
  limit: number;
}

interface WaitingListViewProps {
  initialData: WaitingListResponse | null;
}

function formatDate(dateStr: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === "de" ? "de-AT" : "en-GB", {
    day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC",
  }).format(new Date(`${dateStr}T12:00:00Z`));
}

function formatDateTime(isoStr: string, locale: Locale): string {
  const d = new Date(isoStr);
  return new Intl.DateTimeFormat(locale === "de" ? "de-AT" : "en-GB", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", timeZone: "Europe/Vienna",
  }).format(d);
}

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

const AVATAR_VARIANTS = ["", "v2", "v3", "v4"];

export default function WaitingListView({ initialData }: WaitingListViewProps) {
  const { dict, locale } = useI18n();
  const t = dict.admin.waitingList;
  const [notifiedFilter, setNotifiedFilter] = useState<"all" | "open" | "notified">("all");

  if (!initialData) {
    return (
      <div className="empty">
        <div className="empty-ico">⚠</div>
        <h4>{t.loadErrorTitle}</h4>
        <p>{t.loadErrorText}</p>
      </div>
    );
  }

  const { entries, total } = initialData;
  const openCount = entries.filter((e) => !e.notified).length;
  const notifiedCount = entries.filter((e) => e.notified).length;

  const filtered = entries.filter((entry) => {
    if (notifiedFilter === "open" && entry.notified) return false;
    if (notifiedFilter === "notified" && !entry.notified) return false;
    return true;
  });

  return (
    <>
      <div className="adm-toolbar">
        <div className="adm-search">
          <input type="search" placeholder={t.searchPlaceholder} readOnly />
        </div>
        <button
          className={`adm-filter-chip${notifiedFilter === "all" ? " active" : ""}`}
          onClick={() => setNotifiedFilter("all")}
        >
          {t.filterAll.replace("{count}", String(total))}
        </button>
        <button
          className={`adm-filter-chip${notifiedFilter === "open" ? " active" : ""}`}
          onClick={() => setNotifiedFilter("open")}
        >
          {t.filterWaiting.replace("{count}", String(openCount))}
        </button>
        <button
          className={`adm-filter-chip${notifiedFilter === "notified" ? " active" : ""}`}
          onClick={() => setNotifiedFilter("notified")}
        >
          {t.filterNotified.replace("{count}", String(notifiedCount))}
        </button>
        <button className="adm-filter-chip">{t.filterBooked}</button>
        <button className="adm-filter-chip">{t.filterExpired.replace("{count}", "0")}</button>
      </div>

      <div className="adm-body">
        {filtered.length === 0 ? (
          <div className="empty">
            <div className="empty-ico">✓</div>
            <h4>{t.emptyTitle}</h4>
            <p>{t.emptyText}</p>
          </div>
        ) : (
          <table className="clients-table wl-table">
            <thead>
              <tr>
                <th>{t.colCustomer}</th>
                <th>{t.colService}</th>
                <th>{t.colDate}</th>
                <th>{t.colRegistered}</th>
                <th>{t.colStatus}</th>
                <th>{t.colAction}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((entry, i) => {
                const avatarVariant = AVATAR_VARIANTS[i % AVATAR_VARIANTS.length] ?? "";
                const avatarClass = `client-avatar${avatarVariant ? " " + avatarVariant : ""}`;
                return (
                  <tr key={entry.id}>
                    <td>
                      <div className="client-name-cell">
                        <div className={avatarClass}>{getInitials(entry.customerName)}</div>
                        <div className="client-name-wrap">
                          <span className="client-name">{entry.customerName ?? "—"}</span>
                          <span className="client-email">
                            {entry.customerEmail ?? entry.customerPhone ?? "—"}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <strong>{entry.requestedServiceId.slice(0, 8)}…</strong>
                    </td>
                    <td>{formatDate(entry.requestedDate, locale)}</td>
                    <td style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>
                      {formatDateTime(entry.registeredAt, locale)}
                    </td>
                    <td>
                      <span className={`wl-status ${entry.notified ? "notified" : "pending"}`}>
                        {entry.notified ? t.statusNotified : t.statusWaiting}
                      </span>
                    </td>
                    <td>
                      <button className="btn btn-ghost btn-sm">
                        {entry.notified ? t.actionResend : t.actionOffer}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
