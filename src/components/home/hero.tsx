import { Leaf, Snowflake, Truck } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Container } from "@/components/ui/layout-primitives";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Bannière d'accueil.
 *
 * Il n'y a pas de visuel à droite, et c'est délibéré. Un logo employé comme
 * image principale trahit surtout l'absence de photographie — d'autant qu'il
 * apparaît déjà dans l'en-tête, à quelques centimètres. Tant que les vraies
 * photos produit ne sont pas disponibles, la bannière assume d'être
 * typographique : le titre porte, le texte respire, et rien ne fait semblant.
 *
 * Quand les photographies arriveront, elles prendront la place du motif à
 * droite, ou passeront en fond pleine largeur avec un voile assombrissant.
 */
export async function Hero() {
  const t = await getTranslations("home");

  const trust = [
    { Icon: Leaf, label: t("trust.sourcing") },
    { Icon: Snowflake, label: t("trust.coldChain") },
    { Icon: Truck, label: t("trust.pickup") },
  ];

  return (
    <section className="relative overflow-hidden bg-forest-800 text-cream-50">
      {/* Motif décoratif, très discret, et jamais derrière du texte. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 hidden w-2/5 opacity-[0.07] lg:block"
        style={{
          backgroundImage:
            "repeating-linear-gradient(135deg, var(--color-gold-400) 0 2px, transparent 2px 22px)",
        }}
      />

      <Container>
        <div className="relative py-16 lg:py-28">
          <p className="text-xs font-semibold tracking-wide text-gold-400 uppercase">
            {t("hero.eyebrow")}
          </p>

          <h1 className="mt-4 max-w-[20ch] font-display text-[2.5rem] leading-[1.05] font-semibold lg:text-[4.25rem]">
            {t("hero.title")}
          </h1>

          <p className="mt-6 max-w-[38rem] text-base text-cream-200 lg:text-xl">
            {t("hero.subtitle")}
          </p>

          <div className="mt-9 flex flex-wrap gap-3">
            <Link
              href="/boutique"
              className={cn(buttonVariants({ variant: "primary", size: "lg" }))}
            >
              {t("hero.ctaPrimary")}
            </Link>
            <Link
              href="/nouveautes"
              className={cn(
                buttonVariants({ size: "lg" }),
                "border-2 border-cream-200 bg-transparent text-cream-50 hover:bg-forest-700",
              )}
            >
              {t("hero.ctaSecondary")}
            </Link>
          </div>

          {/* Les trois engagements ferment la bannière sur toute la largeur :
              ils lui donnent son assise, à la place du panneau retiré. */}
          <ul className="mt-14 grid gap-5 border-t border-forest-700 pt-8 sm:grid-cols-3">
            {trust.map(({ Icon, label }) => (
              <li
                key={label}
                className="flex items-start gap-2.5 text-sm text-cream-200"
              >
                <Icon
                  aria-hidden="true"
                  className="mt-0.5 size-4 shrink-0 text-gold-400"
                />
                {label}
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </section>
  );
}
