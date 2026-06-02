import type { Metadata, Viewport } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import "./globals.css";
import { loadBranding, brandingToCss } from "@/lib/load-branding";
import ThemeToggle from "@/components/ThemeToggle";
import LocaleToggle from "@/components/LocaleToggle";
import { getLocale } from "@/lib/i18n/server";
import { getDictionary } from "@/lib/i18n/dictionary";
import { I18nProvider } from "@/lib/i18n/I18nProvider";

export const dynamic = "force-dynamic";

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

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const dict = getDictionary(locale);

  return {
    title: dict.meta.title,
    description: dict.meta.description,
    keywords: ["Beauty Salon Wien", "Nails Wien", "HydraFacial Wien", "Lash Lift Wien"],
    openGraph: {
      title: dict.meta.title,
      description: dict.meta.description,
      locale: dict.meta.ogLocale,
      type: "website",
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const slug = process.env.NEXT_PUBLIC_DEFAULT_CLIENT_SLUG || "demo-salon";
  const branding = loadBranding(slug);
  const brandCss = brandingToCss(branding);

  const locale = await getLocale();
  const dict = getDictionary(locale);

  return (
    <html lang={locale} className={`${playfair.variable} ${inter.variable}`}>
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
        <I18nProvider locale={locale} dict={dict}>
          {children}
          <div className="floating-controls">
            <ThemeToggle />
            <LocaleToggle />
          </div>
        </I18nProvider>
      </body>
    </html>
  );
}
