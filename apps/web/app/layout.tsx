import type { Metadata, Viewport } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import "./globals.css";

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
  return (
    <html lang="de" className={`${playfair.variable} ${inter.variable}`}>
      <body className="font-sans antialiased" style={{ backgroundColor: "var(--color-background)" }}>
        {children}
      </body>
    </html>
  );
}
