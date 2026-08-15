import type { Metadata } from "next";
import { AlertTriangle } from "lucide-react";
import {
  getDeliveryZones,
  getPickupLocations,
  getUpcomingSlots,
} from "@/lib/admin/queries";
import { getStaffMember, hasRole } from "@/lib/supabase/auth";
import { toggleSlotAction } from "@/app/actions/admin";
import { PublishToggle } from "@/components/admin/publish-toggle";
import {
  PickupLocationRow,
  SlotGeneratorForm,
} from "@/components/admin/pickup-forms";
import { formatDate } from "@/lib/utils";
import {
  DeliveryZoneRow,
  NewDeliveryZoneForm,
  ShippingRateForm,
} from "@/components/admin/delivery-zone-form";
import { getLogistics } from "@/lib/checkout/checkout";
import { formatPrice } from "@/lib/utils";

export const metadata: Metadata = { title: "Livraison" };
export const dynamic = "force-dynamic";

export default async function AdminDeliveryPage() {
  const [zones, member, logistics, pickups, slots] = await Promise.all([
    getDeliveryZones(),
    getStaffMember(),
    getLogistics(),
    getPickupLocations(),
    getUpcomingSlots(),
  ]);
  const canEdit = member != null && hasRole(member, "super_admin", "manager");
  const { shipping } = logistics;

  // Un créneau appartient à un point de ramassage OU à une zone, jamais aux
  // deux : le préfixe porte le choix jusqu'à l'action.
  const slotTargets = [
    ...pickups.map((p) => ({ value: `pickup:${p.id}`, label: `Ramassage — ${p.name}` })),
    ...zones.map((z) => ({ value: `zone:${z.id}`, label: `Livraison — ${z.name}` })),
  ];

  return (
    <div>
      <h1 className="font-display text-[1.75rem] font-semibold text-forest-900">
        Livraison
      </h1>
      <p className="mt-1 text-sm text-muted">
        Les frais, le seuil de gratuité et le montant minimum, zone par zone. Ils sont
        relus au moment de la commande : une modification ne touche jamais une commande
        déjà passée.
      </p>

      {canEdit ? (
        <ul className="mt-6 space-y-3">
          {zones.map((zone) => (
            <DeliveryZoneRow key={zone.id} zone={zone} />
          ))}
        </ul>
      ) : (
        <ul className="mt-6 space-y-3">
          {zones.map((zone) => (
            <li key={zone.id} className="rounded-lg border border-line bg-surface p-4">
              <p className="font-semibold text-forest-900">{zone.name}</p>
              <p className="text-xs text-muted">
                {formatPrice(zone.feeCents, "fr")} · minimum{" "}
                {formatPrice(zone.minOrderCents, "fr")}
              </p>
            </li>
          ))}
        </ul>
      )}

      {canEdit ? (
        <div className="mt-8">
          <NewDeliveryZoneForm />
        </div>
      ) : null}

      <section className="mt-10">
        <h2 className="font-display text-lg font-semibold text-forest-900">
          Expédition postale
        </h2>
        <p className="mt-1 text-sm text-muted">
          Les frais des zones ci-dessus ne concernent que la livraison locale. L&apos;envoi
          par la poste a son propre tarif, unique pour tout le Canada.
        </p>

        <div className="mt-4">
          {canEdit ? (
            <ShippingRateForm
              feeCents={shipping.feeCents}
              freeThresholdCents={shipping.freeThresholdCents}
            />
          ) : (
            <p className="rounded-lg border border-line bg-surface p-5 text-sm text-muted">
              {formatPrice(shipping.feeCents, "fr")}
              {shipping.freeThresholdCents != null
                ? `, offerte dès ${formatPrice(shipping.freeThresholdCents, "fr")}`
                : ""}
            </p>
          )}
        </div>

        {shipping.feeCents === 0 && shipping.freeThresholdCents == null ? (
          <p className="mt-4 flex items-start gap-2 rounded-lg border-2 border-mango-700 bg-mango-50 p-4 text-sm text-forest-900">
            <AlertTriangle aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
            <span>
              Le tarif est à zéro : chaque commande partie par la poste ne rapporte aucun
              frais de port. Si c&apos;est voulu, il n&apos;y a rien à faire — sinon,
              saisissez un montant ci-dessus.
            </span>
          </p>
        ) : null}
      </section>

      <section className="mt-10">
        <h2 className="font-display text-lg font-semibold text-forest-900">
          Points de ramassage
        </h2>
        <p className="mt-1 text-sm text-muted">
          L&apos;adresse et les consignes que le client lit au paiement, puis dans son
          courriel de confirmation.
        </p>

        <ul className="mt-4 space-y-3">
          {pickups.map((location) =>
            canEdit ? (
              <PickupLocationRow key={location.id} location={location} />
            ) : (
              <li
                key={location.id}
                className="rounded-lg border border-line bg-surface p-4"
              >
                <p className="font-semibold text-forest-900">{location.name}</p>
                <p className="text-xs text-muted">{location.line1}</p>
              </li>
            ),
          )}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-lg font-semibold text-forest-900">
          Créneaux
        </h2>
        <p className="mt-1 text-sm text-muted">
          {slots.length} créneau{slots.length > 1 ? "x" : ""} à venir. Un créneau complet
          cesse d&apos;être proposé de lui-même : la capacité est garantie par la base.
        </p>

        {canEdit ? (
          <div className="mt-4">
            <SlotGeneratorForm targets={slotTargets} />
          </div>
        ) : null}

        {slots.length === 0 ? (
          <p className="mt-4 rounded-lg border border-dashed border-line bg-surface p-6 text-center text-muted">
            Aucun créneau à venir. Sans créneau, le client ne peut choisir ni ramassage ni
            livraison.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-lg border border-line bg-surface">
            <table className="w-full min-w-[38rem] text-sm">
              <thead className="border-b border-line text-left text-xs tracking-wide text-muted uppercase">
                <tr>
                  <th scope="col" className="px-4 py-3">Date</th>
                  <th scope="col" className="px-4 py-3">Horaire</th>
                  <th scope="col" className="px-4 py-3">Pour</th>
                  <th scope="col" className="px-4 py-3 text-right">Places</th>
                  <th scope="col" className="px-4 py-3">État</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {slots.map((slot) => (
                  <tr key={slot.id} className="hover:bg-cream-100">
                    <td className="px-4 py-3 text-forest-900">
                      {formatDate(slot.date, "fr")}
                    </td>
                    <td className="tabular px-4 py-3">
                      {slot.startTime} – {slot.endTime}
                    </td>
                    <td className="px-4 py-3 text-muted">{slot.targetName}</td>
                    <td className="tabular px-4 py-3 text-right">
                      {slot.booked} / {slot.capacity}
                    </td>
                    <td className="px-4 py-3">
                      <PublishToggle
                        action={toggleSlotAction}
                        idField="slotId"
                        id={slot.id}
                        isPublished={slot.isActive}
                        canEdit={canEdit}
                        publishedLabel="Ouvert"
                        hiddenLabel="Fermé"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
