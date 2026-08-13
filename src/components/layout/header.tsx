import { Search, User } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Container } from "@/components/ui/layout-primitives";
import { Logo } from "@/components/brand/logo";
import { CartBadge } from "@/components/cart/cart-badge";
import { MegaMenu } from "@/components/layout/mega-menu";
import { MobileNav } from "@/components/layout/mobile-nav";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { getMegaMenuCategories } from "@/lib/catalog/queries";
import type { Locale } from "@/lib/types";

export async function Header({ locale }: { locale: Locale }) {
  const t = await getTranslations();
  const categories = await getMegaMenuCategories();

  const primaryLinks = [
    { href: "/nouveautes", label: t("nav.new") },
    { href: "/arrivages", label: t("nav.shipments") },
    { href: "/recettes", label: t("nav.recipes") },
    { href: "/marques", label: t("nav.brands") },
    { href: "/a-propos", label: t("nav.about") },
    { href: "/contact", label: t("nav.contact") },
  ];

  return (
    <header className="sticky top-0 z-40">
      <div className="bg-forest-900 text-cream-100">
        <Container>
          <p className="py-2 text-center text-xs">{t("announcement.text")}</p>
        </Container>
      </div>

      <div className="bg-forest-800 text-cream-50">
        <Container>
          {/* La barre est plus haute sur grand écran : le logo est un
              lockup large, et sous 50 px la ligne « ATLANTIQUE » devient
              illisible. */}
          <div className="flex h-16 items-center gap-2 lg:h-20">
            <MobileNav
              categories={categories}
              locale={locale}
              links={[{ href: "/boutique", label: t("nav.shop") }, ...primaryLinks]}
              labels={{
                open: t("nav.openMenu"),
                close: t("nav.close"),
                categories: t("nav.allCategories"),
              }}
            />

            <Link href="/" className="flex shrink-0 items-center lg:mr-4">
              <Logo
                variant="wordmark"
                onDark
                priority
                className="h-10 sm:h-11 lg:h-14"
                alt={`Atlantique Export — ${t("nav.home")}`}
              />
            </Link>

            <nav
              aria-label={t("nav.menu")}
              className="hidden flex-1 items-center gap-0.5 lg:flex"
            >
              <MegaMenu
                categories={categories}
                locale={locale}
                label={t("nav.shop")}
                allLabel={t("nav.allCategories")}
              />
              {primaryLinks.slice(0, 4).map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="inline-flex h-11 items-center rounded-md px-3 text-sm font-semibold transition-colors hover:bg-forest-700"
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <div className="ml-auto flex items-center gap-1">
              <div className="hidden lg:block">
                <LocaleSwitcher locale={locale} label={t("common.language")} />
              </div>

              <Link
                href="/recherche"
                aria-label={t("nav.search")}
                className="inline-flex size-11 items-center justify-center rounded-md transition-colors hover:bg-forest-700"
              >
                <Search aria-hidden="true" className="size-5" />
              </Link>

              <Link
                href="/compte"
                aria-label={t("nav.account")}
                className="hidden size-11 items-center justify-center rounded-md transition-colors hover:bg-forest-700 sm:inline-flex"
              >
                <User aria-hidden="true" className="size-5" />
              </Link>

              <CartBadge />
            </div>
          </div>
        </Container>
      </div>
    </header>
  );
}
