import { describe, expect, it } from "vitest";
import { toCatalogItem, type CatalogItem } from "./shopEx";
import { nextOrderStage } from "./orderNavigation";

describe("ShopEx order navigation", () => {
  it("opens order detail from confirmation and order history", () => {
    expect(nextOrderStage("confirmation", "view-order")).toBe("order-detail");
    expect(nextOrderStage("orders", "view-order")).toBe("order-detail");
  });

  it("returns to orders and then back to shopping", () => {
    expect(nextOrderStage("order-detail", "back-to-orders")).toBe("orders");
    expect(nextOrderStage("order-detail", "continue-shopping")).toBe("home");
  });
});

describe("ShopEx product imagery", () => {
  it("preserves the image URL supplied by the database catalog record", () => {
    const item: CatalogItem = { sku: "MSE-ERGONOMIC-OUT", name: "Ergo Mouse Pro", category: "mouse", price: 5999, stock: 0, delivery: "1–2 days", deliveryDays: 2, attributes: ["wireless", "ergonomic"], description: "Unavailable ergonomic mouse.", accent: "amber", imageUrl: "/manus-storage/shopex-ergo-mouse-pro_3e805978.png" };
    expect(toCatalogItem(item).imageUrl).toContain("shopex-ergo-mouse-pro");
  });
});
