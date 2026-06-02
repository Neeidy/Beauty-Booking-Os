import Link from "next/link";
import { loadClientConfig } from "@/lib/load-client-config";
import { getLocale } from "@/lib/i18n/server";
import { getDictionary } from "@/lib/i18n/dictionary";

export default async function Header() {
  const config = loadClientConfig();
  const dict = getDictionary(await getLocale());

  return (
    <header className="site-nav">
      <div className="site-nav-inner container-wide">
        <Link href="#top" className="site-brand">
          <span className="site-brand-diamond" />
          <span>{config.clientName}</span>
        </Link>
        <nav className="site-links">
          <a href="#leistungen">{dict.nav.services}</a>
          <a href="#galerie">{dict.nav.gallery}</a>
          <a href="#team">{dict.nav.team}</a>
          <a href="#kontakt">{dict.nav.contact}</a>
        </nav>
        <Link href="/booking" className="btn btn-primary">{dict.nav.bookNow}</Link>
      </div>
    </header>
  );
}
