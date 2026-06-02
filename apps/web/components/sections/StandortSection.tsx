import Link from "next/link";
import { getLocale } from "@/lib/i18n/server";
import { getDictionary } from "@/lib/i18n/dictionary";
import { loadClientConfig } from "@/lib/load-client-config";

const WEEKDAY_ORDER = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

export default async function StandortSection() {
  const dict = getDictionary(await getLocale());
  const s = dict.standort;
  const config = loadClientConfig();

  return (
    <section className="section standort" id="kontakt" style={{ background: "var(--color-bg-surface)" }}>
      <div className="container standort-grid">
        <div className="standort-left">
          <span className="caption">{s.caption}</span>
          <h3 style={{ margin: "12px 0 24px" }}>{s.heading}</h3>
          <ul className="contact-list">
            <li><span className="contact-ic">📍</span> {config.contact.address}</li>
            <li><span className="contact-ic">📞</span> <a href={`tel:${config.contact.phone.replace(/\s/g, "")}`}>{config.contact.phone}</a></li>
            <li><span className="contact-ic">✉️</span> <a href={`mailto:${config.contact.email}`}>{config.contact.email}</a></li>
            {config.contact.instagramHandle && (
              <li><span className="contact-ic">📸</span> {config.contact.instagramHandle}</li>
            )}
          </ul>
          <table className="hours">
            <tbody>
              {WEEKDAY_ORDER.map((key) => {
                const oh = config.operatingHours[key];
                return (
                  <tr key={key}>
                    <td className="hours-day">{s.days[key]}</td>
                    <td className="hours-time">{oh ? `${oh.open} – ${oh.close}` : "—"}</td>
                    <td>
                      {oh
                        ? <span className="hours-status open">{s.statusOpen}</span>
                        : <span className="hours-status closed">{s.statusClosed}</span>}
                    </td>
                  </tr>
                );
              })}
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
            <div className="map-name">{config.clientName}</div>
            <div className="map-addr">{config.contact.address}</div>
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
