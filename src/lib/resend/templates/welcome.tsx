import { Button, EmailLayout, Text } from "./layout";

interface WelcomeEmailProps {
  recipientName?: string | null;
  locale: "fr" | "en";
}

export function WelcomeEmail({ recipientName, locale }: WelcomeEmailProps) {
  const site =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://atlantiqueexport.com";

  const t =
    locale === "fr"
      ? {
          title: "Bienvenue chez Atlantique Export",
          preview: "Les saveurs d'Afrique de l'Ouest, livrées fraîches à Montréal.",
          hello: recipientName ? `Bonjour ${recipientName},` : "Bonjour,",
          intro: "merci de vous être inscrit à notre infolettre.",
          message:
            "Vous recevrez nos arrivages, nos nouveautés et nos recettes — sans excès, et jamais votre adresse ne sera transmise à qui que ce soit.",
          cta: "Découvrir la boutique",
        }
      : {
          title: "Welcome to Atlantique Export",
          preview: "West African flavours, delivered fresh in Montréal.",
          hello: recipientName ? `Hello ${recipientName},` : "Hello,",
          intro: "thank you for subscribing to our newsletter.",
          message:
            "You will hear about our arrivals, our new products and our recipes — sparingly, and your address will never be shared with anyone.",
          cta: "Visit the shop",
        };

  return (
    <EmailLayout title={t.title} preview={t.preview} locale={locale}>
      <Text>
        <strong>{t.hello}</strong> {t.intro}
      </Text>
      <Text bottom={0}>{t.message}</Text>
      <Button href={`${site}/${locale}/boutique`}>{t.cta}</Button>
    </EmailLayout>
  );
}
