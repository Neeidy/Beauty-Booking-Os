import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Datenschutz & Einwilligung — Vienna Glow Studio",
  robots: { index: false, follow: false },
};

export default function DatenschutzPage() {
  return (
    <div style={{ background: "var(--color-bg-surface)", minHeight: "100vh", padding: "120px 16px 96px" }}>
      <div style={{ maxWidth: "760px", margin: "0 auto" }}>
        <div style={{
          background: "var(--color-bg-card)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-xl)",
          boxShadow: "var(--shadow-elevated)",
          padding: "48px",
        }}>
          <div style={{ paddingBottom: "24px", borderBottom: "1px solid var(--color-border)", marginBottom: "24px" }}>
            <h1 style={{ fontSize: "28px", fontWeight: 700, margin: "0 0 6px" }}>
              Datenschutz &amp; Einwilligung
            </h1>
            <p style={{ color: "var(--color-text-muted)", fontSize: "15px", margin: 0 }}>
              Vienna Glow Studio — Gemäß DSGVO (EU 2016/679) und österreichischem Datenschutzgesetz.
            </p>
          </div>

          <div style={{ marginBottom: "28px" }}>
            <h3 style={{ fontSize: "15px", fontWeight: 600, margin: "0 0 8px" }}>Verantwortliche Stelle</h3>
            <p style={{ margin: "0 0 8px", fontSize: "13px", lineHeight: 1.65, color: "var(--color-text-secondary)" }}>
              Vienna Glow Studio, Mariahilfer Straße 45, 1060 Wien, Österreich.<br />
              E-Mail: <a href="mailto:datenschutz@viennaglowstudio.at" style={{ color: "var(--color-accent)" }}>datenschutz@viennaglowstudio.at</a>
            </p>
          </div>

          <div style={{ marginBottom: "28px" }}>
            <h3 style={{ fontSize: "15px", fontWeight: 600, margin: "0 0 8px" }}>Zweck der Datenverarbeitung</h3>
            <p style={{ margin: "0 0 8px", fontSize: "13px", lineHeight: 1.65, color: "var(--color-text-secondary)" }}>
              Wir verarbeiten Ihre personenbezogenen Daten (Name, Telefonnummer, E-Mail-Adresse) ausschließlich zum Zweck der Terminverwaltung und Kommunikation.
            </p>
          </div>

          <div style={{ marginBottom: "28px" }}>
            <h3 style={{ fontSize: "15px", fontWeight: 600, margin: "0 0 8px" }}>Ihre Rechte</h3>
            <p style={{ margin: "0 0 8px", fontSize: "13px", lineHeight: 1.65, color: "var(--color-text-secondary)" }}>
              Sie haben das Recht auf Auskunft, Berichtigung, Löschung und Datenportabilität. Sie können Ihre Einwilligung jederzeit widerrufen.
            </p>
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginTop: "16px" }}>
              <Link href="/gdpr/export" className="btn btn-ghost btn-sm">Daten exportieren</Link>
              <Link href="/gdpr/delete" className="btn btn-ghost btn-sm">Löschanfrage stellen</Link>
            </div>
          </div>

          <div style={{ marginBottom: "28px" }}>
            <h3 style={{ fontSize: "15px", fontWeight: 600, margin: "0 0 8px" }}>Datenspeicherung</h3>
            <p style={{ margin: "0 0 8px", fontSize: "13px", lineHeight: 1.65, color: "var(--color-text-secondary)" }}>
              Ihre Daten werden nach 730 Tagen (2 Jahre) automatisch anonymisiert. Buchungsdaten werden gemäß steuerrechtlicher Aufbewahrungspflichten gespeichert.
            </p>
          </div>

          <div style={{ marginTop: "32px", paddingTop: "24px", borderTop: "1px solid var(--color-border)" }}>
            <Link href="/" className="btn btn-ghost btn-sm">← Zurück zur Startseite</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
