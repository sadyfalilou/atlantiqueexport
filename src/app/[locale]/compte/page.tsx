import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Info, LogOut, Package } from "lucide-react";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Container, Section } from "@/components/ui/layout-primitives";
import { EmptyState } from "@/components/shared/empty-state";
import { AccountNav } from "@/components/account/account-nav";
import { buttonVariants } from "@/components/ui/button";
import { signOutCustomerAction } from "@/app/actions/account";
import { getCurrentCustomer } from "@/lib/supabase/account";
import { createSessionClient } from "@/lib/supabase/auth";
import { routing } from "@/i18n/routing";
import { cn, formatPrice } from "@/lib/utils";
import type { Locale } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "account" });
  return { title: t("accountTitle"), robots: { index: false } };
}

export default async function AccountPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const customer = await getCurrentCustomer();
  if (!customer) redirect(`/${locale}/connexion`);

  const typedLocale = locale as Locale;
  const t = await getTranslations("account");
  const tStatus = await getTranslations("orderStatus");

  /**
   * Les commandes sont lues avec la SESSION du client, pas avec la clé de
   * service : la politique `orders_select_own` fait le tri en base. Le serveur
   * n'a donc aucun filtre à écrire, et aucun moyen de se tromper.
   */
  const supabase = await createSessionClient();
  const { data } = await supabase
    .from("orders")
    .select("order_number, status, payment_status, total_cents, placed_at")
    .order("placed_at", { ascending: false })
    .limit(50);

  const orders = (data ?? []) as Array<{
    order_number: string;
    status: string;
    payment_status: string;
    total_cents: number;
    placed_at: string | null;
  }>;

  return (
    <Section className="py-8 lg:py-14">
      <Container>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-[1.75rem] font-semibold text-forest-900 lg:text-[2.5rem]">
              {t("accountTitle")}
            </h1>
            <p className="mt-2 text-muted">
              {customer.fullName ? `${customer.fullName} · ` : ""}
              {customer.email}
            </p>
          </div>

          <form action={signOutCustomerAction}>
            <input type="hidden" name="locale" value={locale} />
            <button
              type="submit"
              className="inline-flex h-11 items-center gap-1.5 rounded-md px-3 text-sm font-semibold text-forest-800 hover:bg-cream-100"
            >
              <LogOut aria-hidden="true" className="size-4" />
              {t("signOut")}
            </button>
          </form>
        </div>

        <div className="mt-6">
          <AccountNav current="commandes" />
        </div>

        <section className="mt-8">
          <h2 className="font-display text-xl font-semibold text-forest-900">
            {t("ordersTitle")}
          </h2>

          {orders.length === 0 ? (
            <div className="mt-4">
              <EmptyState
                icon={<Package className="size-8" />}
                title={t("noOrders")}
                body={t("noOrdersBody")}
                action={
                  <Link
                    href="/boutique"
                    className={cn(buttonVariants({ variant: "primary" }))}
                  >
                    {t("startShopping")}
                  </Link>
                }
              />
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto rounded-lg border border-line bg-surface">
              <table className="w-full min-w-[36rem] text-sm">
                <thead className="border-b border-line text-left text-xs tracking-wide text-muted uppercase">
                  <tr>
                    <th scope="col" className="px-4 py-3">{t("orderNumber")}</th>
                    <th scope="col" className="px-4 py-3">{t("orderDate")}</th>
                    <th scope="col" className="px-4 py-3">{t("orderStatus")}</th>
                    <th scope="col" className="px-4 py-3 text-right">{t("orderTotal")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {orders.map((order) => (
                    <tr key={order.order_number} className="hover:bg-cream-100">
                      <td className="px-4 py-3">
                        <Link
                          href={`/commande/${order.order_number}`}
                          className="font-semibold text-forest-900 underline-offset-2 hover:underline"
                        >
                          {order.order_number}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted">
                        {order.placed_at
                          ? new Date(order.placed_at).toLocaleDateString(
                              typedLocale === "en" ? "en-CA" : "fr-CA",
                              { day: "numeric", month: "long", year: "numeric" },
                            )
                          : "—"}
                      </td>
                      <td className="px-4 py-3">{tStatus(order.status)}</td>
                      <td className="tabular px-4 py-3 text-right font-semibold text-forest-900">
                        {formatPrice(order.total_cents, typedLocale)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="mt-4 flex items-start gap-2 text-sm text-muted">
            <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            {t("guestNote")}
          </p>
        </section>
      </Container>
    </Section>
  );
}
