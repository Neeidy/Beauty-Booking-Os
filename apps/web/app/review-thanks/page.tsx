import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Danke für Ihre Bewertung — Vienna Glow Studio",
};

export default function ReviewThanksPage() {
  return (
    <div className="thanks-wrap">
      <div className="thanks-card">
        <div className="thanks-hero">
          <div className="thank-ok">⭐</div>
          <h1>Vielen Dank!</h1>
          <div className="stars">
            <span className="star-btn active">★</span>
            <span className="star-btn active">★</span>
            <span className="star-btn active">★</span>
            <span className="star-btn active">★</span>
            <span className="star-btn active">★</span>
          </div>
          <p className="sub">
            Ihre Bewertung hilft anderen Kundinnen, uns zu finden — und motiviert unser Team jeden Tag aufs Neue.
          </p>
        </div>

        <div className="rebook-cta">
          <Link href="/booking" className="btn btn-primary btn-lg">
            Neuen Termin buchen →
          </Link>
          <Link href="/" className="btn btn-ghost btn-lg">
            Zur Startseite
          </Link>
        </div>
      </div>
    </div>
  );
}
