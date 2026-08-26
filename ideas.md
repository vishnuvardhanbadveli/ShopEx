# Agent Checkout Protocol — Design Brainstorm

## Three stylistic approaches

### Theme Name: Signal Ledger
Very Brief Intro: A dark, editorial operations console where every decision leaves a visible signal. Designed to make agent reasoning feel inspectable rather than magical.
Probability: 0.07

### Theme Name: Paper Trail
Very Brief Intro: A warm, documentation-first interface inspired by annotated invoices, compliance binders, and modern civic software. Trust comes from legibility, restraint, and visible provenance.
Probability: 0.03

### Theme Name: Merchant Loom
Very Brief Intro: A luminous, tactile commerce workspace using woven lines and modular product tiles to connect catalog facts to checkout actions. Friendly, but still rigorous.
Probability: 0.08

## Chosen direction: Signal Ledger

### Design Movement
Contemporary editorial control-room design, combining Swiss information design with the material language of a night operations desk: crisp hierarchy, deliberate asymmetry, strong baseline alignment, and a restrained high-contrast palette.

### Core Principles
1. **Every claim has a source.** The UI pairs decisions with the exact catalog field or policy rule that supports them.
2. **Gates are visible.** Payment is never implied; the approval state is a distinct, deliberate checkpoint.
3. **Constraints shape the composition.** Budget, category, stock, and delivery are rendered as active guardrails rather than hidden form fields.
4. **Failure is informative.** Rejection and payment failure explain the next safe action without silently retrying.

### Color Philosophy
The base is ink-black and graphite, creating the feeling of a live audit surface rather than a storefront. A signature acid-lime is reserved for verified state and policy passes; signal amber marks attention and bounded upsell; a mineral blue is used for neutral machine context. Color communicates system state, not decoration.

### Layout Paradigm
A persistent left rail presents the protocol stages as a vertical trace. The main workspace uses an asymmetric split: conversational activity on the left, evidence and audit context on the right. Cards are rectangular, slightly offset, and organized by the order in which a decision becomes trustworthy.

### Signature Elements
- A vertical **protocol spine** with numbered stages and live status dots.
- **Evidence chips** that expose the field or rule behind a claim, such as `budget.max` or `stock.available`.
- A recurring **scanline grid** and fine rulework that make the app feel like an instrument panel without resorting to neon cyberpunk.

### Interaction Philosophy
Interactions should feel like moving a transaction through a controlled protocol. User intent is captured quickly, system checks are explicit, and consequential actions require a clear pause. Hover states reveal provenance; approval actions use direct language and never disguise the effect.

### Animation
Use short, snappy transitions under 240ms for tabs, evidence chips, and status changes. New audit events slide in from the protocol spine with a small opacity-and-translate transition. Policy pass and payment failure use a single restrained pulse on the status marker; no looping motion. Respect reduced-motion preferences.

### Typography System
Use **Space Grotesk** for headlines, stage labels, prices, and system states; use **IBM Plex Mono** for SKUs, evidence keys, timestamps, and audit entries; use **DM Sans** for conversational body copy. Headlines are compact and slightly tracked out; evidence is always monospaced and visually quieter than the decision it supports.

### Brand Essence
A transparent checkout protocol for AI buyers and the people who approve them — built for teams that need speed without surrendering control. Personality: **precise, candid, composed**.

### Brand Voice
Headlines are declarative and specific. CTAs say exactly what will happen. Microcopy names the boundary or next action instead of using generic reassurance.

Example lines:
- “The agent found a match. The policy engine verified the boundary.”
- “Approve ₹8,499 via Razorpay test mode.”

### Wordmark & Logo
The mark is a compact **split-bracket glyph**: two offset ledger brackets surrounding a single lime verification tick. It reads as a protocol boundary and an approved transaction without using text. The wordmark uses a custom-spaced uppercase treatment of “TRACE / PAY” beside the glyph.

### Signature Brand Color
**Signal Lime — #C6F36B.** It is ownable because it is neither conventional fintech green nor generic SaaS blue: it reads as a measured system signal against the ink-black surface, reserved only for verified facts and approved transitions.

## Prototype interaction contract

The demo will start with a preloaded natural-language request for a work-from-home keyboard under ₹10,000, with delivery within five days. The agent will translate it into structured constraints, select a catalog candidate, and expose the matching fields. The deterministic policy engine will show a pass with reasons. A single keyboard accessory will be offered as a bounded upsell and rechecked against the same budget. The payment action will remain gated until the user explicitly approves it.

The graceful failure path will be a visible simulated Razorpay decline. The audit trail will record the attempted payment with `RESULT: failed`, and the agent will not retry silently; it will ask whether the user wants to choose another payment action or return to the approved cart.
