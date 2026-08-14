// @vitest-environment node
import { mkdirSync, writeFileSync } from "node:fs";
import { it } from "vitest";
import { renderToBuffer } from "@react-pdf/renderer";
import { ReceiptDocument } from "./document";
import type { OrderSummary } from "@/lib/checkout/checkout";

const OUT = process.env.RECEIPT_PREVIEW_DIR;

const commande: OrderSummary = {
  orderNumber: "AE-2026-00042",
  email: "awa.diop@exemple.ca",
  status: "confirmed",
  paymentStatus: "paid",
  method: "local_delivery",
  subtotalCents: 5694,
  deliveryFeeCents: 1299,
  totalCents: 6993,
  placedAt: "2026-08-14T16:00:00Z",
  slot: { date: "2026-08-16", startTime: "09:00", endTime: "13:00" },
  address: {
    fullName: "Awa Diop",
    line1: "1234 rue Sainte-Catherine Est",
    city: "Montréal",
    province: "QC",
    postalCode: "H2X 1Y4",
  },
  items: [
    { name: "Arraw", sku: "AE-SNG-ARR-500G", label: "Sachet 500 g", quantity: 3, unitPriceCents: 999, lineTotalCents: 2997 },
    { name: "Fonio", sku: "AE-SNG-FON-500G", label: "Sachet 500 g", quantity: 3, unitPriceCents: 899, lineTotalCents: 2697 },
  ],
};

it.skipIf(!OUT)("génère les reçus", async () => {
  mkdirSync(OUT!, { recursive: true });
  for (const locale of ["fr", "en"] as const) {
    for (const [nom, taxes] of [["recu", 0], ["facture", 1049]] as const) {
      const buffer = await renderToBuffer(
        <ReceiptDocument order={commande} locale={locale} taxCents={taxes} />,
      );
      writeFileSync(`${OUT}/${nom}.${locale}.pdf`, buffer);
      console.log(`${nom}.${locale}.pdf — ${(buffer.length / 1024).toFixed(0)} Ko`);
    }
  }
});
