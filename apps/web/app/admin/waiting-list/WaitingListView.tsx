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
  // dateStr is YYYY-MM-DD — parse as noon UTC to avoid date shift
  return new Intl.DateTimeFormat("de-AT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${dateStr}T12:00:00Z`));
}

function formatDateTime(isoStr: string): string {
  const d = new Date(isoStr);
  const datePart = new Intl.DateTimeFormat("de-AT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Europe/Vienna",
  }).format(d);
  const timePart = new Intl.DateTimeFormat("de-AT", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Vienna",
  }).format(d);
  return `${datePart} ${timePart}`;
}

export default function WaitingListView({ initialData }: WaitingListViewProps) {
  const [dateFilter, setDateFilter] = useState("");
  const [notifiedFilter, setNotifiedFilter] = useState<"all" | "open" | "notified">("all");

  if (!initialData) {
    return (
      <div
        className="rounded-sm border p-6 text-sm text-center"
        style={{ borderColor: "var(--color-accent)", color: "#dc2626" }}
      >
        Daten konnten nicht geladen werden
      </div>
    );
  }

  const { entries, total } = initialData;
  const notifiedCount = entries.filter((e) => e.notified).length;

  // Client-side filtering of the loaded entries
  const filtered = entries.filter((entry) => {
    if (dateFilter && entry.requestedDate !== dateFilter) return false;
    if (notifiedFilter === "open" && entry.notified) return false;
    if (notifiedFilter === "notified" && !entry.notified) return false;
    return true;
  });

  return (
    <div>
      {/* Summary bar */}
      <div
        className="mb-4 text-sm"
        style={{ color: "var(--color-text-muted)" }}
      >
        {total} Einträge | {notifiedCount} benachrichtigt
      </div>

      {/* Filter row */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="rounded-sm border px-3 py-1.5 text-sm outline-none"
          style={{
            borderColor: "var(--color-accent)",
            backgroundColor: "#fff",
            color: "var(--color-primary)",
          }}
        />
        <div className="flex rounded-sm border overflow-hidden text-sm" style={{ borderColor: "var(--color-accent)" }}>
          {(["all", "open", "notified"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setNotifiedFilter(f)}
              className="px-3 py-1.5 transition-colors"
              style={{
                backgroundColor: notifiedFilter === f ? "var(--color-primary)" : "#fff",
                color: notifiedFilter === f ? "var(--color-background)" : "var(--color-primary)",
              }}
            >
              {f === "all" ? "Alle" : f === "open" ? "Offen" : "Benachrichtigt"}
            </button>
          ))}
        </div>
        {dateFilter && (
          <button
            type="button"
            onClick={() => setDateFilter("")}
            className="text-xs underline"
            style={{ color: "var(--color-text-muted)" }}
          >
            Filter zurücksetzen
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div
          className="rounded-sm border p-8 text-sm text-center"
          style={{ borderColor: "var(--color-accent)", color: "var(--color-text-muted)" }}
        >
          Keine Wartelisteneinträge vorhanden
        </div>
      ) : (
        <div className="overflow-x-auto rounded-sm border" style={{ borderColor: "var(--color-accent)" }}>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr style={{ backgroundColor: "var(--color-primary)", color: "var(--color-background)" }}>
                {["Datum", "Kunde", "E-Mail", "Telefon", "Hizmet", "Status", "Registriert"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-medium text-xs uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((entry, i) => (
                <tr
                  key={entry.id}
                  style={{
                    backgroundColor: i % 2 === 0 ? "#fff" : "var(--color-background)",
                    borderBottom: "1px solid var(--color-accent)",
                  }}
                >
                  <td className="px-4 py-3 whitespace-nowrap" style={{ color: "var(--color-primary)" }}>
                    {formatDate(entry.requestedDate)}
                  </td>
                  <td className="px-4 py-3" style={{ color: "var(--color-primary)" }}>
                    {entry.customerName ?? "—"}
                  </td>
                  <td className="px-4 py-3" style={{ color: "var(--color-text)" }}>
                    {entry.customerEmail
                      ? entry.customerEmail.length > 30
                        ? entry.customerEmail.slice(0, 30) + "…"
                        : entry.customerEmail
                      : "—"}
                  </td>
                  <td className="px-4 py-3" style={{ color: "var(--color-text)" }}>
                    {entry.customerPhone ?? "—"}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs" style={{ color: "var(--color-text-muted)" }}>
                    {entry.requestedServiceId.slice(0, 8)}…
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="inline-block rounded-full px-2.5 py-0.5 text-xs font-medium"
                      style={
                        entry.notified
                          ? { backgroundColor: "#D1FAE5", color: "#065F46" }
                          : { backgroundColor: "#FEF3C7", color: "#92400E" }
                      }
                    >
                      {entry.notified ? "Benachrichtigt" : "Wartend"}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs" style={{ color: "var(--color-text-muted)" }}>
                    {formatDateTime(entry.registeredAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
