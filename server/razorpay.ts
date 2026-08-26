import crypto from "node:crypto";

const RAZORPAY_BASE_URL = "https://api.razorpay.com";

type RazorpayCredentials = { keyId: string; keySecret: string; webhookSecret: string };

type CreateOrderInput = {
  amount: number;
  receipt: string;
  notes?: Record<string, string>;
};

export type RazorpayOrder = {
  id: string;
  entity: "order";
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt: string;
  status: "created" | "attempted" | "paid";
  attempts: number;
  notes: Record<string, string>;
  created_at: number;
};

function credentials(): RazorpayCredentials {
  const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET } = process.env;
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET || !RAZORPAY_WEBHOOK_SECRET) {
    throw new Error("Razorpay test credentials are not configured");
  }
  return { keyId: RAZORPAY_KEY_ID, keySecret: RAZORPAY_KEY_SECRET, webhookSecret: RAZORPAY_WEBHOOK_SECRET };
}

function basicAuth(keyId: string, keySecret: string) {
  return `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;
}

function safeEqualHex(left: string, right: string) {
  const a = Buffer.from(left, "utf8");
  const b = Buffer.from(right, "utf8");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function getRazorpayPublicKey() {
  return credentials().keyId;
}

export async function validateRazorpayCredentials() {
  const { keyId, keySecret } = credentials();
  const response = await fetch(`${RAZORPAY_BASE_URL}/v1/orders?count=1`, {
    headers: { Authorization: basicAuth(keyId, keySecret), Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`Razorpay credential validation failed with HTTP ${response.status}`);
  }
  return { authenticated: true as const, mode: keyId.startsWith("rzp_test_") ? "test" as const : "unknown" as const };
}

export async function createRazorpayOrder(input: CreateOrderInput): Promise<RazorpayOrder> {
  const { keyId, keySecret } = credentials();
  if (!Number.isInteger(input.amount) || input.amount < 100) throw new Error("Amount must be an integer of at least ₹1 in paise");
  if (!/^order_[a-zA-Z0-9]+$/.test(input.receipt) && input.receipt.length > 40) throw new Error("Receipt must be a compact idempotency reference");

  const response = await fetch(`${RAZORPAY_BASE_URL}/v1/orders`, {
    method: "POST",
    headers: { Authorization: basicAuth(keyId, keySecret), "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ amount: input.amount, currency: "INR", receipt: input.receipt, notes: input.notes ?? {} }),
  });
  const payload = await response.json() as RazorpayOrder & { error?: { description?: string } };
  if (!response.ok) throw new Error(payload.error?.description ?? `Razorpay order creation failed with HTTP ${response.status}`);
  return payload;
}

export function verifyPaymentSignature(input: { orderId: string; paymentId: string; signature: string }) {
  const { keySecret } = credentials();
  const expected = crypto.createHmac("sha256", keySecret).update(`${input.orderId}|${input.paymentId}`).digest("hex");
  return safeEqualHex(expected, input.signature);
}

export function verifyWebhookSignature(rawBody: string, signature: string) {
  const { webhookSecret } = credentials();
  const expected = crypto.createHmac("sha256", webhookSecret).update(rawBody).digest("hex");
  return safeEqualHex(expected, signature);
}

export function verifyWebhookSignatureWithSecret(rawBody: string, signature: string, webhookSecret: string) {
  const expected = crypto.createHmac("sha256", webhookSecret).update(rawBody).digest("hex");
  return safeEqualHex(expected, signature);
}
