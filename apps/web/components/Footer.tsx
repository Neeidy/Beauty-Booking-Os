import Link from "next/link";
import { loadClientConfig } from "@/lib/load-client-config";

function formatDay(day: string): string {
  const map: Record<string, string> = {
    monday: "Montag",
    tuesday: "Dienstag",
    wednesday: "Mittwoch",
    thursday: "Donnerstag",
    friday: "Freitag",
    saturday: "Samstag",
    sunday: "Sonntag",
  };
  return map[day] ?? day;
}

export default function Footer() {
  const config = loadClientConfig();
  const currentYear = new Date().getFullYear();

  const showWhatsApp =
    config.channels.whatsapp === true &&
    typeof config.contact.whatsappNumber === "string" &&
    config.contact.whatsappNumber.length > 0;

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
              {config.clientName}
            </h3>
            <p
              className="mt-3 text-sm leading-relaxed"
              style={{ color: "var(--color-accent)" }}
            >
              {config.contact.address}
            </p>
            {config.contact.googleMapsUrl && (
              <a
                href={config.contact.googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block text-xs hover:opacity-70 transition-opacity"
                style={{ color: "var(--color-secondary)" }}
              >
                Auf Google Maps ansehen
              </a>
            )}
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
                  href={`tel:${config.contact.phone.replace(/\s/g, "")}`}
                  className="hover:opacity-70 transition-opacity"
                >
                  {config.contact.phone}
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${config.contact.email}`}
                  className="hover:opacity-70 transition-opacity"
                >
                  {config.contact.email}
                </a>
              </li>
              {config.contact.instagramHandle && (
                <li>
                  <a
                    href={`https://instagram.com/${config.contact.instagramHandle.replace(/^@/, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:opacity-70 transition-opacity"
                  >
                    {config.contact.instagramHandle}
                  </a>
                </li>
              )}
              {showWhatsApp && config.contact.whatsappNumber && (
                <li>
                  <a
                    href={`https://wa.me/${config.contact.whatsappNumber.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:opacity-70 transition-opacity"
                  >
                    WhatsApp
                  </a>
                </li>
              )}
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
              {Object.entries(config.operatingHours).map(([day, hours]) => (
                <li key={day} className="flex justify-between gap-4">
                  <span>{formatDay(day)}</span>
                  <span>
                    {hours === null
                      ? "Geschlossen"
                      : `${hours.open} – ${hours.close}`}
                  </span>
                </li>
              ))}
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
            © {currentYear} {config.gdpr.dataControllerName}. Alle Rechte vorbehalten.
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
