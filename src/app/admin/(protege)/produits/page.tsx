import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Eye, EyeOff, Plus } from "lucide-react";
import { getAdminProducts, getPricingReadiness } from "@/lib/admin/queries";
import { getStaffMember, hasRole } from "@/lib/supabase/auth";
import { disableProvisionalPricesAction } from "@/app/actions/admin";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn, formatPrice } from "@/lib/utils";

export const metadata: Metadata = { title: "Produits" };
export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const [products, readiness, member] = await Promise.all([
    getAdminProducts(),
    getPricingReadiness(),
    getStaffMember(),
  ]);

  const canSwitch = member != null && hasRole(member, "super_admin");

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-[1.75rem] font-semibold text-forest-900">
            Produits
          </h1>
          <p className="mt-1 text-sm text-muted">
            {products.length} produits ·{" "}
            {products.reduce((n, p) => n + p.variants.length, 0)} formats ·{" "}
            {products.filter((p) => p.photos.length === 0).length} sans photo
          </p>
        </div>

        {member != null && hasRole(member, "super_admin", "manager") ? (
          <Link
            href="/admin/produits/nouveau"
            className={cn(buttonVariants({ variant: "primary" }))}
          >
            <Plus aria-hidden="true" className="size-4" />
            Nouveau produit
          </Link>
        ) : null}
      </div>

      {/* --- Sortie du mode démonstration --- */}
      {readiness.allowProvisional ? (
        <section className="mt-6 rounded-lg border-2 border-mango-700 bg-mango-50 p-5">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-forest-900">
            <AlertTriangle aria-hidden="true" className="size-5" />
            La boutique affiche des prix de démonstration
          </h2>

          {readiness.provisionalCount > 0 ? (
            <p className="mt-2 text-sm text-forest-900">
              <strong className="tabular">{readiness.provisionalCount}</strong> format
              {readiness.provisionalCount > 1 ? "s attendent" : " attend"} encore un vrai
              prix. Saisissez-les ci-dessous : chaque enregistrement retire le format de
              cette liste.
            </p>
          ) : (
            <>
              <p className="mt-2 text-sm text-forest-900">
                Tous les formats ont un prix réel. Vous pouvez retirer le bandeau
                d&apos;avertissement du site et passer en mode réel.
              </p>
              {canSwitch ? (
                <form action={disableProvisionalPricesAction} className="mt-4">
                  <Button type="submit" size="lg">
                    Passer la boutique en mode réel
                  </Button>
                  <p className="mt-2 text-sm text-muted">
                    Le bandeau disparaît et le garde-fou se réactive : plus aucun produit
                    non chiffré ne pourra être publié.
                  </p>
                </form>
              ) : (
                <p className="mt-2 text-sm text-muted">
                  Seul un super administrateur peut effectuer cette bascule.
                </p>
              )}
            </>
          )}
        </section>
      ) : (
        <p className="mt-6 flex items-center gap-2 rounded-lg border border-line bg-surface p-4 text-sm text-forest-900">
          <CheckCircle2 aria-hidden="true" className="size-5 shrink-0 text-success" />
          La boutique est en mode réel : les prix affichés sont ceux que vous avez saisis.
        </p>
      )}

      <div className="mt-6 overflow-x-auto rounded-lg border border-line bg-surface">
        <table className="w-full min-w-[44rem] text-sm">
          <thead className="border-b border-line text-left text-xs tracking-wide text-muted uppercase">
            <tr>
              <th scope="col" className="px-4 py-3">Produit</th>
              <th scope="col" className="px-4 py-3">Catégorie</th>
              <th scope="col" className="px-4 py-3">Formats</th>
              <th scope="col" className="px-4 py-3">Prix</th>
              <th scope="col" className="px-4 py-3">État</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {products.map((product) => (
              <tr key={product.id} className="hover:bg-cream-100">
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/produits/${product.slug}`}
                    className="font-semibold text-forest-900 underline-offset-2 hover:underline"
                  >
                    {product.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted">{product.categoryName ?? "—"}</td>
                <td className="tabular px-4 py-3">{product.variants.length}</td>
                <td className="px-4 py-3">
                  <span className="tabular text-forest-900">
                    {product.variants.length > 0
                      ? formatPrice(
                          Math.min(...product.variants.map((v) => v.retailPriceCents)),
                          "fr",
                        )
                      : "—"}
                  </span>
                  {product.hasProvisionalPrice ? (
                    <Badge variant="lowStock" className="ml-2">
                      démo
                    </Badge>
                  ) : null}
                </td>
                <td className="px-4 py-3">
                  {product.isPublished ? (
                    <span className="inline-flex items-center gap-1.5 text-success">
                      <Eye aria-hidden="true" className="size-4" />
                      En ligne
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-muted">
                      <EyeOff aria-hidden="true" className="size-4" />
                      Masqué
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
