import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getCatalogProductBySku, listCatalogProducts } from "../db";
import { publicProcedure, router } from "../_core/trpc";

const category = z.enum(["keyboard", "mouse", "accessory"]);

export const catalogRouter = router({
  list: publicProcedure.input(z.object({
    category: category.optional(),
    maxPrice: z.number().int().positive().max(1_000_000).optional(),
    maxDeliveryDays: z.number().int().min(1).max(60).optional(),
    includeOutOfStock: z.boolean().default(false),
  }).default({ includeOutOfStock: false })).query(async ({ input }) => {
    const products = await listCatalogProducts(input);
    if (products === "unavailable") {
      throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Catalog service is unavailable" });
    }
    return { products, source: "database" as const };
  }),
  bySku: publicProcedure.input(z.object({ sku: z.string().trim().min(1).max(64) })).query(async ({ input }) => {
    const product = await getCatalogProductBySku(input.sku);
    if (product === "unavailable") {
      throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Catalog service is unavailable" });
    }
    if (!product) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Product was not found" });
    }
    return product;
  }),
});
