import React from "react";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const mocks = vi.hoisted(() => ({
  invalidate: vi.fn(),
  mutation: { mutate: vi.fn(), isPending: true, isSuccess: false, error: null },
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ account: { overview: { invalidate: mocks.invalidate } } }),
    account: {
      overview: { useQuery: () => ({ data: { addresses: [], preferences: { favoriteCategories: [], maxBudget: null, deliveryPreference: "standard", orderUpdates: true, deliveryUpdates: true, productUpdates: true, marketingUpdates: false } }, isLoading: false }) },
      addAddress: { useMutation: () => mocks.mutation },
      updateAddress: { useMutation: () => mocks.mutation },
      deleteAddress: { useMutation: () => mocks.mutation },
      setDefaultAddress: { useMutation: () => mocks.mutation },
      savePreferences: { useMutation: () => mocks.mutation },
    },
  },
}));

import { AccountSettingsPanel, AddressServerFeedback, Field, getAddressInputClass, scrollToFirstAddressError } from "./AccountSettingsPanel";
import { extractAddressServerErrors } from "@/lib/accountSettingsServerErrors";

describe("AccountSettingsPanel feedback", () => {
  it("renders inline field errors with an accessible alert", () => {
    const markup = renderToStaticMarkup(<Field label="Postal code" error="Enter a valid postal code."><input aria-invalid="true" /></Field>);
    expect(markup).toContain("Enter a valid postal code.");
    expect(markup).toContain('role="alert"');
  });

  it("renders a nested backend postal-code error beside the matching field", () => {
    const mapped = extractAddressServerErrors({ data: { zodError: { fieldErrors: { "address.postalCode": ["Postal code is not serviceable."] }, formErrors: [] } }, message: "Invalid input" });
    const markup = renderToStaticMarkup(<Field label="Postal code" error={mapped.fieldErrors.postalCode}><input aria-invalid={Boolean(mapped.fieldErrors.postalCode)} /></Field>);
    expect(markup).toContain("Postal code is not serviceable.");
    expect(markup).toContain('aria-invalid="true"');
  });

  it("smoothly scrolls to and focuses the requested first error field", () => {
    const scrollIntoView = vi.fn();
    const focus = vi.fn();
    const schedule = vi.fn((callback: FrameRequestCallback) => { callback(0); return 1; });
    scrollToFirstAddressError("postalCode", { postalCode: { scrollIntoView, focus } as unknown as HTMLInputElement }, schedule);
    expect(schedule).toHaveBeenCalledOnce();
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "center" });
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
  });

  it("applies and clears the submit-time shake class for errored fields", () => {
    expect(getAddressInputClass(true, true)).toContain("shopex-field-shake");
    expect(getAddressInputClass(true, false)).not.toContain("shopex-field-shake");
    expect(getAddressInputClass(false, true)).toContain("shopex-field-shake");
  });

  it("renders a green checkmark and accessible status after a field recovers", () => {
    const markup = renderToStaticMarkup(<Field label="Postal code" success><input aria-invalid="false" value="411001" readOnly /></Field>);
    expect(markup).toContain('aria-label="Postal code corrected"');
    expect(markup).toContain("Looks good");
    expect(markup).toContain("text-emerald-600");
  });

  it("renders a non-field backend error in the address-form fallback presenter", () => {
    const mapped = extractAddressServerErrors({ message: "Account settings are temporarily unavailable" });
    const markup = renderToStaticMarkup(<AddressServerFeedback message={mapped.formError} />);
    expect(markup).toContain("Account settings are temporarily unavailable");
    expect(markup).toContain('role="alert"');
  });

  it("renders preference saving feedback and disables preference controls while pending", () => {
    const markup = renderToStaticMarkup(<AccountSettingsPanel userName="Asha Shah" />);
    expect(markup).toContain("Saving preferences…");
    expect(markup).toContain("Saving notification preferences");
    expect(markup).toContain("disabled");
  });
});
