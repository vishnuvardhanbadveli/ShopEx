import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { handleRazorpayWebhook } from "../paymentWebhook";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Razorpay signatures cover the exact raw request body; register this route before JSON parsing.
  app.post("/api/webhooks/razorpay", express.raw({ type: "application/json", limit: "2mb" }), handleRazorpayWebhook);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  
registerOAuthRoutes(app);

// Local demo authentication for the buildathon prototype.
// This does not affect the existing OAuth flow.
app.post("/api/demo/login", (_req, res) => {
  res.cookie("shopex_demo_session", "demo-user", {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: false,
    maxAge: 24 * 60 * 60 * 1000,
  });

  res.json({
    success: true,
    user: {
      id: 1,
      openId: "shopex-demo-user",
      name: "ShopEx Demo User",
      email: "demo@shopex.local",
      loginMethod: "demo",
      role: "user",
    },
  });
});

app.post("/api/demo/logout", (_req, res) => {
  res.clearCookie("shopex_demo_session", {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: false,
  });

  res.json({ success: true });
});


  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
