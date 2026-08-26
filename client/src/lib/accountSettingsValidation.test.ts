import { describe, expect, it } from "vitest";
import { firstAddressErrorField, isAddressFieldValueValid, validateAddress, validatePreferenceBudget } from "./accountSettingsValidation";

describe("account settings validation", () => {
  it("returns inline errors for missing and malformed address fields", () => {
    const errors = validateAddress({ label: "", recipientName: "", line1: "", city: "", state: "", postalCode: "12", country: "IND", phone: "123" });
    expect(errors.label).toBe("Add a short label.");
    expect(errors.recipientName).toBe("Enter the recipient name.");
    expect(errors.country).toContain("2-letter");
    expect(errors.postalCode).toContain("valid postal code");
    expect(errors.phone).toContain("valid phone");
  });

  it("accepts a complete address", () => {
    expect(validateAddress({ label: "Home", recipientName: "Asha", line1: "1 Main Street", city: "Pune", state: "MH", postalCode: "411001", country: "IN", phone: "+919999999999" })).toEqual({});
  });

  it("selects the first address error in form order", () => {
    expect(firstAddressErrorField({ phone: "Invalid phone", city: "City is required", postalCode: "Invalid postal code" })).toBe("city");
    expect(firstAddressErrorField({})).toBeUndefined();
  });

  it("recognizes corrected field values as valid for success feedback", () => {
    expect(isAddressFieldValueValid("postalCode", "411001")).toBe(true);
    expect(isAddressFieldValueValid("postalCode", "12")).toBe(false);
    expect(isAddressFieldValueValid("country", "IN")).toBe(true);
    expect(isAddressFieldValueValid("phone", "+919999999999")).toBe(true);
    expect(isAddressFieldValueValid("phone", "123")).toBe(false);
  });

  it("requires a whole-number preference budget of at least ₹100", () => {
    expect(validatePreferenceBudget("")).toBeUndefined();
    expect(validatePreferenceBudget("99")).toContain("₹100");
    expect(validatePreferenceBudget("100.5")).toContain("whole-number");
    expect(validatePreferenceBudget("7000")).toBeUndefined();
  });
});
