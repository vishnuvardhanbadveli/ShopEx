import { describe, expect, it } from "vitest";
import { parseCheckoutDraft, serializeCheckoutDraft } from "./checkoutDraft";

const draft = { prompt: "I need a quiet keyboard under ₹8,000", intent: { product: "Quiet keyboard", category: "keyboard" as const, budget: 8000, connectivity: "Wireless", purpose: "Writing", deliveryDays: 5, attributes: ["quiet"] }, selectedSku: "KBD-LOGI-MX" };

describe("checkout draft recovery", () => {
  it("round-trips a reviewed intent and selected catalog SKU without any payment data", () => {
    expect(parseCheckoutDraft(serializeCheckoutDraft(draft))).toEqual(draft);
  });

  it("rejects malformed or incomplete browser draft data", () => {
    expect(parseCheckoutDraft("not-json")).toBeNull();
    expect(parseCheckoutDraft(JSON.stringify({ selectedSku: "KBD-LOGI-MX" }))).toBeNull();
  });
});
