/**
 * Lanceur du Supabase CLI avec la chaîne de connexion du projet.
 *
 *   node scripts/db.mjs migration list
 *   node scripts/db.mjs db push --include-all
 *
 * Pourquoi ce détour plutôt qu'un simple `export` en shell : la chaîne de
 * connexion contient un mot de passe généré, dont les caractères spéciaux
 * (&, $, !, guillemets…) sont réinterprétés par le shell et tronquent
 * silencieusement la variable. Ici l'URL est lue par Node et passée au CLI
 * comme argument, sans jamais traverser une ligne de commande interprétée.
 *
 * La sortie est filtrée pour masquer la chaîne de connexion : ce que le
 * script affiche peut être partagé sans exposer le mot de passe.
 */

import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const envPath = fileURLToPath(new URL("../.env.local", import.meta.url));

try {
  process.loadEnvFile(envPath);
} catch {
  console.error("Impossible de lire .env.local — lancez d'abord : cp .env.example .env.local");
  process.exit(1);
}

const dbUrl = process.env.SUPABASE_DB_URL?.trim();

if (!dbUrl || dbUrl.includes("motdepasse")) {
  console.error("SUPABASE_DB_URL n'est pas renseignée dans .env.local.");
  console.error("Tableau de bord Supabase → « Connect » → onglet « Session pooler ».");
  process.exit(1);
}

if (/@db\.[a-z0-9]+\.supabase\.co/.test(dbUrl)) {
  console.error("SUPABASE_DB_URL utilise la connexion directe, injoignable en IPv4.");
  console.error("Prenez l'onglet « Session pooler ».");
  process.exit(1);
}

/** Ne jamais laisser la chaîne de connexion apparaître dans une sortie. */
function redact(text) {
  if (!text) return "";
  return text
    .split(dbUrl)
    .join("<chaîne de connexion masquée>")
    .replace(/postgres(ql)?:\/\/[^\s"']+/g, "<chaîne de connexion masquée>");
}

const result = spawnSync("supabase", [...process.argv.slice(2), "--db-url", dbUrl], {
  encoding: "utf8",
  maxBuffer: 32 * 1024 * 1024,
});

if (result.error) {
  console.error(`Impossible de lancer le Supabase CLI : ${result.error.message}`);
  process.exit(1);
}

if (result.stdout) process.stdout.write(redact(result.stdout));
if (result.stderr) process.stderr.write(redact(result.stderr));

process.exit(result.status ?? 1);
