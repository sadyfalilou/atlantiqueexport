// Autres modèles de courriels transactionnels

interface SimpleEmailProps {
  // Le nom est facultatif : une commande en ramassage n'en porte aucun, faute
  // d'adresse de livraison où le lire. « Bonjour, votre commande… » se lit
  // très bien ; « Bonjour , votre commande… » trahit un gabarit cassé.
  recipientName?: string | null;
  locale: "fr" | "en";
}

/** « Bonjour Awa » ou « Bonjour » selon ce que la commande nous apprend. */
function greet(name: string | null | undefined, locale: "fr" | "en") {
  const hello = locale === "fr" ? "Bonjour" : "Hello";
  return name ? `${hello} ${name}` : hello;
}

/** Même principe pour les formules de remerciement. */
function thank(name: string | null | undefined, locale: "fr" | "en") {
  const thanks = locale === "fr" ? "Merci" : "Thank you";
  return name ? `${thanks} ${name}` : thanks;
}

interface PasswordResetEmailProps extends SimpleEmailProps {
  resetLink: string;
  expiresIn: string;
}

export function PaymentConfirmedEmail({
  recipientName,
  orderNumber,
  locale,
}: SimpleEmailProps & { orderNumber: string }) {
  // Le numéro de commande n'est pas décoratif : c'est la seule chose qui
  // rattache l'accusé de réception au virement que la personne vient de faire.
  const t =
    locale === "fr"
      ? {
          greeting: "Votre paiement est confirmé",
          message: `${thank(recipientName, "fr")}, nous avons bien reçu votre paiement pour la commande ${orderNumber}. Elle va maintenant être préparée.`,
          tracking: "Vous pouvez suivre votre commande dans votre espace client.",
        }
      : {
          greeting: "Your payment is confirmed",
          message: `${thank(recipientName, "en")}, we have received your payment for order ${orderNumber}. It will now be prepared.`,
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
          message: `${greet(recipientName, "fr")}, votre commande ${orderNumber} est en cours de préparation. Nous vous enverrons un message dès qu'elle sera prête.`,
        }
      : {
          greeting: "Your order is being prepared",
          message: `${greet(recipientName, "en")}, your order ${orderNumber} is being prepared. We'll send you a message as soon as it's ready.`,
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
          message: `${greet(recipientName, "fr")}, votre commande ${orderNumber} est prête pour le ramassage.`,
          details: "Détails du ramassage",
        }
      : {
          greeting: "Your order is ready",
          message: `${greet(recipientName, "en")}, your order ${orderNumber} is ready for pickup.`,
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
          message: `${greet(recipientName, "fr")}, votre commande ${orderNumber} est en route vers vous.`,
        }
      : {
          greeting: "Your order is in delivery",
          message: `${greet(recipientName, "en")}, your order ${orderNumber} is on its way to you.`,
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
          message: `${greet(recipientName, "fr")}, votre commande ${orderNumber} a été livrée. Nous espérons qu'elle vous plaira !`,
          thanks: "Merci de votre confiance.",
        }
      : {
          greeting: "Your order has been delivered",
          message: `${greet(recipientName, "en")}, your order ${orderNumber} has been delivered. We hope you enjoy it!`,
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
          message: `${thank(recipientName, "fr")} pour votre précommande. Nous vous enverrons une notification dès que le produit sera disponible.`,
        }
      : {
          greeting: "Your preorder is confirmed",
          message: `${thank(recipientName, "en")} for your preorder. We'll notify you as soon as the product becomes available.`,
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
          message: `${greet(recipientName, "fr")}, ${productName} est maintenant disponible pour la réservation.`,
          action: "Voir les détails",
        }
      : {
          greeting: "Your arrival is available",
          message: `${greet(recipientName, "en")}, ${productName} is now available for reservation.`,
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
          message: `${greet(recipientName, "fr")}, ${productName} est de retour en stock.`,
          action: "Commander maintenant",
        }
      : {
          greeting: "Back in stock",
          message: `${greet(recipientName, "en")}, ${productName} is back in stock.`,
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
          message: `${greet(recipientName, "fr")}, cliquez ci-dessous pour réinitialiser votre mot de passe.`,
          action: "Réinitialiser",
          expires: `Ce lien expire dans ${expiresIn}.`,
          warning: "Si vous n'avez pas demandé cette réinitialisation, ignorez cet e-mail.",
        }
      : {
          greeting: "Reset your password",
          message: `${greet(recipientName, "en")}, click below to reset your password.`,
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
