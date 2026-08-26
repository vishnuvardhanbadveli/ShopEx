import { Check, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CatalogItem } from "@/lib/shopEx";
import { money } from "@/lib/shopEx";

type Props = { options: CatalogItem[]; selected?: CatalogItem; total: number; budget: number; activeSku?: string; onChoose: (sku: string) => void; onRemove: () => void };

export function CrossSellPanel({ options, selected, total, budget, activeSku, onChoose, onRemove }: Props) {
  const remaining = budget - (selected?.price ?? 0);
  return <div className="rounded-[18px] border border-violet-100 bg-violet-50/60 p-5"><div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2 text-sm font-semibold text-violet-900"><Plus className="h-4 w-4" />Complete your setup</div><p className="mt-1 text-xs leading-5 text-violet-700/70">Optional add-ons are checked against the same {money(budget)} spending limit.</p></div>{activeSku && <button onClick={onRemove} className="text-xs font-medium text-violet-700 hover:text-violet-900">Remove</button>}</div><div className="mt-4 grid gap-3 sm:grid-cols-2">{options.map((item) => { const pass = remaining >= item.price && item.stock > 0; return <button key={item.sku} onClick={() => onChoose(item.sku)} disabled={!pass} className={`flex items-center justify-between rounded-[12px] border bg-white p-3 text-left transition-colors ${activeSku === item.sku ? "border-violet-500 ring-2 ring-violet-100" : pass ? "border-violet-100 hover:border-violet-300" : "border-slate-200 opacity-60"}`}><span><span className="block text-sm font-semibold text-slate-900">{item.name}</span><span className="mt-1 block text-xs text-slate-500">{money(item.price)} · {pass ? "fits your budget" : `would exceed ${money(budget)}`}</span></span>{activeSku === item.sku ? <Check className="h-4 w-4 text-violet-600" /> : pass ? <Plus className="h-4 w-4 text-violet-600" /> : <X className="h-4 w-4 text-slate-400" />}</button>; })}</div>{activeSku && <div className="mt-4 flex items-center gap-2 text-xs font-medium text-emerald-700"><Check className="h-4 w-4" />Basket re-checked · new total {money(total)} · within limit</div>}</div>;
}
