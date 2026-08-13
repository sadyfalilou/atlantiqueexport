"use client";

import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, Info } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { placeOrderAction, type CheckoutState } from "@/app/actions/checkout";
import { formatPrice } from "@/lib/utils";
import type { FulfillmentMethod } from "@/lib/types";
import type { DeliveryZone, PickupLocation, Slot } from "@/lib/checkout/checkout";

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending} className="w-full">
      {label}
    </Button>
  );
}

const field =
  "h-12 w-full rounded-sm border border-line-strong bg-surface px-3 text-base text-forest-900 placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-700";

/**
 * Formulaire de commande.
 *
 * Tous les créneaux sont fournis dès le rendu et filtrés ici selon le mode et
 * la zone : cela évite un aller-retour réseau à chaque changement, et le
 * formulaire reste utilisable si le script échoue à se charger — les champs
 * sont alors simplement tous visibles.
 *
 * Aucun montant n'est envoyé. Le total est calculé par la base au moment de
 * la commande.
 */
export function CheckoutForm({
  methods,
  pickupLocations,
  zones,
  slots,
  subtotalCents,
}: {
  methods: FulfillmentMethod[];
  pickupLocations: PickupLocation[];
  zones: DeliveryZone[];
  slots: Slot[];
  subtotalCents: number;
}) {
  const t = useTranslations("checkout");
  const tCart = useTranslations("cart");
  const locale = useLocale();

  const [method, setMethod] = useState<FulfillmentMethod>(methods[0] ?? "pickup");
  const [postalCode, setPostalCode] = useState("");
  const [state, formAction] = useActionState<CheckoutState, FormData>(
    placeOrderAction,
    { status: "idle" },
  );

  const zone = useMemo(() => {
    const normalised = postalCode.replace(/\s+/g, "").toUpperCase();
    if (normalised.length < 3) return null;
    return (
      zones.find((z) =>
        z.postalPrefixes.some(
          (p) => p === normalised.slice(0, 2) || p === normalised.slice(0, 3),
        ),
      ) ?? null
    );
  }, [postalCode, zones]);

  const visibleSlots = useMemo(() => {
    if (method === "pickup") return slots.filter((s) => s.method === "pickup");
    if (method === "local_delivery") {
      return slots.filter((s) => s.method === "local_delivery" && s.zoneId === zone?.id);
    }
    return [];
  }, [method, slots, zone]);

  const deliveryFee = useMemo(() => {
    if (method !== "local_delivery" || !zone) return null;
    if (zone.freeThresholdCents != null && subtotalCents >= zone.freeThresholdCents) {
      return 0;
    }
    return zone.feeCents;
  }, [method, zone, subtotalCents]);

  const belowMinimum =
    method === "local_delivery" && zone != null && subtotalCents < zone.minOrderCents;

  return (
    <form action={formAction} className="space-y-10">
      <input type="hidden" name="locale" value={locale} />

      {/* --- 1. Mode de réception --- */}
      <fieldset>
        <legend className="font-display text-lg font-semibold text-forest-900">
          {t("methodTitle")}
        </legend>
        <div className="mt-4 space-y-2">
          {methods.map((option) => (
            <label
              key={option}
              className={`flex cursor-pointer items-start gap-3 rounded-md border-2 p-4 transition-colors ${
                method === option
                  ? "border-forest-800 bg-forest-50"
                  : "border-line-strong hover:border-forest-600"
              }`}
            >
              <input
                type="radio"
                name="method"
                value={option}
                checked={method === option}
                onChange={() => setMethod(option)}
                className="mt-1 size-4 accent-[var(--color-forest-800)]"
              />
              <span>
                <span className="block font-semibold text-forest-900">
                  {tCart(`methods.${option}`)}
                </span>
                <span className="block text-sm text-muted">
                  {t(`methodHelp.${option}`)}
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {method === "pickup" && pickupLocations.length > 0 ? (
        <fieldset>
          <legend className="font-display text-lg font-semibold text-forest-900">
            {t("pickupTitle")}
          </legend>
          <input type="hidden" name="pickupLocationId" value={pickupLocations[0].id} />
          <div className="mt-3 rounded-md border border-line bg-surface p-4">
            <p className="font-semibold text-forest-900">{pickupLocations[0].name}</p>
            {pickupLocations[0].instructions ? (
              <p className="mt-1 text-sm text-muted">{pickupLocations[0].instructions}</p>
            ) : null}
          </div>
        </fieldset>
      ) : null}

      {/* --- 2. Adresse --- */}
      {method !== "pickup" ? (
        <fieldset className="space-y-3">
          <legend className="font-display text-lg font-semibold text-forest-900">
            {t("addressTitle")}
          </legend>

          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-forest-900">
              {t("line1")}
            </span>
            <input name="line1" required className={field} autoComplete="address-line1" />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-forest-900">
              {t("line2")}
            </span>
            <input name="line2" className={field} autoComplete="address-line2" />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-forest-900">
                {t("city")}
              </span>
              <input
                name="city"
                required
                defaultValue="Montréal"
                className={field}
                autoComplete="address-level2"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-forest-900">
                {t("postalCode")}
              </span>
              <input
                name="postalCode"
                required
                value={postalCode}
                onChange={(event) => setPostalCode(event.target.value)}
                placeholder="H2X 1Y4"
                className={field}
                autoComplete="postal-code"
                aria-describedby="zone-feedback"
              />
            </label>
          </div>

          <p id="zone-feedback" className="text-sm" aria-live="polite">
            {method === "local_delivery" && postalCode.replace(/\s/g, "").length >= 3 ? (
              zone ? (
                <span className="text-success">
                  {t("zoneFound", {
                    zone: zone.name,
                    fee:
                      deliveryFee === 0
                        ? t("freeDelivery")
                        : formatPrice(deliveryFee ?? 0, locale),
                  })}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-warning">
                  <AlertCircle aria-hidden="true" className="size-4" />
                  {t("outsideZones")}
                </span>
              )
            ) : null}
          </p>

          {belowMinimum && zone ? (
            <p className="inline-flex items-center gap-1.5 text-sm text-warning">
              <AlertCircle aria-hidden="true" className="size-4" />
              {t("belowMinimum", { amount: formatPrice(zone.minOrderCents, locale) })}
            </p>
          ) : null}
        </fieldset>
      ) : null}

      {/* --- 3. Créneau --- */}
      {method !== "shipping" ? (
        <fieldset>
          <legend className="font-display text-lg font-semibold text-forest-900">
            {t("slotTitle")}
          </legend>

          {visibleSlots.length === 0 ? (
            <p className="mt-3 text-sm text-muted">
              {method === "local_delivery" && !zone
                ? t("slotNeedsPostalCode")
                : t("noSlots")}
            </p>
          ) : (
            <label className="mt-3 block">
              <span className="sr-only">{t("slotTitle")}</span>
              <select name="slotId" required className={field}>
                <option value="">{t("chooseSlot")}</option>
                {visibleSlots.map((slot) => (
                  <option key={slot.id} value={slot.id}>
                    {new Intl.DateTimeFormat(locale === "en" ? "en-CA" : "fr-CA", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      timeZone: "UTC",
                    }).format(new Date(slot.date))}
                    {" · "}
                    {slot.startTime} – {slot.endTime}
                  </option>
                ))}
              </select>
            </label>
          )}
        </fieldset>
      ) : null}

      {/* --- 4. Coordonnées --- */}
      <fieldset className="space-y-3">
        <legend className="font-display text-lg font-semibold text-forest-900">
          {t("contactTitle")}
        </legend>

        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-forest-900">
            {t("fullName")}
          </span>
          <input name="fullName" required minLength={2} className={field} autoComplete="name" />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-forest-900">
              {t("email")}
            </span>
            <input
              name="email"
              type="email"
              required
              className={field}
              autoComplete="email"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-forest-900">
              {t("phone")}
            </span>
            <input name="phone" type="tel" className={field} autoComplete="tel" />
          </label>
        </div>

        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-forest-900">
            {t("notes")}
          </span>
          <textarea name="notes" rows={3} className="min-h-24 w-full rounded-sm border border-line-strong bg-surface p-3 text-base text-forest-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-700" />
        </label>
      </fieldset>

      {/* --- 5. Paiement --- */}
      <fieldset>
        <legend className="font-display text-lg font-semibold text-forest-900">
          {t("paymentTitle")}
        </legend>
        <div className="mt-3 rounded-md border border-line bg-surface p-4">
          <p className="font-semibold text-forest-900">{t("interac")}</p>
          <p className="mt-1 text-sm text-muted">{t("interacHelp")}</p>
        </div>
      </fieldset>

      {state.status === "error" ? (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-md border border-danger/30 bg-mango-50 p-4 text-sm text-danger"
        >
          <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span>{translateError(state, t)}</span>
        </p>
      ) : null}

      <div>
        <Submit label={t("submit")} />
        <p className="mt-3 inline-flex items-start gap-1.5 text-sm text-muted">
          <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {t("noPaymentNow")}
        </p>
      </div>
    </form>
  );
}

/**
 * Les messages venus de PostgreSQL sont déjà rédigés pour être lus. On ne
 * traduit que les cas que l'action distingue elle-même.
 */
function translateError(state: CheckoutState, t: (key: string) => string): string {
  switch (state.message) {
    case "invalid":
      return t("errors.invalid");
    case "empty_cart":
      return t("errors.emptyCart");
    case "address_required":
      return t("errors.addressRequired");
    case "outside_zones":
      return t("outsideZones");
    default:
      return state.message ?? t("errors.invalid");
  }
}
