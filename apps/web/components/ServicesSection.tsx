import Link from "next/link";
import servicesData from "../../../clients/demo-salon/services.json";

function formatPrice(priceEur: number): string {
  return `€ ${(priceEur / 100).toFixed(0)}`;
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} Min.`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h} Std. ${m} Min.` : `${h} Std.`;
}

export default function ServicesSection() {
  return (
    <section
      id="hizmetler"
      className="py-20 sm:py-28"
      style={{ backgroundColor: "var(--color-background)" }}
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="mb-14 text-center">
          <p
            className="mb-3 text-xs font-semibold uppercase tracking-widest"
            style={{ color: "var(--color-secondary)" }}
          >
            Unser Angebot
          </p>
          <h2
            className="font-heading text-3xl font-semibold sm:text-4xl"
            style={{ color: "var(--color-primary)" }}
          >
            Leistungen
          </h2>
          <p
            className="mt-4 text-base"
            style={{ color: "var(--color-text-muted)" }}
          >
            Professionelle Behandlungen für Ihre Schönheit — alle buchbar per Onlineformular.
          </p>
        </div>

        {/* Categories */}
        <div className="space-y-16">
          {servicesData.categories.map((category) => (
            <div key={category.slug}>
              {/* Category title */}
              <h3
                className="mb-6 border-b pb-3 text-lg font-semibold"
                style={{
                  color: "var(--color-primary)",
                  borderColor: "var(--color-accent)",
                }}
              >
                {category.name}
              </h3>

              {/* Service cards */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {category.services.map((service) => (
                  <div
                    key={service.id}
                    className="relative rounded-sm border p-5 transition-shadow hover:shadow-sm"
                    style={{
                      borderColor: "var(--color-accent)",
                      backgroundColor: "#fff",
                    }}
                  >
                    {service.popular && (
                      <span
                        className="absolute right-4 top-4 rounded-sm px-2 py-0.5 text-xs font-semibold"
                        style={{
                          backgroundColor: "var(--color-secondary)",
                          color: "#fff",
                        }}
                      >
                        Beliebt
                      </span>
                    )}
                    <h4
                      className="font-semibold"
                      style={{ color: "var(--color-primary)" }}
                    >
                      {service.name}
                    </h4>
                    <p
                      className="mt-1 text-sm"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      {service.description}
                    </p>
                    <div className="mt-4 flex items-center justify-between">
                      <span
                        className="text-sm"
                        style={{ color: "var(--color-text-muted)" }}
                      >
                        {formatDuration(service.duration)}
                      </span>
                      <span
                        className="font-semibold"
                        style={{ color: "var(--color-secondary)" }}
                      >
                        {formatPrice(service.priceEur)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-14 text-center">
          <Link
            href="/booking"
            className="inline-flex items-center justify-center rounded-sm px-8 py-3.5 text-sm font-semibold transition-opacity hover:opacity-90"
            style={{
              backgroundColor: "var(--color-primary)",
              color: "var(--color-background)",
            }}
          >
            Termin für eine Leistung buchen
          </Link>
        </div>
      </div>
    </section>
  );
}
