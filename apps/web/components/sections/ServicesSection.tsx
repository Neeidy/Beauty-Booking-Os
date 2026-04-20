import Image from "next/image";
import Link from "next/link";

const SERVICES = [
  {
    title: "Nagelstudio",
    desc: "Gel Maniküre · Acryl · Nail Art · Pediküre",
    price: "ab € 35,–",
    accent: "var(--color-purple)",
    accentSoft: "var(--color-purple-soft)",
    accentSoftText: "var(--color-purple-soft-text)",
    badge: { text: "Beliebt 🔥", bg: "var(--color-amber-soft)", color: "var(--color-amber-soft-text)" },
    img: "https://images.unsplash.com/photo-1604654894610-df63bc536371?w=800&q=80",
    alt: "Nail Art",
  },
  {
    title: "Haarstyling",
    desc: "Damenschnitt · Herrenschnitt · Coloration · Balayage",
    price: "ab € 25,–",
    accent: "var(--color-amber)",
    accentSoft: "var(--color-amber-soft)",
    accentSoftText: "var(--color-amber-soft-text)",
    badge: null,
    img: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&q=80",
    alt: "Hair Salon",
  },
  {
    title: "Gesichtspflege & Kosmetik",
    desc: "HydraFacial · Peeling · Anti-Aging",
    price: "ab € 55,–",
    accent: "var(--color-emerald)",
    accentSoft: "var(--color-emerald-soft)",
    accentSoftText: "var(--color-emerald-soft-text)",
    badge: null,
    img: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800&q=80",
    alt: "Facial Care",
  },
  {
    title: "Wimpern & Brauen",
    desc: "Wimpernlifting · Tinting · Brow Lamination",
    price: "ab € 45,–",
    accent: "var(--color-rose)",
    accentSoft: "var(--color-rose-soft)",
    accentSoftText: "var(--color-rose-soft-text)",
    badge: { text: "Trending ✨", bg: "var(--color-purple-soft)", color: "var(--color-purple-soft-text)" },
    img: "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=800&q=80",
    alt: "Lash & Brow",
  },
  {
    title: "Epilasyon & Waxing",
    desc: "Ganzkörper · Brazilian · Gesicht · Achseln",
    price: "ab € 20,–",
    accent: "var(--color-rose)",
    accentSoft: "var(--color-rose-soft)",
    accentSoftText: "var(--color-rose-soft-text)",
    badge: null,
    img: "https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=800&q=80",
    alt: "Waxing Studio",
  },
  {
    title: "Herrenfriseur",
    desc: "Haarschnitt · Bartpflege · Styling · Rasur",
    price: "ab € 25,–",
    accent: "var(--color-cyan)",
    accentSoft: "var(--color-cyan-soft)",
    accentSoftText: "var(--color-cyan-soft-text)",
    badge: null,
    img: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800&q=80",
    alt: "Barbershop",
  },
];

export default function ServicesSection() {
  return (
    <section className="section services" id="leistungen">
      <div className="container">
        <div className="section-header">
          <span className="caption">Unser Angebot</span>
          <h2>Alles für Ihre Schönheit</h2>
          <p className="subtitle">
            Von Nagelpflege bis Gesichtsbehandlung — in einem Studio, mit einem Team, das Ihre Handschrift kennt.
          </p>
        </div>
        <div className="service-grid">
          {SERVICES.map(({ title, desc, price, accent, accentSoft, accentSoftText, badge, img, alt }) => (
            <article
              key={title}
              className="service-card"
              style={{ "--accent": accent, "--accent-soft": accentSoft, "--accent-soft-text": accentSoftText } as React.CSSProperties}
            >
              <div className="img-wrap service-img">
                <Image src={img} alt={alt} fill style={{ objectFit: "cover" }} />
              </div>
              {badge && (
                <span className="service-badge" style={{ background: badge.bg, color: badge.color }}>
                  {badge.text}
                </span>
              )}
              <div className="service-body">
                <h4>{title}</h4>
                <p className="service-desc">{desc}</p>
                <div className="service-foot">
                  <span className="service-price">{price}</span>
                  <Link href="/booking" className="service-cta">Termin buchen →</Link>
                </div>
              </div>
            </article>
          ))}
        </div>
        <div style={{ textAlign: "center", marginTop: "48px" }}>
          <Link href="/booking" className="btn btn-ghost btn-lg">Alle Leistungen &amp; Preise ansehen →</Link>
        </div>
      </div>
    </section>
  );
}
