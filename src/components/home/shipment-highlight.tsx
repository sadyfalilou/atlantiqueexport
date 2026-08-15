import { CalendarClock, Ship } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Container, Section, SectionHeading } from "@/components/ui/layout-primitives";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { getOpenShipments } from "@/lib/catalog/queries";
import { cn, formatDate } from "@/lib/utils";
import type { Locale } from "@/lib/types";

export async function ShipmentHighlight({ locale }: { locale: Locale }) {
  const t = await getTranslations("home.shipment");
  const tStock = await getTranslations("stock");
  const [shipment] = await getOpenShipments();

  return (
    <Section>
      <Container>
        <SectionHeading title={t("title")} />

        {!shipment ? (
          <EmptyState icon={<Ship className="size-8" />} title={t("empty")} />
        ) : (
          <div className="overflow-hidden rounded-xl border border-line bg-surface">
            <div className="flex flex-wrap items-center gap-3 border-b border-line bg-cream-100 px-5 py-4">
              <Ship aria-hidden="true" className="size-5 text-ocean-700" />
              <p className="font-display text-lg font-semibold text-forest-900">
                {shipment.title[locale]}
              </p>
              <Badge variant="incoming">{tStock("incoming")}</Badge>
            </div>

            <div className="grid gap-6 p-5 lg:grid-cols-[1fr_auto] lg:items-end">
              <div>
                <dl className="flex flex-wrap gap-x-8 gap-y-3">
                  <div>
                    <dt className="text-xs tracking-wide text-muted uppercase">
                      {t("eta")}
                    </dt>
                    <dd className="mt-1 flex items-center gap-1.5 font-semibold text-forest-900">
                      <CalendarClock aria-hidden="true" className="size-4" />
                      {/*
                        `formatDate` lève sur une date vide. Un arrivage publié
                        sans date ne devrait pas exister — l'administration le
                        refuse — mais la page d'accueil ne doit pas tomber pour
                        autant si une ligne est modifiée ailleurs.
                      */}
                      {shipment.etaDate ? formatDate(shipment.etaDate, locale) : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs tracking-wide text-muted uppercase">
                      {t("deadline")}
                    </dt>
                    <dd className="mt-1 font-semibold text-forest-900">
                      {shipment.reservationDeadline
                        ? formatDate(shipment.reservationDeadline, locale)
                        : "—"}
                    </dd>
                  </div>
                </dl>

                <ul className="mt-5 space-y-4">
                  {shipment.items.map((item) => {
                    // Une quantité annoncée nulle ne devrait pas exister, mais
                    // une division par zéro donnerait une barre à `NaN%` et
                    // casserait la mise en page pour tout le monde.
                    const percent =
                      item.plannedQuantity > 0
                        ? Math.round(
                            (item.reservedQuantity / item.plannedQuantity) * 100,
                          )
                        : 0;
                    const name = [item.name[locale], item.label[locale]]
                      .filter(Boolean)
                      .join(" — ");

                    return (
                      <li key={item.variantId}>
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <span className="font-semibold text-forest-900">{name}</span>
                          <span className="tabular text-sm text-muted">
                            {t("reserved", {
                              reserved: item.reservedQuantity,
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
                      </li>
                    );
                  })}
                </ul>
              </div>

              <Link
                href="/arrivages"
                className={cn(buttonVariants({ variant: "primary", size: "lg" }))}
              >
                {t("cta")}
              </Link>
            </div>
          </div>
        )}
      </Container>
    </Section>
  );
}
