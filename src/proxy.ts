import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";

// Next.js 16 renomme « middleware » en « proxy » ; le comportement est identique.
// Rôle ici : rediriger « / » vers la locale par défaut et normaliser les URL localisées.
export const proxy = createMiddleware(routing);

export const config = {
  // On exclut les routes d'API, les fichiers internes de Next et tout chemin
  // contenant un point (fichiers statiques : images, manifest, robots.txt…).
  //
  // `auth` en fait partie : c'est le retour des liens envoyés par courriel.
  // Sans cette exclusion, /auth/callback était réécrit en /fr/auth/callback,
  // une route qui n'existe pas — chaque lien de réinitialisation aurait fini
  // sur une page introuvable, et le mot de passe serait resté bloqué.
  matcher: ["/", "/((?!api|auth|_next|_vercel|admin|.*\\..*).*)"],
};
