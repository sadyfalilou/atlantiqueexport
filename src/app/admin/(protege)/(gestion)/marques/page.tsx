import type { Metadata } from "next";
import { getAdminBrands } from "@/lib/admin/queries";
import { getStaffMember, hasRole } from "@/lib/supabase/auth";
import { BrandRow, NewBrandForm } from "@/components/admin/taxonomy-forms";

export const metadata: Metadata = { title: "Marques" };
export const dynamic = "force-dynamic";

export default async function AdminBrandsPage() {
  const [brands, member] = await Promise.all([getAdminBrands(), getStaffMember()]);
  const canEdit = member != null && hasRole(member, "super_admin", "manager");

  return (
    <div className="max-w-4xl">
      <h1 className="font-display text-[1.75rem] font-semibold text-forest-900">
        Marques
      </h1>
      <p className="mt-1 text-sm text-muted">
        {brands.length} marques · {brands.reduce((n, b) => n + b.productCount, 0)}{" "}
        produits rattachés
      </p>

      {!canEdit ? (
        <p className="mt-6 rounded-lg border border-line bg-surface p-5 text-sm text-muted">
          Seuls un gestionnaire ou un super administrateur peuvent modifier les
          marques.
        </p>
      ) : (
        <>
          <ul className="mt-6 flex flex-col gap-3">
            {brands.map((brand) => (
              <BrandRow key={brand.id} brand={brand} />
            ))}
          </ul>

          <div className="mt-8">
            <NewBrandForm />
          </div>
        </>
      )}

      <p className="mt-10 text-xs text-muted">
        Masquer une marque la retire du site sans détacher ses produits, qui
        restent en vente sous leur catégorie. C&apos;est ainsi que la marque
        Sonagoo a été retirée de l&apos;affichage sans toucher à son catalogue.
      </p>
    </div>
  );
}
