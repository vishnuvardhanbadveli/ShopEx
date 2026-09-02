import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { publicProcedure, router } from "../_core/trpc";
import { getCatalogProductBySku, listCatalogProducts } from "../db";

const category = z.enum(["keyboard", "mouse", "accessory"]);

const demoProducts = [
  {
    sku: "SHX-KBD-WL-01",
    name: "ShopEx Wireless Mechanical Keyboard",
    category: "keyboard" as const,
    price: 1499,
    stock: 25,
    delivery: "2 days",
    deliveryDays: 2,
    attributes: ["wireless", "mechanical", "bluetooth", "compact"],
    description:
      "A compact wireless mechanical keyboard designed for everyday work and productivity.",
    accent: "violet" as const,
    imageUrl: "https://placehold.co/600x400?text=Wireless+Keyboard",
  },
  {
    sku: "SHX-KBD-MECH-02",
    name: "ShopEx Pro Mechanical Keyboard",
    category: "keyboard" as const,
    price: 3499,
    stock: 15,
    delivery: "3 days",
    deliveryDays: 3,
    attributes: ["wired", "mechanical", "rgb", "full-size"],
    description:
      "A full-size mechanical keyboard with RGB lighting for work and gaming.",
    accent: "indigo" as const,
    imageUrl: "https://placehold.co/600x400?text=Mechanical+Keyboard",
  },
  {
    sku: "SHX-KBD-QUIET-03",
    name: "ShopEx Quiet Office Keyboard",
    category: "keyboard" as const,
    price: 1999,
    stock: 20,
    delivery: "2 days",
    deliveryDays: 2,
    attributes: ["wireless", "quiet", "bluetooth", "multi-device"],
    description:
      "A quiet wireless keyboard built for focused office and study sessions.",
    accent: "green" as const,
    imageUrl: "https://placehold.co/600x400?text=Quiet+Keyboard",
  },
  {
    sku: "SHX-MSE-WL-01",
    name: "ShopEx Wireless Ergonomic Mouse",
    category: "mouse" as const,
    price: 899,
    stock: 30,
    delivery: "2 days",
    deliveryDays: 2,
    attributes: ["wireless", "ergonomic", "bluetooth", "silent-click"],
    description:
      "An ergonomic wireless mouse designed for comfortable everyday use.",
    accent: "green" as const,
    imageUrl: "https://placehold.co/600x400?text=Ergonomic+Mouse",
  },
  {
    sku: "SHX-MSE-PRO-02",
    name: "ShopEx Precision Mouse",
    category: "mouse" as const,
    price: 1499,
    stock: 18,
    delivery: "3 days",
    deliveryDays: 3,
    attributes: ["wireless", "precision", "rechargeable", "multi-device"],
    description:
      "A precision wireless mouse for productivity and creative workflows.",
    accent: "violet" as const,
    imageUrl: "https://placehold.co/600x400?text=Precision+Mouse",
  },
  {
    sku: "SHX-ACC-HUB-01",
    name: "ShopEx USB-C Hub",
    category: "accessory" as const,
    price: 1299,
    stock: 40,
    delivery: "2 days",
    deliveryDays: 2,
    attributes: ["usb-c", "hdmi", "portable", "multi-port"],
    description:
      "A compact USB-C hub with multiple ports for laptops and workstations.",
    accent: "amber" as const,
    imageUrl: "https://placehold.co/600x400?text=USB-C+Hub",
  },
];

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

      if (products === "unavailable") {
        const filtered = demoProducts.filter((product) => {
          if (!input.includeOutOfStock && product.stock <= 0) return false;
          if (input.category && product.category !== input.category) return false;
          if (input.maxPrice !== undefined && product.price > input.maxPrice)
            return false;
          if (
            input.maxDeliveryDays !== undefined &&
            product.deliveryDays > input.maxDeliveryDays
          )
            return false;

          return true;
        });

        return {
          products: filtered,
          source: "demo" as const,
        };
      }

      return {
        products,
        source: "database" as const,
      };
    }),

  bySku: publicProcedure
    .input(z.object({ sku: z.string().trim().min(1).max(64) }))
    .query(async ({ input }) => {
      const product = await getCatalogProductBySku(input.sku);

      if (product === "unavailable") {
        const demoProduct = demoProducts.find(
          (item) => item.sku === input.sku,
        );

        if (!demoProduct) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Product was not found",
          });
        }

        return demoProduct;
      }

      if (!product) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Product was not found",
        });
      }

      return product;
    }),
});