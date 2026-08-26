import type { IntentSpec } from "./shopEx";

export const CHECKOUT_DRAFT_STORAGE_KEY = "shopex-checkout-draft";

export type CheckoutDraft = {
  prompt: string;
  intent: IntentSpec;
  selectedSku: string;
  upsellSku?: string;
  addressId?: number;
};

export function serializeCheckoutDraft(draft: CheckoutDraft) {
  return JSON.stringify(draft);
}

export function parseCheckoutDraft(value: string | null): CheckoutDraft | null {
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object") return null;
    const draft = parsed as Partial<CheckoutDraft>;
    const intent = draft.intent;
    if (!draft.prompt || !draft.selectedSku || !intent || typeof intent !== "object") return null;
    const candidate = intent as Partial<IntentSpec>;
    if (!candidate.product || !candidate.category || !candidate.budget || !candidate.connectivity || !candidate.purpose || !candidate.deliveryDays || !Array.isArray(candidate.attributes)) return null;
    if (candidate.category !== "keyboard" && candidate.category !== "mouse" && candidate.category !== "accessory") return null;
    return { prompt: draft.prompt, intent: candidate as IntentSpec, selectedSku: draft.selectedSku, upsellSku: draft.upsellSku, addressId: typeof draft.addressId === "number" ? draft.addressId : undefined };
  } catch {
    return null;
  }
}
