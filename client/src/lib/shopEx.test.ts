import { describe, expect, it } from "vitest";
import { money, toCatalogItem, type CatalogItem } from "./shopEx";

const databaseCatalogRecord: CatalogItem = {
  sku: "KBD-LOGI-MX",
  name: "Logitech MX Keys S",
  category: "keyboard",
  price: 6999,
  stock: 4,
  delivery: "2–3 days",
  deliveryDays: 3,
  attributes: ["wireless", "quiet", "multi-device"],
  description: "Quiet wireless keyboard with a comfortable layout for long programming sessions.",
  accent: "indigo",
  imageUrl: "/manus-storage/shopex-logitech-mx-keys-s_7e7e34ab.png",
};

describe("ShopEx buyer contracts", () => {
  it("maps a database catalog record into the buyer contract", () => {
    expect(toCatalogItem(databaseCatalogRecord)).toEqual(databaseCatalogRecord);
  });

  it("formats buyer-facing Indian rupee values", () => {
    expect(money(6499)).toBe("₹6,499");
  });
});
