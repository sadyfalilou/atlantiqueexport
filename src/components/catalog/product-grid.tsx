import { SearchX } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ProductCard } from "@/components/product/product-card";
import { EmptyState } from "@/components/shared/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Locale, Product } from "@/lib/types";

export async function ProductGrid({
  products,
  locale,
}: {
  products: Product[];
  locale: Locale;
}) {
  const t = await getTranslations("shop");

  if (products.length === 0) {
    return (
      <EmptyState
        icon={<SearchX className="size-8" />}
        title={t("emptyTitle")}
        body={t("emptyBody")}
        action={
          <Link
            href="/boutique"
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            {t("clearAll")}
          </Link>
        }
      />
    );
  }

  return (
    <ul className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((product) => (
        <li key={product.id}>
          <ProductCard product={product} locale={locale} />
        </li>
      ))}
    </ul>
  );
}
