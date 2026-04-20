import Image from "next/image";
import Link from "next/link";

export default function HeroSection() {
  return (
    <section className="hero" id="top">
      <div className="hero-bg" />
      <div className="hero-blob" />
      <div className="hero-inner container-wide">
        <div className="hero-copy">
          <span className="pill hero-badge">
            <span>✨</span>
            Wien 1060 · Nägel · Haare · Beauty · Epilasyon
          </span>
          <h1 className="hero-headline">
            Schönheit,<br />
            <span className="hero-grad">die bleibt.</span>
          </h1>
          <p className="hero-sub">
            Professionelle Nagelpflege, Haarstyling, Gesichtsbehandlungen
            und Haarentfernung — in Ihrem Premium Studio in Wien.
          </p>
          <div className="hero-service-pills">
            <span className="pill"><span className="dot" style={{ background: "var(--color-purple)" }} />💅 Nägel</span>
            <span className="pill"><span className="dot" style={{ background: "var(--color-amber)" }} />✂️ Haare</span>
            <span className="pill"><span className="dot" style={{ background: "var(--color-emerald)" }} />🌿 Facial</span>
            <span className="pill"><span className="dot" style={{ background: "var(--color-rose)" }} />👁 Wimpern</span>
            <span className="pill"><span className="dot" style={{ background: "var(--color-rose)" }} />〰️ Epilasyon</span>
          </div>
          <div className="hero-cta-row">
            <Link href="/booking" className="btn btn-primary btn-lg">Jetzt Termin buchen →</Link>
            <a href="#leistungen" className="btn btn-ghost btn-lg">Leistungen entdecken</a>
          </div>
          <div className="hero-trust">
            <span className="hero-trust-item">
              <span style={{ color: "var(--color-amber)" }}>★★★★★</span>
              Google Bewertung
            </span>
            <span className="hero-trust-sep">·</span>
            <span className="hero-trust-item">✓ Online buchbar 24/7</span>
            <span className="hero-trust-sep">·</span>
            <span className="hero-trust-item">✓ Sofort verfügbar</span>
          </div>
        </div>
        <div className="hero-art">
          <div className="img-wrap hero-img">
            <Image
              src="https://images.unsplash.com/photo-1560066984-138dadb4c035?w=900&q=80"
              alt="Studio interior"
              fill
              style={{ objectFit: "cover" }}
              priority
            />
          </div>
        </div>
      </div>
      <div className="hero-scroll">
        <span className="caption">Mehr entdecken</span>
        <span className="hero-chev">⌄</span>
      </div>
    </section>
  );
}
