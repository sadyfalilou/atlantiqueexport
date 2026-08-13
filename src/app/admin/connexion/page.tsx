import type { Metadata } from "next";
import { redirect } from "next/navigation";
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

        <p className="mt-6 text-sm text-muted">
          Pas encore de compte ? Il doit être créé dans Supabase, puis recevoir un rôle
          avec&nbsp;
          <code className="rounded-sm bg-cream-200 px-1 py-0.5 text-xs">
            npm run grant:admin
          </code>
          .
        </p>
      </div>
    </div>
  );
}
