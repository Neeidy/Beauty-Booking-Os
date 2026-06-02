import Image from "next/image";
import Link from "next/link";
import { getLocale } from "@/lib/i18n/server";
import { getDictionary } from "@/lib/i18n/dictionary";
import type { Dictionary } from "@/lib/i18n/dictionary";

// Non-localizable presentation data. `catKey` points at the localized category label.
const GALLERY = [
  { src: "https://images.unsplash.com/photo-1604654894610-df63bc536371?w=600&q=80", alt: "Nail Art", catKey: "catNailArt" as const, h: "240" },
  { src: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&q=80", alt: "Hair", catKey: "catHair" as const, h: "280" },
  { src: "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=600&q=80", alt: "Lash", catKey: "catLashes" as const, h: "200" },
  { src: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=600&q=80", alt: "Studio", catKey: "catStudio" as const, h: "280" },
  { src: "https://images.unsplash.com/photo-1519014816548-bf5fe059798b?w=600&q=80", alt: "Nail Detail", catKey: "catNailArt" as const, h: "200" },
  { src: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=600&q=80", alt: "Facial", catKey: "catFacial" as const, h: "240" },
  { src: "https://images.unsplash.com/photo-1560343090-f0409e92791a?w=600&q=80", alt: "Nail", catKey: "catNail" as const, h: "200" },
  { src: "https://images.unsplash.com/photo-1522337094846-8a818192de1f?w=600&q=80", alt: "Salon", catKey: "catStudio" as const, h: "280" },
  { src: "https://images.unsplash.com/photo-1595476108010-b4d1f102b1b1?w=600&q=80", alt: "Team", catKey: "catTeam" as const, h: "240" },
];

const TEAM_STYLES = [
  {
    key: "anna" as const,
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
    key: "sofia" as const,
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
    key: "lena" as const,
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

export default async function GalleryTeamSection() {
  const dict = getDictionary(await getLocale());
  const gallery = dict.gallery as Dictionary["gallery"];

  return (
    <>
      {/* Gallery */}
      <section className="section galerie" id="galerie" style={{ background: "var(--color-bg)" }}>
        <div className="container-wide">
          <div className="section-header">
            <span className="caption">{dict.gallery.caption}</span>
            <h2>{dict.gallery.heading}</h2>
            <p className="subtitle">{dict.gallery.subtitle}</p>
          </div>
          <div className="gallery-grid">
            {GALLERY.map(({ src, alt, catKey, h }, i) => (
              <div key={i} className="gallery-tile" data-h={h}>
                <div className="img-wrap">
                  <Image src={src} alt={alt} fill style={{ objectFit: "cover" }} />
                </div>
                <span className="gallery-cat">{gallery[catKey]}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="section team" id="team" style={{ background: "var(--color-bg-surface)" }}>
        <div className="container">
          <div className="section-header">
            <span className="caption">{dict.team.caption}</span>
            <h2>{dict.team.heading}</h2>
          </div>
          <div className="team-grid">
            {TEAM_STYLES.map(({ key, ig, accent, pills, img }) => {
              const member = dict.team.members[key];
              return (
                <article
                  key={key}
                  className="team-card"
                  style={{ "--accent": accent } as React.CSSProperties}
                >
                  <div className="img-wrap team-photo">
                    <Image src={img} alt={member.name} fill style={{ objectFit: "cover" }} />
                  </div>
                  <h4>{member.name}</h4>
                  <div className="team-role">{member.role}</div>
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
                  <p className="team-bio">{member.bio}</p>
                  <a href="#" className="team-ig">↗ {ig}</a>
                </article>
              );
            })}
          </div>
          <div style={{ textAlign: "center", marginTop: "48px" }}>
            <Link href="/booking" className="btn btn-primary btn-lg">
              {dict.team.cta}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
