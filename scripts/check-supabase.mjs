/**
 * Vérifie que la connexion à Supabase est correctement configurée.
 *
 *   node scripts/check-supabase.mjs      (ou : npm run check:supabase)
 *
 * Le script lit `.env.local`, teste réellement les appels réseau et n'affiche
 * jamais une clé en clair : seuls les premiers caractères sont montrés, ce qui
 * suffit à identifier une clé sans la divulguer. Vous pouvez donc coller sa
 * sortie dans une conversation sans risque.
 */

import { existsSync } from "node:fs";

const ENV_FILE = ".env.local";
const TIMEOUT_MS = 10_000;

const ok = (message) => console.log(`  \x1b[32m✓\x1b[0m ${message}`);
const ko = (message) => console.log(`  \x1b[31m✗\x1b[0m ${message}`);
const warn = (message) => console.log(`  \x1b[33m!\x1b[0m ${message}`);
const info = (message) => console.log(`    ${message}`);

/** N'expose que le préfixe : « sb_secret_abc123… (48 caractères) ». */
function mask(value) {
  if (!value) return "(vide)";
  const visible = value.slice(0, 14);
  return `${visible}… (${value.length} caractères)`;
}

async function request(url, headers) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, { headers, signal: controller.signal });
    return { status: response.status };
  } catch (error) {
    return { status: 0, error: error.name === "AbortError" ? "délai dépassé" : error.message };
  } finally {
    clearTimeout(timer);
  }
}

console.log("\nVérification de la configuration Supabase\n");

/* --- 1. Le fichier d'environnement ---------------------------------------- */

if (!existsSync(ENV_FILE)) {
  ko(`${ENV_FILE} est introuvable.`);
  info("Créez-le en copiant le modèle :  cp .env.example .env.local");
  process.exit(1);
}
process.loadEnvFile(ENV_FILE);
ok(`${ENV_FILE} chargé`);

/* --- 2. Les variables attendues ------------------------------------------- */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/$/, "");

// On accepte les anciens noms pour ne pas bloquer si le tableau de bord
// n'affiche encore que les clés « Legacy ».
const publishableKey = (
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  ""
).trim();

const secretKey = (
  process.env.SUPABASE_SECRET_KEY ??
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  ""
).trim();

let failed = false;

if (!url || url.includes("votre-projet")) {
  ko("NEXT_PUBLIC_SUPABASE_URL est absente ou encore à sa valeur d'exemple.");
  failed = true;
} else if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url)) {
  warn(`NEXT_PUBLIC_SUPABASE_URL a une forme inhabituelle : ${url}`);
  info("Attendu : https://identifiant.supabase.co (sans barre oblique finale)");
} else {
  ok(`URL du projet : ${url}`);
}

if (!publishableKey || publishableKey === "sb_publishable_") {
  ko("La clé publique est absente (NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY).");
  failed = true;
} else {
  ok(`Clé publique : ${mask(publishableKey)}`);
  if (publishableKey.startsWith("eyJ")) {
    warn("C'est une ancienne clé « anon ». Elle fonctionne, mais Supabase");
    info("l'abandonne d'ici fin 2026 : préférez l'onglet « API Keys ».");
  }
}

if (!secretKey || secretKey === "sb_secret_") {
  ko("La clé secrète est absente (SUPABASE_SECRET_KEY).");
  failed = true;
} else {
  ok(`Clé secrète : ${mask(secretKey)}`);
  if (secretKey.startsWith("eyJ")) {
    warn("C'est une ancienne clé « service_role ». Elle fonctionne, mais");
    info("Supabase l'abandonne d'ici fin 2026.");
  }
}

/* --- 3. La faute qui coûte cher ------------------------------------------- */

// Toute variable exposée au navigateur dont le nom évoque un secret.
const leaked = Object.keys(process.env).filter(
  (name) => name.startsWith("NEXT_PUBLIC_") && /secret|service_role/i.test(name),
);

if (secretKey && publishableKey && secretKey === publishableKey) {
  ko("La clé publique et la clé secrète sont identiques — vous avez copié");
  info("deux fois la même valeur. Reprenez-les dans Settings → API Keys.");
  failed = true;
}

if (
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.startsWith("sb_secret_") ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.startsWith("sb_secret_")
) {
  ko("DANGER : une clé secrète est placée dans une variable NEXT_PUBLIC_,");
  info("donc exposée au navigateur. Elle contourne toute la sécurité de la");
  info("base. Corrigez, puis révoquez cette clé dans le tableau de bord.");
  failed = true;
}
if (leaked.length > 0) {
  warn(`Variables suspectes exposées au client : ${leaked.join(", ")}`);
}

if (failed) {
  console.log("\nConfiguration incomplète — aucun appel réseau tenté.\n");
  process.exit(1);
}

/* --- 4. Les appels réels --------------------------------------------------- */

console.log("\nAppels au projet Supabase\n");

const rest = await request(`${url}/rest/v1/`, { apikey: publishableKey });
if (rest.status === 200) {
  ok("API REST joignable avec la clé publique");
} else if (rest.status === 401) {
  ko("API REST : clé publique refusée (401). Vérifiez qu'elle appartient");
  info("bien à ce projet.");
  failed = true;
} else if (rest.status === 0) {
  ko(`API REST injoignable : ${rest.error}`);
  info("Projet en pause après une semaine d'inactivité ? Réveillez-le depuis");
  info("le tableau de bord.");
  failed = true;
} else {
  warn(`API REST : réponse inattendue (HTTP ${rest.status})`);
}

const auth = await request(`${url}/auth/v1/health`, { apikey: publishableKey });
if (auth.status === 200) {
  ok("Service d'authentification en service");
} else if (auth.status !== 0) {
  warn(`Authentification : HTTP ${auth.status}`);
}

const admin = await request(`${url}/rest/v1/`, {
  apikey: secretKey,
  Authorization: `Bearer ${secretKey}`,
});
if (admin.status === 200) {
  ok("Clé secrète valide (accès serveur confirmé)");
} else if (admin.status === 401) {
  ko("Clé secrète refusée (401).");
  failed = true;
} else if (admin.status !== 0) {
  warn(`Clé secrète : HTTP ${admin.status}`);
}

/* --- 5. Optionnel : la chaîne de connexion PostgreSQL ---------------------- */

const dbUrl = process.env.SUPABASE_DB_URL?.trim();
if (!dbUrl || dbUrl.includes("votre-projet") || dbUrl.includes("motdepasse")) {
  warn("SUPABASE_DB_URL n'est pas renseignée — nécessaire au lot 2 pour les");
  info("migrations. Tableau de bord → « Connect » → « Direct connection ».");
} else if (!dbUrl.startsWith("postgresql://")) {
  warn("SUPABASE_DB_URL ne ressemble pas à une chaîne PostgreSQL.");
} else {
  ok("Chaîne de connexion PostgreSQL renseignée");
}

console.log(
  failed
    ? "\n\x1b[31mConfiguration à corriger.\x1b[0m\n"
    : "\n\x1b[32mSupabase est correctement configuré.\x1b[0m\n",
);
process.exit(failed ? 1 : 0);
