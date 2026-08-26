import crypto from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { handleRazorpayWebhook, resetWebhookReplayStateForTests } from "./paymentWebhook";

const { recordPaymentEvent, updatePaymentOrder, getPaymentOrder, createOrderTimelineEvent, createUserNotification, shouldNotifyUser, recordObservabilityEvent } = vi.hoisted(() => ({ recordPaymentEvent: vi.fn(async () => "inserted" as const), updatePaymentOrder: vi.fn(async () => "updated" as const), getPaymentOrder: vi.fn(async () => ({ buyerId: 1 })), createOrderTimelineEvent: vi.fn(async () => "created" as const), createUserNotification: vi.fn(async () => "created" as const), shouldNotifyUser: vi.fn(async () => true), recordObservabilityEvent: vi.fn(async () => "recorded" as const) }));
vi.mock("./db", () => ({ recordPaymentEvent, updatePaymentOrder, getPaymentOrder, createOrderTimelineEvent, createUserNotification, shouldNotifyUser, recordObservabilityEvent }));

function responseMock() {
  return {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) { this.statusCode = code; return this; },
    json(payload: unknown) { this.body = payload; return this; },
  };
}

describe("Razorpay webhook handler", () => {
  beforeEach(() => {
    process.env.RAZORPAY_WEBHOOK_SECRET = "webhook_test_secret";
    process.env.RAZORPAY_KEY_ID = "rzp_test_key";
    process.env.RAZORPAY_KEY_SECRET = "test_key_secret";
    recordPaymentEvent.mockReset();
    updatePaymentOrder.mockReset();
    getPaymentOrder.mockReset();
    createOrderTimelineEvent.mockReset();
    createUserNotification.mockReset();
    shouldNotifyUser.mockReset();
    recordObservabilityEvent.mockReset();
    recordPaymentEvent.mockResolvedValue("inserted");
    updatePaymentOrder.mockResolvedValue("updated");
    getPaymentOrder.mockResolvedValue({ buyerId: 1 });
    createOrderTimelineEvent.mockResolvedValue("created");
    createUserNotification.mockResolvedValue("created");
    shouldNotifyUser.mockResolvedValue(true);
    recordObservabilityEvent.mockResolvedValue("recorded");
    resetWebhookReplayStateForTests();
  });

  it("accepts a valid raw-body signature and de-duplicates an event id", async () => {
    const rawBody = JSON.stringify({ event: "payment.captured" });
    const signature = crypto.createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET!).update(rawBody).digest("hex");
    const req = { body: Buffer.from(rawBody), header: (name: string) => name === "x-razorpay-signature" ? signature : "event_123" } as never;
    const first = responseMock();
    const second = responseMock();

    await handleRazorpayWebhook(req, first as never);
    recordPaymentEvent.mockResolvedValueOnce("duplicate");
    await handleRazorpayWebhook(req, second as never);

    expect(first.statusCode).toBe(200);
    expect(second.body).toEqual({ ok: true, duplicate: true });
  });

  it("persists a payment.failed webhook as a failed order state", async () => {
    const rawBody = JSON.stringify({ event: "payment.failed", payload: { payment: { entity: { order_id: "order_test_123" } } } });
    const signature = crypto.createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET!).update(rawBody).digest("hex");
    const req = { body: Buffer.from(rawBody), header: (name: string) => name === "x-razorpay-signature" ? signature : "event_failed" } as never;
    const response = responseMock();

    await handleRazorpayWebhook(req, response as never);

    expect(response.statusCode).toBe(200);
    expect(updatePaymentOrder).toHaveBeenCalledWith("order_test_123", "failed");
  });

  it("rejects a tampered body", async () => {
    const req = { body: Buffer.from('{"event":"payment.captured"}'), header: (name: string) => name === "x-razorpay-signature" ? "bad" : "event_bad" } as never;
    const response = responseMock();
    await handleRazorpayWebhook(req, response as never);
    expect(response.statusCode).toBe(401);
  });
});
