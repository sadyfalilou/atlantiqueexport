"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  placeReservationAction,
  type ReservationState,
} from "@/app/actions/reservation";

const field =
  "h-12 w-full rounded-sm border border-line-strong bg-surface px-3 text-base text-forest-900 placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-700";

function Submit() {
  const { pending } = useFormStatus();
  const t = useTranslations("shipments");
  return (
    <Button type="submit" disabled={pending}>
      {pending ? t("submitting") : t("submit")}
    </Button>
  );
}

/**
 * Formulaire de réservation d'une ligne d'arrivage.
 *
 * La quantité est bornée par ce qu'il reste, mais cette borne n'est
 * qu'un confort : c'est la base qui refuse le dépassement, sous verrou, et
 * elle seule peut le faire correctement quand deux personnes réservent la
 * dernière caisse en même temps.
 */
export function ReservationForm({
  itemId,
  remaining,
  defaultEmail,
}: {
  itemId: string;
  remaining: number;
  defaultEmail?: string;
}) {
  const t = useTranslations("shipments");
  const locale = useLocale();
  const [state, action] = useActionState<ReservationState, FormData>(
    placeReservationAction,
    { status: "idle" },
  );

  if (state.status === "saved") {
    return (
      <p
        role="status"
        className="rounded-md border border-forest-600 bg-forest-50 p-4 text-sm font-semibold text-forest-900"
      >
        {state.message}
      </p>
    );
  }

  return (
    <form action={action} className="grid gap-3 sm:grid-cols-[6rem_1fr_1fr_auto]">
      <input type="hidden" name="itemId" value={itemId} />
      <input type="hidden" name="locale" value={locale} />

      <label className="block">
        <span className="mb-1 block text-sm font-semibold text-forest-900">
          {t("quantity")}
        </span>
        <input
          name="quantity"
          type="number"
          min={1}
          max={remaining}
          defaultValue={1}
          required
          className={field}
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-semibold text-forest-900">
          {t("email")}
        </span>
        <input
          name="email"
          type="email"
          required
          defaultValue={defaultEmail}
          autoComplete="email"
          className={field}
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-semibold text-forest-900">
          {t("phone")}
        </span>
        <input name="phone" type="tel" autoComplete="tel" className={field} />
      </label>

      <div className="flex items-end">
        <Submit />
      </div>

      {state.status === "error" ? (
        <p role="alert" className="text-sm text-danger sm:col-span-4">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
