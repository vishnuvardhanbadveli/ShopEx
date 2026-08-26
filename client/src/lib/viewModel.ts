export function groupCandidates<T extends { result: { pass: boolean } }>(items: T[]) {
  return {
    all: items,
    compliant: items.filter((item) => item.result.pass),
    rejected: items.filter((item) => !item.result.pass),
  };
}

export function filterAuditEvents<T extends { actor: string; action: string }>(items: T[], filter: "all" | "policy" | "payment" | "webhook") {
  return items.filter((event) => filter === "all" || (filter === "policy" && (event.actor.includes("policy") || event.action.includes("POLICY"))) || (filter === "payment" && !event.action.includes("WEBHOOK") && (event.actor.includes("razorpay") || event.action.includes("PAYMENT") || event.action.includes("ORDER"))) || (filter === "webhook" && event.action.includes("WEBHOOK")));
}

export function mapPersistedAuditEvent(event: { eventId: string; eventType: string; orderId: string | null; createdAt: Date | string }) {
  const isFailure = event.eventType === "payment.failed";
  return {
    time: new Date(event.createdAt).toLocaleTimeString("en-IN", { hour12: false }),
    actor: "razorpay.webhook",
    action: "WEBHOOK_RECEIVED",
    result: `${event.eventType} · persisted`,
    tone: isFailure ? "red" as const : "blue" as const,
    detail: { eventId: event.eventId, orderId: event.orderId ?? "—", provider: "razorpay", failure: isFailure ? "payment.failed" : "none", transition: isFailure ? "order → failed" : "event → persisted" },
  };
}

export function readinessLabel(status: { razorpayKeyConfigured: boolean; razorpaySecretConfigured: boolean; webhookSecretConfigured: boolean }) {
  const keysReady = status.razorpayKeyConfigured && status.razorpaySecretConfigured;
  return { keysReady, label: keysReady ? "Payment credentials ready" : "Payment credentials pending", webhookLabel: status.webhookSecretConfigured ? "configured" : "pending" };
}
