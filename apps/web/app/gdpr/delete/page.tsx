import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Löschanfrage — Vienna Glow Studio",
  robots: { index: false, follow: false },
};

export default function GdprDeletePage() {
  return (
    <div className="wl-wrap">
      <div className="wl-card">
        <div className="wl-header">
          <div className="wl-icon">🗑</div>
          <h1>Löschanfrage stellen</h1>
          <p>Gemäß Art. 17 DSGVO haben Sie das Recht auf Löschung Ihrer Daten.</p>
        </div>

        <div className="warn-box">
          <p>Bitte senden Sie Ihre Löschanfrage an:</p>
          <a href="mailto:datenschutz@viennaglowstudio.at?subject=Löschanfrage DSGVO" className="btn btn-lg btn-full">
            ✉ datenschutz@viennaglowstudio.at
          </a>
        </div>

        <div className="retain-list">
          <div className="retain-row">
            <span className="retain-ico">📋</span>
            <span>Vollständigen Namen angeben</span>
          </div>
          <div className="retain-row">
            <span className="retain-ico">📞</span>
            <span>Registrierte Telefonnummer oder E-Mail angeben</span>
          </div>
          <div className="retain-row">
            <span className="retain-ico">⏱</span>
            <span>Bearbeitung innerhalb von 30 Tagen</span>
          </div>
        </div>

        <Link href="/datenschutz" className="booking-back">← Datenschutzerklärung</Link>
      </div>
    </div>
  );
}
