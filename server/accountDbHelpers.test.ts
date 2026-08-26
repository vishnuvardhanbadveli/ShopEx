import { afterEach, describe, expect, it, vi } from "vitest";

type FakeDb = ReturnType<typeof createFakeDb>;

function createFakeDb(selectRows: unknown[][]) {
  const select = vi.fn(() => {
    const rows = selectRows.shift() ?? [];
    const chain = {
      from: vi.fn(),
      where: vi.fn(),
      orderBy: vi.fn(),
      limit: vi.fn(),
    };
    chain.from.mockReturnValue(chain);
    chain.where.mockReturnValue(chain);
    chain.orderBy.mockReturnValue(chain);
    chain.limit.mockResolvedValue(rows);
    return chain;
  });
  const update = vi.fn(() => {
    const chain = { set: vi.fn() };
    chain.set.mockReturnValue({ where: vi.fn().mockResolvedValue({}) });
    return chain;
  });
  const remove = vi.fn(() => ({ where: vi.fn().mockResolvedValue({}) }));
  const insertValues = vi.fn(() => ({ onDuplicateKeyUpdate: vi.fn().mockResolvedValue({}) }));
  const insert = vi.fn(() => ({ values: insertValues }));
  return { select, update, delete: remove, insert, insertValues };
}

async function loadHelpers(selectRows: unknown[][]) {
  const db = createFakeDb(selectRows);
  vi.resetModules();
  vi.doMock("drizzle-orm/mysql2", () => ({ drizzle: vi.fn(() => db) }));
  process.env.DATABASE_URL = "mysql://account-helper-test";
  const helpers = await import("./db");
  return { db, helpers };
}

afterEach(() => {
  vi.doUnmock("drizzle-orm/mysql2");
  vi.resetModules();
});

describe("account database helper contracts", () => {
  it("deletes a default address and promotes a remaining customer-owned replacement", async () => {
    const { db, helpers } = await loadHelpers([[{ id: 10, isDefault: true }], [{ id: 11 }]]);
    await expect(helpers.deleteSavedAddressForUser(7, 10)).resolves.toBe("deleted");
    expect(db.delete).toHaveBeenCalledTimes(1);
    expect(db.update).toHaveBeenCalledTimes(1);
  });

  it("deletes a non-default address without changing any other default address", async () => {
    const { db, helpers } = await loadHelpers([[{ id: 12, isDefault: false }]]);
    await expect(helpers.deleteSavedAddressForUser(7, 12)).resolves.toBe("deleted");
    expect(db.delete).toHaveBeenCalledTimes(1);
    expect(db.update).not.toHaveBeenCalled();
    expect(db.select).toHaveBeenCalledTimes(1);
  });

  it("records catalog admin changes with before and after snapshots", async () => {
    const product = { sku: "KBD-1", name: "Keyboard", category: "keyboard", price: 5000, stock: 3, deliveryDays: 3, deliveryLabel: "3 days", attributes: '["wireless"]', description: "Keyboard", accent: "violet", imageUrl: "/keyboard.png", createdAt: new Date(), updatedAt: new Date() };
    const { db, helpers } = await loadHelpers([[], [product]]);
    await expect(helpers.upsertCatalogProductByAdmin(9, { sku: "KBD-1", name: "Keyboard", category: "keyboard", price: 5500, stock: 2, deliveryDays: 3, deliveryLabel: "3 days", attributes: ["wireless"], description: "Keyboard", accent: "violet", imageUrl: "/keyboard.png" })).resolves.toBe("created");
    expect(db.insert).toHaveBeenCalledTimes(2);
    expect(db.insertValues).toHaveBeenLastCalledWith(expect.objectContaining({ operatorId: 9, sku: "KBD-1", action: "created", beforeSnapshot: null, afterSnapshot: expect.stringContaining("Keyboard") }));
  });

  it("increments the durable session version for global revocation", async () => {
    const { db, helpers } = await loadHelpers([[{ sessionVersion: 4 }]]);
    await expect(helpers.incrementUserSessionVersion(7)).resolves.toBe("updated");
    expect(db.update).toHaveBeenCalledTimes(1);
  });

  it("aggregates checkout and webhook observability without payment payloads", async () => {
    const { helpers } = await loadHelpers([[{ eventType: "checkout_order_create", outcome: "success", durationMs: 80 }, { eventType: "webhook_payment_captured", outcome: "accepted", durationMs: null }]]);
    const result = await helpers.getObservabilitySummary();
    expect(result).toMatchObject({ summary: { checkout_order_create: { total: 1, failures: 0 }, webhook_payment_captured: { total: 1, failures: 1 } } });
  });

  it("persists a new active session record", async () => {
    const { db, helpers } = await loadHelpers([]);
    await expect(helpers.createActiveSession(7, "token-1")).resolves.toBe("created");
    expect(db.insertValues).toHaveBeenCalledWith(expect.objectContaining({ userId: 7, tokenId: "token-1" }));
  });

  it("persists encoded preferences and maps the subsequent stored row back to customer values", async () => {
    const { db, helpers } = await loadHelpers([[{ userId: 7, favoriteCategories: '["keyboard","mouse"]', maxBudget: 12000, deliveryPreference: "fastest", orderUpdates: true, deliveryUpdates: false, productUpdates: true, marketingUpdates: false, updatedAt: new Date("2026-08-25T00:00:00.000Z") }]]);
    const preferences = { favoriteCategories: ["keyboard", "mouse"] as Array<"keyboard" | "mouse" | "accessory">, maxBudget: 12000, deliveryPreference: "fastest" as const, orderUpdates: true, deliveryUpdates: false, productUpdates: true, marketingUpdates: false };
    await expect(helpers.saveAccountPreferencesForUser(7, preferences)).resolves.toBe("saved");
    expect(db.insertValues).toHaveBeenCalledWith(expect.objectContaining({ userId: 7, favoriteCategories: '["keyboard","mouse"]' }));
    await expect(helpers.getAccountPreferencesForUser(7)).resolves.toMatchObject(preferences);
  });
});
