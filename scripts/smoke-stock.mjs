/**
 * Épreuve de bout en bout de la garantie anti-survente.
 *
 *   npm run smoke:stock
 *
 * ⚠️ Ce script écrit dans la base Supabase configurée par .env.local. Il crée
 * une catégorie, un produit et une variante préfixés « __test », les manipule,
 * puis les supprime. À ne pas lancer sur une base contenant des commandes
 * réelles sans en comprendre l'effet.
 *
 * Ce qu'il démontre : une réservation qui dépasse le stock échoue, l'état
 * reste intact après le refus, et le registre des mouvements ne conserve
 * aucune trace d'une opération annulée.
 */

import { fileURLToPath } from "node:url";

process.loadEnvFile(fileURLToPath(new URL("../.env.local", import.meta.url)));
const url = process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, '');
const sec = process.env.SUPABASE_SECRET_KEY.trim();
const H = { apikey: sec, Authorization: `Bearer ${sec}`, 'Content-Type': 'application/json', Prefer: 'return=representation' };

const api = async (path, init = {}) => {
  const r = await fetch(url + path, { headers: H, ...init });
  const text = await r.text();
  let json; try { json = JSON.parse(text); } catch { json = text; }
  return { status: r.status, json };
};
const post = (p, body) => api(p, { method: 'POST', body: JSON.stringify(body) });
const del  = (p) => api(p, { method: 'DELETE' });

let pass = 0, fail = 0;
const check = (cond, label, detail = '') => {
  console.log(`  ${cond ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'} ${label}${detail ? ' — ' + detail : ''}`);
  if (cond) pass += 1;
  else fail += 1;
};

console.log('\nÉpreuve de la garantie anti-survente\n');

// -- Mise en place ----------------------------------------------------------
const cat = await post('/rest/v1/categories', { slug: '__test-cat', name_fr: 'T', name_en: 'T' });
const prod = await post('/rest/v1/products', {
  slug: '__test-prod', name_fr: 'Test', name_en: 'Test',
  category_id: cat.json[0].id, published_at: new Date().toISOString(),
});
const variant = await post('/rest/v1/product_variants', {
  product_id: prod.json[0].id, sku: '__TEST-SKU-1',
  label_fr: 'Unité', label_en: 'Unit', retail_price_cents: 1000,
});
const vid = variant.json[0].id;
check(!!vid, 'Produit et variante de test créés');

// Le déclencheur doit avoir créé la ligne de stock automatiquement.
const lvl0 = await api(`/rest/v1/stock_levels?variant_id=eq.${vid}&select=*`);
check(lvl0.json.length === 1, 'Ligne de stock créée automatiquement à la création de la variante');

// -- Réception --------------------------------------------------------------
await post('/rest/v1/rpc/receive_stock', { p_variant_id: vid, p_quantity: 5 });
const lvl1 = await api(`/rest/v1/stock_levels?variant_id=eq.${vid}&select=quantity_on_hand,quantity_available`);
check(lvl1.json[0]?.quantity_on_hand === 5 && lvl1.json[0]?.quantity_available === 5,
  'Réception de 5 unités', JSON.stringify(lvl1.json[0]));

// -- Réservation valide -----------------------------------------------------
const r1 = await post('/rest/v1/rpc/reserve_stock', { p_variant_id: vid, p_quantity: 3 });
check(r1.status === 200 && r1.json === 2, 'Réservation de 3 acceptée, reste 2', `retour=${JSON.stringify(r1.json)}`);

// -- Réservation qui dépasse le stock : DOIT échouer ------------------------
const r2 = await post('/rest/v1/rpc/reserve_stock', { p_variant_id: vid, p_quantity: 3 });
check(r2.status !== 200 && r2.json?.code === 'P0001',
  'Réservation de 3 de plus REFUSÉE (stock insuffisant)', r2.json?.message ?? '');

// -- Le stock n'a pas bougé après l'échec -----------------------------------
const lvl2 = await api(`/rest/v1/stock_levels?variant_id=eq.${vid}&select=quantity_on_hand,quantity_reserved,quantity_available`);
check(lvl2.json[0]?.quantity_reserved === 3 && lvl2.json[0]?.quantity_available === 2,
  'État inchangé après le refus', JSON.stringify(lvl2.json[0]));

// -- Quantité négative refusée ----------------------------------------------
const r3 = await post('/rest/v1/rpc/reserve_stock', { p_variant_id: vid, p_quantity: -5 });
check(r3.status !== 200, 'Quantité négative refusée', r3.json?.message ?? '');

// -- Libération puis vente --------------------------------------------------
await post('/rest/v1/rpc/release_stock', { p_variant_id: vid, p_quantity: 3 });
const lvl3 = await api(`/rest/v1/stock_levels?variant_id=eq.${vid}&select=quantity_reserved,quantity_available`);
check(lvl3.json[0]?.quantity_reserved === 0 && lvl3.json[0]?.quantity_available === 5, 'Libération de la réservation');

await post('/rest/v1/rpc/reserve_stock', { p_variant_id: vid, p_quantity: 2 });
await post('/rest/v1/rpc/consume_stock', { p_variant_id: vid, p_quantity: 2 });
const lvl4 = await api(`/rest/v1/stock_levels?variant_id=eq.${vid}&select=quantity_on_hand,quantity_reserved,quantity_available`);
check(lvl4.json[0]?.quantity_on_hand === 3 && lvl4.json[0]?.quantity_reserved === 0,
  'Vente : la marchandise sort et la réservation disparaît', JSON.stringify(lvl4.json[0]));

// -- Le registre des mouvements a tout consigné -----------------------------
// Cinq mouvements et non six : la réservation refusée n'en laisse aucun,
// puisque l'exception annule toute la transaction. C'est exactement le
// comportement attendu — un refus ne doit rien inscrire au registre.
const mv = await api(`/rest/v1/stock_movements?variant_id=eq.${vid}&select=movement_type,quantity_delta&order=created_at`);
const trace = mv.json.map((m) => `${m.movement_type}:${m.quantity_delta}`).join(' ');
check(
  trace === 'reception:5 reservation:-3 release:3 reservation:-2 sale:-2',
  'Registre des mouvements exact, sans trace du refus',
  trace,
);

// -- Nettoyage --------------------------------------------------------------
await del(`/rest/v1/products?slug=eq.__test-prod`);
await del(`/rest/v1/categories?slug=eq.__test-cat`);
await del(`/rest/v1/categories?slug=eq.test-privileges`);
const left = await api('/rest/v1/products?slug=like.__test*&select=id');
check(left.json.length === 0, 'Données de test supprimées');

console.log(`\n${fail === 0 ? '\x1b[32m' : '\x1b[31m'}${pass} réussi(s), ${fail} échec(s)\x1b[0m\n`);
process.exit(fail === 0 ? 0 : 1);
