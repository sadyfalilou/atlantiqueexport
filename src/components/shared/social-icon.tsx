/**
 * lucide-react 1.x ne fournit plus d'icônes de marque. On dessine donc un
 * pictogramme générique « photo dans un cadre » ; c'est le texte
 * « @atlantique_export_ » à côté qui identifie le réseau.
 */
export function SocialPhotoIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}
