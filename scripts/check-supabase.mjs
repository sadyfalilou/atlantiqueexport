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

// La clé publique se valide sur /auth/v1/settings, pas sur /rest/v1/ :
// la racine de l'API REST sert le schéma OpenAPI et Supabase la réserve aux
// clés secrètes (« Only secret API keys can be used for this endpoint »).
// Vérifié aussi en sens inverse : une clé publique erronée y reçoit bien un
// 401, le test discrimine donc réellement.
const publicCheck = await request(`${url}/auth/v1/settings`, {
  apikey: publishableKey,
});
if (publicCheck.status === 200) {
  ok("Clé publique valide (projet joignable depuis le navigateur)");
} else if (publicCheck.status === 401) {
  ko("Clé publique refusée (401) : coquille, ou clé appartenant à un autre");
  info("projet. Reprenez-la dans Settings → API Keys.");
  failed = true;
} else if (publicCheck.status === 0) {
  ko(`Projet injoignable : ${publicCheck.error}`);
  info("Projet mis en pause après une semaine d'inactivité ? Réveillez-le");
  info("depuis le tableau de bord.");
  failed = true;
} else {
  warn(`Clé publique : réponse inattendue (HTTP ${publicCheck.status})`);
}

const secretCheck = await request(`${url}/rest/v1/`, {
  apikey: secretKey,
  Authorization: `Bearer ${secretKey}`,
});
if (secretCheck.status === 200) {
  ok("Clé secrète valide (API REST accessible côté serveur)");
} else if (secretCheck.status === 401) {
  ko("Clé secrète refusée (401). Reprenez-la dans Settings → API Keys.");
  failed = true;
} else if (secretCheck.status !== 0) {
  warn(`Clé secrète : HTTP ${secretCheck.status}`);
}

/* --- 5. Optionnel : la chaîne de connexion PostgreSQL ---------------------- */

const dbUrl = process.env.SUPABASE_DB_URL?.trim();
if (!dbUrl || dbUrl.includes("votreprojet") || dbUrl.includes("motdepasse")) {
  warn("SUPABASE_DB_URL n'est pas renseignée — nécessaire au lot 2 pour les");
  info("migrations. Tableau de bord → « Connect » → « Session pooler ».");
} else if (!dbUrl.startsWith("postgresql://")) {
  warn("SUPABASE_DB_URL ne ressemble pas à une chaîne PostgreSQL.");
} else if (/@db\.[a-z0-9]+\.supabase\.co/.test(dbUrl)) {
  // Constaté sur ce projet : l'hôte direct n'a qu'un enregistrement AAAA,
  // donc il est injoignable depuis un réseau IPv4.
  ko("SUPABASE_DB_URL utilise la connexion DIRECTE (db.xxx.supabase.co).");
  info("Cet hôte n'existe qu'en IPv6 et sera injoignable sur un réseau IPv4.");
  info("Prenez l'onglet « Session pooler » du bouton « Connect ».");
  failed = true;
} else if (dbUrl.includes(".pooler.supabase.com")) {
  ok("Chaîne de connexion PostgreSQL renseignée (pooler, compatible IPv4)");
} else {
  warn("Chaîne de connexion renseignée, hôte inhabituel.");
}

console.log(
  failed
    ? "\n\x1b[31mConfiguration à corriger.\x1b[0m\n"
    : "\n\x1b[32mSupabase est correctement configuré.\x1b[0m\n",
);
process.exit(failed ? 1 : 0);
