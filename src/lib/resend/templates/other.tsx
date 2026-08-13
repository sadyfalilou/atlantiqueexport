// Autres modèles de courriels transactionnels

interface SimpleEmailProps {
  recipientName: string;
  locale: "fr" | "en";
}

interface PasswordResetEmailProps extends SimpleEmailProps {
  resetLink: string;
  expiresIn: string;
}

export function PaymentConfirmedEmail({ recipientName, locale }: SimpleEmailProps) {
  const t =
    locale === "fr"
      ? {
          greeting: "Votre paiement est confirmé",
          message: `Merci ${recipientName}, nous avons bien reçu votre paiement. Votre commande va maintenant être préparée.`,
          tracking: "Vous pouvez suivre votre commande dans votre espace client.",
        }
      : {
          greeting: "Your payment is confirmed",
          message: `Thank you ${recipientName}, we have received your payment. Your order will now be prepared.`,
          tracking: "You can track your order in your account.",
        };

  return (
    <div style={{ fontFamily: "Inter, sans-serif", lineHeight: 1.6, color: "#1a1a1a" }}>
      <div style={{ maxWidth: "600px", margin: "0 auto", padding: "40px 20px" }}>
        <h1 style={{ color: "#8b4513", marginBottom: "20px", fontSize: "28px" }}>
          {t.greeting}
        </h1>
        <p style={{ marginBottom: "16px", fontSize: "16px" }}>{t.message}</p>
        <p style={{ fontSize: "14px", color: "#666" }}>{t.tracking}</p>
      </div>
    </div>
  );
}

export function OrderPreparingEmail({ recipientName, orderNumber, locale }: SimpleEmailProps & { orderNumber: string }) {
  const t =
    locale === "fr"
      ? {
          greeting: "Votre commande est en préparation",
          message: `Bonjour ${recipientName}, votre commande ${orderNumber} est en cours de préparation. Nous vous enverrons un message dès qu'elle sera prête.`,
        }
      : {
          greeting: "Your order is being prepared",
          message: `Hello ${recipientName}, your order ${orderNumber} is being prepared. We'll send you a message as soon as it's ready.`,
        };

  return (
    <div style={{ fontFamily: "Inter, sans-serif", lineHeight: 1.6, color: "#1a1a1a" }}>
      <div style={{ maxWidth: "600px", margin: "0 auto", padding: "40px 20px" }}>
        <h1 style={{ color: "#8b4513", marginBottom: "20px", fontSize: "28px" }}>
          {t.greeting}
        </h1>
        <p style={{ marginBottom: "16px", fontSize: "16px" }}>{t.message}</p>
      </div>
    </div>
  );
}

export function ReadyForPickupEmail({ recipientName, orderNumber, pickupDetails, locale }: SimpleEmailProps & { orderNumber: string; pickupDetails: string }) {
  const t =
    locale === "fr"
      ? {
          greeting: "Votre commande est prête",
          message: `Bonjour ${recipientName}, votre commande ${orderNumber} est prête pour le ramassage.`,
          details: "Détails du ramassage",
        }
      : {
          greeting: "Your order is ready",
          message: `Hello ${recipientName}, your order ${orderNumber} is ready for pickup.`,
          details: "Pickup details",
        };

  return (
    <div style={{ fontFamily: "Inter, sans-serif", lineHeight: 1.6, color: "#1a1a1a" }}>
      <div style={{ maxWidth: "600px", margin: "0 auto", padding: "40px 20px" }}>
        <h1 style={{ color: "#8b4513", marginBottom: "20px", fontSize: "28px" }}>
          {t.greeting}
        </h1>
        <p style={{ marginBottom: "16px", fontSize: "16px" }}>{t.message}</p>
        <div style={{ backgroundColor: "#fafafa", padding: "16px", borderRadius: "6px", marginBottom: "24px" }}>
          <p style={{ margin: "0", fontSize: "14px", whiteSpace: "pre-wrap" }}>
            {pickupDetails}
          </p>
        </div>
      </div>
    </div>
  );
}

export function InDeliveryEmail({ recipientName, orderNumber, locale }: SimpleEmailProps & { orderNumber: string }) {
  const t =
    locale === "fr"
      ? {
          greeting: "Votre commande est en livraison",
          message: `Bonjour ${recipientName}, votre commande ${orderNumber} est en route vers vous.`,
        }
      : {
          greeting: "Your order is in delivery",
          message: `Hello ${recipientName}, your order ${orderNumber} is on its way to you.`,
        };

  return (
    <div style={{ fontFamily: "Inter, sans-serif", lineHeight: 1.6, color: "#1a1a1a" }}>
      <div style={{ maxWidth: "600px", margin: "0 auto", padding: "40px 20px" }}>
        <h1 style={{ color: "#8b4513", marginBottom: "20px", fontSize: "28px" }}>
          {t.greeting}
        </h1>
        <p style={{ marginBottom: "16px", fontSize: "16px" }}>{t.message}</p>
      </div>
    </div>
  );
}

export function OrderDeliveredEmail({ recipientName, orderNumber, locale }: SimpleEmailProps & { orderNumber: string }) {
  const t =
    locale === "fr"
      ? {
          greeting: "Votre commande a été livrée",
          message: `Bonjour ${recipientName}, votre commande ${orderNumber} a été livrée. Nous espérons qu'elle vous plaira !`,
          thanks: "Merci de votre confiance.",
        }
      : {
          greeting: "Your order has been delivered",
          message: `Hello ${recipientName}, your order ${orderNumber} has been delivered. We hope you enjoy it!`,
          thanks: "Thank you for your trust.",
        };

  return (
    <div style={{ fontFamily: "Inter, sans-serif", lineHeight: 1.6, color: "#1a1a1a" }}>
      <div style={{ maxWidth: "600px", margin: "0 auto", padding: "40px 20px" }}>
        <h1 style={{ color: "#8b4513", marginBottom: "20px", fontSize: "28px" }}>
          {t.greeting}
        </h1>
        <p style={{ marginBottom: "16px", fontSize: "16px" }}>{t.message}</p>
        <p style={{ fontSize: "14px", color: "#666" }}>{t.thanks}</p>
      </div>
    </div>
  );
}

export function PreorderConfirmationEmail({ recipientName, locale }: SimpleEmailProps) {
  const t =
    locale === "fr"
      ? {
          greeting: "Votre précommande est confirmée",
          message: `Merci ${recipientName} pour votre précommande. Nous vous enverrons une notification dès que le produit sera disponible.`,
        }
      : {
          greeting: "Your preorder is confirmed",
          message: `Thank you ${recipientName} for your preorder. We'll notify you as soon as the product becomes available.`,
        };

  return (
    <div style={{ fontFamily: "Inter, sans-serif", lineHeight: 1.6, color: "#1a1a1a" }}>
      <div style={{ maxWidth: "600px", margin: "0 auto", padding: "40px 20px" }}>
        <h1 style={{ color: "#8b4513", marginBottom: "20px", fontSize: "28px" }}>
          {t.greeting}
        </h1>
        <p style={{ marginBottom: "16px", fontSize: "16px" }}>{t.message}</p>
      </div>
    </div>
  );
}

export function ArrivalAvailableEmail({ recipientName, productName, locale }: SimpleEmailProps & { productName: string }) {
  const t =
    locale === "fr"
      ? {
          greeting: "Votre arrivage est disponible",
          message: `Bonjour ${recipientName}, ${productName} est maintenant disponible pour la réservation.`,
          action: "Voir les détails",
        }
      : {
          greeting: "Your arrival is available",
          message: `Hello ${recipientName}, ${productName} is now available for reservation.`,
          action: "View details",
        };

  return (
    <div style={{ fontFamily: "Inter, sans-serif", lineHeight: 1.6, color: "#1a1a1a" }}>
      <div style={{ maxWidth: "600px", margin: "0 auto", padding: "40px 20px" }}>
        <h1 style={{ color: "#8b4513", marginBottom: "20px", fontSize: "28px" }}>
          {t.greeting}
        </h1>
        <p style={{ marginBottom: "16px", fontSize: "16px" }}>{t.message}</p>
        <div style={{ textAlign: "center", margin: "32px 0" }}>
          <a
            href={`${process.env.NEXT_PUBLIC_SITE_URL}/${locale === "fr" ? "fr" : "en"}/arrivages`}
            style={{
              display: "inline-block",
              padding: "12px 32px",
              backgroundColor: "#8b4513",
              color: "white",
              textDecoration: "none",
              borderRadius: "6px",
              fontWeight: "bold",
            }}
          >
            {t.action}
          </a>
        </div>
      </div>
    </div>
  );
}

export function BackInStockEmail({ recipientName, productName, locale }: SimpleEmailProps & { productName: string }) {
  const t =
    locale === "fr"
      ? {
          greeting: "De retour en stock",
          message: `Bonjour ${recipientName}, ${productName} est de retour en stock.`,
          action: "Commander maintenant",
        }
      : {
          greeting: "Back in stock",
          message: `Hello ${recipientName}, ${productName} is back in stock.`,
          action: "Order now",
        };

  return (
    <div style={{ fontFamily: "Inter, sans-serif", lineHeight: 1.6, color: "#1a1a1a" }}>
      <div style={{ maxWidth: "600px", margin: "0 auto", padding: "40px 20px" }}>
        <h1 style={{ color: "#8b4513", marginBottom: "20px", fontSize: "28px" }}>
          {t.greeting}
        </h1>
        <p style={{ marginBottom: "16px", fontSize: "16px" }}>{t.message}</p>
        <div style={{ textAlign: "center", margin: "32px 0" }}>
          <a
            href={`${process.env.NEXT_PUBLIC_SITE_URL}/${locale === "fr" ? "fr" : "en"}/boutique`}
            style={{
              display: "inline-block",
              padding: "12px 32px",
              backgroundColor: "#8b4513",
              color: "white",
              textDecoration: "none",
              borderRadius: "6px",
              fontWeight: "bold",
            }}
          >
            {t.action}
          </a>
        </div>
      </div>
    </div>
  );
}

export function PasswordResetEmail({ recipientName, resetLink, expiresIn, locale }: PasswordResetEmailProps) {
  const t =
    locale === "fr"
      ? {
          greeting: "Réinitialisez votre mot de passe",
          message: `Bonjour ${recipientName}, cliquez ci-dessous pour réinitialiser votre mot de passe.`,
          action: "Réinitialiser",
          expires: `Ce lien expire dans ${expiresIn}.`,
          warning: "Si vous n'avez pas demandé cette réinitialisation, ignorez cet e-mail.",
        }
      : {
          greeting: "Reset your password",
          message: `Hello ${recipientName}, click below to reset your password.`,
          action: "Reset password",
          expires: `This link expires in ${expiresIn}.`,
          warning: "If you didn't request a password reset, ignore this email.",
        };

  return (
    <div style={{ fontFamily: "Inter, sans-serif", lineHeight: 1.6, color: "#1a1a1a" }}>
      <div style={{ maxWidth: "600px", margin: "0 auto", padding: "40px 20px" }}>
        <h1 style={{ color: "#8b4513", marginBottom: "20px", fontSize: "28px" }}>
          {t.greeting}
        </h1>
        <p style={{ marginBottom: "24px", fontSize: "16px" }}>{t.message}</p>
        <div style={{ textAlign: "center", margin: "32px 0" }}>
          <a
            href={resetLink}
            style={{
              display: "inline-block",
              padding: "12px 32px",
              backgroundColor: "#8b4513",
              color: "white",
              textDecoration: "none",
              borderRadius: "6px",
              fontWeight: "bold",
            }}
          >
            {t.action}
          </a>
        </div>
        <p style={{ fontSize: "13px", color: "#666", margin: "24px 0" }}>
          {t.expires}
        </p>
        <p style={{ fontSize: "13px", color: "#d9534f", margin: "24px 0" }}>
          ⚠️ {t.warning}
        </p>
      </div>
    </div>
  );
}
