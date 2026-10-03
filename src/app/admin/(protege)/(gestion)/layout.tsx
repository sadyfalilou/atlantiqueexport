import { redirect } from "next/navigation";
import { isViewerOnly } from "@/lib/admin/roles";
import { getStaffMember } from "@/lib/supabase/auth";

/**
 * Les sections de gestion : catalogue, logistique, contenu, demandes pro.
 *
 * Le groupe ne change aucune adresse — il existe pour qu'une seule garde
 * protège toutes ces pages. Un observateur n'a rien à y faire, et le jour où
 * une page s'ajoute ici, elle est couverte sans que personne ait à y penser.
 * Masquer l'entrée dans le menu ne suffirait pas : une adresse tapée à la
 * main ouvrirait la page.
 */
export default async function GestionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const member = await getStaffMember();
  if (!member) redirect("/admin/connexion");
  if (isViewerOnly(member.roles)) redirect("/admin");

  return children;
}
