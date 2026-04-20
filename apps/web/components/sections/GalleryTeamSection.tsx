import Image from "next/image";
import Link from "next/link";

const GALLERY = [
  { src: "https://images.unsplash.com/photo-1604654894610-df63bc536371?w=600&q=80", alt: "Nail Art", cat: "Nail Art", h: "240" },
  { src: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&q=80", alt: "Hair", cat: "Hair", h: "280" },
  { src: "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=600&q=80", alt: "Lash", cat: "Lashes", h: "200" },
  { src: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=600&q=80", alt: "Studio", cat: "Studio", h: "280" },
  { src: "https://images.unsplash.com/photo-1519014816548-bf5fe059798b?w=600&q=80", alt: "Nail Detail", cat: "Nail Art", h: "200" },
  { src: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=600&q=80", alt: "Facial", cat: "Facial", h: "240" },
  { src: "https://images.unsplash.com/photo-1560343090-f0409e92791a?w=600&q=80", alt: "Nail", cat: "Nail", h: "200" },
  { src: "https://images.unsplash.com/photo-1522337094846-8a818192de1f?w=600&q=80", alt: "Salon", cat: "Studio", h: "280" },
  { src: "https://images.unsplash.com/photo-1595476108010-b4d1f102b1b1?w=600&q=80", alt: "Team", cat: "Team", h: "240" },
];

const TEAM = [
  {
    name: "Anna M.",
    role: "Nageldesignerin & Inhaberin",
    bio: "10 Jahre Erfahrung. Spezialistin für komplexe Nail Art Designs.",
    ig: "@anna.nails",
    accent: "var(--color-purple)",
    pills: [
      { text: "Nail Art", bg: "var(--color-purple-soft)", color: "var(--color-purple-soft-text)" },
      { text: "Gel", bg: "var(--color-purple-soft)", color: "var(--color-purple-soft-text)" },
      { text: "Acryl", bg: "var(--color-purple-soft)", color: "var(--color-purple-soft-text)" },
    ],
    img: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=300&q=80",
  },
  {
    name: "Sofia B.",
    role: "Friseurmeisterin",
    bio: "Zertifizierte Friseurmeisterin, Fokus auf moderne Colorationstechniken.",
    ig: "@sofia.hair",
    accent: "var(--color-amber)",
    pills: [
      { text: "Coloration", bg: "var(--color-amber-soft)", color: "var(--color-amber-soft-text)" },
      { text: "Balayage", bg: "var(--color-amber-soft)", color: "var(--color-amber-soft-text)" },
      { text: "Schnitt", bg: "var(--color-amber-soft)", color: "var(--color-amber-soft-text)" },
    ],
    img: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&q=80",
  },
  {
    name: "Lena K.",
    role: "Beauty & Kosmetikerin",
    bio: "Ausgebildete Kosmetikerin und Wimpernexpertin aus Wien.",
    ig: "@lena.beauty",
    accent: "var(--color-emerald)",
    pills: [
      { text: "HydraFacial", bg: "var(--color-emerald-soft)", color: "var(--color-emerald-soft-text)" },
      { text: "Wimpern", bg: "var(--color-rose-soft)", color: "var(--color-rose-soft-text)" },
      { text: "Brauen", bg: "var(--color-rose-soft)", color: "var(--color-rose-soft-text)" },
    ],
    img: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=300&q=80",
  },
];

export default function GalleryTeamSection() {
  return (
    <>
      {/* Gallery */}
      <section className="section galerie" id="galerie" style={{ background: "var(--color-bg)" }}>
        <div className="container-wide">
          <div className="section-header">
            <span className="caption">Einblicke</span>
            <h2>Unser Studio &amp; unsere Arbeit</h2>
            <p className="subtitle">Ein Blick hinter die Kulissen — unsere Arbeit, unser Team, unser Wien.</p>
          </div>
          <div className="gallery-grid">
            {GALLERY.map(({ src, alt, cat, h }, i) => (
              <div key={i} className="gallery-tile" data-h={h}>
                <div className="img-wrap" style={{ height: "100%", position: "relative" }}>
                  <Image src={src} alt={alt} fill style={{ objectFit: "cover" }} />
                </div>
                <span className="gallery-cat">{cat}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="section team" id="team" style={{ background: "var(--color-bg-surface)" }}>
        <div className="container">
          <div className="section-header">
            <span className="caption">Unser Team</span>
            <h2>Experten für Ihre Schönheit</h2>
          </div>
          <div className="team-grid">
            {TEAM.map(({ name, role, bio, ig, accent, pills, img }) => (
              <article
                key={name}
                className="team-card"
                style={{ "--accent": accent } as React.CSSProperties}
              >
                <div className="img-wrap team-photo">
                  <Image src={img} alt={name} fill style={{ objectFit: "cover" }} />
                </div>
                <h4>{name}</h4>
                <div className="team-role">{role}</div>
                <div className="team-pills">
                  {pills.map((p) => (
                    <span
                      key={p.text}
                      className="pill team-pill"
                      style={{ background: p.bg, color: p.color, borderColor: "transparent" }}
                    >
                      {p.text}
                    </span>
                  ))}
                </div>
                <p className="team-bio">{bio}</p>
                <a href="#" className="team-ig">↗ {ig}</a>
              </article>
            ))}
          </div>
          <div style={{ textAlign: "center", marginTop: "48px" }}>
            <Link href="/booking" className="btn btn-primary btn-lg">
              Online Termin direkt beim Wunschmitarbeiter buchen →
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
