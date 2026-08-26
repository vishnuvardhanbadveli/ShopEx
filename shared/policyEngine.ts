export type PolicyCandidate = {
  category: string;
  price: number;
  stock: number;
  deliveryDays: number;
  attributes: string[];
};

export type PolicyConstraints = {
  requestedCategory: string;
  maxPrice: number;
  deliveryDays: number;
  attributes: string[];
};

export type PolicyReason = {
  key: string;
  value: string;
  pass: boolean;
};

export function evaluatePolicy(candidate: PolicyCandidate, constraints: PolicyConstraints) {
  const reasons: PolicyReason[] = [
    { key: "price <= max_price", value: `${candidate.price} <= ${constraints.maxPrice}`, pass: candidate.price <= constraints.maxPrice },
    { key: "category = requested", value: `${candidate.category} = ${constraints.requestedCategory}`, pass: candidate.category === constraints.requestedCategory },
    { key: "stock.available", value: `${candidate.stock} units available`, pass: candidate.stock > 0 },
    { key: "delivery_eta <= requested", value: `${candidate.deliveryDays} days <= ${constraints.deliveryDays} days`, pass: candidate.deliveryDays <= constraints.deliveryDays },
    { key: "attributes match", value: constraints.attributes.join(" · "), pass: constraints.attributes.every((attribute) => candidate.attributes.includes(attribute)) },
  ];

  return { pass: reasons.every((reason) => reason.pass), reasons, failedReasons: reasons.filter((reason) => !reason.pass) };
}
