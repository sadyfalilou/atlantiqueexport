import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, Eye, EyeOff, Plus } from "lucide-react";
import { getAdminPages } from "@/lib/admin/queries";
import { getStaffMember, hasRole } from "@/lib/supabase/auth";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Pages" };
export const dynamic = "force-dynamic";

export default async function AdminPagesPage() {
  const [pages, member] = await Promise.all([getAdminPages(), getStaffMember()]);
  const canEdit = member != null && hasRole(member, "super_admin", "manager");

  const pending = pages.reduce((n, page) => n + page.pendingCount, 0);
  const drafts = pages.filter((page) => page.isDraftLegal).length;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-[1.75rem] font-semibold text-forest-900">
            Pages
          </h1>
          <p className="mt-1 text-sm text-muted">
            {pages.length} pages · {drafts} brouillon{drafts > 1 ? "s" : ""} juridique
            {drafts > 1 ? "s" : ""}
          </p>
        </div>

        {canEdit ? (
          <Link
            href="/admin/pages/nouvelle"
            className={cn(buttonVariants({ variant: "primary" }))}
          >
            <Plus aria-hidden="true" className="size-4" />
            Nouvelle page
          </Link>
        ) : null}
      </div>

      {pending > 0 ? (
        <section className="mt-6 rounded-lg border-2 border-mango-700 bg-mango-50 p-5">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-forest-900">
            <AlertTriangle aria-hidden="true" className="size-5" />
            {pending} mention{pending > 1 ? "s" : ""} « à confirmer » sur le site
          </h2>
          <p className="mt-2 text-sm text-forest-900">
            Ce sont les informations que vous seul pouvez fournir : raison sociale,
            numéro d&apos;entreprise, adresse, téléphone, délais commerciaux. Elles
            s&apos;affichent en clair aux visiteurs — à remplacer avant la première
            vente.
          </p>
        </section>
      ) : null}

      <div className="mt-6 overflow-x-auto rounded-lg border border-line bg-surface">
        <table className="w-full min-w-[46rem] text-sm">
          <thead className="border-b border-line text-left text-xs tracking-wide text-muted uppercase">
            <tr>
              <th scope="col" className="px-4 py-3">Page</th>
              <th scope="col" className="px-4 py-3">Adresse</th>
              <th scope="col" className="px-4 py-3 text-right">À confirmer</th>
              <th scope="col" className="px-4 py-3">Nature</th>
              <th scope="col" className="px-4 py-3">État</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {pages.map((page) => (
              <tr key={page.id} className="hover:bg-cream-100">
                <td className="px-4 py-3">
                  {canEdit ? (
                    <Link
                      href={`/admin/pages/${page.slug}`}
                      className="font-semibold text-forest-900 underline-offset-2 hover:underline"
                    >
                      {page.titleFr}
                    </Link>
                  ) : (
                    <span className="font-semibold text-forest-900">{page.titleFr}</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <code className="text-xs text-muted">/{page.slug}</code>
                </td>
                <td className="tabular px-4 py-3 text-right">
                  {page.pendingCount > 0 ? (
                    <span className="font-semibold text-warning">{page.pendingCount}</span>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {page.isDraftLegal ? (
                    <span className="text-warning">Brouillon juridique</span>
                  ) : (
                    <span className="text-muted">Informative</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {page.isPublished ? (
                    <span className="inline-flex items-center gap-1.5 text-success">
                      <Eye aria-hidden="true" className="size-4" />
                      En ligne
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-muted">
                      <EyeOff aria-hidden="true" className="size-4" />
                      Masquée
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!canEdit ? (
        <p className="mt-6 rounded-lg border border-line bg-surface p-5 text-sm text-muted">
          Seuls un gestionnaire ou un super administrateur peuvent modifier les pages.
        </p>
      ) : null}
    </div>
  );
}
