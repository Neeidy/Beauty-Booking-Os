export const dynamic = "force-dynamic";
// SERVER COMPONENT — no "use client"

import { loadClientConfig } from "@/lib/load-client-config";

const WEEKDAY_LABELS: Record<string, string> = {
  monday:    "Montag",
  tuesday:   "Dienstag",
  wednesday: "Mittwoch",
  thursday:  "Donnerstag",
  friday:    "Freitag",
  saturday:  "Samstag",
  sunday:    "Sonntag",
};

const WEEKDAY_ORDER = [
  "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
];

function formatTime(timeStr: string): string {
  // Handles both "09:00" and "0900" formats
  const normalized = timeStr.replace(":", "").padStart(4, "0");
  return `${normalized.slice(0, 2)}:${normalized.slice(2, 4)}`;
}

export default function SettingsPage() {
  let cfg;
  let configError = false;
  try {
    cfg = loadClientConfig();
  } catch {
    configError = true;
  }

  if (configError || !cfg) {
    return (
      <main style={{ padding: "var(--space-8, 2rem)" }}>
        <h1 style={{ color: "var(--color-text)", marginBottom: "1rem" }}>
          Einstellungen
        </h1>
        <p style={{ color: "var(--color-text-muted)" }}>
          Konfiguration konnte nicht geladen werden.
        </p>
      </main>
    );
  }

  return (
    <main style={{ padding: "var(--space-8, 2rem)", maxWidth: "800px" }}>
      <h1 style={{
        color: "var(--color-text)",
        marginBottom: "2rem",
        fontSize: "1.5rem",
        fontWeight: 600,
      }}>
        Einstellungen
      </h1>

      {/* Öffnungszeiten */}
      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{
          color: "var(--color-text)",
          fontSize: "1rem",
          fontWeight: 600,
          marginBottom: "1rem",
        }}>
          Öffnungszeiten
        </h2>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--color-secondary)" }}>
              {["Tag", "Öffnung", "Schließung", "Status"].map((h) => (
                <th
                  key={h}
                  style={{
                    textAlign: "left",
                    padding: "8px 12px",
                    color: "var(--color-text-muted)",
                    fontSize: "13px",
                    fontWeight: 500,
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {WEEKDAY_ORDER.map((day) => {
              const hours = cfg.operatingHours?.[day];
              const isClosed = hours === null || hours === undefined;
              return (
                <tr
                  key={day}
                  style={{ borderBottom: "1px solid var(--color-accent)" }}
                >
                  <td style={{ padding: "10px 12px", color: "var(--color-text)", fontSize: "14px" }}>
                    {WEEKDAY_LABELS[day]}
                  </td>
                  <td style={{ padding: "10px 12px", color: "var(--color-text)", fontSize: "14px" }}>
                    {isClosed ? "—" : formatTime(hours!.open)}
                  </td>
                  <td style={{ padding: "10px 12px", color: "var(--color-text)", fontSize: "14px" }}>
                    {isClosed ? "—" : formatTime(hours!.close)}
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <span style={{
                      padding: "2px 10px",
                      borderRadius: "999px",
                      fontSize: "12px",
                      border: isClosed
                        ? "1px solid var(--color-text-muted)"
                        : "1px solid var(--color-primary)",
                      color: isClosed
                        ? "var(--color-text-muted)"
                        : "var(--color-primary)",
                    }}>
                      {isClosed ? "Geschlossen" : "Geöffnet"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {/* Buchungsregeln */}
      <section>
        <h2 style={{
          color: "var(--color-text)",
          fontSize: "1rem",
          fontWeight: 600,
          marginBottom: "1rem",
        }}>
          Buchungsregeln
        </h2>
        <div style={{
          border: "1px solid var(--color-accent)",
          borderRadius: "8px",
          padding: "16px 20px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
          gap: "12px",
        }}>
          {[
            {
              label: "Mindestvorlaufzeit",
              value: `${cfg.bookingRules?.minAdvanceBookingHours ?? 2} Stunden`,
            },
            {
              label: "Stornierungsfrist",
              value: `${cfg.bookingRules?.cancellationPolicyHours ?? 24} Stunden`,
            },
            {
              label: "Max. Nachfassversuche",
              value: String(cfg.bookingRules?.maxFollowUpAttempts ?? 2),
            },
            {
              label: "Wartezeit Rückgewinnung",
              value: `${cfg.bookingRules?.recoveryWaitHours ?? 48} Stunden`,
            },
          ].map(({ label, value }) => (
            <div key={label}>
              <div style={{
                fontSize: "12px",
                color: "var(--color-text-muted)",
                marginBottom: "2px",
              }}>
                {label}
              </div>
              <div style={{
                fontSize: "14px",
                color: "var(--color-text)",
                fontWeight: 500,
              }}>
                {value}
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
