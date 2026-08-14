// @vitest-environment node
import { mkdirSync, writeFileSync } from "node:fs";
import { it } from "vitest";
import { render } from "@react-email/render";
import { Button, EmailLayout, Text, emailColors as C } from "./templates/layout";

const OUT = process.env.SUPABASE_TEMPLATE_DIR;

/**
 * Gabarits pour les courriels envoyés par Supabase Auth.
 *
 * Supabase possède ses propres modèles, en anglais et sans identité visuelle.
 * Ceux-ci reprennent l'habillage de la marque et laissent les variables de
 * Supabase — `{{ .ConfirmationURL }}` — intactes, à coller telles quelles dans
 * Authentication → Emails.
 */
function Confirmation({ locale }: { locale: "fr" | "en" }) {
  const fr = locale === "fr";
  return (
    <EmailLayout
      locale={locale}
      title={fr ? "Confirmez votre adresse" : "Confirm your email"}
      preview={fr ? "Un clic pour activer votre compte." : "One click to activate your account."}
    >
      <Text>
        {fr
          ? "Bonjour, merci d'avoir créé un compte chez Atlantique Export."
          : "Hello, thank you for creating an account with Atlantique Export."}
      </Text>
      <Text bottom={0}>
        {fr
          ? "Confirmez votre adresse pour activer votre compte et retrouver vos commandes."
          : "Confirm your address to activate your account and find your orders."}
      </Text>
      <Button href="__LIEN__">
        {fr ? "Confirmer mon adresse" : "Confirm my email"}
      </Button>
      <Text size={13} color={C.muted} bottom={0}>
        {fr
          ? "Si vous n'êtes pas à l'origine de cette inscription, ignorez ce message : aucun compte ne sera activé."
          : "If you did not sign up, ignore this message: no account will be activated."}
      </Text>
    </EmailLayout>
  );
}

it.skipIf(!OUT)("génère les gabarits Supabase", async () => {
  mkdirSync(OUT!, { recursive: true });
  for (const locale of ["fr", "en"] as const) {
    const html = (await render(<Confirmation locale={locale} />))
      .replaceAll("__LIEN__", "{{ .ConfirmationURL }}");
    writeFileSync(`${OUT}/confirmation.${locale}.html`, html);
    console.log(`confirmation.${locale}.html — ${(html.length / 1024).toFixed(1)} Ko`);
  }
});
