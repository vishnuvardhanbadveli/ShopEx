import { beforeEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { getCatalogProductBySku, listCatalogProducts } from "./db";

vi.mock("./db", () => ({
  getCatalogProductBySku: vi.fn(),
  listCatalogProducts: vi.fn(),
}));

const mockedGetCatalogProductBySku = vi.mocked(getCatalogProductBySku);
const mockedListCatalogProducts = vi.mocked(listCatalogProducts);
const context = { user: null, req: { protocol: "https", headers: {} }, res: {} } as TrpcContext;
const product = { sku: "KBD-MX-MINI", name: "Keychron K3 Pro", category: "keyboard" as const, price: 8499, stock: 12, delivery: "3–4 days", deliveryDays: 4, attributes: ["wireless", "mechanical"], description: "Low-profile mechanical keyboard.", accent: "violet" as const, imageUrl: "/manus-storage/shopex-keychron-k3-pro_0eb32233.png", updatedAt: new Date() };

describe("database-backed catalog router", () => {
  beforeEach(() => {
    mockedGetCatalogProductBySku.mockReset();
    mockedListCatalogProducts.mockReset();
  });

  it("returns database products and forwards the real query filters", async () => {
    mockedListCatalogProducts.mockResolvedValue([product]);
    const result = await appRouter.createCaller(context).catalog.list({ category: "keyboard", maxPrice: 10_000, maxDeliveryDays: 5, includeOutOfStock: true });
    expect(result).toMatchObject({ source: "database", products: [expect.objectContaining({ sku: "KBD-MX-MINI", stock: 12 })] });
    expect(mockedListCatalogProducts).toHaveBeenCalledWith({ category: "keyboard", maxPrice: 10_000, maxDeliveryDays: 5, includeOutOfStock: true });
  });

  it("returns an empty database result when no products satisfy the requested filters", async () => {
    mockedListCatalogProducts.mockResolvedValue([]);
    await expect(appRouter.createCaller(context).catalog.list({ category: "keyboard", maxPrice: 500, maxDeliveryDays: 1, includeOutOfStock: false })).resolves.toEqual({ source: "database", products: [] });
  });

  it("returns a real product by SKU and distinguishes missing records", async () => {
    mockedGetCatalogProductBySku.mockResolvedValueOnce(product).mockResolvedValueOnce(null);
    await expect(appRouter.createCaller(context).catalog.bySku({ sku: "KBD-MX-MINI" })).resolves.toMatchObject({ sku: "KBD-MX-MINI" });
    await expect(appRouter.createCaller(context).catalog.bySku({ sku: "NO-SUCH-SKU" })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("surfaces catalog database unavailability instead of returning fallback products", async () => {
    mockedListCatalogProducts.mockResolvedValue("unavailable");
    await expect(appRouter.createCaller(context).catalog.list({ includeOutOfStock: false })).rejects.toMatchObject({ code: "SERVICE_UNAVAILABLE" });
  });
});
