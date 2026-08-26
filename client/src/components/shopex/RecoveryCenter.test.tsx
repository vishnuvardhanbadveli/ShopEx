import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Router } from "wouter";
import { RecoveryCenter } from "./RecoveryCenter";

const base = { orderId: "order_pending", amount: 500000, paymentId: null, createdAt: new Date(), updatedAt: new Date(), product: { sku: "KBD", name: "Keyboard", category: "keyboard" as const, price: 5000, stock: 3, delivery: "3 days", deliveryDays: 3, attributes: [], description: "Keyboard", accent: "violet" as const, imageUrl: "/keyboard.png" }, upsell: null, intent: null, shippingAddress: null };

describe("RecoveryCenter", () => {
  it("renders persisted pending and failed states with review actions", () => {
    const markup = renderToStaticMarkup(<Router ssrPath="/profile"><RecoveryCenter orders={[{ ...base, status: "verification_pending" }, { ...base, orderId: "order_failed", status: "failed" }]} /></Router>);
    expect(markup).toContain("Orders that need attention");
    expect(markup).toContain("Payment verification pending");
    expect(markup).toContain("Payment failed — review next step");
    expect(markup).toContain("Review");
  });

  it("stays absent when no order requires recovery", () => {
    const markup = renderToStaticMarkup(<Router ssrPath="/profile"><RecoveryCenter orders={[{ ...base, status: "captured" }]} /></Router>);
    expect(markup).not.toContain("Recovery center");
  });
});
