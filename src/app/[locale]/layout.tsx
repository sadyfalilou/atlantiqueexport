import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Fraunces, Inter } from "next/font/google";
import { routing, type Locale } from "@/i18n/routing";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { BottomNav } from "@/components/layout/bottom-nav";
import "../globals.css";

// Polices auto-hébergées par next/font : aucune requête vers un domaine
// tiers et aucun décalage de mise en page au chargement.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "brand" });

  return {
    metadataBase: new URL("https://atlantiqueexport.com"),
    title: {
      default: `Atlantique Export — ${t("tagline")}`,
      template: "%s · Atlantique Export",
    },
    description: t("tagline"),
    openGraph: {
      siteName: "Atlantique Export",
      locale: locale === "en" ? "en_CA" : "fr_CA",
      type: "website",
    },
    alternates: {
      canonical: `/${locale}`,
      languages: { fr: "/fr", en: "/en" },
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  // Permet le rendu statique des pages localisées.
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "nav" });

  return (
    <html lang={locale} className={`${inter.variable} ${fraunces.variable}`}>
      <body className="flex min-h-dvh flex-col antialiased">
        <NextIntlClientProvider>
          <a href="#contenu" className="skip-link bg-surface px-4 py-2 font-semibold text-forest-900 shadow-md">
            {t("skipToContent")}
          </a>
          <Header locale={locale as Locale} />
          <main id="contenu" className="flex-1 pb-16 lg:pb-0">
            {children}
          </main>
          <Footer locale={locale as Locale} />
          <BottomNav />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
