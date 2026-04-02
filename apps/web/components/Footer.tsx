import Link from "next/link";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      id="kontakt"
      className="border-t py-14"
      style={{
        backgroundColor: "var(--color-primary)",
        borderColor: "#3d3430",
      }}
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
          {/* Salon info */}
          <div>
            <h3
              className="font-heading text-lg font-semibold"
              style={{ color: "var(--color-background)" }}
            >
              Vienna Glow Studio
            </h3>
            <p
              className="mt-3 text-sm leading-relaxed"
              style={{ color: "var(--color-accent)" }}
            >
              Premium Beauty Studio in Wien —<br />
              Nails, Gesichtspflege, Wimpern &amp; Brauen.
            </p>
          </div>

          {/* Contact */}
          <div>
            <h4
              className="text-sm font-semibold uppercase tracking-wider"
              style={{ color: "var(--color-secondary)" }}
            >
              Kontakt
            </h4>
            <ul className="mt-4 space-y-2 text-sm" style={{ color: "var(--color-accent)" }}>
              <li>
                <a
                  href="tel:+4312345678"
                  className="hover:opacity-70 transition-opacity"
                >
                  +43 1 234 5678
                </a>
              </li>
              <li>
                <a
                  href="mailto:hello@viennaglowstudio.at"
                  className="hover:opacity-70 transition-opacity"
                >
                  hello@viennaglowstudio.at
                </a>
              </li>
              <li>Mariahilfer Straße 45, 1060 Wien</li>
            </ul>
          </div>

          {/* Opening hours */}
          <div>
            <h4
              className="text-sm font-semibold uppercase tracking-wider"
              style={{ color: "var(--color-secondary)" }}
            >
              Öffnungszeiten
            </h4>
            <ul className="mt-4 space-y-1 text-sm" style={{ color: "var(--color-accent)" }}>
              <li className="flex justify-between gap-4">
                <span>Mo – Mi</span>
                <span>09:00 – 19:00</span>
              </li>
              <li className="flex justify-between gap-4">
                <span>Do</span>
                <span>09:00 – 21:00</span>
              </li>
              <li className="flex justify-between gap-4">
                <span>Fr</span>
                <span>09:00 – 19:00</span>
              </li>
              <li className="flex justify-between gap-4">
                <span>Sa</span>
                <span>10:00 – 17:00</span>
              </li>
              <li className="flex justify-between gap-4">
                <span>So</span>
                <span>Geschlossen</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          className="mt-12 flex flex-col gap-3 border-t pt-8 text-xs sm:flex-row sm:items-center sm:justify-between"
          style={{
            borderColor: "#3d3430",
            color: "var(--color-text-muted)",
          }}
        >
          <span style={{ color: "var(--color-accent)", opacity: 0.6 }}>
            © {currentYear} Vienna Glow Studio GmbH. Alle Rechte vorbehalten.
          </span>
          <div className="flex gap-4">
            <Link
              href="/datenschutz"
              className="hover:opacity-70 transition-opacity"
              style={{ color: "var(--color-accent)", opacity: 0.6 }}
            >
              Datenschutzerklärung
            </Link>
            <Link
              href="/impressum"
              className="hover:opacity-70 transition-opacity"
              style={{ color: "var(--color-accent)", opacity: 0.6 }}
            >
              Impressum
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
