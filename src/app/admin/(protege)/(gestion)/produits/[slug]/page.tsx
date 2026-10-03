import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Eye, EyeOff, ExternalLink } from "lucide-react";
import { getAdminProduct, getProductFormOptions } from "@/lib/admin/queries";
import { getStaffMember, hasRole } from "@/lib/supabase/auth";
import { togglePublishAction } from "@/app/actions/admin";
import { PriceForm } from "@/components/admin/price-form";
import { PhotoManager } from "@/components/admin/photo-manager";
import { ProductEditForm } from "@/components/admin/product-edit-form";
import { VariantManager } from "@/components/admin/variant-manager";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getAdminProduct(slug);
  return { title: product?.name ?? "Produit" };
}

export default async function AdminProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getAdminProduct(slug);
  if (!product) notFound();

  const member = await getStaffMember();
  const canEdit = member != null && hasRole(member, "super_admin", "manager");
  const { categories, brands } = await getProductFormOptions();

  return (
    <div>
      <Link
        href="/admin/produits"
        className="inline-flex h-11 items-center gap-1.5 text-sm font-semibold text-forest-800 hover:underline"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Tous les produits
      </Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-[1.75rem] font-semibold text-forest-900">
            {product.name}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {product.categoryName ?? "Sans catégorie"} · {product.variants.length} format
            {product.variants.length > 1 ? "s" : ""}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={`/fr/produit/${product.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 items-center gap-1.5 rounded-md px-3 text-sm font-semibold text-forest-800 hover:bg-cream-100"
          >
            <ExternalLink aria-hidden="true" className="size-4" />
            Voir sur le site
          </Link>

          {canEdit ? (
            <form action={togglePublishAction}>
              <input type="hidden" name="productId" value={product.id} />
              <input type="hidden" name="publish" value={product.isPublished ? "0" : "1"} />
              <Button type="submit" variant={product.isPublished ? "outline" : "secondary"}>
                {product.isPublished ? (
                  <>
                    <EyeOff aria-hidden="true" className="size-4" />
                    Retirer du site
                  </>
                ) : (
                  <>
                    <Eye aria-hidden="true" className="size-4" />
                    Publier
                  </>
                )}
              </Button>
            </form>
          ) : null}
        </div>
      </div>

      <section className="mt-8">
        <h2 className="font-display text-lg font-semibold text-forest-900">
          Informations
        </h2>
        <p className="mt-1 text-sm text-muted">
          Ce que le client lit sur la fiche, dans les deux langues.
        </p>

        <div className="mt-4">
          {canEdit ? (
            <ProductEditForm
              product={product}
              categories={categories}
              brands={brands}
            />
          ) : (
            <p className="rounded-lg border border-line bg-surface p-5 text-sm text-muted">
              Seuls un gestionnaire ou un super administrateur peuvent modifier
              un produit.
            </p>
          )}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="font-display text-lg font-semibold text-forest-900">
          Photographies
        </h2>
        <p className="mt-1 text-sm text-muted">
          La photo principale est celle qui paraît dans la boutique, sur la fiche
          et dans le panier.
        </p>

        <div className="mt-4">
          {canEdit ? (
            <PhotoManager
              productId={product.id}
              slug={product.slug}
              productName={product.name}
              photos={product.photos}
            />
          ) : (
            <p className="rounded-lg border border-line bg-surface p-5 text-sm text-muted">
              Seuls un gestionnaire ou un super administrateur peuvent modifier
              les photographies.
            </p>
          )}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="font-display text-lg font-semibold text-forest-900">Formats</h2>
        <p className="mt-1 text-sm text-muted">
          Chaque format porte son propre prix et son propre stock.
        </p>

        <div className="mt-4">
          {canEdit ? (
            <VariantManager
              productId={product.id}
              slug={product.slug}
              variants={product.variants}
            />
          ) : (
            <p className="rounded-lg border border-line bg-surface p-5 text-sm text-muted">
              Seuls un gestionnaire ou un super administrateur peuvent modifier
              les formats.
            </p>
          )}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="font-display text-lg font-semibold text-forest-900">Prix</h2>
        <p className="mt-1 text-sm text-muted">
          Montants en dollars canadiens. La virgule et le point sont acceptés.
        </p>

        <div className="mt-4">
          {canEdit ? (
            <PriceForm productId={product.id} variants={product.variants} />
          ) : (
            <p className="rounded-lg border border-line bg-surface p-5 text-sm text-muted">
              Seuls un gestionnaire ou un super administrateur peuvent modifier les prix.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
