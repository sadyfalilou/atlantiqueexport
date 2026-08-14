import { Link } from "@/i18n/navigation";

/**
 * Navigation de l'espace client.
 *
 * Rendue côté serveur et sans état actif calculé en JavaScript : chaque page
 * passe elle-même la section courante. Une navigation qui dépendrait du
 * navigateur pour se souligner serait muette sans JavaScript.
 */
export function AccountNav({ current }: { current: "commandes" | "profil" | "adresses" | "professionnel" }) {
  const items = [
    { key: "commandes", href: "/compte", label: "Mes commandes" },
    { key: "profil", href: "/compte/profil", label: "Profil" },
    { key: "adresses", href: "/compte/adresses", label: "Adresses" },
    { key: "professionnel", href: "/compte/professionnel", label: "Compte professionnel" },
  ] as const;

  return (
    <nav aria-label="Espace client" className="border-b border-line">
      <ul className="flex flex-wrap gap-1">
        {items.map((item) => (
          <li key={item.key}>
            <Link
              href={item.href}
              aria-current={item.key === current ? "page" : undefined}
              className={
                item.key === current
                  ? "inline-flex h-11 items-center border-b-2 border-forest-800 px-3 text-sm font-semibold text-forest-900"
                  : "inline-flex h-11 items-center border-b-2 border-transparent px-3 text-sm text-muted hover:text-forest-900"
              }
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
