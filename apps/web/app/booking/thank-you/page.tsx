import Link from "next/link";
import type { Metadata } from "next";
import Header from "../../../components/Header";
import Footer from "../../../components/Footer";

export const metadata: Metadata = {
  title: "Vielen Dank — Vienna Glow Studio",
  description: "Ihre Terminanfrage wurde erfolgreich übermittelt.",
};

export default function ThankYouPage() {
  return (
    <>
      <Header />
      <main
        className="flex min-h-[70vh] items-center py-20"
        style={{ backgroundColor: "var(--color-background)" }}
      >
        <div className="mx-auto max-w-2xl px-4 text-center sm:px-6 lg:px-8">
          {/* Success icon */}
          <div
            className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-full"
            style={{ backgroundColor: "var(--color-accent)" }}
          >
            <svg
              className="h-10 w-10"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
              style={{ color: "var(--color-secondary)" }}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.5 12.75l6 6 9-13.5"
              />
            </svg>
          </div>

          {/* Heading */}
          <h1
            className="font-heading text-3xl font-semibold sm:text-4xl"
            style={{ color: "var(--color-primary)" }}
          >
            Vielen Dank!
          </h1>
          <p
            className="mt-4 text-base leading-relaxed"
            style={{ color: "var(--color-text-muted)" }}
          >
            Ihre Anfrage wurde erfolgreich übermittelt. Wir melden uns innerhalb
            von <strong style={{ color: "var(--color-primary)" }}>24 Stunden</strong> bei
            Ihnen zur Terminbestätigung.
          </p>

          {/* Divider */}
          <div
            className="my-10 border-t"
            style={{ borderColor: "var(--color-accent)" }}
          />

          {/* Contact info */}
          <div className="space-y-2">
            <p
              className="text-sm font-semibold uppercase tracking-wider"
              style={{ color: "var(--color-secondary)" }}
            >
              Sie haben Fragen? Wir sind für Sie da.
            </p>
            <div
              className="mt-4 flex flex-col items-center gap-3 text-sm sm:flex-row sm:justify-center sm:gap-8"
              style={{ color: "var(--color-text-muted)" }}
            >
              <a
                href="tel:+4312345678"
                className="flex items-center gap-2 hover:opacity-70 transition-opacity"
                style={{ color: "var(--color-primary)" }}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                </svg>
                +43 1 234 5678
              </a>
              <a
                href="mailto:hello@viennaglowstudio.at"
                className="flex items-center gap-2 hover:opacity-70 transition-opacity"
                style={{ color: "var(--color-primary)" }}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
                hello@viennaglowstudio.at
              </a>
              <a
                href="https://wa.me/4312345678"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 hover:opacity-70 transition-opacity"
                style={{ color: "var(--color-primary)" }}
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                WhatsApp
              </a>
            </div>
          </div>

          {/* Back button */}
          <div className="mt-12">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-sm border px-6 py-3 text-sm font-medium transition-colors hover:opacity-80"
              style={{
                borderColor: "var(--color-primary)",
                color: "var(--color-primary)",
              }}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
              Zurück zur Startseite
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
