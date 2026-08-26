import { describe, expect, it } from "vitest";
import { filterAuditEvents, groupCandidates, mapPersistedAuditEvent, readinessLabel } from "./viewModel";

describe("checkout view models", () => {
  it("groups compliant and rejected candidates", () => {
    const groups = groupCandidates([{ result: { pass: true } }, { result: { pass: false } }, { result: { pass: true } }]);
    expect(groups.all).toHaveLength(3);
    expect(groups.compliant).toHaveLength(2);
    expect(groups.rejected).toHaveLength(1);
  });

  it("filters audit events by protocol surface", () => {
    const events = [{ actor: "policy.engine", action: "POLICY_VERIFIED" }, { actor: "razorpay.api", action: "ORDER_CREATED" }, { actor: "razorpay.webhook", action: "WEBHOOK_RECEIVED" }];
    expect(filterAuditEvents(events, "policy")).toHaveLength(1);
    expect(filterAuditEvents(events, "payment")).toHaveLength(1);
    expect(filterAuditEvents(events, "webhook")).toHaveLength(1);
  });

  it("maps structured persisted webhook evidence", () => {
    const mapped = mapPersistedAuditEvent({ eventId: "evt_123", eventType: "payment.failed", orderId: "order_123", createdAt: "2026-08-21T00:00:00.000Z" });
    expect(mapped.detail).toEqual({ eventId: "evt_123", orderId: "order_123", provider: "razorpay", failure: "payment.failed", transition: "order → failed" });
  });

  it("computes safe readiness labels", () => {
    expect(readinessLabel({ razorpayKeyConfigured: true, razorpaySecretConfigured: true, webhookSecretConfigured: false })).toEqual({ keysReady: true, label: "Payment credentials ready", webhookLabel: "pending" });
  });
});
