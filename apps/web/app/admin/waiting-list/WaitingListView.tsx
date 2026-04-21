"use client";

import { useState } from "react";

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

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat("de-AT", {
    day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC",
  }).format(new Date(`${dateStr}T12:00:00Z`));
}

function formatDateTime(isoStr: string): string {
  const d = new Date(isoStr);
  return new Intl.DateTimeFormat("de-AT", {
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
  const [notifiedFilter, setNotifiedFilter] = useState<"all" | "open" | "notified">("all");

  if (!initialData) {
    return (
      <div className="empty">
        <div className="empty-ico">⚠</div>
        <h4>Fehler beim Laden</h4>
        <p>Bitte Seite neu laden.</p>
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
          <input type="search" placeholder="Kunde, Leistung, Datum..." readOnly />
        </div>
        <button
          className={`adm-filter-chip${notifiedFilter === "all" ? " active" : ""}`}
          onClick={() => setNotifiedFilter("all")}
        >
          Alle ({total})
        </button>
        <button
          className={`adm-filter-chip${notifiedFilter === "open" ? " active" : ""}`}
          onClick={() => setNotifiedFilter("open")}
        >
          ⏳ Wartend ({openCount})
        </button>
        <button
          className={`adm-filter-chip${notifiedFilter === "notified" ? " active" : ""}`}
          onClick={() => setNotifiedFilter("notified")}
        >
          📣 Benachrichtigt ({notifiedCount})
        </button>
      </div>

      <div className="adm-body">
        {filtered.length === 0 ? (
          <div className="empty">
            <div className="empty-ico">✓</div>
            <h4>Keine Einträge</h4>
            <p>Keine Wartelisteneinträge für diesen Filter.</p>
          </div>
        ) : (
          <table className="clients-table wl-table">
            <thead>
              <tr>
                <th>Kunde</th>
                <th>Gewünschte Leistung</th>
                <th>Wunschdatum</th>
                <th>Registriert</th>
                <th>Status</th>
                <th>Aktion</th>
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
                    <td>{formatDate(entry.requestedDate)}</td>
                    <td style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>
                      {formatDateTime(entry.registeredAt)}
                    </td>
                    <td>
                      <span className={`wl-status ${entry.notified ? "notified" : "pending"}`}>
                        {entry.notified ? "📣 Benachrichtigt" : "⏳ Wartend"}
                      </span>
                    </td>
                    <td>
                      <button className="btn btn-ghost btn-sm">
                        {entry.notified ? "Nochmal senden" : "Slot anbieten"}
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
