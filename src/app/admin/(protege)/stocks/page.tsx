import type { Metadata } from "next";
import { AlertTriangle } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStaffMember, hasRole } from "@/lib/supabase/auth";
import { StockMovementForm } from "@/components/admin/stock-movement-form";

export const metadata: Metadata = { title: "Stocks" };
export const dynamic = "force-dynamic";

type Row = Record<string, unknown>;

/**
 * État des stocks, et saisie des mouvements.
 *
 * Aucune quantité ne s'écrit directement : tout passe par un mouvement daté,
 * signé et motivé. Écrire un total à la main ferait perdre l'historique, qui
 * est précisément ce qui permet de comprendre un écart d'inventaire.
 */
export default async function AdminStockPage() {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("stock_levels")
    .select(
      `quantity_on_hand, quantity_reserved, quantity_available, low_stock_threshold,
       variant:product_variants(id, sku, label_fr, product:products(name_fr))`,
    )
    .order("quantity_available")
    .limit(500);

  const rows = ((data ?? []) as Row[]).map((row) => {
    const variant = row.variant as Row | null;
    const product = variant?.product as Row | null;
    return {
      variantId: (variant?.id as string) ?? "",
      sku: (variant?.sku as string) ?? "",
      label: (variant?.label_fr as string) ?? "",
      name: (product?.name_fr as string) ?? "",
      onHand: row.quantity_on_hand as number,
      reserved: row.quantity_reserved as number,
      available: row.quantity_available as number,
      threshold: row.low_stock_threshold as number,
    };
  });

  const low = rows.filter((row) => row.available <= row.threshold).length;

  const [member, movements] = await Promise.all([
    getStaffMember(),
    supabase
      .from("stock_movements")
      .select(
        `id, movement_type, quantity_delta, reason, created_at,
         variant:product_variants(sku, label_fr, product:products(name_fr))`,
      )
      .order("created_at", { ascending: false })
      .limit(40),
  ]);

  const canEdit = member != null && hasRole(member, "super_admin", "manager");

  const movementLabels: Record<string, string> = {
    reception: "Réception",
    adjustment: "Ajustement",
    loss: "Perte",
    return: "Retour",
    sale: "Vente",
    reservation: "Réservation",
    release: "Libération",
    transfer: "Transfert",
  };

  const history = ((movements.data ?? []) as Row[]).map((row) => {
    const variant = row.variant as Row | null;
    const product = variant?.product as Row | null;
    return {
      id: row.id as string,
      type: row.movement_type as string,
      delta: row.quantity_delta as number,
      reason: (row.reason as string | null) ?? null,
      at: row.created_at as string,
      name: (product?.name_fr as string) ?? "",
      label: (variant?.label_fr as string) ?? "",
    };
  });

  return (
    <div>
      <h1 className="font-display text-[1.75rem] font-semibold text-forest-900">Stocks</h1>
      <p className="mt-1 text-sm text-muted">
        {rows.length} format{rows.length > 1 ? "s" : ""} suivi
        {rows.length > 1 ? "s" : ""}
        {low > 0 ? ` — ${low} sous le seuil d'alerte` : ""}
      </p>

      <div className="mt-6 overflow-x-auto rounded-lg border border-line bg-surface">
        <table className="w-full min-w-[42rem] text-sm">
          <thead className="border-b border-line text-left text-xs tracking-wide text-muted uppercase">
            <tr>
              <th scope="col" className="px-4 py-3">Produit</th>
              <th scope="col" className="px-4 py-3 text-right">Détenu</th>
              <th scope="col" className="px-4 py-3 text-right">Réservé</th>
              <th scope="col" className="px-4 py-3 text-right">Disponible</th>
              <th scope="col" className="px-4 py-3 text-right">Seuil</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((row) => {
              const isLow = row.available <= row.threshold;
              return (
                <tr key={row.sku} className={isLow ? "bg-mango-50" : undefined}>
                  <td className="px-4 py-3">
                    <span className="block font-semibold text-forest-900">{row.name}</span>
                    <span className="block text-xs text-muted">
                      {row.label} · {row.sku}
                    </span>
                  </td>
                  <td className="tabular px-4 py-3 text-right">{row.onHand}</td>
                  <td className="tabular px-4 py-3 text-right text-muted">
                    {row.reserved}
                  </td>
                  <td
                    className={`tabular px-4 py-3 text-right font-semibold ${
                      isLow ? "text-warning" : "text-forest-900"
                    }`}
                  >
                    {isLow ? (
                      <span className="inline-flex items-center gap-1.5">
                        <AlertTriangle aria-hidden="true" className="size-4" />
                        {row.available}
                      </span>
                    ) : (
                      row.available
                    )}
                  </td>
                  <td className="tabular px-4 py-3 text-right text-muted">
                    {row.threshold}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <section className="mt-10 max-w-3xl">
        <h2 className="font-display text-lg font-semibold text-forest-900">
          Enregistrer un mouvement
        </h2>
        <p className="mt-1 text-sm text-muted">
          Aucune quantité ne se corrige à la main : chaque variation passe par un
          mouvement daté, signé et motivé.
        </p>

        <div className="mt-4">
          {canEdit ? (
            <StockMovementForm variants={rows} />
          ) : (
            <p className="rounded-lg border border-line bg-surface p-5 text-sm text-muted">
              Seuls un gestionnaire ou un super administrateur peuvent modifier
              les stocks.
            </p>
          )}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-lg font-semibold text-forest-900">
          Registre des mouvements
        </h2>
        <p className="mt-1 text-sm text-muted">
          Les quarante derniers, saisies et ventes confondues.
        </p>

        {history.length === 0 ? (
          <p className="mt-4 rounded-lg border border-dashed border-line-strong bg-cream-50 p-5 text-sm text-muted">
            Aucun mouvement enregistré pour l&apos;instant.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-lg border border-line bg-surface">
            <table className="w-full min-w-[42rem] text-sm">
              <thead className="border-b border-line text-left text-xs tracking-wide text-muted uppercase">
                <tr>
                  <th scope="col" className="px-4 py-3">Date</th>
                  <th scope="col" className="px-4 py-3">Produit</th>
                  <th scope="col" className="px-4 py-3">Nature</th>
                  <th scope="col" className="px-4 py-3 text-right">Variation</th>
                  <th scope="col" className="px-4 py-3">Motif</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {history.map((entry) => (
                  <tr key={entry.id}>
                    <td className="px-4 py-3 whitespace-nowrap text-muted">
                      {new Date(entry.at).toLocaleDateString("fr-CA", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <span className="block text-forest-900">{entry.name}</span>
                      <span className="block text-xs text-muted">{entry.label}</span>
                    </td>
                    <td className="px-4 py-3">
                      {movementLabels[entry.type] ?? entry.type}
                    </td>
                    <td
                      className={`tabular px-4 py-3 text-right font-semibold ${
                        entry.delta > 0 ? "text-success" : "text-danger"
                      }`}
                    >
                      {entry.delta > 0 ? `+${entry.delta}` : entry.delta}
                    </td>
                    <td className="px-4 py-3 text-muted">{entry.reason ?? "—"}</td>
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
