import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

vi.mock("./db", () => ({
  createPaymentOrder: vi.fn(),
  getCatalogProductBySku: vi.fn(),
  getPaymentOrder: vi.fn(),
  listRecentPaymentEvents: vi.fn(),
  listOrderTimelineForBuyer: vi.fn(),
  listCatalogProductsAdmin: vi.fn(),
  getSavedAddressForUser: vi.fn(),
  createOrderTimelineEvent: vi.fn(async () => "created"),
  createUserNotification: vi.fn(async () => "created"),
  shouldNotifyUser: vi.fn(async () => false),
  recordObservabilityEvent: vi.fn(async () => "recorded"),
  getObservabilitySummary: vi.fn(),
  upsertCatalogProductByAdmin: vi.fn(),
  updatePaymentOrder: vi.fn(),
}));
vi.mock("./razorpay", () => ({
  createRazorpayOrder: vi.fn(),
  getRazorpayPublicKey: vi.fn(() => "rzp_test_public"),
  verifyPaymentSignature: vi.fn(),
}));

import { appRouter } from "./routers";
import { createPaymentOrder, getCatalogProductBySku, recordObservabilityEvent } from "./db";
import { createRazorpayOrder } from "./razorpay";

const mockedCreatePaymentOrder = vi.mocked(createPaymentOrder);
const mockedGetCatalogProductBySku = vi.mocked(getCatalogProductBySku);
const mockedCreateRazorpayOrder = vi.mocked(createRazorpayOrder);
const context = { user: { id: 24, openId: "buyer-24", name: "Buyer", email: "buyer@example.com", loginMethod: "test", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: { protocol: "https", headers: {} }, res: {} } as TrpcContext;
const keyboard = { sku: "KBD-MX-MINI", name: "Keychron K3 Pro", category: "keyboard" as const, price: 8499, stock: 12, delivery: "3–4 days", deliveryDays: 4, attributes: ["wireless", "mechanical"], description: "Keyboard", accent: "violet" as const, imageUrl: "/image.png", updatedAt: new Date() };
const intent = { product: "Wireless mechanical keyboard", category: "keyboard" as const, budget: 10_000, connectivity: "Wireless", purpose: "Programming", deliveryDays: 5, attributes: ["wireless", "mechanical"] };

describe("catalog-backed order creation", () => {
  beforeEach(() => {
    mockedCreatePaymentOrder.mockReset();
    mockedGetCatalogProductBySku.mockReset();
    mockedCreateRazorpayOrder.mockReset();
    vi.mocked(recordObservabilityEvent).mockReset();
    vi.mocked(recordObservabilityEvent).mockResolvedValue("recorded");
    mockedCreatePaymentOrder.mockResolvedValue("inserted");
    mockedCreateRazorpayOrder.mockResolvedValue({ id: "order_live_123", amount: 849900, currency: "INR", receipt: "shopex_123" });
  });

  it("uses the current database price and persists only an available selected SKU", async () => {
    mockedGetCatalogProductBySku.mockResolvedValue(keyboard);
    const result = await appRouter.createCaller(context).payment.createOrder({ amount: 849900, receipt: "shopex_123", sku: keyboard.sku, includeUpsell: false, intent });
    expect(result.order.id).toBe("order_live_123");
    expect(mockedCreateRazorpayOrder).toHaveBeenCalledWith(expect.objectContaining({ amount: 849900, notes: expect.objectContaining({ sku: keyboard.sku }) }));
    expect(mockedCreatePaymentOrder).toHaveBeenCalledWith(expect.objectContaining({ buyerId: 24, sku: keyboard.sku, amount: 849900, status: "created", productSnapshot: JSON.stringify(keyboard), intentSnapshot: JSON.stringify(intent) }));
  });

  it("rejects an unavailable selected SKU before calling Razorpay", async () => {
    mockedGetCatalogProductBySku.mockResolvedValue({ ...keyboard, stock: 0 });
    await expect(appRouter.createCaller(context).payment.createOrder({ amount: 849900, receipt: "shopex_123", sku: keyboard.sku, includeUpsell: false, intent })).rejects.toMatchObject({ code: "CONFLICT" });
    expect(mockedCreateRazorpayOrder).not.toHaveBeenCalled();
  });

  it("rejects a client-provided total that differs from the current catalog price", async () => {
    mockedGetCatalogProductBySku.mockResolvedValue(keyboard);
    await expect(appRouter.createCaller(context).payment.createOrder({ amount: 1_000_000, receipt: "shopex_123", sku: keyboard.sku, includeUpsell: false, intent })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(mockedCreateRazorpayOrder).not.toHaveBeenCalled();
  });

  it("rejects a selected product that no longer satisfies the server-evaluated budget", async () => {
    mockedGetCatalogProductBySku.mockResolvedValue(keyboard);
    await expect(appRouter.createCaller(context).payment.createOrder({ amount: 849900, receipt: "shopex_123", sku: keyboard.sku, includeUpsell: false, intent: { ...intent, budget: 8000 } })).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    expect(mockedCreateRazorpayOrder).not.toHaveBeenCalled();
  });

  it("surfaces a real Razorpay order-creation failure without creating a success state", async () => {
    mockedGetCatalogProductBySku.mockResolvedValue(keyboard);
    mockedCreateRazorpayOrder.mockRejectedValue(new Error("Razorpay order API unavailable"));
    await expect(appRouter.createCaller(context).payment.createOrder({ amount: 849900, receipt: "shopex_123", sku: keyboard.sku, includeUpsell: false, intent })).rejects.toMatchObject({ code: "BAD_REQUEST", message: "Razorpay order API unavailable" });
    expect(mockedCreatePaymentOrder).not.toHaveBeenCalled();
  });
});
