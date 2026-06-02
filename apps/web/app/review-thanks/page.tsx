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
    title: dict.legal.meta.reviewThanksTitle.replace("{clientName}", config.clientName),
  };
}

export default async function ReviewThanksPage() {
  const dict = getDictionary(await getLocale());
  const r = dict.legal.reviewThanks;

  return (
    <div style={{ background: "var(--color-bg-surface)", minHeight: "100vh", padding: "120px 16px 96px" }}>
      <div style={{ maxWidth: "620px", margin: "0 auto" }}>
        <div style={{
          background: "var(--color-bg-card)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-xl)",
          boxShadow: "var(--shadow-elevated)",
          padding: "48px 40px 40px",
          textAlign: "center",
        }}>
          <div style={{
            width: "96px", height: "96px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, var(--color-accent) 0%, var(--color-purple) 100%)",
            color: "#fff",
            fontSize: "44px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 22px",
            boxShadow: "var(--shadow-accent)",
          }}>
            ⭐
          </div>

          <h1 style={{ fontSize: "28px", fontWeight: 700, margin: "0 0 8px", letterSpacing: "-0.02em" }}>
            {r.heading}
          </h1>
          <p style={{ color: "var(--color-text-muted)", fontSize: "15px", marginBottom: "28px", lineHeight: 1.55, maxWidth: "420px", margin: "0 auto 28px" }}>
            {r.body}
          </p>

          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "20px",
            color: "var(--color-amber)",
            marginBottom: "28px",
          }}>
            ★★★★★
          </div>

          <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/booking" className="btn btn-primary btn-lg">
              {r.rebookCta}
            </Link>
            <Link href="/" className="btn btn-ghost btn-lg">
              {r.homeCta}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
