import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { orderEvents, orders, type Order, type OrderEvent } from "@/db/schema";

export interface OrderWithEvents {
  order: Order;
  events: OrderEvent[];
}

/**
 * Look up an order by its public tracking code.
 * Codes are matched case-insensitively and tolerate dashes/spaces.
 */
export async function getOrderByTrackingCode(
  rawCode: string,
): Promise<OrderWithEvents | null> {
  const code = normalizeTrackingCode(rawCode);
  if (!code) return null;

  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.trackingCode, code))
    .limit(1);

  if (!order) return null;

  const events = await db
    .select()
    .from(orderEvents)
    .where(eq(orderEvents.orderId, order.id))
    .orderBy(asc(orderEvents.happenedAt));

  return { order, events };
}

export function normalizeTrackingCode(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/[\s_]/g, "-")
    .replace(/[^A-Z0-9-]/g, "");
}
