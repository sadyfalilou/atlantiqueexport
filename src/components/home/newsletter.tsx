"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Container, Section } from "@/components/ui/layout-primitives";
import { Button } from "@/components/ui/button";
import {
  subscribeToNewsletter,
  type NewsletterState,
} from "@/app/actions/newsletter";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending}>
      {label}
    </Button>
  );
}

export function Newsletter() {
  const t = useTranslations("home.newsletter");
  const locale = useLocale();
  const [state, formAction] = useActionState<NewsletterState, FormData>(
    subscribeToNewsletter,
    { status: "idle" },
  );

  return (
    <Section className="bg-cream-100">
      <Container>
        <div className="mx-auto max-w-[42rem] rounded-xl border border-line bg-surface p-6 lg:p-10">
          <h2 className="font-display text-[1.5rem] font-semibold text-forest-900">
            {t("title")}
          </h2>
          <p className="mt-2 text-muted">{t("body")}</p>

          <form action={formAction} className="mt-6">
            <input type="hidden" name="locale" value={locale} />

            <label
              htmlFor="newsletter-email"
              className="block text-sm font-semibold text-forest-900"
            >
              {t("emailLabel")}
            </label>

            <div className="mt-2 flex flex-col gap-3 sm:flex-row">
              <input
                id="newsletter-email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder={t("placeholder")}
                aria-describedby="newsletter-help newsletter-status"
                aria-invalid={state.status === "invalid"}
                className="h-12 w-full rounded-sm border border-line-strong bg-surface px-3 text-base text-forest-900 placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-700"
              />
              <SubmitButton label={t("cta")} />
            </div>

            <p id="newsletter-help" className="mt-2 text-xs text-muted">
              {t("consent")}
            </p>

            <p
              id="newsletter-status"
              role="status"
              aria-live="polite"
              className="mt-3 text-sm"
            >
              {state.status === "invalid" ? (
                <span className="inline-flex items-center gap-1.5 text-danger">
                  <AlertCircle aria-hidden="true" className="size-4" />
                  {t("invalidEmail")}
                </span>
              ) : null}
              {state.status === "accepted" ? (
                <span className="inline-flex items-center gap-1.5 text-success">
                  <CheckCircle2 aria-hidden="true" className="size-4" />
                  {t("subscribed")}
                </span>
              ) : null}
            </p>
          </form>
        </div>
      </Container>
    </Section>
  );
}
