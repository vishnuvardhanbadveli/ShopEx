import type { PersistedOrder } from "./shopEx";

export function profileStatus(status: PersistedOrder["status"]) {
  if (status === "captured") return { label: "Payment confirmed", tone: "success" as const };
  if (status === "failed") return { label: "Payment failed", tone: "danger" as const };
  if (status === "verified") return { label: "Waiting for confirmation", tone: "warning" as const };
  return { label: "Payment processing", tone: "warning" as const };
}

export function orderStatusCounts(orders: PersistedOrder[]) {
  return orders.reduce((counts, order) => {
    counts[order.status] += 1;
    return counts;
  }, { created: 0, verification_pending: 0, verified: 0, failed: 0, captured: 0 });
}
