import { describe, expect, it, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Router } from "wouter";

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  myOrdersQuery: vi.fn(),
  orderStatusQuery: vi.fn(),
  orderTimelineQuery: vi.fn(),
  resumeOrderQuery: vi.fn(),
  accountOverviewQuery: vi.fn(),
  invalidate: vi.fn(),
  mutation: { mutate: vi.fn(), isPending: false, isSuccess: false, error: null },
}));

vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: mocks.useAuth }));
vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ account: { overview: { invalidate: mocks.invalidate } } }),
    payment: { myOrders: { useQuery: mocks.myOrdersQuery }, orderStatus: { useQuery: mocks.orderStatusQuery }, orderTimeline: { useQuery: mocks.orderTimelineQuery }, resumeOrder: { useQuery: mocks.resumeOrderQuery } },
    account: {
      overview: { useQuery: mocks.accountOverviewQuery },
      notifications: { useQuery: () => ({ data: [], isLoading: false, isError: false }) },
      markNotificationRead: { useMutation: () => mocks.mutation },
      securityOverview: { useQuery: () => ({ data: { lastSignedIn: new Date(), sessionVersion: 0, sessions: [{ id: 1, deviceLabel: "ShopEx browser session", createdAt: new Date(), lastSeenAt: new Date(), revokedAt: null }] }, isLoading: false, isError: false }) },
      revokeAllSessions: { useMutation: () => mocks.mutation },
      revokeSession: { useMutation: () => mocks.mutation },
      addAddress: { useMutation: () => mocks.mutation },
      updateAddress: { useMutation: () => mocks.mutation },
      deleteAddress: { useMutation: () => mocks.mutation },
      setDefaultAddress: { useMutation: () => mocks.mutation },
      savePreferences: { useMutation: () => mocks.mutation },
    },
  },
}));

import Profile, { CustomerOrderDetail } from "./Profile";

const user = { id: 7, openId: "buyer", name: "Asha Shah", email: "asha@example.com", loginMethod: "test", role: "user" as const, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() };
const order = { orderId: "order_profile_123", amount: 699900, status: "captured" as const, paymentId: "pay_123", createdAt: new Date("2026-08-25T00:00:00.000Z"), updatedAt: new Date(), product: { sku: "KBD-LOGI-MX", name: "Logitech MX Keys S", category: "keyboard" as const, price: 6999, stock: 4, delivery: "2–3 days", deliveryDays: 3, attributes: ["wireless"], description: "Quiet keyboard", accent: "indigo" as const, imageUrl: "/product.png" }, upsell: null, intent: null };
const accountOverview = { data: { addresses: [], preferences: { favoriteCategories: ["keyboard"] as Array<"keyboard" | "mouse" | "accessory">, maxBudget: 8000, deliveryPreference: "standard" as const, orderUpdates: true, deliveryUpdates: true, productUpdates: true, marketingUpdates: false, updatedAt: null } }, isLoading: false, isError: false };

describe("customer profile routes", () => {
  it("requests the authenticated redirect behavior and renders the current user's persisted order statuses", () => {
    mocks.useAuth.mockReturnValue({ user, loading: false });
    mocks.myOrdersQuery.mockReturnValue({ data: [order], isLoading: false, isError: false });
    mocks.accountOverviewQuery.mockReturnValue(accountOverview);
    const markup = renderToStaticMarkup(<Router ssrPath="/profile"><Profile /></Router>);
    expect(mocks.useAuth).toHaveBeenCalledWith({ redirectOnUnauthenticated: true });
    expect(markup).toContain("Asha Shah");
    expect(markup).toContain("Payment confirmed");
    expect(markup).toContain("Logitech MX Keys S");
    expect(markup).toContain("Saved addresses");
    expect(markup).toContain("Shopping preferences");
    expect(markup).toContain("Recent sessions");
    expect(markup).toContain("ShopEx browser session");
  });

  it("renders a customer-owned order detail from the protected order-status response", () => {
    mocks.useAuth.mockReturnValue({ user, loading: false });
    mocks.orderStatusQuery.mockReturnValue({ data: { available: true, order }, isLoading: false, isError: false });
    mocks.orderTimelineQuery.mockReturnValue({ data: [], isLoading: false, isError: false });
    mocks.resumeOrderQuery.mockReturnValue({ refetch: vi.fn(async () => ({ data: null })) });
    const markup = renderToStaticMarkup(<Router ssrPath="/profile/orders/order_profile_123"><CustomerOrderDetail /></Router>);
    expect(markup).toContain("Order detail");
    expect(markup).toContain("Payment confirmed");
    expect(markup).toContain("order_profile_123");
  });
});
