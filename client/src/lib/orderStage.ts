import type { PersistedOrder } from "./shopEx";

export const ORDER_STAGES = ["Order created", "Payment submitted", "Payment verified", "Order confirmed"] as const;

export function orderProgress(status: PersistedOrder["status"]) {
  if (status === "captured") return { current: 4, label: "Order confirmed", tone: "green" as const, description: "Payment and provider confirmation are complete." };
  if (status === "verified") return { current: 3, label: "Payment verified", tone: "violet" as const, description: "Payment is verified; ShopEx is waiting for the provider confirmation webhook." };
  if (status === "verification_pending") return { current: 2, label: "Payment submitted", tone: "amber" as const, description: "The payment response was received and is being verified." };
  if (status === "failed") return { current: 2, label: "Payment failed", tone: "red" as const, description: "The provider recorded a failure. No silent retry was performed." };
  return { current: 1, label: "Order created", tone: "blue" as const, description: "The secure order is ready for payment." };
}
