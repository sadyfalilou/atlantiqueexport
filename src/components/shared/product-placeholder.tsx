import { cn } from "@/lib/utils";

/**
 * Placeholder utilisé tant qu'une vraie photographie n'est pas disponible.
 * Il est volontairement identifiable — il ne fait pas semblant d'être une
 * photo — et disparaît dès que `imageUrl` est renseigné en base.
 */
export function ProductPlaceholder({
  name,
  label,
  className,
}: {
  name: string;
  label: string;
  className?: string;
}) {
  const initial = name.trim().charAt(0).toUpperCase();

  return (
    <div
      className={cn(
        "relative flex h-full w-full flex-col items-center justify-center bg-cream-100",
        className,
      )}
      role="img"
      aria-label={`${name} — ${label}`}
    >
      <span
        aria-hidden="true"
        className="font-display text-5xl font-semibold text-forest-800/25"
      >
        {initial}
      </span>
      <span
        aria-hidden="true"
        className="mt-2 h-px w-10 bg-gold-400"
      />
      <span
        aria-hidden="true"
        className="mt-2 text-[0.625rem] font-semibold tracking-wide text-muted uppercase"
      >
        {label}
      </span>
    </div>
  );
}
