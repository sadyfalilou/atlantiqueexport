import { Leaf, Snowflake, Truck } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Container } from "@/components/ui/layout-primitives";
import { buttonVariants } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

export async function Hero() {
  const t = await getTranslations("home");

  const trust = [
    { Icon: Leaf, label: t("trust.sourcing") },
    { Icon: Snowflake, label: t("trust.coldChain") },
    { Icon: Truck, label: t("trust.pickup") },
  ];

  return (
    <section className="relative overflow-hidden bg-forest-800 text-cream-50">
      {/* Motif décoratif, très discret : jamais derrière du texte lisible. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 hidden w-1/2 opacity-[0.07] lg:block"
        style={{
          backgroundImage:
            "repeating-linear-gradient(135deg, var(--color-gold-400) 0 2px, transparent 2px 22px)",
        }}
      />

      <Container>
        <div className="grid items-center gap-10 py-14 lg:grid-cols-2 lg:py-24">
          <div>
            <p className="text-xs font-semibold tracking-wide text-gold-400 uppercase">
              {t("hero.eyebrow")}
            </p>
            <h1 className="mt-3 font-display text-[2.25rem] leading-[1.1] font-semibold lg:text-[3.5rem]">
              {t("hero.title")}
            </h1>
            <p className="mt-4 max-w-[34rem] text-base text-cream-200 lg:text-lg">
              {t("hero.subtitle")}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
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

            <ul className="mt-10 grid gap-3 sm:grid-cols-3">
              {trust.map(({ Icon, label }) => (
                <li key={label} className="flex items-start gap-2 text-sm text-cream-200">
                  <Icon
                    aria-hidden="true"
                    className="mt-0.5 size-4 shrink-0 text-gold-400"
                  />
                  {label}
                </li>
              ))}
            </ul>
          </div>

          {/* Emplacement de la photographie principale, occupé par l'emblème
              en attendant une vraie image. */}
          <div className="relative hidden aspect-[4/3] overflow-hidden rounded-xl border border-forest-700 bg-forest-900 lg:block">
            <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
              <Logo variant="mark" className="h-32 opacity-90" alt="" />
              <span className="h-px w-16 bg-gold-400" aria-hidden="true" />
              <span className="text-xs tracking-wide text-cream-200 uppercase">
                {t("hero.eyebrow")}
              </span>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
