import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

vi.mock("./db", () => ({
  createPaymentOrder: vi.fn(),
  getCatalogProductBySku: vi.fn(),
  getPaymentOrderForBuyer: vi.fn(),
  listPaymentEventsForOrder: vi.fn(),
  listPaymentOrdersForBuyer: vi.fn(),
  listRecentPaymentEvents: vi.fn(),
  mapPaymentOrderForBuyer: vi.fn(),
  updatePaymentOrder: vi.fn(),
}));
vi.mock("./razorpay", () => ({
  createRazorpayOrder: vi.fn(),
  getRazorpayPublicKey: vi.fn(() => "rzp_test_public"),
  verifyPaymentSignature: vi.fn(),
}));

import { appRouter } from "./routers";
import { getPaymentOrderForBuyer, listPaymentEventsForOrder, listPaymentOrdersForBuyer, mapPaymentOrderForBuyer, updatePaymentOrder } from "./db";
import { verifyPaymentSignature } from "./razorpay";

const mockedGetPaymentOrderForBuyer = vi.mocked(getPaymentOrderForBuyer);
const mockedListPaymentOrdersForBuyer = vi.mocked(listPaymentOrdersForBuyer);
const mockedMapPaymentOrderForBuyer = vi.mocked(mapPaymentOrderForBuyer);
const mockedListPaymentEventsForOrder = vi.mocked(listPaymentEventsForOrder);
const mockedUpdatePaymentOrder = vi.mocked(updatePaymentOrder);
const mockedVerifyPaymentSignature = vi.mocked(verifyPaymentSignature);
const user = { id: 31, openId: "buyer-31", name: "Buyer", email: "buyer@example.com", loginMethod: "test", role: "user" as const, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() };
const context = { user, req: { protocol: "https", headers: {} }, res: {} } as TrpcContext;
const rawOrder = { id: 1, orderId: "order_123", buyerId: 31, sku: "KBD-MX-MINI", upsellSku: null, amount: 849900, status: "created" as const, paymentId: null, productSnapshot: "{}", upsellSnapshot: null, intentSnapshot: "{}", createdAt: new Date(), updatedAt: new Date() };
const viewOrder = { orderId: "order_123", amount: 849900, status: "created" as const, paymentId: null, createdAt: new Date(), updatedAt: new Date(), product: { sku: "KBD-MX-MINI" }, upsell: null, intent: {} };

describe("buyer-owned persisted payment lifecycle", () => {
  beforeEach(() => {
    mockedGetPaymentOrderForBuyer.mockReset();
    mockedListPaymentOrdersForBuyer.mockReset();
    mockedMapPaymentOrderForBuyer.mockReset();
    mockedListPaymentEventsForOrder.mockReset();
    mockedUpdatePaymentOrder.mockReset();
    mockedVerifyPaymentSignature.mockReset();
    mockedMapPaymentOrderForBuyer.mockReturnValue(viewOrder as never);
    mockedUpdatePaymentOrder.mockResolvedValue("updated");
  });

  it("uses the authenticated buyer ID when retrieving a specific order", async () => {
    mockedGetPaymentOrderForBuyer.mockResolvedValue(rawOrder as never);
    await expect(appRouter.createCaller(context).payment.orderStatus({ orderId: "order_123" })).resolves.toEqual({ available: true, order: viewOrder });
    expect(mockedGetPaymentOrderForBuyer).toHaveBeenCalledWith("order_123", 31);
  });

  it("returns only the current buyer's mapped durable order records", async () => {
    mockedListPaymentOrdersForBuyer.mockResolvedValue([rawOrder] as never);
    await expect(appRouter.createCaller(context).payment.myOrders({ limit: 25 })).resolves.toEqual([viewOrder]);
    expect(mockedListPaymentOrdersForBuyer).toHaveBeenCalledWith(31, 25);
  });

  it("allows checkout resume only while a buyer-owned order remains created", async () => {
    mockedGetPaymentOrderForBuyer.mockResolvedValueOnce(rawOrder as never).mockResolvedValueOnce({ ...rawOrder, status: "verified" } as never);
    await expect(appRouter.createCaller(context).payment.resumeOrder({ orderId: "order_123" })).resolves.toEqual({ keyId: "rzp_test_public", order: { id: "order_123", amount: 849900, currency: "INR" } });
    await expect(appRouter.createCaller(context).payment.resumeOrder({ orderId: "order_123" })).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("does not turn an absent or non-owned order into a buyer result", async () => {
    mockedGetPaymentOrderForBuyer.mockResolvedValue(null);
    await expect(appRouter.createCaller(context).payment.orderStatus({ orderId: "order_other" })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("limits webhook evidence to an owned order", async () => {
    mockedGetPaymentOrderForBuyer.mockResolvedValue(rawOrder as never);
    mockedListPaymentEventsForOrder.mockResolvedValue([{ eventId: "evt_1", eventType: "payment.captured", orderId: "order_123", createdAt: new Date() }] as never);
    await expect(appRouter.createCaller(context).payment.orderEvents({ orderId: "order_123", limit: 10 })).resolves.toHaveLength(1);
    expect(mockedListPaymentEventsForOrder).toHaveBeenCalledWith("order_123", 10);
  });

  it("persists a failed verification for the authenticated order and never asserts payment success", async () => {
    mockedGetPaymentOrderForBuyer.mockResolvedValue(rawOrder as never);
    mockedVerifyPaymentSignature.mockReturnValue(false);
    await expect(appRouter.createCaller(context).payment.verifyPayment({ orderId: "order_123", paymentId: "pay_123", signature: "0".repeat(64) })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(mockedUpdatePaymentOrder).toHaveBeenCalledWith("order_123", "failed", "pay_123");
  });
});
