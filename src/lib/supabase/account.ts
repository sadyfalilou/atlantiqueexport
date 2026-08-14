import "server-only";
import { createSessionClient } from "@/lib/supabase/auth";

/**
 * Le client connecté, côté public.
 *
 * Distinct de `getStaffMember` : celui-ci ne vérifie aucun rôle, il répond
 * seulement « qui est connecté ». Un membre du personnel est aussi un compte
 * ordinaire et peut avoir ses propres commandes.
 */
export interface Customer {
  id: string;
  email: string;
  fullName: string | null;
  phone: string | null;
  locale: "fr" | "en";
}

export async function getCurrentCustomer(): Promise<Customer | null> {
  const supabase = await createSessionClient();

  // `getUser()` et non `getSession()` : le premier revalide le jeton auprès de
  // Supabase, le second se contente de lire le cookie. Sur une page qui décide
  // ce que quelqu'un a le droit de voir, la différence n'est pas théorique.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) return null;

  // Le profil est lu avec la session du client, donc soumis à RLS : il ne peut
  // voir que le sien.
  const { data } = await supabase
    .from("profiles")
    .select("full_name, phone, locale")
    .eq("id", user.id)
    .limit(1);

  const profile = data?.[0];

  return {
    id: user.id,
    email: user.email,
    fullName: (profile?.full_name as string | null) ?? null,
    phone: (profile?.phone as string | null) ?? null,
    locale: profile?.locale === "en" ? "en" : "fr",
  };
}
