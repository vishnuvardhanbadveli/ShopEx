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

  if (text.includes("today") || text.includes("same day")) return 0;
  if (text.includes("tomorrow")) return 1;

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
    category: "external" as const,
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

function getQueryTokens(query: string): string[] {
  return query
    .toLowerCase()
    .replace(/[^a-zA-Z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 2)
    .filter(
      (token) =>
        ![
          "under",
          "below",
          "less",
          "than",
          "within",
          "week",
          "days",
          "day",
          "in",
          "for",
          "the",
          "and",
          "with",
        ].includes(token),
    );
}

function calculateRelevance(
  title: string,
  query: string,
): number {
  const tokens = getQueryTokens(query);

  if (!tokens.length) return 0;

  const text = title.toLowerCase();

  let matched = 0;

  for (const token of tokens) {
    if (text.includes(token)) {
      matched++;
    }
  }

  return Math.round((matched / tokens.length) * 50);
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

      const response = await fetch(
        "https://google.serper.dev/shopping",
        {
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
        },
      );

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
            product.deliveryDays === 999 ||
            product.deliveryDays <= input.deliveryDays,
        )
        .map((product) => {
          let score = 0;

          // Relevance: 50 points.
          score += calculateRelevance(
            product.name,
            input.query,
          );

          // Budget fit: 20 points.
          if (input.maxPrice !== undefined && input.maxPrice > 0) {
            const budgetRatio = product.price / input.maxPrice;

            if (budgetRatio <= 0.60) score += 20;
            else if (budgetRatio <= 0.75) score += 18;
            else if (budgetRatio <= 0.90) score += 15;
            else score += 10;
          }

          // Delivery fit: 15 points.
          if (product.deliveryDays < 999) {
            if (product.deliveryDays <= 1) score += 15;
            else if (product.deliveryDays <= 3) score += 13;
            else if (product.deliveryDays <= 5) score += 10;
            else if (product.deliveryDays <= 7) score += 7;
          }

          // Rating quality: 10 points.
          if (product.rating != null) {
            const ratingScore = Math.max(
              0,
              Math.min(
                10,
                ((product.rating - 3) / 2) * 10,
              ),
            );

            score += Math.round(ratingScore);
          }

          // Review confidence: 5 points.
          if (product.ratingCount != null) {
            if (product.ratingCount >= 5000) score += 5;
            else if (product.ratingCount >= 1000) score += 4;
            else if (product.ratingCount >= 500) score += 3;
            else if (product.ratingCount >= 100) score += 2;
            else score += 1;
          }

          return {
            ...product,
            matchScore: score,
          };
        })
        .sort((a, b) => b.matchScore - a.matchScore);

      console.log(
        `[ShopEx] Serper returned ${data.shopping?.length ?? 0} results; ${products.length} passed filters`,
      );

      return {
        products,
        source: "serper" as const,
        query: input.query,
      };
    }),
});