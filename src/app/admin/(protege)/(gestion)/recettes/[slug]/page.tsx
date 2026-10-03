import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { getAdminRecipe } from "@/lib/admin/queries";
import { getStaffMember, hasRole } from "@/lib/supabase/auth";
import { RecipeEditor } from "@/components/admin/recipe-editor";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const recipe = await getAdminRecipe(slug);
  return { title: recipe?.titleFr ?? "Recette" };
}

export default async function AdminRecipePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const recipe = await getAdminRecipe(slug);
  if (!recipe) notFound();

  const member = await getStaffMember();
  const canEdit = member != null && hasRole(member, "super_admin", "manager");

  return (
    <div>
      <Link
        href="/admin/recettes"
        className="inline-flex h-11 items-center gap-1.5 text-sm font-semibold text-forest-800 hover:underline"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Toutes les recettes
      </Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-[1.75rem] font-semibold text-forest-900">
            {recipe.titleFr}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {recipe.ingredientCount} ingrédient{recipe.ingredientCount > 1 ? "s" : ""} ·{" "}
            {recipe.stepCount} étape{recipe.stepCount > 1 ? "s" : ""}
          </p>
        </div>

        {recipe.isPublished ? (
          <Link
            href={`/fr/recettes/${recipe.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 items-center gap-1.5 rounded-md px-3 text-sm font-semibold text-forest-800 hover:bg-cream-100"
          >
            <ExternalLink aria-hidden="true" className="size-4" />
            Voir sur le site
          </Link>
        ) : null}
      </div>

      <div className="mt-8 max-w-4xl">
        {canEdit ? (
          <RecipeEditor recipe={recipe} />
        ) : (
          <p className="rounded-lg border border-line bg-surface p-5 text-sm text-muted">
            Seuls un gestionnaire ou un super administrateur peuvent modifier les
            recettes.
          </p>
        )}
      </div>
    </div>
  );
}
