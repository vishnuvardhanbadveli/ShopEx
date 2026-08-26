export type FavoriteCategory = "keyboard" | "mouse" | "accessory";

export function defaultOnAddressCreate(existingAddressCount: number, requestedDefault: boolean) {
  return requestedDefault || existingAddressCount === 0;
}

export function defaultOnAddressUpdate(wasDefault: boolean, requestedDefault: boolean) {
  return wasDefault || requestedDefault;
}

export function promoteReplacementAfterDelete(wasDefault: boolean, replacementExists: boolean) {
  return wasDefault && replacementExists;
}

export function encodeFavoriteCategories(categories: FavoriteCategory[]) {
  return JSON.stringify(categories);
}

export function decodeFavoriteCategories(value: string): FavoriteCategory[] {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) && parsed.every((category) => category === "keyboard" || category === "mouse" || category === "accessory") ? parsed : [];
  } catch {
    return [];
  }
}
