"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { CheckCircle2, Clock, Plus, Trash2, XCircle } from "lucide-react";
import {
  deleteAddressAction,
  requestBusinessAccountAction,
  saveAddressAction,
  saveProfileAction,
  type ProfileState,
} from "@/app/actions/account";
import { Button } from "@/components/ui/button";
import type { BusinessAccount, Customer, SavedAddress } from "@/lib/supabase/account";

const field =
  "h-11 w-full rounded-sm border border-line-strong bg-surface px-3 text-sm text-forest-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-700";
const labelClass = "text-sm font-semibold text-forest-900";

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="primary" disabled={pending}>
      {pending ? "Un instant…" : label}
    </Button>
  );
}

function Feedback({ state, saved }: { state: ProfileState; saved: string }) {
  if (state.status === "error") {
    return (
      <p role="alert" className="text-sm text-danger">
        {state.message}
      </p>
    );
  }
  if (state.status === "saved") {
    return (
      <p role="status" className="text-sm text-success">
        {saved}
      </p>
    );
  }
  return null;
}

/* -------------------------------------------------------------------------- */

export function ProfileForm({ customer }: { customer: Customer }) {
  const [state, action] = useActionState<ProfileState, FormData>(saveProfileAction, {
    status: "idle",
  });

  return (
    <form action={action} className="flex max-w-xl flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label className={labelClass} htmlFor="fullName">
          Nom complet
        </label>
        <input
          id="fullName"
          name="fullName"
          defaultValue={customer.fullName ?? ""}
          autoComplete="name"
          maxLength={120}
          className={field}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={labelClass} htmlFor="phone">
          Téléphone
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          defaultValue={customer.phone ?? ""}
          autoComplete="tel"
          maxLength={40}
          className={field}
        />
        <p className="text-xs text-muted">
          Sert au livreur s&apos;il ne trouve pas l&apos;adresse.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={labelClass} htmlFor="profileLocale">
          Langue des courriels
        </label>
        <select
          id="profileLocale"
          name="profileLocale"
          defaultValue={customer.locale}
          className={field}
        >
          <option value="fr">Français</option>
          <option value="en">English</option>
        </select>
      </div>

      <label className="flex items-center gap-2.5 text-sm text-forest-900">
        <input type="checkbox" name="marketingOptIn" className="size-4" />
        Je veux recevoir l&apos;infolettre : arrivages, nouveautés et promotions
      </label>

      <div className="flex flex-wrap items-center gap-4">
        <Submit label="Enregistrer" />
        <Feedback state={state} saved="Profil enregistré." />
      </div>

      <p className="text-xs text-muted">
        Votre adresse courriel — {customer.email} — sert à vous connecter et ne se
        change pas ici. Écrivez-nous si vous devez en changer.
      </p>
    </form>
  );
}

/* -------------------------------------------------------------------------- */

export function AddressList({ addresses }: { addresses: SavedAddress[] }) {
  const [open, setOpen] = useState(addresses.length === 0);

  return (
    <div className="flex flex-col gap-6">
      {addresses.length > 0 ? (
        <ul className="grid gap-4 sm:grid-cols-2">
          {addresses.map((address) => (
            <li
              key={address.id}
              className="flex flex-col gap-2 rounded-lg border border-line bg-surface p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-forest-900">
                  {address.label || address.fullName}
                  {address.isDefault ? (
                    <span className="ml-2 rounded-full bg-forest-800 px-2 py-0.5 text-xs font-semibold text-cream-50">
                      Par défaut
                    </span>
                  ) : null}
                </p>

                <form action={deleteAddressAction}>
                  <input type="hidden" name="addressId" value={address.id} />
                  <button
                    type="submit"
                    aria-label={`Supprimer l'adresse ${address.label || address.fullName}`}
                    className="inline-flex size-9 items-center justify-center rounded-md text-danger hover:bg-cream-100"
                  >
                    <Trash2 aria-hidden="true" className="size-4" />
                  </button>
                </form>
              </div>

              <address className="text-sm not-italic text-muted">
                {address.fullName}
                <br />
                {address.line1}
                {address.line2 ? (
                  <>
                    <br />
                    {address.line2}
                  </>
                ) : null}
                <br />
                {address.city}, {address.province} {address.postalCode}
                {address.phone ? (
                  <>
                    <br />
                    {address.phone}
                  </>
                ) : null}
              </address>
            </li>
          ))}
        </ul>
      ) : null}

      {open ? (
        <AddressForm onDone={() => setOpen(false)} />
      ) : (
        <div>
          <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
            <Plus aria-hidden="true" className="size-4" />
            Ajouter une adresse
          </Button>
        </div>
      )}
    </div>
  );
}

function AddressForm({ onDone }: { onDone: () => void }) {
  const [state, action] = useActionState<ProfileState, FormData>(
    async (previous, formData) => {
      const result = await saveAddressAction(previous, formData);
      if (result.status === "saved") onDone();
      return result;
    },
    { status: "idle" },
  );

  return (
    <form
      action={action}
      className="flex max-w-2xl flex-col gap-4 rounded-lg border border-line bg-surface p-5"
    >
      <h3 className="font-display text-base font-semibold text-forest-900">
        Nouvelle adresse
      </h3>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="label">
            Nom de l&apos;adresse
          </label>
          <input id="label" name="label" placeholder="Maison" maxLength={60} className={field} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="addrFullName">
            Nom du destinataire
          </label>
          <input id="addrFullName" name="fullName" required autoComplete="name" className={field} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={labelClass} htmlFor="line1">
          Adresse
        </label>
        <input id="line1" name="line1" required autoComplete="address-line1" className={field} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={labelClass} htmlFor="line2">
          Appartement, étage
        </label>
        <input id="line2" name="line2" autoComplete="address-line2" className={field} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="city">
            Ville
          </label>
          <input id="city" name="city" required autoComplete="address-level2" className={field} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="province">
            Province
          </label>
          <input
            id="province"
            name="province"
            required
            defaultValue="QC"
            maxLength={40}
            className={field}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="postalCode">
            Code postal
          </label>
          <input
            id="postalCode"
            name="postalCode"
            required
            autoComplete="postal-code"
            placeholder="H2X 1Y4"
            className={field}
          />
          <p className="text-xs text-muted">Il détermine la zone de livraison.</p>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={labelClass} htmlFor="addrPhone">
          Téléphone
        </label>
        <input id="addrPhone" name="phone" type="tel" autoComplete="tel" className={field} />
      </div>

      <label className="flex items-center gap-2.5 text-sm text-forest-900">
        <input type="checkbox" name="isDefault" className="size-4" />
        Utiliser cette adresse par défaut
      </label>

      <div className="flex flex-wrap items-center gap-4">
        <Submit label="Enregistrer l'adresse" />
        <Feedback state={state} saved="Adresse enregistrée." />
      </div>
    </form>
  );
}

/* -------------------------------------------------------------------------- */

export function BusinessForm({ account }: { account: BusinessAccount | null }) {
  const [state, action] = useActionState<ProfileState, FormData>(
    requestBusinessAccountAction,
    { status: "idle" },
  );

  const badge =
    account?.status === "approved" ? (
      <p className="inline-flex items-center gap-2 rounded-lg border border-line bg-cream-50 p-4 text-sm text-success">
        <CheckCircle2 aria-hidden="true" className="size-5" />
        Votre compte professionnel est actif.
      </p>
    ) : account?.status === "rejected" ? (
      <p className="inline-flex items-center gap-2 rounded-lg border border-line bg-cream-50 p-4 text-sm text-muted">
        <XCircle aria-hidden="true" className="size-5" />
        Cette demande n&apos;a pas été retenue. Écrivez-nous pour en parler.
      </p>
    ) : account ? (
      <p className="inline-flex items-center gap-2 rounded-lg border border-line bg-cream-50 p-4 text-sm text-warning">
        <Clock aria-hidden="true" className="size-5" />
        Demande reçue, en cours d&apos;examen. Nous revenons vers vous par courriel.
      </p>
    ) : null;

  return (
    <div className="flex flex-col gap-6">
      {badge}

      <form
        action={action}
        className="flex max-w-2xl flex-col gap-4 rounded-lg border border-line bg-surface p-5"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className={labelClass} htmlFor="companyName">
              Nom de l&apos;établissement
            </label>
            <input
              id="companyName"
              name="companyName"
              required
              defaultValue={account?.companyName ?? ""}
              maxLength={200}
              className={field}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass} htmlFor="businessNumber">
              Numéro d&apos;entreprise
            </label>
            <input
              id="businessNumber"
              name="businessNumber"
              defaultValue={account?.businessNumber ?? ""}
              maxLength={60}
              className={field}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className={labelClass} htmlFor="contactName">
              Personne à joindre
            </label>
            <input
              id="contactName"
              name="contactName"
              defaultValue={account?.contactName ?? ""}
              maxLength={120}
              className={field}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass} htmlFor="contactPhone">
              Téléphone
            </label>
            <input
              id="contactPhone"
              name="contactPhone"
              type="tel"
              defaultValue={account?.contactPhone ?? ""}
              maxLength={40}
              className={field}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="notes">
            Produits et volumes qui vous intéressent
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={4}
            defaultValue={account?.notes ?? ""}
            maxLength={1000}
            className="w-full rounded-sm border border-line-strong bg-surface p-3 text-sm text-forest-900"
          />
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <Submit label={account ? "Mettre à jour ma demande" : "Envoyer ma demande"} />
          <Feedback state={state} saved="Demande enregistrée." />
        </div>

        <p className="text-xs text-muted">
          Chaque demande est examinée à la main. Le tarif de gros n&apos;est jamais
          accordé automatiquement.
        </p>
      </form>
    </div>
  );
}
