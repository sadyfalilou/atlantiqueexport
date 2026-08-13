import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Lectures de l'administration.
 *
 * Toutes passent par la clé de service, et ne doivent donc être appelées
 * qu'après vérification du rôle — ce dont se charge le layout `(protege)`.
 */

type Row = Record<string, unknown>;

export interface AdminOrder {
  id: string;
  orderNumber: string;
  email: string;
  phone: string | null;
  status: string;
  paymentStatus: string;
  method: string;
  subtotalCents: number;
  deliveryFeeCents: number;
  totalCents: number;
  placedAt: string;
  notes: string | null;
  address: Record<string, string> | null;
  slot: { date: string; startTime: string; endTime: string } | null;
  zoneName: string | null;
  items: Array<{
    name: string;
    sku: string;
    label: string;
    quantity: number;
    unitPriceCents: number;
    lineTotalCents: number;
  }>;
}

const ORDER_SELECT = `
  id, order_number, email, phone, status, payment_status, fulfillment_method,
  subtotal_cents, delivery_fee_cents, total_cents, placed_at, delivery_notes,
  delivery_address,
  slot:delivery_slots(slot_date, start_time, end_time),
  zone:delivery_zones(name),
  items:order_items(product_name_snapshot, sku_snapshot, unit_label_snapshot,
                    quantity, unit_price_cents, line_total_cents)
`;

function toOrder(row: Row): AdminOrder {
  const slot = row.slot as Row | null;
  const zone = row.zone as Row | null;

  return {
    id: row.id as string,
    orderNumber: row.order_number as string,
    email: row.email as string,
    phone: (row.phone as string | null) ?? null,
    status: row.status as string,
    paymentStatus: row.payment_status as string,
    method: row.fulfillment_method as string,
    subtotalCents: row.subtotal_cents as number,
    deliveryFeeCents: row.delivery_fee_cents as number,
    totalCents: row.total_cents as number,
    placedAt: row.placed_at as string,
    notes: (row.delivery_notes as string | null) ?? null,
    address: (row.delivery_address as Record<string, string> | null) ?? null,
    slot: slot
      ? {
          date: slot.slot_date as string,
          startTime: String(slot.start_time).slice(0, 5),
          endTime: String(slot.end_time).slice(0, 5),
        }
      : null,
    zoneName: (zone?.name as string | undefined) ?? null,
    items: ((row.items as Row[] | null) ?? []).map((item) => ({
      name: item.product_name_snapshot as string,
      sku: item.sku_snapshot as string,
      label: item.unit_label_snapshot as string,
      quantity: item.quantity as number,
      unitPriceCents: item.unit_price_cents as number,
      lineTotalCents: item.line_total_cents as number,
    })),
  };
}

export async function getOrders(filter?: {
  status?: string;
  paymentStatus?: string;
}): Promise<AdminOrder[]> {
  const supabase = createAdminClient();
  let request = supabase.from("orders").select(ORDER_SELECT);

  if (filter?.status) request = request.eq("status", filter.status);
  if (filter?.paymentStatus) request = request.eq("payment_status", filter.paymentStatus);

  const { data } = await request.order("placed_at", { ascending: false }).limit(200);
  return ((data ?? []) as Row[]).map(toOrder);
}

export async function getOrderByNumber(orderNumber: string): Promise<AdminOrder | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("orders")
    .select(ORDER_SELECT)
    .eq("order_number", orderNumber)
    .limit(1);

  const row = ((data ?? []) as Row[])[0];
  return row ? toOrder(row) : null;
}

export interface DashboardFigures {
  pendingPayment: number;
  toPrepare: number;
  todayPickups: number;
  todayDeliveries: number;
  paidRevenueCents: number;
  lowStock: Array<{ sku: string; name: string; available: number; threshold: number }>;
}

export async function getDashboard(): Promise<DashboardFigures> {
  const supabase = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);

  const [pending, toPrepare, slotsToday, paid, stock] = await Promise.all([
    supabase.from("orders").select("id").eq("payment_status", "pending"),
    supabase.from("orders").select("id").in("status", ["confirmed", "preparing"]),
    supabase
      .from("orders")
      .select("id, fulfillment_method, slot:delivery_slots!inner(slot_date)")
      .eq("delivery_slots.slot_date", today),
    supabase.from("orders").select("total_cents").eq("payment_status", "paid"),
    supabase
      .from("stock_levels")
      .select(
        "quantity_available, low_stock_threshold, variant:product_variants(sku, product:products(name_fr))",
      )
      .order("quantity_available")
      .limit(200),
  ]);

  const todayRows = (slotsToday.data ?? []) as Row[];

  const lowStock = ((stock.data ?? []) as Row[])
    .filter(
      (row) =>
        (row.quantity_available as number) <= (row.low_stock_threshold as number),
    )
    .slice(0, 10)
    .map((row) => {
      const variant = row.variant as Row | null;
      const product = variant?.product as Row | null;
      return {
        sku: (variant?.sku as string) ?? "",
        name: (product?.name_fr as string) ?? "",
        available: row.quantity_available as number,
        threshold: row.low_stock_threshold as number,
      };
    });

  return {
    pendingPayment: (pending.data ?? []).length,
    toPrepare: (toPrepare.data ?? []).length,
    todayPickups: todayRows.filter((r) => r.fulfillment_method === "pickup").length,
    todayDeliveries: todayRows.filter((r) => r.fulfillment_method === "local_delivery")
      .length,
    paidRevenueCents: ((paid.data ?? []) as Row[]).reduce(
      (total, row) => total + ((row.total_cents as number) ?? 0),
      0,
    ),
    lowStock,
  };
}
