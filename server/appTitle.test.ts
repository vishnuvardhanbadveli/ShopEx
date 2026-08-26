import { describe, expect, it } from "vitest";

describe("application title configuration", () => {
  it("uses the ShopEx product title", () => {
    expect(process.env.VITE_APP_TITLE).toBe("ShopEx");
  });
});
