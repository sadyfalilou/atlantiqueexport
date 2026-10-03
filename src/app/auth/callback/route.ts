import { NextResponse, type NextRequest } from "next/server";
import { createSessionClient } from "@/lib/supabase/auth";

/**
 * Retour des liens envoyés par courriel — réinitialisation, invitation,
 * confirmation d'inscription.
 *
 * Deux provenances, deux échanges :
 *
 * - `token_hash` vient d'un lien que NOUS avons fabriqué avec la clé de
 *   service (`generateLink`). Il se valide avec `verifyOtp`. Surtout pas
 *   avec `exchangeCodeForSession` : le client est en flux PKCE, qui réclame
 *   un vérificateur déposé dans un cookie au moment où la demande part du
 *   navigateur. Un lien né sur le serveur n'en a jamais déposé — l'échange
 *   échouerait à tous les coups, et se plaindrait d'un lien « expiré » alors
 *   qu'il est intact.
 * - `code` vient d'un parcours commencé dans le navigateur, l'inscription
 *   par exemple. Le vérificateur existe alors, et l'échange fonctionne.
 *
 * La destination finale est contrainte aux chemins internes. Sans cela,
 * `?next=https://exemple.invalid` transformerait ce lien — signé par votre
 * domaine et arrivé dans un vrai courriel — en tremplin vers un site tiers.
 */

/** Les types de lien que nous émettons. Tout le reste est traité en recovery. */
const OTP_TYPES = ["recovery", "invite", "signup", "email_change", "magiclink", "email"];

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const requestedType = url.searchParams.get("type") ?? "";
  const requested = url.searchParams.get("next") ?? "/fr/compte";

  const next = requested.startsWith("/") && !requested.startsWith("//")
    ? requested
    : "/fr/compte";

  if (!tokenHash && !code) {
    return NextResponse.redirect(new URL("/fr/connexion?lien=invalide", url.origin));
  }

  const supabase = await createSessionClient();
  let failure: string | null = null;

  if (tokenHash) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: OTP_TYPES.includes(requestedType) ? requestedType : "recovery",
    });
    failure = error?.message ?? null;
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    failure = error?.message ?? null;
  }

  if (failure) {
    console.warn("Lien de courriel refusé :", failure);
    return NextResponse.redirect(new URL("/fr/connexion?lien=expire", url.origin));
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
