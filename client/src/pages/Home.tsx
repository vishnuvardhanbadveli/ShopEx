import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, FileText, History, Menu, ShieldCheck, Sparkles, Store, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { evaluatePolicy } from "@/lib/policyEngine";
import { paymentFlowReducer, type PaymentFlowStatus } from "@/lib/paymentFlow";
import { recoverOrderState } from "@/lib/orderRecovery";
import { CHECKOUT_DRAFT_STORAGE_KEY, parseCheckoutDraft, serializeCheckoutDraft } from "@/lib/checkoutDraft";
import { validateCatalogFeed } from "@/lib/catalogFeed";
import { filterAuditEvents, mapPersistedAuditEvent, readinessLabel } from "@/lib/viewModel";
import { money, toCatalogItem, type CandidateResult, type IntentSpec } from "@/lib/shopEx";
import { ShopExMark } from "@/components/shopex/ProductArt";
import { IntentComposer } from "@/components/shopex/IntentComposer";
import { IntentReview } from "@/components/shopex/IntentReview";
import { ProductDetail, ProductDiscovery } from "@/components/shopex/ProductViews";
import { CrossSellPanel } from "@/components/shopex/CrossSellPanel";
import { ApprovalCard } from "@/components/shopex/ApprovalCard";
import { EvidenceView } from "@/components/shopex/EvidenceView";
import { OrderConfirmation, OrderHistory } from "@/components/shopex/OrderViews";
import { OrderDetailView } from "@/components/shopex/OrderDetailView";
import { nextOrderStage } from "@/lib/orderNavigation";
import { useLocation } from "wouter";

type BuyerStage = "home" | "review" | "discovery" | "detail" | "approval" | "confirmation" | "orders" | "order-detail" | "evidence";
type AuditEvent = { time: string; actor: string; action: string; result: string; tone: "lime" | "amber" | "blue" | "red"; detail?: { eventId?: string; orderId?: string; provider?: string; failure?: string; transition?: string } };

const seedAudit: AuditEvent[] = [
  { time: "now", actor: "ShopEx", action: "REQUEST_RECEIVED", result: "ready to understand", tone: "blue" },
];

const emptyIntent: IntentSpec = {
  product: "",
  category: "",
  budget: 0,
  currency: "INR",
  connectivity: "Not specified",
  purpose: "Not specified",
  deliveryDays: 7,
  attributes: [],
  constraints: [],
};
const journey = [
  { id: "home" as const, label: "Tell us" },
  { id: "review" as const, label: "Confirm" },
  { id: "discovery" as const, label: "Choose" },
  { id: "approval" as const, label: "Review" },
  { id: "confirmation" as const, label: "Done" },
];

export default function Home() {
  const [, setLocation] = useLocation();
  const [stage, setStage] = useState<BuyerStage>("home");
  const [prompt, setPrompt] = useState("");
  const [intent, setIntent] = useState<IntentSpec>(emptyIntent);
  const [intentSource, setIntentSource] = useState<"gemini" | "fallback">("fallback");
  const [intentWarning, setIntentWarning] = useState<string | undefined>();
  const [selectedSku, setSelectedSku] = useState<string | null>(null);
  const [upsellSku, setUpsellSku] = useState<string | undefined>();
  const [selectedAddressId, setSelectedAddressId] = useState<number | undefined>();
  const [paymentState, setPaymentState] = useState<PaymentFlowStatus>("idle");
  const [activeOrderId, setActiveOrderId] = useState<string | null>(() => typeof window === "undefined" ? null : localStorage.getItem("shopex-active-order-id"));
  const [audit, setAudit] = useState<AuditEvent[]>(seedAudit);
  const confirmationRecorded = useRef(false);
  const recoveredOrderId = useRef<string | null>(null);
  const checkoutDraftRestored = useRef(false);

  const auth = trpc.auth.me.useQuery();
  const accountOverview = trpc.account.overview.useQuery(undefined, { enabled: Boolean(auth.data) });
  const parseIntent = trpc.intent.parse.useMutation();
  const catalogQuery = trpc.catalog.list.useQuery({ includeOutOfStock: true }, { staleTime: 15_000 });
  const productSearch = trpc.products.search.useQuery(
  {
    query: intent.product || "popular products",
    maxPrice: intent.budget > 0 ? intent.budget : undefined,
    deliveryDays: intent.deliveryDays < 60 ? intent.deliveryDays : undefined,
  },
  {
    enabled: false,
    staleTime: 15_000,
  },

);
  
  const createOrder = trpc.payment.createOrder.useMutation();
  const verifyPayment = trpc.payment.verifyPayment.useMutation();
  const readiness = trpc.payment.readiness.useQuery(undefined, { refetchInterval: 10000 });
  const myOrders = trpc.payment.myOrders.useQuery({ limit: 25 }, { enabled: Boolean(auth.data), refetchInterval: 5000 });
  const orderStatus = trpc.payment.orderStatus.useQuery({ orderId: activeOrderId ?? "pending" }, { enabled: Boolean(auth.data && activeOrderId), refetchInterval: 3000 });
  const orderEvents = trpc.payment.orderEvents.useQuery({ orderId: activeOrderId ?? "pending", limit: 8 }, { enabled: Boolean(auth.data && activeOrderId), refetchInterval: 4000 });
  const resumeOrder = trpc.payment.resumeOrder.useQuery({ orderId: activeOrderId ?? "pending" }, { enabled: false });

  const catalog = useMemo(() => (catalogQuery.data?.products ?? []).map(toCatalogItem), [catalogQuery.data]);
  const liveProducts = useMemo(
  () =>
    (productSearch.data?.products ?? []).map((product) => ({
      ...product,
      category: intent.category || product.category,
    })),
  [productSearch.data, intent.category],
);
  const selected = catalog.find((item) => item.sku === selectedSku);
  const upsell = catalog.find((item) => item.sku === upsellSku);
  const total = (selected?.price ?? 0) + (upsell?.price ?? 0);
  const feedValidation = validateCatalogFeed(catalog);
  const candidateResults: CandidateResult[] = useMemo(() => catalog.map((item) => ({ item, ...evaluatePolicy({ category: item.category, price: item.price, stock: item.stock, deliveryDays: item.deliveryDays, attributes: item.attributes }, { requestedCategory: intent.category, maxPrice: intent.budget, deliveryDays: intent.deliveryDays, attributes: intent.attributes }) })), [intent]);
  const selectedResult = candidateResults.find((candidate) => candidate.item.sku === selected?.sku);
  const policyPass = Boolean(selected && selectedResult?.pass && total <= intent.budget);
  const currentOrder = orderStatus.data?.order ?? myOrders.data?.find((order) => order.orderId === activeOrderId);
  const approvalItem = selected ?? currentOrder?.product ?? undefined;
  const approvalUpsell = upsell ?? currentOrder?.upsell ?? undefined;
  const approvalTotal = currentOrder ? currentOrder.amount / 100 : total;
  const resumePending = Boolean(currentOrder && recoverOrderState(currentOrder.status).resumeAvailable && paymentState === "idle");
  useEffect(() => {
    if (selectedAddressId || !accountOverview.data?.addresses.length) return;
    const defaultAddress = accountOverview.data.addresses.find((address) => address.isDefault) ?? accountOverview.data.addresses[0];
    if (defaultAddress) setSelectedAddressId(defaultAddress.id);
  }, [accountOverview.data, selectedAddressId]);

  const readinessView = readinessLabel(readiness.data ?? { razorpayKeyConfigured: false, razorpaySecretConfigured: false, webhookSecretConfigured: false });
  const auditItems = useMemo(() => [...audit, ...(orderEvents.data ?? []).map((event) => mapPersistedAuditEvent(event))], [audit, orderEvents.data]);
  const visibleAudit = filterAuditEvents(auditItems, "all").slice(-8);
  const currentJourneyIndex = journey.findIndex((item) => item.id === stage);

  const time = () => new Date().toLocaleTimeString("en-IN", { hour12: false });
  const addAudit = (event: AuditEvent) => setAudit((events) => [...events, event]);

  useEffect(() => {
    if (!activeOrderId) return;
    localStorage.setItem("shopex-active-order-id", activeOrderId);
  }, [activeOrderId]);

  useEffect(() => {
    if (!activeOrderId || orderStatus.isLoading) return;
    if (orderStatus.isError && orderStatus.error.data?.code === "NOT_FOUND") {
      localStorage.removeItem("shopex-active-order-id");
      setActiveOrderId(null);
    }
  }, [activeOrderId, orderStatus.error, orderStatus.isError, orderStatus.isLoading]);

  useEffect(() => {
    if (checkoutDraftRestored.current || !auth.data || catalogQuery.isPending || catalogQuery.isError) return;
    checkoutDraftRestored.current = true;
    const draft = parseCheckoutDraft(localStorage.getItem(CHECKOUT_DRAFT_STORAGE_KEY));
    if (!draft) return;
    localStorage.removeItem(CHECKOUT_DRAFT_STORAGE_KEY);
    const restoredProduct = catalog.find((item) => item.sku === draft.selectedSku && item.stock > 0);
    if (!restoredProduct) {
      setPrompt(draft.prompt);
      setIntent(draft.intent);
      setIntentWarning("Your saved item is no longer available. Please choose another matching product.");
      setStage("discovery");
      return;
    }
    setPrompt(draft.prompt);
    setIntent(draft.intent);
    setSelectedSku(draft.selectedSku);
      setUpsellSku(draft.upsellSku);
      setSelectedAddressId(draft.addressId);
      setStage("approval");
    addAudit({ time: time(), actor: "ShopEx", action: "CHECKOUT_RESTORED", result: "Your reviewed order was restored after sign in", tone: "blue" });
  }, [auth.data, catalog, catalogQuery.isError, catalogQuery.isPending]);

  useEffect(() => {
    if (!currentOrder) return;
    const recovered = recoverOrderState(currentOrder.status);
    if (currentOrder.status === "captured" && !confirmationRecorded.current) {
      confirmationRecorded.current = true;
      setPaymentState("captured");
      setStage("confirmation");
      addAudit({ time: time(), actor: "ShopEx", action: "ORDER_CONFIRMED", result: `${currentOrder.orderId} · captured`, tone: "lime", detail: { orderId: currentOrder.orderId, provider: "Razorpay", transition: "verified → captured" } });
      return;
    }
    if (currentOrder.status === "failed" && paymentState !== "failed") {
      setPaymentState("failed");
      setStage("approval");
      addAudit({ time: time(), actor: "ShopEx", action: "ORDER_FAILED", result: `${currentOrder.orderId} · payment failure recorded`, tone: "red", detail: { orderId: currentOrder.orderId, provider: "Razorpay", transition: "pending → failed" } });
      return;
    }
    if (recoveredOrderId.current === currentOrder.orderId) return;
    recoveredOrderId.current = currentOrder.orderId;
    setPaymentState(recovered.paymentState);
    setStage(recovered.stage);
  }, [currentOrder, paymentState]);

  function continueFromPrompt() {
  parseIntent.mutate(
    { prompt },
    {
      onSuccess: (result) => {
        const nextIntent = result.intent;

        setIntent(nextIntent);
        setIntentSource(result.source);
        setIntentWarning(result.warning);
        setSelectedSku(null);
        setUpsellSku(undefined);
        setStage("review");

        addAudit({
          time: time(),
          actor: "ShopEx",
          action: "REQUEST_INTERPRETED",
          result: `${nextIntent.product} · ${
            result.source === "gemini"
              ? "structured Gemini parse"
              : "fallback parse"
          }`,
          tone: result.source === "gemini" ? "blue" : "amber",
        });
      },

      onError: (error) => {
        setIntentWarning(
          `The intent parser could not be reached. Please try again and review any interpretation carefully. (${error.message})`,
        );

        setIntentSource("fallback");
        setStage("review");

        addAudit({
          time: time(),
          actor: "ShopEx",
          action: "REQUEST_PARSE_DEGRADED",
          result: "Parser unavailable · review required",
          tone: "amber",
        });
      },
    },
  );
}

  async function findProducts() {
  if (productSearch.isFetching) {
    return;
  }

  setIntentWarning(undefined);

  try {
    const result = await productSearch.refetch();

    if (result.error) {
      setIntentWarning(
        `Real product search failed. ${result.error.message}`,
      );
      addAudit({
        time: time(),
        actor: "ShopEx",
        action: "SEARCH_FAILED",
        result: result.error.message,
        tone: "amber",
      });
      return;
    }

    setStage("discovery");

    addAudit({
      time: time(),
      actor: "ShopEx",
      action: "SEARCH_STARTED",
      result: `${result.data?.products.length ?? 0} real products found`,
      tone: "blue",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown search error";

    setIntentWarning(`Real product search failed. ${message}`);

    addAudit({
      time: time(),
      actor: "ShopEx",
      action: "SEARCH_FAILED",
      result: message,
      tone: "amber",
    });
  }
}

  function selectProduct(sku: string) {
    const candidate = candidateResults.find((item) => item.item.sku === sku);
    if (!candidate?.pass) return;
    setSelectedSku(sku); setUpsellSku(undefined); setStage("detail");
    addAudit({ time: time(), actor: "ShopEx", action: "PRODUCT_SELECTED", result: candidate.item.name, tone: "blue" });
  }

  function acceptUpsell(sku: string) {
    if (!selected) return;
    const option = catalog.find((item) => item.sku === sku);
    if (!option) return;
    if (selected.price + option.price > intent.budget) {
      addAudit({ time: time(), actor: "ShopEx", action: "ADD_ON_BLOCKED", result: `${option.name} would exceed your ${money(intent.budget)} limit`, tone: "amber" });
      return;
    }
    setUpsellSku(sku);
    addAudit({ time: time(), actor: "ShopEx", action: "BASKET_RECHECKED", result: `${option.name} added · ${money(selected.price + option.price)} total`, tone: "lime" });
  }

  function openRazorpayCheckout(keyId: string, order: { id: string; amount: number; currency: string }) {
    setActiveOrderId(order.id);
    const RazorpayCheckout = (window as unknown as { Razorpay?: new (options: Record<string, unknown>) => { on: (event: string, callback: (response: { error?: { description?: string }; razorpay_order_id?: string; razorpay_payment_id?: string; razorpay_signature?: string }) => void) => void; open: () => void } }).Razorpay;
    if (!RazorpayCheckout) {
      setPaymentState("failed");
      addAudit({ time: time(), actor: "ShopEx", action: "CHECKOUT_UNAVAILABLE", result: "Payment could not start because secure checkout is unavailable", tone: "red", detail: { orderId: order.id, provider: "Razorpay", failure: "checkout unavailable", transition: "awaiting → failed" } });
      return;
    }
    const checkout = new RazorpayCheckout({ key: keyId, amount: order.amount, currency: order.currency, name: "ShopEx", description: selected?.name ?? currentOrder?.product?.name ?? "ShopEx order", order_id: order.id, handler: (response: { razorpay_order_id?: string; razorpay_payment_id?: string; razorpay_signature?: string }) => {
      if (!response.razorpay_order_id || !response.razorpay_payment_id || !response.razorpay_signature) {
        setPaymentState("invalid_signature");
        addAudit({ time: time(), actor: "ShopEx", action: "PAYMENT_RESPONSE_INVALID", result: "The provider response was incomplete and was not accepted", tone: "red", detail: { orderId: order.id, provider: "Razorpay", failure: "incomplete provider response", transition: "awaiting → invalid_signature" } });
        return;
      }
      verifyPayment.mutate({ orderId: response.razorpay_order_id, paymentId: response.razorpay_payment_id, signature: response.razorpay_signature }, {
        onSuccess: () => {
          setPaymentState(paymentFlowReducer("awaiting", { type: "PAYMENT_VERIFIED" }));
          addAudit({ time: time(), actor: "ShopEx", action: "PAYMENT_VERIFIED", result: `${response.razorpay_payment_id} · waiting for provider confirmation`, tone: "lime", detail: { orderId: response.razorpay_order_id, provider: "Razorpay", transition: "awaiting → verified" } });
        },
        onError: () => {
          setPaymentState(paymentFlowReducer("awaiting", { type: "SIGNATURE_INVALID" }));
          addAudit({ time: time(), actor: "ShopEx", action: "PAYMENT_NOT_VERIFIED", result: "The payment signature did not match", tone: "red", detail: { orderId: response.razorpay_order_id, provider: "Razorpay", failure: "invalid signature", transition: "awaiting → invalid_signature" } });
        },
      });
    } });
    checkout.on("payment.failed", (response) => {
      setPaymentState(paymentFlowReducer("awaiting", { type: "PAYMENT_FAILED" }));
      addAudit({ time: time(), actor: "Razorpay", action: "PAYMENT_FAILED", result: response.error?.description ?? "The payment was declined", tone: "red", detail: { orderId: order.id, provider: "Razorpay", failure: response.error?.description ?? "declined", transition: "awaiting → failed" } });
    });
    checkout.open();
  }

  function approvePayment() {
    if (!auth.data) {
      if (selected) localStorage.setItem(CHECKOUT_DRAFT_STORAGE_KEY, serializeCheckoutDraft({ prompt, intent, selectedSku: selected.sku, upsellSku, addressId: selectedAddressId }));
      addAudit({ time: time(), actor: "ShopEx", action: "SIGN_IN_REQUIRED", result: "Sign in is required before a payment order can be created", tone: "amber" });
      startLogin();
      return;
    }
    if (!selected || !policyPass) return;
    const approvedState = paymentFlowReducer("idle", { type: "APPROVAL_RECORDED" });
    setPaymentState(approvedState); setStage("approval");
    addAudit({ time: time(), actor: "You", action: "PURCHASE_APPROVED", result: `${money(total)} · authorization recorded`, tone: "lime" });
      createOrder.mutate({ amount: total * 100, receipt: `shopex_${Date.now()}`, sku: selected.sku, includeUpsell: Boolean(upsell), upsellSku: upsell?.sku, addressId: selectedAddressId, intent }, {
      onSuccess: ({ keyId, order }) => {
        setPaymentState(paymentFlowReducer(approvedState, { type: "CHECKOUT_READY" }));
        addAudit({ time: time(), actor: "Razorpay", action: "ORDER_CREATED", result: `${order.id} · ${money(order.amount / 100)}`, tone: "blue", detail: { orderId: order.id, provider: "Razorpay", transition: "approved → awaiting" } });
        openRazorpayCheckout(keyId, order);
      },
      onError: (error) => { setPaymentState("failed"); addAudit({ time: time(), actor: "Razorpay", action: "ORDER_CREATE_FAILED", result: error.message || "The order could not be created", tone: "red", detail: { provider: "Razorpay", failure: error.message, transition: "approved → failed" } }); },
    });
  }

  async function resumePayment() {
    const result = await resumeOrder.refetch();
    if (!result.data) {
      setPaymentState("failed");
      addAudit({ time: time(), actor: "ShopEx", action: "ORDER_RESUME_FAILED", result: result.error?.message ?? "The pending order could not be resumed", tone: "red" });
      return;
    }
    setPaymentState("awaiting");
    openRazorpayCheckout(result.data.keyId, result.data.order);
  }

  function resetFlow() { setStage("home"); setPrompt(""); setIntent(emptyIntent); setSelectedSku(null); setUpsellSku(undefined); setSelectedAddressId(undefined); setPaymentState("idle"); setActiveOrderId(null); localStorage.removeItem("shopex-active-order-id"); confirmationRecorded.current = false; recoveredOrderId.current = null; setAudit(seedAudit); }

  const setEvidence = () => setStage("evidence");
  const backToShop = () => setStage("home");
  const openOrders = () => { if (!auth.data) { startLogin(); return; } setStage("orders"); };

  if (stage === "evidence") return <div className="min-h-screen shopex-shell shopex-noise"><Header onOrders={openOrders} onProfile={() => auth.data ? setLocation("/profile") : startLogin()} onEvidence={setEvidence} onReset={resetFlow} userName={auth.data?.name} onSignIn={startLogin} evidenceActive /><main className="mx-auto max-w-7xl px-5 py-10 sm:px-8"><EvidenceView events={visibleAudit} paymentState={paymentState} readiness={readinessView} merchantReady={Boolean(auth.data)} onBack={backToShop} /></main></div>;

  return <div className="min-h-screen shopex-shell shopex-noise text-slate-950"><Header onOrders={openOrders} onProfile={() => auth.data ? setLocation("/profile") : startLogin()} onEvidence={setEvidence} onReset={resetFlow} userName={auth.data?.name} onSignIn={startLogin} /><div className="border-b border-violet-100 bg-white/70"><div className="mx-auto flex max-w-7xl items-center justify-center gap-2 px-5 py-3 text-center text-xs font-medium text-slate-500 sm:text-sm"><ShieldCheck className="h-4 w-4 text-emerald-500" />You approve every purchase. ShopEx only recommends and prepares your order.</div></div><main className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-12"><JourneyProgress stage={stage} currentIndex={currentJourneyIndex} /><div className="mt-10 shopex-enter">{stage === "home" && <><IntentComposer prompt={prompt} onPromptChange={setPrompt} onContinue={continueFromPrompt} onExample={(value) => setPrompt(value)} disabled={parseIntent.isPending} /><div className="mx-auto mt-12 grid max-w-4xl gap-4 sm:grid-cols-3"><TrustCard icon={<Sparkles className="h-4 w-4" />} title="Natural language" copy="Describe your need like you would to a helpful friend." /><TrustCard icon={<ShieldCheck className="h-4 w-4" />} title="Clear reasoning" copy="See the requirements each recommendation satisfies." /><TrustCard icon={<Store className="h-4 w-4" />} title="You stay in control" copy="No payment happens until you explicitly approve it." /></div></>}{stage === "review" && <IntentReview intent={intent} source={intentSource} warning={intentWarning} onEdit={() => setStage("home")} onFind={findProducts} />}{stage === "discovery" && <ProductDiscovery
  candidates={candidateResults}
  externalProducts={liveProducts}
  selectedSku={selectedSku}
  onSelect={selectProduct}
  onExternalSelect={(product) => {
    if (product.externalUrl) {
      window.open(product.externalUrl, "_blank", "noopener,noreferrer");
    }
  }}
  onBack={() => setStage("home")}
/>}{stage === "detail" && selected && selectedResult && <div className="space-y-6"><ProductDetail item={selected} reasons={selectedResult.reasons} onBack={() => setStage("discovery")} onChoose={() => policyPass && setStage("approval")} /><div className="mx-auto max-w-4xl"><CrossSellPanel options={catalog.filter((item) => item.category !== selected.category && item.stock > 0)} selected={selected} total={total} budget={intent.budget} activeSku={upsellSku} onChoose={acceptUpsell} onRemove={() => setUpsellSku(undefined)} /></div></div>}{stage === "approval" && approvalItem && <ApprovalCard selected={approvalItem} upsell={approvalUpsell} total={approvalTotal} policyPass={policyPass || Boolean(currentOrder)} paymentState={paymentState} onApprove={approvePayment} onReturn={() => currentOrder ? setStage("orders") : setStage("detail")} resumePending={resumePending} onResume={resumePayment} addresses={accountOverview.data?.addresses} addressId={selectedAddressId} onAddressChange={setSelectedAddressId} reasons={selectedResult?.reasons.filter((reason) => reason.pass).map((reason) => `${reason.key}: ${reason.value}`)} />}{stage === "confirmation" && currentOrder && <OrderConfirmation order={currentOrder} onContinue={resetFlow} onViewOrder={() => setStage(nextOrderStage("confirmation", "view-order"))} />}{stage === "orders" && <OrderHistory orders={myOrders.data ?? []} onViewOrder={(orderId) => { setActiveOrderId(orderId); setStage("order-detail"); }} />}{stage === "order-detail" && currentOrder && <OrderDetailView order={currentOrder} onBack={() => setStage(nextOrderStage("order-detail", "back-to-orders"))} onShop={resetFlow} />}</div></main><footer className="border-t border-violet-100 bg-white/70"><div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-6 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between sm:px-8"><span>ShopEx · intelligent shopping, with you in control.</span><div className="flex items-center gap-4"><button onClick={setEvidence} className="font-medium text-slate-500 hover:text-violet-700">Developer view</button><button onClick={resetFlow} className="font-medium text-slate-500 hover:text-violet-700">Start over</button></div></div></footer></div>;
}

function Header({ onOrders, onProfile, onEvidence, onReset, onSignIn, userName, evidenceActive = false }: { onOrders: () => void; onProfile: () => void; onEvidence: () => void; onReset: () => void; onSignIn: () => void; userName?: string | null; evidenceActive?: boolean }) {
  return <header className="sticky top-0 z-30 border-b border-violet-100 bg-white/90 backdrop-blur-xl"><div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 sm:px-8"><div className="flex items-center gap-3"><ShopExMark /><div><div className="display text-lg font-semibold tracking-[-.04em] text-slate-950">Shop<span className="text-violet-600">Ex</span></div><div className="text-[10px] font-medium uppercase tracking-[.16em] text-slate-400">shopping, understood</div></div></div><nav className="hidden items-center gap-1 md:flex"><button onClick={onReset} className={`rounded-full px-4 py-2 text-sm font-medium ${!evidenceActive ? "bg-violet-50 text-violet-700" : "text-slate-500 hover:bg-slate-50"}`}>Shop</button><button onClick={onOrders} className="rounded-full px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-50"><History className="mr-2 inline h-4 w-4" />Orders</button><button onClick={onProfile} className="rounded-full px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-50"><UserRound className="mr-2 inline h-4 w-4" />Profile</button><button onClick={onEvidence} className={`rounded-full px-4 py-2 text-sm font-medium ${evidenceActive ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-50"}`}><FileText className="mr-2 inline h-4 w-4" />Developer view</button></nav><div className="flex items-center gap-2">{userName ? <button onClick={onProfile} className="hidden items-center gap-2 rounded-full bg-slate-50 px-3 py-2 text-xs font-medium text-slate-500 hover:bg-violet-50 hover:text-violet-700 sm:flex"><UserRound className="h-3.5 w-3.5" />{userName}</button> : <Button onClick={onSignIn} variant="outline" size="sm" className="hidden rounded-full border-violet-200 text-violet-700 hover:bg-violet-50 sm:flex">Sign in</Button>}<button className="rounded-full p-2 text-slate-500 hover:bg-slate-50 md:hidden" aria-label="Open navigation"><Menu className="h-5 w-5" /></button></div></div></header>;
}

function JourneyProgress({ stage, currentIndex }: { stage: BuyerStage; currentIndex: number }) {
  return <div className="mx-auto flex max-w-3xl items-center justify-between"><div className="hidden h-px flex-1 bg-violet-100 sm:block" />{journey.map((item, index) => <div key={item.id} className="flex items-center gap-2 sm:flex-1"><div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${index < currentIndex ? "bg-violet-600 text-white" : index === currentIndex ? "bg-violet-100 text-violet-700 ring-4 ring-violet-50" : "bg-slate-100 text-slate-400"}`}>{index < currentIndex ? "✓" : index + 1}</div><span className={`hidden text-xs font-semibold sm:block ${index <= currentIndex ? "text-slate-700" : "text-slate-400"}`}>{item.label}</span>{index < journey.length - 1 && <div className={`mx-2 h-px flex-1 sm:hidden ${index < currentIndex ? "bg-violet-300" : "bg-slate-200"}`} />}</div>)}<div className="hidden h-px flex-1 bg-violet-100 sm:block" /></div>;
}

function TrustCard({ icon, title, copy }: { icon: React.ReactNode; title: string; copy: string }) { return <div className="rounded-[16px] border border-slate-200 bg-white p-4 text-left shadow-[0_10px_30px_rgba(15,23,42,.035)]"><div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-violet-100 text-violet-700">{icon}</div><p className="mt-3 text-sm font-semibold text-slate-900">{title}</p><p className="mt-1 text-xs leading-5 text-slate-500">{copy}</p></div>; }
