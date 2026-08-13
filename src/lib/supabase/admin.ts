import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Client Supabase de confiance, réservé au serveur.
 *
 * ⚠️ Cette clé porte l'attribut BYPASSRLS : elle contourne TOUTES les
 * politiques de sécurité. Elle ne doit jamais être importée depuis un
 * composant client — le marqueur `server-only` en haut de ce fichier fait
 * échouer la compilation si quelqu'un essaie.
 *
 * Elle sert aux tables que les rôles publics ne peuvent pas toucher du tout :
 * `carts` et `cart_items` n'ont volontairement aucun privilège client, de
 * sorte qu'un panier ne puisse être ni lu ni modifié depuis le navigateur.
 * L'accès est cloisonné par le jeton de panier, stocké dans un cookie
 * httpOnly et donc inaccessible au JavaScript de la page.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;

  if (!url || !key) {
    throw new Error(
      "SUPABASE_SECRET_KEY est absente : renseignez-la dans .env.local, puis " +
        "lancez `npm run check:supabase`.",
    );
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
