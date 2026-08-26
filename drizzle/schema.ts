import { boolean, index, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  sessionVersion: int("sessionVersion").default(0).notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const activeSessions = mysqlTable("active_sessions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  tokenId: varchar("tokenId", { length: 128 }).notNull().unique(),
  deviceLabel: varchar("deviceLabel", { length: 160 }).notNull().default("ShopEx browser session"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  lastSeenAt: timestamp("lastSeenAt").defaultNow().notNull(),
  revokedAt: timestamp("revokedAt"),
}, (table) => [index("active_sessions_user_idx").on(table.userId, table.lastSeenAt)]);

export type ActiveSession = typeof activeSessions.$inferSelect;
export type InsertActiveSession = typeof activeSessions.$inferInsert;

export const savedAddresses = mysqlTable("saved_addresses", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  label: varchar("label", { length: 64 }).notNull(),
  recipientName: varchar("recipientName", { length: 160 }).notNull(),
  line1: varchar("line1", { length: 255 }).notNull(),
  line2: varchar("line2", { length: 255 }),
  city: varchar("city", { length: 120 }).notNull(),
  state: varchar("state", { length: 120 }).notNull(),
  postalCode: varchar("postalCode", { length: 24 }).notNull(),
  country: varchar("country", { length: 2 }).notNull().default("IN"),
  phone: varchar("phone", { length: 32 }).notNull(),
  isDefault: boolean("isDefault").notNull().default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [index("saved_addresses_user_idx").on(table.userId)]);

export type SavedAddress = typeof savedAddresses.$inferSelect;
export type InsertSavedAddress = typeof savedAddresses.$inferInsert;

export const userPreferences = mysqlTable("user_preferences", {
  userId: int("userId").primaryKey(),
  favoriteCategories: varchar("favoriteCategories", { length: 512 }).notNull().default("[]"),
  maxBudget: int("maxBudget"),
  deliveryPreference: mysqlEnum("deliveryPreference", ["standard", "fastest", "flexible"]).notNull().default("standard"),
  orderUpdates: boolean("orderUpdates").notNull().default(true),
  deliveryUpdates: boolean("deliveryUpdates").notNull().default(true),
  productUpdates: boolean("productUpdates").notNull().default(true),
  marketingUpdates: boolean("marketingUpdates").notNull().default(false),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserPreference = typeof userPreferences.$inferSelect;
export type InsertUserPreference = typeof userPreferences.$inferInsert;

export const catalogProducts = mysqlTable("catalog_products", {
  id: int("id").autoincrement().primaryKey(),
  sku: varchar("sku", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 180 }).notNull(),
  category: mysqlEnum("category", ["keyboard", "mouse", "accessory"]).notNull(),
  price: int("price").notNull(),
  stock: int("stock").notNull(),
  deliveryDays: int("deliveryDays").notNull(),
  deliveryLabel: varchar("deliveryLabel", { length: 64 }).notNull(),
  attributes: text("attributes").notNull(),
  description: text("description").notNull(),
  accent: mysqlEnum("accent", ["violet", "indigo", "green", "amber"]).notNull(),
  imageUrl: text("imageUrl").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CatalogProduct = typeof catalogProducts.$inferSelect;
export type InsertCatalogProduct = typeof catalogProducts.$inferInsert;

export const paymentEvents = mysqlTable("payment_events", {
  id: int("id").autoincrement().primaryKey(),
  eventId: varchar("eventId", { length: 128 }).notNull().unique(),
  eventType: varchar("eventType", { length: 128 }).notNull(),
  orderId: varchar("orderId", { length: 64 }),
  payload: text("payload").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PaymentEvent = typeof paymentEvents.$inferSelect;
export type InsertPaymentEvent = typeof paymentEvents.$inferInsert;

export const orderTimelineEvents = mysqlTable("order_timeline_events", {
  id: int("id").autoincrement().primaryKey(),
  orderId: varchar("orderId", { length: 64 }).notNull(),
  buyerId: int("buyerId").notNull(),
  eventType: varchar("eventType", { length: 64 }).notNull(),
  title: varchar("title", { length: 160 }).notNull(),
  detail: text("detail").notNull(),
  tone: mysqlEnum("tone", ["blue", "violet", "amber", "green", "red"]).notNull().default("blue"),
  metadata: text("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("order_timeline_order_idx").on(table.orderId, table.createdAt), index("order_timeline_buyer_idx").on(table.buyerId, table.createdAt)]);

export type OrderTimelineEvent = typeof orderTimelineEvents.$inferSelect;
export type InsertOrderTimelineEvent = typeof orderTimelineEvents.$inferInsert;

export const userNotifications = mysqlTable("user_notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  kind: varchar("kind", { length: 64 }).notNull(),
  title: varchar("title", { length: 160 }).notNull(),
  body: text("body").notNull(),
  orderId: varchar("orderId", { length: 64 }),
  readAt: timestamp("readAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("user_notifications_user_idx").on(table.userId, table.createdAt), index("user_notifications_order_idx").on(table.orderId)]);

export type UserNotification = typeof userNotifications.$inferSelect;
export type InsertUserNotification = typeof userNotifications.$inferInsert;

export const catalogChangeEvents = mysqlTable("catalog_change_events", {
  id: int("id").autoincrement().primaryKey(),
  operatorId: int("operatorId").notNull(),
  sku: varchar("sku", { length: 64 }).notNull(),
  action: varchar("action", { length: 32 }).notNull(),
  beforeSnapshot: text("beforeSnapshot"),
  afterSnapshot: text("afterSnapshot"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("catalog_change_operator_idx").on(table.operatorId, table.createdAt), index("catalog_change_sku_idx").on(table.sku, table.createdAt)]);

export type CatalogChangeEvent = typeof catalogChangeEvents.$inferSelect;
export type InsertCatalogChangeEvent = typeof catalogChangeEvents.$inferInsert;

export const observabilityEvents = mysqlTable("observability_events", {
  id: int("id").autoincrement().primaryKey(),
  eventType: varchar("eventType", { length: 64 }).notNull(),
  outcome: varchar("outcome", { length: 64 }).notNull(),
  orderId: varchar("orderId", { length: 64 }),
  durationMs: int("durationMs"),
  metadata: text("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("observability_type_idx").on(table.eventType, table.createdAt), index("observability_order_idx").on(table.orderId)]);

export type ObservabilityEvent = typeof observabilityEvents.$inferSelect;
export type InsertObservabilityEvent = typeof observabilityEvents.$inferInsert;

export const paymentOrders = mysqlTable("payment_orders", {
  id: int("id").autoincrement().primaryKey(),
  orderId: varchar("orderId", { length: 64 }).notNull().unique(),
  buyerId: int("buyerId"),
  sku: varchar("sku", { length: 64 }).notNull(),
  upsellSku: varchar("upsellSku", { length: 64 }),
  amount: int("amount").notNull(),
  status: mysqlEnum("status", ["created", "verification_pending", "verified", "failed", "captured"]).default("created").notNull(),
  paymentId: varchar("paymentId", { length: 64 }),
  productSnapshot: text("productSnapshot"),
  upsellSnapshot: text("upsellSnapshot"),
  intentSnapshot: text("intentSnapshot"),
  shippingAddressSnapshot: text("shippingAddressSnapshot"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PaymentOrder = typeof paymentOrders.$inferSelect;
export type InsertPaymentOrder = typeof paymentOrders.$inferInsert;
