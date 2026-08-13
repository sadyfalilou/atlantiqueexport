"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  addToCart,
  removeCartItem,
  setCartItemQuantity,
} from "@/lib/cart/cart";

/**
 * Actions du panier.
 *
 * Chaque entrée est validée par Zod côté serveur. La validation faite dans le
 * navigateur n'est qu'un confort : c'est celle-ci qui fait foi, et elle ne
 * fait jamais confiance au prix ou au libellé envoyés — seuls l'identifiant
 * de variante et la quantité traversent, tout le reste est relu en base.
 */

const addSchema = z.object({
  variantId: z.uuid(),
  quantity: z.coerce.number().int().min(1).max(99),
  locale: z.enum(["fr", "en"]).catch("fr"),
});

const quantitySchema = z.object({
  itemId: z.uuid(),
  quantity: z.coerce.number().int().min(0).max(99),
});

const removeSchema = z.object({ itemId: z.uuid() });

export type AddToCartState = {
  status: "idle" | "added" | "invalid" | "unavailable" | "out_of_stock";
  available?: number;
};

export async function addToCartAction(
  _previous: AddToCartState,
  formData: FormData,
): Promise<AddToCartState> {
  const parsed = addSchema.safeParse({
    variantId: formData.get("variantId"),
    quantity: formData.get("quantity"),
    locale: formData.get("locale"),
  });

  if (!parsed.success) return { status: "invalid" };

  const result = await addToCart(
    parsed.data.variantId,
    parsed.data.quantity,
    parsed.data.locale,
  );

  if (!result.ok) {
    if (result.reason === "out_of_stock") {
      return { status: "out_of_stock", available: result.available };
    }
    return { status: "unavailable" };
  }

  revalidatePath("/[locale]/panier", "page");
  return { status: "added" };
}

export async function updateQuantityAction(formData: FormData): Promise<void> {
  const parsed = quantitySchema.safeParse({
    itemId: formData.get("itemId"),
    quantity: formData.get("quantity"),
  });
  if (!parsed.success) return;

  await setCartItemQuantity(parsed.data.itemId, parsed.data.quantity);
  revalidatePath("/[locale]/panier", "page");
}

export async function removeItemAction(formData: FormData): Promise<void> {
  const parsed = removeSchema.safeParse({ itemId: formData.get("itemId") });
  if (!parsed.success) return;

  await removeCartItem(parsed.data.itemId);
  revalidatePath("/[locale]/panier", "page");
}
