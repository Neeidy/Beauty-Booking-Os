import Link from "next/link";

const GALLERY = [
  {
    src: "https://lh3.googleusercontent.com/aida-public/AB6AXuBAjaK9q8n9dhIy2s7A9kTutRnZmdpCq2Z95hMPYO4-eZikJ2Y9B98ig3jZ8IrLvITyAYYYE5q3HHUhPsUGOYli5SzsAaN8k4pOWNj-q-DeafQoAmKm81UdECQePS8xufFDG1Ysvs32cydHl2S-QD3u0-FhIKxVEbQQ9DJff6PawA1LMtDc3jDW0zQKfoLJUeg3w-iCduOCzR1rVMHd1zsKUJAKy_5riUEgixG5l54aisrsf4Hs5Mt2FvKEa2hLwtp9bjt6ICFaQvcS",
    alt: "Beautiful nail art with soft neutral colors",
    label: "Nail Art",
    height: 280,
  },
  {
    src: "https://lh3.googleusercontent.com/aida-public/AB6AXuA9bfmXSD3oSy8tphnr3v8o1R8YFamie25WiTqJt6A4QPDlV1Iwky1L5bFTk_d9WN0rMPJ6d-J4TBagluRrQ2rPj1TyhofOQkoIlrfocanWyYY0TiLal4KLBdO4BfnIshOcRw9cwQnNsX6zg8eeQS4ixW1dlOI9auO7izVwffqB9Wv-39O6lurcjms5eOaeJ9y9Qrq2KtCa94N9DKYorj225pNYUNWLVZWtKM_l1DSN6KsGsPObzM9XxVYi-MQy0GBm8hW0-g-PAV6U",
    alt: "Minimalist salon interior with soft natural light",
    label: "Studio",
    height: 200,
  },
  {
    src: "https://lh3.googleusercontent.com/aida-public/AB6AXuCIw0zvB1SimroX31sXpA17AvAzbkUQ_eq0kcIg9o4KwFsIAKPA3ziVT5IXDjFMbNU_I0V_WNbTcjvjk1stmaY04_0tjMzWDCpouj2I-4JHPPTgNwj7OVc8Yom6c0RJHcbTQpFsEggHBKiQOJLuj9YPAw35T9LP_4HtGpEAt0ASwno4fy-ErD65fNIXap2Z7GQYCBD5_nUPtOVuJBwMT0zCyM7oEgVaUDOZnvgYvBF923QQb_L91bAkmhPfdXzcmYGQ3q5VwvcJGUIq",
    alt: "Close up of a luxurious facial treatment",
    label: "Facial",
    height: 240,
  },
  {
    src: "https://lh3.googleusercontent.com/aida-public/AB6AXuC7KuZovAAHu5bYcX2hFWkyNnGNzLuBTmnLz_07JjsBqypUgjCJRI36ZxcwgoU5aO0maSjdusZx13obnKrUfoW_1JWFTzlV_zSMp9HaENx4XWysx41noiiY0gRHaySXTc6h-itgabqdOkLoWcjX2Qu5miPeDRTVABGEguRNxjx0ntHLi_3TART7ksauucMhy2jWBxMG3BO7hWHXCwM0NNEx3BWOzEIp34IKx_Tgl0tGc0pb5_RyT3cRKV0fevhSWbD53y-RyvDa4PF7",
    alt: "Professional hair styling tools",
    label: "Hair",
    height: 280,
  },
  {
    src: "https://lh3.googleusercontent.com/aida-public/AB6AXuB3_XwyQFHI5qoohccTQeJj-_hD0DI-IEkfxYcMLI4pdx11aQA8-gqm7PchEHvMfzzTQfsivUIiOCJ-fXzeHvxctod73DxBP9CCvYmheSjd9fNeq6G0_ffzatvOeHLqnzWIjCwkWBaYDj0b1DhPMdvrGiAqRndTC1S1vY7Qdn35DDd1A6eDJP4JSgBonBOpTtYLbVG2-VkFhT1g6GwHckq0jMGXNhhRd_OBRFUtP_PLPAK00yBXpy0JE9GqbROBNjj3Bu-YWAFhGCgY",
    alt: "Team of beauty professionals collaborating",
    label: "Team",
    height: 200,
  },
  {
    src: "https://lh3.googleusercontent.com/aida-public/AB6AXuDgNGkr6-66fqZwbOieC1Iyz_WjgpZF7F933g9slbSPzCP3Vl1yIXW1q_A9e9a1QIlhF81Fq2NMmsqlrvKMxw1sdCfZ5icXAfL3oB288vZzB8yN54tu6moa17CPGctsQmvD1EGW1o8etoTc-H8yNHrGkM7CJslBx_lXgeKSxROG7NTvQLfjuseQun_tqzTHJGn4wVLkP5xHlEv3830S8NYnDu049iz-KMUzXhw9d5fOfUF6D6bOHPjymGZa8hDJ0RMoTz37SWPbMCe-",
    alt: "Elegant display of premium skincare products",
    label: "Produkte",
    height: 240,
  },
];

const TEAM = [
  {
    name: "Anna M.",
    role: "Nageldesignerin & Inhaberin",
    bio: "10 Jahre Erfahrung. Spezialistin für komplexe Nail Art Designs.",
    tags: ["Nail Art", "Gel", "Acryl"],
    tagColor: "vgs-secondary" as const,
    borderColor: "#6b38d4",
    avatarColor: "rgba(107,56,212,0.2)",
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuA6XJM3eUxQFmUBUWLpnO1NwF8IagQIxiJBCmjgXjqabSwEVMCYw0H8mxUADpcjvfROxYmGVj2ROpFLRaghpmbZVcFlATozEsTYe45jYTZsmeYlIfl0Bn_BxW3YyEmTuk9KH8dQKb8hXgdWEzGbhbk6Bjuuw9WTBxp0YYywviTSi6CmJGHoAxl4bQz_l3QihimYrfVJ3iRzX27qcGbeD4DDTFaO6fkEKf67bK4Ur_obI95Wm24qB7hqPJuBdd3Wj1cQHs8vUQCBVVCr",
    textColor: "#6b38d4",
    tagBg: "rgba(107,56,212,0.1)",
  },
  {
    name: "Sofia B.",
    role: "Friseurmeisterin",
    bio: "Zertifizierte Friseurmeisterin, Fokus auf moderne Colorationstechniken.",
    tags: ["Coloration", "Balayage", "Schnitt"],
    borderColor: "#F59E0B",
    avatarColor: "rgba(245,158,11,0.2)",
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuCp5-lfbkrCzlgczXSj61VN1ji2NWMoVhlInTNhzx4HtP4-NfcgrmcCabq3Bl3QG02dwQl17h3WKiOYG_RoBKBo2EClgdldRJ8-1-FY9UVFakHkiivQ-CgeqDJkC5Wp3WeIP7NQqF3GXX3_LkWGQVKTeSQnn8eWJJqCBiGVaLmsIbsLSFyT5KK1HitPEfl2hWjxZQ_nFK4eRJH94uIMdDD1RDOLw_JYz6C6taW9spIfF0Xmz1RHIZzD_-VeM-mZB3kpszYFdPx2VJDk",
    textColor: "#B45309",
    tagBg: "rgba(245,158,11,0.1)",
  },
  {
    name: "Lena K.",
    role: "Beauty & Kosmetikerin",
    bio: "Ausgebildete Kosmetikerin und Wimpernexpertin aus Wien.",
    tags: ["HydraFacial", "Wimpern", "Brauen"],
    borderColor: "#10B981",
    avatarColor: "rgba(16,185,129,0.2)",
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuCWJ5clRvOe_qAWYeD_zTF6QXX7j5UWnIOLlZXEiphBZEtbtKfEcauCwCYaZ6RuqszEDI6tXjBW4Sxfm0Y0qg0DqnGXNvGQkphD9z24fMOwYnHgJUnmjSN_1FpDuae2Lf2VNJVqaZ1hPhF2gmfw4I2DvIOFrmfBs0Ewwnx2FHT4auWZdy__LxxeZXU42qKRGICekZqGGM3FaZfILOv8DBE_ipW8s3REEnuwhUG_zt-qjqcGef8KKsk5DLhKdXlb4Ou9lQObQMdUiFqG",
    textColor: "#059669",
    tagBg: "rgba(16,185,129,0.1)",
  },
];

export default function GalerieTeamSection() {
  return (
    <>
      {/* ── Gallery ─────────────────────────────────────────── */}
      <section id="galerie" className="w-full bg-surface-container-lowest py-24 md:py-32 px-6">
        <div className="max-w-screen-xl mx-auto">
          <div className="text-left mb-16 max-w-2xl">
            <span className="font-label text-xs uppercase tracking-[0.05em] text-on-surface-variant block mb-4">
              EINBLICKE
            </span>
            <h2 className="font-headline text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-on-surface mb-6 leading-tight">
              Unser Studio &amp; unsere Arbeit
            </h2>
            <p className="font-body text-lg text-on-surface-variant font-light">
              Ein Blick hinter die Kulissen — unsere Arbeit, unser Team, unser Wien.
            </p>
          </div>

          {/* Masonry-style columns */}
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6">
            {GALLERY.map(({ src, alt, label, height }) => (
              <div
                key={label}
                className="group relative overflow-hidden rounded-xl break-inside-avoid bg-surface-container-low"
                style={{ height }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt={alt}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <span className="absolute bottom-4 left-4 text-white font-label text-sm uppercase tracking-wider">
                    {label}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Team ────────────────────────────────────────────── */}
      <section id="team" className="w-full bg-surface py-24 md:py-32 px-6">
        <div className="max-w-screen-xl mx-auto">
          <div className="text-left mb-16">
            <span className="font-label text-xs uppercase tracking-[0.05em] text-on-surface-variant block mb-4">
              UNSER TEAM
            </span>
            <h2 className="font-headline text-4xl md:text-5xl font-extrabold tracking-tight text-on-surface leading-tight">
              Experten für Ihre Schönheit
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {TEAM.map(({ name, role, bio, tags, borderColor, avatarColor, img, textColor, tagBg }) => (
              <div
                key={name}
                className="bg-surface-container-lowest rounded-2xl p-8 border border-outline-variant/30 relative overflow-hidden"
                style={{
                  borderTopWidth: "4px",
                  borderTopColor: borderColor,
                  boxShadow: "0 20px 40px rgba(91,64,65,0.04)",
                }}
              >
                <div className="flex flex-col items-center text-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img}
                    alt={`Portrait of ${name}`}
                    className="w-24 h-24 rounded-full object-cover mb-6"
                    style={{ border: `4px solid ${avatarColor}` }}
                  />
                  <h3 className="font-headline text-2xl font-bold text-on-surface mb-1">{name}</h3>
                  <p className="font-body text-sm font-medium mb-4" style={{ color: textColor }}>
                    {role}
                  </p>
                  <div className="flex flex-wrap justify-center gap-2 mb-6">
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-3 py-1 rounded-full text-xs font-label uppercase tracking-wide"
                        style={{ backgroundColor: tagBg, color: textColor }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <p className="font-body text-on-surface-variant text-sm leading-relaxed">{bio}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Team CTA */}
          <div className="mt-16 text-center">
            <Link
              href="/booking"
              className="bg-tertiary-container text-on-primary rounded-full px-8 py-4 font-label text-sm uppercase tracking-wider font-semibold inline-flex items-center gap-2 hover:opacity-90 transition-opacity active:scale-95 duration-200"
              style={{ boxShadow: "0 8px 16px rgba(0,112,235,0.2)" }}
            >
              Online Termin direkt beim Wunschmitarbeiter buchen
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
