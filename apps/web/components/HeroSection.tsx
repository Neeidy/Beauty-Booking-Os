import Link from "next/link";

export default function HeroSection() {
  return (
    <section
      className="relative overflow-hidden py-20 sm:py-28 lg:py-36"
      style={{ backgroundColor: "var(--color-primary)" }}
    >
      {/* Subtle background texture */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage:
            "radial-gradient(ellipse at 70% 50%, var(--color-secondary) 0%, transparent 60%)",
        }}
      />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          {/* Eyebrow */}
          <p
            className="mb-4 text-sm font-medium uppercase tracking-widest"
            style={{ color: "var(--color-secondary)" }}
          >
            Premium Beauty Studio · Wien 1060
          </p>

          {/* Heading */}
          <h1
            className="font-heading text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl"
            style={{ color: "var(--color-background)" }}
          >
            Schönheit,
            <br />
            <span style={{ color: "var(--color-secondary)" }}>die bleibt.</span>
          </h1>

          {/* Subheading */}
          <p
            className="mt-6 text-base leading-relaxed sm:text-lg"
            style={{ color: "var(--color-accent)" }}
          >
            Nails, Gesichtspflege, Wimpern &amp; Brauen — professionell und mit
            Liebe zum Detail. Buchen Sie Ihren Wunschtermin bequem online.
          </p>

          {/* CTAs */}
          <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
            <Link
              href="/booking"
              className="inline-flex items-center justify-center rounded-sm px-8 py-3.5 text-sm font-semibold transition-opacity hover:opacity-90"
              style={{
                backgroundColor: "var(--color-secondary)",
                color: "var(--color-primary)",
              }}
            >
              Jetzt Termin buchen
            </Link>
            <a
              href="#hizmetler"
              className="inline-flex items-center justify-center rounded-sm border px-8 py-3.5 text-sm font-medium transition-colors hover:opacity-80"
              style={{
                borderColor: "var(--color-accent)",
                color: "var(--color-accent)",
              }}
            >
              Leistungen ansehen
            </a>
          </div>

          {/* Trust signals */}
          <div
            className="mt-12 flex flex-wrap gap-6 text-sm"
            style={{ color: "var(--color-accent)" }}
          >
            <span>✓ Online buchbar</span>
            <span>✓ Flexible Termine</span>
            <span>✓ Professionelle Behandlungen</span>
          </div>
        </div>
      </div>
    </section>
  );
}
