import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Container } from "@/components/ui/layout-primitives";
import { SocialPhotoIcon } from "@/components/shared/social-icon";
import { getMegaMenuCategories } from "@/lib/catalog/queries";
import type { Locale } from "@/lib/types";

export async function Footer({ locale }: { locale: Locale }) {
  const t = await getTranslations();
  const categories = (await getMegaMenuCategories()).slice(0, 6);

  const help = [
    { href: "/livraison", label: t("footer.delivery") },
    { href: "/faq", label: t("footer.faq") },
    { href: "/contact", label: t("footer.contact") },
    { href: "/pro", label: t("footer.pro") },
  ];

  const company = [
    { href: "/a-propos", label: t("footer.about") },
    { href: "/nos-producteurs", label: t("footer.producers") },
    { href: "/recettes", label: t("nav.recipes") },
    { href: "/arrivages", label: t("nav.shipments") },
  ];

  const legal = [
    { href: "/politiques/confidentialite", label: t("footer.privacy") },
    { href: "/politiques/conditions-de-vente", label: t("footer.terms") },
    { href: "/politiques/remboursement", label: t("footer.refund") },
    { href: "/politiques/expedition", label: t("footer.shipping") },
    { href: "/politiques/temoins", label: t("footer.cookies") },
    { href: "/politiques/accessibilite", label: t("footer.accessibility") },
  ];

  return (
    <footer className="mt-auto bg-forest-900 text-cream-100">
      <Container>
        <div className="grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-1">
            <p className="font-display text-xl font-semibold text-cream-50">
              Atlantique Export
            </p>
            <p className="mt-2 text-sm text-cream-200">{t("brand.tagline")}</p>
            <p className="mt-4 text-sm text-cream-200">
              {t("footer.location")}
            </p>
            <a
              href="https://www.instagram.com/atlantique_export_/"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-cream-50 hover:underline"
            >
              <SocialPhotoIcon className="size-5" />
              @atlantique_export_
            </a>
          </div>

          <FooterColumn title={t("footer.shopTitle")}>
            {categories.map((category) => (
              <FooterLink
                key={category.id}
                href={category.href ?? `/boutique/${category.slug}`}
              >
                {category.name[locale]}
              </FooterLink>
            ))}
          </FooterColumn>

          <FooterColumn title={t("footer.helpTitle")}>
            {help.map((item) => (
              <FooterLink key={item.href} href={item.href}>
                {item.label}
              </FooterLink>
            ))}
          </FooterColumn>

          <FooterColumn title={t("footer.companyTitle")}>
            {company.map((item) => (
              <FooterLink key={item.href} href={item.href}>
                {item.label}
              </FooterLink>
            ))}
          </FooterColumn>

          <FooterColumn title={t("footer.legalTitle")}>
            {legal.map((item) => (
              <FooterLink key={item.href} href={item.href}>
                {item.label}
              </FooterLink>
            ))}
          </FooterColumn>
        </div>

        <div className="flex flex-col gap-2 border-t border-forest-700 py-6 text-xs text-cream-200 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} Atlantique Export. {t("footer.rights")}
          </p>
          <p>{t("brand.taglineSecondary")}</p>
        </div>
      </Container>
    </footer>
  );
}

function FooterColumn({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs font-semibold tracking-wide text-gold-400 uppercase">
        {title}
      </p>
      <ul className="mt-3 space-y-1">{children}</ul>
    </div>
  );
}

function FooterLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <li>
      <Link
        href={href}
        className="inline-flex min-h-9 items-center text-sm text-cream-200 transition-colors hover:text-cream-50 hover:underline"
      >
        {children}
      </Link>
    </li>
  );
}
