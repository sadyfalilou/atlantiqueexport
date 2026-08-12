import { Home, LayoutGrid, Search, ShoppingBag } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

/**
 * Barre inférieure mobile : le panier reste toujours à un doigt, sans avoir
 * à remonter en haut de page. Masquée à partir de lg, où l'en-tête suffit.
 */
export async function BottomNav() {
  const t = await getTranslations();

  const items = [
    { href: "/", label: t("nav.home"), Icon: Home },
    { href: "/boutique", label: t("nav.shop"), Icon: LayoutGrid },
    { href: "/recherche", label: t("nav.search"), Icon: Search },
    { href: "/panier", label: t("nav.cart"), Icon: ShoppingBag },
  ];

  return (
    <nav
      aria-label={t("nav.menu")}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <ul className="grid grid-cols-4">
        {items.map(({ href, label, Icon }) => (
          <li key={href}>
            <Link
              href={href}
              className="flex min-h-14 flex-col items-center justify-center gap-0.5 py-2 text-forest-800 transition-colors hover:bg-cream-100"
            >
              <Icon aria-hidden="true" className="size-5" />
              <span className="text-[0.6875rem] font-semibold">{label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
