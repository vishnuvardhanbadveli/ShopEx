import React from "react";
import { ArrowLeft, ArrowRight, Check, CircleAlert, Clock3, Package, ShieldCheck, ShoppingBag, UserRound } from "lucide-react";
import { useLocation, useRoute } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { money, type PersistedOrder } from "@/lib/shopEx";
import { orderStatusCounts, profileStatus } from "@/lib/profileModel";
import { ShopExMark, ProductArt } from "@/components/shopex/ProductArt";
import { OrderDetailView } from "@/components/shopex/OrderDetailView";
import { AccountSettingsPanel } from "@/components/shopex/AccountSettingsPanel";
import { NotificationCenter, SecurityPanel } from "@/components/shopex/ProfileSecurityPanels";
import { RecoveryCenter } from "@/components/shopex/RecoveryCenter";

function ProfileHeader({ userName }: { userName?: string | null }) {
  const [, setLocation] = useLocation();
  return (
    <header className="sticky top-0 z-30 border-b border-violet-100 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 sm:px-8">
        <button onClick={() => setLocation("/")} className="flex items-center gap-3 text-left">
          <ShopExMark />
          <div><div className="display text-lg font-semibold tracking-[-.04em] text-slate-950">Shop<span className="text-violet-600">Ex</span></div><div className="text-[10px] font-medium uppercase tracking-[.16em] text-slate-400">shopping, understood</div></div>
        </button>
        <nav className="hidden items-center gap-1 md:flex">
          <button onClick={() => setLocation("/")} className="rounded-full px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-50">Shop</button>
          <button onClick={() => setLocation("/profile")} className="rounded-full bg-violet-50 px-4 py-2 text-sm font-medium text-violet-700"><UserRound className="mr-2 inline h-4 w-4" />Profile</button>
        </nav>
        <div className="hidden items-center gap-2 rounded-full bg-slate-50 px-3 py-2 text-xs font-medium text-slate-500 sm:flex"><UserRound className="h-3.5 w-3.5" />{userName ?? "Customer"}</div>
      </div>
    </header>
  );
}

function StatusPill({ status }: { status: PersistedOrder["status"] }) {
  const presentation = profileStatus(status);
  const className = presentation.tone === "success" ? "bg-emerald-50 text-emerald-700" : presentation.tone === "danger" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700";
  const Icon = presentation.tone === "success" ? Check : presentation.tone === "danger" ? CircleAlert : Clock3;
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}><Icon className="h-3.5 w-3.5" />{presentation.label}</span>;
}

function ProfileLoading() {
  return <div className="min-h-screen shopex-shell shopex-noise"><div className="mx-auto max-w-7xl px-5 py-16 sm:px-8"><div className="h-8 w-48 animate-pulse rounded bg-slate-100" /><div className="mt-8 h-64 animate-pulse rounded-[22px] bg-white" /></div></div>;
}

export default function Profile() {
  const { user, loading } = useAuth({ redirectOnUnauthenticated: true });
  const [, setLocation] = useLocation();
  const ordersQuery = trpc.payment.myOrders.useQuery({ limit: 25 }, { enabled: Boolean(user), refetchInterval: 5000 });

  if (loading || !user) return <ProfileLoading />;
  const orders = ordersQuery.data ?? [];
  const counts = orderStatusCounts(orders);
  const confirmed = counts.captured;
  const inProgress = counts.created + counts.verification_pending + counts.verified;
  const hasAccountEnhancements = Boolean(trpc.account.notifications && trpc.account.securityOverview);

  return <div className="min-h-screen shopex-shell shopex-noise text-slate-950">
    <ProfileHeader userName={user.name} />
    <main className="mx-auto max-w-6xl px-5 py-9 sm:px-8 sm:py-12">
      <button onClick={() => setLocation("/")} className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-violet-700"><ArrowLeft className="h-4 w-4" />Continue shopping</button>
      <section className="mt-7 grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
        <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,.05)] sm:p-8">
          <div className="flex items-start gap-4"><div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] bg-violet-100 text-violet-700"><UserRound className="h-7 w-7" /></div><div><p className="text-sm font-semibold uppercase tracking-[.16em] text-violet-600">Your profile</p><h1 className="mt-2 text-3xl font-semibold tracking-[-.05em] text-slate-950 sm:text-4xl">{user.name ?? "Your ShopEx account"}</h1><p className="mt-2 text-sm text-slate-500">{user.email ?? "Signed-in ShopEx customer"}</p></div></div>
          <p className="mt-7 max-w-xl text-sm leading-6 text-slate-600">Review orders connected to this account. Payment status comes from the persisted provider lifecycle, not a browser-only checkout result.</p>
        </div>
        <div className="grid grid-cols-3 gap-3"><Metric label="Orders" value={orders.length} /><Metric label="Confirmed" value={confirmed} tone="success" /><Metric label="In progress" value={inProgress} tone="warning" /></div>
      </section>
      <AccountSettingsPanel userName={user.name} />
      {hasAccountEnhancements && <NotificationCenter />}
      {hasAccountEnhancements && <SecurityPanel />}
      <RecoveryCenter orders={orders} />
      <section className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-[.16em] text-violet-600">Order history</p><h2 className="mt-2 text-3xl font-semibold tracking-[-.05em] text-slate-950">Your purchases</h2><p className="mt-2 text-sm text-slate-500">Statuses update when verification and provider webhook outcomes are persisted.</p></div><ShieldCheck className="h-6 w-6 text-emerald-500" /></div>
        {ordersQuery.isLoading ? <div className="mt-6 h-44 animate-pulse rounded-[20px] bg-white" /> : ordersQuery.isError ? <div className="mt-6 rounded-[20px] border border-red-100 bg-red-50 p-6 text-sm text-red-800">We could not load your order history. {ordersQuery.error.message}</div> : orders.length ? <div className="mt-6 space-y-4">{orders.map((order) => <button key={order.orderId} onClick={() => setLocation(`/profile/orders/${order.orderId}`)} className="flex w-full items-center gap-4 rounded-[20px] border border-slate-200 bg-white p-5 text-left shadow-[0_12px_32px_rgba(15,23,42,.035)] transition-colors hover:border-violet-200 hover:bg-violet-50/30 sm:p-6">{order.product ? <div className="h-20 w-20 shrink-0"><ProductArt item={order.product} compact /></div> : <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[16px] bg-slate-50"><Package className="h-6 w-6 text-slate-400" /></div>}<div className="min-w-0 flex-1"><p className="text-lg font-semibold text-slate-950">{order.product?.name ?? "Order record"}</p><p className="mt-1 text-sm text-slate-500">{money(order.amount / 100)} · {new Date(order.createdAt).toLocaleDateString()}</p><div className="mt-3"><StatusPill status={order.status} /></div></div><ArrowRight className="h-5 w-5 shrink-0 text-slate-400" /></button>)}</div> : <div className="mt-6 rounded-[20px] border border-dashed border-slate-200 bg-white p-10 text-center"><ShoppingBag className="mx-auto h-7 w-7 text-violet-500" /><h3 className="mt-4 text-lg font-semibold text-slate-950">No orders yet</h3><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">Orders will appear here after you approve a purchase and its provider status is recorded.</p><Button onClick={() => setLocation("/")} className="mt-6 rounded-[12px] bg-violet-600 text-white hover:bg-violet-700">Start shopping</Button></div>}
      </section>
    </main>
  </div>;
}

function Metric({ label, value, tone = "neutral" }: { label: string; value: number; tone?: "neutral" | "success" | "warning" }) {
  const color = tone === "success" ? "bg-emerald-50 text-emerald-700" : tone === "warning" ? "bg-amber-50 text-amber-700" : "bg-violet-50 text-violet-700";
  return <div className={`rounded-[18px] p-4 ${color}`}><p className="text-xs font-semibold uppercase tracking-[.12em] opacity-70">{label}</p><p className="mt-3 text-3xl font-semibold tracking-[-.05em]">{value}</p></div>;
}

export function CustomerOrderDetail() {
  const { user, loading } = useAuth({ redirectOnUnauthenticated: true });
  const [, params] = useRoute("/profile/orders/:orderId");
  const [, setLocation] = useLocation();
  const orderId = params?.orderId ?? "";
  const orderQuery = trpc.payment.orderStatus.useQuery({ orderId }, { enabled: Boolean(user && orderId), refetchInterval: 3000 });
  const timelineQuery = trpc.payment.orderTimeline.useQuery({ orderId, limit: 50 }, { enabled: Boolean(user && orderId), refetchInterval: 5000 });
  const resumeQuery = trpc.payment.resumeOrder.useQuery({ orderId }, { enabled: false });
  if (loading || !user || orderQuery.isLoading) return <ProfileLoading />;
  if (orderQuery.isError || !orderQuery.data?.order) return <div className="min-h-screen shopex-shell shopex-noise"><ProfileHeader userName={user.name} /><main className="mx-auto max-w-4xl px-5 py-16 sm:px-8"><div className="rounded-[20px] border border-red-100 bg-red-50 p-7 text-red-900"><p className="font-semibold">Order unavailable</p><p className="mt-2 text-sm">{orderQuery.error?.message ?? "We could not find this order in your account."}</p><Button onClick={() => setLocation("/profile")} className="mt-5 bg-violet-600 text-white hover:bg-violet-700">Back to profile</Button></div></main></div>;
  return <div className="min-h-screen shopex-shell shopex-noise text-slate-950"><ProfileHeader userName={user.name} /><main className="mx-auto max-w-6xl px-5 py-9 sm:px-8 sm:py-12"><OrderDetailView order={orderQuery.data.order} timeline={timelineQuery.data ?? []} onBack={() => setLocation("/profile")} onShop={() => setLocation("/")} onResume={orderQuery.data.order.status === "created" ? async () => { const result = await resumeQuery.refetch(); if (result.data) { localStorage.setItem("shopex-active-order-id", orderId); setLocation("/"); } } : undefined} /></main></div>;
}
