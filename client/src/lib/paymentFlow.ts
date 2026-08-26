export type PaymentFlowStatus = "idle" | "approved" | "awaiting" | "verified" | "captured" | "failed" | "invalid_signature" | "persistence_unavailable";
export type PaymentFlowEvent =
  | { type: "APPROVAL_RECORDED" }
  | { type: "CHECKOUT_READY" }
  | { type: "PAYMENT_VERIFIED" }
  | { type: "PAYMENT_FAILED" }
  | { type: "SIGNATURE_INVALID" }
  | { type: "WEBHOOK_CAPTURED" }
  | { type: "PERSISTENCE_UNAVAILABLE" }
  | { type: "RETURN_TO_APPROVAL" };

export function paymentFlowReducer(state: PaymentFlowStatus, event: PaymentFlowEvent): PaymentFlowStatus {
  switch (event.type) {
    case "APPROVAL_RECORDED": return state === "idle" ? "approved" : state;
    case "CHECKOUT_READY": return state === "approved" ? "awaiting" : state;
    case "PAYMENT_VERIFIED": return state === "awaiting" || state === "approved" ? "verified" : state;
    case "PAYMENT_FAILED": return state === "approved" || state === "awaiting" ? "failed" : state;
    case "SIGNATURE_INVALID": return state === "awaiting" || state === "approved" ? "invalid_signature" : state;
    case "WEBHOOK_CAPTURED": return state === "verified" ? "captured" : state;
    case "PERSISTENCE_UNAVAILABLE": return state === "awaiting" || state === "verified" ? "persistence_unavailable" : state;
    case "RETURN_TO_APPROVAL": return ["failed", "invalid_signature", "persistence_unavailable"].includes(state) ? "idle" : state;
    default: return state;
  }
}

export function persistedWebhookAudit(eventType: string) {
  return {
    actor: "razorpay.webhook",
    action: "WEBHOOK_RECEIVED",
    result: `${eventType} · persisted`,
    tone: eventType === "payment.failed" ? "red" as const : "blue" as const,
  };
}
