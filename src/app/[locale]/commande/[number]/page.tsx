import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CheckCircle2, FileText, Info, RotateCcw } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Container, Section } from "@/components/ui/layout-primitives";
import { buttonVariants } from "@/components/ui/button";
import { reorderAction } from "@/app/actions/account";
import { getOrderForCurrentVisitor } from "@/lib/checkout/checkout";
import { cn, formatDate, formatPrice } from "@/lib/utils";
import type { Locale } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "orderConfirmation" });
  return { title: t("title"), robots: { index: false } };
}

export default async function OrderConfirmationPage({
  params,
}: {
  params: Promise<{ locale: string; number: string }>;
}) {
  const { locale, number } = await params;
  setRequestLocale(locale);

  const order = await getOrderForCurrentVisitor(decodeURIComponent(number));
  if (!order) notFound();

  const typedLocale = locale as Locale;
  const t = await getTranslations("orderConfirmation");
  const tCart = await getTranslations("cart");

  // L'adresse Interac vient de la configuration. Tant qu'elle n'est pas
  // renseignée, on le dit franchement plutôt que d'afficher une adresse
  // inventée vers laquelle un client enverrait de l'argent.
  // `|| null` et non `?? null` : une variable d'environnement non renseignée
  // vaut la chaîne vide, pas `undefined`. Avec `??`, la case restait vide et
  // muette — un client aurait vu « Adresse de destination » suivi de rien.
  const interacEmail = process.env.INTERAC_RECIPIENT_EMAIL?.trim() || null;

  return (
    <Section className="py-8 lg:py-14">
      <Container>
        <div className="mx-auto max-w-[46rem]">
          <div className="flex items-start gap-3">
            <CheckCircle2 aria-hidden="true" className="mt-1 size-7 shrink-0 text-success" />
            <div>
              <h1 className="font-display text-[1.75rem] font-semibold text-forest-900 lg:text-[2.25rem]">
                {t("title")}
              </h1>
              <p className="mt-2 text-muted">
                {t("subtitle", { number: order.orderNumber, email: order.email })}
              </p>
            </div>
          </div>

          {/* --- Paiement Interac --- */}
          <section className="mt-8 rounded-xl border-2 border-mango-700 bg-mango-50 p-5">
            <h2 className="font-display text-lg font-semibold text-forest-900">
              {t("interacTitle")}
            </h2>
            <p className="mt-2 text-sm text-forest-900">{t("interacIntro")}</p>

            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="text-muted">{t("interacRecipient")}</dt>
                <dd className="font-semibold text-forest-900">
                  {interacEmail ?? (
                    <span className="text-warning">{t("interacNotConfigured")}</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-muted">{t("interacAmount")}</dt>
                <dd className="tabular font-semibold text-forest-900">
                  {formatPrice(order.totalCents, typedLocale)}
                </dd>
              </div>
              <div>
                <dt className="text-muted">{t("interacMessage")}</dt>
                <dd className="font-semibold text-forest-900">{order.orderNumber}</dd>
              </div>
            </dl>

            <p className="mt-4 flex items-start gap-1.5 text-sm text-forest-900">
              <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              {t("interacPending")}
            </p>
          </section>

          {/* --- Récapitulatif --- */}
          <section className="mt-8">
            <h2 className="font-display text-lg font-semibold text-forest-900">
              {tCart("summary")}
            </h2>

            <ul className="mt-4 divide-y divide-line border-y border-line">
              {order.items.map((item, index) => (
                <li key={index} className="flex justify-between gap-4 py-3 text-sm">
                  <span>
                    <span className="block font-semibold text-forest-900">{item.name}</span>
                    <span className="block text-muted">
                      {item.label} × {item.quantity}
                    </span>
                  </span>
                  <span className="tabular shrink-0 font-semibold text-forest-900">
                    {formatPrice(item.lineTotalCents, typedLocale)}
                  </span>
                </li>
              ))}
            </ul>

            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">{tCart("subtotal")}</dt>
                <dd className="tabular">{formatPrice(order.subtotalCents, typedLocale)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">{tCart("delivery")}</dt>
                <dd className="tabular">
                  {order.deliveryFeeCents === 0
                    ? t("free")
                    : formatPrice(order.deliveryFeeCents, typedLocale)}
                </dd>
              </div>
              <div className="flex justify-between border-t border-line pt-2 text-base">
                <dt className="font-semibold text-forest-900">{t("total")}</dt>
                <dd className="tabular font-bold text-forest-900">
                  {formatPrice(order.totalCents, typedLocale)}
                </dd>
              </div>
            </dl>
          </section>

          {/* --- Réception --- */}
          <section className="mt-8 rounded-lg border border-line bg-surface p-5">
            <h2 className="font-display text-lg font-semibold text-forest-900">
              {tCart("fulfillmentTitle")}
            </h2>
            <p className="mt-2 font-semibold text-forest-900">
              {tCart(`methods.${order.method}`)}
            </p>

            {order.slot ? (
              <p className="mt-1 text-sm text-muted">
                {formatDate(order.slot.date, typedLocale)} · {order.slot.startTime} –{" "}
                {order.slot.endTime}
              </p>
            ) : null}

            {order.address ? (
              <address className="mt-3 text-sm text-muted not-italic">
                {order.address.fullName}
                <br />
                {order.address.line1}
                {order.address.line2 ? (
                  <>
                    <br />
                    {order.address.line2}
                  </>
                ) : null}
                <br />
                {order.address.city} {order.address.postalCode}
              </address>
            ) : null}
          </section>

          <div className="mt-10 flex flex-wrap gap-3">
            {/* Le reçu s'ouvre dans un onglet : on le lit avant de décider de
                l'enregistrer, plutôt que de le voir atterrir dans un dossier
                de téléchargements sans l'avoir regardé. */}
            <a
              href={`/${locale}/commande/${order.orderNumber}/recu`}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              <FileText aria-hidden="true" className="size-4" />
              {t("receipt")}
            </a>

            <form action={reorderAction}>
              <input type="hidden" name="orderNumber" value={order.orderNumber} />
              <input type="hidden" name="locale" value={locale} />
              <button type="submit" className={cn(buttonVariants({ variant: "outline" }))}>
                <RotateCcw aria-hidden="true" className="size-4" />
                {t("reorder")}
              </button>
            </form>

            <Link href="/boutique" className={cn(buttonVariants({ variant: "ghost" }))}>
              {t("continueShopping")}
            </Link>
                      </div>
        </div>
      </Container>
    </Section>
  );
}
