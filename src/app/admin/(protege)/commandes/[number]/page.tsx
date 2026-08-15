import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Banknote, CheckCircle2 } from "lucide-react";
import { getOrderByNumber } from "@/lib/admin/queries";
import { getStaffMember, hasRole } from "@/lib/supabase/auth";
import {
  confirmInteracPaymentAction,
  updateOrderStatusAction,
} from "@/app/actions/admin";
import { OrderStatusBadge, PaymentBadge } from "@/components/admin/order-badges";
import { Button } from "@/components/ui/button";
import { formatDate, formatPrice } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ number: string }>;
}): Promise<Metadata> {
  const { number } = await params;
  return { title: `Commande ${decodeURIComponent(number)}` };
}

const METHOD_LABELS: Record<string, string> = {
  pickup: "Ramassage",
  local_delivery: "Livraison locale",
  shipping: "Expédition postale",
};

const NEXT_STATUSES: Array<{ value: string; label: string }> = [
  { value: "preparing", label: "En préparation" },
  { value: "ready_for_pickup", label: "Prête pour ramassage" },
  { value: "out_for_delivery", label: "En livraison" },
  { value: "delivered", label: "Livrée" },
  { value: "completed", label: "Terminée" },
  { value: "cancelled", label: "Annulée" },
];

export default async function AdminOrderPage({
  params,
}: {
  params: Promise<{ number: string }>;
}) {
  const { number } = await params;
  const order = await getOrderByNumber(decodeURIComponent(number));
  if (!order) notFound();

  const member = await getStaffMember();
  const canConfirmPayment = member != null && hasRole(member, "super_admin", "manager");
  const awaitingPayment = order.paymentStatus !== "paid";

  return (
    <div>
      <Link
        href="/admin/commandes"
        className="inline-flex h-11 items-center gap-1.5 text-sm font-semibold text-forest-800 hover:underline"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Toutes les commandes
      </Link>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-[1.75rem] font-semibold text-forest-900">
          {order.orderNumber}
        </h1>
        <OrderStatusBadge status={order.status} />
        <PaymentBadge status={order.paymentStatus} />
      </div>
      <p className="mt-1 text-sm text-muted">
        Passée le {formatDate(order.placedAt.slice(0, 10), "fr")}
      </p>

      {/* --- Encaissement Interac --- */}
      {awaitingPayment ? (
        <section className="mt-6 rounded-lg border-2 border-mango-700 bg-mango-50 p-5">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-forest-900">
            <Banknote aria-hidden="true" className="size-5" />
            Virement Interac en attente
          </h2>
          <p className="mt-2 text-sm text-forest-900">
            Montant attendu :{" "}
            <strong className="tabular">{formatPrice(order.totalCents, "fr")}</strong>, avec{" "}
            <strong>{order.orderNumber}</strong> en message. Le stock est déjà réservé.
          </p>

          {canConfirmPayment ? (
            <form action={confirmInteracPaymentAction} className="mt-4">
              <input type="hidden" name="orderId" value={order.id} />
              <Button type="submit" size="lg">
                J&apos;ai reçu le virement
              </Button>
              <p className="mt-2 text-sm text-muted">
                Cette action enregistre l&apos;encaissement, confirme la commande et
                inscrit votre nom au journal d&apos;audit. Elle ne s&apos;annule pas d&apos;un
                clic.
              </p>
            </form>
          ) : (
            <p className="mt-3 text-sm text-muted">
              Seuls un gestionnaire ou un super administrateur peuvent valider un
              encaissement.
            </p>
          )}
        </section>
      ) : (
        <section className="mt-6 flex items-start gap-2 rounded-lg border border-line bg-surface p-5">
          <CheckCircle2 aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-success" />
          <p className="text-sm text-forest-900">
            Paiement encaissé. La commande peut être préparée.
          </p>
        </section>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_20rem] lg:items-start">
        {/* --- Contenu --- */}
        <section className="rounded-lg border border-line bg-surface">
          <h2 className="border-b border-line px-5 py-4 font-display text-lg font-semibold text-forest-900">
            Contenu
          </h2>
          <table className="w-full text-sm">
            <thead className="text-left text-xs tracking-wide text-muted uppercase">
              <tr>
                <th scope="col" className="px-5 py-2">Produit</th>
                <th scope="col" className="px-5 py-2 text-center">Qté</th>
                <th scope="col" className="px-5 py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {order.items.map((item, index) => (
                <tr key={index}>
                  <td className="px-5 py-3">
                    <span className="block font-semibold text-forest-900">{item.name}</span>
                    <span className="block text-xs text-muted">
                      {item.label} · {item.sku}
                    </span>
                  </td>
                  <td className="tabular px-5 py-3 text-center">{item.quantity}</td>
                  <td className="tabular px-5 py-3 text-right font-semibold text-forest-900">
                    {formatPrice(item.lineTotalCents, "fr")}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t border-line">
              <tr>
                <td colSpan={2} className="px-5 py-2 text-muted">Sous-total</td>
                <td className="tabular px-5 py-2 text-right">
                  {formatPrice(order.subtotalCents, "fr")}
                </td>
              </tr>
              <tr>
                <td colSpan={2} className="px-5 py-2 text-muted">Livraison</td>
                <td className="tabular px-5 py-2 text-right">
                  {formatPrice(order.deliveryFeeCents, "fr")}
                </td>
              </tr>
              <tr>
                <td colSpan={2} className="px-5 py-3 font-semibold text-forest-900">Total</td>
                <td className="tabular px-5 py-3 text-right font-bold text-forest-900">
                  {formatPrice(order.totalCents, "fr")}
                </td>
              </tr>
            </tfoot>
          </table>
        </section>

        {/* --- Client et réception --- */}
        <aside className="space-y-6">
          <section className="rounded-lg border border-line bg-surface p-5">
            <h2 className="font-display text-lg font-semibold text-forest-900">Client</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div>
                <dt className="text-muted">Courriel</dt>
                <dd className="font-semibold text-forest-900">
                  <a href={`mailto:${order.email}`} className="hover:underline">
                    {order.email}
                  </a>
                </dd>
              </div>
              {order.phone ? (
                <div>
                  <dt className="text-muted">Téléphone</dt>
                  <dd className="font-semibold text-forest-900">
                    <a href={`tel:${order.phone}`} className="hover:underline">
                      {order.phone}
                    </a>
                  </dd>
                </div>
              ) : null}
            </dl>
          </section>

          <section className="rounded-lg border border-line bg-surface p-5">
            <h2 className="font-display text-lg font-semibold text-forest-900">Réception</h2>
            <p className="mt-2 text-sm font-semibold text-forest-900">
              {METHOD_LABELS[order.method] ?? order.method}
              {order.zoneName ? ` · ${order.zoneName}` : ""}
            </p>
            {order.slot ? (
              <p className="mt-1 text-sm text-muted">
                {formatDate(order.slot.date, "fr")} · {order.slot.startTime} –{" "}
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
            {order.notes ? (
              <p className="mt-3 rounded-sm bg-cream-100 p-3 text-sm text-forest-900">
                {order.notes}
              </p>
            ) : null}
          </section>

          <section className="rounded-lg border border-line bg-surface p-5">
            <h2 className="font-display text-lg font-semibold text-forest-900">
              Faire avancer
            </h2>
            <form action={updateOrderStatusAction} className="mt-3 space-y-3">
              <input type="hidden" name="orderId" value={order.id} />
              <label className="block">
                <span className="sr-only">Nouveau statut</span>
                <select
                  name="status"
                  defaultValue=""
                  required
                  className="h-11 w-full rounded-sm border border-line-strong bg-surface px-2 text-sm font-semibold text-forest-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-700"
                >
                  <option value="" disabled>
                    Choisir un statut
                  </option>
                  {NEXT_STATUSES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <Button type="submit" variant="outline" className="w-full">
                Mettre à jour
              </Button>
            </form>
          </section>
        </aside>
      </div>
    </div>
  );
}
