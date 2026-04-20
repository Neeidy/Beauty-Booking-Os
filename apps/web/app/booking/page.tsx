import Link from "next/link";
import type { Metadata } from "next";
import BookingForm from "../../components/BookingForm";
import { loadClientConfig } from "../../lib/load-client-config";

const config = loadClientConfig();

export const metadata: Metadata = {
  title: `Termin buchen — ${config.clientName}`,
  description: `Buchen Sie Ihren Termin bei ${config.clientName} bequem online.`,
};

export default function BookingPage() {
  return (
    <>
      {/* Top Bar */}
      <div className="booking-topbar">
        <div className="container-wide booking-topbar-inner">
          <Link href="/" className="booking-back">← Zurück</Link>
          <Link href="/" className="site-brand">
            <span className="site-brand-diamond"></span>
            {config.clientName}
          </Link>
          <span style={{ width: "80px" }}></span>
        </div>
      </div>

      {/* Page Body */}
      <main className="booking-wrap">
        <div className="booking-card">
          <BookingForm />
        </div>
      </main>
    </>
  );
}
