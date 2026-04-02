import Link from "next/link";
import type { Metadata } from "next";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import BookingForm from "../../components/BookingForm";

export const metadata: Metadata = {
  title: "Termin buchen — Vienna Glow Studio",
  description: "Buchen Sie Ihren Termin bei Vienna Glow Studio bequem online.",
};

export default function BookingPage() {
  return (
    <>
      <Header />
      <main className="py-16 sm:py-24" style={{ backgroundColor: "var(--color-background)" }}>
        <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <nav className="mb-8 text-sm" style={{ color: "var(--color-text-muted)" }}>
            <Link href="/" className="hover:opacity-70 transition-opacity">
              Startseite
            </Link>
            <span className="mx-2">›</span>
            <span style={{ color: "var(--color-primary)" }}>Termin buchen</span>
          </nav>

          {/* Header */}
          <div className="mb-10">
            <p
              className="mb-2 text-xs font-semibold uppercase tracking-widest"
              style={{ color: "var(--color-secondary)" }}
            >
              Online Terminbuchung
            </p>
            <h1
              className="font-heading text-3xl font-semibold sm:text-4xl"
              style={{ color: "var(--color-primary)" }}
            >
              Termin anfragen
            </h1>
            <p className="mt-3 text-base" style={{ color: "var(--color-text-muted)" }}>
              Füllen Sie das Formular aus — wir melden uns innerhalb von 24 Stunden
              zur Terminbestätigung.
            </p>
          </div>

          {/* Form */}
          <BookingForm />
        </div>
      </main>
      <Footer />
    </>
  );
}
