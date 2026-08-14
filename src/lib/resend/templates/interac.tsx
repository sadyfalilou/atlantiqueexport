import {
  Divider,
  EmailLayout,
  Heading,
  Panel,
  Text,
  emailColors as C,
  emailSans as SANS,
} from "./layout";

interface InteracPendingEmailProps {
  recipientName?: string | null;
  orderNumber: string;
  totalAmount: string;
  recipientEmail: string;
  securityAnswer?: string | null;
  locale: "fr" | "en";
}

/**
 * Instructions de virement Interac.
 *
 * C'est le seul courriel qui demande de l'argent, donc celui qu'un fraudeur
 * aurait le plus intérêt à imiter. Deux choix en découlent :
 *
 * - **Les trois informations à recopier sont isolées et en gros.** Un montant
 *   ou une adresse mal recopiés, et l'argent part ailleurs.
 * - **Le courriel ne demande jamais de cliquer pour payer.** Le virement se
 *   fait depuis le site de la banque, jamais depuis un lien reçu par courriel.
 *   Le dire explicitement protège le client le jour où une imitation, elle,
 *   contiendra un lien.
 */
export function InteracPendingEmail({
  recipientName,
  orderNumber,
  totalAmount,
  recipientEmail,
  securityAnswer,
  locale,
}: InteracPendingEmailProps) {
  const fr = locale === "fr";
  const addressKnown = recipientEmail && !/à confirmer|to confirm/i.test(recipientEmail);

  const t = fr
    ? {
        title: "Finalisez votre commande par virement Interac",
        preview: `${totalAmount} à virer pour la commande ${orderNumber}`,
        hello: recipientName ? `Bonjour ${recipientName},` : "Bonjour,",
        intro:
          "votre commande est enregistrée. Il ne reste qu'à envoyer le virement depuis votre banque.",
        stepsTitle: addressKnown
          ? "Les trois informations à recopier"
          : "Votre commande",
        amount: "Montant exact",
        to: "Adresse du destinataire",
        message: "À inscrire dans le message",
        pending:
          "L'adresse de virement n'est pas encore arrêtée. Nous vous l'envoyons dès qu'elle l'est — n'envoyez rien avant de l'avoir reçue.",
        securityTitle: "Question de sécurité",
        autoDeposit:
          "Si le dépôt automatique est activé sur votre compte, le virement se fait sans question de sécurité.",
        delayTitle: "Vous avez 24 heures",
        delay:
          "Passé ce délai, le stock réservé pour vous est remis en vente et la commande est annulée.",
        afterTitle: "Après votre virement",
        after:
          "Nous vous écrivons dès réception, puis à chaque étape de la préparation. Rien d'autre ne vous est demandé.",
        safetyTitle: "Comment reconnaître un vrai courriel de notre part",
        safety:
          "Nous ne vous demanderons jamais de payer en cliquant sur un lien, ni de communiquer un mot de passe ou un numéro de carte. Faites toujours votre virement depuis le site ou l'application de votre banque.",
      }
    : {
        title: "Complete your order with an Interac e-Transfer",
        preview: `${totalAmount} to transfer for order ${orderNumber}`,
        hello: recipientName ? `Hello ${recipientName},` : "Hello,",
        intro:
          "your order is recorded. All that is left is to send the transfer from your bank.",
        stepsTitle: addressKnown ? "The three details to copy" : "Your order",
        amount: "Exact amount",
        to: "Recipient address",
        message: "To write in the message",
        pending:
          "The transfer address is not settled yet. We will send it to you as soon as it is — please do not send anything before you receive it.",
        securityTitle: "Security question",
        autoDeposit:
          "If autodeposit is enabled on your account, the transfer goes through without a security question.",
        delayTitle: "You have 24 hours",
        delay:
          "After that, the stock held for you goes back on sale and the order is cancelled.",
        afterTitle: "After your transfer",
        after:
          "We write to you as soon as it arrives, then at every step of the preparation. Nothing else is asked of you.",
        safetyTitle: "How to recognise a genuine email from us",
        safety:
          "We will never ask you to pay by clicking a link, nor for a password or card number. Always make your transfer from your bank's own website or app.",
      };

  /** Valeur à recopier : grande, espacée, sur fond blanc pour être sélectionnable. */
  const copyValue = (value: string) => (
    <p
      style={{
        margin: "4px 0 0",
        fontFamily: SANS,
        fontSize: "20px",
        lineHeight: 1.4,
        fontWeight: 700,
        color: C.forestDark,
        wordBreak: "break-word",
      }}
    >
      {value}
    </p>
  );

  const label = (text: string) => (
    <p
      style={{
        margin: 0,
        fontFamily: SANS,
        fontSize: "12px",
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        fontWeight: 700,
        color: C.muted,
      }}
    >
      {text}
    </p>
  );

  return (
    <EmailLayout title={t.title} preview={t.preview} locale={locale}>
      <Text>
        <strong>{t.hello}</strong> {t.intro}
      </Text>

      <Heading top={28}>{t.stepsTitle}</Heading>

      <Panel accent={C.mango}>
        {label(t.amount)}
        {copyValue(totalAmount)}
      </Panel>

      <Panel accent={C.mango}>
        {label(t.to)}
        {addressKnown ? (
          copyValue(recipientEmail)
        ) : (
          <Text size={14} color={C.danger} top={6} bottom={0}>
            {t.pending}
          </Text>
        )}
      </Panel>

      <Panel accent={C.mango}>
        {label(t.message)}
        {copyValue(orderNumber)}
      </Panel>

      {securityAnswer ? (
        <>
          <Heading>{t.securityTitle}</Heading>
          <Panel>
            {copyValue(securityAnswer)}
            <Text size={13} color={C.muted} top={10} bottom={0}>
              {t.autoDeposit}
            </Text>
          </Panel>
        </>
      ) : null}

      {/* Aucun compte à rebours tant que la personne ne peut pas payer :
          réclamer un virement sous 24 heures sans donner l'adresse où
          l'envoyer ne ferait qu'inquiéter. */}
      {addressKnown ? (
        <>
          <Heading>{t.delayTitle}</Heading>
          <Text size={14}>{t.delay}</Text>
        </>
      ) : null}

      <Heading>{t.afterTitle}</Heading>
      <Text size={14}>{t.after}</Text>

      <Divider />

      <Heading top={0}>{t.safetyTitle}</Heading>
      <Text size={13} color={C.muted} bottom={0}>
        {t.safety}
      </Text>
    </EmailLayout>
  );
}
