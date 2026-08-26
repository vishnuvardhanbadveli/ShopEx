import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";

describe("payment procedures", () => {
  it("requires authenticated merchant context for operational controls", async () => {
    const unauthenticated = appRouter.createCaller({ req: {} as never, res: {} as never, user: undefined });
    await expect(unauthenticated.payment.merchantConsole()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(unauthenticated.payment.recentEvents({ limit: 5 })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(unauthenticated.payment.orderStatus({ orderId: "order_test" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    const authenticated = appRouter.createCaller({ req: {} as never, res: {} as never, user: { id: 42, openId: "merchant", name: "Merchant", email: "merchant@example.com", loginMethod: "test", role: "admin", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() } });
    const consoleState = await authenticated.payment.merchantConsole();
    expect(consoleState.controls).toEqual({ catalog: true, paymentOrders: true, auditTrail: true });
    const buyer = appRouter.createCaller({ req: {} as never, res: {} as never, user: { id: 7, openId: "buyer", name: "Buyer", email: "buyer@example.com", loginMethod: "test", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() } });
    await expect(buyer.payment.merchantConsole()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(buyer.payment.recentEvents({ limit: 5 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("reports readiness without exposing secret values", async () => {
    const caller = appRouter.createCaller({ req: {} as never, res: {} as never, user: undefined });
    const readiness = await caller.payment.readiness();
    expect(readiness.mode).toBe("test");
    expect(typeof readiness.razorpayKeyConfigured).toBe("boolean");
    expect(typeof readiness.razorpaySecretConfigured).toBe("boolean");
    expect(JSON.stringify(readiness)).not.toContain("secret");
  });

  it("rejects an order below the minimum amount before calling Razorpay", async () => {
    const caller = appRouter.createCaller({ req: {} as never, res: {} as never, user: { id: 9, openId: "buyer", name: "Buyer", email: "buyer@example.com", loginMethod: "test", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() } });
    await expect(caller.payment.createOrder({ amount: 99, receipt: "trace_bad", sku: "KBD-MX-MINI", includeUpsell: false, intent: { product: "Keyboard", category: "keyboard", budget: 10_000, connectivity: "Wireless", purpose: "Work", deliveryDays: 5, attributes: ["wireless"] } })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
