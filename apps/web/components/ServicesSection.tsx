import Link from "next/link";

const SERVICES = [
  {
    title: "Nagelstudio",
    desc: "Gel Maniküre · Acryl · Nail Art · Pediküre",
    price: "ab € 35,–",
    accent: "#8B5CF6",
    badge: "Beliebt 🔥",
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuBPzCMEe9bI4jq4QC7h0vodoiJ7OnW3pb1CDm0LIqdlvtYLy208AGUoEFW-piPGPHtsjarHnA4aOxuwi7oC6a653aT_Hexsd6Baco5gEqgy3m9rJRNfSKKnrGlXR4vXZLAGpIfylj5p4TMR-G1VDNkJf_R2APovpdqg9RME4moS8Hr1SR9TKAhg_wd24Or7qbm9JtX9B6lsNUJjxGVecBi00npjuy_ROSTaJbL9alNzSRgC17n_edNSFvzxySCvHrwRG9dOLN3oICbY",
    alt: "Nagelstudio",
  },
  {
    title: "Haarstyling",
    desc: "Damenschnitt · Herrenschnitt · Coloration · Balayage",
    price: "ab € 25,–",
    accent: "#F59E0B",
    badge: null,
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuD0NBkiH1z6koF4-GJLmlNJOrd-qhyt0qiKQTob3aYxBh11Y8sSU56fk49MrS18xvlihQin2LEO5vWYuj72cpMtHIXs7czMPJe3pUZtkaZ-PyOQsfFSsWx_v8HACvRzwSKu4d73QL2BKSts6XX5p6nr_T_UckVyxhdFI-D_KZkY0JzUNSk085rf1KIlWqNwoszsNsAwCdGptdXCx-NDNGwArgQnU7fz5DVCrARCM47ewatgxHGJiIfAIe0udbfLq1tm9dC_jOGqCY7K",
    alt: "Haarstyling",
  },
  {
    title: "Gesichtspflege",
    desc: "HydraFacial · Peeling · Anti-Aging",
    price: "ab € 55,–",
    accent: "#10B981",
    badge: null,
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuBQ4Jtn-dQtEC7hcTlo3krnvv9d6nQMyNfOGdyZ5Q5JK4WNKhaNM4I4bkZ23lL3Fh2F5Dn3cnKBG4bN_Z8sHaa_rKnhnBSbZzeIneSv_VaFLKmomTcv0GEwP8gQoGcxaVkQ4CO7oRAQ84Ih1SQlaj4dICVuD3qZ1ncfv19HqDNRDeOzA01HHcEarBIaMDjzRaxSb_diMA-evl-lKtBi4F0Sluq-ZZe5_VZdN-d1O1hWK9TgnaNy5DCo4bw11no0QKmqtzjAu-Rswu8x",
    alt: "Gesichtspflege",
  },
  {
    title: "Wimpern & Brauen",
    desc: "Wimpernlifting · Tinting · Brow Lamination",
    price: "ab € 45,–",
    accent: "#F43F5E",
    badge: "Trending ✨",
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuB5wiVHkM1KEmn4Sq2kcqScAHBtxKr6rbYVfRQpchxTMVC8tgRwYEM_RETpP0LWJuzXO3Ni3CRMpyiIhpXbf5gVwQ8O-nZLEA_3J7sKA5I25BZ9iJcVMHNRJyKIlH5E__EjfBEeT-ub10prma2tkamI8ss_RgldVIfNTLpGuN0Y_JCjmWGfgJN61ZRN2DKCQTuKtafAHOTsHhXc6-niRVRxDHOtO0MgBVuqDQHrf2LVfI9XWZC2KfstW-PgBxEVBDwJiOHLfYeXC1y-",
    alt: "Wimpern & Brauen",
  },
  {
    title: "Epilasyon & Waxing",
    desc: "Ganzkörper · Brazilian · Gesicht · Achseln",
    price: "ab € 20,–",
    accent: "#F43F5E",
    badge: null,
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuBqxQI0mb0wlUTDvRK2a8nlo6gtfFm89MdvxpE8fpTaPAgMPjSPs-DefWlnO5RVjo7zO7BelOSRl8R2jZh6uWaWwUS_cEpEyH5XIrNRCBj35BWWhFpjnQsUt2UdCOQBULUYIdeZfuHhECXYjgGKI5Cz1454HQjj78EB34hf4xAKqW82mC6D7tTMbh4jQGc8OBxCAiv-6DYNIMkJFNwYp2vYY0WQ8bDi3ek32Dz0kG34EVaFxCW4HbrKSGTj4JwC_t0hiX8PVOWuI",
    alt: "Epilasyon & Waxing",
  },
  {
    title: "Herrenfriseur",
    desc: "Haarschnitt · Bartpflege · Styling · Rasur",
    price: "ab € 25,–",
    accent: "#06B6D4",
    badge: null,
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuA-MICEqHzRUq7fWwux6dAlp2KalzPnKpShQBqmHJ_r2Gb3DaTHzRQrZdU_UWaR73MWaPtDrFwhJVHvWiGus1UQ2OzJifOoSrZvxc_D1ZSEQI9Sf8-mbIDtJUOAtxxmFxpGV6lNFvOBoB7oR5A0POwUZSPFjY3YAQFYR3s_Ijlk-rWG_Xpg5s8G8WJivx-JWwdfSmPfcca4KzYiBPYgRTPSrYVXdOqcPrtNIbbs7-XCxWCWsmaWPb_2kkIxDkFSy326LY0UHRzeAPdR",
    alt: "Herrenfriseur",
  },
];

export default function ServicesSection() {
  return (
    <section id="hizmetler" className="py-24 bg-background">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-[12px] uppercase tracking-[0.15em] text-on-surface-variant mb-3 font-label font-medium">
            UNSER ANGEBOT
          </p>
          <h2 className="text-[3.5rem] leading-tight font-headline font-light tracking-tight text-on-surface mb-6">
            Alles für Ihre Schönheit
          </h2>
          <p className="text-[17px] text-on-surface-variant font-body font-light leading-relaxed">
            Entdecken Sie unser exklusives Angebot an Behandlungen. Wir verwenden nur die
            hochwertigsten Produkte für Ihr Wohlbefinden.
          </p>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {SERVICES.map(({ title, desc, price, accent, badge, img, alt }) => (
            <div
              key={title}
              className="group relative bg-surface-container-lowest rounded-xl overflow-hidden transition-all duration-500 hover:-translate-y-2 border border-outline-variant/20 flex flex-col h-full"
              style={{
                borderLeftWidth: "3px",
                borderLeftColor: accent,
                boxShadow: "0 0 0 0 transparent",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.boxShadow =
                  "0 20px 40px rgba(0,0,0,0.06)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.boxShadow = "0 0 0 0 transparent";
              }}
            >
              {/* Image */}
              <div className="h-[200px] w-full overflow-hidden relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img}
                  alt={alt}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                {badge && (
                  <div
                    className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-medium shadow-sm"
                    style={{ color: accent }}
                  >
                    {badge}
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-6 flex flex-col flex-grow">
                <h3 className="text-xl font-headline font-medium text-on-surface mb-2">
                  {title}
                </h3>
                <p className="text-sm text-on-surface-variant font-body mb-6 flex-grow">
                  {desc}
                </p>
                <div className="flex items-center justify-between mt-auto pt-4 border-t border-surface-container-high/50">
                  <span className="text-sm font-medium text-on-surface">{price}</span>
                  <Link
                    href="/booking"
                    className="w-8 h-8 rounded-full bg-surface-container-low flex items-center justify-center text-on-surface transition-colors"
                    style={{}}
                    aria-label={`${title} buchen`}
                  >
                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 text-center">
          <Link
            href="/booking"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full border border-outline-variant/30 text-on-surface hover:bg-surface-container-low transition-colors font-body font-medium text-sm"
          >
            Alle Leistungen &amp; Preise ansehen
            <span className="material-symbols-outlined text-[18px]">arrow_right_alt</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
