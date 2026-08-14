import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Container, Section } from "@/components/ui/layout-primitives";
import { SignInForm } from "@/components/account/auth-forms";
import { getCurrentCustomer } from "@/lib/supabase/account";
import { routing } from "@/i18n/routing";
import type { Locale } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "account" });
  return { title: t("signInTitle"), robots: { index: false } };
}

export default async function SignInPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  // Déjà connecté : inutile de proposer de se connecter à nouveau.
  if (await getCurrentCustomer()) redirect(`/${locale}/compte`);

  const query = await searchParams;
  const t = await getTranslations("account");
  const labels = {
    email: t("email"),
    password: t("password"),
    signIn: t("signIn"),
    pending: t("pending"),
  };

  return (
    <Section className="py-10 lg:py-16">
      <Container>
        <div className="mx-auto max-w-[26rem]">
          <h1 className="font-display text-[1.75rem] font-semibold text-forest-900">
            {t("signInTitle")}
          </h1>
          <p className="mt-2 text-muted">{t("signInSubtitle")}</p>

          {query.lien ? (
            <p role="alert" className="mt-4 rounded-lg border border-line bg-cream-50 p-4 text-sm text-warning">
              {t("linkExpired")}
            </p>
          ) : null}

          <div className="mt-8">
            <SignInForm locale={locale as Locale} labels={labels} />
          </div>

          <div className="mt-6 flex flex-col gap-2 text-sm">
            <Link href="/mot-de-passe" className="text-forest-800 hover:underline">
              {t("forgot")}
            </Link>
            <p className="text-muted">
              {t("noAccount")}{" "}
              <Link href="/inscription" className="text-forest-800 hover:underline">
                {t("signUp")}
              </Link>
            </p>
          </div>
        </div>
      </Container>
    </Section>
  );
}
