import type { Metadata } from "next";
import { AlertTriangle } from "lucide-react";
import { getDeliveryZones } from "@/lib/admin/queries";
import { getStaffMember, hasRole } from "@/lib/supabase/auth";
import { DeliveryZoneRow } from "@/components/admin/delivery-zone-form";
import { formatPrice } from "@/lib/utils";

export const metadata: Metadata = { title: "Livraison" };
export const dynamic = "force-dynamic";

export default async function AdminDeliveryPage() {
  const [zones, member] = await Promise.all([getDeliveryZones(), getStaffMember()]);
  const canEdit = member != null && hasRole(member, "super_admin", "manager");

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

      {/*
        Signalé ici plutôt que corrigé en douce : mettre un prix sur
        l'expédition postale est une décision commerciale, pas une correction
        technique. Mais elle ne doit pas rester invisible.
      */}
      <section className="mt-8 rounded-lg border-2 border-mango-700 bg-mango-50 p-5">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-forest-900">
          <AlertTriangle aria-hidden="true" className="size-5" />
          L&apos;expédition postale est facturée zéro
        </h2>
        <p className="mt-2 text-sm text-forest-900">
          Les frais ci-dessus ne s&apos;appliquent qu&apos;à la{" "}
          <strong>livraison locale</strong>. Le ramassage est gratuit, ce qui est normal —
          mais l&apos;<strong>expédition par la poste</strong> l&apos;est aussi, ce qui ne
          l&apos;est probablement pas. Elle est proposée dès qu&apos;un panier ne contient
          que des produits de conservation ambiante, et la commande part sans un sou de
          frais de port.
        </p>
        <p className="mt-2 text-sm text-forest-900">
          Il n&apos;y a aujourd&apos;hui aucun endroit où saisir ce tarif : ni la table des
          zones ni la transaction de commande n&apos;en prévoient un. Dites-moi quelle
          règle vous voulez — montant fixe, palier selon le poids, gratuité au-delà
          d&apos;un seuil — et je l&apos;ajoute.
        </p>
      </section>
    </div>
  );
}
