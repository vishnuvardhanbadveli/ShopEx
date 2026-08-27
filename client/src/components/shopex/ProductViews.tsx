import {
  ArrowRight,
  Check,
  ChevronLeft,
  CircleAlert,
  ExternalLink,
  PackageCheck,
  Star,
  Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CandidateResult, CatalogItem } from "@/lib/shopEx";
import { categoryLabel, money } from "@/lib/shopEx";
import { ProductArt } from "./ProductArt";

type ExternalProduct = CatalogItem & {
  externalUrl?: string;
  seller?: string;
  rating?: number | null;
  ratingCount?: number | null;
  source?: string;
  matchScore?: number;
};

type DiscoveryProps = {
  candidates: CandidateResult[];
  externalProducts?: ExternalProduct[];
  selectedSku: string | null;
  onSelect: (sku: string) => void;
  onExternalSelect?: (product: ExternalProduct) => void;
  onBack: () => void;
};

export function ProductDiscovery({
  candidates,
  externalProducts = [],
  selectedSku,
  onSelect,
  onExternalSelect,
  onBack,
}: DiscoveryProps) {
  const hasExternalProducts = externalProducts.length > 0;
  const suitableCount =
    candidates.filter((item) => item.pass).length + externalProducts.length;

  return (
    <section className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <button
            onClick={onBack}
            className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-violet-700"
          >
            <ChevronLeft className="h-4 w-4" />
            Edit request
          </button>

          <p className="text-sm font-semibold uppercase tracking-[.16em] text-violet-600">
            Product discovery
          </p>

          <h1 className="mt-2 text-3xl font-semibold tracking-[-.04em] text-slate-950 sm:text-4xl">
            Options that fit your brief.
          </h1>

          <p className="mt-2 text-slate-500">
            ShopEx searched live product listings against your requirements.
          </p>
        </div>

        <div className="rounded-full bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-700">
          {suitableCount} suitable options
        </div>
      </div>

      {hasExternalProducts ? (
        <div className="grid gap-5 sm:grid-cols-2">
  {[...externalProducts]
    .sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0))
    .map((product) => (
      <ExternalProductCard
        key={product.sku}
        item={product}
        onSelect={() => onExternalSelect?.(product)}
      />
    ))}
</div>
          
      ) : candidates.length ? (
        <div className="grid gap-5 sm:grid-cols-2">
          {candidates.map(({ item, pass, reasons }) => (
            <ProductCard
              key={item.sku}
              item={item}
              pass={pass}
              reasons={reasons}
              selected={item.sku === selectedSku}
              onSelect={() => onSelect(item.sku)}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-[18px] border border-amber-100 bg-amber-50 p-6 text-sm leading-6 text-amber-900">
          No products were found for this request. Edit the request or try
          another search.
        </div>
      )}
    </section>
  );
}

function ExternalProductCard({
  item,
  onSelect,
}: {
  item: ExternalProduct;
  onSelect: () => void;
}) {
  const matchScore = item.matchScore ?? 0;

  const matchLabel =
    matchScore >= 70
      ? "Best Match"
      : matchScore >= 50
        ? "Strong Match"
        : "Alternative";

  return (
    <article className="group overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-[0_16px_44px_rgba(15,23,42,.05)] transition-all hover:-translate-y-0.5 hover:border-violet-200">
      <div className="relative aspect-[16/10] overflow-hidden bg-slate-50">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.name}
            className="h-full w-full object-contain p-6"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <ProductArt item={item} />
          </div>
        )}

        <div className="absolute left-3 top-3 rounded-full bg-slate-950 px-3 py-1.5 text-xs font-bold text-white shadow-lg">
          {matchLabel}
        </div>
      </div>

      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-[.12em] text-violet-600">
              Live listing
            </p>

            <h2 className="mt-1 line-clamp-2 text-lg font-semibold text-slate-950">
              {item.name}
            </h2>
          </div>

          {item.price > 0 && (
            <p className="shrink-0 text-lg font-semibold text-slate-950">
              {money(item.price)}
            </p>
          )}
        </div>

        <div className="mt-3 space-y-2 text-xs text-slate-500">
          {item.seller && (
            <div className="flex items-center gap-2">
              <PackageCheck className="h-4 w-4 text-emerald-500" />
              <span>{item.seller}</span>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Truck className="h-4 w-4 text-violet-500" />
            <span>{item.delivery}</span>
          </div>

          {item.rating != null && (
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 fill-current text-amber-500" />
              <span>
                {item.rating.toFixed(1)}
                {item.ratingCount ? ` (${item.ratingCount})` : ""}
              </span>
            </div>
          )}
        </div>

        <div className="mt-4 rounded-[12px] border border-violet-100 bg-violet-50/60 p-3">
          <p className="text-xs font-semibold uppercase tracking-[.1em] text-violet-700">
            Why ShopEx recommends it
          </p>

          <div className="mt-2 space-y-1.5 text-xs leading-5 text-slate-600">
            {item.price > 0 && (
              <div>
                ✓ {money(item.price)} listed price
              </div>
            )}

            {item.deliveryDays <= 7 && (
              <div>
                ✓ Delivery within {item.deliveryDays} day
                {item.deliveryDays === 1 ? "" : "s"}
              </div>
            )}

            {item.rating != null && item.rating >= 4 && (
              <div>✓ Strong customer rating</div>
            )}

            {item.ratingCount != null && item.ratingCount >= 100 && (
              <div>✓ Established review history</div>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
<p className="mt-4 rounded-xl border border-violet-100 bg-violet-50/60 p-3 text-xs leading-5 text-slate-600">
  ShopEx found this live listing through Google Shopping.
  Review the seller's page before purchasing.
</p>
          <span className="rounded-full bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-700">
            Google Shopping
          </span>

          {item.deliveryDays <= 7 && (
            <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700">
              Fast delivery
            </span>
          )}

          {matchScore > 0 && (
            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">
              Match {matchScore}/100
            </span>
          )}
        </div>

        <Button
          onClick={onSelect}
          className="mt-5 h-11 w-full rounded-[11px] bg-slate-950 font-semibold text-white hover:bg-violet-700"
        >
          View seller
          <ExternalLink className="ml-auto h-4 w-4" />
        </Button>
      </div>
    </article>
  );
}

type CardProps = {
  item: CatalogItem;
  pass: boolean;
  reasons: { key: string; pass: boolean; value: string }[];
  selected: boolean;
  onSelect: () => void;
};

export function ProductCard({
  item,
  pass,
  reasons,
  selected,
  onSelect,
}: CardProps) {
  const evidence = reasons.filter((reason) => reason.pass).slice(0, 3);

  return (
    <article
      className={`group overflow-hidden rounded-[18px] border bg-white shadow-[0_16px_44px_rgba(15,23,42,.05)] transition-all ${
        selected
          ? "border-violet-400 ring-4 ring-violet-100"
          : "border-slate-200 hover:-translate-y-0.5 hover:border-violet-200"
      }`}
    >
      <ProductArt item={item} />

      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-[.12em] text-slate-400">
              {categoryLabel(item.category)}
            </p>

            <h2 className="mt-1 text-lg font-semibold text-slate-950">
              {item.name}
            </h2>
          </div>

          <p className="text-lg font-semibold text-slate-950">
            {money(item.price)}
          </p>
        </div>

        <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
          <PackageCheck className="h-4 w-4 text-emerald-500" />
          {item.stock > 0 ? `${item.stock} available` : "Currently unavailable"}
          <span className="text-slate-300">·</span>
          <Truck className="h-4 w-4 text-violet-500" />
          {item.delivery}
        </div>

        <div className="mt-4 space-y-2">
          {evidence.map((reason) => (
            <div
              key={reason.key}
              className="flex items-center gap-2 text-xs font-medium text-emerald-700"
            >
              <Check className="h-3.5 w-3.5" />
              {reason.key === "price <= max_price"
                ? "Within budget"
                : reason.key === "category = requested"
                  ? "Right category"
                  : reason.key === "stock.available"
                    ? "Available now"
                    : reason.key === "delivery_eta <= requested"
                      ? "Meets delivery requirement"
                      : "Requested attributes"}
            </div>
          ))}
        </div>

        {!pass && (
          <div className="mt-4 flex items-start gap-2 rounded-[10px] bg-amber-50 p-3 text-xs leading-5 text-amber-800">
            <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {reasons.find((reason) => !reason.pass)?.value ??
              "This option doesn't meet every requirement."}
          </div>
        )}

        <Button
          onClick={onSelect}
          disabled={!pass}
          className={`mt-5 h-11 w-full rounded-[11px] font-semibold ${
            selected
              ? "bg-violet-600 text-white hover:bg-violet-700"
              : "bg-slate-950 text-white hover:bg-violet-700"
          }`}
        >
          {selected
            ? "Selected"
            : pass
              ? "Choose this"
              : "Doesn't fit this request"}

          {pass && <ArrowRight className="ml-auto h-4 w-4" />}
        </Button>
      </div>
    </article>
  );
}

type DetailProps = {
  item: CatalogItem;
  reasons: { key: string; pass: boolean; value: string }[];
  onBack: () => void;
  onChoose: () => void;
};

export function ProductDetail({
  item,
  reasons,
  onBack,
  onChoose,
}: DetailProps) {
  return (
    <section className="mx-auto max-w-4xl">
      <button
        onClick={onBack}
        className="mb-5 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-violet-700"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to options
      </button>

      <div className="grid overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,.07)] lg:grid-cols-[.9fr_1.1fr]">
        <div className="bg-slate-50 p-5 sm:p-7">
          <ProductArt item={item} />

          <div className="mt-5 rounded-[14px] bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-[.12em] text-violet-600">
              Why it fits
            </p>

            <div className="mt-3 space-y-3">
              {reasons.map((reason) => (
                <div
                  key={reason.key}
                  className={`flex gap-2 text-sm ${
                    reason.pass ? "text-emerald-700" : "text-amber-800"
                  }`}
                >
                  <Check
                    className={`mt-0.5 h-4 w-4 shrink-0 ${
                      reason.pass ? "" : "opacity-0"
                    }`}
                  />
                  {reason.pass
                    ? reason.value
                    : `Does not meet: ${reason.value}`}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6 sm:p-8">
          <p className="text-sm font-medium uppercase tracking-[.12em] text-slate-400">
            {categoryLabel(item.category)}
          </p>

          <h1 className="mt-2 text-3xl font-semibold tracking-[-.05em] text-slate-950">
            {item.name}
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-500">
            {item.description}
          </p>

          <div className="mt-6 flex items-end justify-between border-b border-slate-100 pb-6">
            <div>
              <p className="text-xs text-slate-400">Price</p>
              <p className="mt-1 text-3xl font-semibold text-slate-950">
                {money(item.price)}
              </p>
            </div>

            <div className="text-right">
              <p className="text-xs text-slate-400">Delivery</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {item.delivery}
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {item.attributes.map((attribute) => (
              <span
                key={attribute}
                className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600"
              >
                {attribute}
              </span>
            ))}
          </div>

          <Button
            onClick={onChoose}
            className="mt-8 h-12 w-full rounded-[12px] bg-violet-600 font-semibold text-white hover:bg-violet-700"
          >
            Choose this
            <ArrowRight className="ml-auto h-4 w-4" />
          </Button>
        </div>
      </div>
    </section>
  );
}