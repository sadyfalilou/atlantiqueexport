import { renderToBuffer } from "@react-pdf/renderer";
import { ReceiptDocument } from "@/lib/receipt/document";
import { getOrderForCurrentVisitor } from "@/lib/checkout/checkout";
import type { Locale } from "@/lib/types";

/**
 * Reçu d'une commande, en PDF.
 *
 * Le contrôle d'accès est celui de la page de confirmation, et il n'est pas
 * relâché parce qu'il s'agit d'un fichier : `getOrderForCurrentVisitor`
 * n'accepte que le porteur du jeton ou le compte propriétaire. Servir ce
 * document sur simple connaissance du numéro reviendrait à publier les
 * commandes de tout le monde, une par une.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ locale: string; number: string }> },
) {
  const { locale, number } = await params;
  const order = await getOrderForCurrentVisitor(number);

  if (!order) {
    return new Response("Introuvable", { status: 404 });
  }

  const typedLocale: Locale = locale === "en" ? "en" : "fr";

  // Les taxes ne sont pas encore calculées ; `taxCents` reste donc à zéro et
  // le document s'intitule « Reçu ». Le jour où l'entreprise sera inscrite aux
  // fichiers de la TPS et de la TVQ, il suffira de passer le montant ici pour
  // que le titre devienne « Facture ».
  const buffer = await renderToBuffer(
    <ReceiptDocument order={order} locale={typedLocale} taxCents={0} />,
  );

  const nom = typedLocale === "en" ? "receipt" : "recu";

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      // `inline` plutôt que `attachment` : le document s'ouvre dans le
      // navigateur, où l'on peut le lire avant de décider de l'enregistrer.
      "Content-Disposition": `inline; filename="${nom}-${order.orderNumber}.pdf"`,
      // Un reçu ne doit jamais être servi depuis un cache partagé : il porte
      // le nom et l'adresse d'un client.
      "Cache-Control": "private, no-store",
    },
  });
}
