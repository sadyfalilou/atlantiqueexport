import "server-only";
import { createClient } from "@supabase/supabase-js";
import { createRetryingFetch } from "@/lib/supabase/retrying-fetch";

/**
 * Un incident passager de Supabase ne doit plus faire échouer un build entier.
 * Les lectures sont retentées ; les écritures et appels RPC, jamais — la règle
 * tient à la méthode HTTP (voir `retrying-fetch.ts`).
 */
const retryingFetch = createRetryingFetch();

/**
 * Client Supabase pour la lecture publique, côté serveur.
 *
 * Il utilise la clé PUBLIQUE : toutes les requêtes passent donc par les
 * politiques RLS, exactement comme si elles venaient du navigateur. C'est
 * volontaire — une lecture de catalogue n'a aucune raison de disposer de
 * privilèges élevés, et si une politique était trop permissive, le défaut
 * apparaîtrait ici plutôt que d'être masqué par la clé secrète.
 *
 * La clé secrète, qui contourne RLS, est réservée aux écritures serveur et
 * vivra dans un module distinct.
 */
export function createCatalogClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Supabase n'est pas configuré : renseignez NEXT_PUBLIC_SUPABASE_URL et " +
        "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY dans .env.local, puis lancez " +
        "`npm run check:supabase`.",
    );
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: retryingFetch },
  });
}
