import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { OrderDetailView } from "./OrderDetailView";

const order = { orderId: "order_captured", amount: 699900, status: "captured" as const, paymentId: "pay_1", createdAt: new Date(), updatedAt: new Date(), product: { sku: "KBD-1", name: "Keyboard", category: "keyboard" as const, price: 6999, stock: 4, delivery: "2–3 days", deliveryDays: 3, attributes: ["wireless"], description: "Quiet keyboard", accent: "indigo" as const, imageUrl: "/keyboard.png" }, upsell: null, intent: null, shippingAddress: null };

describe("OrderDetailView progress", () => {
  it("renders the persisted current stage as a badge and accessible progressbar", () => {
    const markup = renderToStaticMarkup(<OrderDetailView order={order} onBack={() => undefined} onShop={() => undefined} />);
    expect(markup).toContain("Order progress");
    expect(markup).toContain("Order confirmed");
    expect(markup).toContain('role="progressbar"');
    expect(markup).toContain('aria-valuenow="4"');
  });
});
