import { Hammer } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Container, Section } from "@/components/ui/layout-primitives";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Cette page couvre à la fois les vraies erreurs 404 et les sections encore
 * à construire (boutique, panier, compte…). Elle le dit franchement plutôt
 * que de laisser croire à un lien cassé.
 */
export default async function NotFound() {
  const t = await getTranslations("notFound");

  return (
    <Section>
      <Container>
        <div className="mx-auto flex max-w-[36rem] flex-col items-center text-center">
          <Hammer aria-hidden="true" className="size-10 text-forest-600" />
          <h1 className="mt-4 font-display text-[1.75rem] font-semibold text-forest-900">
            {t("title")}
          </h1>
          <p className="mt-3 text-muted">{t("body")}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/" className={cn(buttonVariants({ variant: "primary" }))}>
              {t("home")}
            </Link>
            <Link href="/contact" className={cn(buttonVariants({ variant: "outline" }))}>
              {t("contact")}
            </Link>
          </div>
        </div>
      </Container>
    </Section>
  );
}
