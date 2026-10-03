import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getProductFormOptions } from "@/lib/admin/queries";
import { getStaffMember, hasRole } from "@/lib/supabase/auth";
import { NewProductForm } from "@/components/admin/new-product-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Nouveau produit" };

export default async function NewProductPage() {
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

      <h1 className="mt-4 font-display text-2xl font-semibold text-forest-900">
        Nouveau produit
      </h1>
      <p className="mt-1 max-w-2xl text-sm text-muted">
        Le produit et son premier format sont créés ensemble. Les photographies
        s&apos;ajoutent ensuite, depuis sa fiche.
      </p>

      <div className="mt-8">
        {canEdit ? (
          <NewProductForm categories={categories} brands={brands} />
        ) : (
          <p className="max-w-2xl rounded-lg border border-line bg-surface p-5 text-sm text-muted">
            Seuls un gestionnaire ou un super administrateur peuvent créer un
            produit.
          </p>
        )}
      </div>
    </div>
  );
}
