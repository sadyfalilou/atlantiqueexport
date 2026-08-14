import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Container, Section } from "@/components/ui/layout-primitives";
import { NewPasswordForm } from "@/components/account/auth-forms";
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
  return { title: t("newPasswordTitle"), robots: { index: false } };
}

export default async function NewPasswordPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  // On n'arrive ici qu'avec une session ouverte par le lien de
  // réinitialisation. Sans elle, le lien a expiré ou a déjà servi.
  if (!(await getCurrentCustomer())) redirect(`/${locale}/connexion?lien=expire`);

  const t = await getTranslations("account");
  const labels = {
    newPassword: t("newPassword"),
    passwordHint: t("passwordHint"),
    save: t("save"),
    pending: t("pending"),
  };

  return (
    <Section className="py-10 lg:py-16">
      <Container>
        <div className="mx-auto max-w-[26rem]">
          <h1 className="font-display text-[1.75rem] font-semibold text-forest-900">
            {t("newPasswordTitle")}
          </h1>
          <div className="mt-8">
            <NewPasswordForm locale={locale as Locale} labels={labels} />
          </div>
        </div>
      </Container>
    </Section>
  );
}
