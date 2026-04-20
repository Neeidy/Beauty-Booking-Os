export default function TestimonialsSection() {
  return (
    <>
      {/* Stats Bar */}
      <section className="stats-bar">
        <div className="container stats-grid">
          <div className="stats-item">
            <div className="stats-num">4.9/5</div>
            <div className="stats-stars">★★★★★</div>
            <div className="stats-label">Google Bewertung</div>
          </div>
          <div className="stats-item">
            <div className="stats-num">200+</div>
            <div className="stats-label stats-label-top">Bewertungen</div>
          </div>
          <div className="stats-item">
            <div className="stats-num">97%</div>
            <div className="stats-label stats-label-top">Weiterempfehlungsrate</div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="section testimonials">
        <div className="container">
          <div className="section-header">
            <span className="caption">Kundenstimmen</span>
            <h2>Was unsere Kundinnen sagen</h2>
          </div>
          <div className="testimonial-grid">
            <article className="testimonial-card">
              <span className="testimonial-quote">&ldquo;</span>
              <div className="testimonial-stars" aria-label="5 stars">★★★★★</div>
              <p className="testimonial-text">
                Anna ist einfach die Beste! Meine Gel-Nägel sehen immer perfekt aus.
                Das Studio ist wunderschön und das Team super freundlich.
              </p>
              <div className="testimonial-author">
                <span
                  className="testimonial-avatar"
                  style={{ background: "var(--color-purple-soft)", color: "var(--color-purple-soft-text)" }}
                >
                  KH
                </span>
                <div>
                  <div className="testimonial-name">Katrin H.</div>
                  <div className="testimonial-role">Stammkundin seit 2022</div>
                </div>
                <span className="testimonial-source">
                  <span className="gbadge">G</span> Google
                </span>
              </div>
            </article>

            <article className="testimonial-card">
              <span className="testimonial-quote">&ldquo;</span>
              <div className="testimonial-stars">★★★★★</div>
              <p className="testimonial-text">
                HydraFacial bei Lena war ein Erlebnis der Extraklasse.
                Meine Haut strahlt seit der Behandlung.
              </p>
              <div className="testimonial-author">
                <span
                  className="testimonial-avatar"
                  style={{ background: "var(--color-emerald-soft)", color: "var(--color-emerald-soft-text)" }}
                >
                  EW
                </span>
                <div>
                  <div className="testimonial-name">Eva W.</div>
                  <div className="testimonial-role">Neukundin · 2026</div>
                </div>
                <span className="testimonial-source">
                  <span className="gbadge">G</span> Google
                </span>
              </div>
            </article>

            <article className="testimonial-card">
              <span className="testimonial-quote">&ldquo;</span>
              <div className="testimonial-stars">★★★★★</div>
              <p className="testimonial-text">
                Das Online-Buchungssystem ist so praktisch — ich buche immer um 22 Uhr nach der Arbeit.
                Die Erinnerung kommt automatisch.
              </p>
              <div className="testimonial-author">
                <span
                  className="testimonial-avatar"
                  style={{ background: "var(--color-rose-soft)", color: "var(--color-rose-soft-text)" }}
                >
                  AD
                </span>
                <div>
                  <div className="testimonial-name">Alex D.</div>
                  <div className="testimonial-role">Stammkunde seit 2024</div>
                </div>
                <span className="testimonial-source">
                  <span className="gbadge">G</span> Google
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
              <h4>DSGVO-konform</h4>
              <p>Ihre Daten sind sicher. Österreichisches Recht.</p>
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
              <h4>Top-bewertet in Wien</h4>
              <p>4.9 Sterne auf Google.</p>
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
              <h4>Online buchbar 24/7</h4>
              <p>Buchen Sie jederzeit — auch nachts.</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
