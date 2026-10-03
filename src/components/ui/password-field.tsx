"use client";

import { useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

/**
 * Champ de mot de passe avec bascule d'affichage.
 *
 * Taper un mot de passe à l'aveugle, c'est se tromper sans le savoir — et
 * s'en apercevoir seulement au message d'erreur, sans jamais comprendre
 * lequel des deux essais était le bon. Le bouton laisse vérifier ce qu'on a
 * écrit, et reste un choix : rien n'est révélé tant qu'on ne le demande pas.
 *
 * Le nom accessible du bouton change avec son état plutôt que de s'appuyer
 * sur `aria-pressed` : « Afficher » puis « Masquer » dit à la fois ce que le
 * bouton fera et, par déduction, où l'on en est.
 */
export function PasswordField({
  name,
  label,
  showLabel,
  hideLabel,
  autoComplete,
  hint,
  id,
  minLength,
  required = true,
  className,
  labelClassName = "text-sm font-semibold text-forest-900",
}: {
  name: string;
  label: string;
  showLabel: string;
  hideLabel: string;
  autoComplete: "current-password" | "new-password";
  hint?: string;
  id?: string;
  minLength?: number;
  required?: boolean;
  className: string;
  labelClassName?: string;
}) {
  const generated = useId();
  const fieldId = id ?? generated;
  const [visible, setVisible] = useState(false);

  return (
    <div className="flex flex-col gap-1.5">
      <label className={labelClassName} htmlFor={fieldId}>
        {label}
      </label>

      <div className="relative">
        <input
          id={fieldId}
          name={name}
          // Le navigateur et les gestionnaires de mots de passe suivent le
          // champ, pas son type : basculer en texte ne leur fait rien perdre.
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          minLength={minLength}
          required={required}
          className={`${className} pr-12`}
        />

        <button
          type="button"
          onClick={() => setVisible((shown) => !shown)}
          className="absolute inset-y-0 right-0 inline-flex w-11 items-center justify-center rounded-sm text-muted transition-colors hover:text-forest-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-700"
        >
          {visible ? (
            <EyeOff aria-hidden="true" className="size-5" />
          ) : (
            <Eye aria-hidden="true" className="size-5" />
          )}
          <span className="sr-only">{visible ? hideLabel : showLabel}</span>
        </button>
      </div>

      {hint ? <p className="text-xs text-muted">{hint}</p> : null}
    </div>
  );
}
