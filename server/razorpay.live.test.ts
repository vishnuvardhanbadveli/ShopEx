import { describe, expect, it } from "vitest";
import { createRazorpayOrder } from "./razorpay";

describe("Razorpay live Test Mode credential validation", () => {
  const liveCheckEnabled = process.env.RUN_RAZORPAY_LIVE_CHECK === "true";

  it.skipIf(!liveCheckEnabled)("creates a lightweight Test Mode order with the supplied paired credentials", async () => {
    expect(process.env.RAZORPAY_KEY_ID).toMatch(/^rzp_test_/);
    expect(process.env.RAZORPAY_KEY_SECRET).toBeTruthy();
    const order = await createRazorpayOrder({ amount: 100, receipt: `trace_live_${Date.now()}`, notes: { purpose: "credential-validation" } });
    expect(order.id).toMatch(/^order_/);
    expect(order.amount).toBe(100);
    expect(order.currency).toBe("INR");
  }, 15_000);
});
