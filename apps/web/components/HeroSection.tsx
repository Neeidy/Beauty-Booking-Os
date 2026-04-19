import Link from "next/link";

export default function HeroSection() {
  return (
    <main
      className="min-h-[calc(100vh-72px)] relative flex items-center pt-12 pb-24 lg:py-0 overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #FAFAFA 0%, #F3F0FF 50%, #FFF0F3 100%)",
      }}
    >
      <div className="max-w-7xl mx-auto px-8 w-full">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
          {/* Left: Content */}
          <div className="flex flex-col gap-8 relative z-10">
            {/* Badge */}
            <div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full w-fit"
              style={{ backgroundColor: "#F3F0FF", color: "#7C3AED" }}
            >
              <span className="text-sm font-medium tracking-wide font-body">
                ✨ Wien 1060 · Nägel · Haare · Beauty · Epilasyon
              </span>
            </div>

            {/* Headline */}
            <h1 className="font-headline font-extrabold text-[4rem] leading-[1.1] tracking-[-0.02em] text-on-surface">
              Schönheit,
              <br />
              <span
                style={{
                  background: "linear-gradient(to right, #037AFF, #8B5CF6)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                die bleibt.
              </span>
            </h1>

            {/* Subheadline */}
            <p className="font-body text-lg text-on-surface-variant leading-relaxed max-w-lg">
              Professionelle Nagelpflege, Haarstyling, Gesichtsbehandlungen und
              Haarentfernung — in Ihrem Premium Studio in Wien.
            </p>

            {/* Service Pills */}
            <div className="flex flex-wrap gap-3">
              {[
                { label: "Nägel",    dot: "bg-vgs-primary" },
                { label: "Haare",    dot: "bg-vgs-secondary" },
                { label: "Facial",   dot: "bg-tertiary" },
                { label: "Wimpern",  dot: "bg-primary-container" },
                { label: "Epilasyon",dot: "bg-secondary-container" },
              ].map(({ label, dot }) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-2 bg-surface-container-highest px-4 py-2 rounded-xl text-sm font-medium text-on-surface"
                >
                  <span className={`w-2 h-2 rounded-full ${dot}`} />
                  {label}
                </span>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-4 mt-4">
              <Link
                href="/booking"
                className="flex items-center gap-2 px-8 py-4 rounded-full font-body font-medium tracking-wide text-white hover:opacity-90 transition-opacity"
                style={{ backgroundColor: "#037AFF" }}
              >
                Jetzt Termin buchen
                <span className="material-symbols-outlined text-lg">arrow_forward</span>
              </Link>
              <a
                href="#hizmetler"
                className="px-8 py-4 rounded-full font-body font-medium tracking-wide text-on-surface bg-transparent border border-outline-variant hover:bg-surface-container-low transition-colors"
              >
                Leistungen entdecken
              </a>
            </div>

            {/* Trust Row */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-6 text-sm text-on-surface-variant font-body">
              <div className="flex items-center gap-1">
                <span className="text-yellow-500 tracking-tighter">★★★★★</span>
                <span>Google Bewertung</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-green-600">✓</span>
                <span>Online buchbar 24/7</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-green-600">✓</span>
                <span>Sofort verfügbar</span>
              </div>
            </div>
          </div>

          {/* Right: Hero Image */}
          <div className="relative hidden lg:block">
            <div
              className="absolute inset-0 rounded-[24px] transform translate-x-4 translate-y-4 -z-10"
              style={{
                background: "linear-gradient(to top right, rgba(255,178,183,0.2), transparent)",
              }}
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAlwzP6eusoBO3hewlT87ZzwF0d35z9OT22qO6qVUCoq_nXYBO4y_1oOgLYFSG1DhGVbLWqLxFaZycHffSN8NKbREymRYekJKIYbxEtuzPQnDLc0DItynuu3KbojLX6JuenObnJBrA9ach39MKna2ZKK_Y5S-eRzloiX-QjS6fAKPBGLVLOCUTLHyvJ0lDl6c9bATMBlFyil4h4LrORFqN-oX9s7oZaRNYIPTmWIzo32np75Jso5OcKlvlIS0CFzamSi-jjoi5pUf6z"
              alt="Luxurious beauty salon interior"
              className="w-full h-auto aspect-[4/5] object-cover rounded-[24px] relative z-10 border border-white/40"
              style={{ boxShadow: "0 40px 80px -20px rgba(91,64,65,0.08)" }}
            />
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex flex-col items-center gap-2 text-on-surface-variant opacity-70">
        <span className="text-xs uppercase tracking-widest font-medium font-body">
          Mehr entdecken
        </span>
        <span className="material-symbols-outlined animate-bounce">expand_more</span>
      </div>
    </main>
  );
}
