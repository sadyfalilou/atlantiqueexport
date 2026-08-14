import type { Metadata } from "next";
import { AlertTriangle, Info, ShoppingBag, Trash2 } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Container, Section } from "@/components/ui/layout-primitives";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { ProductImage } from "@/components/shared/product-image";
import { buttonVariants } from "@/components/ui/button";
import { removeItemAction, updateQuantityAction } from "@/app/actions/cart";
import { getCart } from "@/lib/cart/cart";
import {
  fulfillmentOptions,
  lineTotal,
  overstockedLines,
} from "@/lib/cart/pricing";
import { cn, formatPrice } from "@/lib/utils";
import type { Locale } from "@/lib/types";

/** Le panier dépend du cookie : il ne peut pas être prégénéré. */
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "cart" });
  return { title: t("title"), robots: { index: false } };
}

export default async function CartPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Résultat d'un « recommander » : combien d'articles ont été repris, et
  // combien ont été écartés faute d'être encore en vente.
  const query = await searchParams;
  const repris = Number.parseInt(String(query.repris ?? ""), 10);
  const ecartes = Number.parseInt(String(query.ecartes ?? ""), 10);

  const typedLocale = locale as Locale;
  const t = await getTranslations("cart");
  const tTemperature = await getTranslations("temperature");
  const tCommon = await getTranslations("common");

  const cart = await getCart();
  const options = fulfillmentOptions(cart.lines);
  const overstocked = overstockedLines(cart.lines);

  if (cart.lines.length === 0) {
    return (
      <Section>
        <Container>
          <h1 className="mb-8 font-display text-[1.75rem] font-semibold text-forest-900 lg:text-[2.5rem]">
            {t("title")}
          </h1>
          <EmptyState
            icon={<ShoppingBag className="size-8" />}
            title={t("emptyTitle")}
            body={t("emptyBody")}
            action={
              <Link
                href="/boutique"
                className={cn(buttonVariants({ variant: "primary" }))}
              >
                {t("startShopping")}
              </Link>
            }
          />
        </Container>
      </Section>
    );
  }

  return (
    <Section className="py-8 lg:py-14">
      <Container>
        <h1 className="mb-8 font-display text-[1.75rem] font-semibold text-forest-900 lg:text-[2.5rem]">
          {t("title")}
        </h1>

        {Number.isFinite(repris) && repris > 0 ? (
          <p role="status" className="mb-6 rounded-lg border border-line bg-cream-50 p-4 text-sm text-forest-900">
            {t("reordered", { count: repris })}
            {Number.isFinite(ecartes) && ecartes > 0 ? (
              <span className="mt-1 block text-warning">
                {t("reorderSkipped", { count: ecartes })}
              </span>
            ) : null}
          </p>
        ) : null}

        <div className="lg:grid lg:grid-cols-[1fr_20rem] lg:items-start lg:gap-10">
          <ul className="divide-y divide-line border-y border-line">
            {cart.lines.map((line) => {
              const tooMany = line.quantity > line.availableQuantity;
              return (
                <li key={line.itemId} className="flex gap-4 py-5">
                  <Link
                    href={`/produit/${line.productSlug}`}
                    className="size-20 shrink-0 overflow-hidden rounded-md border border-line sm:size-24"
                  >
                    <div className="relative size-full">
                      <ProductImage
                        src={line.imageUrl}
                        name={line.productName[typedLocale]}
                        placeholderLabel={tCommon("photoComing")}
                        sizes="96px"
                      />
                    </div>
                  </Link>

                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h2 className="font-semibold text-forest-900">
                          <Link
                            href={`/produit/${line.productSlug}`}
                            className="hover:underline"
                          >
                            {line.productName[typedLocale]}
                          </Link>
                        </h2>
                        <p className="text-sm text-muted">
                          {line.variantLabel[typedLocale]}
                        </p>
                      </div>
                      <p className="tabular font-bold text-forest-900">
                        {formatPrice(lineTotal(line), typedLocale)}
                      </p>
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-3">
                      {/* Formulaire simple : la modification de quantité
                          fonctionne sans JavaScript. */}
                      <form
                        action={updateQuantityAction}
                        className="flex items-center gap-2"
                      >
                        <input type="hidden" name="itemId" value={line.itemId} />
                        <label className="text-sm text-muted" htmlFor={`q-${line.itemId}`}>
                          {t("quantity")}
                        </label>
                        <input
                          id={`q-${line.itemId}`}
                          type="number"
                          name="quantity"
                          min={1}
                          max={Math.max(line.availableQuantity, 1)}
                          defaultValue={line.quantity}
                          className="tabular h-11 w-20 rounded-sm border border-line-strong bg-surface px-2 text-center text-sm text-forest-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-700"
                        />
                        <button
                          type="submit"
                          className="inline-flex h-11 items-center rounded-md px-3 text-sm font-semibold text-forest-800 underline hover:bg-cream-100"
                        >
                          {t("update")}
                        </button>
                      </form>

                      <form action={removeItemAction}>
                        <input type="hidden" name="itemId" value={line.itemId} />
                        <button
                          type="submit"
                          className="inline-flex h-11 items-center gap-1.5 rounded-md px-3 text-sm text-danger hover:bg-cream-100"
                        >
                          <Trash2 aria-hidden="true" className="size-4" />
                          {t("remove")}
                        </button>
                      </form>
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <Badge
                        variant={
                          line.temperatureClass === "frozen"
                            ? "frozen"
                            : line.temperatureClass === "refrigerated"
                              ? "refrigerated"
                              : line.temperatureClass === "fresh"
                                ? "fresh"
                                : "ambient"
                        }
                      >
                        {tTemperature(line.temperatureClass)}
                      </Badge>
                      {tooMany ? (
                        <span className="inline-flex items-center gap-1.5 text-sm text-warning">
                          <AlertTriangle aria-hidden="true" className="size-4" />
                          {t("stockLimit", { count: line.availableQuantity })}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          <aside className="mt-8 lg:sticky lg:top-28 lg:mt-0">
            <div className="rounded-lg border border-line bg-surface p-5">
              <h2 className="font-display text-lg font-semibold text-forest-900">
                {t("summary")}
              </h2>

              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted">{t("subtotal")}</dt>
                  <dd className="tabular font-semibold text-forest-900">
                    {formatPrice(cart.totals.subtotalCents, typedLocale)}
                  </dd>
                </div>
                {cart.totals.savingsCents > 0 ? (
                  <div className="flex justify-between">
                    <dt className="text-muted">{t("savings")}</dt>
                    <dd className="tabular font-semibold text-success">
                      −{formatPrice(cart.totals.savingsCents, typedLocale)}
                    </dd>
                  </div>
                ) : null}
                <div className="flex justify-between">
                  <dt className="text-muted">{t("delivery")}</dt>
                  <dd className="text-muted">{t("deliveryAtCheckout")}</dd>
                </div>
              </dl>

              <Link
                href="/commander"
                className={cn(
                  buttonVariants({ variant: "primary", size: "lg" }),
                  "mt-5 w-full",
                  overstocked.length > 0 && "pointer-events-none opacity-50",
                )}
                aria-disabled={overstocked.length > 0}
              >
                {t("checkout")}
              </Link>

              {overstocked.length > 0 ? (
                <p className="mt-2 text-sm text-warning">{t("fixStockFirst")}</p>
              ) : (
                <p className="mt-2 text-sm text-muted">{t("checkoutComingSoon")}</p>
              )}

              {cart.totals.hasProvisionalPrices ? (
                <p className="mt-3 inline-flex items-start gap-1.5 text-sm text-warning">
                  <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                  {t("provisionalPrices")}
                </p>
              ) : null}
            </div>

            {/* Compatibilité logistique : on explique POURQUOI un mode est
                écarté, au lieu de le griser sans un mot. */}
            <div className="mt-5 rounded-lg border border-line bg-surface p-5">
              <h2 className="font-display text-lg font-semibold text-forest-900">
                {t("fulfillmentTitle")}
              </h2>
              <ul className="mt-3 space-y-3 text-sm">
                {options.map((option) => (
                  <li key={option.method}>
                    <p
                      className={
                        option.available
                          ? "font-semibold text-forest-900"
                          : "font-semibold text-muted line-through"
                      }
                    >
                      {t(`methods.${option.method}`)}
                    </p>
                    {!option.available && option.blockedBy ? (
                      <p className="mt-0.5 text-muted">
                        {t("methodBlocked", {
                          temperature: tTemperature(option.blockedBy).toLowerCase(),
                        })}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </Container>
    </Section>
  );
}
