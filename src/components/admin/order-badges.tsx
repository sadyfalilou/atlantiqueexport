import { Badge } from "@/components/ui/badge";

/**
 * Les statuts sont traduits ici, en un seul endroit. L'administration reste
 * en français : c'est la langue de l'équipe, et ces libellés n'ont pas à
 * traverser le système de traduction du site public.
 */

const ORDER_LABELS: Record<string, string> = {
  new: "Nouvelle",
  pending_payment: "En attente de paiement",
  paid: "Payée",
  confirmed: "Confirmée",
  preparing: "En préparation",
  ready_for_pickup: "Prête pour ramassage",
  out_for_delivery: "En livraison",
  delivered: "Livrée",
  completed: "Terminée",
  cancelled: "Annulée",
  refunded: "Remboursée",
};

const PAYMENT_LABELS: Record<string, string> = {
  pending: "En attente",
  authorized: "Autorisé",
  paid: "Encaissé",
  partially_refunded: "Partiellement remboursé",
  refunded: "Remboursé",
  failed: "Échoué",
};

export function OrderStatusBadge({ status }: { status: string }) {
  const variant =
    status === "cancelled" || status === "refunded"
      ? "outOfStock"
      : status === "completed" || status === "delivered"
        ? "inStock"
        : status === "pending_payment"
          ? "lowStock"
          : "neutral";

  return <Badge variant={variant}>{ORDER_LABELS[status] ?? status}</Badge>;
}

export function PaymentBadge({ status }: { status: string }) {
  const variant =
    status === "paid" ? "inStock" : status === "failed" ? "outOfStock" : "lowStock";

  return <Badge variant={variant}>{PAYMENT_LABELS[status] ?? status}</Badge>;
}
