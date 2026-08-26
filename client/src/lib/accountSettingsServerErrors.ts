import type { AddressFieldErrors } from "./accountSettingsValidation";

type UnknownError = {
  message?: string;
  data?: {
    zodError?: {
      fieldErrors?: Record<string, string[] | undefined>;
      formErrors?: string[];
    } | null;
  } | null;
};

const addressFields = new Set(["label", "recipientName", "line1", "line2", "city", "state", "postalCode", "country", "phone"]);

export function extractAddressServerErrors(error: unknown): { fieldErrors: AddressFieldErrors; formError?: string } {
  const candidate = (error ?? {}) as UnknownError;
  const fieldErrors: AddressFieldErrors = {};
  const rawFields = candidate.data?.zodError?.fieldErrors ?? {};

  for (const [rawKey, messages] of Object.entries(rawFields)) {
    const field = rawKey.split(".").pop() ?? rawKey;
    if (addressFields.has(field) && messages?.[0]) fieldErrors[field as keyof AddressFieldErrors] = messages[0];
  }

  const formError = candidate.data?.zodError?.formErrors?.[0] ?? (Object.keys(fieldErrors).length ? undefined : candidate.message);
  return { fieldErrors, formError };
}
