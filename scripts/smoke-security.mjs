/**
 * Vérifie, contre la base réelle, ce qu'un visiteur du site peut lire — et
 * surtout ce qu'il ne peut pas.
 *
 *   npm run smoke:security
 *
 * Le script n'utilise que la clé PUBLIQUE, celle qui est livrée au navigateur.
 * Il ne modifie rien. Chaque refus attendu doit se traduire par une erreur
 * PostgreSQL 42501 (privilège insuffisant) : la donnée est protégée par la
 * base, pas par le code de l'interface.
 */

import { fileURLToPath } from "node:url";

process.loadEnvFile(fileURLToPath(new URL("../.env.local", import.meta.url)));

const url = process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "");
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.trim();

let pass = 0;
let fail = 0;

async function expect(allowed, label, path) {
  const response = await fetch(url + path, { headers: { apikey: key } });
  const ok = allowed ? response.status === 200 : response.status !== 200;
  console.log(
    `  ${ok ? "\x1b[32m✓\x1b[0m" : "\x1b[31m✗\x1b[0m"} ${allowed ? "lisible " : "refusé  "} ${label} (HTTP ${response.status})`,
  );
  if (ok) pass += 1;
  else fail += 1;
}

console.log("\nCe que voit un visiteur, avec la clé publique\n");

console.log("  — Catalogue, volontairement public");
await expect(true, "catégories", "/rest/v1/categories?select=slug&limit=1");
await expect(true, "produits", "/rest/v1/products?select=slug&limit=1");
await expect(true, "variantes (prix de détail)", "/rest/v1/product_variants?select=sku,retail_price_cents&limit=1");
await expect(true, "disponibilité", "/rest/v1/stock_levels?select=quantity_available&limit=1");
await expect(true, "créneaux (place restante)", "/rest/v1/delivery_slots?select=slot_date,remaining_capacity&limit=1");
await expect(true, "zones de livraison", "/rest/v1/delivery_zones?select=name&limit=1");
await expect(true, "arrivages", "/rest/v1/shipments?select=code&limit=1");
await expect(true, "recettes", "/rest/v1/recipes?select=slug&limit=1");

console.log("\n  — Informations commerciales, à ne pas divulguer");
await expect(false, "prix de gros", "/rest/v1/product_variants?select=wholesale_price_cents&limit=1");
await expect(false, "quantités détenues", "/rest/v1/stock_levels?select=quantity_on_hand&limit=1");
await expect(false, "capacité des tournées", "/rest/v1/delivery_slots?select=capacity&limit=1");
await expect(false, "carnet de réservations", "/rest/v1/shipment_items?select=reserved_quantity&limit=1");
await expect(false, "fournisseurs", "/rest/v1/suppliers?select=name&limit=1");
await expect(false, "lots et péremptions", "/rest/v1/inventory_lots?select=lot_code&limit=1");
await expect(false, "mouvements de stock", "/rest/v1/stock_movements?select=movement_type&limit=1");

console.log("\n  — Données personnelles et financières");
await expect(false, "profils clients", "/rest/v1/profiles?select=id&limit=1");
await expect(false, "adresses", "/rest/v1/addresses?select=line1&limit=1");
await expect(false, "paniers", "/rest/v1/carts?select=id&limit=1");
await expect(false, "commandes", "/rest/v1/orders?select=order_number&limit=1");
await expect(false, "paiements", "/rest/v1/payments?select=provider_reference&limit=1");
await expect(false, "liste d'infolettre", "/rest/v1/newsletter_subscribers?select=email&limit=1");
await expect(false, "rôles du personnel", "/rest/v1/staff_roles?select=role&limit=1");
await expect(false, "journal d'audit", "/rest/v1/admin_audit_log?select=action&limit=1");
await expect(false, "comptes professionnels", "/rest/v1/business_accounts?select=company_name&limit=1");

console.log(
  `\n${fail === 0 ? "\x1b[32m" : "\x1b[31m"}${pass} réussi(s), ${fail} échec(s)\x1b[0m\n`,
);
process.exit(fail === 0 ? 0 : 1);
