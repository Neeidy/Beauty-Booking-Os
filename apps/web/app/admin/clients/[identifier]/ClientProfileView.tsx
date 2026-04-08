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
  de: "Almanca",
  tr: "Türkçe",
  en: "İngilizce",
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending:     { label: "Bekliyor",            color: "#D97706" },
  reminded:    { label: "Hatırlatıldı",        color: "#D97706" },
  confirmed:   { label: "Onaylandı",           color: "#059669" },
  completed:   { label: "Tamamlandı",          color: "#059669" },
  cancelled:   { label: "İptal",               color: "#6B7280" },
  no_show:     { label: "Gelmedi",             color: "#DC2626" },
  rescheduled: { label: "Yeniden Planlandı",   color: "#6B7280" },
};

export default function ClientProfileView({ data }: ClientProfileViewProps) {
  const { customer, summary, bookings } = data;

  // customer is guaranteed non-null when this component renders (page.tsx guards)
  if (!customer) return null;

  const firstSeenFormatted = new Intl.DateTimeFormat("de-AT", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(customer.firstSeenAt));

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Back link */}
      <Link
        href="/admin/leads"
        className="inline-block text-sm underline"
        style={{ color: "var(--color-secondary)" }}
      >
        ← Müşterilere Dön
      </Link>

      {/* Section 1 — Customer info card */}
      <div
        className="rounded-sm border p-5 space-y-2"
        style={{
          backgroundColor: "var(--color-accent)",
          borderColor: "var(--color-accent)",
        }}
      >
        <h2
          className="text-xl font-bold"
          style={{ color: "var(--color-primary)" }}
        >
          {customer.name ?? "Unbekannt"}
        </h2>
        {customer.phone && (
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            {customer.phone}
          </p>
        )}
        {customer.email && (
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            {customer.email}
          </p>
        )}
        {customer.language && (
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            {LANGUAGE_LABELS[customer.language] ?? customer.language}
          </p>
        )}
        <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
          Müşteri Since: {firstSeenFormatted}
        </p>
      </div>

      {/* Section 2 — Summary stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Toplam Randevu", value: summary.totalBookings },
          { label: "Tamamlanan",     value: summary.completedBookings },
          { label: "İptal",          value: summary.cancelledBookings },
          { label: "Gelmedi",        value: summary.noshowCount },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="rounded-sm border p-4 text-center"
            style={{
              backgroundColor: "var(--color-background)",
              borderColor: "var(--color-accent)",
            }}
          >
            <p
              className="text-2xl font-bold"
              style={{ color: "var(--color-primary)" }}
            >
              {value}
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>
              {label}
            </p>
          </div>
        ))}
      </div>
      {summary.totalBookings > 0 && (
        <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
          Show rate: {Math.round(summary.showRate * 100)}%
        </p>
      )}

      {/* Section 3 — Booking history table */}
      <div
        className="rounded-sm border overflow-x-auto"
        style={{ borderColor: "var(--color-accent)", backgroundColor: "#fff" }}
      >
        {bookings.length === 0 ? (
          <div
            className="text-sm text-center py-12"
            style={{ color: "var(--color-text-muted)" }}
          >
            Henüz randevu bulunmuyor
          </div>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr style={{ borderBottom: "2px solid var(--color-accent)" }}>
                {["Tarih/Saat", "Hizmet", "Süre", "Durum"].map((h) => (
                  <th
                    key={h}
                    className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => {
                const statusCfg = STATUS_CONFIG[b.status] ?? { label: b.status, color: "#6B7280" };
                const dateLabel = new Intl.DateTimeFormat("de-AT", {
                  day: "numeric",
                  month: "short",
                }).format(new Date(b.appointmentAt));

                return (
                  <tr
                    key={b.id}
                    style={{ borderBottom: "1px solid var(--color-accent)" }}
                  >
                    <td
                      className="px-3 py-2 whitespace-nowrap font-medium"
                      style={{ color: "var(--color-primary)" }}
                    >
                      {dateLabel} {b.appointmentTime}
                    </td>
                    <td className="px-3 py-2" style={{ color: "var(--color-primary)" }}>
                      {b.serviceName ?? "—"}
                    </td>
                    <td
                      className="px-3 py-2 whitespace-nowrap"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      {b.durationMinutes} dk
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className="text-xs px-2 py-0.5 rounded font-medium"
                        style={{ backgroundColor: `${statusCfg.color}20`, color: statusCfg.color }}
                      >
                        {statusCfg.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
