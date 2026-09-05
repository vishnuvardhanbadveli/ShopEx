# ShopEx — Shopping, Understood

> An AI-powered agentic shopping assistant where AI handles shopping complexity while the user remains in control of every financial action.

[![React](https://img.shields.io/badge/React-TypeScript-61DAFB?logo=react&logoColor=111827)](https://react.dev/)
[![Razorpay](https://img.shields.io/badge/Razorpay-Test_Mode-0C0C0C)](https://razorpay.com/)
[![License](https://img.shields.io/badge/license-TBD-lightgrey)](#license)

ShopEx lets users describe what they want in natural language. It understands the request, discovers suitable products, evaluates them against deterministic policies, explains recommendations, and waits for explicit approval before creating a Razorpay payment order.

> **The agent recommends. The user authorizes.**

Built for the **Razorpay AI Builder Internship 2026 — Agentic Commerce Track**.

## Table of Contents

- [Overview](#overview)
- [Problem](#problem)
- [Solution](#solution)
- [Features](#features)
- [End-to-End Flow](#end-to-end-flow)
- [Architecture](#architecture)
- [AI and Deterministic Responsibilities](#ai-and-deterministic-responsibilities)
- [Payment Safety](#payment-safety)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Running Locally](#running-locally)
- [Testing Payments and Webhooks](#testing-payments-and-webhooks)
- [Audit Trail](#audit-trail)
- [Security Considerations](#security-considerations)
- [Known Limitations](#known-limitations)
- [Roadmap](#roadmap)
- [Demo](#demo)
- [Contributing](#contributing)
- [License](#license)
- [References](#references)

## Overview

Traditional online shopping requires users to search, filter, compare products, validate delivery dates, check availability, navigate checkout, and track payment status. ShopEx uses AI to simplify discovery and decision support without giving the model unrestricted access to the user's money.

AI interprets intent and explains recommendations. Backend and application logic independently validate transaction constraints. The user remains the final authority over payment authorization.

## Problem

AI agents can make shopping easier, but financial actions introduce a critical safety question:

> How can an AI agent complete a shopping journey without allowing the AI to independently spend the user's money?

ShopEx addresses this by separating **shopping intelligence** from **financial authorization**.

## Solution

ShopEx divides the workflow into two layers:

### AI handles shopping complexity

Gemini can understand natural-language requests, extract product requirements, identify budget and delivery constraints, discover products, compare alternatives, and explain recommendations.

### Deterministic systems control financial actions

Application and backend logic independently validate product availability, product relevance, budget limits, delivery requirements, final amounts, user approval, payment state, webhook authenticity, and order state transitions.

## Features

| Feature | Description |
|---|---|
| Natural-language shopping | Users describe their requirements conversationally. |
| AI intent extraction | Gemini converts a request into structured product, preference, budget, and delivery requirements. |
| Product discovery | Products can come from live shopping search or the internal ShopEx catalog. |
| Explainable recommendations | Recommendations include reasons that connect the product to the user's request. |
| Deterministic policy engine | Budget, delivery, stock, relevance, and amount checks are independent of the AI. |
| Explicit approval gate | A payment order is not created until the user selects **Approve & Pay**. |
| Razorpay Test Mode | Approved purchases open Razorpay Checkout without real-money transactions. |
| Verified webhooks | Payment state is updated only after signature verification. |
| Idempotent event handling | Duplicate provider events do not cause duplicate state transitions. |
| Failure-safe payments | Failed payments are recorded and are not silently retried. |
| Audit trail | Purchase, order, payment, and provider events are recorded for traceability. |

## End-to-End Flow

```text
Natural-language request
          |
          v
Gemini intent parser
          |
          v
Structured user intent
          |
          v
Product discovery
     +----+----+
     |         |
     v         v
Live shopping  ShopEx catalog
     +----+----+
          |
          v
Deterministic policy evaluation
          |
          v
Explainable recommendation
          |
          v
Explicit user approval
          |
          v
Razorpay order creation
          |
          v
Razorpay Checkout
          |
          v
Verified Razorpay webhook
          |
          v
Order state update and audit trail
```

### Example request

```text
I need a quiet wireless mechanical keyboard under ₹2,000, delivered within 3 days.
```

The system may extract:

| Requirement | Value |
|---|---|
| Product type | Keyboard |
| Preferences | Quiet, wireless, mechanical |
| Maximum budget | ₹2,000 |
| Delivery requirement | Within 3 days |

The extracted intent guides discovery and evaluation. It does not authorize payment.

## Architecture

```text
                    +----------------------+
                    |      React UI        |
                    |   TypeScript / Vite  |
                    +----------+-----------+
                               |
                               v
                    +----------------------+
                    |   tRPC / Express     |
                    |       Backend        |
                    +----+-----+-----+-----+
                         |     |     |
                         v     v     v
                    +--------+ +----------+ +----------+
                    | Gemini | | Shopping | | Policy   |
                    | Intent | | Discovery| | Engine   |
                    +--------+ +----------+ +----+-----+
                                                  |
                                                  v
                                      +----------------------+
                                      | Explicit User       |
                                      | Approval             |
                                      +----------+-----------+
                                                 |
                                                 v
                                      +----------------------+
                                      | Razorpay Order and   |
                                      | Checkout             |
                                      +----------+-----------+
                                                 |
                                                 v
                                      +----------------------+
                                      | Signature-verified   |
                                      | Webhook              |
                                      +----------+-----------+
                                                 |
                                                 v
                                      +----------------------+
                                      | Order State and      |
                                      | Audit Trail          |
                                      +----------------------+
```

## AI and Deterministic Responsibilities

| Responsibility | Owning component |
|---|---|
| Understand natural language | Google Gemini |
| Extract shopping intent | Google Gemini |
| Discover products | Shopping APIs and internal catalog |
| Filter products | Application logic |
| Validate budget | Deterministic policy engine |
| Validate delivery | Deterministic policy engine |
| Validate stock | Backend |
| Calculate transaction amount | Backend |
| Authorize payment | User |
| Create Razorpay order | Backend |
| Confirm payment | Razorpay webhook |
| Verify webhook authenticity | Backend |
| Maintain order state | Backend |

This boundary prevents a language model from directly controlling financial operations.

## Payment Safety

The payment flow is deliberately gated:

```text
Recommendation
      |
      v
Policy pass
      |
      v
User reviews product and amount
      |
      v
User selects "Approve & Pay"
      |
      v
Backend creates Razorpay order
      |
      v
Razorpay Checkout
      |
      v
Verified payment webhook
      |
      v
Order confirmation and audit event
```

No payment order is created before explicit user approval. A frontend checkout result is not treated as final payment confirmation.

### Webhook endpoint

```text
POST /api/webhooks/razorpay
```

The webhook handler:

1. Receives the Razorpay event.
2. Preserves the raw request body.
3. Verifies the Razorpay webhook signature.
4. Identifies the associated order.
5. Rejects or ignores already-processed event IDs.
6. Updates payment state.
7. Records provider and order timeline events.
8. Updates the user-facing order status.

Supported events include:

- `payment.captured`
- `payment.failed`
- `order.paid`

When a payment fails, ShopEx records the failure and does not silently retry the financial action.

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React and TypeScript |
| Build tool | Vite |
| Styling | Tailwind CSS |
| Backend | Node.js and Express |
| API layer | tRPC |
| Validation | Zod |
| AI | Google Gemini |
| Live product discovery | Serper / Google Shopping |
| Transaction catalog | ShopEx internal catalog |
| ORM | Drizzle ORM |
| Database | MySQL |
| Payments | Razorpay Test Mode |
| Webhooks | Express raw-body handling |
| Authentication | Demo session / application authentication |

## Project Structure

```text
client/
└── src/
    └── Home.tsx
        Main shopping and checkout experience

server/
├── routers/
│   ├── payment.ts
│   │   Payment order and verification flow
│   └── catalog.ts
│       Internal catalog API
├── paymentWebhook.ts
│   Razorpay webhook processing
├── razorpay.ts
│   Razorpay API integration
└── demoCatalog.ts
    Demo transaction catalog

shared/
└── policyEngine.ts
    Deterministic transaction policies
```

## Getting Started

### Prerequisites

- Node.js
- pnpm
- Razorpay Test Mode credentials
- Google Gemini API key
- Serper API key
- MySQL, if required by the active database configuration

### Clone and install

```bash
git clone https://github.com/vishnuvardhanbadveli/ShopEx.git
cd ShopEx
pnpm install
```

## Environment Variables

Create a `.env` file in the project root:

```dotenv
RAZORPAY_KEY_ID=your_razorpay_test_key
RAZORPAY_KEY_SECRET=your_razorpay_test_secret
RAZORPAY_WEBHOOK_SECRET=your_razorpay_webhook_secret

GEMINI_API_KEY=your_gemini_api_key
SERPER_API_KEY=your_serper_api_key
```

| Variable | Purpose |
|---|---|
| `RAZORPAY_KEY_ID` | Razorpay Test Mode key identifier |
| `RAZORPAY_KEY_SECRET` | Server-side Razorpay API secret |
| `RAZORPAY_WEBHOOK_SECRET` | Secret used to verify webhook signatures |
| `GEMINI_API_KEY` | Authenticates Gemini requests |
| `SERPER_API_KEY` | Authenticates Serper shopping-search requests |

Never commit `.env`, API keys, payment secrets, or webhook secrets to GitHub. Use test credentials during development.

## Running Locally

Start the development server:

```bash
pnpm dev
```

Run project checks:

```bash
pnpm check
```

Then follow the demo flow:

1. Enter a natural-language shopping request.
2. Review the extracted intent and product results.
3. Select a recommendation.
4. Review policy checks and the final amount.
5. Select **Approve & Pay**.
6. Complete the Razorpay Test Mode checkout.
7. Verify the order status and audit timeline after webhook processing.

## Testing Payments and Webhooks

ShopEx uses Razorpay Test Mode. No real money is involved in the demo flow.

Test both successful and failed payments. Confirm that failed payments are recorded as failed and are not silently retried.

For local webhook testing, expose the local server through a secure HTTPS tunnel supported by your development environment and configure the public URL in Razorpay Test Mode:

```text
/api/webhooks/razorpay
```

Verify that:

- The raw request body reaches signature verification.
- Invalid signatures cause no payment state change.
- Replaying an event does not duplicate order transitions.
- Unknown events are handled safely.
- Payment state comes from verified provider events rather than client-side success data alone.

## Audit Trail

Important lifecycle events include:

- `PURCHASE_APPROVED`
- `ORDER_CREATED`
- `PAYMENT_CONFIRMED`
- `PAYMENT_FAILED`

Provider events are also recorded. The timeline should make it possible to determine what happened, when it happened, which system performed the action, and what response the payment provider returned.

## Security Considerations

ShopEx is a prototype and should not be treated as production-ready financial infrastructure without further review. Its current safety model includes:

1. Explicit user approval before payment-order creation.
2. Backend validation of product, amount, policy result, and checkout information.
3. Deterministic budget, delivery, availability, and relevance checks.
4. Razorpay webhook signature verification.
5. Idempotent handling of duplicate provider events.
6. No silent payment retries.
7. Environment-based secret management.
8. Razorpay Test Mode for development.

Before production use, add secure session management, authorization controls, rate limiting, secret rotation, durable transaction storage, observability, alerting, threat modeling, and a formal security review.

## Known Limitations

This project is a demonstration of safe agentic commerce. Depending on the active implementation, it may use demo sessions, a limited catalog, simplified persistence, test credentials, and a small set of policy rules.

Live shopping results remain external recommendations. The internal ShopEx catalog is the controlled transaction boundary for the Razorpay demonstration flow.

## Roadmap

- Persistent production-grade transaction storage
- Advanced product ranking
- Personalized recommendations
- Multi-item cart planning
- Merchant onboarding
- Production authentication and authorization
- More granular transaction policies
- Distributed idempotency storage
- Production observability and alerting
- Additional payment and fulfillment providers
- Inventory synchronization
- Expanded automated test coverage

## Demo

**Demo video:** Add the five-minute pitch video URL here.

The demo should show:

```text
Natural language
→ Intent extraction
→ Product recommendation
→ Policy evaluation
→ User approval
→ Razorpay Checkout
→ Verified webhook
→ Order and audit trail
```

## Contributing

Contributions are welcome when they preserve the project's safety boundary: AI may assist with shopping decisions, but financial authorization must remain explicit, validated, and traceable.

```bash
git checkout -b feature/your-change
pnpm check
git status
git add .
git commit -m "feat: describe your change"
git push origin feature/your-change
```

When modifying payment or webhook behavior, document state transitions, failure paths, idempotency behavior, and the test procedure in the pull request. Review every diff for accidentally exposed credentials or sensitive data.

## License

A license has not yet been specified for this repository. Until a `LICENSE` file is added, all rights remain with the repository owner and contributors should not assume that the code may be reused, redistributed, or modified outside the permissions granted by the repository owner.

## References

[1]: https://github.com/vishnuvardhanbadveli/ShopEx "ShopEx GitHub repository"
[2]: https://razorpay.com/docs/ "Razorpay Documentation"
[3]: https://ai.google.dev/gemini-api/docs "Google Gemini API Documentation"
[4]: https://serper.dev/ "Serper API"
[5]: https://react.dev/ "React Documentation"
[6]: https://www.typescriptlang.org/docs/ "TypeScript Documentation"
[7]: https://www.trpc.io/docs "tRPC Documentation"
[8]: https://orm.drizzle.team/docs/overview "Drizzle ORM Documentation"
[9]: https://vite.dev/guide/ "Vite Documentation"

---

**ShopEx — Shopping, Understood**

> Every money action should be explainable, bounded, and gated.
>
> The agent handles the complexity of shopping. The user remains the final authority over the money.

**The agent recommends. The user authorizes.**

### Release checklist

- Replace the demo video placeholder.
- Add the repository's actual license.
- Confirm the environment-variable list matches the implementation.
- Add screenshots or a hosted demo URL.
- Add automated tests for policy evaluation and webhook idempotency.

### Commit the README

```bash
git status
git add README.md
git commit -m "docs: add project README"
git push origin main
```

On Windows PowerShell:

```powershell
cd C:\Users\badve\Downloads\ShopEx
git status
git add README.md
git commit -m "docs: add project README"
git push origin main
```
