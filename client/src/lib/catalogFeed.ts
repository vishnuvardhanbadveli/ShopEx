export type CatalogItem = {
  sku: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  delivery: string;
  attributes: string[];
};

export function validateCatalogFeed(items: CatalogItem[]) {
  const errors: string[] = [];
  items.forEach((item, index) => {
    if (!item.sku || !item.name) errors.push(`item ${index + 1}: sku and name are required`);
    if (!Number.isFinite(item.price) || item.price < 0) errors.push(`${item.sku || `item ${index + 1}`}: price must be non-negative`);
    if (!Number.isInteger(item.stock) || item.stock < 0) errors.push(`${item.sku || `item ${index + 1}`}: stock must be a non-negative integer`);
    if (!item.category || !item.delivery || !Array.isArray(item.attributes)) errors.push(`${item.sku || `item ${index + 1}`}: category, delivery, and attributes are required`);
  });
  return { valid: errors.length === 0, itemCount: items.length, errors };
}
