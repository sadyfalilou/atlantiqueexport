import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { getAdminPage } from "@/lib/admin/queries";
import { getStaffMember, hasRole } from "@/lib/supabase/auth";
import { PageEditor } from "@/components/admin/page-editor";

export const dynamic = "force-dynamic";

/**
 * Édition d'une page, ou création si le segment vaut « nouvelle ».
 *
 * Une route plutôt que deux : les deux formulaires sont identiques à la seule
 * différence que l'adresse est modifiable à la création et figée ensuite.
 */
const CREATION = "nouvelle";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const path = slug.join("/");
  if (path === CREATION) return { title: "Nouvelle page" };
  const page = await getAdminPage(path);
  return { title: page?.titleFr ?? "Page" };
}

export default async function AdminPageEditor({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  const path = slug.join("/");
  const creating = path === CREATION;

  const member = await getStaffMember();
  const canEdit = member != null && hasRole(member, "super_admin", "manager");
  const canChangeDraft = member != null && hasRole(member, "super_admin");

  const page = creating ? null : await getAdminPage(path);
  if (!creating && !page) notFound();

  return (
    <div>
      <Link
        href="/admin/pages"
        className="inline-flex h-11 items-center gap-1.5 text-sm font-semibold text-forest-800 hover:underline"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Toutes les pages
      </Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-[1.75rem] font-semibold text-forest-900">
            {creating ? "Nouvelle page" : page!.titleFr}
          </h1>
          {page ? (
            <p className="mt-1 text-sm text-muted">
              <code>/{page.slug}</code>
              {page.pendingCount > 0
                ? ` · ${page.pendingCount} mention${page.pendingCount > 1 ? "s" : ""} « à confirmer »`
                : ""}
            </p>
          ) : null}
        </div>

        {page?.isPublished ? (
          <Link
            href={`/fr/${page.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 items-center gap-1.5 rounded-md px-3 text-sm font-semibold text-forest-800 hover:bg-cream-100"
          >
            <ExternalLink aria-hidden="true" className="size-4" />
            Voir sur le site
          </Link>
        ) : null}
      </div>

      <div className="mt-8">
        {canEdit ? (
          <PageEditor page={page ?? undefined} canChangeDraft={canChangeDraft} />
        ) : (
          <p className="max-w-2xl rounded-lg border border-line bg-surface p-5 text-sm text-muted">
            Seuls un gestionnaire ou un super administrateur peuvent modifier les
            pages.
          </p>
        )}
      </div>
    </div>
  );
}
