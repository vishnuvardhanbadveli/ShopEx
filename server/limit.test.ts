import { describe, expect, it } from "vitest";
import { safeLimit } from "./routers/payment";

describe("safeLimit", () => {
  it("normalizes zero and negative values to the route default", () => {
    const schema = safeLimit(20, 50);
    expect(schema.parse(0)).toBe(20);
    expect(schema.parse(-1)).toBe(20);
    expect(schema.parse(undefined)).toBe(20);
  });

  it("still rejects values beyond the route maximum", () => {
    expect(() => safeLimit(20, 50).parse(51)).toThrow();
  });
});
