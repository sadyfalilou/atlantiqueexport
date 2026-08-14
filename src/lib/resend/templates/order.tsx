import {
  Button,
  EmailLayout,
  Heading,
  InfoRow,
  Panel,
  Text,
  emailColors as C,
  emailSans as SANS,
} from "./layout";

interface OrderConfirmationEmailProps {
  recipientName?: string | null;
  orderNumber: string;
  orderDate: string;
  items: Array<{ name: string; quantity: number; pricePerUnit: string; total: string }>;
  subtotal: string;
  shippingFee: string;
  total: string;
  fulfillmentMethod: "pickup" | "local_delivery" | "shipping";
  fulfillmentDetails: string;
  locale: "fr" | "en";
}

export function OrderConfirmationEmail({
  recipientName,
  orderNumber,
  orderDate,
  items,
  subtotal,
  shippingFee,
  total,
  fulfillmentMethod,
  fulfillmentDetails,
  locale,
}: OrderConfirmationEmailProps) {
  const fr = locale === "fr";

  const t = fr
    ? {
        title: "Votre commande est confirmée",
        preview: `Commande ${orderNumber} · ${total}`,
        thanks: recipientName ? `Merci ${recipientName},` : "Merci,",
        received:
          "nous avons bien reçu votre commande. Voici le détail de ce que vous avez commandé.",
        number: "Numéro de commande",
        date: "Date",
        itemsTitle: "Votre commande",
        product: "Produit",
        quantity: "Qté",
        lineTotal: "Total",
        subtotal: "Sous-total",
        shipping: "Frais de livraison",
        free: "Offerts",
        total: "Total",
        methodTitle: "Mode de réception",
        methods: {
          pickup: "Ramassage",
          local_delivery: "Livraison locale",
          shipping: "Expédition",
        },
        nextTitle: "La suite",
        next: "Nous préparons votre commande et vous écrivons à chaque étape : préparation, mise à disposition, puis livraison ou ramassage.",
        track: "Suivre ma commande",
        noItems:
          "Le détail des articles vous sera transmis dans un instant. Votre commande, elle, est bien enregistrée.",
      }
    : {
        title: "Your order is confirmed",
        preview: `Order ${orderNumber} · ${total}`,
        thanks: recipientName ? `Thank you ${recipientName},` : "Thank you,",
        received: "we have received your order. Here is what you ordered.",
        number: "Order number",
        date: "Date",
        itemsTitle: "Your order",
        product: "Product",
        quantity: "Qty",
        lineTotal: "Total",
        subtotal: "Subtotal",
        shipping: "Delivery fee",
        free: "Free",
        total: "Total",
        methodTitle: "Fulfillment method",
        methods: {
          pickup: "Pickup",
          local_delivery: "Local delivery",
          shipping: "Shipping",
        },
        nextTitle: "What happens next",
        next: "We are preparing your order and will write to you at every step: preparation, readiness, then delivery or pickup.",
        track: "Track my order",
        noItems:
          "The item details will follow shortly. Your order itself is safely recorded.",
      };

  const site =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://atlantiqueexport.com";

  const th: React.CSSProperties = {
    fontFamily: SANS,
    fontSize: "12px",
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    color: C.muted,
    fontWeight: 700,
    padding: "0 0 8px",
    borderBottom: `2px solid ${C.line}`,
  };

  const td: React.CSSProperties = {
    fontFamily: SANS,
    fontSize: "15px",
    lineHeight: 1.5,
    color: C.ink,
    padding: "12px 0",
    borderBottom: `1px solid ${C.line}`,
    verticalAlign: "top",
  };

  return (
    <EmailLayout title={t.title} preview={t.preview} locale={locale}>
      <Text>
        <strong>{t.thanks}</strong> {t.received}
      </Text>

      <Panel>
        <InfoRow label={t.number} value={<strong>{orderNumber}</strong>} />
        <InfoRow label={t.date} value={orderDate} />
      </Panel>

      <Heading>{t.itemsTitle}</Heading>

      {items.length === 0 ? (
        <Text size={14} color={C.muted}>
          {t.noItems}
        </Text>
      ) : (
        <table
          role="presentation"
          width="100%"
          cellPadding={0}
          cellSpacing={0}
          border={0}
          style={{ borderCollapse: "collapse", marginBottom: "20px" }}
        >
          <thead>
            <tr>
              <th style={{ ...th, textAlign: "left" }}>{t.product}</th>
              <th style={{ ...th, textAlign: "center", width: "48px" }}>{t.quantity}</th>
              <th style={{ ...th, textAlign: "right", width: "92px" }}>{t.lineTotal}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx}>
                <td style={{ ...td, textAlign: "left" }}>
                  {item.name}
                  <br />
                  <span style={{ fontSize: "13px", color: C.muted }}>
                    {item.pricePerUnit}
                  </span>
                </td>
                <td style={{ ...td, textAlign: "center" }}>{item.quantity}</td>
                <td style={{ ...td, textAlign: "right", whiteSpace: "nowrap" }}>
                  {item.total}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Panel>
        <InfoRow label={t.subtotal} value={subtotal} strong />
        <InfoRow label={t.shipping} value={shippingFee} strong />
        <InfoRow label={t.total} value={total} total />
      </Panel>

      <Heading>{t.methodTitle}</Heading>
      <Text size={14}>
        <strong>{t.methods[fulfillmentMethod]}</strong>
        {fulfillmentDetails ? ` — ${fulfillmentDetails}` : ""}
      </Text>

      <Heading>{t.nextTitle}</Heading>
      <Text size={14} bottom={0}>
        {t.next}
      </Text>

      <Button href={`${site}/${locale}/commande/${orderNumber}`}>{t.track}</Button>
    </EmailLayout>
  );
}
