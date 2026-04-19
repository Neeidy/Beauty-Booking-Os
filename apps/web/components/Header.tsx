import Link from "next/link";
import { loadClientConfig } from "@/lib/load-client-config";

export default function Header() {
  const config = loadClientConfig();

  return (
    <nav className="sticky top-0 w-full h-[72px] z-50 bg-white/80 backdrop-blur-xl border-b border-gray-200">
      <div className="flex justify-between items-center px-8 max-w-7xl mx-auto h-full">
        {/* Logo */}
        <Link
          href="/"
          className="text-xl font-bold text-slate-900 tracking-tighter font-headline hover:opacity-90 transition-opacity"
        >
          <span className="text-vgs-primary mr-1">◆</span>
          {config.clientName}
        </Link>

        {/* Desktop nav links */}
        <div className="hidden md:flex gap-8 items-center font-headline tracking-tight">
          <a
            href="#hizmetler"
            className="text-slate-900 font-semibold border-b-2 border-tertiary pb-1"
          >
            Leistungen
          </a>
          <a
            href="#galerie"
            className="text-slate-500 hover:text-slate-900 transition-colors"
          >
            Galerie
          </a>
          <a
            href="#team"
            className="text-slate-500 hover:text-slate-900 transition-colors"
          >
            Team
          </a>
          <a
            href="#kontakt"
            className="text-slate-500 hover:text-slate-900 transition-colors"
          >
            Kontakt
          </a>
        </div>

        {/* CTA */}
        <Link
          href="/booking"
          className="px-6 py-2 rounded-full font-headline font-medium text-white hover:opacity-90 transition-opacity active:scale-95 duration-200"
          style={{ backgroundColor: "#037AFF" }}
        >
          Jetzt buchen
        </Link>
      </div>
    </nav>
  );
}
