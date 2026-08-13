"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  createSessionClient,
  getStaffMember,
  hasRole,
  logAdminAction,
} from "@/lib/supabase/auth";

/**
 * Actions de l'administration.
 *
 * Chacune revérifie le rôle de la personne connectée. Le garde du layout
 * protège l'AFFICHAGE des pages ; il ne protège pas les actions, qui sont
 * appelables directement. Sans ce contrôle, connaître l'identifiant d'une
 * commande suffirait à la faire passer en « payée ».
 */

export type SignInState = { status: "idle" | "error"; message?: string };

const credentials = z.object({
  email: z.email(),
  password: z.string().min(8).max(200),
});

export async function signInAction(
  _previous: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const parsed = credentials.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { status: "error", message: "Adresse ou mot de passe invalide." };
  }

  const supabase = await createSessionClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    // Message volontairement identique pour un compte inexistant et un mot de
    // passe erroné : distinguer les deux révélerait quelles adresses existent.
    return { status: "error", message: "Adresse ou mot de passe invalide." };
  }

  const member = await getStaffMember();
  if (!member) {
    await supabase.auth.signOut();
    return {
      status: "error",
      message: "Ce compte n'a pas accès à l'administration.",
    };
  }

  redirect("/admin");
}

export async function signOutAction(): Promise<void> {
  const supabase = await createSessionClient();
  await supabase.auth.signOut();
  redirect("/admin/connexion");
}

/* -------------------------------------------------------------------------- */
/* Commandes                                                                   */
/* -------------------------------------------------------------------------- */

const orderIdSchema = z.object({ orderId: z.uuid() });

/**
 * Valide un virement Interac reçu.
 *
 * C'est l'action la plus lourde de conséquence de tout l'espace : elle
 * déclare qu'un paiement a été encaissé. Elle est donc réservée aux rôles
 * `super_admin` et `manager`, et journalisée avec l'identité de son auteur.
 */
export async function confirmInteracPaymentAction(formData: FormData): Promise<void> {
  const member = await getStaffMember();
  if (!member || !hasRole(member, "super_admin", "manager")) return;

  const parsed = orderIdSchema.safeParse({ orderId: formData.get("orderId") });
  if (!parsed.success) return;

  const supabase = createAdminClient();

  const { data: existing } = await supabase
    .from("orders")
    .select("id, order_number, total_cents, payment_status")
    .eq("id", parsed.data.orderId)
    .limit(1);

  const order = existing?.[0];
  if (!order || order.payment_status === "paid") return;

  await supabase.from("payments").insert({
    order_id: order.id,
    provider: "interac",
    payment_type: "full",
    amount_cents: order.total_cents,
    status: "paid",
    confirmed_by: member.userId,
    confirmed_at: new Date().toISOString(),
  });

  await supabase
    .from("orders")
    .update({ payment_status: "paid", status: "confirmed" })
    .eq("id", order.id);

  await logAdminAction(member.userId, "interac.confirm", "orders", order.id, {
    order_number: order.order_number,
    amount_cents: order.total_cents,
  });

  revalidatePath("/admin/commandes");
  revalidatePath(`/admin/commandes/${order.order_number}`);
}

const statusSchema = z.object({
  orderId: z.uuid(),
  status: z.enum([
    "confirmed",
    "preparing",
    "ready_for_pickup",
    "out_for_delivery",
    "delivered",
    "completed",
    "cancelled",
  ]),
});

export async function updateOrderStatusAction(formData: FormData): Promise<void> {
  const member = await getStaffMember();
  if (!member || !hasRole(member, "super_admin", "manager", "picker", "driver")) return;

  const parsed = statusSchema.safeParse({
    orderId: formData.get("orderId"),
    status: formData.get("status"),
  });
  if (!parsed.success) return;

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("orders")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.orderId)
    .select("order_number");

  await logAdminAction(member.userId, "order.status", "orders", parsed.data.orderId, {
    to: parsed.data.status,
  });

  revalidatePath("/admin/commandes");
  if (data?.[0]) revalidatePath(`/admin/commandes/${data[0].order_number}`);
}
