# Razorpay Test Mode Setup

Trace/Pay keeps all Razorpay credentials on the server. The browser receives only the public Test Key ID as part of the server-created order response; the Key Secret and Webhook Secret are never serialized to client code.

## Required environment variables

| Variable | Purpose |
|---|---|
| `RAZORPAY_KEY_ID` | Razorpay Test Mode API Key ID used to create orders. It normally begins with `rzp_test_`. |
| `RAZORPAY_KEY_SECRET` | Server-only Test Mode secret used for API authentication and payment signature verification. |
| `RAZORPAY_WEBHOOK_SECRET` | Server-only secret configured for the Test Mode webhook endpoint. |

## Razorpay Dashboard configuration

Enable **Test Mode**, create a Test API key pair, and configure a webhook pointing to:

```text
https://YOUR-MANUS-DOMAIN/api/webhooks/razorpay
```

Select the payment events required by the checkout flow, including `payment.captured` and `payment.failed`. Copy the webhook secret exactly into `RAZORPAY_WEBHOOK_SECRET`. Razorpay signs the exact raw request body, so the server registers the webhook route before JSON parsing and validates the `x-razorpay-signature` header with HMAC SHA-256.

## Runtime flow

The user first passes the deterministic policy engine and explicitly approves the total. The client then calls `payment.createOrder`, which validates the amount in paise and creates a Razorpay Test Mode order server-side. Checkout.js opens using that order. On completion, the client sends the returned order ID, payment ID, and signature to `payment.verifyPayment`; the server recomputes the signature with `order_id|payment_id` and rejects mismatches. Razorpay webhooks are independently verified and persisted in `payment_events` using the event ID as a durable unique key, preventing duplicate processing across restarts and instances.

## Deterministic demo controls

When running in development, the approval panel exposes guarded **simulate success + webhook** and **simulate decline** buttons. These controls never appear in production and exist so a demo can exercise both the success and graceful-failure paths without depending on a live Checkout.js interaction. The real Razorpay path remains available through the primary approval button.

## Verification commands

Run the deterministic tests and type check with:

```bash
pnpm vitest run server/razorpay.test.ts server/paymentWebhook.test.ts
pnpm check
```

An optional live credential check is available when the exact Test Mode credentials are present:

```bash
RUN_RAZORPAY_LIVE_CHECK=true pnpm vitest run server/razorpay.test.ts
```

A live check returning HTTP 401 means the supplied key pair is not accepted by Razorpay Test Mode and should be replaced before relying on real order creation.
