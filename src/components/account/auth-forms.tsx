"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { MailCheck } from "lucide-react";
import {
  requestPasswordResetAction,
  signInAction,
  signUpAction,
  updatePasswordAction,
  type AccountState,
} from "@/app/actions/account";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/lib/types";

const field =
  "h-11 w-full rounded-sm border border-line-strong bg-surface px-3 text-forest-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-700";
const labelClass = "text-sm font-semibold text-forest-900";

function Submit({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="primary" size="lg" disabled={pending} className="w-full">
      {pending ? pendingLabel : label}
    </Button>
  );
}

function Feedback({ state }: { state: AccountState }) {
  if (state.status !== "error" || !state.message) return null;
  return (
    <p role="alert" className="text-sm text-danger">
      {state.message}
    </p>
  );
}

/* -------------------------------------------------------------------------- */

export function SignInForm({
  locale,
  labels,
}: {
  locale: Locale;
  labels: Record<string, string>;
}) {
  const [state, action] = useActionState<AccountState, FormData>(signInAction, {
    status: "idle",
  });

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="locale" value={locale} />

      <div className="flex flex-col gap-1.5">
        <label className={labelClass} htmlFor="email">
          {labels.email}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className={field}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={labelClass} htmlFor="password">
          {labels.password}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={field}
        />
      </div>

      <Feedback state={state} />
      <Submit label={labels.signIn} pendingLabel={labels.pending} />
    </form>
  );
}

export function SignUpForm({
  locale,
  labels,
}: {
  locale: Locale;
  labels: Record<string, string>;
}) {
  const [state, action] = useActionState<AccountState, FormData>(signUpAction, {
    status: "idle",
  });

  if (state.status === "checkEmail") {
    return (
      <div className="flex flex-col items-start gap-3 rounded-lg border border-line bg-cream-50 p-5">
        <MailCheck aria-hidden="true" className="size-6 text-forest-800" />
        <h2 className="font-display text-lg font-semibold text-forest-900">
          {labels.checkEmailTitle}
        </h2>
        <p className="text-sm text-muted">{labels.checkEmailBody}</p>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="locale" value={locale} />

      <div className="flex flex-col gap-1.5">
        <label className={labelClass} htmlFor="fullName">
          {labels.fullName}
        </label>
        <input
          id="fullName"
          name="fullName"
          autoComplete="name"
          maxLength={120}
          className={field}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={labelClass} htmlFor="email">
          {labels.email}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className={field}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={labelClass} htmlFor="password">
          {labels.password}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          className={field}
        />
        <p className="text-xs text-muted">{labels.passwordHint}</p>
      </div>

      <Feedback state={state} />
      <Submit label={labels.signUp} pendingLabel={labels.pending} />
    </form>
  );
}

export function ResetRequestForm({
  locale,
  labels,
}: {
  locale: Locale;
  labels: Record<string, string>;
}) {
  const [state, action] = useActionState<AccountState, FormData>(
    requestPasswordResetAction,
    { status: "idle" },
  );

  if (state.status === "sent") {
    return (
      <div className="flex flex-col items-start gap-3 rounded-lg border border-line bg-cream-50 p-5">
        <MailCheck aria-hidden="true" className="size-6 text-forest-800" />
        <p className="text-sm text-muted">{labels.resetSent}</p>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="locale" value={locale} />
      <div className="flex flex-col gap-1.5">
        <label className={labelClass} htmlFor="email">
          {labels.email}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className={field}
        />
      </div>
      <Feedback state={state} />
      <Submit label={labels.resetSend} pendingLabel={labels.pending} />
    </form>
  );
}

export function NewPasswordForm({
  locale,
  labels,
}: {
  locale: Locale;
  labels: Record<string, string>;
}) {
  const [state, action] = useActionState<AccountState, FormData>(updatePasswordAction, {
    status: "idle",
  });

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="locale" value={locale} />
      <div className="flex flex-col gap-1.5">
        <label className={labelClass} htmlFor="password">
          {labels.newPassword}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          className={field}
        />
        <p className="text-xs text-muted">{labels.passwordHint}</p>
      </div>
      <Feedback state={state} />
      <Submit label={labels.save} pendingLabel={labels.pending} />
    </form>
  );
}
