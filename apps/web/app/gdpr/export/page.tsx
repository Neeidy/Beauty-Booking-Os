import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Datenexport — Vienna Glow Studio",
  robots: { index: false, follow: false },
};

export default function GdprExportPage() {
  return (
    <div style={{ background: "var(--color-bg-surface)", minHeight: "100vh", padding: "120px 16px 96px" }}>
      <div style={{ maxWidth: "620px", margin: "0 auto" }}>
        <div style={{
          background: "var(--color-bg-card)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-xl)",
          boxShadow: "var(--shadow-elevated)",
          padding: "48px 40px 40px",
        }}>
          <h1 style={{ fontSize: "28px", fontWeight: 700, margin: "0 0 8px" }}>
            Datenauskunft &amp; Export
          </h1>
          <p style={{ color: "var(--color-text-muted)", fontSize: "15px", marginBottom: "32px", lineHeight: 1.55 }}>
            Gemäß Art. 15 &amp; 20 DSGVO haben Sie das Recht auf Auskunft und Datenportabilität.
          </p>

          <div style={{
            background: "var(--color-bg-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            padding: "20px 24px",
            marginBottom: "24px",
          }}>
            <p style={{ fontSize: "13px", color: "var(--color-text-secondary)", margin: "0 0 12px" }}>
              <strong>Exportanfrage per E-Mail:</strong>
            </p>
            <a
              href="mailto:datenschutz@viennaglowstudio.at?subject=Datenauskunft DSGVO"
              className="btn btn-primary"
            >
              ✉ datenschutz@viennaglowstudio.at
            </a>
          </div>

          <p style={{ fontSize: "12px", color: "var(--color-text-faint)", marginBottom: "24px", lineHeight: 1.6 }}>
            Bitte geben Sie Ihren Namen sowie die bei uns registrierte Telefonnummer oder E-Mail an. Wir stellen Ihnen Ihre Daten im JSON-Format innerhalb von 30 Tagen bereit.
          </p>

          <Link href="/datenschutz" className="btn btn-ghost btn-sm">← Datenschutzerklärung</Link>
        </div>
      </div>
    </div>
  );
}
