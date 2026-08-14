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

export interface SavedAddress {
  id: string;
  label: string | null;
  fullName: string;
  line1: string;
  line2: string | null;
  city: string;
  province: string;
  postalCode: string;
  phone: string | null;
  isDefault: boolean;
}

/**
 * Les adresses du client connecté.
 *
 * Lues avec sa session : la politique `addresses_own` ne lui montre que les
 * siennes. Aucun filtre n'est écrit ici, donc aucun ne peut être oublié.
 */
export async function getSavedAddresses(): Promise<SavedAddress[]> {
  const supabase = await createSessionClient();
  const { data } = await supabase
    .from("addresses")
    .select("*")
    .order("is_default", { ascending: false })
    .order("created_at");

  return ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    id: row.id as string,
    label: (row.label as string | null) ?? null,
    fullName: (row.full_name as string) ?? "",
    line1: (row.line1 as string) ?? "",
    line2: (row.line2 as string | null) ?? null,
    city: (row.city as string) ?? "",
    province: (row.province as string) ?? "",
    postalCode: (row.postal_code as string) ?? "",
    phone: (row.phone as string | null) ?? null,
    isDefault: Boolean(row.is_default),
  }));
}

export interface BusinessAccount {
  companyName: string;
  businessNumber: string | null;
  contactName: string | null;
  contactPhone: string | null;
  notes: string | null;
  status: "pending" | "approved" | "rejected";
}

export async function getBusinessAccount(): Promise<BusinessAccount | null> {
  const supabase = await createSessionClient();
  const { data } = await supabase.from("business_accounts").select("*").limit(1);
  const row = (data ?? [])[0] as Record<string, unknown> | undefined;
  if (!row) return null;

  return {
    companyName: (row.company_name as string) ?? "",
    businessNumber: (row.business_number as string | null) ?? null,
    contactName: (row.contact_name as string | null) ?? null,
    contactPhone: (row.contact_phone as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    status: (row.status as BusinessAccount["status"]) ?? "pending",
  };
}
