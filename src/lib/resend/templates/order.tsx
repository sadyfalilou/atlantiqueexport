interface OrderConfirmationEmailProps {
  recipientName: string;
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
  const t =
    locale === "fr"
      ? {
          greeting: "Votre commande est confirmée",
          intro: `Merci ${recipientName} !`,
          orderReceived: "Nous avons bien reçu votre commande.",
          orderNumber: "Numéro de commande",
          orderDate: "Date",
          itemsTitle: "Articles commandés",
          quantity: "Qté",
          unitPrice: "Prix unitaire",
          subtotal: "Sous-total",
          shippingFee: "Frais de livraison",
          total: "Total",
          fulfillmentTitle: "Mode de réception",
          fulfillmentDetails: "Détails",
          nextSteps: "Prochaines étapes",
          willPrepare: "Nous allons préparer votre commande et vous tiendrons informé de son avancement.",
          questions: "Avez-vous des questions ?",
          contactUs: "Contactez-nous à",
        }
      : {
          greeting: "Your order is confirmed",
          intro: `Thank you ${recipientName}!`,
          orderReceived: "We have received your order.",
          orderNumber: "Order number",
          orderDate: "Date",
          itemsTitle: "Items ordered",
          quantity: "Qty",
          unitPrice: "Unit price",
          subtotal: "Subtotal",
          shippingFee: "Shipping fee",
          total: "Total",
          fulfillmentTitle: "Fulfillment method",
          fulfillmentDetails: "Details",
          nextSteps: "Next steps",
          willPrepare: "We will prepare your order and keep you informed of its progress.",
          questions: "Do you have any questions?",
          contactUs: "Contact us at",
        };

  return (
    <div style={{ fontFamily: "Inter, sans-serif", lineHeight: 1.6, color: "#1a1a1a" }}>
      <div style={{ maxWidth: "600px", margin: "0 auto", padding: "40px 20px" }}>
        <h1 style={{ color: "#8b4513", marginBottom: "20px", fontSize: "28px" }}>
          {t.greeting}
        </h1>

        <p style={{ marginBottom: "16px", fontSize: "16px" }}>{t.intro}</p>
        <p style={{ marginBottom: "24px", fontSize: "16px" }}>{t.orderReceived}</p>

        <div style={{ backgroundColor: "#fafafa", padding: "16px", borderRadius: "6px", marginBottom: "24px" }}>
          <p style={{ margin: "8px 0", fontSize: "14px" }}>
            <strong>{t.orderNumber}:</strong> {orderNumber}
          </p>
          <p style={{ margin: "8px 0", fontSize: "14px" }}>
            <strong>{t.orderDate}:</strong> {orderDate}
          </p>
        </div>

        <h2 style={{ fontSize: "18px", marginTop: "32px", marginBottom: "16px", color: "#1a1a1a" }}>
          {t.itemsTitle}
        </h2>

        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "24px" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #e0e0e0" }}>
              <th style={{ textAlign: "left", padding: "8px 0", fontSize: "13px", fontWeight: "bold" }}>
                Produit
              </th>
              <th style={{ textAlign: "center", padding: "8px 0", fontSize: "13px", fontWeight: "bold" }}>
                {t.quantity}
              </th>
              <th style={{ textAlign: "right", padding: "8px 0", fontSize: "13px", fontWeight: "bold" }}>
                {t.unitPrice}
              </th>
              <th style={{ textAlign: "right", padding: "8px 0", fontSize: "13px", fontWeight: "bold" }}>
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx} style={{ borderBottom: "1px solid #f0f0f0" }}>
                <td style={{ padding: "12px 0", fontSize: "14px" }}>{item.name}</td>
                <td style={{ textAlign: "center", padding: "12px 0", fontSize: "14px" }}>
                  {item.quantity}
                </td>
                <td style={{ textAlign: "right", padding: "12px 0", fontSize: "14px" }}>
                  {item.pricePerUnit}
                </td>
                <td style={{ textAlign: "right", padding: "12px 0", fontSize: "14px" }}>
                  {item.total}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ backgroundColor: "#fafafa", padding: "16px", borderRadius: "6px", marginBottom: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
            <span>{t.subtotal}</span>
            <strong>{subtotal}</strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
            <span>{t.shippingFee}</span>
            <strong>{shippingFee}</strong>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              paddingTop: "12px",
              borderTop: "2px solid #e0e0e0",
              fontSize: "16px",
            }}
          >
            <span>{t.total}</span>
            <strong>{total}</strong>
          </div>
        </div>

        <h2 style={{ fontSize: "18px", marginTop: "32px", marginBottom: "16px", color: "#1a1a1a" }}>
          {t.fulfillmentTitle}
        </h2>
        <p style={{ fontSize: "14px", marginBottom: "24px" }}>
          <strong>{fulfillmentMethod === "pickup" ? "Ramassage" : fulfillmentMethod === "local_delivery" ? "Livraison locale" : "Expédition"}
          :</strong> {fulfillmentDetails}
        </p>

        <h2 style={{ fontSize: "18px", marginTop: "32px", marginBottom: "16px", color: "#1a1a1a" }}>
          {t.nextSteps}
        </h2>
        <p style={{ fontSize: "14px", marginBottom: "24px" }}>{t.willPrepare}</p>

        <hr style={{ borderColor: "#f0f0f0", marginTop: "40px", marginBottom: "24px" }} />

        <p style={{ fontSize: "14px", color: "#666", marginBottom: "8px" }}>
          {t.questions} {t.contactUs}{" "}
          <a href="mailto:info@atlantiqueexport.com" style={{ color: "#8b4513", textDecoration: "none" }}>
            info@atlantiqueexport.com
          </a>
        </p>

        <p style={{ fontSize: "12px", color: "#999", marginTop: "24px" }}>
          © {new Date().getFullYear()} Atlantique Export. Tous droits réservés.
        </p>
      </div>
    </div>
  );
}
