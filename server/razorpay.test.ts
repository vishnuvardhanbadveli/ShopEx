import crypto from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createRazorpayOrder, verifyPaymentSignature, verifyWebhookSignatureWithSecret } from "./razorpay";

describe("Razorpay verification helpers", () => {
  beforeEach(() => {
    process.env.RAZORPAY_KEY_ID = "rzp_test_key";
    process.env.RAZORPAY_KEY_SECRET = "test_key_secret";
    process.env.RAZORPAY_WEBHOOK_SECRET = "webhook_test_secret";
  });

  afterEach(() => {
    process.env.RAZORPAY_KEY_ID = "rzp_test_key";
    process.env.RAZORPAY_KEY_SECRET = "test_key_secret";
    process.env.RAZORPAY_WEBHOOK_SECRET = "webhook_test_secret";
  });

  it("accepts a valid payment signature and rejects a tampered one", () => {
    const orderId = "order_test_123";
    const paymentId = "pay_test_123";
    const signature = crypto.createHmac("sha256", "test_key_secret").update(`${orderId}|${paymentId}`).digest("hex");

    expect(verifyPaymentSignature({ orderId, paymentId, signature })).toBe(true);
    expect(verifyPaymentSignature({ orderId, paymentId, signature: `${signature.slice(0, -1)}0` })).toBe(false);
  });

  it("accepts a webhook signature generated from the exact raw body", () => {
    const rawBody = JSON.stringify({ event: "payment.captured", payload: { payment: { entity: { id: "pay_test_123" } } } });
    const secret = "test_webhook_secret";
    const signature = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");

    expect(verifyWebhookSignatureWithSecret(rawBody, signature, secret)).toBe(true);
    expect(verifyWebhookSignatureWithSecret(`${rawBody} `, signature, secret)).toBe(false);
  });

  it("surfaces a Razorpay order-creation API failure", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => new Response(JSON.stringify({ error: { description: "Test API unavailable" } }), { status: 503 })) as typeof fetch;
    await expect(createRazorpayOrder({ amount: 849900, receipt: "trace_failure", notes: { sku: "KBD-MX-MINI" } })).rejects.toThrow("Test API unavailable");
    globalThis.fetch = originalFetch;
  });

  it("fails closed when payment credentials are missing", () => {
    const original = process.env.RAZORPAY_KEY_SECRET;
    delete process.env.RAZORPAY_KEY_SECRET;
    expect(() => verifyPaymentSignature({ orderId: "order_test", paymentId: "pay_test", signature: "0".repeat(64) })).toThrow(/credentials are not configured/);
    process.env.RAZORPAY_KEY_SECRET = original;
  });
});

