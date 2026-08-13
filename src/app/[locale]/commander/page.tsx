import type { Metadata } from "next";
import { ShoppingBag } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Container, Section } from "@/components/ui/layout-primitives";
import { EmptyState } from "@/components/shared/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { CheckoutForm } from "@/components/checkout/checkout-form";
import { getCart } from "@/lib/cart/cart";
import { fulfillmentOptions, lineTotal } from "@/lib/cart/pricing";
import { getLogistics } from "@/lib/checkout/checkout";
import { cn, formatPrice } from "@/lib/utils";
import type { Locale } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "checkout" });
  return { title: t("title"), robots: { index: false } };
}

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const typedLocale = locale as Locale;
  const t = await getTranslations("checkout");
  const tCart = await getTranslations("cart");

  const cart = await getCart();

  if (cart.lines.length === 0) {
    return (
      <Section>
        <Container>
          <h1 className="mb-8 font-display text-[1.75rem] font-semibold text-forest-900 lg:text-[2.5rem]">
            {t("title")}
          </h1>
          <EmptyState
            icon={<ShoppingBag className="size-8" />}
            title={tCart("emptyTitle")}
            body={tCart("emptyBody")}
            action={
              <Link href="/boutique" className={cn(buttonVariants({ variant: "primary" }))}>
                {tCart("startShopping")}
              </Link>
            }
          />
        </Container>
      </Section>
    );
  }

  const logistics = await getLogistics();

  // Seuls les modes compatibles avec le contenu du panier sont proposés.
  // La même règle est revérifiée en base au moment de la commande.
  const methods = fulfillmentOptions(cart.lines)
    .filter((option) => option.available)
    .map((option) => option.method);

  return (
    <Section className="py-8 lg:py-14">
      <Container>
        <h1 className="mb-8 font-display text-[1.75rem] font-semibold text-forest-900 lg:text-[2.5rem]">
          {t("title")}
        </h1>

        <div className="lg:grid lg:grid-cols-[1fr_20rem] lg:items-start lg:gap-10">
          <CheckoutForm
            methods={methods}
            pickupLocations={logistics.pickupLocations}
            zones={logistics.zones}
            slots={logistics.slots}
            subtotalCents={cart.totals.subtotalCents}
          />

          <aside className="mt-10 lg:sticky lg:top-28 lg:mt-0">
            <div className="rounded-lg border border-line bg-surface p-5">
              <h2 className="font-display text-lg font-semibold text-forest-900">
                {tCart("summary")}
              </h2>

              <ul className="mt-4 space-y-3 text-sm">
                {cart.lines.map((line) => (
                  <li key={line.itemId} className="flex justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block font-semibold text-forest-900">
                        {line.productName[typedLocale]}
                      </span>
                      <span className="block text-muted">
                        {line.variantLabel[typedLocale]} × {line.quantity}
                      </span>
                    </span>
                    <span className="tabular shrink-0 font-semibold text-forest-900">
                      {formatPrice(lineTotal(line), typedLocale)}
                    </span>
                  </li>
                ))}
              </ul>

              <dl className="mt-5 border-t border-line pt-4 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted">{tCart("subtotal")}</dt>
                  <dd className="tabular font-semibold text-forest-900">
                    {formatPrice(cart.totals.subtotalCents, typedLocale)}
                  </dd>
                </div>
                <div className="mt-2 flex justify-between">
                  <dt className="text-muted">{tCart("delivery")}</dt>
                  <dd className="text-muted">{t("feeAfterAddress")}</dd>
                </div>
              </dl>

              {cart.totals.hasProvisionalPrices ? (
                <p className="mt-4 text-sm text-warning">{tCart("provisionalPrices")}</p>
              ) : null}
            </div>
          </aside>
        </div>
      </Container>
    </Section>
  );
}
