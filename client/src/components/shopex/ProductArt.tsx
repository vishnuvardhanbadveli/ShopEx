import { Keyboard, Laptop, Mouse, Package, ShoppingCart } from "lucide-react";
import type { CatalogItem } from "@/lib/shopEx";

const iconFor = (item: CatalogItem) => {
  if (item.category === "keyboard") return Keyboard;
  if (item.category === "mouse") return Mouse;
  if (item.category === "accessory") return Package;
  return ShoppingCart;
};

export function ProductArt({ item, compact = false }: { item: CatalogItem; compact?: boolean }) {
  const Icon = iconFor(item);
  const size = compact ? "h-11 w-11" : "h-24 w-full";
  return (
    <div className={`relative overflow-hidden rounded-[14px] border border-violet-100 bg-gradient-to-br from-violet-50 via-white to-slate-50 ${size}`}>
      <div className="absolute -right-4 -top-5 h-20 w-20 rounded-full bg-violet-100/70" />
      <div className="absolute -bottom-8 left-5 h-20 w-20 rounded-full bg-indigo-100/50" />
      <div className={`relative flex h-full items-center ${compact ? "justify-center" : "justify-between px-5"}`}>
        {!compact && <div><div className="text-[10px] font-semibold uppercase tracking-[.16em] text-violet-500">{item.category}</div><div className="mt-1 text-xs text-slate-500">{item.attributes.slice(0, 2).join(" · ")}</div></div>}
        <img src={item.imageUrl} alt={`${item.name} product image`} className={`relative object-contain ${compact ? "h-full w-full" : "h-24 w-32"}`} />
        <div className="sr-only"><Icon /></div>
      </div>
    </div>
  );
}

export function ShopExMark() {
  return <div className="flex h-10 w-10 items-center justify-center rounded-[13px] bg-violet-600 text-white shadow-[0_10px_24px_rgba(109,40,217,.22)]"><ShoppingCart className="h-5 w-5" /></div>;
}

export function MiniDeviceIcon() {
  return <Laptop className="h-4 w-4" />;
}
