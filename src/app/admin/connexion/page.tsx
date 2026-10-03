import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getStaffMember } from "@/lib/supabase/auth";
import { SignInForm } from "@/components/admin/sign-in-form";

export const metadata: Metadata = { title: "Connexion" };
export const dynamic = "force-dynamic";

export default async function AdminSignInPage() {
  // Déjà connecté et autorisé : inutile de redemander.
  const member = await getStaffMember();
  if (member) redirect("/admin");

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-[24rem]">
        <h1 className="font-display text-[1.75rem] font-semibold text-forest-900">
          Administration
        </h1>
        <p className="mt-2 text-sm text-muted">
          Réservé à l&apos;équipe d&apos;Atlantique Export.
        </p>

        <div className="mt-8 rounded-lg border border-line bg-surface p-6">
          <SignInForm />
        </div>

        {/*
          La réinitialisation vit du côté boutique : c'est le même compte
          Supabase des deux côtés. L'administration n'étant pas traduite, le
          /fr est écrit en dur — un lien localisé n'aurait aucune locale à
          lire depuis ce segment.
        */}
        <p className="mt-6 text-sm">
          <Link
            href="/fr/mot-de-passe"
            className="font-semibold text-forest-800 underline underline-offset-2 hover:text-forest-900"
          >
            Mot de passe oublié ?
          </Link>
        </p>
      </div>
    </div>
  );
}
