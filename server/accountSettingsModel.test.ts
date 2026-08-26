import { describe, expect, it } from "vitest";
import { decodeFavoriteCategories, defaultOnAddressCreate, defaultOnAddressUpdate, encodeFavoriteCategories, promoteReplacementAfterDelete } from "./accountSettingsModel";

describe("account settings persistence rules", () => {
  it("makes the first address default and preserves an existing default through edits", () => {
    expect(defaultOnAddressCreate(0, false)).toBe(true);
    expect(defaultOnAddressCreate(2, false)).toBe(false);
    expect(defaultOnAddressCreate(2, true)).toBe(true);
    expect(defaultOnAddressUpdate(true, false)).toBe(true);
    expect(defaultOnAddressUpdate(false, true)).toBe(true);
  });

  it("promotes a replacement only after a default address is deleted", () => {
    expect(promoteReplacementAfterDelete(true, true)).toBe(true);
    expect(promoteReplacementAfterDelete(false, true)).toBe(false);
    expect(promoteReplacementAfterDelete(true, false)).toBe(false);
  });

  it("round-trips permitted preference categories and rejects malformed stored values", () => {
    expect(decodeFavoriteCategories(encodeFavoriteCategories(["keyboard", "mouse"]))).toEqual(["keyboard", "mouse"]);
    expect(decodeFavoriteCategories('["keyboard","other"]')).toEqual([]);
    expect(decodeFavoriteCategories("not-json")).toEqual([]);
  });
});
