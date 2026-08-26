import React, { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, CircleAlert, Home, Loader2, MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { firstAddressErrorField, isAddressFieldValueValid, validateAddress, validatePreferenceBudget, type AddressFieldErrors } from "@/lib/accountSettingsValidation";
import { extractAddressServerErrors } from "@/lib/accountSettingsServerErrors";

type AddressForm = {
  label: string;
  recipientName: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone: string;
  isDefault: boolean;
};

const emptyAddress = (name?: string | null): AddressForm => ({ label: "", recipientName: name ?? "", line1: "", line2: "", city: "", state: "", postalCode: "", country: "IN", phone: "", isDefault: false });
const fieldClass = "h-10 w-full rounded-[10px] border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100";
const invalidFieldClass = "border-red-300 bg-red-50/30 focus:border-red-400 focus:ring-red-100";

export function getAddressInputClass(hasError: boolean, isShaking: boolean) {
  return `${fieldClass} ${hasError ? invalidFieldClass : ""} ${isShaking ? "shopex-field-shake" : ""}`;
}

type AddressFieldProps = { label: string; error?: string; success?: boolean; className?: string; children: React.ReactNode };

export function AccountSettingsPanel({ userName }: { userName?: string | null }) {
  const utils = trpc.useUtils();
  const overview = trpc.account.overview.useQuery();
  const [addressForm, setAddressForm] = useState<AddressForm>(() => emptyAddress(userName));
  const addressFieldRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [addressErrors, setAddressErrors] = useState<AddressFieldErrors>({});
  const [addressServerError, setAddressServerError] = useState<string | undefined>();
  const [recoveredFields, setRecoveredFields] = useState<Set<string>>(() => new Set());
  const [shakeFields, setShakeFields] = useState<Set<string>>(() => new Set());
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addressSaved, setAddressSaved] = useState(false);
  const [preferences, setPreferences] = useState({ favoriteCategories: [] as Array<"keyboard" | "mouse" | "accessory">, maxBudget: "", deliveryPreference: "standard" as "standard" | "fastest" | "flexible", orderUpdates: true, deliveryUpdates: true, productUpdates: true, marketingUpdates: false });
  const [preferenceError, setPreferenceError] = useState<string | undefined>();

  const refresh = () => utils.account.overview.invalidate();
  const handleAddressError = (error: unknown) => {
    const mapped = extractAddressServerErrors(error);
    setAddressErrors(mapped.fieldErrors);
    setAddressServerError(mapped.formError);
  };
  const clearAddressFeedback = () => {
    setAddressErrors({});
    setAddressServerError(undefined);
    setRecoveredFields(new Set());
  };
  const addAddress = trpc.account.addAddress.useMutation({ onError: handleAddressError, onSuccess: () => { refresh(); setAddressSaved(true); clearAddressFeedback(); resetAddressForm(); } });
  const updateAddress = trpc.account.updateAddress.useMutation({ onError: handleAddressError, onSuccess: () => { refresh(); setAddressSaved(true); clearAddressFeedback(); resetAddressForm(); } });
  const removeAddress = trpc.account.deleteAddress.useMutation({ onSuccess: refresh });
  const defaultAddress = trpc.account.setDefaultAddress.useMutation({ onSuccess: refresh });
  const savePreferences = trpc.account.savePreferences.useMutation({ onSuccess: () => { refresh(); setPreferenceError(undefined); } });

  useEffect(() => {
    if (!overview.data?.preferences) return;
    const settings = overview.data.preferences;
    setPreferences({ favoriteCategories: settings.favoriteCategories, maxBudget: settings.maxBudget?.toString() ?? "", deliveryPreference: settings.deliveryPreference, orderUpdates: settings.orderUpdates, deliveryUpdates: settings.deliveryUpdates, productUpdates: settings.productUpdates, marketingUpdates: settings.marketingUpdates });
  }, [overview.data?.preferences]);

  function resetAddressForm() {
    setAddressForm(emptyAddress(userName));
    clearAddressFeedback();
    setEditingId(null);
    setShowAddressForm(false);
  }

  function startEdit(address: NonNullable<typeof overview.data>["addresses"][number]) {
    setAddressSaved(false);
    clearAddressFeedback();
    setEditingId(address.id);
    setAddressForm({ label: address.label, recipientName: address.recipientName, line1: address.line1, line2: address.line2 ?? "", city: address.city, state: address.state, postalCode: address.postalCode, country: address.country, phone: address.phone, isDefault: address.isDefault });
    setShowAddressForm(true);
  }

  function submitAddress(event: React.FormEvent) {
    event.preventDefault();
    const errors = validateAddress(addressForm);
    setAddressErrors(errors);
    setAddressServerError(undefined);
    setRecoveredFields((current) => new Set(Array.from(current).filter((field) => !errors[field as keyof AddressFieldErrors])));
    setAddressSaved(false);
    setShakeFields(new Set());
    const firstErrorField = firstAddressErrorField(errors);
    if (firstErrorField) {
      window.requestAnimationFrame(() => setShakeFields(new Set(Object.keys(errors))));
      window.setTimeout(() => setShakeFields(new Set()), 420);
      scrollToFirstAddressError(firstErrorField, addressFieldRefs.current);
      return;
    }
    const payload = { ...addressForm, line2: addressForm.line2 || null };
    if (editingId) updateAddress.mutate({ id: editingId, address: payload });
    else addAddress.mutate(payload);
  }

  function updateAddressField(field: keyof AddressForm, value: string | boolean) {
    setAddressForm((current) => ({ ...current, [field]: value }));
    const hasFieldError = field in addressErrors && Boolean(addressErrors[field as keyof AddressFieldErrors]);
    if (hasFieldError) setAddressErrors((current) => ({ ...current, [field]: undefined }));
    if (typeof value === "string" && field !== "line2" && field !== "isDefault") {
      const valid = isAddressFieldValueValid(field as "label" | "recipientName" | "line1" | "city" | "state" | "postalCode" | "country" | "phone", value);
      setRecoveredFields((current) => {
        const next = new Set(current);
        if (hasFieldError && valid) next.add(field);
        if (!valid) next.delete(field);
        return next;
      });
    }
    setAddressServerError(undefined);
    setAddressSaved(false);
  }

  function toggleCategory(category: "keyboard" | "mouse" | "accessory") {
    setPreferences((current) => ({ ...current, favoriteCategories: current.favoriteCategories.includes(category) ? current.favoriteCategories.filter((item) => item !== category) : [...current.favoriteCategories, category] }));
  }

  function submitPreferences(event: React.FormEvent) {
    event.preventDefault();
    const budgetError = validatePreferenceBudget(preferences.maxBudget);
    setPreferenceError(budgetError);
    if (budgetError) return;
    const parsedBudget = preferences.maxBudget.trim() ? Number(preferences.maxBudget) : null;
    savePreferences.mutate({ ...preferences, maxBudget: parsedBudget });
  }

  const addresses = overview.data?.addresses ?? [];
  const error = overview.error ?? addAddress.error ?? updateAddress.error ?? removeAddress.error ?? defaultAddress.error ?? savePreferences.error;
  const addressBusy = addAddress.isPending || updateAddress.isPending || removeAddress.isPending || defaultAddress.isPending;
  const formBusy = addAddress.isPending || updateAddress.isPending;
  const settingsBusy = savePreferences.isPending;

  return <section className="mt-10 space-y-6">
    <div><p className="text-sm font-semibold uppercase tracking-[.16em] text-violet-600">Account settings</p><h2 className="mt-2 text-3xl font-semibold tracking-[-.05em] text-slate-950">Delivery and preferences</h2><p className="mt-2 text-sm text-slate-500">Only you can view or change the delivery details and preferences stored for this account.</p></div>
    {error && <div role="alert" className="rounded-[16px] border border-red-100 bg-red-50 p-4 text-sm text-red-800"><CircleAlert className="mr-2 inline h-4 w-4" />{error.message}</div>}
    <div className="grid gap-6 xl:grid-cols-[1.05fr_.95fr]">
      <section className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-[0_12px_32px_rgba(15,23,42,.035)] sm:p-6">
        <div className="flex items-start justify-between gap-4"><div><div className="flex items-center gap-2 text-slate-950"><MapPin className="h-5 w-5 text-violet-600" /><h3 className="text-lg font-semibold">Saved addresses</h3></div><p className="mt-1 text-sm leading-6 text-slate-500">Use a saved delivery address when placing a future order.</p></div><Button onClick={() => { setShowAddressForm(true); setEditingId(null); setAddressForm(emptyAddress(userName)); setAddressErrors({}); setAddressSaved(false); }} size="sm" disabled={addressBusy} className="rounded-[10px] bg-violet-600 text-white hover:bg-violet-700"><Plus className="mr-1 h-4 w-4" />Add</Button></div>
        {overview.isLoading ? <div className="mt-5 h-28 animate-pulse rounded-[16px] bg-slate-50" /> : addresses.length ? <div className="mt-5 space-y-3">{addresses.map((address) => <div key={address.id} className="rounded-[16px] border border-slate-200 p-4"><div className="flex items-start justify-between gap-4"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-slate-950">{address.label}</p>{address.isDefault && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700"><Check className="h-3 w-3" />Default</span>}</div><p className="mt-2 text-sm text-slate-700">{address.recipientName}</p><p className="text-sm leading-5 text-slate-500">{address.line1}{address.line2 ? `, ${address.line2}` : ""}<br />{address.city}, {address.state} {address.postalCode}<br />{address.country} · {address.phone}</p></div><div className="flex shrink-0 gap-1"><button onClick={() => startEdit(address)} disabled={addressBusy} className="rounded-full p-2 text-slate-400 hover:bg-violet-50 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-50" aria-label={`Edit ${address.label}`}><Pencil className="h-4 w-4" /></button><button onClick={() => removeAddress.mutate({ id: address.id })} disabled={addressBusy} className="rounded-full p-2 text-slate-400 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50" aria-label={`Remove ${address.label}`}>{removeAddress.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}</button></div></div>{!address.isDefault && <button onClick={() => defaultAddress.mutate({ id: address.id })} disabled={addressBusy} className="mt-3 inline-flex items-center text-xs font-semibold text-violet-700 hover:text-violet-900 disabled:cursor-not-allowed disabled:opacity-50">{defaultAddress.isPending ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}Make default</button>}</div>)}</div> : <div className="mt-5 rounded-[16px] border border-dashed border-slate-200 bg-slate-50 p-6 text-center"><Home className="mx-auto h-5 w-5 text-violet-500" /><p className="mt-2 text-sm font-medium text-slate-800">No saved addresses</p><p className="mt-1 text-xs leading-5 text-slate-500">Add an address only when you want ShopEx to remember it for your account.</p></div>}
        {showAddressForm && <form onSubmit={submitAddress} noValidate className="mt-5 rounded-[18px] border border-violet-100 bg-violet-50/50 p-4"><div className="flex items-center justify-between"><p className="font-semibold text-slate-950">{editingId ? "Edit address" : "New address"}</p><button type="button" onClick={resetAddressForm} disabled={formBusy} className="text-xs font-semibold text-slate-500 hover:text-slate-900 disabled:opacity-50">Cancel</button></div><div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="Label" error={addressErrors.label} success={recoveredFields.has("label")}>        <input ref={(element) => { addressFieldRefs.current.label = element; }} aria-invalid={!!addressErrors.label} aria-describedby={addressErrors.label ? "address-label-error" : undefined} className={getAddressInputClass(!!addressErrors.label, shakeFields.has("label"))} value={addressForm.label} onChange={(event) => updateAddressField("label", event.target.value)} placeholder="Home" /></Field>
          <Field label="Recipient" error={addressErrors.recipientName} success={recoveredFields.has("recipientName")}><input ref={(element) => { addressFieldRefs.current.recipientName = element; }} aria-invalid={!!addressErrors.recipientName} aria-describedby={addressErrors.recipientName ? "address-recipientName-error" : undefined} className={getAddressInputClass(!!addressErrors.recipientName, shakeFields.has("recipientName"))} value={addressForm.recipientName} onChange={(event) => updateAddressField("recipientName", event.target.value)} /></Field>
          <Field label="Address line 1" error={addressErrors.line1} success={recoveredFields.has("line1")} className="sm:col-span-2"><input ref={(element) => { addressFieldRefs.current.line1 = element; }} aria-invalid={!!addressErrors.line1} className={getAddressInputClass(!!addressErrors.line1, shakeFields.has("line1"))} value={addressForm.line1} onChange={(event) => updateAddressField("line1", event.target.value)} /></Field>
          <Field label="Address line 2" className="sm:col-span-2"><input className={fieldClass} value={addressForm.line2} onChange={(event) => updateAddressField("line2", event.target.value)} /></Field>
          <Field label="City" error={addressErrors.city} success={recoveredFields.has("city")}><input ref={(element) => { addressFieldRefs.current.city = element; }} aria-invalid={!!addressErrors.city} className={getAddressInputClass(!!addressErrors.city, shakeFields.has("city"))} value={addressForm.city} onChange={(event) => updateAddressField("city", event.target.value)} /></Field>
          <Field label="State" error={addressErrors.state} success={recoveredFields.has("state")} ><input ref={(element) => { addressFieldRefs.current.state = element; }} aria-invalid={!!addressErrors.state} className={getAddressInputClass(!!addressErrors.state, shakeFields.has("state"))} value={addressForm.state} onChange={(event) => updateAddressField("state", event.target.value)} /></Field>
          <Field label="Postal code" error={addressErrors.postalCode} success={recoveredFields.has("postalCode")}><input ref={(element) => { addressFieldRefs.current.postalCode = element; }} aria-invalid={!!addressErrors.postalCode} className={getAddressInputClass(!!addressErrors.postalCode, shakeFields.has("postalCode"))} value={addressForm.postalCode} onChange={(event) => updateAddressField("postalCode", event.target.value)} /></Field>
          <Field label="Country code" error={addressErrors.country} success={recoveredFields.has("country")}><input ref={(element) => { addressFieldRefs.current.country = element; }} aria-invalid={!!addressErrors.country} maxLength={2} className={getAddressInputClass(!!addressErrors.country, shakeFields.has("country"))} value={addressForm.country} onChange={(event) => updateAddressField("country", event.target.value.toUpperCase())} /></Field>
          <Field label="Phone" error={addressErrors.phone} success={recoveredFields.has("phone")} className="sm:col-span-2"><input ref={(element) => { addressFieldRefs.current.phone = element; }} aria-invalid={!!addressErrors.phone} className={getAddressInputClass(!!addressErrors.phone, shakeFields.has("phone"))} value={addressForm.phone} onChange={(event) => updateAddressField("phone", event.target.value)} /></Field>
        </div><AddressServerFeedback message={addressServerError} /><label className="mt-4 flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={addressForm.isDefault} onChange={(event) => updateAddressField("isDefault", event.target.checked)} />Make this my default address</label><div className="mt-4 flex items-center gap-3"><Button type="submit" disabled={formBusy} className="rounded-[10px] bg-violet-600 text-white hover:bg-violet-700">{formBusy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{editingId ? "Saving changes…" : "Saving address…"}</> : editingId ? "Save changes" : "Save address"}</Button>{addressSaved && <span role="status" className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700"><Check className="h-3 w-3" />Saved</span>}</div></form>}
      </section>
      <form onSubmit={submitPreferences} noValidate className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-[0_12px_32px_rgba(15,23,42,.035)] sm:p-6"><div className="flex items-center gap-2 text-slate-950"><ChevronDown className="h-5 w-5 text-violet-600" /><h3 className="text-lg font-semibold">Shopping preferences</h3></div><p className="mt-1 text-sm leading-6 text-slate-500">These preferences help shape future recommendations. They do not replace the requirements you approve for an individual purchase.</p><Field label="Interested in" className="mt-5"><div className="flex flex-wrap gap-2">{(["keyboard", "mouse", "accessory"] as const).map((category) => <button type="button" key={category} onClick={() => toggleCategory(category)} disabled={settingsBusy} aria-pressed={preferences.favoriteCategories.includes(category)} className={`rounded-full px-3 py-2 text-xs font-semibold capitalize disabled:cursor-not-allowed disabled:opacity-60 ${preferences.favoriteCategories.includes(category) ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-violet-50"}`}>{category}</button>)}</div></Field><div className="mt-4 grid gap-3 sm:grid-cols-2"><Field label="Typical budget (₹)" error={preferenceError}><input aria-invalid={!!preferenceError} className={`${fieldClass} ${preferenceError ? invalidFieldClass : ""}`} inputMode="numeric" value={preferences.maxBudget} onChange={(event) => { setPreferences({ ...preferences, maxBudget: event.target.value.replace(/[^0-9]/g, "") }); setPreferenceError(undefined); }} placeholder="Optional" /></Field><Field label="Delivery preference"><select disabled={settingsBusy} className={fieldClass} value={preferences.deliveryPreference} onChange={(event) => setPreferences({ ...preferences, deliveryPreference: event.target.value as typeof preferences.deliveryPreference })}><option value="standard">Standard delivery</option><option value="fastest">Fastest available</option><option value="flexible">Flexible timing</option></select></Field></div><div className="mt-6 border-t border-slate-100 pt-5"><p className="text-sm font-semibold text-slate-950">Notifications</p><p className="mt-1 text-xs leading-5 text-slate-500">Choose which ShopEx updates this account may receive.</p><div className="mt-4 space-y-4"><PreferenceSwitch label="Order updates" copy="Approval, payment, and order status changes." checked={preferences.orderUpdates} disabled={settingsBusy} onCheckedChange={(value) => setPreferences({ ...preferences, orderUpdates: value })} /><PreferenceSwitch label="Delivery updates" copy="Delivery progress for confirmed orders." checked={preferences.deliveryUpdates} disabled={settingsBusy} onCheckedChange={(value) => setPreferences({ ...preferences, deliveryUpdates: value })} /><PreferenceSwitch label="Product updates" copy="Updates about saved-category products." checked={preferences.productUpdates} disabled={settingsBusy} onCheckedChange={(value) => setPreferences({ ...preferences, productUpdates: value })} /><PreferenceSwitch label="Marketing updates" copy="Occasional ShopEx offers and news." checked={preferences.marketingUpdates} disabled={settingsBusy} onCheckedChange={(value) => setPreferences({ ...preferences, marketingUpdates: value })} /></div></div><div className="mt-6 flex items-center gap-3"><Button type="submit" disabled={settingsBusy} className="rounded-[10px] bg-slate-950 text-white hover:bg-violet-700">{settingsBusy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving preferences…</> : "Save preferences"}</Button>{savePreferences.isSuccess && !settingsBusy && <span role="status" className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700"><Check className="h-3 w-3" />Saved</span>}</div></form>
    </div>
  </section>;
}

export function scrollToFirstAddressError(field: string, refs: Record<string, HTMLInputElement | null>, schedule: (callback: FrameRequestCallback) => number = (callback) => window.requestAnimationFrame(callback)) {
  schedule(() => {
    const input = refs[field];
    input?.scrollIntoView({ behavior: "smooth", block: "center" });
    input?.focus({ preventScroll: true });
  });
}

export function AddressServerFeedback({ message }: { message?: string }) {
  if (!message) return null;
  return <div role="alert" className="mt-4 rounded-[12px] border border-red-100 bg-red-50 px-3 py-2 text-xs font-medium text-red-800"><CircleAlert className="mr-1 inline h-3.5 w-3.5" />{message}</div>;
}

export function Field({ label, error, success = false, children, className = "" }: AddressFieldProps) {
  const errorId = `${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-error`;
  return <label className={`block text-xs font-semibold text-slate-600 ${className}`}><span className="mb-1.5 block">{label}</span><span className="relative block">{children}{success && !error && <span role="status" aria-label={`${label} corrected`} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-emerald-600"><Check className="h-4 w-4" /></span>}</span>{error && <span id={errorId} role="alert" className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-red-700"><CircleAlert className="h-3 w-3" />{error}</span>}{success && !error && <span role="status" className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700"><Check className="h-3 w-3" />Looks good</span>}</label>;
}

function PreferenceSwitch({ label, copy, checked, disabled, onCheckedChange }: { label: string; copy: string; checked: boolean; disabled?: boolean; onCheckedChange: (value: boolean) => void }) {
  return <div className={`flex items-center justify-between gap-4 ${disabled ? "opacity-60" : ""}`}><div><p className="text-sm font-medium text-slate-800">{label}</p><p className="mt-0.5 text-xs leading-5 text-slate-500">{copy}</p></div><div className="flex items-center gap-2">{disabled && <Loader2 aria-label="Saving notification preferences" className="h-3.5 w-3.5 animate-spin text-violet-600" />}<Switch disabled={disabled} checked={checked} onCheckedChange={onCheckedChange} aria-label={label} /></div></div>;
}
