/**
 * Les rôles du personnel, et ce qu'ils ouvrent.
 *
 * Ce fichier est volontairement pur — aucune lecture de session, aucun accès
 * à la base. La navigation s'en sert côté client pour n'afficher que ce qui
 * est atteignable ; les pages s'en servent côté serveur pour refuser le
 * reste. Les deux disent alors la même chose, parce qu'elles lisent la même
 * table.
 *
 * Le droit d'écrire, lui, ne se décide pas ici : chaque action de
 * `src/app/actions/admin.ts` énumère elle-même les rôles qu'elle accepte.
 */

export type StaffRole =
  | "super_admin"
  | "manager"
  | "picker"
  | "driver"
  | "support"
  | "viewer";

export const ROLE_LABELS: Record<StaffRole, string> = {
  super_admin: "Super administrateur",
  manager: "Gestionnaire",
  picker: "Préparation",
  driver: "Livraison",
  support: "Service client",
  viewer: "Observateur",
};

export const ROLE_HINTS: Record<StaffRole, string> = {
  super_admin:
    "Tout, y compris l'équipe, les pages légales et le passage en mode réel.",
  manager: "Catalogue, stocks, arrivages, livraison, commandes. Pas l'équipe.",
  picker: "Fait avancer les commandes à préparer.",
  driver: "Fait avancer les commandes à livrer.",
  support: "Aucun droit d'écriture pour l'instant.",
  viewer: "Voit les ventes et les stocks. Ne modifie rien, nulle part.",
};

/**
 * Les rôles proposés à l'écran « Équipe ». `support` n'y figure pas : il
 * n'ouvre aujourd'hui aucun droit propre, et le proposer ferait croire à une
 * nuance qui n'existe pas. La valeur reste dans la base pour ne rien casser.
 */
export const ASSIGNABLE_ROLES = [
  "super_admin",
  "manager",
  "picker",
  "driver",
  "viewer",
] as const satisfies readonly StaffRole[];

/** Ce qu'un observateur peut atteindre — et rien d'autre. */
const VIEWER_SECTIONS = ["/admin", "/admin/commandes", "/admin/stocks"];

/** Vrai si la personne n'est qu'observatrice. */
export function isViewerOnly(roles: StaffRole[]): boolean {
  return roles.length > 0 && roles.every((role) => role === "viewer");
}

/**
 * Une section de l'administration est-elle ouverte à ces rôles ?
 *
 * `href` est la racine de la section, pas l'adresse exacte de la page :
 * « /admin/commandes » couvre aussi le détail d'une commande.
 */
export function canSeeSection(roles: StaffRole[], href: string): boolean {
  if (roles.length === 0) return false;
  if (href === "/admin/equipe") return roles.includes("super_admin");
  if (isViewerOnly(roles)) return VIEWER_SECTIONS.includes(href);
  return true;
}
