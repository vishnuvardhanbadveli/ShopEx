import { and, desc, eq, gt, isNull, lte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { activeSessions, catalogProducts, catalogChangeEvents, InsertCatalogChangeEvent, InsertPaymentEvent, InsertPaymentOrder, InsertUser, InsertOrderTimelineEvent, InsertUserNotification, InsertObservabilityEvent, observabilityEvents, orderTimelineEvents, paymentEvents, paymentOrders, savedAddresses, userNotifications, userPreferences, users } from "../drizzle/schema";
import { ENV } from './_core/env';
import { decodeFavoriteCategories, defaultOnAddressCreate, defaultOnAddressUpdate, encodeFavoriteCategories, promoteReplacementAfterDelete } from "./accountSettingsModel";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

type CatalogFilter = {
  category?: "keyboard" | "mouse" | "accessory";
  maxPrice?: number;
  maxDeliveryDays?: number;
  includeOutOfStock?: boolean;
};

function decodeAttributes(value: string) {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) && parsed.every((attribute) => typeof attribute === "string") ? parsed : [];
  } catch {
    return [];
  }
}

function mapCatalogProduct(product: typeof catalogProducts.$inferSelect) {
  return {
    sku: product.sku,
    name: product.name,
    category: product.category,
    price: product.price,
    stock: product.stock,
    delivery: product.deliveryLabel,
    deliveryDays: product.deliveryDays,
    attributes: decodeAttributes(product.attributes),
    description: product.description,
    accent: product.accent,
    imageUrl: product.imageUrl,
    updatedAt: product.updatedAt,
  };
}

type StoredCatalogSnapshot = {
  sku: string;
  name: string;
  category: "keyboard" | "mouse" | "accessory";
  price: number;
  stock: number;
  delivery: string;
  deliveryDays: number;
  attributes: string[];
  description: string;
  accent: "violet" | "indigo" | "green" | "amber";
  imageUrl: string;
};

function decodeSnapshot(value: string | null): StoredCatalogSnapshot | null {
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object") return null;
    const item = parsed as Partial<StoredCatalogSnapshot>;
    if (!item.sku || !item.name || !item.category || !item.price || !item.delivery || !item.deliveryDays || !Array.isArray(item.attributes) || !item.description || !item.accent || !item.imageUrl) return null;
    return item as StoredCatalogSnapshot;
  } catch {
    return null;
  }
}

function decodeJsonSnapshot(value: string | null) {
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function decodeIntentSnapshot(value: string | null) {
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export function mapPaymentOrderForBuyer(order: typeof paymentOrders.$inferSelect) {
  return {
    orderId: order.orderId,
    amount: order.amount,
    status: order.status,
    paymentId: order.paymentId,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    product: decodeSnapshot(order.productSnapshot),
    upsell: decodeSnapshot(order.upsellSnapshot),
    intent: decodeIntentSnapshot(order.intentSnapshot),
    shippingAddress: decodeJsonSnapshot(order.shippingAddressSnapshot),
  };
}

export async function listCatalogProducts(filter: CatalogFilter = {}) {
  const db = await getDb();
  if (!db) return "unavailable" as const;

  const conditions = [
    filter.category ? eq(catalogProducts.category, filter.category) : undefined,
    filter.maxPrice ? lte(catalogProducts.price, filter.maxPrice) : undefined,
    filter.maxDeliveryDays ? lte(catalogProducts.deliveryDays, filter.maxDeliveryDays) : undefined,
    filter.includeOutOfStock ? undefined : gt(catalogProducts.stock, 0),
  ].filter(Boolean);
  const rows = await db.select().from(catalogProducts).where(conditions.length ? and(...conditions) : undefined).orderBy(catalogProducts.price);
  return rows.map(mapCatalogProduct);
}

export async function getCatalogProductBySku(sku: string) {
  const db = await getDb();
  if (!db) return "unavailable" as const;
  const rows = await db.select().from(catalogProducts).where(eq(catalogProducts.sku, sku)).limit(1);
  return rows[0] ? mapCatalogProduct(rows[0]) : null;
}

export async function createPaymentOrder(order: InsertPaymentOrder): Promise<"inserted" | "duplicate" | "unavailable"> {
  const db = await getDb();
  if (!db) return "unavailable";
  try {
    await db.insert(paymentOrders).values(order);
    return "inserted";
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "ER_DUP_ENTRY") return "duplicate";
    throw error;
  }
}

export async function getPaymentOrder(orderId: string) {
  const db = await getDb();
  if (!db) return "unavailable" as const;
  const result = await db.select().from(paymentOrders).where(eq(paymentOrders.orderId, orderId)).limit(1);
  return result[0];
}

export async function getPaymentOrderForBuyer(orderId: string, buyerId: number) {
  const db = await getDb();
  if (!db) return "unavailable" as const;
  const result = await db.select().from(paymentOrders).where(and(eq(paymentOrders.orderId, orderId), eq(paymentOrders.buyerId, buyerId))).limit(1);
  return result[0] ?? null;
}

export async function listPaymentOrdersForBuyer(buyerId: number, limit = 25) {
  const db = await getDb();
  if (!db) return "unavailable" as const;
  const rows = await db.select().from(paymentOrders).where(eq(paymentOrders.buyerId, buyerId)).orderBy(desc(paymentOrders.createdAt)).limit(Math.min(limit, 50));
  return rows;
}

export async function updatePaymentOrder(orderId: string, status: "created" | "verification_pending" | "verified" | "failed" | "captured", paymentId?: string) {
  const db = await getDb();
  if (!db) return "unavailable" as const;
  await db.update(paymentOrders).set({ status, ...(paymentId ? { paymentId } : {}) }).where(eq(paymentOrders.orderId, orderId));
  return "updated" as const;
}

export async function listRecentPaymentEvents(limit = 20) {
  const db = await getDb();
  if (!db) return [];
  return db.select({ eventId: paymentEvents.eventId, eventType: paymentEvents.eventType, orderId: paymentEvents.orderId, createdAt: paymentEvents.createdAt }).from(paymentEvents).orderBy(desc(paymentEvents.createdAt)).limit(Math.min(limit, 50));
}

export async function listPaymentEventsForOrder(orderId: string, limit = 20) {
  const db = await getDb();
  if (!db) return "unavailable" as const;
  return db.select({ eventId: paymentEvents.eventId, eventType: paymentEvents.eventType, orderId: paymentEvents.orderId, createdAt: paymentEvents.createdAt }).from(paymentEvents).where(eq(paymentEvents.orderId, orderId)).orderBy(desc(paymentEvents.createdAt)).limit(Math.min(limit, 50));
}

export async function recordPaymentEvent(event: InsertPaymentEvent): Promise<"inserted" | "duplicate" | "unavailable"> {
  const db = await getDb();
  if (!db) return "unavailable";
  try {
    await db.insert(paymentEvents).values(event);
    return "inserted";
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "ER_DUP_ENTRY") {
      return "duplicate";
    }
    throw error;
  }
}

export type AccountAddressInput = {
  label: string;
  recipientName: string;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone: string;
  isDefault: boolean;
};

export type AccountPreferenceInput = {
  favoriteCategories: Array<"keyboard" | "mouse" | "accessory">;
  maxBudget: number | null;
  deliveryPreference: "standard" | "fastest" | "flexible";
  orderUpdates: boolean;
  deliveryUpdates: boolean;
  productUpdates: boolean;
  marketingUpdates: boolean;
};

const defaultAccountPreferences: AccountPreferenceInput = {
  favoriteCategories: [],
  maxBudget: null,
  deliveryPreference: "standard",
  orderUpdates: true,
  deliveryUpdates: true,
  productUpdates: true,
  marketingUpdates: false,
};

function mapAccountPreferences(row: typeof userPreferences.$inferSelect | undefined): AccountPreferenceInput & { updatedAt: Date | null } {
  if (!row) return { ...defaultAccountPreferences, updatedAt: null };
  return {
    favoriteCategories: decodeFavoriteCategories(row.favoriteCategories),
    maxBudget: row.maxBudget,
    deliveryPreference: row.deliveryPreference,
    orderUpdates: row.orderUpdates,
    deliveryUpdates: row.deliveryUpdates,
    productUpdates: row.productUpdates,
    marketingUpdates: row.marketingUpdates,
    updatedAt: row.updatedAt,
  };
}

export async function getSavedAddressForUser(userId: number, addressId: number) {
  const db = await getDb();
  if (!db) return "unavailable" as const;
  const rows = await db.select().from(savedAddresses).where(and(eq(savedAddresses.id, addressId), eq(savedAddresses.userId, userId))).limit(1);
  return rows[0] ?? null;
}

export async function listSavedAddressesForUser(userId: number) {
  const db = await getDb();
  if (!db) return "unavailable" as const;
  return db.select().from(savedAddresses).where(eq(savedAddresses.userId, userId)).orderBy(desc(savedAddresses.isDefault), desc(savedAddresses.createdAt));
}

export async function createSavedAddressForUser(userId: number, input: AccountAddressInput) {
  const db = await getDb();
  if (!db) return "unavailable" as const;
  const existing = await db.select({ id: savedAddresses.id }).from(savedAddresses).where(eq(savedAddresses.userId, userId)).limit(1);
  const isDefault = defaultOnAddressCreate(existing.length, input.isDefault);
  if (isDefault) await db.update(savedAddresses).set({ isDefault: false }).where(eq(savedAddresses.userId, userId));
  await db.insert(savedAddresses).values({ userId, ...input, isDefault, line2: input.line2 || null });
  return "created" as const;
}

export async function updateSavedAddressForUser(userId: number, addressId: number, input: AccountAddressInput) {
  const db = await getDb();
  if (!db) return "unavailable" as const;
  const existing = await db.select({ id: savedAddresses.id, isDefault: savedAddresses.isDefault }).from(savedAddresses).where(and(eq(savedAddresses.id, addressId), eq(savedAddresses.userId, userId))).limit(1);
  if (!existing[0]) return "not_found" as const;
  const isDefault = defaultOnAddressUpdate(existing[0].isDefault, input.isDefault);
  if (isDefault) await db.update(savedAddresses).set({ isDefault: false }).where(eq(savedAddresses.userId, userId));
  await db.update(savedAddresses).set({ ...input, isDefault, line2: input.line2 || null }).where(and(eq(savedAddresses.id, addressId), eq(savedAddresses.userId, userId)));
  return "updated" as const;
}

export async function setDefaultSavedAddressForUser(userId: number, addressId: number) {
  const db = await getDb();
  if (!db) return "unavailable" as const;
  const existing = await db.select({ id: savedAddresses.id }).from(savedAddresses).where(and(eq(savedAddresses.id, addressId), eq(savedAddresses.userId, userId))).limit(1);
  if (!existing[0]) return "not_found" as const;
  await db.update(savedAddresses).set({ isDefault: false }).where(eq(savedAddresses.userId, userId));
  await db.update(savedAddresses).set({ isDefault: true }).where(and(eq(savedAddresses.id, addressId), eq(savedAddresses.userId, userId)));
  return "updated" as const;
}

export async function deleteSavedAddressForUser(userId: number, addressId: number) {
  const db = await getDb();
  if (!db) return "unavailable" as const;
  const existing = await db.select({ id: savedAddresses.id, isDefault: savedAddresses.isDefault }).from(savedAddresses).where(and(eq(savedAddresses.id, addressId), eq(savedAddresses.userId, userId))).limit(1);
  if (!existing[0]) return "not_found" as const;
  await db.delete(savedAddresses).where(and(eq(savedAddresses.id, addressId), eq(savedAddresses.userId, userId)));
  if (existing[0].isDefault) {
    const replacement = await db.select({ id: savedAddresses.id }).from(savedAddresses).where(eq(savedAddresses.userId, userId)).orderBy(desc(savedAddresses.createdAt)).limit(1);
    if (promoteReplacementAfterDelete(existing[0].isDefault, Boolean(replacement[0]))) await db.update(savedAddresses).set({ isDefault: true }).where(and(eq(savedAddresses.id, replacement[0]!.id), eq(savedAddresses.userId, userId)));
  }
  return "deleted" as const;
}

export async function getAccountPreferencesForUser(userId: number) {
  const db = await getDb();
  if (!db) return "unavailable" as const;
  const rows = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId)).limit(1);
  return mapAccountPreferences(rows[0]);
}

export async function saveAccountPreferencesForUser(userId: number, input: AccountPreferenceInput) {
  const db = await getDb();
  if (!db) return "unavailable" as const;
  const values = { userId, ...input, favoriteCategories: encodeFavoriteCategories(input.favoriteCategories) };
  await db.insert(userPreferences).values(values).onDuplicateKeyUpdate({
    set: {
      favoriteCategories: values.favoriteCategories,
      maxBudget: input.maxBudget,
      deliveryPreference: input.deliveryPreference,
      orderUpdates: input.orderUpdates,
      deliveryUpdates: input.deliveryUpdates,
      productUpdates: input.productUpdates,
      marketingUpdates: input.marketingUpdates,
    },
  });
  return "saved" as const;
}

export type ShippingAddressSnapshot = AccountAddressInput & { id?: number };

export async function listOrderTimelineForBuyer(orderId: string, buyerId: number, limit = 50) {
  const db = await getDb();
  if (!db) return "unavailable" as const;
  return db.select().from(orderTimelineEvents).where(and(eq(orderTimelineEvents.orderId, orderId), eq(orderTimelineEvents.buyerId, buyerId))).orderBy(desc(orderTimelineEvents.createdAt)).limit(Math.min(limit, 50));
}

export async function createOrderTimelineEvent(event: InsertOrderTimelineEvent) {
  const db = await getDb();
  if (!db) return "unavailable" as const;
  await db.insert(orderTimelineEvents).values(event);
  return "created" as const;
}

export async function listNotificationsForUser(userId: number, limit = 30) {
  const db = await getDb();
  if (!db) return "unavailable" as const;
  return db.select().from(userNotifications).where(eq(userNotifications.userId, userId)).orderBy(desc(userNotifications.createdAt)).limit(Math.min(limit, 50));
}

export async function shouldNotifyUser(userId: number, kind: "order" | "delivery" | "product" | "marketing") {
  const preferences = await getAccountPreferencesForUser(userId);
  if (preferences === "unavailable") return false;
  if (kind === "order") return preferences.orderUpdates;
  if (kind === "delivery") return preferences.deliveryUpdates;
  if (kind === "product") return preferences.productUpdates;
  return preferences.marketingUpdates;
}

export async function createUserNotification(notification: InsertUserNotification) {
  const db = await getDb();
  if (!db) return "unavailable" as const;
  await db.insert(userNotifications).values(notification);
  return "created" as const;
}

export async function markUserNotificationRead(userId: number, id: number) {
  const db = await getDb();
  if (!db) return "unavailable" as const;
  await db.update(userNotifications).set({ readAt: new Date() }).where(and(eq(userNotifications.id, id), eq(userNotifications.userId, userId)));
  return "updated" as const;
}

export async function listCatalogProductsAdmin() {
  const db = await getDb();
  if (!db) return "unavailable" as const;
  const rows = await db.select().from(catalogProducts).orderBy(desc(catalogProducts.updatedAt));
  return rows.map(mapCatalogProduct);
}

export type CatalogProductAdminInput = {
  sku: string;
  name: string;
  category: "keyboard" | "mouse" | "accessory";
  price: number;
  stock: number;
  deliveryDays: number;
  deliveryLabel: string;
  attributes: string[];
  description: string;
  accent: "violet" | "indigo" | "green" | "amber";
  imageUrl: string;
};

export async function upsertCatalogProductByAdmin(operatorId: number, input: CatalogProductAdminInput) {
  const db = await getDb();
  if (!db) return "unavailable" as const;
  const existing = await db.select().from(catalogProducts).where(eq(catalogProducts.sku, input.sku)).limit(1);
  const beforeSnapshot = existing[0] ? JSON.stringify(mapCatalogProduct(existing[0])) : null;
  const values = { ...input, attributes: JSON.stringify(input.attributes) };
  await db.insert(catalogProducts).values(values).onDuplicateKeyUpdate({ set: values });
  const updated = await db.select().from(catalogProducts).where(eq(catalogProducts.sku, input.sku)).limit(1);
  await db.insert(catalogChangeEvents).values({ operatorId, sku: input.sku, action: existing[0] ? "updated" : "created", beforeSnapshot, afterSnapshot: updated[0] ? JSON.stringify(mapCatalogProduct(updated[0])) : null });
  return existing[0] ? "updated" as const : "created" as const;
}

export async function listCatalogChangeEvents(limit = 50) {
  const db = await getDb();
  if (!db) return "unavailable" as const;
  return db.select().from(catalogChangeEvents).orderBy(desc(catalogChangeEvents.createdAt)).limit(Math.min(limit, 50));
}

export async function recordObservabilityEvent(event: InsertObservabilityEvent) {
  const db = await getDb();
  if (!db) return "unavailable" as const;
  await db.insert(observabilityEvents).values(event);
  return "recorded" as const;
}

export async function getObservabilitySummary(limit = 100) {
  const db = await getDb();
  if (!db) return "unavailable" as const;
  const rows = await db.select().from(observabilityEvents).orderBy(desc(observabilityEvents.createdAt)).limit(Math.min(limit, 100));
  const summary = rows.reduce<Record<string, { total: number; failures: number; avgDurationMs: number | null }>>((acc, row) => {
    const current = acc[row.eventType] ?? { total: 0, failures: 0, avgDurationMs: null };
    current.total += 1;
    if (row.outcome !== "success") current.failures += 1;
    if (row.durationMs !== null) current.avgDurationMs = current.avgDurationMs === null ? row.durationMs : Math.round((current.avgDurationMs + row.durationMs) / 2);
    acc[row.eventType] = current;
    return acc;
  }, {});
  return { summary, recent: rows };
}

export async function createActiveSession(userId: number, tokenId: string, deviceLabel = "ShopEx browser session") {
  const db = await getDb();
  if (!db) return "unavailable" as const;
  await db.insert(activeSessions).values({ userId, tokenId, deviceLabel });
  return "created" as const;
}

export async function listActiveSessionsForUser(userId: number) {
  const db = await getDb();
  if (!db) return "unavailable" as const;
  return db.select({ id: activeSessions.id, tokenId: activeSessions.tokenId, deviceLabel: activeSessions.deviceLabel, createdAt: activeSessions.createdAt, lastSeenAt: activeSessions.lastSeenAt, revokedAt: activeSessions.revokedAt }).from(activeSessions).where(eq(activeSessions.userId, userId)).orderBy(desc(activeSessions.lastSeenAt)).limit(20);
}

export async function revokeActiveSessionForUser(userId: number, sessionId: number) {
  const db = await getDb();
  if (!db) return "unavailable" as const;
  await db.update(activeSessions).set({ revokedAt: new Date() }).where(and(eq(activeSessions.id, sessionId), eq(activeSessions.userId, userId)));
  return "updated" as const;
}

export async function isActiveSession(tokenId: string) {
  const db = await getDb();
  if (!db) return true;
  const rows = await db.select({ id: activeSessions.id }).from(activeSessions).where(and(eq(activeSessions.tokenId, tokenId), isNull(activeSessions.revokedAt))).limit(1);
  return Boolean(rows[0]);
}

export async function touchActiveSession(tokenId: string) {
  const db = await getDb();
  if (!db) return "unavailable" as const;
  await db.update(activeSessions).set({ lastSeenAt: new Date() }).where(and(eq(activeSessions.tokenId, tokenId), isNull(activeSessions.revokedAt)));
  return "updated" as const;
}

export async function incrementUserSessionVersion(userId: number) {
  const db = await getDb();
  if (!db) return "unavailable" as const;
  const user = await db.select({ sessionVersion: users.sessionVersion }).from(users).where(eq(users.id, userId)).limit(1);
  if (!user[0]) return "not_found" as const;
  await db.update(users).set({ sessionVersion: user[0].sessionVersion + 1 }).where(eq(users.id, userId));
  return "updated" as const;
}

export async function getUserSessionVersion(userId: number) {
  const db = await getDb();
  if (!db) return "unavailable" as const;
  const rows = await db.select({ sessionVersion: users.sessionVersion }).from(users).where(eq(users.id, userId)).limit(1);
  return rows[0]?.sessionVersion ?? null;
}
