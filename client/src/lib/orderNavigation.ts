export type OrderNavigationStage = "home" | "confirmation" | "orders" | "order-detail";
export type OrderNavigationAction = "view-order" | "back-to-orders" | "continue-shopping";

export function nextOrderStage(stage: OrderNavigationStage, action: OrderNavigationAction): OrderNavigationStage {
  if (action === "view-order" && (stage === "confirmation" || stage === "orders")) return "order-detail";
  if (action === "back-to-orders" && stage === "order-detail") return "orders";
  if (action === "continue-shopping" && stage === "order-detail") return "home";
  return stage;
}
