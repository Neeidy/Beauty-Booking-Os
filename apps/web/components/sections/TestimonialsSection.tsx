import { getLocale } from "@/lib/i18n/server";
import { getDictionary } from "@/lib/i18n/dictionary";

export default async function TestimonialsSection() {
  const dict = getDictionary(await getLocale());
  const t = dict.testimonials;

  return (
    <>
      {/* Stats Bar */}
      <section className="stats-bar">
        <div className="container stats-grid">
          <div className="stats-item">
            <div className="stats-num">4.9/5</div>
            <div className="stats-stars">★★★★★</div>
            <div className="stats-label">{t.statsRatingLabel}</div>
          </div>
          <div className="stats-item">
            <div className="stats-num">200+</div>
            <div className="stats-label stats-label-top">{t.statsReviewsLabel}</div>
          </div>
          <div className="stats-item">
            <div className="stats-num">97%</div>
            <div className="stats-label stats-label-top">{t.statsRecommendLabel}</div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="section testimonials">
        <div className="container">
          <div className="section-header">
            <span className="caption">{t.caption}</span>
            <h2>{t.heading}</h2>
          </div>
          <div className="testimonial-grid">
            <article className="testimonial-card">
              <span className="testimonial-quote">&ldquo;</span>
              <div className="testimonial-stars" aria-label="5 stars">★★★★★</div>
              <p className="testimonial-text">
                {t.items.katrin.text}
              </p>
              <div className="testimonial-author">
                <span
                  className="testimonial-avatar"
                  style={{ background: "var(--color-purple-soft)", color: "var(--color-purple-soft-text)" }}
                >
                  KH
                </span>
                <div>
                  <div className="testimonial-name">{t.items.katrin.name}</div>
                  <div className="testimonial-role">{t.items.katrin.role}</div>
                </div>
                <span className="testimonial-source">
                  <span className="gbadge">G</span> {t.sourceGoogle}
                </span>
              </div>
            </article>

            <article className="testimonial-card">
              <span className="testimonial-quote">&ldquo;</span>
              <div className="testimonial-stars">★★★★★</div>
              <p className="testimonial-text">
                {t.items.eva.text}
              </p>
              <div className="testimonial-author">
                <span
                  className="testimonial-avatar"
                  style={{ background: "var(--color-emerald-soft)", color: "var(--color-emerald-soft-text)" }}
                >
                  EW
                </span>
                <div>
                  <div className="testimonial-name">{t.items.eva.name}</div>
                  <div className="testimonial-role">{t.items.eva.role}</div>
                </div>
                <span className="testimonial-source">
                  <span className="gbadge">G</span> {t.sourceGoogle}
                </span>
              </div>
            </article>

            <article className="testimonial-card">
              <span className="testimonial-quote">&ldquo;</span>
              <div className="testimonial-stars">★★★★★</div>
              <p className="testimonial-text">
                {t.items.alex.text}
              </p>
              <div className="testimonial-author">
                <span
                  className="testimonial-avatar"
                  style={{ background: "var(--color-rose-soft)", color: "var(--color-rose-soft-text)" }}
                >
                  AD
                </span>
                <div>
                  <div className="testimonial-name">{t.items.alex.name}</div>
                  <div className="testimonial-role">{t.items.alex.role}</div>
                </div>
                <span className="testimonial-source">
                  <span className="gbadge">G</span> {t.sourceGoogle}
                </span>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* Trust */}
      <section className="trust">
        <div className="container trust-grid">
          <div className="trust-item">
            <span
              className="trust-icon"
              style={{ background: "var(--color-emerald-soft)", color: "var(--color-emerald-soft-text)" }}
            >
              🛡
            </span>
            <div>
              <h4>{dict.trust.gdprTitle}</h4>
              <p>{dict.trust.gdprDesc}</p>
            </div>
          </div>
          <div className="trust-item">
            <span
              className="trust-icon"
              style={{ background: "var(--color-amber-soft)", color: "var(--color-amber-soft-text)" }}
            >
              ⭐
            </span>
            <div>
              <h4>{dict.trust.ratedTitle}</h4>
              <p>{dict.trust.ratedDesc}</p>
            </div>
          </div>
          <div className="trust-item">
            <span
              className="trust-icon"
              style={{ background: "var(--color-accent-soft)", color: "var(--color-accent-soft-text)" }}
            >
              🕐
            </span>
            <div>
              <h4>{dict.trust.onlineTitle}</h4>
              <p>{dict.trust.onlineDesc}</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
