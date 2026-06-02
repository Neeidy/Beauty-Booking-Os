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
    title: dict.legal.meta.datenschutzTitle.replace("{clientName}", config.clientName),
    robots: { index: false, follow: false },
  };
}

export default async function DatenschutzPage() {
  const dict = getDictionary(await getLocale());
  const config = loadClientConfig();
  const d = dict.legal.datenschutz;
  const email = config.gdpr.dataControllerEmail;

  return (
    <div style={{ background: "var(--color-bg-surface)", minHeight: "100vh", padding: "120px 16px 96px" }}>
      <div style={{ maxWidth: "760px", margin: "0 auto" }}>
        <div style={{
          background: "var(--color-bg-card)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-xl)",
          boxShadow: "var(--shadow-elevated)",
          padding: "48px",
        }}>
          <div style={{ paddingBottom: "24px", borderBottom: "1px solid var(--color-border)", marginBottom: "24px" }}>
            <h1 style={{ fontSize: "28px", fontWeight: 700, margin: "0 0 6px" }}>
              {d.heading}
            </h1>
            <p style={{ color: "var(--color-text-muted)", fontSize: "15px", margin: 0 }}>
              {d.subtitle.replace("{clientName}", config.clientName)}
            </p>
          </div>

          <div style={{ marginBottom: "28px" }}>
            <h3 style={{ fontSize: "15px", fontWeight: 600, margin: "0 0 8px" }}>{d.controllerHeading}</h3>
            <p style={{ margin: "0 0 8px", fontSize: "13px", lineHeight: 1.65, color: "var(--color-text-secondary)" }}>
              {d.controllerBody
                .replace("{name}", config.gdpr.dataControllerName)
                .replace("{address}", config.contact.address)}<br />
              {d.controllerEmailLabel} <a href={`mailto:${email}`} style={{ color: "var(--color-accent)" }}>{email}</a>
            </p>
          </div>

          <div style={{ marginBottom: "28px" }}>
            <h3 style={{ fontSize: "15px", fontWeight: 600, margin: "0 0 8px" }}>{d.purposeHeading}</h3>
            <p style={{ margin: "0 0 8px", fontSize: "13px", lineHeight: 1.65, color: "var(--color-text-secondary)" }}>
              {d.purposeBody}
            </p>
          </div>

          <div style={{ marginBottom: "28px" }}>
            <h3 style={{ fontSize: "15px", fontWeight: 600, margin: "0 0 8px" }}>{d.rightsHeading}</h3>
            <p style={{ margin: "0 0 8px", fontSize: "13px", lineHeight: 1.65, color: "var(--color-text-secondary)" }}>
              {d.rightsBody}
            </p>
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginTop: "16px" }}>
              <Link href="/gdpr/export" className="btn btn-ghost btn-sm">{d.exportBtn}</Link>
              <Link href="/gdpr/delete" className="btn btn-ghost btn-sm">{d.deleteBtn}</Link>
            </div>
          </div>

          <div style={{ marginBottom: "28px" }}>
            <h3 style={{ fontSize: "15px", fontWeight: 600, margin: "0 0 8px" }}>{d.storageHeading}</h3>
            <p style={{ margin: "0 0 8px", fontSize: "13px", lineHeight: 1.65, color: "var(--color-text-secondary)" }}>
              {d.storageBody}
            </p>
          </div>

          <div style={{ marginTop: "32px", paddingTop: "24px", borderTop: "1px solid var(--color-border)" }}>
            <Link href="/" className="btn btn-ghost btn-sm">{d.backHome}</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
