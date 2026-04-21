import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Datenexport — Vienna Glow Studio",
  robots: { index: false, follow: false },
};

export default function GdprExportPage() {
  return (
    <div className="wl-wrap">
      <div className="wl-card">
        <div className="wl-header">
          <div className="wl-icon">📤</div>
          <h1>Datenauskunft &amp; Export</h1>
          <p>Gemäß Art. 15 &amp; 20 DSGVO haben Sie das Recht auf Auskunft und Datenportabilität.</p>
        </div>

        <div className="info-box">
          <p>Exportanfrage per E-Mail:</p>
          <a href="mailto:datenschutz@viennaglowstudio.at?subject=Datenauskunft DSGVO" className="btn btn-primary btn-lg btn-full">
            ✉ datenschutz@viennaglowstudio.at
          </a>
        </div>

        <div className="content-list">
          <div className="content-row">
            <span className="content-check">✓</span>
            <span>Name und registrierte Telefonnummer oder E-Mail angeben</span>
          </div>
          <div className="content-row">
            <span className="content-check">✓</span>
            <span>Daten werden im JSON-Format bereitgestellt</span>
          </div>
          <div className="content-row">
            <span className="content-check">✓</span>
            <span>Bearbeitung innerhalb von 30 Tagen</span>
          </div>
        </div>

        <Link href="/datenschutz" className="booking-back">← Datenschutzerklärung</Link>
      </div>
    </div>
  );
}
