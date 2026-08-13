/**
 * Données logistiques : point de ramassage, zones de livraison, créneaux.
 *
 *   npm run seed:logistics
 *
 * ⚠️ CES DONNÉES SONT PROVISOIRES.
 *
 * Atlantique Export n'a pas encore communiqué son adresse de ramassage, ses
 * zones réelles ni ses tarifs. Ce qui suit permet de faire fonctionner le
 * tunnel de commande en attendant, et le dit explicitement à l'écran.
 *
 * Ce qui est vrai : les préfixes de codes postaux. H1 à H9 couvrent l'île de
 * Montréal, J correspond aux couronnes — ce sont des faits géographiques, pas
 * des inventions. Ce qui est provisoire : l'adresse, les horaires, les tarifs,
 * les seuils de livraison gratuite et les créneaux.
 *
 * À REMPLACER avant l'ouverture, depuis l'administration ou en rejouant ce
 * script après correction des valeurs ci-dessous.
 */

import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const path = (p) => fileURLToPath(new URL(p, root));

process.loadEnvFile(path(".env.local"));

const url = process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "");
const secret = process.env.SUPABASE_SECRET_KEY.trim();
const headers = {
  apikey: secret,
  Authorization: `Bearer ${secret}`,
  "Content-Type": "application/json",
};

async function request(p, init = {}) {
  const response = await fetch(url + p, {
    ...init,
    headers: { ...headers, ...(init.headers ?? {}) },
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(`${init.method ?? "GET"} ${p} → ${response.status} ${text}`);
  }
  return body;
}

const upsert = (table, onConflict, rows) =>
  request(`/rest/v1/${table}?on_conflict=${onConflict}`, {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify(rows),
  });

console.log("\nDonnées logistiques (provisoires)\n");

/* --- Point de ramassage ---------------------------------------------------- */

const pickupName = "Ramassage à Montréal";
const existingPickup = await request(
  `/rest/v1/pickup_locations?name=eq.${encodeURIComponent(pickupName)}&select=id`,
);

let pickupId = existingPickup[0]?.id;
if (!pickupId) {
  const [created] = await request("/rest/v1/pickup_locations", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify([
      {
        name: pickupName,
        address: {
          line1: "Adresse à confirmer",
          city: "Montréal",
          province: "QC",
          country: "CA",
        },
        opening_hours: { note: "Horaires à confirmer" },
        instructions_fr:
          "L'adresse exacte et les heures d'ouverture vous seront communiquées par courriel à la confirmation de votre commande.",
        instructions_en:
          "The exact address and opening hours will be sent to you by email once your order is confirmed.",
        is_active: true,
      },
    ]),
  });
  pickupId = created.id;
}
console.log("  ✓ point de ramassage (adresse à confirmer)");

/* --- Zones de livraison ---------------------------------------------------- */
// Les préfixes sont exacts ; les tarifs et seuils sont provisoires.

const zones = await upsert("delivery_zones", "name", [
  {
    name: "Île de Montréal",
    postal_prefixes: ["H1", "H2", "H3", "H4", "H8", "H9"],
    fee_cents: 799,
    free_shipping_threshold_cents: 7500,
    min_order_cents: 2500,
    allowed_temperature_classes: ["ambient", "fresh", "refrigerated", "frozen"],
    position: 1,
    is_active: true,
  },
  {
    name: "Laval, Rive-Sud et Rive-Nord",
    postal_prefixes: ["H7", "J3", "J4", "J5", "J6", "J7"],
    fee_cents: 1299,
    free_shipping_threshold_cents: 12000,
    min_order_cents: 4000,
    // Le surgelé est écarté de la couronne : le trajet est plus long et la
    // chaîne du froid n'est pas garantie sans caisson réfrigéré.
    allowed_temperature_classes: ["ambient", "fresh", "refrigerated"],
    position: 2,
    is_active: true,
  },
]);
console.log(`  ✓ ${zones.length} zones de livraison`);

/* --- Créneaux --------------------------------------------------------------- */
// Deux semaines glissantes. Le dimanche est écarté.

const SLOTS = {
  pickup: [
    ["10:00", "13:00"],
    ["16:00", "19:00"],
  ],
  local_delivery: [
    ["09:00", "13:00"],
    ["14:00", "18:00"],
  ],
};

const rows = [];
const today = new Date();

for (let offset = 1; offset <= 14; offset++) {
  const date = new Date(today);
  date.setDate(today.getDate() + offset);
  if (date.getDay() === 0) continue; // dimanche

  const slotDate = date.toISOString().slice(0, 10);

  for (const [start, end] of SLOTS.pickup) {
    rows.push({
      pickup_location_id: pickupId,
      zone_id: null,
      method: "pickup",
      slot_date: slotDate,
      start_time: start,
      end_time: end,
      capacity: 12,
      is_active: true,
    });
  }

  for (const zone of zones) {
    for (const [start, end] of SLOTS.local_delivery) {
      rows.push({
        pickup_location_id: null,
        zone_id: zone.id,
        method: "local_delivery",
        slot_date: slotDate,
        start_time: start,
        end_time: end,
        capacity: 8,
        is_active: true,
      });
    }
  }
}

// Les créneaux passés sont supprimés à chaque exécution, pour que la table ne
// gonfle pas indéfiniment et que le tunnel ne propose jamais une date échue.
await request(
  `/rest/v1/delivery_slots?slot_date=lt.${today.toISOString().slice(0, 10)}`,
  { method: "DELETE" },
);

const existingSlots = await request(
  `/rest/v1/delivery_slots?select=id,slot_date,start_time,method,zone_id,pickup_location_id`,
);
const key = (r) =>
  `${r.method}|${r.slot_date}|${String(r.start_time).slice(0, 5)}|${r.zone_id ?? ""}|${r.pickup_location_id ?? ""}`;
const known = new Set(existingSlots.map(key));
const toCreate = rows.filter((r) => !known.has(key(r)));

if (toCreate.length > 0) {
  await request("/rest/v1/delivery_slots", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(toCreate),
  });
}
console.log(`  ✓ ${toCreate.length} créneaux créés (${rows.length} attendus sur 14 jours)`);

console.log(`
  ⚠️  Adresse, horaires, tarifs et seuils sont PROVISOIRES.
      À remplacer par les valeurs réelles d'Atlantique Export avant l'ouverture.
`);
