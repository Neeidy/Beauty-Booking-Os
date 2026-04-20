import Link from "next/link";

export default function StandortSection() {
  return (
    <section className="section standort" id="kontakt" style={{ background: "var(--color-bg-surface)" }}>
      <div className="container standort-grid">
        <div className="standort-left">
          <span className="caption">Standort &amp; Zeiten</span>
          <h3 style={{ margin: "12px 0 24px" }}>Besuchen Sie uns</h3>
          <ul className="contact-list">
            <li><span className="contact-ic">📍</span> Mariahilfer Straße 45, 1060 Wien</li>
            <li><span className="contact-ic">📞</span> <a href="tel:+4312345678">+43 1 234 5678</a></li>
            <li><span className="contact-ic">✉️</span> <a href="mailto:hello@viennaglowstudio.at">hello@viennaglowstudio.at</a></li>
            <li><span className="contact-ic">📸</span> @viennaglowstudio</li>
          </ul>
          <table className="hours">
            <tbody>
              <tr>
                <td className="hours-day">Montag</td>
                <td className="hours-time">09:00 – 19:00</td>
                <td><span className="hours-status open">● Geöffnet</span></td>
              </tr>
              <tr>
                <td className="hours-day">Dienstag</td>
                <td className="hours-time">09:00 – 19:00</td>
                <td><span className="hours-status open">● Geöffnet</span></td>
              </tr>
              <tr>
                <td className="hours-day">Mittwoch</td>
                <td className="hours-time">09:00 – 19:00</td>
                <td><span className="hours-status open">● Geöffnet</span></td>
              </tr>
              <tr>
                <td className="hours-day">Donnerstag</td>
                <td className="hours-time">09:00 – 21:00</td>
                <td>
                  <span className="hours-status open">● Geöffnet</span>{" "}
                  <span className="hours-tag">Abendtermine! 🌙</span>
                </td>
              </tr>
              <tr>
                <td className="hours-day">Freitag</td>
                <td className="hours-time">09:00 – 19:00</td>
                <td><span className="hours-status open">● Geöffnet</span></td>
              </tr>
              <tr>
                <td className="hours-day">Samstag</td>
                <td className="hours-time">10:00 – 17:00</td>
                <td><span className="hours-status open">● Geöffnet</span></td>
              </tr>
              <tr>
                <td className="hours-day">Sonntag</td>
                <td className="hours-time">—</td>
                <td><span className="hours-status closed">○ Geschlossen</span></td>
              </tr>
            </tbody>
          </table>
          <p className="hours-note">Online buchbar — auch außerhalb der Öffnungszeiten.</p>
          <Link href="/booking" className="btn btn-primary btn-lg" style={{ marginTop: "20px" }}>
            Jetzt Termin buchen
          </Link>
        </div>
        <div className="standort-right">
          <div className="map">
            <div className="map-grid" />
            <div className="map-pin">📍</div>
            <div className="map-name">Vienna Glow Studio</div>
            <div className="map-addr">Mariahilfer Straße 45</div>
            <div className="map-badge">🚇 U3 Neubaugasse · 3 Min.</div>
          </div>
          <div className="transport">
            <span>🚇 U3 Neubaugasse</span>
            <span>🚌 Bus 57A</span>
            <span>🚗 Parkgarage 100m</span>
          </div>
        </div>
      </div>
    </section>
  );
}
