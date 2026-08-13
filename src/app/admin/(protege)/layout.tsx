import { redirect } from "next/navigation";
import Link from "next/link";
import { ClipboardList, LayoutDashboard, LogOut, Package, Tag } from "lucide-react";
import { getStaffMember } from "@/lib/supabase/auth";
import { signOutAction } from "@/app/actions/admin";

/**
 * Garde d'accès de l'administration.
 *
 * Toute page de ce groupe passe par ici : une personne sans rôle est renvoyée
 * AVANT que le moindre contenu ne soit rendu. La vérification interroge la
 * base à chaque requête, si bien que retirer un rôle prend effet aussitôt,
 * sans attendre l'expiration d'une session.
 */
export default async function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const member = await getStaffMember();
  if (!member) redirect("/admin/connexion");

  return (
    <>
      <header className="bg-forest-900 text-cream-50">
        <div className="mx-auto flex w-full max-w-[80rem] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
          <Link href="/admin" className="font-display text-lg font-semibold">
            Administration
          </Link>

          <nav aria-label="Administration" className="flex flex-wrap items-center gap-1">
            <AdminLink href="/admin" icon={<LayoutDashboard className="size-4" />}>
              Tableau de bord
            </AdminLink>
            <AdminLink href="/admin/commandes" icon={<ClipboardList className="size-4" />}>
              Commandes
            </AdminLink>
            <AdminLink href="/admin/produits" icon={<Tag className="size-4" />}>
              Produits
            </AdminLink>
            <AdminLink href="/admin/stocks" icon={<Package className="size-4" />}>
              Stocks
            </AdminLink>
          </nav>

          <div className="ml-auto flex items-center gap-3 text-sm">
            <span className="hidden text-cream-200 sm:inline">{member.email}</span>
            <form action={signOutAction}>
              <button
                type="submit"
                className="inline-flex h-11 items-center gap-1.5 rounded-md px-3 font-semibold transition-colors hover:bg-forest-800"
              >
                <LogOut aria-hidden="true" className="size-4" />
                Quitter
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[80rem] flex-1 px-4 py-8 sm:px-6">
        {children}
      </main>
    </>
  );
}

function AdminLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex h-11 items-center gap-1.5 rounded-md px-3 text-sm font-semibold transition-colors hover:bg-forest-800"
    >
      {icon}
      {children}
    </Link>
  );
}
