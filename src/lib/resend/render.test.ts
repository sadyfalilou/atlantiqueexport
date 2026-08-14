import { describe, expect, it } from "vitest";
import { generateEmailContent, type EmailType } from "./render";

/**
 * Rendu des modèles de courriels.
 *
 * Ces courriels partent vers de vrais clients : un gabarit qui laisse passer
 * « Bonjour undefined » ou « Merci , » n'est pas un détail cosmétique, c'est
 * la seule chose que la personne verra de l'entreprise ce jour-là.
 */

const locales = ["fr", "en"] as const;

/** Données minimales acceptées par chaque modèle. */
const samples: Record<string, Record<string, unknown>> = {
  payment_confirmed: { orderNumber: "AE-2026-00042" },
  order_preparing: { orderNumber: "AE-2026-00042" },
  ready_for_pickup: {
    orderNumber: "AE-2026-00042",
    pickupDetails: "Point de ramassage\nAdresse à confirmer",
  },
  in_delivery: { orderNumber: "AE-2026-00042" },
  order_delivered: { orderNumber: "AE-2026-00042" },
};

const statusEmails = Object.keys(samples) as EmailType[];

/** Retire les balises pour raisonner sur le texte que le client lira. */
function text(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;|&#x27;|&#39;|&amp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

describe("modèles de courriels de statut", () => {
  for (const type of statusEmails) {
    for (const locale of locales) {
      it(`${type} (${locale}) se rend avec un nom`, async () => {
        const { subject, html } = await generateEmailContent(type, locale, {
          ...samples[type],
          recipientName: "Awa Diop",
        });

        expect(subject.length).toBeGreaterThan(0);
        expect(text(html)).toContain("Awa Diop");
        expect(html).toContain("AE-2026-00042");
      });

      it(`${type} (${locale}) se rend sans nom, sans trou dans la phrase`, async () => {
        // Cas réel et fréquent : une commande en ramassage ne porte aucun nom,
        // faute d'adresse de livraison où le lire.
        const { html } = await generateEmailContent(type, locale, {
          ...samples[type],
          recipientName: null,
        });

        const body = text(html);
        expect(body).not.toContain("undefined");
        expect(body).not.toContain("null");
        // Ni « Bonjour , » ni « Merci , » : la virgule doit suivre le mot.
        expect(body).not.toMatch(/(Bonjour|Hello|Merci|Thank you)\s+,/);
        expect(body).toMatch(/Bonjour|Hello|Merci|Thank you/);
      });
    }
  }

  it("refuse un type inconnu plutôt que d'envoyer une page vide", async () => {
    await expect(
      generateEmailContent("inexistant" as EmailType, "fr", {}),
    ).rejects.toThrow(/inconnu/);
  });

  it("porte les détails de ramassage dans le corps du courriel", async () => {
    const { html } = await generateEmailContent("ready_for_pickup", "fr", {
      recipientName: null,
      orderNumber: "AE-2026-00042",
      pickupDetails: "Créneau : lundi 18 août, 10:00 – 12:00",
    });

    expect(text(html)).toContain("lundi 18 août");
  });

  it("distingue les deux langues", async () => {
    const fr = await generateEmailContent("order_delivered", "fr", {
      recipientName: "Awa",
      orderNumber: "AE-2026-00042",
    });
    const en = await generateEmailContent("order_delivered", "en", {
      recipientName: "Awa",
      orderNumber: "AE-2026-00042",
    });

    expect(fr.subject).not.toBe(en.subject);
    expect(text(fr.html)).toContain("livrée");
    expect(text(en.html)).toContain("delivered");
  });
});
