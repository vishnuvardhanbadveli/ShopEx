import { describe, expect, it } from "vitest";
import { extractAddressServerErrors } from "./accountSettingsServerErrors";

describe("account settings server error mapping", () => {
  it("maps nested update-address paths to address fields", () => {
    const result = extractAddressServerErrors({ data: { zodError: { fieldErrors: { "address.postalCode": ["Postal code is not serviceable."], "address.phone": ["Phone is invalid."] }, formErrors: [] } }, message: "Invalid input" });
    expect(result.fieldErrors).toEqual({ postalCode: "Postal code is not serviceable.", phone: "Phone is invalid." });
    expect(result.formError).toBeUndefined();
  });

  it("maps top-level add-address errors and preserves a form-level error", () => {
    const fieldResult = extractAddressServerErrors({ data: { zodError: { fieldErrors: { country: ["Country is not supported."] }, formErrors: [] } }, message: "Invalid input" });
    expect(fieldResult.fieldErrors.country).toBe("Country is not supported.");

    const formResult = extractAddressServerErrors({ data: { zodError: { fieldErrors: {}, formErrors: ["Address could not be saved right now."] } }, message: "Request failed" });
    expect(formResult.formError).toBe("Address could not be saved right now.");
  });

  it("falls back to the mutation message when no structured field error exists", () => {
    expect(extractAddressServerErrors({ message: "Account settings are temporarily unavailable" })).toEqual({ fieldErrors: {}, formError: "Account settings are temporarily unavailable" });
  });
});
