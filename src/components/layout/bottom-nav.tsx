import { Home, LayoutGrid, Search, ShoppingBag, User } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

/**
 * Barre inférieure mobile : le panier et le compte restent toujours à un
 * doigt, sans avoir à remonter en haut de page. Masquée à partir de lg, où
 * l'en-tête suffit.
 *
 * Le compte y figure parce qu'il ne figurait NULLE PART ailleurs sur
 * téléphone : l'en-tête le masquait sous 640 px et le tiroir ne le proposait
 * pas. Se connecter ou consulter ses commandes demandait de taper l'adresse à
 * la main.
 */
export async function BottomNav() {
  const t = await getTranslations();

  const items = [
    { href: "/", label: t("nav.home"), Icon: Home },
    { href: "/boutique", label: t("nav.shop"), Icon: LayoutGrid },
    { href: "/recherche", label: t("nav.search"), Icon: Search },
    { href: "/compte", label: t("nav.account"), Icon: User },
    { href: "/panier", label: t("nav.cart"), Icon: ShoppingBag },
  ];

  return (
    <nav
      aria-label={t("nav.menu")}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <ul className="grid grid-cols-5">
        {items.map(({ href, label, Icon }) => (
          <li key={href}>
            <Link
              href={href}
              className="flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 py-2 text-forest-800 transition-colors hover:bg-cream-100"
            >
              <Icon aria-hidden="true" className="size-5" />
              {/*
                Cinq colonnes sur 320 px laissent 64 px chacune : l'intitulé
                doit pouvoir se réduire sans déborder sur ses voisins ni
                pousser la barre à défiler.
              */}
              <span className="truncate text-[0.6875rem] font-semibold">{label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
