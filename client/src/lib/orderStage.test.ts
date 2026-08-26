import { describe, expect, it } from "vitest";
import { orderProgress } from "./orderStage";

describe("orderProgress", () => {
  it("maps persisted statuses to truthful current stages", () => {
    expect(orderProgress("created")).toMatchObject({ current: 1, label: "Order created", tone: "blue" });
    expect(orderProgress("verification_pending")).toMatchObject({ current: 2, label: "Payment submitted", tone: "amber" });
    expect(orderProgress("verified")).toMatchObject({ current: 3, label: "Payment verified", tone: "violet" });
    expect(orderProgress("captured")).toMatchObject({ current: 4, label: "Order confirmed", tone: "green" });
  });

  it("keeps failed payment visibly at the payment stage", () => {
    expect(orderProgress("failed")).toMatchObject({ current: 2, label: "Payment failed", tone: "red" });
  });
});
