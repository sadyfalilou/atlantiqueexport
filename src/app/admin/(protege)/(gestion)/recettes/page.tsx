import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { getAdminRecipes } from "@/lib/admin/queries";
import { getStaffMember, hasRole } from "@/lib/supabase/auth";
import { NewRecipeForm } from "@/components/admin/new-recipe-form";
import { PublishToggle } from "@/components/admin/publish-toggle";
import { toggleRecipePublishAction } from "@/app/actions/admin";

export const metadata: Metadata = { title: "Recettes" };
export const dynamic = "force-dynamic";

export default async function AdminRecipesPage() {
  const [recipes, member] = await Promise.all([getAdminRecipes(), getStaffMember()]);
  const canEdit = member != null && hasRole(member, "super_admin", "manager");

  const empty = recipes.filter((recipe) => recipe.stepCount === 0).length;

  return (
    <div>
      <h1 className="font-display text-[1.75rem] font-semibold text-forest-900">
        Recettes
      </h1>
      <p className="mt-1 text-sm text-muted">
        {recipes.length} recettes · {recipes.filter((r) => r.isPublished).length} en ligne
      </p>

      {empty > 0 ? (
        <section className="mt-6 rounded-lg border-2 border-mango-700 bg-mango-50 p-5">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-forest-900">
            <AlertTriangle aria-hidden="true" className="size-5" />
            {empty} recette{empty > 1 ? "s" : ""} sans étape
          </h2>
          <p className="mt-2 text-sm text-forest-900">
            Elles n&apos;ont qu&apos;un titre et une accroche. Le site les affiche avec la
            mention « recette en cours de rédaction » plutôt que d&apos;ouvrir une page
            vide. Écrivez les ingrédients et la préparation pour qu&apos;elles deviennent
            de vraies recettes.
          </p>
        </section>
      ) : null}

      <div className="mt-6 overflow-x-auto rounded-lg border border-line bg-surface">
        <table className="w-full min-w-[42rem] text-sm">
          <thead className="border-b border-line text-left text-xs tracking-wide text-muted uppercase">
            <tr>
              <th scope="col" className="px-4 py-3">Recette</th>
              <th scope="col" className="px-4 py-3 text-right">Ingrédients</th>
              <th scope="col" className="px-4 py-3 text-right">Étapes</th>
              <th scope="col" className="px-4 py-3">État</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {recipes.map((recipe) => (
              <tr key={recipe.id} className="hover:bg-cream-100">
                <td className="px-4 py-3">
                  {canEdit ? (
                    <Link
                      href={`/admin/recettes/${recipe.slug}`}
                      className="font-semibold text-forest-900 underline-offset-2 hover:underline"
                    >
                      {recipe.titleFr}
                    </Link>
                  ) : (
                    <span className="font-semibold text-forest-900">{recipe.titleFr}</span>
                  )}
                  <span className="block text-xs text-muted">/{recipe.slug}</span>
                </td>
                <td className="tabular px-4 py-3 text-right">
                  {recipe.ingredientCount || <span className="text-warning">0</span>}
                </td>
                <td className="tabular px-4 py-3 text-right">
                  {recipe.stepCount || <span className="text-warning">0</span>}
                </td>
                <td className="px-4 py-3">
                  <PublishToggle
                    action={toggleRecipePublishAction}
                    idField="recipeId"
                    id={recipe.id}
                    isPublished={recipe.isPublished}
                    // Une recette sans étape ne peut pas être publiée : le
                    // bouton disparaît plutôt que d'échouer en silence.
                    canEdit={canEdit && (recipe.isPublished || recipe.stepCount > 0)}
                    hiddenLabel="Masquée"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {canEdit ? (
        <div className="mt-8">
          <NewRecipeForm />
        </div>
      ) : (
        <p className="mt-6 rounded-lg border border-line bg-surface p-5 text-sm text-muted">
          Seuls un gestionnaire ou un super administrateur peuvent modifier les recettes.
        </p>
      )}
    </div>
  );
}
