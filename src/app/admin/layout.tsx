import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import "../globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Administration · Atlantique Export",
    template: "%s · Administration",
  },
  // L'administration ne doit apparaître dans aucun moteur de recherche.
  robots: { index: false, follow: false },
};

/**
 * Coquille de l'administration : polices, styles, et rien d'autre.
 *
 * La PROTECTION vit dans le groupe `(protege)`, qui enveloppe toutes les pages
 * sauf la connexion. Découper ainsi évite d'avoir à deviner, depuis un layout,
 * sur quelle page on se trouve pour décider s'il faut rediriger.
 *
 * L'administration n'est pas localisée : elle vit hors du segment `[locale]`
 * et reste en français, langue de l'équipe.
 */
export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={`${inter.variable} ${fraunces.variable}`}>
      <body className="flex min-h-dvh flex-col bg-cream-50 antialiased">
        {children}
      </body>
    </html>
  );
}
