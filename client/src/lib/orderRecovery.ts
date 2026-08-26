import type { PaymentFlowStatus } from "./paymentFlow";
import type { PersistedOrder } from "./shopEx";

export type RecoveredOrderState = {
  paymentState: PaymentFlowStatus;
  stage: "approval" | "confirmation";
  resumeAvailable: boolean;
};

export function recoverOrderState(status: PersistedOrder["status"]): RecoveredOrderState {
  if (status === "captured") return { paymentState: "captured", stage: "confirmation", resumeAvailable: false };
  if (status === "failed") return { paymentState: "failed", stage: "approval", resumeAvailable: false };
  if (status === "verified") return { paymentState: "verified", stage: "approval", resumeAvailable: false };
  return { paymentState: "idle", stage: "approval", resumeAvailable: true };
}
