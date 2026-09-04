import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { publicProcedure, router } from "../_core/trpc";
import {
  getCatalogProductBySku,
  listCatalogProducts,
} from "../db";

const category = z.enum(["keyboard", "mouse", "accessory"]);

export const catalogRouter = router({
  list: publicProcedure
    .input(
      z
        .object({
          category: category.optional(),
          maxPrice: z.number().int().positive().max(1_000_000).optional(),
          maxDeliveryDays: z.number().int().min(1).max(60).optional(),
          includeOutOfStock: z.boolean().default(false),
        })
        .default({ includeOutOfStock: false }),
    )
    .query(async ({ input }) => {
      const products = await listCatalogProducts(input);

      return {
        products,
        source: "demo" as const,
      };
    }),

  bySku: publicProcedure
    .input(z.object({ sku: z.string().trim().min(1).max(64) }))
    .query(async ({ input }) => {
      const product = await getCatalogProductBySku(input.sku);

      if (!product) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Product was not found",
        });
      }

      return product;
    }),
});