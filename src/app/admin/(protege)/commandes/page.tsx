import Link from "next/link";
import type { Metadata } from "next";
import { getOrders } from "@/lib/admin/queries";
import { OrderStatusBadge, PaymentBadge } from "@/components/admin/order-badges";
import { formatDate, formatPrice } from "@/lib/utils";

export const metadata: Metadata = { title: "Commandes" };
export const dynamic = "force-dynamic";

const METHOD_LABELS: Record<string, string> = {
  pickup: "Ramassage",
  local_delivery: "Livraison",
  shipping: "Expédition",
};

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const status = typeof params.statut === "string" ? params.statut : undefined;
  const paymentStatus = typeof params.paiement === "string" ? params.paiement : undefined;

  const orders = await getOrders({ status, paymentStatus });

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[1.75rem] font-semibold text-forest-900">
            Commandes
          </h1>
          <p className="mt-1 text-sm text-muted">
            {orders.length} commande{orders.length > 1 ? "s" : ""}
            {paymentStatus === "pending" ? " en attente de virement" : ""}
          </p>
        </div>

        <nav className="flex flex-wrap gap-2 text-sm">
          <Filter href="/admin/commandes" active={!status && !paymentStatus}>
            Toutes
          </Filter>
          <Filter
            href="/admin/commandes?paiement=pending"
            active={paymentStatus === "pending"}
          >
            À encaisser
          </Filter>
          <Filter href="/admin/commandes?statut=confirmed" active={status === "confirmed"}>
            À préparer
          </Filter>
        </nav>
      </div>

      {orders.length === 0 ? (
        <p className="mt-8 rounded-lg border border-dashed border-line bg-surface p-8 text-center text-muted">
          Aucune commande ne correspond.
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-lg border border-line bg-surface">
          <table className="w-full min-w-[46rem] text-sm">
            <thead className="border-b border-line text-left text-xs tracking-wide text-muted uppercase">
              <tr>
                <th scope="col" className="px-4 py-3">Commande</th>
                <th scope="col" className="px-4 py-3">Client</th>
                <th scope="col" className="px-4 py-3">Réception</th>
                <th scope="col" className="px-4 py-3">Paiement</th>
                <th scope="col" className="px-4 py-3">Statut</th>
                <th scope="col" className="px-4 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-cream-100">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/commandes/${order.orderNumber}`}
                      className="font-semibold text-forest-900 underline-offset-2 hover:underline"
                    >
                      {order.orderNumber}
                    </Link>
                    <span className="block text-xs text-muted">
                      {formatDate(order.placedAt.slice(0, 10), "fr")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-forest-900">{order.email}</td>
                  <td className="px-4 py-3">
                    <span className="text-forest-900">
                      {METHOD_LABELS[order.method] ?? order.method}
                    </span>
                    {order.slot ? (
                      <span className="block text-xs text-muted">
                        {formatDate(order.slot.date, "fr")} · {order.slot.startTime}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <PaymentBadge status={order.paymentStatus} />
                  </td>
                  <td className="px-4 py-3">
                    <OrderStatusBadge status={order.status} />
                  </td>
                  <td className="tabular px-4 py-3 text-right font-semibold text-forest-900">
                    {formatPrice(order.totalCents, "fr")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Filter({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={`inline-flex h-11 items-center rounded-md px-4 font-semibold transition-colors ${
        active
          ? "bg-forest-800 text-white"
          : "border border-line-strong text-forest-800 hover:bg-cream-100"
      }`}
    >
      {children}
    </Link>
  );
}
