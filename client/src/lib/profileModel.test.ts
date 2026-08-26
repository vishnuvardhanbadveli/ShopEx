import { describe, expect, it } from "vitest";
import { orderStatusCounts, profileStatus } from "./profileModel";
import type { PersistedOrder } from "./shopEx";

const order = (status: PersistedOrder["status"]): PersistedOrder => ({ orderId: `order_${status}`, amount: 49900, status, paymentId: null, createdAt: new Date(), updatedAt: new Date(), product: null, upsell: null, intent: null });

describe("customer profile order model", () => {
  it("labels persisted payment states without inferring success", () => {
    expect(profileStatus("captured")).toEqual({ label: "Payment confirmed", tone: "success" });
    expect(profileStatus("verified")).toEqual({ label: "Waiting for confirmation", tone: "warning" });
    expect(profileStatus("failed")).toEqual({ label: "Payment failed", tone: "danger" });
  });

  it("counts the current user's persisted orders by their real lifecycle status", () => {
    expect(orderStatusCounts([order("captured"), order("captured"), order("verified"), order("failed")])).toEqual({ created: 0, verification_pending: 0, verified: 1, failed: 1, captured: 2 });
  });
});
