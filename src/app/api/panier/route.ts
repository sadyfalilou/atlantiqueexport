import { NextResponse } from "next/server";
import { getCartCount } from "@/lib/cart/cart";

/**
 * Nombre d'articles du panier.
 *
 * Cette route existe pour que l'EN-TÊTE n'ait pas à lire le cookie pendant le
 * rendu. S'il le faisait, la moindre page deviendrait dynamique et l'accueil
 * comme les fiches produit perdraient leur prégénération. La pastille est donc
 * un composant client qui interroge cette route après affichage.
 */
export async function GET() {
  try {
    const count = await getCartCount();
    return NextResponse.json(
      { count },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    // Une panne du panier ne doit pas casser l'en-tête de tout le site.
    return NextResponse.json(
      { count: 0 },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
}
