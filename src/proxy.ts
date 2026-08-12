import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";

// Next.js 16 renomme « middleware » en « proxy » ; le comportement est identique.
// Rôle ici : rediriger « / » vers la locale par défaut et normaliser les URL localisées.
export const proxy = createMiddleware(routing);

export const config = {
  // On exclut les routes d'API, les fichiers internes de Next et tout chemin
  // contenant un point (fichiers statiques : images, manifest, robots.txt…).
  matcher: ["/", "/((?!api|_next|_vercel|admin|.*\\..*).*)"],
};
