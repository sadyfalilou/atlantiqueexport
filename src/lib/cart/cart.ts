import "server-only";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  computeTotals,
  effectiveUnitPrice,
  type CartLine,
  type CartTotals,
} from "@/lib/cart/pricing";
import { hasApprovedBusinessAccount } from "@/lib/supabase/account";
import { productImageUrl } from "@/lib/catalog/queries";
import type { TemperatureClass } from "@/lib/types";

/**
 * Panier serveur.
 *
 * Deux règles gouvernent ce fichier.
 *
 * 1. **Le panier ne stocke aucun prix.** `cart_items` ne retient qu'un
 *    identifiant de variante et une quantité. Les montants sont relus depuis
 *    le catalogue à chaque affichage, ce qui rend inopérante toute tentative
 *    de modifier un prix depuis le navigateur.
 *
 * 2. **Le panier n'est jamais accessible depuis le client.** Les tables
 *    `carts` et `cart_items` n'ont aucun privilège public ; tout passe par la
 *    clé de service, côté serveur, et le panier est identifié par un jeton
 *    aléatoire de 32 octets rangé dans un cookie httpOnly.
 */

const COOKIE_NAME = "ae_panier";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 jours

export interface Cart {
  id: string | null;
  lines: CartLine[];
  totals: CartTotals;
  /** Vrai quand le compte connecté est un professionnel approuvé. */
  isWholesale: boolean;
}

export const emptyCart: Cart = {
  id: null,
  lines: [],
  totals: computeTotals([]),
  isWholesale: false,
};

async function readToken(): Promise<string | undefined> {
  return (await cookies()).get(COOKIE_NAME)?.value;
}

/**
 * Crée le panier si nécessaire et pose le cookie.
 *
 * À n'appeler que depuis une Server Action ou un Route Handler : Next.js
 * interdit d'écrire un cookie pendant le rendu d'une page.
 */
export async function getOrCreateCart(locale: string): Promise<string> {
  const supabase = createAdminClient();
  const existing = await readToken();

  if (existing) {
    const { data } = await supabase
      .from("carts")
      .select("id")
      .eq("token", existing)
      .limit(1);
    if (data && data.length > 0) return data[0].id as string;
  }

  const token = randomBytes(32).toString("base64url");
  const { data, error } = await supabase
    .from("carts")
    .insert({ token, locale })
    .select("id")
    .single();

  if (error) throw new Error(`Création du panier : ${error.message}`);

  (await cookies()).set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });

  return data.id as string;
}

/** Identifiant du panier courant, sans jamais en créer un. */
export async function getCartId(): Promise<string | null> {
  const token = await readToken();
  if (!token) return null;

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("carts")
    .select("id")
    .eq("token", token)
    .limit(1);

  return data && data.length > 0 ? (data[0].id as string) : null;
}

type Row = Record<string, unknown>;

/**
 * Lit le panier et RECALCULE tous les montants depuis le catalogue.
 * C'est ici que se joue la garantie : le prix affiché vient de la base, pas
 * de ce que le navigateur a bien voulu envoyer.
 */
export async function getCart(): Promise<Cart> {
  const cartId = await getCartId();
  if (!cartId) return emptyCart;

  // Lu avant les lignes : le tarif applicable décide du prix de chacune.
  // `wholesale_price_cents` n'est pas accordé aux rôles publics ; il n'est
  // lisible ici que parce que le panier passe par la clé de service.
  const isWholesale = await hasApprovedBusinessAccount();

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("cart_items")
    .select(
      `id, quantity, variant_id,
       variant:product_variants(
         id, label_fr, label_en, retail_price_cents, wholesale_price_cents,
         compare_at_price_cents,
         price_is_provisional, net_weight_g, is_active,
         product:products(
           slug, name_fr, name_en, temperature_class, published_at,
           images:product_images(storage_path, alt_fr, alt_en, position, is_primary)
         ),
         stock:stock_levels(quantity_available)
       )`,
    )
    .eq("cart_id", cartId)
    .order("created_at");

  if (error) throw new Error(`Lecture du panier : ${error.message}`);

  /** Photo principale du produit, ou la première, ou rien. */
  function coverUrl(product: Row): string | null {
    const images = ((product.images as Row[] | null) ?? []).sort(
      (a, b) =>
        Number(Boolean(b.is_primary)) - Number(Boolean(a.is_primary)) ||
        ((a.position as number) ?? 0) - ((b.position as number) ?? 0),
    );
    const cover = images[0];
    return cover ? productImageUrl(cover.storage_path as string) : null;
  }

  const lines: CartLine[] = [];

  for (const row of (data ?? []) as Row[]) {
    const variant = row.variant as Row | null;
    const product = variant?.product as Row | null;

    // Une variante désactivée ou un produit dépublié disparaît du panier :
    // mieux vaut une ligne absente qu'une ligne invendable au paiement.
    if (!variant || !product) continue;
    if (variant.is_active === false) continue;
    if (!product.published_at) continue;

    const stock = variant.stock as Row | Row[] | null;
    const stockRow = Array.isArray(stock) ? stock[0] : stock;

    const retailPriceCents = variant.retail_price_cents as number;
    const unitPriceCents = effectiveUnitPrice(
      retailPriceCents,
      (variant.wholesale_price_cents as number | null) ?? null,
      isWholesale,
    );

    lines.push({
      itemId: row.id as string,
      variantId: variant.id as string,
      productSlug: product.slug as string,
      productName: {
        fr: (product.name_fr as string) ?? "",
        en: (product.name_en as string) ?? "",
      },
      variantLabel: {
        fr: (variant.label_fr as string) ?? "",
        en: (variant.label_en as string) ?? "",
      },
      temperatureClass: product.temperature_class as TemperatureClass,
      imageUrl: coverUrl(product),
      unitPriceCents,
      retailPriceCents,
      // Le prix barré d'une promotion n'a pas de sens face au tarif de gros :
      // l'écart montré au professionnel est celui avec le prix public, pas
      // avec un prix de référence auquel il n'achète de toute façon pas.
      compareAtPriceCents: isWholesale
        ? null
        : ((variant.compare_at_price_cents as number | null) ?? null),
      quantity: row.quantity as number,
      netWeightG: (variant.net_weight_g as number | null) ?? null,
      availableQuantity: (stockRow?.quantity_available as number | undefined) ?? 0,
      priceIsProvisional: Boolean(variant.price_is_provisional),
    });
  }

  return { id: cartId, lines, totals: computeTotals(lines), isWholesale };
}

/** Nombre d'articles, pour la pastille de l'en-tête. */
export async function getCartCount(): Promise<number> {
  const cartId = await getCartId();
  if (!cartId) return 0;

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("cart_items")
    .select("quantity")
    .eq("cart_id", cartId);

  return (data ?? []).reduce(
    (total, row) => total + ((row as Row).quantity as number),
    0,
  );
}

/* -------------------------------------------------------------------------- */
/* Écritures                                                                   */
/* -------------------------------------------------------------------------- */

export type CartMutation =
  | { ok: true }
  | { ok: false; reason: "unknown_variant" | "out_of_stock" | "invalid_quantity"; available?: number };

async function readVariant(variantId: string) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("product_variants")
    .select(
      "id, is_active, product:products(published_at), stock:stock_levels(quantity_available)",
    )
    .eq("id", variantId)
    .limit(1);

  const row = (data ?? [])[0] as Row | undefined;
  if (!row || row.is_active === false) return null;

  const product = row.product as Row | null;
  if (!product?.published_at) return null;

  const stock = row.stock as Row | Row[] | null;
  const stockRow = Array.isArray(stock) ? stock[0] : stock;
  return { available: (stockRow?.quantity_available as number | undefined) ?? 0 };
}

export async function addToCart(
  variantId: string,
  quantity: number,
  locale: string,
): Promise<CartMutation> {
  if (!Number.isInteger(quantity) || quantity < 1) {
    return { ok: false, reason: "invalid_quantity" };
  }

  const variant = await readVariant(variantId);
  if (!variant) return { ok: false, reason: "unknown_variant" };

  const cartId = await getOrCreateCart(locale);
  const supabase = createAdminClient();

  const { data: existing } = await supabase
    .from("cart_items")
    .select("id, quantity")
    .eq("cart_id", cartId)
    .eq("variant_id", variantId)
    .is("preparation_option_id", null)
    .limit(1);

  const current = (existing ?? [])[0] as Row | undefined;
  const wanted = (current ? (current.quantity as number) : 0) + quantity;

  // Le panier ne réserve pas le stock — la réservation a lieu à la commande —
  // mais il refuse d'accueillir plus que ce qui existe, pour ne pas mener le
  // client jusqu'au paiement d'un article indisponible.
  if (wanted > variant.available) {
    return { ok: false, reason: "out_of_stock", available: variant.available };
  }

  if (current) {
    await supabase
      .from("cart_items")
      .update({ quantity: wanted })
      .eq("id", current.id as string);
  } else {
    await supabase
      .from("cart_items")
      .insert({ cart_id: cartId, variant_id: variantId, quantity });
  }

  return { ok: true };
}

export async function setCartItemQuantity(
  itemId: string,
  quantity: number,
): Promise<CartMutation> {
  const cartId = await getCartId();
  if (!cartId) return { ok: false, reason: "unknown_variant" };

  const supabase = createAdminClient();

  if (quantity < 1) {
    // Le portée par `cart_id` empêche de toucher au panier d'autrui, même en
    // devinant un identifiant de ligne.
    await supabase.from("cart_items").delete().eq("id", itemId).eq("cart_id", cartId);
    return { ok: true };
  }

  const { data } = await supabase
    .from("cart_items")
    .select("variant_id")
    .eq("id", itemId)
    .eq("cart_id", cartId)
    .limit(1);

  const row = (data ?? [])[0] as Row | undefined;
  if (!row) return { ok: false, reason: "unknown_variant" };

  const variant = await readVariant(row.variant_id as string);
  if (!variant) return { ok: false, reason: "unknown_variant" };
  if (quantity > variant.available) {
    return { ok: false, reason: "out_of_stock", available: variant.available };
  }

  await supabase
    .from("cart_items")
    .update({ quantity })
    .eq("id", itemId)
    .eq("cart_id", cartId);

  return { ok: true };
}

export async function removeCartItem(itemId: string): Promise<CartMutation> {
  const cartId = await getCartId();
  if (!cartId) return { ok: true };

  const supabase = createAdminClient();
  await supabase.from("cart_items").delete().eq("id", itemId).eq("cart_id", cartId);
  return { ok: true };
}
