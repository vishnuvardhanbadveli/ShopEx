# Razorpay test-mode integration TODO

- [x] Confirm the server-side payment boundary and required environment variables.
- [x] Add server-side Razorpay order creation with amount and currency validation.
- [x] Add payment signature verification using HMAC SHA-256.
- [x] Add webhook signature verification and replay/idempotency protection.
- [x] Add safe test-mode simulation controls for success and decline outcomes.
- [x] Connect approval gate UI to the server payment flow.
- [x] Append order, approval, verification, webhook, and failure events to the audit trail.
- [x] Test success, decline, invalid signature, replay, and missing-secret paths.
- [x] Document local setup and Razorpay dashboard webhook configuration.

## Follow-up hardening discovered during verification

- [x] Persist webhook event IDs and payment state for durable idempotency across restarts and instances.
- [x] Add explicit guarded success/decline simulation controls for deterministic demo testing.
- [x] Surface verified webhook receipt events in the visible audit trail.
- [x] Add Vitest coverage for payment signature success/failure, missing-secret handling, and decline/error paths.
- [x] Create setup documentation for environment variables, Test Mode keys, webhook URL, webhook secret, and local test steps.

## Final verification gaps

- [x] Persist server-side payment and order status alongside webhook events.
- [x] Wire actual verified webhook receipts into a client-visible audit feed.
- [x] Add tests for order-creation failure and payment-decline error handling.

## Remaining verification work

- [x] Expose persisted webhook/payment events to the client and render actual verified receipts.
- [x] Test Razorpay order-creation API failure handling.
- [x] Test payment.failed webhook and graceful decline handling end to end.

## Client-flow verification follow-up

- [x] Add a deterministic client payment-flow reducer and tests for success, decline, and return-to-approval behavior.
- [x] Add a client-visible webhook-feed mapping test for verified persisted events.

## Final client-test verification

- [x] Add an explicit success transition assertion for PAYMENT_VERIFIED.
- [x] Run the client payment-flow test file explicitly and verify it passes.

## Audit and webhook readiness review

- [x] Trace audit events from approval through order creation, payment verification, webhook persistence, and client refresh.
- [x] Review signature validation, raw-body handling, replay protection, and payment-state transitions.
- [x] Run focused audit/webhook tests and record readiness risks.
- [x] Deliver a readiness assessment with concrete remaining actions.

## Readiness assessment documentation

- [x] Document the audit and webhook readiness risks found during review.
- [x] Deliver a readiness assessment summarizing verified behavior, credential blockage, and concrete next actions.

## Comprehensive expansion backlog

- [x] Add scenario-driven catalog search for compliant, rejected, out-of-stock, late-delivery, and budget-overrun requests.
- [x] Add richer structured catalog schema visibility and feed validation states.
- [x] Improve conversational checkout with editable constraints, selected-candidate reasoning, and reset/replay controls.
- [x] Expand bounded upsell/cross-sell options with explicit basket re-verification and rejection reasons.
- [x] Improve payment UX for creating, opening, verifying, captured, declined, invalid-signature, and unavailable-persistence states.
- [x] Add merchant-scoped/authenticated controls for payment, catalog, and audit data where supported by the project.
- [x] Deepen audit trail with filtering, event detail, persisted state transitions, and provider/error metadata.
- [x] Add operational readiness indicators for credentials, webhook configuration, and test-mode status without exposing secrets.
- [x] Expand server and client tests for all new scenarios and recovery paths.
- [x] Refresh the judges deck/demo narrative to reflect the expanded product surface.
- [x] Run visual verification, full tests, type checks, and save a new checkpoint.

## Expansion verification gaps

- [x] Implement actual scenario-driven catalog filtering and compliant/rejected candidate sets.
- [x] Add explicit catalog schema validation status and malformed-feed handling.
- [x] Add editable constraint controls and explicit candidate-selection reasoning.
- [x] Expand upsell/cross-sell options with explicit rejection reasons.
- [x] Add dedicated captured, invalid-signature, and persistence-unavailable payment UX states.
- [x] Expose richer audit event details including provider IDs, order IDs, error metadata, and persisted transitions.
- [x] Back readiness indicators with concrete configuration checks rather than static labels.
- [x] Add tests for scenario controller behavior, audit filtering, payment UX states, and readiness indicators.

## Final expansion verification gaps

- [x] Group catalog results into compliant and rejected sets with an explicit rejection count.
- [x] Surface malformed-feed validation errors and degraded catalog messaging.
- [x] Wire captured and persistence-unavailable states to backend event outcomes where available.
- [x] Add expandable audit details for provider, order, event, failure metadata, and persisted transitions.
- [x] Add focused tests for scenario grouping, audit filter logic, and readiness status logic.

## Final precision gaps

- [x] Scope captured-state updates to the current order/payment and use an explicit backend persistence status.
- [x] Expand audit detail with structured event ID, order ID, provider, failure metadata, and persisted state transition fields.
- [x] Add focused pure tests for candidate grouping, audit filtering, and readiness-indicator logic.

## Live Razorpay validation

- [x] Validate the securely supplied paired Razorpay Test Mode credentials (live Test Mode order creation passed).
- [x] Run a server-side Test Mode order-creation check without exposing secrets (order created; no payment captured).
- [x] Record the result and next action for real checkout validation (paired keys are valid; proceed with optional Checkout.js/browser validation).

## Safekeeping archive export

- [x] Assemble a clean ZIP of source, documentation, migrations, tests, audit code, and selected logs.
- [x] Exclude secrets, environment files, dependencies, build output, caches, and temporary files.
- [x] Verify ZIP integrity and inspect its manifest for accidental sensitive content.
- [x] Deliver the verified archive to the user.

## Attached brief implementation

- [x] Read and map the attached brief to the current Trace/Pay project.
- [x] Implement the brief’s requested product and interface changes.
- [x] Update or add tests for the new behavior.
- [x] Run type checks, tests, and visual verification.
- [x] Save and deliver the completed project checkpoint.

## Productization gaps from validation

- [x] Reconnect buyer prompt intake to a real server-side structured intent parser, with a safe fallback if the LLM service is unavailable.
- [x] Add actual product image assets and use them in discovery, detail, confirmation, and order-history views.
- [x] Implement functional order-detail navigation for confirmation and order-history actions.

## Final product-detail polish

- [x] Add distinct product-specific image assets for each catalog SKU and use them across all buyer surfaces.
- [x] Implement a dedicated order-detail state and wire confirmation/order-history actions to it.
- [x] Add focused tests for order-detail navigation and per-SKU image mapping.

## Final validation fix

- [x] Keep live Razorpay credentials isolated from deterministic helper-test fixtures when the full suite runs with the live-check flag.

## End-to-end functional checkout

- [x] Audit the existing UI-to-tRPC wiring, catalog source, intent parser, Razorpay flow, webhook handler, persistence, and refresh recovery.
- [x] Connect the UI to real parsed intent and real catalog/product responses without replacing working backend code.
- [x] Ensure truthful UI state transitions for selection, approval, order creation, Checkout response, verification, webhook confirmation, persistence, and confirmed order display.
- [x] Implement the required real catalog API and refresh-safe order reconstruction with durable order snapshots and buyer ownership.
- [x] Add focused coverage for invalid/empty intent, no matches, unavailable product, order failure, payment failure, verification failure, invalid webhook, duplicate webhook, webhook delay, and refresh recovery.
- [x] Run local integration checks, TypeScript checks, existing tests, webhook/persistence verification, and document the remaining external browser-payment/webhook delivery validation.

## Real catalog backend

- [x] Define and migrate a durable catalog-products table with stock, price, delivery, attributes, and image metadata.
- [x] Add public catalog list and product lookup tRPC procedures backed solely by the database.
- [x] Replace buyer-flow use of the local catalog array with catalog tRPC data while preserving existing screens.
- [x] Validate selected products server-side before creating Razorpay orders.
- [x] Add unit coverage for catalog validation, query filters, unavailable products, and buyer mapping.
- [x] Preserve specific tRPC catalog validation errors when createOrder rejects unavailable products.

## Functional application hardening

- [x] Remove all buyer-facing demo terms, scenario menus, and simulated payment controls.
- [x] Remove hardcoded successful payment state transitions and rely exclusively on verified backend/webhook status.
- [x] Persist complete order snapshots and buyer ownership for refresh-safe order recovery.
- [x] Expose current-user order history and order-detail tRPC procedures backed by persisted records.
- [x] Reflect delayed, failed, invalid, and captured webhook states truthfully in buyer screens.
- [x] Add end-to-end-oriented coverage for live intent/catalog contracts, failures, webhook delay/replay, and refresh recovery.
- [x] Document the remaining external browser Checkout.js completion and live Razorpay webhook-delivery validation step.
- [x] Update existing payment tests for required buyer authentication and durable intent snapshots.
- [x] Preserve a buyer's reviewed cart and parsed intent across the required sign-in redirect before order creation.
- [x] Enforce the parsed category, budget, delivery, and attribute requirements server-side before creating any Razorpay order.

## Customer profile

- [x] Audit the existing customer order views, session state, and navigation contracts for the profile feature.
- [x] Add an authenticated customer profile page backed by the current-user persisted order API.
- [x] Display real payment statuses, counts, and direct links to customer-owned order details.
- [x] Add profile navigation with sign-in handling while preserving the existing buyer journey.
- [x] Add focused tests and visual verification for profile access and order-status presentation.
- [x] Add route-level coverage for authenticated profile access, current-user order rendering, and customer-owned order-detail navigation.
- [x] Capture available visual verification of the profile entry and protected sign-in redirect; signed-in browser content was not reviewed because customer credentials were unavailable.

## Customer account settings

- [x] Audit profile settings, user ownership, and available account data contracts.
- [x] Create and migrate customer-owned saved-address and preference-settings storage.
- [x] Add authenticated tRPC procedures for address management and preference updates.
- [x] Add profile sections for saved addresses, shopping preferences, and notification controls.
- [x] Add tests for settings persistence, validation, and cross-user isolation.
- [x] Add router validation tests for invalid saved-address and preference inputs.
- [x] Add persistence-semantic coverage for address creation, default reassignment, deletion, and preference save/readback behavior.
- [x] Add integration-style helper coverage for create, update-to-default, delete-default promotion, and non-default address deletion.
- [x] Add persistence readback coverage for saved account preferences through the database helper contract.
- [x] Add direct account-helper contract coverage for default-address promotion and non-default deletion.
- [x] Add direct account-helper contract coverage for preference save and subsequent readback.

## Account settings feedback refinement

- [x] Add inline validation messages and invalid-state styling to saved-address fields.
- [x] Add pending/loading indicators and disabled submit states for address mutations.
- [x] Add pending/loading feedback and accessible status messaging to preference and notification toggles.
- [x] Add tests and visual verification for validation and pending feedback states.

## Address server-error mapping refinement

- [x] Audit backend address-validation error shapes and current mutation error handling.
- [x] Map backend address-validation errors to matching form fields with a global fallback.
- [x] Add tests for server error extraction, field mapping, and rendered feedback.
- [x] Run full validation and save a checkpoint.

## Recovered-field success feedback

- [x] Track address fields that recover from client or server validation errors.
- [x] Render accessible green checkmarks for corrected address fields.
- [x] Add tests and visual smoke verification for recovered-field feedback.

## First-error auto-scroll feedback

- [x] Add first-error field refs and smooth scroll/focus behavior on address submit.
- [x] Add tests for first-error ordering and scroll/focus behavior.
- [x] Run full validation and save a checkpoint.

## Invalid-field shake feedback

- [x] Add a submit-attempt shake state for errored address fields.
- [x] Respect prefers-reduced-motion while keeping invalid feedback visible.
- [x] Add tests and visual smoke verification for the shake behavior.

## Full ShopEx improvement pass

- [x] Audit current checkout, profile, catalog, audit, auth, and analytics architecture.
- [x] Connect authenticated saved-address selection to checkout and server-side order snapshots.
- [x] Add stronger per-candidate requirement explainability in checkout.
- [x] Add order timeline and refresh-safe checkout recovery center.
- [x] Wire payment and order events to in-app notifications respecting customer preferences.
- [x] Add protected merchant catalog administration with audit-safe mutations.
- [x] Add account-security controls for active sessions and sign-out-all-devices behavior.
- [x] Add privacy-safe observability metrics for checkout and webhook operations.
- [x] Add tests, responsive visual verification, and hardening review for all improvements.
- [x] Save and deliver a definitive checkpoint for the complete improvement pass.

## Order timeline stage indicator

- [x] Add persisted-status-to-stage mapping for order progress.
- [x] Render a visual progress bar and current-stage badge in order details.
- [x] Add mapping tests and visual smoke verification, then save a checkpoint.
