import { ArrowRight, MessageCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { examples } from "@/lib/shopEx";

type Props = { prompt: string; onPromptChange: (value: string) => void; onContinue: () => void; onExample: (value: string) => void; disabled?: boolean };

export function IntentComposer({ prompt, onPromptChange, onContinue, onExample, disabled = false }: Props) {
  return (
    <section className="mx-auto max-w-4xl text-center">
      <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-[18px] bg-violet-100 text-violet-700"><MessageCircle className="h-6 w-6" /></div>
      <p className="text-sm font-semibold uppercase tracking-[.16em] text-violet-600">Your personal shopping copilot</p>
      <h1 className="mt-4 text-4xl font-semibold tracking-[-.05em] text-slate-950 sm:text-6xl">What are you<br className="sm:hidden" /> looking for?</h1>
      <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-slate-500 sm:text-lg">Tell ShopEx what you need in your own words. We’ll find options that fit your requirements and show you exactly why.</p>
      <div className="mt-9 rounded-[20px] border border-slate-200 bg-white p-2 text-left shadow-[0_20px_60px_rgba(76,29,149,.08)] ring-1 ring-slate-100 focus-within:border-violet-300 focus-within:ring-4 focus-within:ring-violet-100">
        <textarea value={prompt} onChange={(event) => onPromptChange(event.target.value)} onKeyDown={(event) => { if ((event.metaKey || event.ctrlKey) && event.key === "Enter") onContinue(); }} rows={3} className="w-full resize-none border-0 bg-transparent px-4 pt-3 text-base leading-7 text-slate-900 outline-none placeholder:text-slate-400" placeholder="I need a wireless mechanical keyboard under ₹7,000 for programming." aria-label="Describe what you want to buy" />
        <div className="flex items-center justify-between border-t border-slate-100 px-3 pt-3"><span className="hidden text-xs text-slate-400 sm:block">Press ⌘ ↵ to continue</span><Button onClick={onContinue} disabled={!prompt.trim() || disabled} className="ml-auto h-11 rounded-[12px] bg-violet-600 px-5 font-semibold text-white shadow-[0_10px_22px_rgba(109,40,217,.2)] hover:bg-violet-700"><Sparkles className="mr-2 h-4 w-4" />{disabled ? "Interpreting…" : "Continue"}<ArrowRight className="ml-2 h-4 w-4" /></Button></div>
      </div>
      <div className="mt-6 flex flex-wrap justify-center gap-2">{examples.map((example) => <button key={example} onClick={() => onExample(example)} className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500 transition-colors hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700">{example}</button>)}</div>
    </section>
  );
}
