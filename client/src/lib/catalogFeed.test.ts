import { describe, expect, it } from "vitest";
import { validateCatalogFeed } from "./catalogFeed";

describe("catalog feed validation", () => {
  it("accepts the structured merchant feed", () => {
    const result = validateCatalogFeed([{ sku: "SKU-1", name: "Item", category: "keyboard", price: 100, stock: 2, delivery: "2 days", attributes: ["wireless"] }]);
    expect(result).toMatchObject({ valid: true, itemCount: 1, errors: [] });
  });

  it("rejects malformed feed records", () => {
    const result = validateCatalogFeed([{ sku: "", name: "", category: "", price: -1, stock: -2, delivery: "", attributes: [] }]);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(1);
  });
});
