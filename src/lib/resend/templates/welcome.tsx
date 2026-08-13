interface WelcomeEmailProps {
  recipientName: string;
  locale: "fr" | "en";
}

export function WelcomeEmail({ recipientName, locale }: WelcomeEmailProps) {
  const t =
    locale === "fr"
      ? {
          greeting: "Bienvenue chez Atlantique Export !",
          intro: `Bonjour ${recipientName},`,
          message:
            "Nous sommes heureux de vous accueillir. Vous pouvez maintenant explorer notre sélection de produits authentiques d'Afrique de l'Ouest, livrés frais à Montréal.",
          cta: "Découvrir nos produits",
          closing: "Les saveurs d'Afrique, fraîches et authentiques.",
        }
      : {
          greeting: "Welcome to Atlantique Export!",
          intro: `Hello ${recipientName},`,
          message:
            "We're delighted to have you on board. You can now explore our selection of authentic products from West Africa, delivered fresh to Montreal.",
          cta: "Discover our products",
          closing: "The flavors of Africa, fresh and authentic.",
        };

  return (
    <div style={{ fontFamily: "Inter, sans-serif", lineHeight: 1.6, color: "#1a1a1a" }}>
      <div style={{ maxWidth: "600px", margin: "0 auto", padding: "40px 20px" }}>
        <h1 style={{ color: "#8b4513", marginBottom: "20px", fontSize: "28px" }}>
          {t.greeting}
        </h1>

        <p style={{ marginBottom: "16px", fontSize: "16px" }}>{t.intro}</p>

        <p style={{ marginBottom: "24px", fontSize: "16px", lineHeight: 1.8 }}>
          {t.message}
        </p>

        <div style={{ textAlign: "center", margin: "32px 0" }}>
          <a
            href={`${process.env.NEXT_PUBLIC_SITE_URL}/${locale}`}
            style={{
              display: "inline-block",
              padding: "12px 32px",
              backgroundColor: "#8b4513",
              color: "white",
              textDecoration: "none",
              borderRadius: "6px",
              fontWeight: "bold",
              fontSize: "16px",
            }}
          >
            {t.cta}
          </a>
        </div>

        <hr style={{ borderColor: "#f0f0f0", marginTop: "40px", marginBottom: "24px" }} />

        <p style={{ fontSize: "14px", color: "#666", marginBottom: "8px", fontStyle: "italic" }}>
          {t.closing}
        </p>

        <p style={{ fontSize: "12px", color: "#999", marginTop: "24px" }}>
          © {new Date().getFullYear()} Atlantique Export. Tous droits réservés.
        </p>
      </div>
    </div>
  );
}
