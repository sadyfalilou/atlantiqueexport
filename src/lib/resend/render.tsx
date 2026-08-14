import { render } from "@react-email/render";

// Import des templates
import { WelcomeEmail } from "./templates/welcome";
import { OrderConfirmationEmail } from "./templates/order";
import { InteracPendingEmail } from "./templates/interac";
import {
  PaymentConfirmedEmail,
  OrderPreparingEmail,
  ReadyForPickupEmail,
  InDeliveryEmail,
  OrderDeliveredEmail,
  PreorderConfirmationEmail,
  ArrivalAvailableEmail,
  BackInStockEmail,
  PasswordResetEmail,
} from "./templates/other";

export type EmailType =
  | "welcome"
  | "order_confirmation"
  | "interac_pending"
  | "payment_confirmed"
  | "order_preparing"
  | "ready_for_pickup"
  | "in_delivery"
  | "order_delivered"
  | "preorder_confirmation"
  | "arrival_available"
  | "back_in_stock"
  | "password_reset";

/**
 * Génère le contenu HTML d'un email à partir de son type et ses données.
 */
export async function generateEmailContent(
  type: EmailType,
  locale: "fr" | "en",
  data: Record<string, unknown>,
): Promise<{ subject: string; html: string }> {
  let component: React.ReactElement;
  let subject: string;

  // Construction du composant React et du sujet selon le type d'email
  switch (type) {
    case "welcome": {
      const t =
        locale === "fr"
          ? { subject: "Bienvenue chez Atlantique Export !" }
          : { subject: "Welcome to Atlantique Export!" };
      const d = data as { recipientName: string };
      component = <WelcomeEmail recipientName={d.recipientName} locale={locale} />;
      subject = t.subject;
      break;
    }

    case "order_confirmation": {
      const t =
        locale === "fr"
          ? { subject: "Confirmation de votre commande" }
          : { subject: "Your order confirmation" };
      const d = data as {
        recipientName: string;
        orderNumber: string;
        orderDate: string;
        items: unknown[];
        subtotal: string;
        shippingFee: string;
        total: string;
        fulfillmentMethod: string;
        fulfillmentDetails: string;
      };
      component = (
        <OrderConfirmationEmail
          recipientName={d.recipientName}
          orderNumber={d.orderNumber}
          orderDate={d.orderDate}
          items={d.items as { name: string; quantity: number; pricePerUnit: string; total: string }[]}
          subtotal={d.subtotal}
          shippingFee={d.shippingFee}
          total={d.total}
          fulfillmentMethod={d.fulfillmentMethod as "pickup" | "local_delivery" | "shipping"}
          fulfillmentDetails={d.fulfillmentDetails}
          locale={locale}
        />
      );
      subject = t.subject;
      break;
    }

    case "interac_pending": {
      const t =
        locale === "fr"
          ? { subject: "Finalisez votre commande par virement Interac" }
          : { subject: "Complete your payment via Interac e-Transfer" };
      const d = data as {
        recipientName: string;
        orderNumber: string;
        totalAmount: string;
        recipientEmail: string;
        securityAnswer?: string;
      };
      component = (
        <InteracPendingEmail
          recipientName={d.recipientName}
          orderNumber={d.orderNumber}
          totalAmount={d.totalAmount}
          recipientEmail={d.recipientEmail}
          securityAnswer={d.securityAnswer}
          locale={locale}
        />
      );
      subject = t.subject;
      break;
    }

    case "payment_confirmed": {
      const t =
        locale === "fr"
          ? { subject: "Paiement confirmé" }
          : { subject: "Payment confirmed" };
      const d = data as { recipientName: string; orderNumber: string };
      component = (
        <PaymentConfirmedEmail
          recipientName={d.recipientName}
          orderNumber={d.orderNumber}
          locale={locale}
        />
      );
      subject = t.subject;
      break;
    }

    case "order_preparing": {
      const t =
        locale === "fr"
          ? { subject: "Votre commande est en préparation" }
          : { subject: "Your order is being prepared" };
      const d = data as { recipientName: string; orderNumber: string };
      component = (
        <OrderPreparingEmail
          recipientName={d.recipientName}
          orderNumber={d.orderNumber}
          locale={locale}
        />
      );
      subject = t.subject;
      break;
    }

    case "ready_for_pickup": {
      const t =
        locale === "fr"
          ? { subject: "Votre commande est prête" }
          : { subject: "Your order is ready" };
      const d = data as { recipientName: string; orderNumber: string; pickupDetails: string };
      component = (
        <ReadyForPickupEmail
          recipientName={d.recipientName}
          orderNumber={d.orderNumber}
          pickupDetails={d.pickupDetails}
          locale={locale}
        />
      );
      subject = t.subject;
      break;
    }

    case "in_delivery": {
      const t =
        locale === "fr"
          ? { subject: "Votre commande est en livraison" }
          : { subject: "Your order is in delivery" };
      const d = data as { recipientName: string; orderNumber: string };
      component = (
        <InDeliveryEmail
          recipientName={d.recipientName}
          orderNumber={d.orderNumber}
          locale={locale}
        />
      );
      subject = t.subject;
      break;
    }

    case "order_delivered": {
      const t =
        locale === "fr"
          ? { subject: "Votre commande a été livrée" }
          : { subject: "Your order has been delivered" };
      const d = data as { recipientName: string; orderNumber: string };
      component = (
        <OrderDeliveredEmail
          recipientName={d.recipientName}
          orderNumber={d.orderNumber}
          locale={locale}
        />
      );
      subject = t.subject;
      break;
    }

    case "preorder_confirmation": {
      const t =
        locale === "fr"
          ? { subject: "Votre précommande est confirmée" }
          : { subject: "Your preorder is confirmed" };
      const d = data as { recipientName: string };
      component = <PreorderConfirmationEmail recipientName={d.recipientName} locale={locale} />;
      subject = t.subject;
      break;
    }

    case "arrival_available": {
      const t =
        locale === "fr"
          ? { subject: "Votre arrivage est disponible" }
          : { subject: "Your arrival is available" };
      const d = data as { recipientName: string; productName: string };
      component = (
        <ArrivalAvailableEmail
          recipientName={d.recipientName}
          productName={d.productName}
          locale={locale}
        />
      );
      subject = t.subject;
      break;
    }

    case "back_in_stock": {
      const t =
        locale === "fr"
          ? { subject: "De retour en stock" }
          : { subject: "Back in stock" };
      const d = data as { recipientName: string; productName: string };
      component = (
        <BackInStockEmail
          recipientName={d.recipientName}
          productName={d.productName}
          locale={locale}
        />
      );
      subject = t.subject;
      break;
    }

    case "password_reset": {
      const t =
        locale === "fr"
          ? { subject: "Réinitialisez votre mot de passe" }
          : { subject: "Reset your password" };
      const d = data as { recipientName: string; resetLink: string; expiresIn: string };
      component = (
        <PasswordResetEmail
          recipientName={d.recipientName}
          resetLink={d.resetLink}
          expiresIn={d.expiresIn}
          locale={locale}
        />
      );
      subject = t.subject;
      break;
    }

    default:
      throw new Error(`Type d'email inconnu : ${type}`);
  }

  // Rendu du composant React en HTML
  const html = await render(component);

  return { subject, html };
}
