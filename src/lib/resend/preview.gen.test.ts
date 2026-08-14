import { mkdirSync, writeFileSync } from "node:fs";
import { it } from "vitest";
import { generateEmailContent, type EmailType } from "./render";

const OUT = process.env.EMAIL_PREVIEW_DIR;

const items = [
  { name: "Café Touba moulu — 250 g", quantity: 3, pricePerUnit: "5,99 $ / unité", total: "17,97 $" },
  { name: "Pulpe de madd congelée — 500 g", quantity: 1, pricePerUnit: "16,99 $ / unité", total: "16,99 $" },
  { name: "Bissap séché — 100 g", quantity: 2, pricePerUnit: "8,00 $ / unité", total: "16,00 $" },
];

const samples: Record<string, Record<string, unknown>> = {
  welcome: { recipientName: "Awa Diop" },
  order_confirmation: {
    recipientName: "Awa Diop",
    orderNumber: "AE-2026-00042",
    orderDate: "13 août 2026",
    items,
    subtotal: "50,96 $",
    shippingFee: "8,00 $",
    total: "58,96 $",
    fulfillmentMethod: "local_delivery",
    fulfillmentDetails: "Vendredi 14 août, 09:00 – 13:00",
  },
  interac_pending: {
    recipientName: "Awa Diop",
    orderNumber: "AE-2026-00042",
    totalAmount: "58,96 $",
    recipientEmail: "paiements@atlantiqueexport.com",
    securityAnswer: "atlantique",
  },
  interac_pending_sans_adresse: {
    recipientName: null,
    orderNumber: "AE-2026-00042",
    totalAmount: "58,96 $",
    recipientEmail: "",
    securityAnswer: null,
  },
  payment_confirmed: { recipientName: "Awa Diop", orderNumber: "AE-2026-00042" },
  order_preparing: { recipientName: null, orderNumber: "AE-2026-00042" },
  ready_for_pickup: {
    recipientName: null,
    orderNumber: "AE-2026-00042",
    pickupDetails:
      "Créneau : vendredi 14 août, 09:00 – 13:00\n\nRamassage à Montréal\nAdresse à confirmer\nMontréal, QC\nHoraires à confirmer",
  },
  in_delivery: { recipientName: "Awa Diop", orderNumber: "AE-2026-00042" },
  order_delivered: { recipientName: "Awa Diop", orderNumber: "AE-2026-00042" },
  preorder_confirmation: { recipientName: "Awa Diop" },
  arrival_available: { recipientName: "Awa Diop", productName: "Le thiof frais" },
  back_in_stock: { recipientName: "Awa Diop", productName: "Le café Touba moulu" },
  password_reset: {
    recipientName: "Awa Diop",
    resetLink: "https://atlantiqueexport.com/fr/mot-de-passe",
    expiresIn: "60 minutes",
  },
};

it.skipIf(!OUT)("génère les aperçus", async () => {
  mkdirSync(OUT!, { recursive: true });
  const index: string[] = [];

  for (const [key, data] of Object.entries(samples)) {
    const type = key.replace("_sans_adresse", "") as EmailType;
    for (const locale of ["fr", "en"] as const) {
      const { subject, html } = await generateEmailContent(type, locale, data);
      const file = `${key}.${locale}.html`;
      writeFileSync(`${OUT}/${file}`, html);
      index.push(
        `<li><a href="${file}"><strong>${key}</strong> <span>(${locale})</span></a><em>${subject}</em></li>`,
      );
    }
  }

  writeFileSync(
    `${OUT}/index.html`,
    `<!doctype html><meta charset="utf-8"><title>Aperçus</title>
     <style>body{font:15px/1.6 system-ui;margin:40px;background:#f7efe2;color:#0f2e22}
     h1{font-family:Georgia,serif;color:#0b3a22}
     ul{list-style:none;padding:0;max-width:760px}
     li{background:#fff;border:1px solid #e3d7c4;border-radius:8px;padding:12px 16px;margin-bottom:8px;display:flex;justify-content:space-between;gap:16px}
     a{color:#c2540a;text-decoration:none}em{color:#6b5d50;font-size:13px}</style>
     <h1>Aperçus des courriels</h1><ul>${index.join("")}</ul>`,
  );
});
