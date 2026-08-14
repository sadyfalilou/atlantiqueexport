import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { Container, Section } from "@/components/ui/layout-primitives";
import { AccountNav } from "@/components/account/account-nav";
import { ProfileForm } from "@/components/account/account-forms";
import {
  getCurrentCustomer,
  } from "@/lib/supabase/account";
import { routing } from "@/i18n/routing";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Profil", robots: { index: false } };

export default async function AccountSectionPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const customer = await getCurrentCustomer();
  if (!customer) redirect(`/${locale}/connexion`);


  return (
    <Section className="py-8 lg:py-14">
      <Container>
        <h1 className="font-display text-[1.75rem] font-semibold text-forest-900 lg:text-[2.5rem]">
          Profil
        </h1>

        <div className="mt-6">
          <AccountNav current="profil" />
        </div>

        <div className="mt-8">
          <ProfileForm customer={customer} />
        </div>
      </Container>
    </Section>
  );
}
