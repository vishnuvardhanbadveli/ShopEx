import { describe, expect, it } from "vitest";
import { evaluatePolicy } from "./policyEngine";

const baseCandidate = { category: "keyboard", price: 8499, stock: 12, deliveryDays: 4, attributes: ["wireless", "mechanical"] };
const baseConstraints = { requestedCategory: "keyboard", maxPrice: 10000, deliveryDays: 5, attributes: ["wireless", "mechanical"] };

describe("deterministic policy engine", () => {
  it("passes a compliant candidate with explainable reasons", () => {
    const result = evaluatePolicy(baseCandidate, baseConstraints);
    expect(result.pass).toBe(true);
    expect(result.failedReasons).toHaveLength(0);
    expect(result.reasons).toHaveLength(5);
  });

  it("rejects budget, stock, delivery, category, and attribute breaches", () => {
    expect(evaluatePolicy({ ...baseCandidate, price: 11000 }, baseConstraints).failedReasons[0]?.key).toBe("price <= max_price");
    expect(evaluatePolicy({ ...baseCandidate, stock: 0 }, baseConstraints).failedReasons[0]?.key).toBe("stock.available");
    expect(evaluatePolicy({ ...baseCandidate, deliveryDays: 7 }, baseConstraints).failedReasons[0]?.key).toBe("delivery_eta <= requested");
    expect(evaluatePolicy({ ...baseCandidate, category: "mouse" }, baseConstraints).failedReasons[0]?.key).toBe("category = requested");
    expect(evaluatePolicy({ ...baseCandidate, attributes: ["wireless"] }, baseConstraints).failedReasons[0]?.key).toBe("attributes match");
  });
});
