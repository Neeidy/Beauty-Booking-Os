import Link from "next/link";

export default function Header() {
  return (
    <header
      className="sticky top-0 z-50 border-b"
      style={{
        backgroundColor: "var(--color-background)",
        borderColor: "var(--color-accent)",
      }}
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo / Salon Name */}
          <Link href="/" className="flex items-center gap-2">
            <span
              className="text-xl font-heading font-semibold tracking-wide"
              style={{ color: "var(--color-primary)" }}
            >
              Vienna Glow Studio
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <a
              href="#hizmetler"
              className="text-sm font-medium transition-colors hover:opacity-70"
              style={{ color: "var(--color-text-muted)" }}
            >
              Leistungen
            </a>
            <a
              href="#kontakt"
              className="text-sm font-medium transition-colors hover:opacity-70"
              style={{ color: "var(--color-text-muted)" }}
            >
              Kontakt
            </a>
            <Link
              href="/booking"
              className="rounded-sm px-5 py-2 text-sm font-medium transition-opacity hover:opacity-90"
              style={{
                backgroundColor: "var(--color-secondary)",
                color: "var(--color-background)",
              }}
            >
              Jetzt Termin buchen
            </Link>
          </nav>

          {/* Mobile: CTA only */}
          <div className="md:hidden">
            <Link
              href="/booking"
              className="rounded-sm px-4 py-2 text-sm font-medium"
              style={{
                backgroundColor: "var(--color-secondary)",
                color: "var(--color-background)",
              }}
            >
              Termin buchen
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
