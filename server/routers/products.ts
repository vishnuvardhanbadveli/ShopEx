import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";

type SerperShoppingItem = {
  title?: string;
  source?: string;
  link?: string;
  price?: string;
  delivery?: string;
  imageUrl?: string;
  thumbnail?: string;
  rating?: number;
  ratingCount?: number;
};

function parsePrice(value: string | undefined): number {
  if (!value) return 0;

  const cleaned = value
    .replace(/[^\d.,]/g, "")
    .replace(/,(?=\d{3})/g, "");

  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function estimateDeliveryDays(delivery: string | undefined): number {
  if (!delivery) return 999;

  const text = delivery.toLowerCase();

  if (
    text.includes("today") ||
    text.includes("same day") ||
    text.includes("tomorrow")
  ) {
    return text.includes("tomorrow") ? 1 : 0;
  }

  const match = text.match(/(\d+)\s*(?:-|to)?\s*(\d+)?\s*day/);

  if (match) {
    return Number(match[2] ?? match[1]);
  }

  return 999;
}

function normalizeProduct(
  item: SerperShoppingItem,
  index: number,
) {
  const price = parsePrice(item.price);
  const deliveryDays = estimateDeliveryDays(item.delivery);

  return {
    sku: `SERPER-${Date.now()}-${index}`,
    name: item.title?.trim() || "Product",
    category: "external",
    price,
    stock: 1,
    delivery: item.delivery || "Delivery information unavailable",
    deliveryDays,
    attributes: [
      item.source ? `Seller: ${item.source}` : "Online seller",
      ...(item.rating ? [`Rating: ${item.rating}/5`] : []),
    ],
    description: item.source
      ? `Listed by ${item.source} through Google Shopping.`
      : "Product discovered through Google Shopping.",
    accent: "violet" as const,
    imageUrl: item.imageUrl || item.thumbnail || "",
    externalUrl: item.link || "",
    seller: item.source || "Online seller",
    rating: item.rating ?? null,
    ratingCount: item.ratingCount ?? null,
    source: "serper" as const,
  };
}

export const productsRouter = router({
  search: publicProcedure
    .input(
      z.object({
        query: z.string().trim().min(2).max(300),
        maxPrice: z.number().positive().optional(),
        deliveryDays: z.number().int().min(1).max(60).optional(),
      }),
    )
    .query(async ({ input }) => {
      const apiKey = process.env.SERPER_API_KEY;

      if (!apiKey) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "SERPER_API_KEY is not configured",
        });
      }

      const response = await fetch("https://google.serper.dev/shopping", {
        method: "POST",
        headers: {
          "X-API-KEY": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          q: input.query,
          gl: "in",
          hl: "en",
          num: 20,
        }),
      });

      if (!response.ok) {
        const body = await response.text();

        console.error(
          `[ShopEx] Serper Shopping failed: ${response.status} ${body}`,
        );

        throw new TRPCError({
          code: "BAD_GATEWAY",
          message: `Product search failed (${response.status})`,
        });
      }

      const data = (await response.json()) as {
        shopping?: SerperShoppingItem[];
      };

      const products = (data.shopping ?? [])
  .map(normalizeProduct)
  .filter((product) => product.price > 0)
  .filter(
    (product) =>
      input.maxPrice === undefined ||
      product.price <= input.maxPrice,
  )
    .filter(
  (product) =>
    input.deliveryDays === undefined ||
    product.deliveryDays <= input.deliveryDays,
)
  .map((product) => {
    let score = 0;

    // Budget fit: 30 points.
    if (input.maxPrice !== undefined && input.maxPrice > 0) {
      const budgetRatio = product.price / input.maxPrice;

      if (budgetRatio <= 0.60) score += 30;
      else if (budgetRatio <= 0.75) score += 27;
      else if (budgetRatio <= 0.90) score += 23;
      else score += 18;
    }

    // Delivery fit: 20 points.
    // Unknown delivery gets 0.
    if (product.deliveryDays < 999) {
      if (product.deliveryDays <= 1) score += 20;
      else if (product.deliveryDays <= 3) score += 17;
      else if (product.deliveryDays <= 5) score += 14;
      else if (product.deliveryDays <= 7) score += 10;
    }

    // Rating quality: 30 points.
    if (product.rating != null) {
      const ratingScore = Math.max(
        0,
        Math.min(30, ((product.rating - 3) / 2) * 30),
      );

      score += Math.round(ratingScore);
    }

    // Review confidence: 20 points.
    if (product.ratingCount != null) {
      if (product.ratingCount >= 5000) score += 20;
      else if (product.ratingCount >= 1000) score += 18;
      else if (product.ratingCount >= 500) score += 15;
      else if (product.ratingCount >= 100) score += 12;
      else if (product.ratingCount >= 20) score += 7;
      else score += 3;
    }

    return {
      ...product,
      matchScore: score,
    };
  })
  .sort((a, b) => b.matchScore - a.matchScore);

      return {
        products,
        source: "serper" as const,
        query: input.query,
      };
    }),
});