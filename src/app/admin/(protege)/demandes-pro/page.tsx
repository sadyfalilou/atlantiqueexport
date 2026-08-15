import type { Metadata } from "next";
import { Briefcase, Check, Mail, Phone, Undo2, X } from "lucide-react";
import { getBusinessRequests } from "@/lib/admin/queries";
import { getStaffMember, hasRole } from "@/lib/supabase/auth";
import { decideBusinessAccountAction } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Demandes professionnelles" };
export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  approved: "Approuvée",
  rejected: "Refusée",
};

export default async function AdminBusinessRequestsPage() {
  const [requests, member] = await Promise.all([getBusinessRequests(), getStaffMember()]);
  const canDecide = member != null && hasRole(member, "super_admin", "manager");

  const pending = requests.filter((request) => request.status === "pending");

  return (
    <div>
      <h1 className="font-display text-[1.75rem] font-semibold text-forest-900">
        Demandes professionnelles
      </h1>
      <p className="mt-1 text-sm text-muted">
        {pending.length} en attente · {requests.length} au total.
      </p>

      {/*
        Dire exactement ce que le bouton fait, et surtout ce qu'il ne fait pas.
        Croire qu'approuver applique le tarif de gros mènerait à promettre un
        prix au téléphone que la boutique ne facturerait jamais.
      */}
      <p className="mt-4 rounded-lg border border-line bg-cream-50 p-4 text-sm text-forest-900">
        Approuver marque le compte comme actif : le client le voit sur sa page « Compte
        professionnel ». <strong>Les prix affichés ne changent pas encore</strong> — le
        tarif de gros est saisi par format, mais aucun parcours ne le sert pour
        l&apos;instant. Aucun courriel ne part non plus : écrivez au client pour convenir
        de ses prix.
      </p>

      {requests.length === 0 ? (
        <p className="mt-8 rounded-lg border border-dashed border-line bg-surface p-8 text-center text-muted">
          Aucune demande pour le moment.
        </p>
      ) : (
        <ul className="mt-6 space-y-4">
          {requests.map((request) => (
            <li
              key={request.id}
              className={`rounded-lg border bg-surface p-5 ${
                request.status === "pending" ? "border-mango-700" : "border-line"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-forest-900">
                    <Briefcase aria-hidden="true" className="size-5 shrink-0" />
                    {request.companyName}
                  </h2>
                  <p className="mt-1 text-sm text-muted">
                    Demande du {formatDate(request.createdAt.slice(0, 10), "fr")}
                    {request.businessNumber
                      ? ` · Numéro d'entreprise ${request.businessNumber}`
                      : ""}
                  </p>
                </div>

                <span
                  className={`inline-flex h-8 items-center rounded-full px-3 text-sm font-semibold ${
                    request.status === "approved"
                      ? "bg-forest-50 text-success"
                      : request.status === "rejected"
                        ? "bg-cream-100 text-muted"
                        : "bg-mango-50 text-mango-800"
                  }`}
                >
                  {STATUS_LABELS[request.status]}
                </span>
              </div>

              <dl className="mt-4 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted">Personne à joindre</dt>
                  <dd className="text-forest-900">{request.contactName || "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted">Coordonnées</dt>
                  <dd className="space-y-1 text-forest-900">
                    {request.contactEmail ? (
                      <a
                        href={`mailto:${request.contactEmail}`}
                        className="inline-flex items-center gap-1.5 underline-offset-2 hover:underline"
                      >
                        <Mail aria-hidden="true" className="size-4" />
                        {request.contactEmail}
                      </a>
                    ) : null}
                    {request.contactPhone ? (
                      <a
                        href={`tel:${request.contactPhone}`}
                        className="flex items-center gap-1.5 underline-offset-2 hover:underline"
                      >
                        <Phone aria-hidden="true" className="size-4" />
                        {request.contactPhone}
                      </a>
                    ) : null}
                    {!request.contactEmail && !request.contactPhone ? "—" : null}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-muted">Produits et volumes qui l&apos;intéressent</dt>
                  {/*
                    Le texte vient du client : `whitespace-pre-line` respecte ses
                    retours à la ligne — une liste de produits en perd le sens si
                    tout se retrouve sur une seule ligne.
                  */}
                  <dd className="mt-1 whitespace-pre-line rounded-md bg-cream-50 p-3 text-forest-900">
                    {request.notes || "Rien de précisé."}
                  </dd>
                </div>
              </dl>

              {canDecide ? (
                <div className="mt-4 flex flex-wrap gap-3 border-t border-line pt-4">
                  {request.status !== "approved" ? (
                    <Decision id={request.id} decision="approved" variant="secondary">
                      <Check aria-hidden="true" className="size-4" />
                      Approuver le tarif de gros
                    </Decision>
                  ) : null}

                  {request.status !== "rejected" ? (
                    <Decision id={request.id} decision="rejected" variant="outline">
                      <X aria-hidden="true" className="size-4" />
                      Refuser
                    </Decision>
                  ) : null}

                  {request.status !== "pending" ? (
                    <Decision id={request.id} decision="pending" variant="ghost">
                      <Undo2 aria-hidden="true" className="size-4" />
                      Remettre en attente
                    </Decision>
                  ) : null}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Decision({
  id,
  decision,
  variant,
  children,
}: {
  id: string;
  decision: "approved" | "rejected" | "pending";
  variant: "secondary" | "outline" | "ghost";
  children: React.ReactNode;
}) {
  return (
    <form action={decideBusinessAccountAction}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="decision" value={decision} />
      <Button type="submit" variant={variant}>
        {children}
      </Button>
    </form>
  );
}
