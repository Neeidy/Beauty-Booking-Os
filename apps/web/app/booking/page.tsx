import Link from "next/link";
import type { Metadata } from "next";
import BookingForm from "../../components/BookingForm";
import { loadClientConfig } from "../../lib/load-client-config";
import { getLocale } from "@/lib/i18n/server";
import { getDictionary } from "@/lib/i18n/dictionary";

export const dynamic = "force-dynamic";

const config = loadClientConfig();

export async function generateMetadata(): Promise<Metadata> {
  const dict = getDictionary(await getLocale());
  return {
    title: dict.booking.meta.bookTitle.replace("{clientName}", config.clientName),
    description: dict.booking.meta.bookDescription.replace("{clientName}", config.clientName),
  };
}

export default async function BookingPage() {
  const dict = getDictionary(await getLocale());

  return (
    <>
      {/* Top Bar */}
      <div className="booking-topbar">
        <div className="container-wide booking-topbar-inner">
          <Link href="/" className="booking-back">{dict.booking.back}</Link>
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
