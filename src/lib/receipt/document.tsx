import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { OrderSummary } from "@/lib/checkout/checkout";
import type { Locale } from "@/lib/types";

/**
 * Reçu de commande, en PDF.
 *
 * **Ce document ne s'intitule « Facture » que si une taxe y figure.** Au
 * Québec, une facture émise par une entreprise inscrite doit porter ses
 * numéros de TPS et de TVQ ainsi que les montants perçus. Tant que le calcul
 * des taxes est reporté et que ces numéros ne sont pas connus, intituler ce
 * document « Facture » induirait en erreur un client qui voudrait le passer en
 * dépense. Il s'appelle donc « Reçu », et le titre bascule de lui-même le jour
 * où les montants de taxe cessent d'être nuls.
 *
 * Les polices intégrées de PDF — Helvetica — couvrent les accents français
 * sans qu'aucun fichier ait à être embarqué.
 */

const C = {
  ink: "#0f2e22",
  forest: "#145130",
  muted: "#6b5d50",
  line: "#e3d7c4",
  panel: "#fdf8f0",
};

const styles = StyleSheet.create({
  page: { padding: 44, fontSize: 10, color: C.ink, fontFamily: "Helvetica" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  brand: { fontSize: 18, fontFamily: "Helvetica-Bold", color: C.forest },
  tagline: { fontSize: 8, color: C.muted, marginTop: 3 },
  docType: { fontSize: 16, fontFamily: "Helvetica-Bold", textAlign: "right" },
  docMeta: { fontSize: 9, color: C.muted, textAlign: "right", marginTop: 3 },
  rule: { borderBottomWidth: 1, borderBottomColor: C.line, marginVertical: 18 },
  columns: { flexDirection: "row", gap: 28 },
  column: { flex: 1 },
  label: { fontSize: 8, color: C.muted, textTransform: "uppercase", letterSpacing: 0.6 },
  value: { fontSize: 10, marginTop: 3 },
  sectionTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", color: C.forest, marginBottom: 8 },
  tableHead: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: C.ink,
    paddingBottom: 5,
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: C.line,
    paddingVertical: 7,
  },
  cDesc: { flex: 1 },
  cQty: { width: 42, textAlign: "right" },
  cUnit: { width: 72, textAlign: "right" },
  cTotal: { width: 76, textAlign: "right" },
  headText: { fontSize: 8, color: C.muted, textTransform: "uppercase", letterSpacing: 0.6 },
  totals: { marginTop: 14, marginLeft: "auto", width: 232 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  grandRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: C.ink,
    marginTop: 6,
    paddingTop: 7,
  },
  grand: { fontSize: 13, fontFamily: "Helvetica-Bold", color: C.forest },
  note: {
    marginTop: 18,
    padding: 11,
    backgroundColor: C.panel,
    borderLeftWidth: 2,
    borderLeftColor: C.line,
    fontSize: 8.5,
    color: C.muted,
    lineHeight: 1.5,
  },
  footer: {
    position: "absolute",
    bottom: 34,
    left: 44,
    right: 44,
    fontSize: 8,
    color: C.muted,
    textAlign: "center",
  },
});

function money(cents: number, locale: Locale) {
  return new Intl.NumberFormat(locale === "en" ? "en-CA" : "fr-CA", {
    style: "currency",
    currency: "CAD",
  }).format(cents / 100);
}

export function ReceiptDocument({
  order,
  locale,
  taxCents = 0,
}: {
  order: OrderSummary;
  locale: Locale;
  /** Somme des taxes. Tant qu'elle vaut zéro, le document reste un reçu. */
  taxCents?: number;
}) {
  const fr = locale === "fr";
  const isInvoice = taxCents > 0;

  const t = fr
    ? {
        type: isInvoice ? "FACTURE" : "REÇU",
        number: "Commande",
        date: "Date",
        billedTo: "Client",
        method: "Mode de réception",
        payment: "Paiement",
        interac: "Virement Interac",
        paid: "Encaissé",
        unpaid: "En attente de paiement",
        items: "Détail",
        desc: "Produit",
        qty: "Qté",
        unit: "Prix unitaire",
        lineTotal: "Total",
        subtotal: "Sous-total",
        delivery: "Livraison",
        tax: "Taxes",
        total: "Total",
        free: "Offerts",
        methods: {
          pickup: "Ramassage",
          local_delivery: "Livraison locale",
          shipping: "Expédition",
        } as Record<string, string>,
        noTax:
          "Aucune taxe n'est appliquée sur cette commande. Ce document est un reçu, non une facture au sens fiscal : il ne peut pas servir à réclamer un crédit de taxe sur intrants.",
        footer: "Atlantique Export · Montréal, Québec · info@atlantiqueexport.com",
      }
    : {
        type: isInvoice ? "INVOICE" : "RECEIPT",
        number: "Order",
        date: "Date",
        billedTo: "Customer",
        method: "Fulfillment",
        payment: "Payment",
        interac: "Interac e-Transfer",
        paid: "Received",
        unpaid: "Awaiting payment",
        items: "Details",
        desc: "Product",
        qty: "Qty",
        unit: "Unit price",
        lineTotal: "Total",
        subtotal: "Subtotal",
        delivery: "Delivery",
        tax: "Taxes",
        total: "Total",
        free: "Free",
        methods: {
          pickup: "Pickup",
          local_delivery: "Local delivery",
          shipping: "Shipping",
        } as Record<string, string>,
        noTax:
          "No tax is applied to this order. This document is a receipt, not a tax invoice: it cannot be used to claim an input tax credit.",
        footer: "Atlantique Export · Montréal, Quebec · info@atlantiqueexport.com",
      };

  const placed = order.placedAt
    ? new Date(order.placedAt).toLocaleDateString(fr ? "fr-CA" : "en-CA", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "—";

  return (
    <Document
      title={`${t.type} ${order.orderNumber}`}
      author="Atlantique Export"
      language={locale}
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>ATLANTIQUE EXPORT</Text>
            <Text style={styles.tagline}>
              {fr
                ? "Des goûts qui voyagent, une hospitalité qui reste"
                : "Tastes that travel, hospitality that stays"}
            </Text>
          </View>
          <View>
            <Text style={styles.docType}>{t.type}</Text>
            <Text style={styles.docMeta}>
              {t.number} {order.orderNumber}
            </Text>
            <Text style={styles.docMeta}>
              {t.date} : {placed}
            </Text>
          </View>
        </View>

        <View style={styles.rule} />

        <View style={styles.columns}>
          <View style={styles.column}>
            <Text style={styles.label}>{t.billedTo}</Text>
            <Text style={styles.value}>{order.address?.fullName ?? order.email}</Text>
            <Text style={styles.value}>{order.email}</Text>
            {order.address ? (
              <>
                <Text style={styles.value}>{order.address.line1}</Text>
                {order.address.line2 ? (
                  <Text style={styles.value}>{order.address.line2}</Text>
                ) : null}
                <Text style={styles.value}>
                  {order.address.city}, {order.address.province ?? "QC"}{" "}
                  {order.address.postalCode}
                </Text>
              </>
            ) : null}
          </View>

          <View style={styles.column}>
            <Text style={styles.label}>{t.method}</Text>
            <Text style={styles.value}>{t.methods[order.method] ?? order.method}</Text>
            {order.slot ? (
              <Text style={styles.value}>
                {order.slot.date} · {order.slot.startTime} – {order.slot.endTime}
              </Text>
            ) : null}

            <Text style={[styles.label, { marginTop: 12 }]}>{t.payment}</Text>
            <Text style={styles.value}>{t.interac}</Text>
            <Text style={styles.value}>
              {order.paymentStatus === "paid" ? t.paid : t.unpaid}
            </Text>
          </View>
        </View>

        <View style={styles.rule} />

        <Text style={styles.sectionTitle}>{t.items}</Text>

        <View style={styles.tableHead}>
          <Text style={[styles.cDesc, styles.headText]}>{t.desc}</Text>
          <Text style={[styles.cQty, styles.headText]}>{t.qty}</Text>
          <Text style={[styles.cUnit, styles.headText]}>{t.unit}</Text>
          <Text style={[styles.cTotal, styles.headText]}>{t.lineTotal}</Text>
        </View>

        {order.items.map((item, index) => (
          <View key={index} style={styles.row}>
            <Text style={styles.cDesc}>
              {item.name}
              {item.label ? ` — ${item.label}` : ""}
            </Text>
            <Text style={styles.cQty}>{item.quantity}</Text>
            <Text style={styles.cUnit}>{money(item.unitPriceCents, locale)}</Text>
            <Text style={styles.cTotal}>{money(item.lineTotalCents, locale)}</Text>
          </View>
        ))}

        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text>{t.subtotal}</Text>
            <Text>{money(order.subtotalCents, locale)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text>{t.delivery}</Text>
            <Text>
              {order.deliveryFeeCents === 0
                ? t.free
                : money(order.deliveryFeeCents, locale)}
            </Text>
          </View>
          {isInvoice ? (
            <View style={styles.totalRow}>
              <Text>{t.tax}</Text>
              <Text>{money(taxCents, locale)}</Text>
            </View>
          ) : null}
          <View style={styles.grandRow}>
            <Text style={styles.grand}>{t.total}</Text>
            <Text style={styles.grand}>{money(order.totalCents, locale)}</Text>
          </View>
        </View>

        {!isInvoice ? <Text style={styles.note}>{t.noTax}</Text> : null}

        <Text style={styles.footer} fixed>
          {t.footer}
        </Text>
      </Page>
    </Document>
  );
}
