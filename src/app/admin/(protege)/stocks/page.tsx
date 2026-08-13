import type { Metadata } from "next";
import { AlertTriangle } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Stocks" };
export const dynamic = "force-dynamic";

type Row = Record<string, unknown>;

/**
 * État des stocks, en lecture.
 *
 * La modification passera par les mouvements (réception, ajustement, perte),
 * pour que chaque variation laisse une trace au registre. Écrire directement
 * une quantité ici ferait perdre l'historique, qui est précisément ce qui
 * permet de comprendre un écart d'inventaire.
 */
export default async function AdminStockPage() {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("stock_levels")
    .select(
      `quantity_on_hand, quantity_reserved, quantity_available, low_stock_threshold,
       variant:product_variants(sku, label_fr, product:products(name_fr))`,
    )
    .order("quantity_available")
    .limit(500);

  const rows = ((data ?? []) as Row[]).map((row) => {
    const variant = row.variant as Row | null;
    const product = variant?.product as Row | null;
    return {
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
    </div>
  );
}
