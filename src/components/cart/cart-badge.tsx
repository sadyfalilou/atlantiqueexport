"use client";

import { useEffect, useState } from "react";
import { ShoppingBag } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

/** Événement émis après une modification du panier, pour rafraîchir la pastille. */
export const CART_UPDATED_EVENT = "atlantique:cart-updated";

export function notifyCartUpdated() {
  window.dispatchEvent(new Event(CART_UPDATED_EVENT));
}

/**
 * Pastille du panier dans l'en-tête.
 *
 * Elle interroge `/api/panier` APRÈS affichage plutôt que de lire le cookie
 * pendant le rendu : lire un cookie dans l'en-tête rendrait dynamiques toutes
 * les pages du site, y compris l'accueil et les fiches produit qui sont
 * aujourd'hui prégénérées.
 *
 * Le lien reste utilisable dès le premier octet ; seul le compteur arrive
 * après.
 */
export function CartBadge() {
  const t = useTranslations("nav");
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    // La requête est abandonnée si le composant disparaît avant la réponse,
    // pour ne pas écrire dans un état démonté.
    const controller = new AbortController();

    async function load() {
      try {
        const response = await fetch("/api/panier", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) return;
        const data = (await response.json()) as { count: number };
        setCount(data.count);
      } catch {
        // Silencieux : l'absence de compteur n'empêche pas d'ouvrir le panier.
      }
    }

    void load();
    window.addEventListener(CART_UPDATED_EVENT, load);

    return () => {
      controller.abort();
      window.removeEventListener(CART_UPDATED_EVENT, load);
    };
  }, []);

  return (
    <Link
      href="/panier"
      aria-label={
        count === null ? t("cart") : `${t("cart")} — ${t("cartCount", { count })}`
      }
      className="relative inline-flex size-11 items-center justify-center rounded-md transition-colors hover:bg-forest-700"
    >
      <ShoppingBag aria-hidden="true" className="size-5" />
      {count !== null && count > 0 ? (
        <span
          aria-hidden="true"
          className="tabular absolute top-1 right-1 inline-flex min-w-[1.125rem] items-center justify-center rounded-full bg-mango-700 px-1 text-[0.625rem] font-bold text-white"
        >
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </Link>
  );
}
