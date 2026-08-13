import { ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Container, Section, SectionHeading } from "@/components/ui/layout-primitives";
import { ProductCard } from "@/components/product/product-card";
import { EmptyState } from "@/components/shared/empty-state";
import type { Locale, Product } from "@/lib/types";

/**
 * Rangée de produits réutilisée par toutes les sections de l'accueil.
 * 2 colonnes sur mobile, 3 sur tablette, 4 sur desktop.
 */
export async function ProductRow({
  title,
  subtitle,
  products,
  href,
  locale,
  emptyMessage,
  className,
}: {
  title: string;
  subtitle?: string;
  products: Product[];
  href: string;
  locale: Locale;
  emptyMessage?: string;
  className?: string;
}) {
  const t = await getTranslations("product");

  // Une rangée sans produit et sans message à afficher n'a rien à dire : on la
  // retire plutôt que de laisser un cadre vide. Les sections où le vide est
  // porteur de sens — les promotions, par exemple — fournissent un message et
  // restent donc visibles.
  if (products.length === 0 && !emptyMessage) return null;

  return (
    <Section className={className}>
      <Container>
        <SectionHeading
          title={title}
          subtitle={subtitle}
          action={
            <Link
              href={href}
              className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-mango-800 hover:underline"
            >
              {t("seeAll")}
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          }
        />

        {products.length === 0 ? (
          <EmptyState title={emptyMessage ?? ""} />
        ) : (
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((product) => (
              <li key={product.id}>
                <ProductCard product={product} locale={locale} />
              </li>
            ))}
          </ul>
        )}
      </Container>
    </Section>
  );
}
