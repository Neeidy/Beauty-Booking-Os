import Image from "next/image";
import Link from "next/link";
import { getLocale } from "@/lib/i18n/server";
import { getDictionary } from "@/lib/i18n/dictionary";

export default async function HeroSection() {
  const dict = getDictionary(await getLocale());

  return (
    <section className="hero" id="top">
      <div className="hero-bg" />
      <div className="hero-blob" />
      <div className="hero-inner container-wide">
        <div className="hero-copy">
          <span className="pill hero-badge">
            <span>✨</span>
            {dict.hero.badge}
          </span>
          <h1 className="hero-headline">
            {dict.hero.headlineLine1}<br />
            <span className="hero-grad">{dict.hero.headlineLine2}</span>
          </h1>
          <p className="hero-sub">
            {dict.hero.sub}
          </p>
          <div className="hero-service-pills">
            <span className="pill"><span className="dot" style={{ background: "var(--color-purple)" }} />{dict.hero.pillNails}</span>
            <span className="pill"><span className="dot" style={{ background: "var(--color-amber)" }} />{dict.hero.pillHair}</span>
            <span className="pill"><span className="dot" style={{ background: "var(--color-emerald)" }} />{dict.hero.pillFacial}</span>
            <span className="pill"><span className="dot" style={{ background: "var(--color-rose)" }} />{dict.hero.pillLashes}</span>
            <span className="pill"><span className="dot" style={{ background: "var(--color-rose)" }} />{dict.hero.pillEpilation}</span>
          </div>
          <div className="hero-cta-row">
            <Link href="/booking" className="btn btn-primary btn-lg">{dict.hero.ctaPrimary}</Link>
            <a href="#leistungen" className="btn btn-ghost btn-lg">{dict.hero.ctaSecondary}</a>
          </div>
          <div className="hero-trust">
            <span className="hero-trust-item">
              <span style={{ color: "var(--color-amber)" }}>★★★★★</span>
              {dict.hero.trustGoogle}
            </span>
            <span className="hero-trust-sep">·</span>
            <span className="hero-trust-item">{dict.hero.trustOnline}</span>
            <span className="hero-trust-sep">·</span>
            <span className="hero-trust-item">{dict.hero.trustAvailable}</span>
          </div>
        </div>
        <div className="hero-art">
          <div className="img-wrap hero-img">
            <Image
              src="https://images.unsplash.com/photo-1560066984-138dadb4c035?w=900&q=80"
              alt={dict.hero.imageAlt}
              fill
              style={{ objectFit: "cover" }}
              priority
            />
          </div>
        </div>
      </div>
      <div className="hero-scroll">
        <span className="caption">{dict.hero.scroll}</span>
        <span className="hero-chev">⌄</span>
      </div>
    </section>
  );
}
