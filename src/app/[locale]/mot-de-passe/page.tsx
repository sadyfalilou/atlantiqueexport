import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Container, Section } from "@/components/ui/layout-primitives";
import { ResetRequestForm } from "@/components/account/auth-forms";
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
  return { title: t("resetTitle"), robots: { index: false } };
}

export default async function ResetPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const t = await getTranslations("account");
  const labels = {
    email: t("email"),
    resetSend: t("resetSend"),
    resetSent: t("resetSent"),
    pending: t("pending"),
  };

  return (
    <Section className="py-10 lg:py-16">
      <Container>
        <div className="mx-auto max-w-[26rem]">
          <h1 className="font-display text-[1.75rem] font-semibold text-forest-900">
            {t("resetTitle")}
          </h1>
          <p className="mt-2 text-muted">{t("resetSubtitle")}</p>

          <div className="mt-8">
            <ResetRequestForm locale={locale as Locale} labels={labels} />
          </div>

          <p className="mt-6 text-sm">
            <Link href="/connexion" className="text-forest-800 hover:underline">
              {t("signIn")}
            </Link>
          </p>
        </div>
      </Container>
    </Section>
  );
}
