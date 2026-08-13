/**
 * Accorde un rôle du personnel à un compte existant.
 *
 *   npm run grant:admin -- info@atlantiqueexport.com
 *   npm run grant:admin -- prepa@atlantiqueexport.com picker
 *
 * Le script NE CRÉE PAS le compte et ne manipule aucun mot de passe. Créez
 * d'abord l'utilisateur vous-même dans Supabase — Authentication → Users →
 * Add user — puis lancez cette commande pour lui donner ses droits.
 *
 * Rôles : super_admin, manager, picker, driver, support.
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
};

const ROLES = ["super_admin", "manager", "picker", "driver", "support"];

const email = process.argv[2]?.trim().toLowerCase();
const role = (process.argv[3] ?? "super_admin").trim();

if (!email) {
  console.error("\nUsage : npm run grant:admin -- adresse@courriel.ca [rôle]\n");
  console.error(`Rôles disponibles : ${ROLES.join(", ")}\n`);
  process.exit(1);
}

if (!ROLES.includes(role)) {
  console.error(`\nRôle inconnu : « ${role} ». Choisissez parmi ${ROLES.join(", ")}.\n`);
  process.exit(1);
}

// Recherche du compte via l'API d'administration de Supabase Auth.
const response = await fetch(
  `${url}/auth/v1/admin/users?page=1&per_page=200`,
  { headers: H },
);

if (!response.ok) {
  console.error(`\nImpossible de lire les comptes (HTTP ${response.status}).\n`);
  process.exit(1);
}

const { users } = await response.json();
const user = users.find((u) => (u.email ?? "").toLowerCase() === email);

if (!user) {
  console.error(`\n✗ Aucun compte pour « ${email} ».`);
  console.error("\n  Créez-le d'abord dans Supabase :");
  console.error("    Authentication → Users → Add user");
  console.error("  puis relancez cette commande.\n");
  console.error("  Le script ne crée pas de compte et ne touche à aucun mot de passe.\n");
  process.exit(1);
}

const grant = await fetch(`${url}/rest/v1/staff_roles?on_conflict=user_id,role`, {
  method: "POST",
  headers: { ...H, Prefer: "resolution=merge-duplicates,return=representation" },
  body: JSON.stringify([{ user_id: user.id, role }]),
});

if (!grant.ok) {
  console.error(`\n✗ Échec de l'attribution : ${await grant.text()}\n`);
  process.exit(1);
}

const all = await (
  await fetch(`${url}/rest/v1/staff_roles?user_id=eq.${user.id}&select=role`, {
    headers: H,
  })
).json();

console.log(`\n✓ ${email} — rôle « ${role} » accordé.`);
console.log(`  Rôles actuels : ${all.map((r) => r.role).join(", ")}`);
console.log(`\n  Connexion : http://localhost:3000/admin/connexion\n`);
