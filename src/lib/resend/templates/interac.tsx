interface InteracPendingEmailProps {
  recipientName: string;
  orderNumber: string;
  totalAmount: string;
  recipientEmail: string;
  securityAnswer?: string;
  locale: "fr" | "en";
}

export function InteracPendingEmail({
  recipientName,
  orderNumber,
  totalAmount,
  recipientEmail,
  securityAnswer,
  locale,
}: InteracPendingEmailProps) {
  const t =
    locale === "fr"
      ? {
          greeting: "Envoyez votre paiement par virement Interac",
          intro: `Bonjour ${recipientName},`,
          instructionsIntro: "Pour finaliser votre commande, veuillez envoyer un virement Interac du montant suivant :",
          amount: "Montant à envoyer",
          recipientEmail: "À l'adresse",
          messageInstructions: "Inscrivez le numéro de commande dans le message du virement",
          orderNumber: "Numéro de commande",
          securityNote: securityAnswer
            ? `Réponse à la question de sécurité : ${securityAnswer}`
            : "Aucune question de sécurité n'est configurée.",
          timeLimit: "Valide pendant 24 heures. Passé ce délai, la réservation de stock sera annulée.",
          confirmationWill: "Vous recevrez une confirmation dès que nous aurons reçu votre paiement.",
          questions: "Des questions ?",
          contactUs: "Contactez-nous à",
          automatic: "Si vous avez activé les dépôts automatiques sur votre compte Interac, le paiement sera effectué automatiquement.",
        }
      : {
          greeting: "Send your payment via Interac e-Transfer",
          intro: `Hello ${recipientName},`,
          instructionsIntro: "To finalize your order, please send an Interac e-Transfer for the following amount:",
          amount: "Amount to send",
          recipientEmail: "To the address",
          messageInstructions: "Write the order number in the transfer message",
          orderNumber: "Order number",
          securityNote: securityAnswer
            ? `Security question answer: ${securityAnswer}`
            : "No security question is configured.",
          timeLimit: "Valid for 24 hours. After that, the stock reservation will be cancelled.",
          confirmationWill: "You will receive a confirmation as soon as we receive your payment.",
          questions: "Any questions?",
          contactUs: "Contact us at",
          automatic: "If you have automatic deposits enabled on your Interac account, payment will be processed automatically.",
        };

  return (
    <div style={{ fontFamily: "Inter, sans-serif", lineHeight: 1.6, color: "#1a1a1a" }}>
      <div style={{ maxWidth: "600px", margin: "0 auto", padding: "40px 20px" }}>
        <h1 style={{ color: "#8b4513", marginBottom: "20px", fontSize: "28px" }}>
          {t.greeting}
        </h1>

        <p style={{ marginBottom: "16px", fontSize: "16px" }}>{t.intro}</p>

        <p style={{ marginBottom: "24px", fontSize: "16px" }}>{t.instructionsIntro}</p>

        <div
          style={{
            backgroundColor: "#fff8f0",
            border: "2px solid #8b4513",
            padding: "20px",
            borderRadius: "6px",
            marginBottom: "24px",
          }}
        >
          <p style={{ margin: "8px 0", fontSize: "14px" }}>
            <strong>{t.amount}:</strong>
          </p>
          <p style={{ margin: "8px 0", fontSize: "24px", color: "#8b4513", fontWeight: "bold" }}>
            {totalAmount}
          </p>

          <hr style={{ borderColor: "#f0f0f0", margin: "16px 0" }} />

          <p style={{ margin: "8px 0", fontSize: "14px" }}>
            <strong>{t.recipientEmail}:</strong>
          </p>
          <p style={{ margin: "8px 0", fontSize: "16px", fontFamily: "monospace", fontWeight: "bold" }}>
            {recipientEmail}
          </p>

          <hr style={{ borderColor: "#f0f0f0", margin: "16px 0" }} />

          <p style={{ margin: "8px 0", fontSize: "14px" }}>
            <strong>{t.messageInstructions}:</strong>
          </p>
          <p style={{ margin: "8px 0", fontSize: "16px", fontFamily: "monospace", fontWeight: "bold" }}>
            {orderNumber}
          </p>
        </div>

        <p style={{ fontSize: "13px", color: "#666", marginBottom: "16px", fontStyle: "italic" }}>
          {t.securityNote}
        </p>

        <p style={{ fontSize: "13px", color: "#d9534f", marginBottom: "16px" }}>
          ⏱️ {t.timeLimit}
        </p>

        <p style={{ fontSize: "14px", marginBottom: "24px" }}>{t.confirmationWill}</p>

        <p style={{ fontSize: "13px", color: "#666", marginBottom: "8px" }}>
          {t.automatic}
        </p>

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
