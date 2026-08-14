import { NextResponse, type NextRequest } from "next/server";
import { createSessionClient } from "@/lib/supabase/auth";

/**
 * Retour des liens envoyés par courriel — réinitialisation, confirmation.
 *
 * Supabase renvoie ici avec un code à échanger contre une session. L'échange
 * doit se faire dans un gestionnaire de route et non dans une page : c'est le
 * seul endroit où Next.js autorise l'écriture des cookies de session.
 *
 * La destination finale est contrainte aux chemins internes. Sans cela,
 * `?next=https://exemple.invalid` transformerait ce lien — signé par votre
 * domaine et arrivé dans un vrai courriel — en tremplin vers un site tiers.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const requested = url.searchParams.get("next") ?? "/fr/compte";

  const next = requested.startsWith("/") && !requested.startsWith("//")
    ? requested
    : "/fr/compte";

  if (!code) {
    return NextResponse.redirect(new URL("/fr/connexion?lien=invalide", url.origin));
  }

  const supabase = await createSessionClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.warn("Échange du code de session refusé :", error.message);
    return NextResponse.redirect(new URL("/fr/connexion?lien=expire", url.origin));
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
