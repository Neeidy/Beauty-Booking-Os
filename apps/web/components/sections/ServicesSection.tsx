import Image from "next/image";
import Link from "next/link";
import { getLocale } from "@/lib/i18n/server";
import { getDictionary } from "@/lib/i18n/dictionary";

// Non-localizable presentation data (colors, images). Strings come from the dictionary.
const SERVICE_STYLES = [
  {
    key: "nails" as const,
    accent: "var(--color-purple)",
    accentSoft: "var(--color-purple-soft)",
    accentSoftText: "var(--color-purple-soft-text)",
    badge: { bg: "var(--color-amber-soft)", color: "var(--color-amber-soft-text)" },
    img: "https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800&q=80",
  },
  {
    key: "hair" as const,
    accent: "var(--color-amber)",
    accentSoft: "var(--color-amber-soft)",
    accentSoftText: "var(--color-amber-soft-text)",
    badge: null,
    img: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&q=80",
  },
  {
    key: "facial" as const,
    accent: "var(--color-emerald)",
    accentSoft: "var(--color-emerald-soft)",
    accentSoftText: "var(--color-emerald-soft-text)",
    badge: null,
    img: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800&q=80",
  },
  {
    key: "lashes" as const,
    accent: "var(--color-rose)",
    accentSoft: "var(--color-rose-soft)",
    accentSoftText: "var(--color-rose-soft-text)",
    badge: { bg: "var(--color-purple-soft)", color: "var(--color-purple-soft-text)" },
    img: "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=800&q=80",
  },
  {
    key: "epilation" as const,
    accent: "var(--color-rose)",
    accentSoft: "var(--color-rose-soft)",
    accentSoftText: "var(--color-rose-soft-text)",
    badge: null,
    img: "https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=800&q=80",
  },
  {
    key: "barber" as const,
    accent: "var(--color-cyan)",
    accentSoft: "var(--color-cyan-soft)",
    accentSoftText: "var(--color-cyan-soft-text)",
    badge: null,
    img: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800&q=80",
  },
];

export default async function ServicesSection() {
  const dict = getDictionary(await getLocale());

  return (
    <section className="section services" id="leistungen">
      <div className="container">
        <div className="section-header">
          <span className="caption">{dict.services.caption}</span>
          <h2>{dict.services.heading}</h2>
          <p className="subtitle">
            {dict.services.subtitle}
          </p>
        </div>
        <div className="service-grid">
          {SERVICE_STYLES.map(({ key, accent, accentSoft, accentSoftText, badge, img }) => {
            const item = dict.services.items[key];
            const badgeText = "badge" in item ? item.badge : undefined;
            return (
              <article
                key={key}
                className="service-card"
                style={{ "--accent": accent, "--accent-soft": accentSoft, "--accent-soft-text": accentSoftText } as React.CSSProperties}
              >
                <div className="img-wrap service-img">
                  <Image src={img} alt={item.alt} fill style={{ objectFit: "cover" }} />
                </div>
                {badge && badgeText && (
                  <span className="service-badge" style={{ background: badge.bg, color: badge.color }}>
                    {badgeText}
                  </span>
                )}
                <div className="service-body">
                  <h4>{item.title}</h4>
                  <p className="service-desc">{item.desc}</p>
                  <div className="service-foot">
                    <span className="service-price">{item.price}</span>
                    <Link href="/booking" className="service-cta">{dict.services.cta}</Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
        <div style={{ textAlign: "center", marginTop: "48px" }}>
          <Link href="/booking" className="btn btn-ghost btn-lg">{dict.services.viewAll}</Link>
        </div>
      </div>
    </section>
  );
}
