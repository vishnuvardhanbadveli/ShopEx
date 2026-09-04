import { COOKIE_NAME } from "@shared/const";

export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

export const startLogin = async () => {
  try {
    const response = await fetch("/api/demo/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("Demo login failed");
    }

    // Reload so tRPC auth.me gets the newly-created demo session.
    window.location.reload();
  } catch (error) {
    console.error("ShopEx demo login failed:", error);
  }
};