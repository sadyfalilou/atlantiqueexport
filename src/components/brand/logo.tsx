import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Le logo d'Atlantique Export, dans ses trois découpes.
 *
 * `wordmark` — ATLANTIQUE EXPORT et l'emblème, sans la signature. C'est la
 *   version de l'en-tête : à cette taille, « Des goûts qui voyagent… »
 *   serait illisible.
 * `full` — le logo complet, signature comprise, pour le pied de page où la
 *   place ne manque pas.
 * `mark` — l'emblème seul, pour les usages carrés et minuscules.
 *
 * `onDark` bascule sur la déclinaison où le vert foncé devient crème. Sans
 * elle, le mot EXPORT disparaîtrait purement et simplement sur les fonds
 * vert forêt de l'en-tête et du pied de page.
 *
 * Les fichiers sont fabriqués par `npm run brand:build` depuis
 * assets/brand/logo-original.jpg — ils ne se retouchent pas à la main.
 */

type LogoVariant = "wordmark" | "full" | "mark";

const SOURCES: Record<
  LogoVariant,
  { light: string; dark: string; width: number; height: number }
> = {
  wordmark: {
    light: "/brand/logo-wordmark.png",
    dark: "/brand/logo-wordmark-reverse.png",
    width: 1351,
    height: 389,
  },
  full: {
    light: "/brand/logo-full.png",
    dark: "/brand/logo-full-reverse.png",
    width: 1351,
    height: 442,
  },
  mark: {
    light: "/brand/logo-mark.png",
    dark: "/brand/logo-mark.png",
    width: 346,
    height: 346,
  },
};

export function Logo({
  variant = "wordmark",
  onDark = false,
  className,
  priority = false,
  alt = "Atlantique Export",
}: {
  variant?: LogoVariant;
  onDark?: boolean;
  className?: string;
  priority?: boolean;
  alt?: string;
}) {
  const source = SOURCES[variant];

  return (
    <Image
      src={onDark ? source.dark : source.light}
      alt={alt}
      width={source.width}
      height={source.height}
      priority={priority}
      // La hauteur est pilotée par les classes utilitaires ; la largeur suit
      // le rapport d'origine.
      className={cn("w-auto", className)}
    />
  );
}
