import "server-only";
import { redirect } from "next/navigation";
import { canSeeSection } from "@/lib/admin/roles";
import { getStaffMember, type StaffMember } from "@/lib/supabase/auth";

/**
 * Exige l'accès à une section, ou renvoie ailleurs.
 *
 * Renvoyer vers le tableau de bord plutôt que vers une page d'erreur : une
 * personne qui tape une adresse à laquelle elle n'a pas droit n'a rien fait
 * de mal, elle n'a simplement rien à voir là.
 */
export async function requireSection(href: string): Promise<StaffMember> {
  const member = await getStaffMember();
  if (!member) redirect("/admin/connexion");
  if (!canSeeSection(member.roles, href)) redirect("/admin");
  return member;
}
