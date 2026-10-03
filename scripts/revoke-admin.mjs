/**
 * Retire un rôle du personnel à un compte.
 *
 *   npm run revoke:admin -- info@atlantiqueexport.com            (tous ses rôles)
 *   npm run revoke:admin -- prepa@atlantiqueexport.com picker    (ce rôle seulement)
 *
 * Pendant du `grant:admin`. L'écran Équipe de l'administration fait la même
 * chose au quotidien ; ce script existe pour le jour où cet écran n'est pas
 * atteignable — plus personne ne peut s'y connecter, ou il faut retirer
 * l'accès de la seule personne qui pourrait le faire, ce que l'interface
 * refuse justement pour ne verrouiller personne dehors.
 *
 * Le compte lui-même n'est pas supprimé : la personne reste cliente, elle
 * perd l'administration.
 *
 * Rôles : super_admin, manager, picker, driver, support, viewer.
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

const ROLES = ["super_admin", "manager", "picker", "driver", "support", "viewer"];

const email = process.argv[2]?.trim().toLowerCase();
const role = process.argv[3]?.trim();

if (!email) {
  console.error("\nUsage : npm run revoke:admin -- adresse@courriel.ca [rôle]\n");
  console.error("Sans rôle, tous les rôles de cette personne sont retirés.");
  console.error(`Rôles : ${ROLES.join(", ")}\n`);
  process.exit(1);
}

if (role && !ROLES.includes(role)) {
  console.error(`\nRôle inconnu : « ${role} ». Choisissez parmi ${ROLES.join(", ")}.\n`);
  process.exit(1);
}

const response = await fetch(`${url}/auth/v1/admin/users?page=1&per_page=200`, {
  headers: H,
});

if (!response.ok) {
  console.error(`\nImpossible de lire les comptes (HTTP ${response.status}).\n`);
  process.exit(1);
}

const { users } = await response.json();
const user = users.find((u) => (u.email ?? "").toLowerCase() === email);

if (!user) {
  console.error(`\n✗ Aucun compte pour « ${email} ».\n`);
  process.exit(1);
}

const current = await (
  await fetch(`${url}/rest/v1/staff_roles?user_id=eq.${user.id}&select=role`, {
    headers: H,
  })
).json();

if (current.length === 0) {
  console.log(`\n${email} n'a aucun rôle. Rien à retirer.\n`);
  process.exit(0);
}

// Un site sans super administrateur ne se répare plus depuis l'interface :
// il n'y aurait plus personne pour rendre le rôle à qui que ce soit. Le
// script refuse donc de retirer le dernier, et dit comment faire autrement.
const losingSuperAdmin =
  (!role || role === "super_admin") && current.some((r) => r.role === "super_admin");

if (losingSuperAdmin) {
  const admins = await (
    await fetch(`${url}/rest/v1/staff_roles?role=eq.super_admin&select=user_id`, {
      headers: H,
    })
  ).json();

  if (admins.length <= 1) {
    console.error("\n✗ C'est le dernier super administrateur du site.");
    console.error("\n  Donnez d'abord le rôle à quelqu'un d'autre :");
    console.error("    npm run grant:admin -- autre@courriel.ca\n");
    process.exit(1);
  }
}

const filter = role
  ? `user_id=eq.${user.id}&role=eq.${role}`
  : `user_id=eq.${user.id}`;

const removal = await fetch(`${url}/rest/v1/staff_roles?${filter}`, {
  method: "DELETE",
  headers: { ...H, Prefer: "return=representation" },
});

if (!removal.ok) {
  console.error(`\n✗ Échec du retrait : ${await removal.text()}\n`);
  process.exit(1);
}

const removed = await removal.json();

if (removed.length === 0) {
  console.log(`\n${email} n'avait pas le rôle « ${role} ». Rien n'a changé.\n`);
  process.exit(0);
}

const left = await (
  await fetch(`${url}/rest/v1/staff_roles?user_id=eq.${user.id}&select=role`, {
    headers: H,
  })
).json();

console.log(`\n✓ ${email} — retiré : ${removed.map((r) => r.role).join(", ")}.`);
console.log(`  Rôles restants : ${left.map((r) => r.role).join(", ") || "aucun"}`);
console.log("\n  Le compte existe toujours : la personne reste cliente.");
console.log("  L'effet est immédiat, sans attendre la fin de sa session.\n");
