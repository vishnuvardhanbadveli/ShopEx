import { describe, expect, it } from "vitest";
import { paymentFlowReducer, persistedWebhookAudit } from "./paymentFlow";

describe("client payment flow", () => {
  it("moves a verified payment to the success state", () => {
    expect(paymentFlowReducer("awaiting", { type: "PAYMENT_VERIFIED" })).toBe("verified");
  });

  it("moves a declined payment back to an approval-ready state", () => {
    expect(paymentFlowReducer("idle", { type: "APPROVAL_RECORDED" })).toBe("approved");
    expect(paymentFlowReducer("approved", { type: "CHECKOUT_READY" })).toBe("awaiting");
    expect(paymentFlowReducer("awaiting", { type: "PAYMENT_FAILED" })).toBe("failed");
    expect(paymentFlowReducer("failed", { type: "RETURN_TO_APPROVAL" })).toBe("idle");
  });

  it("models captured, invalid-signature, and persistence-unavailable outcomes", () => {
    expect(paymentFlowReducer("verified", { type: "WEBHOOK_CAPTURED" })).toBe("captured");
    expect(paymentFlowReducer("awaiting", { type: "SIGNATURE_INVALID" })).toBe("invalid_signature");
    expect(paymentFlowReducer("verified", { type: "PERSISTENCE_UNAVAILABLE" })).toBe("persistence_unavailable");
    expect(paymentFlowReducer("invalid_signature", { type: "RETURN_TO_APPROVAL" })).toBe("idle");
    expect(paymentFlowReducer("persistence_unavailable", { type: "RETURN_TO_APPROVAL" })).toBe("idle");
  });

  it("maps persisted webhook events to visible audit entries", () => {
    expect(persistedWebhookAudit("payment.captured")).toEqual({ actor: "razorpay.webhook", action: "WEBHOOK_RECEIVED", result: "payment.captured · persisted", tone: "blue" });
    expect(persistedWebhookAudit("payment.failed").tone).toBe("red");
  });
});
