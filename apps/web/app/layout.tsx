import type { Metadata, Viewport } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import "./globals.css";
import { loadBranding, brandingToCss } from "@/lib/load-branding";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Vienna Glow Studio — Premium Beauty in Wien",
  description:
    "Nails, Gesichtspflege, Wimpern & Brauen — Ihr Premium Beauty Studio in 1060 Wien. Jetzt Termin buchen.",
  keywords: ["Beauty Salon Wien", "Nails Wien", "HydraFacial Wien", "Lash Lift Wien"],
  openGraph: {
    title: "Vienna Glow Studio",
    description: "Premium Beauty Studio in Wien — Nails, Skin, Lashes",
    locale: "de_AT",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const slug = process.env.NEXT_PUBLIC_DEFAULT_CLIENT_SLUG || "demo-salon";
  const branding = loadBranding(slug);
  const brandCss = brandingToCss(branding);

  return (
    <html lang="de" className={`${playfair.variable} ${inter.variable}`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
          rel="stylesheet"
        />
        <style dangerouslySetInnerHTML={{ __html: brandCss }} />
      </head>
      <body className="font-sans antialiased" style={{ backgroundColor: "var(--color-bg)" }}>
        {children}
      </body>
    </html>
  );
}
