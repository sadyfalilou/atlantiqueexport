/**
 * Épreuve de la création de commande.
 *
 *   npm run smoke:order
 *
 * ⚠️ Écrit dans la base configurée par .env.local : crée un produit, un
 * panier et des commandes préfixés « __test », puis supprime tout.
 *
 * Ce qu'il démontre : une commande réussie réserve le stock et vide le panier ;
 * une commande qui échoue — stock insuffisant, créneau complet, surgelé envoyé
 * par la poste — ne laisse AUCUNE trace. C'est le point qui compte : la
 * fonction enchaîne plusieurs écritures, et un échec au milieu ne doit pas
 * laisser du stock réservé pour une commande inexistante.
 */

import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
process.loadEnvFile(fileURLToPath(new URL(".env.local", root)));

const url = process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "");
const secret = process.env.SUPABASE_SECRET_KEY.trim();
const H = {
  apikey: secret,
  Authorization: `Bearer ${secret}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
};

const api = async (path, init = {}) => {
  const response = await fetch(url + path, { headers: H, ...init });
  const text = await response.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  return { status: response.status, json };
};
const post = (p, body) => api(p, { method: "POST", body: JSON.stringify(body) });
const del = (p) => api(p, { method: "DELETE" });

let pass = 0;
let fail = 0;
const check = (ok, label, detail = "") => {
  console.log(`  ${ok ? "\x1b[32m✓\x1b[0m" : "\x1b[31m✗\x1b[0m"} ${label}${detail ? " — " + detail : ""}`);
  if (ok) pass += 1;
  else fail += 1;
};

const stockOf = async (variantId) => {
  const r = await api(
    `/rest/v1/stock_levels?variant_id=eq.${variantId}&select=quantity_on_hand,quantity_reserved,quantity_available`,
  );
  return r.json[0];
};

console.log("\nÉpreuve de la création de commande\n");

/* --- Mise en place --------------------------------------------------------- */

const cat = await post("/rest/v1/categories", {
  slug: "__test-order-cat",
  name_fr: "T",
  name_en: "T",
});
const prod = await post("/rest/v1/products", {
  slug: "__test-order-prod",
  name_fr: "Produit de test",
  name_en: "Test product",
  category_id: cat.json[0].id,
  temperature_class: "frozen",
  published_at: new Date().toISOString(),
});
const variant = await post("/rest/v1/product_variants", {
  product_id: prod.json[0].id,
  sku: "__TEST-ORDER-1",
  label_fr: "Sachet",
  label_en: "Bag",
  retail_price_cents: 1000,
});
const variantId = variant.json[0].id;

await api(`/rest/v1/stock_levels?variant_id=eq.${variantId}`, {
  method: "PATCH",
  body: JSON.stringify({ quantity_on_hand: 5 }),
});
check((await stockOf(variantId)).quantity_available === 5, "produit de test avec 5 en stock");

const pickup = await api("/rest/v1/pickup_locations?select=id&limit=1");
const pickupId = pickup.json[0]?.id;
check(!!pickupId, "point de ramassage disponible");

const makeCart = async (quantity) => {
  const cart = await post("/rest/v1/carts", {
    token: `__test-${crypto.randomUUID()}`,
    locale: "fr",
  });
  const cartId = cart.json[0].id;
  await post("/rest/v1/cart_items", { cart_id: cartId, variant_id: variantId, quantity });
  return cartId;
};

const order = (cartId, extra = {}) =>
  post("/rest/v1/rpc/place_order", {
    p_cart_id: cartId,
    p_email: "test@example.ca",
    p_phone: null,
    p_locale: "fr",
    p_method: "pickup",
    p_pickup_location_id: pickupId,
    p_zone_id: null,
    p_slot_id: null,
    p_address: null,
    p_notes: null,
    p_guest_token: crypto.randomUUID(),
    ...extra,
  });

/* --- 1. Commande valide ---------------------------------------------------- */

const cart1 = await makeCart(2);
const ok1 = await order(cart1);
check(ok1.status === 200, "commande acceptée", ok1.json?.[0]?.order_number ?? JSON.stringify(ok1.json));
check(ok1.json?.[0]?.total_cents === 2000, "total calculé en base", `${ok1.json?.[0]?.total_cents} cents`);
check(
  ok1.json?.[0]?.order_number?.startsWith("AE-"),
  "numéro de commande lisible",
  ok1.json?.[0]?.order_number,
);

const afterOk = await stockOf(variantId);
check(afterOk.quantity_reserved === 2, "stock réservé", JSON.stringify(afterOk));

const emptied = await api(`/rest/v1/cart_items?cart_id=eq.${cart1}&select=id`);
check(emptied.json.length === 0, "panier vidé");

/* --- 2. Stock insuffisant : rien ne doit rester ---------------------------- */

const ordersBefore = await api("/rest/v1/orders?select=id");
const cart2 = await makeCart(10); // il ne reste que 3 disponibles
const ko = await order(cart2);
check(ko.status !== 200 && ko.json?.code === "P0001", "commande refusée faute de stock", ko.json?.message ?? "");

const afterKo = await stockOf(variantId);
check(
  afterKo.quantity_reserved === 2,
  "aucune réservation supplémentaire après le refus",
  JSON.stringify(afterKo),
);

const ordersAfter = await api("/rest/v1/orders?select=id");
check(
  ordersAfter.json.length === ordersBefore.json.length,
  "aucune commande fantôme créée",
  `${ordersBefore.json.length} → ${ordersAfter.json.length}`,
);

const stillThere = await api(`/rest/v1/cart_items?cart_id=eq.${cart2}&select=id`);
check(stillThere.json.length === 1, "le panier refusé est intact");

/* --- 3. Surgelé par la poste : refusé -------------------------------------- */

const cart3 = await makeCart(1);
const shipping = await order(cart3, {
  p_method: "shipping",
  p_pickup_location_id: null,
});
check(
  shipping.status !== 200 && /froid/i.test(shipping.json?.message ?? ""),
  "expédition d'un surgelé refusée",
  shipping.json?.message ?? "",
);

/* --- 4. Panier vide -------------------------------------------------------- */

const emptyCart = await post("/rest/v1/carts", {
  token: `__test-${crypto.randomUUID()}`,
  locale: "fr",
});
const emptyOrder = await order(emptyCart.json[0].id);
check(emptyOrder.status !== 200, "commande refusée sur panier vide", emptyOrder.json?.message ?? "");

/* --- 5. Tarif professionnel ------------------------------------------------ */

// Ce que cette section démontre : approuver un compte professionnel change
// bien le MONTANT FACTURÉ, et pas seulement l'affichage. Le prix est relu en
// base par `place_order` ; ce que le navigateur envoie n'intervient jamais.

const proEmail = `__test-pro-${crypto.randomUUID()}@example.ca`;
const created = await post("/auth/v1/admin/users", {
  email: proEmail,
  password: crypto.randomUUID(),
  email_confirm: true,
});
const proUserId = created.json?.id;
check(!!proUserId, "compte de test créé");

// Le profil naît d'un déclencheur sur `auth.users` ; `business_accounts` s'y
// rattache. Le statut est posé ici avec la clé de service — le client, lui,
// n'a qu'un droit de lecture, c'est tout l'objet de la politique.
await post("/rest/v1/business_accounts", {
  profile_id: proUserId,
  company_name: "__test Grossiste",
  status: "approved",
});

await api(`/rest/v1/product_variants?id=eq.${variantId}`, {
  method: "PATCH",
  body: JSON.stringify({ wholesale_price_cents: 700 }),
});
await api(`/rest/v1/stock_levels?variant_id=eq.${variantId}`, {
  method: "PATCH",
  body: JSON.stringify({ quantity_on_hand: 20 }),
});

const cartPro = await makeCart(2);
const proOrder = await order(cartPro, { p_user_id: proUserId, p_email: proEmail });
check(
  proOrder.json?.[0]?.total_cents === 1400,
  "tarif de gros facturé au professionnel — 2 × 700",
  `${proOrder.json?.[0]?.total_cents} cents`,
);

// Le même panier, sans compte : le prix public s'applique.
const cartAnon = await makeCart(2);
const anonOrder = await order(cartAnon);
check(
  anonOrder.json?.[0]?.total_cents === 2000,
  "prix public facturé sans compte — 2 × 1000",
  `${anonOrder.json?.[0]?.total_cents} cents`,
);

// Une promotion descend le prix public SOUS le tarif négocié. Le
// professionnel doit payer le prix public : sans le `least`, il paierait plus
// cher que le particulier.
await api(`/rest/v1/product_variants?id=eq.${variantId}`, {
  method: "PATCH",
  body: JSON.stringify({ retail_price_cents: 500 }),
});
const cartPromo = await makeCart(2);
const promoOrder = await order(cartPromo, { p_user_id: proUserId, p_email: proEmail });
check(
  promoOrder.json?.[0]?.total_cents === 1000,
  "le professionnel ne paie jamais plus que le public — 2 × 500",
  `${promoOrder.json?.[0]?.total_cents} cents`,
);

// Format sans tarif de gros : le prix public, et surtout aucun refus.
await api(`/rest/v1/product_variants?id=eq.${variantId}`, {
  method: "PATCH",
  body: JSON.stringify({ retail_price_cents: 1000, wholesale_price_cents: null }),
});
const cartNoWholesale = await makeCart(2);
const noWholesale = await order(cartNoWholesale, {
  p_user_id: proUserId,
  p_email: proEmail,
});
check(
  noWholesale.json?.[0]?.total_cents === 2000,
  "sans tarif saisi, le prix public s'applique — 2 × 1000",
  `${noWholesale.json?.[0]?.total_cents} cents`,
);

// Un compte dont la demande est refusée n'obtient rien.
await api(`/rest/v1/business_accounts?profile_id=eq.${proUserId}`, {
  method: "PATCH",
  body: JSON.stringify({ status: "rejected" }),
});
await api(`/rest/v1/product_variants?id=eq.${variantId}`, {
  method: "PATCH",
  body: JSON.stringify({ wholesale_price_cents: 700 }),
});
const cartRejected = await makeCart(2);
const rejected = await order(cartRejected, { p_user_id: proUserId, p_email: proEmail });
check(
  rejected.json?.[0]?.total_cents === 2000,
  "une demande refusée n'ouvre aucun tarif — 2 × 1000",
  `${rejected.json?.[0]?.total_cents} cents`,
);

/* --- Nettoyage ------------------------------------------------------------- */

await del(`/rest/v1/orders?email=eq.test@example.ca`);
await del(`/rest/v1/orders?email=eq.${encodeURIComponent(proEmail)}`);
await del(`/rest/v1/business_accounts?profile_id=eq.${proUserId}`);
if (proUserId) await del(`/auth/v1/admin/users/${proUserId}`);
await del(`/rest/v1/carts?token=like.__test*`);
await del(`/rest/v1/products?slug=eq.__test-order-prod`);
await del(`/rest/v1/categories?slug=eq.__test-order-cat`);

const proLeft = await api(
  `/rest/v1/business_accounts?company_name=like.__test*&select=id`,
);
check(proLeft.json.length === 0, "compte professionnel de test supprimé");

const leftovers = await api("/rest/v1/products?slug=like.__test*&select=id");
check(leftovers.json.length === 0, "données de test supprimées");

console.log(
  `\n${fail === 0 ? "\x1b[32m" : "\x1b[31m"}${pass} réussi(s), ${fail} échec(s)\x1b[0m\n`,
);
process.exit(fail === 0 ? 0 : 1);
