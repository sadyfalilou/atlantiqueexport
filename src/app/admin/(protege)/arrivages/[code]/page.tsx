import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Trash2 } from "lucide-react";
import { getAdminShipment, getVariantOptions } from "@/lib/admin/queries";
import { getStaffMember, hasRole } from "@/lib/supabase/auth";
import {
  removeShipmentItemAction,
  toggleShipmentPublishAction,
} from "@/app/actions/admin";
import { ShipmentEditor } from "@/components/admin/shipment-editor";
import { ShipmentItemForm } from "@/components/admin/shipment-item-form";
import { PublishToggle } from "@/components/admin/publish-toggle";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const shipment = await getAdminShipment(code);
  return { title: shipment?.titleFr ?? "Arrivage" };
}

export default async function AdminShipmentPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const shipment = await getAdminShipment(code);
  if (!shipment) notFound();

  const [member, variants] = await Promise.all([getStaffMember(), getVariantOptions()]);
  const canEdit = member != null && hasRole(member, "super_admin", "manager");

  const datesMissing = !shipment.etaDate || !shipment.reservationDeadline;

  return (
    <div>
      <Link
        href="/admin/arrivages"
        className="inline-flex h-11 items-center gap-1.5 text-sm font-semibold text-forest-800 hover:underline"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Tous les arrivages
      </Link>

      <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-[1.75rem] font-semibold text-forest-900">
            {shipment.titleFr}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {shipment.code} · {shipment.items.length} format
            {shipment.items.length > 1 ? "s" : ""} annoncé
            {shipment.items.length > 1 ? "s" : ""}
          </p>
        </div>

        <PublishToggle
          action={toggleShipmentPublishAction}
          idField="shipmentId"
          id={shipment.id}
          isPublished={shipment.isPublished}
          canEdit={canEdit && (shipment.isPublished || !datesMissing)}
        />
      </div>

      {datesMissing && !shipment.isPublished ? (
        <p className="mt-4 rounded-lg border border-mango-700 bg-mango-50 p-4 text-sm text-forest-900">
          Renseignez la date d&apos;arrivée et la fin des réservations pour pouvoir
          publier : la page d&apos;accueil annonce les deux.
        </p>
      ) : null}

      {canEdit ? (
        <section className="mt-8">
          <h2 className="font-display text-lg font-semibold text-forest-900">
            L&apos;arrivage
          </h2>
          <div className="mt-4 rounded-lg border border-line bg-surface p-5">
            <ShipmentEditor shipment={shipment} />
          </div>
        </section>
      ) : null}

      <section className="mt-8">
        <h2 className="font-display text-lg font-semibold text-forest-900">
          Ce qui arrive
        </h2>
        <p className="mt-1 text-sm text-muted">
          Les formats annoncés et leur quantité. C&apos;est cette liste, et la part déjà
          réservée, que le client voit sur la page d&apos;accueil.
        </p>

        {shipment.items.length === 0 ? (
          <p className="mt-4 rounded-lg border border-dashed border-line bg-surface p-6 text-center text-muted">
            Aucun format annoncé. L&apos;arrivage s&apos;affichera sans rien à réserver.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-lg border border-line bg-surface">
            <table className="w-full min-w-[40rem] text-sm">
              <thead className="border-b border-line text-left text-xs tracking-wide text-muted uppercase">
                <tr>
                  <th scope="col" className="px-4 py-3">Format</th>
                  <th scope="col" className="px-4 py-3 text-right">Annoncé</th>
                  <th scope="col" className="px-4 py-3 text-right">Réservé</th>
                  <th scope="col" className="px-4 py-3 text-right">Reste</th>
                  <th scope="col" className="px-4 py-3 text-right">Acompte</th>
                  {canEdit ? (
                    <th scope="col" className="px-4 py-3">
                      <span className="sr-only">Retirer</span>
                    </th>
                  ) : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {shipment.items.map((item) => (
                  <tr key={item.id} className="hover:bg-cream-100">
                    <td className="px-4 py-3">
                      <span className="font-semibold text-forest-900">
                        {item.productName}
                      </span>
                      <span className="block text-xs text-muted">
                        {item.label} · {item.sku}
                      </span>
                    </td>
                    <td className="tabular px-4 py-3 text-right">
                      {item.plannedQuantity}
                    </td>
                    <td className="tabular px-4 py-3 text-right">
                      {item.reservedQuantity}
                    </td>
                    <td className="tabular px-4 py-3 text-right">
                      {item.remainingQuantity}
                    </td>
                    <td className="tabular px-4 py-3 text-right">
                      {item.depositCents > 0 ? formatPrice(item.depositCents, "fr") : "—"}
                    </td>
                    {canEdit ? (
                      <td className="px-4 py-3 text-right">
                        {item.reservedQuantity > 0 ? (
                          <span className="text-xs text-muted">
                            Réservé — non retirable
                          </span>
                        ) : (
                          <form action={removeShipmentItemAction}>
                            <input type="hidden" name="itemId" value={item.id} />
                            <Button type="submit" variant="ghost" size="sm">
                              <Trash2 aria-hidden="true" className="size-4" />
                              Retirer
                              <span className="sr-only">
                                {" "}
                                {item.productName} {item.label} de l&apos;arrivage
                              </span>
                            </Button>
                          </form>
                        )}
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {canEdit ? (
          <ShipmentItemForm shipmentId={shipment.id} variants={variants} />
        ) : null}
      </section>
    </div>
  );
}
