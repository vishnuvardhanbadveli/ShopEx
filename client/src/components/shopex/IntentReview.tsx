import { ArrowRight, Edit3, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { IntentSpec } from "@/lib/shopEx";
import { money } from "@/lib/shopEx";

type Props = { intent: IntentSpec; onEdit: () => void; onFind: () => void; source?: "gemini" | "fallback"; warning?: string };

export function IntentReview({ intent, onEdit, onFind, source = "gemini", warning }: Props) {
  const fields = [["Product", intent.product], ["Budget", `${money(intent.budget)} maximum`], ["Connectivity", intent.connectivity], ["Purpose", intent.purpose], ["Delivery", `Within ${intent.deliveryDays} days`]];
  return (
    <section className="mx-auto max-w-3xl">
      <div className="mb-6 text-center"><div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"><ShieldCheck className="h-6 w-6" /></div><p className="text-sm font-semibold uppercase tracking-[.16em] text-violet-600">Intent understood</p><h1 className="mt-3 text-3xl font-semibold tracking-[-.04em] text-slate-950 sm:text-5xl">Is this what you meant?</h1><p className="mt-3 text-slate-500">ShopEx won’t silently change your request. Review the interpretation, then choose whether to search.</p></div>
      <div className="rounded-[20px] border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,.06)] sm:p-7"><div className={`mb-5 flex items-center gap-2 rounded-[12px] px-3 py-2 text-xs ${source === "gemini" ? "bg-violet-50 text-violet-700" : "bg-amber-50 text-amber-800"}`}><span className={`h-2 w-2 rounded-full ${source === "gemini" ? "bg-violet-500" : "bg-amber-500"}`} />{source === "gemini" ? "Interpreted from your request" : "Basic interpretation fallback"}</div>{warning && <div className="mb-5 rounded-[12px] bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">{warning}</div>}<div className="grid gap-0 sm:grid-cols-2">{fields.map(([label, value]) => <div key={label} className="border-b border-slate-100 px-1 py-4 first:pt-1 sm:nth-[3]:border-b-0"><div className="text-xs font-medium uppercase tracking-[.12em] text-slate-400">{label}</div><div className="mt-2 text-base font-semibold text-slate-900">{value}</div></div>)}</div><div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end"><Button onClick={onEdit} variant="outline" className="h-11 rounded-[12px] border-slate-200 text-slate-600 hover:bg-slate-50"><Edit3 className="mr-2 h-4 w-4" />Edit request</Button><Button onClick={onFind} className="h-11 rounded-[12px] bg-violet-600 px-5 font-semibold text-white hover:bg-violet-700">Find products<ArrowRight className="ml-2 h-4 w-4" /></Button></div></div>
    </section>
  );
}
