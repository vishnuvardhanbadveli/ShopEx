export type AddressValidationValues = {
  label: string;
  recipientName: string;
  line1: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone: string;
};

export type AddressFieldErrors = Partial<Record<keyof AddressValidationValues, string>>;

export const ADDRESS_FIELD_ORDER: Array<keyof AddressValidationValues> = ["label", "recipientName", "line1", "city", "state", "postalCode", "country", "phone"];

export function firstAddressErrorField(errors: AddressFieldErrors): keyof AddressValidationValues | undefined {
  return ADDRESS_FIELD_ORDER.find((field) => Boolean(errors[field]));
}

export function validateAddress(values: AddressValidationValues): AddressFieldErrors {
  const errors: AddressFieldErrors = {};
  const requiredFields: Array<[keyof AddressValidationValues, string]> = [
    ["label", "Add a short label."],
    ["recipientName", "Enter the recipient name."],
    ["line1", "Enter the address line."],
    ["city", "Enter the city."],
    ["state", "Enter the state."],
    ["postalCode", "Enter the postal code."],
    ["country", "Enter a 2-letter country code."],
    ["phone", "Enter a phone number."],
  ];

  for (const [field, message] of requiredFields) {
    if (!values[field].trim()) errors[field] = message;
  }

  if (values.country.trim() && !/^[A-Za-z]{2}$/.test(values.country.trim())) {
    errors.country = "Use a 2-letter country code, such as IN.";
  }
  if (values.postalCode.trim() && values.postalCode.trim().length < 4) {
    errors.postalCode = "Enter a valid postal code.";
  }
  if (values.phone.trim() && values.phone.trim().replace(/\D/g, "").length < 7) {
    errors.phone = "Enter a valid phone number.";
  }

  return errors;
}

export function isAddressFieldValueValid(field: keyof AddressValidationValues, value: string): boolean {
  const trimmed = value.trim();
  if (["label", "recipientName", "line1", "city", "state", "postalCode", "country", "phone"].includes(field) && !trimmed) return false;
  if (field === "country") return /^[A-Za-z]{2}$/.test(trimmed);
  if (field === "postalCode") return trimmed.length >= 4;
  if (field === "phone") return trimmed.replace(/\D/g, "").length >= 7;
  return true;
}

export function validatePreferenceBudget(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed) || parsed < 100) return "Enter a whole-number budget of at least ₹100.";
  return undefined;
}
