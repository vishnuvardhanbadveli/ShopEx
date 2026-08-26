import crypto from "node:crypto";
import type { Request, Response } from "express";
import { verifyWebhookSignature } from "./razorpay";
import { createOrderTimelineEvent, createUserNotification, getPaymentOrder, recordObservabilityEvent, recordPaymentEvent, shouldNotifyUser, updatePaymentOrder } from "./db";

const processedEventIds = new Set<string>();

async function observeWebhook(outcome: string, eventType?: string, orderId?: string) {
  try { await recordObservabilityEvent({ eventType: eventType ? `webhook_${eventType.replaceAll(".", "_")}` : "webhook_unknown", outcome, orderId, metadata: JSON.stringify({ channel: "razorpay_webhook" }) }); } catch (error) { console.warn("[Razorpay webhook] observability failed", error); }
}

export async function handleRazorpayWebhook(req: Request, res: Response) {
  const rawBody = Buffer.isBuffer(req.body) ? req.body.toString("utf8") : "";
  const signature = req.header("x-razorpay-signature") ?? "";
  const eventId = req.header("x-razorpay-event-id") ?? crypto.createHash("sha256").update(rawBody).digest("hex");

  if (!rawBody || !signature) {
    await observeWebhook("missing_signature");
    return res.status(400).json({ ok: false, error: "Missing raw body or x-razorpay-signature" });
  }

  try {
    if (!verifyWebhookSignature(rawBody, signature)) {
      await observeWebhook("invalid_signature");
      return res.status(401).json({ ok: false, error: "Invalid webhook signature" });
    }
  } catch (error) {
    await observeWebhook("verification_unavailable");
    return res.status(503).json({ ok: false, error: error instanceof Error ? error.message : "Webhook verification unavailable" });
  }

  if (processedEventIds.has(eventId)) {
    await observeWebhook("duplicate");
    return res.status(200).json({ ok: true, duplicate: true });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    await observeWebhook("invalid_json");
    return res.status(400).json({ ok: false, error: "Webhook body is not valid JSON" });
  }

  const typedPayload = payload as { event?: string; payload?: { payment?: { entity?: { order_id?: string } } } };
  const event = typedPayload.event ?? "unknown";
  const orderId = typedPayload.payload?.payment?.entity?.order_id;
  try {
    const persistence = await recordPaymentEvent({ eventId, eventType: event, orderId, payload: rawBody });
    if (persistence === "unavailable") { await observeWebhook("persistence_unavailable", event, orderId); return res.status(503).json({ ok: false, error: "Webhook persistence unavailable" }); }
    if (persistence === "duplicate") { await observeWebhook("duplicate", event, orderId); return res.status(200).json({ ok: true, duplicate: true }); }
    if (orderId && (event === "payment.captured" || event === "payment.failed")) {
      const state = event === "payment.captured" ? "captured" : "failed";
      const stateResult = await updatePaymentOrder(orderId, state);
      if (stateResult === "unavailable") return res.status(503).json({ ok: false, error: "Payment state persistence unavailable" });
      const persistedOrder = await getPaymentOrder(orderId);
      if (persistedOrder && persistedOrder !== "unavailable" && persistedOrder.buyerId) {
        const captured = state === "captured";
        const notify = await shouldNotifyUser(persistedOrder.buyerId, "order");
        await Promise.all([
          createOrderTimelineEvent({ orderId, buyerId: persistedOrder.buyerId, eventType: event, title: captured ? "Payment captured" : "Payment failed", detail: captured ? "Razorpay confirmed the payment and ShopEx marked the order complete." : "Razorpay reported a payment failure. No silent retry was attempted.", tone: captured ? "green" : "red", metadata: JSON.stringify({ eventId }) }),
          ...(notify ? [createUserNotification({ userId: persistedOrder.buyerId, kind: captured ? "payment_captured" : "payment_failed", title: captured ? "Order confirmed" : "Payment needs attention", body: captured ? "Your ShopEx order is confirmed by the payment provider." : "Your payment failed. Review the order timeline for the next available action.", orderId })] : []),
        ]);
      }
    }
  } catch (error) {
    console.error("[Razorpay webhook] persistence failed", error);
    return res.status(500).json({ ok: false, error: "Webhook persistence failed" });
  }

  processedEventIds.add(eventId);
  await observeWebhook("accepted", event, orderId);
  console.info(JSON.stringify({ type: "razorpay.webhook", eventId, event, orderId, result: "accepted", receivedAt: new Date().toISOString() }));
  return res.status(200).json({ ok: true, received: true, eventId, event });
}

export function resetWebhookReplayStateForTests() {
  processedEventIds.clear();
}
