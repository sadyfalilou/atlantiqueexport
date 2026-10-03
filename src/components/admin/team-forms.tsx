"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, Check, UserPlus } from "lucide-react";
import {
  addStaffMemberAction,
  setStaffRoleAction,
  type TeamState,
} from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { ASSIGNABLE_ROLES, ROLE_LABELS, type StaffRole } from "@/lib/admin/roles";

const field =
  "h-11 w-full rounded-sm border border-line-strong bg-surface px-3 text-sm text-forest-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-700";

function Feedback({ state }: { state: TeamState }) {
  if (state.status === "idle" || !state.message) return null;

  const error = state.status === "error";
  const Icon = error ? AlertCircle : Check;

  return (
    <p
      role={error ? "alert" : "status"}
      className={`flex items-start gap-2 text-sm ${error ? "text-danger" : "text-forest-800"}`}
    >
      <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      {state.message}
    </p>
  );
}

function RoleOptions() {
  return (
    <>
      {ASSIGNABLE_ROLES.map((role) => (
        <option key={role} value={role}>
          {ROLE_LABELS[role]}
        </option>
      ))}
    </>
  );
}

/** Ajoute quelqu'un à l'équipe, en créant son compte au besoin. */
export function AddStaffForm() {
  const [state, action] = useActionState<TeamState, FormData>(addStaffMemberAction, {
    status: "idle",
  });

  return (
    <form action={action} className="mt-4 flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-[1fr_14rem]">
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-forest-900">
            Adresse courriel
          </span>
          <input
            name="email"
            type="email"
            required
            autoComplete="off"
            placeholder="prenom@atlantiqueexport.com"
            className={field}
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-forest-900">Rôle</span>
          <select name="role" defaultValue="manager" className={field}>
            <RoleOptions />
          </select>
        </label>
      </div>

      <Feedback state={state} />
      <AddSubmit />
    </form>
  );
}

function AddSubmit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="self-start">
      <UserPlus aria-hidden="true" className="size-4" />
      {pending ? "Ajout…" : "Ajouter à l'équipe"}
    </Button>
  );
}

/** Change le rôle d'un membre, depuis sa ligne. */
export function RoleForm({
  userId,
  role,
  email,
}: {
  userId: string;
  role: StaffRole;
  email: string;
}) {
  const [state, action] = useActionState<TeamState, FormData>(setStaffRoleAction, {
    status: "idle",
  });

  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="userId" value={userId} />
      <label className="sr-only" htmlFor={`role-${userId}`}>
        Rôle de {email}
      </label>
      <select id={`role-${userId}`} name="role" defaultValue={role} className={`${field} h-9 w-auto`}>
        <RoleOptions />
      </select>
      <RoleSubmit />
      {state.status === "error" ? (
        <span role="alert" className="text-xs text-danger">
          {state.message}
        </span>
      ) : null}
    </form>
  );
}

function RoleSubmit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-9 items-center rounded-md px-2 text-xs font-semibold text-forest-800 underline hover:bg-cream-100 disabled:opacity-50"
    >
      {pending ? "…" : "Changer"}
    </button>
  );
}
