import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createOrderTimelineEvent, createPaymentOrder, createUserNotification, getCatalogProductBySku, getPaymentOrderForBuyer, getSavedAddressForUser, listCatalogProductsAdmin, listCatalogChangeEvents, listOrderTimelineForBuyer, listPaymentEventsForOrder, listPaymentOrdersForBuyer, listRecentPaymentEvents, mapPaymentOrderForBuyer, getObservabilitySummary, recordObservabilityEvent, shouldNotifyUser, updatePaymentOrder, upsertCatalogProductByAdmin } from "../db";
import { createRazorpayOrder, getRazorpayPublicKey, verifyPaymentSignature } from "../razorpay";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { evaluatePolicy } from "../../shared/policyEngine";

export const safeLimit = (fallback: number, maximum: number) => z.preprocess((value) => typeof value === "number" && value < 1 ? fallback : value, z.number().int().min(1).max(maximum).default(fallback));

const orderInput = z.object({
  amount: z.number().int().min(100).max(10_000_00),
  receipt: z.string().min(4).max(40).regex(/^[a-zA-Z0-9_-]+$/),
  sku: z.string().min(1).max(64),
  includeUpsell: z.boolean().default(false),
  upsellSku: z.string().min(1).max(64).optional(),
  addressId: z.number().int().positive().optional(),
  intent: z.object({
  product: z.string().min(1).max(160),
  category: z.string().min(1).max(80),
  budget: z.number().int().nonnegative().max(10_000_000),
  currency: z.string().min(1).max(10),
  connectivity: z.string().min(1).max(120),
  purpose: z.string().min(1).max(160),
  deliveryDays: z.number().int().min(1).max(60),
  attributes: z.array(z.string().min(1).max(80)).max(20),
  constraints: z.array(z.string().min(1).max(160)).max(20),
}),
});

export const paymentRouter = router({
  merchantConsole: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Merchant access is required" });
    return {
      scope: "merchant" as const,
      operator: { id: ctx.user.id, name: ctx.user.name ?? "merchant operator", role: ctx.user.role },
      controls: { catalog: true, paymentOrders: true, auditTrail: true },
      note: "Merchant-scoped controls require authenticated operator context; secrets remain server-side.",
    };
  }),
  readiness: publicProcedure.query(() => ({
    mode: "test" as const,
    razorpayKeyConfigured: Boolean(process.env.RAZORPAY_KEY_ID),
    razorpaySecretConfigured: Boolean(process.env.RAZORPAY_KEY_SECRET),
    webhookSecretConfigured: Boolean(process.env.RAZORPAY_WEBHOOK_SECRET),
    databaseConfigured: Boolean(process.env.DATABASE_URL),
  })),
  orderStatus: protectedProcedure.input(z.object({ orderId: z.string().min(1).max(64) })).query(async ({ input, ctx }) => {
    const order = await getPaymentOrderForBuyer(input.orderId, ctx.user.id);
    if (order === "unavailable") throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Order service is unavailable" });
    if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "Order was not found" });
    return { available: true as const, order: mapPaymentOrderForBuyer(order) };
  }),
  myOrders: protectedProcedure.input(z.object({ limit: safeLimit(25, 50) })).query(async ({ input, ctx }) => {
    const orders = await listPaymentOrdersForBuyer(ctx.user.id, input.limit);
    if (orders === "unavailable") throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Order service is unavailable" });
    return orders.map(mapPaymentOrderForBuyer);
  }),
  resumeOrder: protectedProcedure.input(z.object({ orderId: z.string().min(1).max(64) })).query(async ({ input, ctx }) => {
    const order = await getPaymentOrderForBuyer(input.orderId, ctx.user.id);
    if (order === "unavailable") throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Order service is unavailable" });
    if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "Order was not found" });
    if (order.status !== "created") throw new TRPCError({ code: "CONFLICT", message: "This order cannot be resumed" });
    return { keyId: getRazorpayPublicKey(), order: { id: order.orderId, amount: order.amount, currency: "INR" as const } };
  }),
  orderTimeline: protectedProcedure.input(z.object({ orderId: z.string().min(1).max(64), limit: safeLimit(50, 50) })).query(async ({ input, ctx }) => {
    const order = await getPaymentOrderForBuyer(input.orderId, ctx.user.id);
    if (order === "unavailable") throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Order service is unavailable" });
    if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "Order was not found" });
    const events = await listOrderTimelineForBuyer(input.orderId, ctx.user.id, input.limit);
    if (events === "unavailable") throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Order timeline is unavailable" });
    return events;
  }),
  orderEvents: protectedProcedure.input(z.object({ orderId: z.string().min(1).max(64), limit: safeLimit(20, 50) })).query(async ({ input, ctx }) => {
    const order = await getPaymentOrderForBuyer(input.orderId, ctx.user.id);
    if (order === "unavailable") throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Order service is unavailable" });
    if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "Order was not found" });
    const events = await listPaymentEventsForOrder(input.orderId, input.limit);
    if (events === "unavailable") throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Order event service is unavailable" });
    return events;
  }),
  catalogChangeHistory: protectedProcedure.input(z.object({ limit: safeLimit(30, 50) })).query(async ({ ctx, input }) => {
    if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Merchant access is required" });
    const result = await listCatalogChangeEvents(input.limit);
    if (result === "unavailable") throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Catalog audit history is unavailable" });
    return result;
  }),
  adminCatalog: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Merchant access is required" });
    const products = await listCatalogProductsAdmin();
    if (products === "unavailable") throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Catalog service is unavailable" });
    return products;
  }),
  upsertCatalog: protectedProcedure.input(z.object({ sku: z.string().min(1).max(64), name: z.string().min(1).max(180), category: z.enum(["keyboard", "mouse", "accessory"]), price: z.number().int().min(1), stock: z.number().int().min(0), deliveryDays: z.number().int().min(1).max(60), deliveryLabel: z.string().min(1).max(64), attributes: z.array(z.string().min(1).max(40)).max(12), description: z.string().min(1), accent: z.enum(["violet", "indigo", "green", "amber"]), imageUrl: z.string().url() })).mutation(async ({ ctx, input }) => {
    if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Merchant access is required" });
    const result = await upsertCatalogProductByAdmin(ctx.user.id, input);
    if (result === "unavailable") throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Catalog service is unavailable" });
    return { success: true as const, result };
  }),
  observabilitySummary: protectedProcedure.input(z.object({ limit: safeLimit(100, 100) })).query(async ({ input, ctx }) => {
    if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Merchant access is required" });
    const result = await getObservabilitySummary(input.limit);
    if (result === "unavailable") throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Observability service is unavailable" });
    return result;
  }),
  recentEvents: protectedProcedure.input(z.object({ limit: safeLimit(20, 50) })).query(({ input, ctx }) => {
    if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Merchant access is required" });
    return listRecentPaymentEvents(input.limit);
  }),
  createOrder: protectedProcedure.input(orderInput).mutation(async ({ input, ctx }) => {
    try {
      const startedAt = Date.now();
      const selected = await getCatalogProductBySku(input.sku);
      if (selected === "unavailable") throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Catalog service is unavailable" });
      if (!selected) throw new TRPCError({ code: "NOT_FOUND", message: "Selected product was not found" });
      if (selected.stock < 1) throw new TRPCError({ code: "CONFLICT", message: "Selected product is no longer available" });

      const upsell = input.upsellSku ? await getCatalogProductBySku(input.upsellSku) : undefined;
      if (upsell === "unavailable") throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Catalog service is unavailable" });
      if (input.upsellSku && !upsell) throw new TRPCError({ code: "NOT_FOUND", message: "Selected add-on was not found" });
      if (upsell && upsell.stock < 1) throw new TRPCError({ code: "CONFLICT", message: "Selected add-on is no longer available" });
      if (Boolean(input.upsellSku) !== input.includeUpsell) throw new TRPCError({ code: "BAD_REQUEST", message: "Add-on selection does not match the order request" });

      const policy = evaluatePolicy(selected, { requestedCategory: input.intent.category, maxPrice: input.intent.budget, deliveryDays: input.intent.deliveryDays, attributes: input.intent.attributes });
      if (!policy.pass) throw new TRPCError({ code: "PRECONDITION_FAILED", message: `Selected product no longer satisfies: ${policy.failedReasons.map((reason) => reason.key).join(", ")}` });

      const expectedAmount = (selected.price + (upsell?.price ?? 0)) * 100;
      if (input.amount !== expectedAmount) throw new TRPCError({ code: "BAD_REQUEST", message: "Order amount does not match the current catalog price" });
      if (expectedAmount / 100 > input.intent.budget) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Selected basket exceeds the approved budget" });
      let shippingAddressSnapshot: string | null = null;
      if (input.addressId) {
        const address = await getSavedAddressForUser(ctx.user.id, input.addressId);
        if (address === "unavailable") throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Address service is unavailable" });
        if (!address) throw new TRPCError({ code: "NOT_FOUND", message: "Selected address was not found" });
        shippingAddressSnapshot = JSON.stringify(address);
      }
      const order = await createRazorpayOrder({
        amount: expectedAmount,
        receipt: input.receipt,
        notes: { sku: input.sku, upsellSku: input.upsellSku ?? "", includeUpsell: String(input.includeUpsell), environment: "test" },
      });
      const persisted = await createPaymentOrder({
        orderId: order.id,
        buyerId: ctx.user.id,
        sku: selected.sku,
        upsellSku: upsell?.sku,
        amount: expectedAmount,
        status: "created",
        productSnapshot: JSON.stringify(selected),
        upsellSnapshot: upsell ? JSON.stringify(upsell) : null,
        intentSnapshot: JSON.stringify(input.intent),
        shippingAddressSnapshot,
      });
      if (persisted === "unavailable") throw new Error("Payment order persistence is unavailable");
      const notify = await shouldNotifyUser(ctx.user.id, "order");
      await Promise.all([
        createOrderTimelineEvent({ orderId: order.id, buyerId: ctx.user.id, eventType: "order_created", title: "Payment order created", detail: "Your approved basket was prepared for secure Razorpay checkout.", tone: "blue", metadata: JSON.stringify({ sku: selected.sku }) }),
        ...(notify ? [createUserNotification({ userId: ctx.user.id, kind: "order_created", title: "Checkout ready", body: `Your ${selected.name} order is ready for secure payment.`, orderId: order.id })] : []),
        recordObservabilityEvent({ eventType: "order_creation", outcome: "success", orderId: order.id, durationMs: Date.now() - startedAt, metadata: JSON.stringify({ provider: "razorpay" }) }),
      ]);
      return { keyId: getRazorpayPublicKey(), order };
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      await recordObservabilityEvent({ eventType: "order_creation", outcome: "failure", durationMs: undefined, metadata: JSON.stringify({ error: error instanceof Error ? error.message : "unknown" }) });
      throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Unable to create Razorpay order" });
    }
  }),

  verifyPayment: protectedProcedure.input(z.object({ orderId: z.string().min(1), paymentId: z.string().min(1), signature: z.string().length(64) })).mutation(async ({ input, ctx }) => {
    try {
      const order = await getPaymentOrderForBuyer(input.orderId, ctx.user.id);
      if (order === "unavailable") throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Order service is unavailable" });
      if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "Order was not found" });
      const verified = verifyPaymentSignature(input);
      if (!verified) {
        await updatePaymentOrder(input.orderId, "failed", input.paymentId);
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Payment signature verification failed" });
      }
      const persisted = await updatePaymentOrder(input.orderId, "verified", input.paymentId);
      if (persisted === "unavailable") throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Payment state persistence is unavailable" });
      const notify = await shouldNotifyUser(ctx.user.id, "order");
      await Promise.all([
        createOrderTimelineEvent({ orderId: input.orderId, buyerId: ctx.user.id, eventType: "payment_verified", title: "Payment verified", detail: "Razorpay signature verification passed. Waiting for provider confirmation.", tone: "green", metadata: JSON.stringify({ paymentId: input.paymentId }) }),
        ...(notify ? [createUserNotification({ userId: ctx.user.id, kind: "payment_verified", title: "Payment verified", body: "Your payment was verified. We are waiting for final provider confirmation.", orderId: input.orderId })] : []),
      ]);
      return { verified: true as const, result: "verified" as const };
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Unable to verify payment" });
    }
  }),
});
