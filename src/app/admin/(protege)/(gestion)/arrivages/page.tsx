import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock, Ship } from "lucide-react";
import { getAdminShipments } from "@/lib/admin/queries";
import { getStaffMember, hasRole } from "@/lib/supabase/auth";
import { toggleShipmentPublishAction } from "@/app/actions/admin";
import { NewShipmentForm } from "@/components/admin/new-shipment-form";
import { PublishToggle } from "@/components/admin/publish-toggle";
import { ListFilter } from "@/components/admin/list-filter";
import { matches } from "@/lib/admin/search";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Arrivages" };
export const dynamic = "force-dynamic";

export default async function AdminShipmentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q : "";

  const [all, member] = await Promise.all([getAdminShipments(), getStaffMember()]);
  const canEdit = member != null && hasRole(member, "super_admin", "manager");

  const shipments = all.filter((shipment) =>
    matches(query, shipment.code, shipment.titleFr, shipment.titleEn, shipment.status),
  );
  const online = all.filter((shipment) => shipment.isPublished).length;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-[1.75rem] font-semibold text-forest-900">
            Arrivages
          </h1>
          <p className="mt-1 text-sm text-muted">
            {query ? `${shipments.length} sur ${all.length}` : `${all.length}`} arrivage
            {all.length > 1 ? "s" : ""} · {online} en ligne. La section « Prochain
            arrivage » de l&apos;accueil affiche le plus proche des arrivages publiés.
          </p>
        </div>

        <ListFilter placeholder="Code, titre, statut…" label="Rechercher un arrivage" />
      </div>

      {shipments.length === 0 ? (
        <p className="mt-6 rounded-lg border border-dashed border-line bg-surface p-8 text-center text-muted">
          {query
            ? "Aucun arrivage ne correspond à cette recherche."
            : "Aucun arrivage. La page d'accueil affiche pour l'instant un encadré vide à la place."}
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-lg border border-line bg-surface">
          <table className="w-full min-w-[46rem] text-sm">
            <thead className="border-b border-line text-left text-xs tracking-wide text-muted uppercase">
              <tr>
                <th scope="col" className="px-4 py-3">Arrivage</th>
                <th scope="col" className="px-4 py-3">Arrivée prévue</th>
                <th scope="col" className="px-4 py-3">Fin des réservations</th>
                <th scope="col" className="px-4 py-3 text-right">Formats</th>
                <th scope="col" className="px-4 py-3">État</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {shipments.map((shipment) => (
                <tr key={shipment.id} className="hover:bg-cream-100">
                  <td className="px-4 py-3">
                    {canEdit ? (
                      <Link
                        href={`/admin/arrivages/${shipment.code}`}
                        className="inline-flex items-center gap-1.5 font-semibold text-forest-900 underline-offset-2 hover:underline"
                      >
                        <Ship aria-hidden="true" className="size-4" />
                        {shipment.titleFr}
                      </Link>
                    ) : (
                      <span className="font-semibold text-forest-900">
                        {shipment.titleFr}
                      </span>
                    )}
                    <span className="block text-xs text-muted">
                      {shipment.code}
                      {shipment.originCountry ? ` · ${shipment.originCountry}` : ""}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-forest-900">
                    {shipment.etaDate ? (
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarClock aria-hidden="true" className="size-4" />
                        {formatDate(shipment.etaDate, "fr")}
                      </span>
                    ) : (
                      <span className="text-warning">à préciser</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-forest-900">
                    {shipment.reservationDeadline ? (
                      formatDate(shipment.reservationDeadline, "fr")
                    ) : (
                      <span className="text-warning">à préciser</span>
                    )}
                  </td>
                  <td className="tabular px-4 py-3 text-right">
                    {shipment.items.length}
                  </td>
                  <td className="px-4 py-3">
                    <PublishToggle
                      action={toggleShipmentPublishAction}
                      idField="shipmentId"
                      id={shipment.id}
                      isPublished={shipment.isPublished}
                      // Publier sans dates est refusé côté serveur : mieux vaut
                      // ne pas proposer un bouton qui ne ferait rien.
                      canEdit={
                        canEdit &&
                        (shipment.isPublished ||
                          Boolean(shipment.etaDate && shipment.reservationDeadline))
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {canEdit ? (
        <div className="mt-8">
          <NewShipmentForm />
        </div>
      ) : null}
    </div>
  );
}
