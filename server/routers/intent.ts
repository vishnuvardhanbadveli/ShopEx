import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { ENV } from "../_core/env";

const parsedIntent = z.object({
  product: z.string().min(1).max(160),
  category: z.string().min(1).max(80),
  budget: z.number().int().positive().max(10_000_000),
  currency: z.string().min(1).max(10),
  connectivity: z.string().min(1).max(120),
  purpose: z.string().min(1).max(160),
  deliveryDays: z.number().int().min(1).max(60),
  attributes: z.array(z.string().min(1).max(80)).max(20),
  constraints: z.array(z.string().min(1).max(160)).max(20),
});

type ParsedIntent = z.infer<typeof parsedIntent>;

const geminiSchema = {
  type: "object",
  properties: {
    product: {
      type: "string",
      description: "The product the buyer wants.",
    },
    category: {
      type: "string",
      description:
        "General product category such as laptop, phone, keyboard, mouse, headphones, monitor, camera, tablet, etc.",
    },
    budget: {
      type: "integer",
      description:
        "Maximum budget in the buyer's currency. If no budget is specified, use 0.",
    },
    currency: {
      type: "string",
      description:
        "Currency code such as INR, USD, GBP. Use INR when the buyer clearly uses Indian rupees or ₹.",
    },
    connectivity: {
      type: "string",
      description:
        "Requested connectivity such as wireless, Bluetooth, USB-C, wired, or Not specified.",
    },
    purpose: {
      type: "string",
      description:
        "The intended use such as programming, gaming, college, work, travel, photography, or Not specified.",
    },
    deliveryDays: {
      type: "integer",
      description:
        "Maximum acceptable delivery time in days. Use 60 when no delivery requirement is specified.",
    },
    attributes: {
      type: "array",
      items: { type: "string" },
      description:
        "Important product characteristics explicitly requested by the buyer.",
    },
    constraints: {
      type: "array",
      items: { type: "string" },
      description:
        "Hard constraints explicitly requested by the buyer.",
    },
  },
  required: [
    "product",
    "category",
    "budget",
    "currency",
    "connectivity",
    "purpose",
    "deliveryDays",
    "attributes",
    "constraints",
  ],
};

async function parseWithGemini(prompt: string): Promise<ParsedIntent> {
  if (!ENV.geminiApiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": ENV.geminiApiKey,
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [
            {
              text:
                "You are ShopEx's product-shopping intent parser. " +
                "Extract only information explicitly requested by the buyer. " +
                "Never invent product requirements. " +
                "If budget is not specified, return 0. " +
                "If delivery is not specified, return 60. " +
                "Use 'Not specified' for unspecified textual fields. " +
                "Keep attributes and constraints concise and useful for product search.",
            },
          ],
        },
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: geminiSchema,
          temperature: 0.1,
        },
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Gemini request failed: ${response.status} ${response.statusText} - ${errorText}`,
    );
  }

  const data = await response.json();

  const text =
    data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (typeof text !== "string" || !text.trim()) {
    throw new Error("Gemini returned no structured intent");
  }

  return parsedIntent.parse(JSON.parse(text));
}

function fallbackIntent(prompt: string): ParsedIntent {
  const text = prompt.toLowerCase();

  const category =
    text.includes("laptop") ? "laptop" :
    text.includes("phone") || text.includes("smartphone") ? "phone" :
    text.includes("headphone") || text.includes("earbud") ? "headphones" :
    text.includes("monitor") ? "monitor" :
    text.includes("mouse") ? "mouse" :
    text.includes("keyboard") ? "keyboard" :
    text.includes("camera") ? "camera" :
    text.includes("tablet") ? "tablet" :
    "product";

  const budgetMatch = prompt
    .replaceAll(",", "")
    .match(/(?:₹|rs\.?|inr|\$)?\s*(\d{3,8})/i);

  const budget = budgetMatch ? Number(budgetMatch[1]) : 0;

  const dayMatch = text.match(
    /(?:within|under|in|delivered in)\s+(\d+)\s*days?/i,
  );

  const deliveryDays = dayMatch
    ? Math.max(1, Math.min(60, Number(dayMatch[1])))
    : 60;

  const attributes = [
    "wireless",
    "mechanical",
    "ergonomic",
    "quiet",
    "lightweight",
    "portable",
    "gaming",
    "noise cancelling",
    "bluetooth",
    "usb-c",
  ].filter(attribute => text.includes(attribute));

  return {
    product: prompt.trim(),
    category,
    budget,
    currency: text.includes("₹") || text.includes("inr") || text.includes("rs")
      ? "INR"
      : text.includes("$")
        ? "USD"
        : "INR",
    connectivity: text.includes("wireless")
      ? "Wireless"
      : text.includes("bluetooth")
        ? "Bluetooth"
        : "Not specified",
    purpose: text.includes("program")
      ? "Programming"
      : text.includes("gaming")
        ? "Gaming"
        : text.includes("college")
          ? "College"
          : text.includes("work")
            ? "Work"
            : "Not specified",
    deliveryDays,
    attributes,
    constraints: [],
  };
}

export const intentRouter = router({
  parse: publicProcedure
    .input(
      z.object({
        prompt: z.string().trim().min(5).max(1200),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        const intent = await parseWithGemini(input.prompt);

        console.log("[ShopEx] Gemini intent parsed successfully");

        return {
          intent,
          source: "gemini" as const,
        };
      } catch (error) {
        console.warn(
          "[ShopEx] Gemini intent parser failed:",
          error instanceof Error ? error.message : "unknown error",
        );

        return {
          intent: fallbackIntent(input.prompt),
          source: "fallback" as const,
          warning:
            "Gemini interpretation was unavailable, so this request uses a basic fallback. Please review it carefully.",
        };
      }
    }),
});