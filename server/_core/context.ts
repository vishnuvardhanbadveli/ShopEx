import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";

const DEMO_USER: User = {
  id: 1,
  openId: "shopex-demo-user",
  name: "ShopEx Demo User",
  email: "demo@shopex.local",
  loginMethod: "demo",
  role: "user",
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
  sessionVersion: 0,
};

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  // Buildathon demo authentication.
  // If the local demo session exists, authenticate as the demo user.
  const demoSession = opts.req.headers.cookie
  ?.split(";")
  .map((cookie) => cookie.trim())
  .find((cookie) => cookie.startsWith("shopex_demo_session="))
  ?.split("=")[1];

if (demoSession === "demo-user") {
    return {
      req: opts.req,
      res: opts.res,
      user: DEMO_USER,
    };
  }

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch {
    // Authentication is optional for public procedures.
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}