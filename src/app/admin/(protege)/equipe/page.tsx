import type { Metadata } from "next";
import { UserMinus } from "lucide-react";
import { getStaffDirectory } from "@/lib/admin/queries";
import { requireSection } from "@/lib/admin/guard";
import { ASSIGNABLE_ROLES, ROLE_HINTS, ROLE_LABELS } from "@/lib/admin/roles";
import { revokeStaffAccessAction } from "@/app/actions/admin";
import { AddStaffForm, RoleForm } from "@/components/admin/team-forms";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Équipe" };
export const dynamic = "force-dynamic";

export default async function AdminTeamPage() {
  const [member, staff] = await Promise.all([
    requireSection("/admin/equipe"),
    getStaffDirectory(),
  ]);

  return (
    <div>
      <h1 className="font-display text-[1.75rem] font-semibold text-forest-900">Équipe</h1>
      <p className="mt-1 text-sm text-muted">
        Qui peut entrer dans l&apos;administration, et jusqu&apos;où.
      </p>

      <ul className="mt-6 space-y-3">
        {staff.map((entry) => {
          const isSelf = entry.userId === member.userId;

          return (
            <li
              key={entry.userId}
              className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-line bg-surface p-4"
            >
              <div className="min-w-0">
                <p className="font-semibold text-forest-900">
                  {entry.email}
                  {isSelf ? (
                    <span className="ml-2 rounded-sm bg-cream-200 px-1.5 py-0.5 text-xs font-semibold text-forest-800">
                      vous
                    </span>
                  ) : null}
                </p>
                <p className="mt-0.5 text-xs text-muted">
                  {entry.roles.map((role) => ROLE_LABELS[role]).join(", ")}
                  {entry.lastSignInAt
                    ? ` · dernière connexion le ${formatDate(entry.lastSignInAt)}`
                    : " · jamais connectée"}
                </p>
              </div>

              {/*
                Son propre rôle n'est ni modifiable ni retirable : c'est ce qui
                garantit qu'il reste toujours au moins un super administrateur,
                sans avoir à compter les lignes.
              */}
              {isSelf ? (
                <p className="text-sm text-muted">
                  Votre propre accès ne se modifie pas d&apos;ici.
                </p>
              ) : (
                <div className="flex flex-wrap items-center gap-3">
                  <RoleForm
                    userId={entry.userId}
                    role={entry.roles[0]}
                    email={entry.email}
                  />
                  <form action={revokeStaffAccessAction}>
                    <input type="hidden" name="userId" value={entry.userId} />
                    <button
                      type="submit"
                      className="inline-flex h-9 items-center gap-1.5 rounded-md px-2 text-xs font-semibold text-danger underline hover:bg-cream-100"
                    >
                      <UserMinus aria-hidden="true" className="size-4" />
                      Retirer l&apos;accès
                    </button>
                  </form>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <section className="mt-10 rounded-lg border border-line bg-surface p-5">
        <h2 className="font-display text-lg font-semibold text-forest-900">
          Ajouter quelqu&apos;un
        </h2>
        <p className="mt-1 text-sm text-muted">
          Si la personne n&apos;a pas encore de compte, il est créé et une invitation
          lui part aussitôt : elle y choisit son mot de passe, valable une heure.
          Aucun mot de passe n&apos;est jamais fabriqué ni envoyé. Si elle a déjà un
          compte sur le site, elle garde le sien et reçoit simplement le rôle.
        </p>
        <AddStaffForm />
      </section>

      <section className="mt-8">
        <h2 className="font-display text-lg font-semibold text-forest-900">
          Ce que chaque rôle ouvre
        </h2>
        <dl className="mt-3 space-y-2 text-sm">
          {ASSIGNABLE_ROLES.map((role) => (
            <div key={role} className="flex flex-wrap gap-x-2">
              <dt className="font-semibold text-forest-900">{ROLE_LABELS[role]} :</dt>
              <dd className="text-muted">{ROLE_HINTS[role]}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-sm text-muted">
          Un changement prend effet à la page suivante : le rôle est relu en base à
          chaque requête, sans attendre la fin d&apos;une session.
        </p>
      </section>
    </div>
  );
}
