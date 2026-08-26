# Trace/Pay — Agent Checkout Protocol

## Cover
Trace/Pay
From intent to approved action.
Agent checkout with deterministic policy, human authorization, and an auditable payment trail.

## Slide 1
### The problem is not recommendation — it is accountable transaction execution
- AI buyers can interpret intent, but interpretation alone is not authorization.
- A trustworthy checkout must prove the constraint match, bound the amount, and stop before payment without approval.
- Judges’ bar: explainable, bounded, gated, auditable, and resilient when something fails.

## Slide 2
### One protocol spine connects intent to payment evidence
- Buyer agent: natural-language request → structured constraints.
- Merchant feed: machine-readable SKU, price, category, stock, delivery ETA, and attributes.
- Deterministic policy engine: candidate + constraints → pass/fail + reasons.
- Payment gate: explicit human approval → server-created Razorpay Test Mode order.
- Audit trail: actor, action, result, amount, authorization, and webhook outcome.

## Slide 3
### The catalog is transactable by an AI buyer
- Structured feed makes inventory queryable without relying on visual scraping.
- Example request: wireless mechanical keyboard, under ₹10,000, delivered within five days.
- Candidate selection is bounded by category, budget, stock, delivery, and attributes.
- The same catalog contract can support another buyer agent or merchant surface.

## Slide 4
### Policy verification is separate from the language model
- The agent recommends; the policy engine verifies.
- Each requirement produces an explicit reason: price, category, stock, delivery, and attribute match.
- A failed policy is visible, not hidden behind a confident response.
- Upsell items re-enter the same policy engine and must preserve the budget cap.

## Slide 5
### The upsell is bounded, optional, and re-verified
- A contextual Desk Mat XL suggestion adds ₹499 to the keyboard purchase.
- The user sees the incremental cost and the new total before approval.
- The policy engine checks the combined basket again.
- No upsell can bypass the original category, budget, stock, or delivery constraints.

## Slide 6
### Payment is a human-approved transition, not an agent decision
- The approval gate is visually and technically separate from recommendation.
- The server creates the Razorpay order in paise with INR currency and a unique receipt.
- Checkout.js receives only the public Test Key ID and server-created order.
- The Key Secret and Webhook Secret remain server-side.
- Razorpay documents server-side order creation and mandatory signature verification. [1]

## Slide 7
### Two independent checks protect the payment boundary
- Checkout result: verify HMAC-SHA256 over `order_id|payment_id` before marking the payment verified.
- Webhook result: preserve the exact raw body, verify `X-Razorpay-Signature`, then parse and persist the event.
- Durable idempotency: unique `x-razorpay-event-id` prevents duplicate processing across restarts and instances.
- State transitions: `created → verified → captured` or `created → failed`.
- Razorpay recommends signature verification, status checks, and webhooks as complementary controls. [2] [3]

## Slide 8
### The audit trail makes every decision inspectable
- `buyer.agent → INTENT_CAPTURED` records the request and parsed constraints.
- `catalog.feed → CANDIDATE_SELECTED` records the selected SKU.
- `policy.engine → POLICY_VERIFIED` records deterministic reasons.
- `human → APPROVAL_RECORDED` records the authorization boundary.
- `razorpay.api → ORDER_CREATED / PAYMENT_VERIFIED` records payment calls.
- `razorpay.webhook → WEBHOOK_RECEIVED` records the persisted provider event.

## Slide 9
### Failure is a first-class state, not a hidden retry loop
- Policy rejection explains which constraint failed and offers a compliant alternative or asks for a relaxed constraint.
- Test-mode payment decline writes `PAYMENT_FAILED`, shows the user what happened, and makes no silent retry.
- The user can return to approval and choose the next action.
- Invalid signatures and unavailable persistence return explicit errors and do not mark the payment successful.

## Slide 10
### What is proven — and what remains before production
- Proven locally: 5 test files, 12 passing tests, TypeScript check passing.
- Covered: payment signatures, raw-body webhooks, tampering, duplicate events, failed-payment state, API errors, missing secrets, client success, decline recovery, and audit mapping.
- Operational blocker: the supplied Razorpay key pairs returned HTTP 401, so live Test Mode order creation is not yet externally validated.
- Production hardening: merchant-scoped authentication, audit-data retention, alerting, and reconciliation for an upstream order created before local persistence succeeds.

## Slide 11
### The demo moment: show the gate, then show the evidence
- Start with the natural-language keyboard request.
- Show the catalog match and four deterministic policy checks.
- Add the bounded Desk Mat XL upsell and re-run the policy check.
- Click approval to open the Razorpay Test Mode boundary.
- Demonstrate either simulated success + webhook or simulated decline, then point to the audit trail.

Buyer agent recommends. Policy engine verifies. Human authorizes. Provider confirms. Audit trail explains.

References
[1] Razorpay Docs, “Create an Order” — https://razorpay.com/docs/api/orders/create/?preferred-country=US
[2] Razorpay Docs, “Best Practices” — https://razorpay.com/docs/payments/third-party-validation/best-practices/?preferred-country=US
[3] Razorpay Docs, “Validate and Test Webhooks” — https://razorpay.com/docs/webhooks/validate-test/?preferred-country=US
