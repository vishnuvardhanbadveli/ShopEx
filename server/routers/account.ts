import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  createSavedAddressForUser,
  deleteSavedAddressForUser,
  getAccountPreferencesForUser,
  listSavedAddressesForUser,
  saveAccountPreferencesForUser,
  setDefaultSavedAddressForUser,
  updateSavedAddressForUser,
  listNotificationsForUser,
  markUserNotificationRead,
  incrementUserSessionVersion,
  listActiveSessionsForUser,
  revokeActiveSessionForUser,
} from "../db";
import { protectedProcedure, router } from "../_core/trpc";

const safeLimit = (fallback: number, maximum: number) => z.preprocess((value) => typeof value === "number" && value < 1 ? fallback : value, z.number().int().min(1).max(maximum).default(fallback));

const addressInput = z.object({
  label: z.string().trim().min(1).max(64),
  recipientName: z.string().trim().min(1).max(160),
  line1: z.string().trim().min(1).max(255),
  line2: z.string().trim().max(255).nullable().optional(),
  city: z.string().trim().min(1).max(120),
  state: z.string().trim().min(1).max(120),
  postalCode: z.string().trim().min(3).max(24),
  country: z.string().trim().length(2).transform((value) => value.toUpperCase()),
  phone: z.string().trim().min(6).max(32),
  isDefault: z.boolean().default(false),
});

const preferenceInput = z.object({
  favoriteCategories: z.array(z.enum(["keyboard", "mouse", "accessory"])).max(3),
  maxBudget: z.number().int().min(100).max(500_000).nullable(),
  deliveryPreference: z.enum(["standard", "fastest", "flexible"]),
  orderUpdates: z.boolean(),
  deliveryUpdates: z.boolean(),
  productUpdates: z.boolean(),
  marketingUpdates: z.boolean(),
});

function unavailable() {
  return new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Account settings are temporarily unavailable" });
}

export const accountRouter = router({
  overview: protectedProcedure.query(async ({ ctx }) => {
    const [addresses, preferences] = await Promise.all([listSavedAddressesForUser(ctx.user.id), getAccountPreferencesForUser(ctx.user.id)]);
    if (addresses === "unavailable" || preferences === "unavailable") throw unavailable();
    return { addresses, preferences };
  }),

  addAddress: protectedProcedure.input(addressInput).mutation(async ({ ctx, input }) => {
    const result = await createSavedAddressForUser(ctx.user.id, input);
    if (result === "unavailable") throw unavailable();
    return { success: true };
  }),

  updateAddress: protectedProcedure.input(z.object({ id: z.number().int().positive(), address: addressInput })).mutation(async ({ ctx, input }) => {
    const result = await updateSavedAddressForUser(ctx.user.id, input.id, input.address);
    if (result === "unavailable") throw unavailable();
    if (result === "not_found") throw new TRPCError({ code: "NOT_FOUND", message: "Saved address not found" });
    return { success: true };
  }),

  setDefaultAddress: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const result = await setDefaultSavedAddressForUser(ctx.user.id, input.id);
    if (result === "unavailable") throw unavailable();
    if (result === "not_found") throw new TRPCError({ code: "NOT_FOUND", message: "Saved address not found" });
    return { success: true };
  }),

  deleteAddress: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const result = await deleteSavedAddressForUser(ctx.user.id, input.id);
    if (result === "unavailable") throw unavailable();
    if (result === "not_found") throw new TRPCError({ code: "NOT_FOUND", message: "Saved address not found" });
    return { success: true };
  }),

  savePreferences: protectedProcedure.input(preferenceInput).mutation(async ({ ctx, input }) => {
    const result = await saveAccountPreferencesForUser(ctx.user.id, input);
    if (result === "unavailable") throw unavailable();
    return { success: true };
  }),

  notifications: protectedProcedure.input(z.object({ limit: safeLimit(30, 50) })).query(async ({ ctx, input }) => {
    const notifications = await listNotificationsForUser(ctx.user.id, input.limit);
    if (notifications === "unavailable") throw unavailable();
    return notifications;
  }),

  markNotificationRead: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const result = await markUserNotificationRead(ctx.user.id, input.id);
    if (result === "unavailable") throw unavailable();
    return { success: true as const };
  }),

  securityOverview: protectedProcedure.query(async ({ ctx }) => {
    const sessions = await listActiveSessionsForUser(ctx.user.id);
    if (sessions === "unavailable") throw unavailable();
    return { lastSignedIn: ctx.user.lastSignedIn, sessionVersion: ctx.user.sessionVersion, sessionPolicy: "OAuth sessions remain active until expiry or explicit revocation.", sessions };
  }),

  revokeSession: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const result = await revokeActiveSessionForUser(ctx.user.id, input.id);
    if (result === "unavailable") throw unavailable();
    return { success: true as const };
  }),

  revokeAllSessions: protectedProcedure.mutation(async ({ ctx }) => {
    const result = await incrementUserSessionVersion(ctx.user.id);
    if (result === "unavailable") throw unavailable();
    if (result === "not_found") throw new TRPCError({ code: "NOT_FOUND", message: "Account not found" });
    return { success: true as const };
  }),
});
