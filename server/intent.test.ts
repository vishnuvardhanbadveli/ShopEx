import { beforeEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { invokeLLM } from "./_core/llm";

vi.mock("./_core/llm", () => ({ invokeLLM: vi.fn() }));

const mockedInvokeLLM = vi.mocked(invokeLLM);

const context = {
  user: null,
  req: { protocol: "https", headers: {} },
  res: {},
} as TrpcContext;

describe("intent.parse", () => {
  beforeEach(() => mockedInvokeLLM.mockReset());

  it("returns the strict structured intent from the server-side parser", async () => {
    mockedInvokeLLM.mockResolvedValue({ choices: [{ message: { content: JSON.stringify({ product: "Wireless mechanical keyboard", category: "keyboard", budget: 7000, connectivity: "Wireless", purpose: "Programming", deliveryDays: 5, attributes: ["wireless", "mechanical"] }) } }] } as never);
    const result = await appRouter.createCaller(context).intent.parse({ prompt: "I need a wireless mechanical keyboard under ₹7,000 for programming." });
    expect(result.source).toBe("llm");
    expect(result.intent).toMatchObject({ category: "keyboard", budget: 7000, deliveryDays: 5 });
  });

  it("labels the deterministic fallback when the LLM service is unavailable", async () => {
    mockedInvokeLLM.mockResolvedValue({ choices: [{ message: { content: null } }] } as never);
    const result = await appRouter.createCaller(context).intent.parse({ prompt: "I need an ergonomic mouse for work under ₹8,000." });
    expect(result.source).toBe("fallback");
    expect(result.warning).toContain("basic fallback");
    expect(result.intent.category).toBe("mouse");
    expect(result.intent.budget).toBe(8000);
  });

  it("rejects empty and underspecified requests before invoking the model", async () => {
    await expect(appRouter.createCaller(context).intent.parse({ prompt: "   " })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(mockedInvokeLLM).not.toHaveBeenCalled();
  });
});
