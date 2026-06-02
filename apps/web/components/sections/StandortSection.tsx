import Link from "next/link";
import { getLocale } from "@/lib/i18n/server";
import { getDictionary } from "@/lib/i18n/dictionary";

export default async function StandortSection() {
  const dict = getDictionary(await getLocale());
  const s = dict.standort;

  return (
    <section className="section standort" id="kontakt" style={{ background: "var(--color-bg-surface)" }}>
      <div className="container standort-grid">
        <div className="standort-left">
          <span className="caption">{s.caption}</span>
          <h3 style={{ margin: "12px 0 24px" }}>{s.heading}</h3>
          <ul className="contact-list">
            <li><span className="contact-ic">📍</span> {s.address}</li>
            <li><span className="contact-ic">📞</span> <a href="tel:+4312345678">{s.phone}</a></li>
            <li><span className="contact-ic">✉️</span> <a href="mailto:hello@viennaglowstudio.at">{s.email}</a></li>
            <li><span className="contact-ic">📸</span> {s.instagram}</li>
          </ul>
          <table className="hours">
            <tbody>
              <tr>
                <td className="hours-day">{s.days.monday}</td>
                <td className="hours-time">09:00 – 19:00</td>
                <td><span className="hours-status open">{s.statusOpen}</span></td>
              </tr>
              <tr>
                <td className="hours-day">{s.days.tuesday}</td>
                <td className="hours-time">09:00 – 19:00</td>
                <td><span className="hours-status open">{s.statusOpen}</span></td>
              </tr>
              <tr>
                <td className="hours-day">{s.days.wednesday}</td>
                <td className="hours-time">09:00 – 19:00</td>
                <td><span className="hours-status open">{s.statusOpen}</span></td>
              </tr>
              <tr>
                <td className="hours-day">{s.days.thursday}</td>
                <td className="hours-time">09:00 – 21:00</td>
                <td>
                  <span className="hours-status open">{s.statusOpen}</span>{" "}
                  <span className="hours-tag">{s.eveningTag}</span>
                </td>
              </tr>
              <tr>
                <td className="hours-day">{s.days.friday}</td>
                <td className="hours-time">09:00 – 19:00</td>
                <td><span className="hours-status open">{s.statusOpen}</span></td>
              </tr>
              <tr>
                <td className="hours-day">{s.days.saturday}</td>
                <td className="hours-time">10:00 – 17:00</td>
                <td><span className="hours-status open">{s.statusOpen}</span></td>
              </tr>
              <tr>
                <td className="hours-day">{s.days.sunday}</td>
                <td className="hours-time">—</td>
                <td><span className="hours-status closed">{s.statusClosed}</span></td>
              </tr>
            </tbody>
          </table>
          <p className="hours-note">{s.hoursNote}</p>
          <Link href="/booking" className="btn btn-primary btn-lg" style={{ marginTop: "20px" }}>
            {s.cta}
          </Link>
        </div>
        <div className="standort-right">
          <div className="map">
            <div className="map-grid" />
            <div className="map-pin">📍</div>
            <div className="map-name">{s.mapName}</div>
            <div className="map-addr">{s.mapAddr}</div>
            <div className="map-badge">{s.mapBadge}</div>
          </div>
          <div className="transport">
            <span>{s.transportU3}</span>
            <span>{s.transportBus}</span>
            <span>{s.transportPark}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
