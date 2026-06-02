import Link from "next/link";
import type { Metadata } from "next";
import { loadClientConfig } from "@/lib/load-client-config";
import { getLocale } from "@/lib/i18n/server";
import { getDictionary } from "@/lib/i18n/dictionary";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const dict = getDictionary(await getLocale());
  const config = loadClientConfig();
  return {
    title: dict.legal.meta.deleteTitle.replace("{clientName}", config.clientName),
    robots: { index: false, follow: false },
  };
}

export default async function GdprDeletePage() {
  const dict = getDictionary(await getLocale());
  const config = loadClientConfig();
  const dl = dict.legal.delete;
  const email = config.gdpr.dataControllerEmail;

  return (
    <div style={{ background: "var(--color-bg-surface)", minHeight: "100vh", padding: "120px 16px 96px" }}>
      <div style={{ maxWidth: "620px", margin: "0 auto" }}>
        <div style={{
          background: "var(--color-bg-card)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-xl)",
          boxShadow: "var(--shadow-elevated)",
          padding: "48px 40px 40px",
        }}>
          <h1 style={{ fontSize: "28px", fontWeight: 700, margin: "0 0 8px" }}>
            {dl.heading}
          </h1>
          <p style={{ color: "var(--color-text-muted)", fontSize: "15px", marginBottom: "32px", lineHeight: 1.55 }}>
            {dl.intro}
          </p>

          <div style={{
            background: "var(--color-bg-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            padding: "20px 24px",
            marginBottom: "24px",
          }}>
            <p style={{ fontSize: "13px", color: "var(--color-text-secondary)", margin: "0 0 12px" }}>
              <strong>{dl.emailLabel}</strong>
            </p>
            <a
              href={`mailto:${email}?subject=${encodeURIComponent(dl.mailtoSubject)}`}
              className="btn btn-primary"
            >
              ✉ {email}
            </a>
          </div>

          <p style={{ fontSize: "12px", color: "var(--color-text-faint)", marginBottom: "24px", lineHeight: 1.6 }}>
            {dl.note}
          </p>

          <Link href="/datenschutz" className="btn btn-ghost btn-sm">{dl.backLink}</Link>
        </div>
      </div>
    </div>
  );
}
