import Link from "next/link";
import type { Metadata } from "next";
import { loadClientConfig } from "../../../lib/load-client-config";
import { getLocale } from "@/lib/i18n/server";
import { getDictionary } from "@/lib/i18n/dictionary";

export const dynamic = "force-dynamic";

const config = loadClientConfig();

export async function generateMetadata(): Promise<Metadata> {
  const dict = getDictionary(await getLocale());
  return {
    title: dict.booking.meta.thanksTitle.replace("{clientName}", config.clientName),
    description: dict.booking.meta.thanksDescription,
  };
}

export default async function ThankYouPage() {
  const dict = getDictionary(await getLocale());
  const t = dict.booking.thanks;

  const showWhatsApp =
    config.channels.whatsapp === true &&
    typeof config.contact.whatsappNumber === "string" &&
    config.contact.whatsappNumber.length > 0;

  const whatsappUrl = showWhatsApp && config.contact.whatsappNumber
    ? `https://wa.me/${config.contact.whatsappNumber.replace(/\D/g, "")}`
    : null;

  const reviewUrl =
    (config as { googleBusiness?: { reviewUrl?: string } }).googleBusiness?.reviewUrl ?? null;

  return (
    <>
      <div className="booking-topbar">
        <div className="container-wide booking-topbar-inner">
          <span style={{ width: "80px" }}></span>
          <Link href="/" className="site-brand">
            <span className="site-brand-diamond"></span>
            {config.clientName}
          </Link>
          <span style={{ width: "80px" }}></span>
        </div>
      </div>

      <main className="thanks-wrap">
        <div className="thanks-card">
          <div className="thanks-hero">✓</div>

          <h1>{t.heading}</h1>
          <p className="sub">
            {t.leadPrefix}
            <strong>{t.leadHours}</strong>
            {t.leadSuffix}
          </p>

          {/* Contact options */}
          <div style={{
            background: "var(--color-bg-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            padding: "16px 20px",
            marginBottom: "24px",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            textAlign: "left",
          }}>
            <p style={{ fontSize: "12px", color: "var(--color-text-muted)", margin: "0 0 4px" }}>
              {t.questions}
            </p>
            <a
              href={`tel:${config.contact.phone.replace(/\s/g, "")}`}
              style={{ fontSize: "14px", color: "var(--color-accent)", fontWeight: 500, textDecoration: "none" }}
            >
              📞 {config.contact.phone}
            </a>
            <a
              href={`mailto:${config.contact.email}`}
              style={{ fontSize: "14px", color: "var(--color-accent)", fontWeight: 500, textDecoration: "none" }}
            >
              ✉ {config.contact.email}
            </a>
            {showWhatsApp && whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: "14px", color: "var(--color-accent)", fontWeight: 500, textDecoration: "none" }}
              >
                💬 WhatsApp
              </a>
            )}
          </div>

          {/* Google review CTA */}
          {reviewUrl && (
            <a href={reviewUrl} target="_blank" rel="noopener noreferrer" className="google-cta">
              <svg className="g-logo" width="20" height="20" viewBox="0 0 18 18">
                <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.79 2.71v2.26h2.9c1.7-1.56 2.69-3.87 2.69-6.61z"/>
                <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.83.86-3.06.86-2.34 0-4.33-1.58-5.04-3.71h-3v2.33A9 9 0 0 0 9 18z"/>
                <path fill="#FBBC05" d="M3.96 10.71A5.4 5.4 0 0 1 3.68 9c0-.59.1-1.17.28-1.71V4.96h-3A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.04l3-2.33z"/>
                <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 9 0 9 9 0 0 0 .96 4.96l3 2.33C4.67 5.16 6.66 3.58 9 3.58z"/>
              </svg>
              <span>{t.reviewCta}</span>
            </a>
          )}

          {/* Rebook CTA */}
          <div className="rebook-cta">
            <strong>{t.rebookHeading}</strong>
            <p>{t.rebookText}</p>
            <Link href="/booking" className="btn btn-primary btn-sm">{t.rebookCta}</Link>
          </div>

          <p style={{ marginTop: "28px", fontSize: "11px", color: "var(--color-text-faint)" }}>
            <Link href="/datenschutz" style={{ color: "inherit", textDecoration: "underline" }}>{t.privacy}</Link>
            {" · "}
            <Link href="/" style={{ color: "inherit", textDecoration: "underline" }}>{t.backHome}</Link>
          </p>
        </div>
      </main>
    </>
  );
}
