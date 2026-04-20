import Link from "next/link";
import { loadClientConfig } from "@/lib/load-client-config";

export default function Header() {
  const config = loadClientConfig();

  return (
    <header className="site-nav">
      <div className="site-nav-inner container-wide">
        <Link href="#top" className="site-brand">
          <span className="site-brand-diamond" />
          <span>{config.clientName}</span>
        </Link>
        <nav className="site-links">
          <a href="#leistungen">Leistungen</a>
          <a href="#galerie">Galerie</a>
          <a href="#team">Team</a>
          <a href="#kontakt">Kontakt</a>
        </nav>
        <Link href="/booking" className="btn btn-primary">Jetzt buchen</Link>
      </div>
    </header>
  );
}
