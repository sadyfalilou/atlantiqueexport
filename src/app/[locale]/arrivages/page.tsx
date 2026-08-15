import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CalendarClock, MapPin, Ship } from "lucide-react";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Container, Section } from "@/components/ui/layout-primitives";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { ReservationForm } from "@/components/shipments/reservation-form";
import { getOpenShipments } from "@/lib/catalog/queries";
import { getCurrentCustomer } from "@/lib/supabase/account";
import { routing } from "@/i18n/routing";
import { formatDate, formatPrice } from "@/lib/utils";
import type { Locale } from "@/lib/types";

// Les quantités restantes bougent à chaque réservation : une page mise en
// cache annoncerait des places déjà prises.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "shipments" });
  return { title: t("title"), description: t("subtitle") };
}

export default async function ShipmentsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const typedLocale = locale as Locale;
  const t = await getTranslations("shipments");
  const tStock = await getTranslations("stock");

  const [shipments, customer] = await Promise.all([
    getOpenShipments(),
    getCurrentCustomer(),
  ]);

  const today = new Date().toISOString().slice(0, 10);

  return (
    <Section className="py-8 lg:py-14">
      <Container>
        <h1 className="font-display text-[1.75rem] font-semibold text-forest-900 lg:text-[2.5rem]">
          {t("title")}
        </h1>
        <p className="mt-2 max-w-2xl text-muted">{t("subtitle")}</p>

        {shipments.length === 0 ? (
          <div className="mt-10">
            <EmptyState
              icon={<Ship className="size-8" />}
              title={t("empty")}
              body={t("emptyBody")}
            />
          </div>
        ) : (
          <div className="mt-10 space-y-8">
            {shipments.map((shipment) => {
              const closed =
                shipment.reservationDeadline !== "" &&
                shipment.reservationDeadline < today;

              return (
                <article
                  key={shipment.id}
                  className="overflow-hidden rounded-xl border border-line bg-surface"
                >
                  <div className="flex flex-wrap items-center gap-3 border-b border-line bg-cream-100 px-5 py-4">
                    <Ship aria-hidden="true" className="size-5 text-ocean-700" />
                    <h2 className="font-display text-lg font-semibold text-forest-900">
                      {shipment.title[typedLocale]}
                    </h2>
                    <Badge variant="incoming">{tStock("incoming")}</Badge>
                    {closed ? (
                      <span className="text-sm font-semibold text-warning">
                        {t("closed")}
                      </span>
                    ) : null}
                  </div>

                  <div className="p-5">
                    <dl className="flex flex-wrap gap-x-8 gap-y-3">
                      {shipment.originCountry ? (
                        <div>
                          <dt className="text-xs tracking-wide text-muted uppercase">
                            {t("origin")}
                          </dt>
                          <dd className="mt-1 flex items-center gap-1.5 font-semibold text-forest-900">
                            <MapPin aria-hidden="true" className="size-4" />
                            {shipment.originCountry}
                          </dd>
                        </div>
                      ) : null}
                      {shipment.etaDate ? (
                        <div>
                          <dt className="text-xs tracking-wide text-muted uppercase">
                            {t("eta")}
                          </dt>
                          <dd className="mt-1 flex items-center gap-1.5 font-semibold text-forest-900">
                            <CalendarClock aria-hidden="true" className="size-4" />
                            {formatDate(shipment.etaDate, typedLocale)}
                          </dd>
                        </div>
                      ) : null}
                      {shipment.reservationDeadline ? (
                        <div>
                          <dt className="text-xs tracking-wide text-muted uppercase">
                            {t("deadline")}
                          </dt>
                          <dd className="mt-1 font-semibold text-forest-900">
                            {formatDate(shipment.reservationDeadline, typedLocale)}
                          </dd>
                        </div>
                      ) : null}
                    </dl>

                    {shipment.notes[typedLocale] ? (
                      <p className="mt-4 whitespace-pre-line text-muted">
                        {shipment.notes[typedLocale]}
                      </p>
                    ) : null}

                    <ul className="mt-6 space-y-6">
                      {shipment.items.map((item) => {
                        const percent =
                          item.plannedQuantity > 0
                            ? Math.round(
                                (item.reservedQuantity / item.plannedQuantity) * 100,
                              )
                            : 0;
                        const name = [item.name[typedLocale], item.label[typedLocale]]
                          .filter(Boolean)
                          .join(" — ");
                        const soldOut = item.remainingQuantity <= 0;

                        return (
                          <li
                            key={item.itemId}
                            className="border-t border-line pt-5 first:border-0 first:pt-0"
                          >
                            <div className="flex flex-wrap items-baseline justify-between gap-2">
                              <h3 className="font-semibold text-forest-900">{name}</h3>
                              <span className="tabular text-sm text-muted">
                                {soldOut
                                  ? t("soldOut")
                                  : t("remaining", {
                                      remaining: item.remainingQuantity,
                                      planned: item.plannedQuantity,
                                    })}
                              </span>
                            </div>

                            <div
                              className="mt-1.5 h-2 overflow-hidden rounded-full bg-cream-200"
                              role="progressbar"
                              aria-valuenow={percent}
                              aria-valuemin={0}
                              aria-valuemax={100}
                              aria-label={name}
                            >
                              <div
                                className="h-full rounded-full bg-mango-700"
                                style={{ width: `${percent}%` }}
                              />
                            </div>

                            {item.depositCents > 0 ? (
                              <p className="mt-2 text-sm text-muted">
                                {t("deposit", {
                                  amount: formatPrice(item.depositCents, typedLocale),
                                })}
                              </p>
                            ) : null}

                            {closed || soldOut ? null : (
                              <div className="mt-4">
                                <ReservationForm
                                  itemId={item.itemId}
                                  remaining={item.remainingQuantity}
                                  defaultEmail={customer?.email}
                                />
                                <p className="mt-2 text-sm text-muted">
                                  {t("noDeposit")}
                                </p>
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </Container>
    </Section>
  );
}
