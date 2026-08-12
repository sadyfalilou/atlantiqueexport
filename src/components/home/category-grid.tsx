import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Container, Section, SectionHeading } from "@/components/ui/layout-primitives";
import { getMegaMenuCategories } from "@/lib/catalog/queries";
import type { Locale } from "@/lib/types";

export async function CategoryGrid({ locale }: { locale: Locale }) {
  const t = await getTranslations("home.categories");
  // Les catégories virtuelles (Nouveautés, Promotions) ont leur propre section.
  const categories = (await getMegaMenuCategories()).filter((c) => !c.isVirtual);

  return (
    <Section className="bg-cream-100">
      <Container>
        <SectionHeading title={t("title")} subtitle={t("subtitle")} />
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {categories.map((category) => (
            <li key={category.id}>
              <Link
                href={category.href ?? `/boutique/${category.slug}`}
                className="flex h-full min-h-24 flex-col justify-between rounded-lg border border-line bg-surface p-4 transition-all duration-150 hover:-translate-y-0.5 hover:border-forest-600 hover:shadow-md"
              >
                <span className="text-sm leading-snug font-semibold text-forest-900">
                  {category.name[locale]}
                </span>
                <span aria-hidden="true" className="mt-3 h-0.5 w-8 bg-gold-400" />
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}
