import type { PolicyReason } from "./policyEngine";

export type CatalogItem = {
  sku: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  delivery: string;
  deliveryDays: number;
  attributes: string[];
  description: string;
  accent: "violet" | "indigo" | "green" | "amber";
  imageUrl: string;
};

export type IntentSpec = {
  product: string;
  category: string;
  budget: number;
  currency: string;
  connectivity: string;
  purpose: string;
  deliveryDays: number;
  attributes: string[];
  constraints: string[];
};
export type CandidateResult = { item: CatalogItem; pass: boolean; reasons: PolicyReason[]; failedReasons: PolicyReason[] };

export type PersistedOrder = {
  orderId: string;
  amount: number;
  status: "created" | "verification_pending" | "verified" | "failed" | "captured";
  paymentId: string | null;
  createdAt: Date;
  updatedAt: Date;
  product: CatalogItem | null;
  upsell: CatalogItem | null;
  intent: unknown;
  shippingAddress: unknown;
};

export function toCatalogItem(product: CatalogItem): CatalogItem {
  return product;
}

export const money = (value: number) => `₹${value.toLocaleString("en-IN")}`;

export const categoryLabel = (category: string) => category.charAt(0).toUpperCase() + category.slice(1);

export const examples = [
  "A quiet wireless keyboard for writing, under ₹8,000",
  "An ergonomic mouse for long workdays, delivered this week",
  "A complete desk setup under ₹12,000",
];
