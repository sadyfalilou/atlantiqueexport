import type { Metadata } from "next";
import { getAdminCategories } from "@/lib/admin/queries";
import { getStaffMember, hasRole } from "@/lib/supabase/auth";
import { CategoryRow, NewCategoryForm } from "@/components/admin/taxonomy-forms";

export const metadata: Metadata = { title: "Catégories" };
export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  const [categories, member] = await Promise.all([
    getAdminCategories(),
    getStaffMember(),
  ]);
  const canEdit = member != null && hasRole(member, "super_admin", "manager");

  // Les rayons calculés — Nouveautés, Promotions — pointent vers une route
  // dédiée plutôt que vers une vraie catégorie : on ne peut pas y ranger un
  // produit, et les renommer n'aurait pas le même sens.
  const real = categories.filter((category) => !category.isVirtual);
  const virtual = categories.filter((category) => category.isVirtual);

  return (
    <div className="max-w-4xl">
      <h1 className="font-display text-[1.75rem] font-semibold text-forest-900">
        Catégories
      </h1>
      <p className="mt-1 text-sm text-muted">
        {real.length} rayons · {real.reduce((n, c) => n + c.productCount, 0)} produits
        rangés
      </p>

      {!canEdit ? (
        <p className="mt-6 rounded-lg border border-line bg-surface p-5 text-sm text-muted">
          Seuls un gestionnaire ou un super administrateur peuvent modifier les
          catégories.
        </p>
      ) : (
        <>
          <ul className="mt-6 flex flex-col gap-3">
            {real.map((category) => (
              <CategoryRow key={category.id} category={category} />
            ))}
          </ul>

          <div className="mt-8">
            <NewCategoryForm />
          </div>
        </>
      )}

      {virtual.length > 0 ? (
        <section className="mt-10">
          <h2 className="font-display text-lg font-semibold text-forest-900">
            Rayons calculés
          </h2>
          <p className="mt-1 text-sm text-muted">
            Ces entrées du menu ne contiennent pas de produits rangés : elles
            mènent à une page qui les calcule. Elles ne se modifient pas ici.
          </p>
          <ul className="mt-4 flex flex-col gap-2">
            {virtual.map((category) => (
              <li
                key={category.id}
                className="rounded-lg border border-line bg-cream-50 px-4 py-3 text-sm"
              >
                <span className="font-semibold text-forest-900">{category.nameFr}</span>{" "}
                <code className="text-xs text-muted">{category.slug}</code>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="mt-10 text-xs text-muted">
        Une catégorie ne se supprime pas depuis cette page. La masquer la retire
        du site sans détacher les produits qu&apos;elle porte, ce qui est
        réversible — une suppression, elle, laisserait ces produits sans rayon.
      </p>
    </div>
  );
}
