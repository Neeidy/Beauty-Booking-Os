import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Datenschutz & Einwilligung — Vienna Glow Studio",
  robots: { index: false, follow: false },
};

export default function DatenschutzPage() {
  return (
    <div className="ds-wrap">
      <div className="ds-card">
        <div className="ds-header">
          <h1>Datenschutz &amp; Einwilligung</h1>
          <p>Vienna Glow Studio — Gemäß DSGVO (EU 2016/679) und österreichischem Datenschutzgesetz.</p>
        </div>

        <div className="ds-section">
          <h3>Verantwortliche Stelle</h3>
          <p>
            Vienna Glow Studio, Mariahilfer Straße 45, 1060 Wien, Österreich.<br />
            E-Mail: <a href="mailto:datenschutz@viennaglowstudio.at">datenschutz@viennaglowstudio.at</a>
          </p>
        </div>

        <div className="ds-section">
          <h3>Zweck der Datenverarbeitung</h3>
          <p>
            Wir verarbeiten Ihre personenbezogenen Daten (Name, Telefonnummer, E-Mail-Adresse) ausschließlich zum Zweck der Terminverwaltung und Kommunikation.
          </p>
        </div>

        <div className="ds-section">
          <h3>Ihre Rechte</h3>
          <p>
            Sie haben das Recht auf Auskunft, Berichtigung, Löschung und Datenportabilität. Sie können Ihre Einwilligung jederzeit widerrufen.
          </p>
          <div className="ds-actions">
            <Link href="/gdpr/export" className="btn btn-ghost btn-sm">Daten exportieren</Link>
            <Link href="/gdpr/delete" className="btn btn-ghost btn-sm">Löschanfrage stellen</Link>
          </div>
        </div>

        <div className="ds-section">
          <h3>Datenspeicherung</h3>
          <p>
            Ihre Daten werden nach 730 Tagen (2 Jahre) automatisch anonymisiert. Buchungsdaten werden gemäß steuerrechtlicher Aufbewahrungspflichten gespeichert.
          </p>
        </div>

        <div className="ds-footer">
          <Link href="/" className="booking-back">← Zurück zur Startseite</Link>
        </div>
      </div>
    </div>
  );
}
