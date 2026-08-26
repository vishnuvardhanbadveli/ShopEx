import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const mocks = vi.hoisted(() => ({
  listSavedAddressesForUser: vi.fn(),
  getAccountPreferencesForUser: vi.fn(),
  createSavedAddressForUser: vi.fn(),
  updateSavedAddressForUser: vi.fn(),
  setDefaultSavedAddressForUser: vi.fn(),
  deleteSavedAddressForUser: vi.fn(),
  saveAccountPreferencesForUser: vi.fn(),
}));

vi.mock("./db", () => mocks);

import { appRouter } from "./routers";

const user = { id: 41, openId: "buyer-41", name: "Buyer", email: "buyer@example.com", loginMethod: "test", role: "user" as const, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() };
const context = { user, req: { protocol: "https", headers: {} }, res: {} } as TrpcContext;
const address = { label: "Home", recipientName: "Buyer", line1: "12 Market Road", line2: null, city: "Pune", state: "Maharashtra", postalCode: "411001", country: "IN", phone: "9876543210", isDefault: true };
const preferences = { favoriteCategories: ["keyboard"] as const, maxBudget: 8000, deliveryPreference: "standard" as const, orderUpdates: true, deliveryUpdates: true, productUpdates: true, marketingUpdates: false, updatedAt: null };

describe("account router", () => {
  beforeEach(() => {
    Object.values(mocks).forEach((mock) => mock.mockReset());
    mocks.listSavedAddressesForUser.mockResolvedValue([]);
    mocks.getAccountPreferencesForUser.mockResolvedValue(preferences);
    mocks.createSavedAddressForUser.mockResolvedValue("created");
    mocks.updateSavedAddressForUser.mockResolvedValue("updated");
    mocks.setDefaultSavedAddressForUser.mockResolvedValue("updated");
    mocks.deleteSavedAddressForUser.mockResolvedValue("deleted");
    mocks.saveAccountPreferencesForUser.mockResolvedValue("saved");
  });

  it("reads only the authenticated customer’s saved addresses and preferences", async () => {
    await expect(appRouter.createCaller(context).account.overview()).resolves.toEqual({ addresses: [], preferences });
    expect(mocks.listSavedAddressesForUser).toHaveBeenCalledWith(41);
    expect(mocks.getAccountPreferencesForUser).toHaveBeenCalledWith(41);
  });

  it("creates a normalized address only for the authenticated customer", async () => {
    await expect(appRouter.createCaller(context).account.addAddress({ ...address, country: "in" })).resolves.toEqual({ success: true });
    expect(mocks.createSavedAddressForUser).toHaveBeenCalledWith(41, { ...address, country: "IN" });
  });

  it("does not expose cross-user address updates when ownership lookup fails", async () => {
    mocks.updateSavedAddressForUser.mockResolvedValue("not_found");
    await expect(appRouter.createCaller(context).account.updateAddress({ id: 999, address })).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(mocks.updateSavedAddressForUser).toHaveBeenCalledWith(41, 999, address);
  });

  it("persists customer preferences and notification choices under the authenticated user", async () => {
    const input = { favoriteCategories: ["keyboard", "mouse"] as Array<"keyboard" | "mouse" | "accessory">, maxBudget: 12000, deliveryPreference: "fastest" as const, orderUpdates: true, deliveryUpdates: false, productUpdates: true, marketingUpdates: false };
    await expect(appRouter.createCaller(context).account.savePreferences(input)).resolves.toEqual({ success: true });
    expect(mocks.saveAccountPreferencesForUser).toHaveBeenCalledWith(41, input);
  });

  it("routes create, update-to-default, default reassignment, and deletion through user-scoped helpers", async () => {
    const caller = appRouter.createCaller(context);
    await expect(caller.account.addAddress(address)).resolves.toEqual({ success: true });
    await expect(caller.account.updateAddress({ id: 12, address: { ...address, label: "Work", isDefault: true } })).resolves.toEqual({ success: true });
    await expect(caller.account.setDefaultAddress({ id: 13 })).resolves.toEqual({ success: true });
    await expect(caller.account.deleteAddress({ id: 12 })).resolves.toEqual({ success: true });
    expect(mocks.createSavedAddressForUser).toHaveBeenCalledWith(41, address);
    expect(mocks.updateSavedAddressForUser).toHaveBeenCalledWith(41, 12, { ...address, label: "Work", isDefault: true });
    expect(mocks.setDefaultSavedAddressForUser).toHaveBeenCalledWith(41, 13);
    expect(mocks.deleteSavedAddressForUser).toHaveBeenCalledWith(41, 12);
  });

  it("returns saved preference values when the customer reopens account settings", async () => {
    const saved = { ...preferences, favoriteCategories: ["mouse"] as const, deliveryUpdates: false };
    mocks.getAccountPreferencesForUser.mockResolvedValue(saved);
    const result = await appRouter.createCaller(context).account.overview();
    expect(result.preferences).toEqual(saved);
    expect(mocks.getAccountPreferencesForUser).toHaveBeenCalledWith(41);
  });

  it("rejects malformed address and preference inputs before they reach persistence", async () => {
    await expect(appRouter.createCaller(context).account.addAddress({ ...address, country: "IND" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(appRouter.createCaller(context).account.savePreferences({ favoriteCategories: ["keyboard", "mouse", "accessory", "keyboard"], maxBudget: 99, deliveryPreference: "standard", orderUpdates: true, deliveryUpdates: true, productUpdates: true, marketingUpdates: false })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(mocks.createSavedAddressForUser).not.toHaveBeenCalled();
    expect(mocks.saveAccountPreferencesForUser).not.toHaveBeenCalled();
  });
});
