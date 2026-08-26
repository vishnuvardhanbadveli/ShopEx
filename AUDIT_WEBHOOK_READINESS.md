# Audit and Webhook Readiness Assessment

## Executive assessment

The audit and webhook implementation is **code-ready for controlled Test Mode integration**, but it is not yet externally validated for a real Razorpay checkout because the configured Test Mode key pairs have returned HTTP 401. The local deterministic simulation path is available and the complete automated suite passes.

## Verified lifecycle

| Stage | Implementation | Assessment |
|---|---|---|
| Approval | The client only calls `payment.createOrder` after policy pass and explicit human approval. | Ready |
| Order creation | The server validates amount, creates the Razorpay order, and persists `payment_orders` with status `created`. | Ready; live API blocked by credentials |
| Payment verification | The server recomputes HMAC-SHA256 over `order_id|payment_id` and uses timing-safe comparison. Valid payments transition to `verified`; invalid signatures transition to `failed`. | Ready |
| Webhook ingress | `/api/webhooks/razorpay` uses `express.raw()` before JSON parsing, preserving the exact signed body. | Ready |
| Webhook verification | The handler validates `x-razorpay-signature` before parsing JSON and rejects missing or invalid signatures. | Ready |
| Replay protection | Event IDs are persisted in the unique `payment_events.eventId` column; the in-memory set is only a fast-path optimization. | Ready for multi-instance durability |
| Payment state | `payment.captured` transitions the matching order to `captured`; `payment.failed` transitions it to `failed`. | Ready |
| Audit visibility | The client polls `payment.recentEvents` and maps persisted events into the visible append-only audit panel. | Ready for prototype usage |
| Graceful failure | Order errors, invalid signatures, webhook persistence failures, and test declines are surfaced without silent retries. | Ready |

## Test evidence

The full configured suite passes with **5 test files and 12 passing tests**, with one opt-in live credential test skipped unless explicitly enabled. Coverage includes valid and tampered payment signatures, raw-body webhook signatures, invalid webhook signatures, duplicate event handling, payment-failed state transitions, order-creation API failure, missing-secret behavior, invalid order amounts, client success transition, client decline recovery, and persisted webhook audit mapping. TypeScript validation also passes.

## Remaining risks and boundaries

The primary blocker is external authentication: the live Razorpay credential check returned HTTP 401 for both submitted key pairs. This prevents confirming real order creation and opening a real Checkout.js session; it does not indicate a failure in the local signature or webhook logic.

The visible audit feed is intentionally a prototype polling surface. It is public because the current payment procedures and recent-event query are public procedures. Before production use, protect catalog, payment, and audit queries with authenticated or merchant-scoped authorization and avoid exposing cross-merchant event data.

Webhook processing persists the raw signed payload for traceability. A production deployment should define a retention policy and restrict access to this data because webhook payloads may contain payment metadata. Operational alerting should also be added for repeated 401, 5xx, or persistence-unavailable responses.

The order is created at Razorpay before the local payment-order row is persisted. If local persistence fails after Razorpay accepts the order, the system returns an error while an orphaned Razorpay order may exist. Production hardening should add reconciliation or an outbox/retry process for this narrow failure window.

## Concrete next actions

First, enter a currently active Razorpay Test Mode Key ID and paired Key Secret generated together from the same account, then run `RUN_RAZORPAY_LIVE_CHECK=true pnpm vitest run server/razorpay.test.ts`. Second, configure the Test Mode webhook endpoint and secret, then send a signed `payment.captured` and `payment.failed` test event through Razorpay’s dashboard. Third, add merchant authentication and access control around the payment and audit procedures before using real customer or merchant data. Fourth, add production reconciliation for orders created upstream when local persistence is temporarily unavailable.
