import { Button, EmailLayout, Heading, Panel, Text, emailColors as C } from "./layout";

/**
 * Courriels courts : avancement d'une commande, alertes, réinitialisation.
 * L'habillage vient de `EmailLayout` ; il ne reste ici que le texte.
 */

interface SimpleEmailProps {
  // Le nom est facultatif : une commande en ramassage n'en porte aucun, faute
  // d'adresse de livraison où le lire. « Bonjour, votre commande… » se lit
  // très bien ; « Bonjour , votre commande… » trahit un gabarit cassé.
  recipientName?: string | null;
  locale: "fr" | "en";
}

interface PasswordResetEmailProps extends SimpleEmailProps {
  resetLink: string;
  expiresIn: string;
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

function site() {
  return process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://atlantiqueexport.com";
}

/* -------------------------------------------------------------------------- */
/* Avancement d'une commande                                                   */
/* -------------------------------------------------------------------------- */

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
          title: "Votre paiement est confirmé",
          preview: `Virement reçu pour la commande ${orderNumber}`,
          message: `${thank(recipientName, "fr")}, nous avons bien reçu votre virement pour la commande ${orderNumber}.`,
          next: "Votre commande passe maintenant en préparation. Nous vous écrivons dès qu'elle est prête.",
          cta: "Suivre ma commande",
        }
      : {
          title: "Your payment is confirmed",
          preview: `Transfer received for order ${orderNumber}`,
          message: `${thank(recipientName, "en")}, we have received your transfer for order ${orderNumber}.`,
          next: "Your order now moves into preparation. We will write as soon as it is ready.",
          cta: "Track my order",
        };

  return (
    <EmailLayout title={t.title} preview={t.preview} locale={locale}>
      <Text>{t.message}</Text>
      <Text bottom={0}>{t.next}</Text>
      <Button href={`${site()}/${locale}/commande/${orderNumber}`}>{t.cta}</Button>
    </EmailLayout>
  );
}

export function OrderPreparingEmail({
  recipientName,
  orderNumber,
  locale,
}: SimpleEmailProps & { orderNumber: string }) {
  const t =
    locale === "fr"
      ? {
          title: "Votre commande est en préparation",
          preview: `Commande ${orderNumber} en cours de préparation`,
          message: `${greet(recipientName, "fr")}, votre commande ${orderNumber} est en cours de préparation.`,
          next: "Nous vous écrivons dès qu'elle est prête à partir.",
          cta: "Suivre ma commande",
        }
      : {
          title: "Your order is being prepared",
          preview: `Order ${orderNumber} is being prepared`,
          message: `${greet(recipientName, "en")}, your order ${orderNumber} is being prepared.`,
          next: "We will write as soon as it is ready to go.",
          cta: "Track my order",
        };

  return (
    <EmailLayout title={t.title} preview={t.preview} locale={locale}>
      <Text>{t.message}</Text>
      <Text bottom={0}>{t.next}</Text>
      <Button href={`${site()}/${locale}/commande/${orderNumber}`}>{t.cta}</Button>
    </EmailLayout>
  );
}

export function ReadyForPickupEmail({
  recipientName,
  orderNumber,
  pickupDetails,
  locale,
}: SimpleEmailProps & { orderNumber: string; pickupDetails: string }) {
  const t =
    locale === "fr"
      ? {
          title: "Votre commande vous attend",
          preview: `Commande ${orderNumber} prête pour le ramassage`,
          message: `${greet(recipientName, "fr")}, votre commande ${orderNumber} est prête pour le ramassage.`,
          detailsTitle: "Où et quand",
          cold: "Certains produits sont réfrigérés ou congelés : prévoyez un sac isotherme si le trajet du retour est long.",
          cta: "Voir ma commande",
        }
      : {
          title: "Your order is waiting for you",
          preview: `Order ${orderNumber} is ready for pickup`,
          message: `${greet(recipientName, "en")}, your order ${orderNumber} is ready for pickup.`,
          detailsTitle: "Where and when",
          cold: "Some products are chilled or frozen: bring an insulated bag if your trip home is long.",
          cta: "View my order",
        };

  return (
    <EmailLayout title={t.title} preview={t.preview} locale={locale}>
      <Text>{t.message}</Text>

      <Heading top={26}>{t.detailsTitle}</Heading>
      <Panel accent={C.forest}>
        <p
          style={{
            margin: 0,
            fontFamily:
              "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
            fontSize: "15px",
            lineHeight: 1.7,
            color: C.ink,
            whiteSpace: "pre-wrap",
          }}
        >
          {pickupDetails}
        </p>
      </Panel>

      <Text size={13} color={C.muted} bottom={0}>
        {t.cold}
      </Text>

      <Button href={`${site()}/${locale}/commande/${orderNumber}`}>{t.cta}</Button>
    </EmailLayout>
  );
}

export function InDeliveryEmail({
  recipientName,
  orderNumber,
  locale,
}: SimpleEmailProps & { orderNumber: string }) {
  const t =
    locale === "fr"
      ? {
          title: "Votre commande est en route",
          preview: `Commande ${orderNumber} en livraison`,
          message: `${greet(recipientName, "fr")}, votre commande ${orderNumber} est partie et arrive dans votre créneau de livraison.`,
          note: "Merci de rester joignable : le livreur peut vous appeler s'il ne trouve pas l'adresse.",
          cta: "Suivre ma commande",
        }
      : {
          title: "Your order is on its way",
          preview: `Order ${orderNumber} is out for delivery`,
          message: `${greet(recipientName, "en")}, your order ${orderNumber} has left and will arrive within your delivery window.`,
          note: "Please stay reachable: the driver may call if the address is hard to find.",
          cta: "Track my order",
        };

  return (
    <EmailLayout title={t.title} preview={t.preview} locale={locale}>
      <Text>{t.message}</Text>
      <Text size={14} color={C.muted} bottom={0}>
        {t.note}
      </Text>
      <Button href={`${site()}/${locale}/commande/${orderNumber}`}>{t.cta}</Button>
    </EmailLayout>
  );
}

export function OrderDeliveredEmail({
  recipientName,
  orderNumber,
  locale,
}: SimpleEmailProps & { orderNumber: string }) {
  const t =
    locale === "fr"
      ? {
          title: "Votre commande a été livrée",
          preview: `Commande ${orderNumber} livrée`,
          message: `${greet(recipientName, "fr")}, votre commande ${orderNumber} a été livrée.`,
          cold: "Pensez à ranger sans tarder les produits réfrigérés et congelés.",
          thanks:
            "Merci de votre confiance. Si quelque chose ne va pas, écrivez-nous : nous répondons à chaque message.",
          cta: "Commander à nouveau",
        }
      : {
          title: "Your order has been delivered",
          preview: `Order ${orderNumber} delivered`,
          message: `${greet(recipientName, "en")}, your order ${orderNumber} has been delivered.`,
          cold: "Remember to store the chilled and frozen products right away.",
          thanks:
            "Thank you for your trust. If anything is wrong, write to us: we answer every message.",
          cta: "Order again",
        };

  return (
    <EmailLayout title={t.title} preview={t.preview} locale={locale}>
      <Text>{t.message}</Text>
      <Text size={14}>{t.cold}</Text>
      <Text size={14} bottom={0}>
        {t.thanks}
      </Text>
      <Button href={`${site()}/${locale}/boutique`}>{t.cta}</Button>
    </EmailLayout>
  );
}

/* -------------------------------------------------------------------------- */
/* Arrivages et stock                                                          */
/* -------------------------------------------------------------------------- */

export function PreorderConfirmationEmail({ recipientName, locale }: SimpleEmailProps) {
  const t =
    locale === "fr"
      ? {
          title: "Votre précommande est confirmée",
          preview: "Nous vous préviendrons dès l'arrivée du produit.",
          message: `${thank(recipientName, "fr")} pour votre précommande.`,
          next: "Nous vous écrivons dès que le produit arrive et qu'il est prêt à être récupéré ou livré.",
        }
      : {
          title: "Your preorder is confirmed",
          preview: "We will let you know as soon as the product arrives.",
          message: `${thank(recipientName, "en")} for your preorder.`,
          next: "We will write as soon as the product arrives and is ready to be picked up or delivered.",
        };

  return (
    <EmailLayout title={t.title} preview={t.preview} locale={locale}>
      <Text>{t.message}</Text>
      <Text bottom={0}>{t.next}</Text>
    </EmailLayout>
  );
}

export function ArrivalAvailableEmail({
  recipientName,
  productName,
  locale,
}: SimpleEmailProps & { productName: string }) {
  const t =
    locale === "fr"
      ? {
          title: "Votre arrivage est disponible",
          preview: `${productName} est arrivé.`,
          message: `${greet(recipientName, "fr")}, ${productName} est arrivé et peut être réservé.`,
          cta: "Voir les arrivages",
        }
      : {
          title: "Your arrival is available",
          preview: `${productName} has arrived.`,
          message: `${greet(recipientName, "en")}, ${productName} has arrived and can be reserved.`,
          cta: "View arrivals",
        };

  return (
    <EmailLayout title={t.title} preview={t.preview} locale={locale}>
      <Text bottom={0}>{t.message}</Text>
      <Button href={`${site()}/${locale}/arrivages`}>{t.cta}</Button>
    </EmailLayout>
  );
}

export function BackInStockEmail({
  recipientName,
  productName,
  locale,
}: SimpleEmailProps & { productName: string }) {
  const t =
    locale === "fr"
      ? {
          title: "De retour en stock",
          preview: `${productName} est de nouveau disponible.`,
          message: `${greet(recipientName, "fr")}, ${productName} est de retour en stock.`,
          note: "Les quantités sont limitées : nous prévenons toutes les personnes qui l'attendaient en même temps.",
          cta: "Voir le produit",
        }
      : {
          title: "Back in stock",
          preview: `${productName} is available again.`,
          message: `${greet(recipientName, "en")}, ${productName} is back in stock.`,
          note: "Quantities are limited: everyone waiting for it is notified at the same time.",
          cta: "View the product",
        };

  return (
    <EmailLayout title={t.title} preview={t.preview} locale={locale}>
      <Text>{t.message}</Text>
      <Text size={13} color={C.muted} bottom={0}>
        {t.note}
      </Text>
      <Button href={`${site()}/${locale}/boutique`}>{t.cta}</Button>
    </EmailLayout>
  );
}

/* -------------------------------------------------------------------------- */
/* Compte                                                                      */
/* -------------------------------------------------------------------------- */

export function PasswordResetEmail({
  recipientName,
  resetLink,
  expiresIn,
  locale,
}: PasswordResetEmailProps) {
  const t =
    locale === "fr"
      ? {
          title: "Réinitialisez votre mot de passe",
          preview: `Ce lien expire dans ${expiresIn}.`,
          message: `${greet(recipientName, "fr")}, vous avez demandé à réinitialiser votre mot de passe.`,
          cta: "Choisir un nouveau mot de passe",
          expires: `Ce lien expire dans ${expiresIn} et ne peut servir qu'une fois.`,
          warning:
            "Si vous n'êtes pas à l'origine de cette demande, ignorez ce message : votre mot de passe actuel reste valable, et personne n'y a eu accès.",
        }
      : {
          title: "Reset your password",
          preview: `This link expires in ${expiresIn}.`,
          message: `${greet(recipientName, "en")}, you asked to reset your password.`,
          cta: "Choose a new password",
          expires: `This link expires in ${expiresIn} and can only be used once.`,
          warning:
            "If you did not make this request, ignore this message: your current password remains valid, and no one gained access to it.",
        };

  return (
    <EmailLayout title={t.title} preview={t.preview} locale={locale}>
      <Text bottom={0}>{t.message}</Text>
      <Button href={resetLink}>{t.cta}</Button>
      <Text size={13} color={C.muted}>
        {t.expires}
      </Text>
      <Panel accent={C.danger}>
        <Text size={13} color={C.ink} bottom={0}>
          {t.warning}
        </Text>
      </Panel>
    </EmailLayout>
  );
}
