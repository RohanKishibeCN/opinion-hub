import { useMemo } from "react";
import { HistoryPoint, OpinionItem, Orderbook } from "../types";
import { HistoryChart } from "./HistoryChart";
import { OrderbookDepth } from "./OrderbookDepth";

function safeNum(val: any, fallback = 0) {
  return Number.isFinite(val) ? Number(val) : fallback;
}

function MetricCard({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: "pos" | "neg" | "muted" }) {
  const toneClass = tone === "pos" ? "text-emerald-200" : tone === "neg" ? "text-rose-200" : "text-white";
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3 space-y-1 shadow-inner shadow-cyan-500/5">
      <p className="text-[11px] uppercase tracking-wide text-white/50">{label}</p>
      <p className={`text-lg font-semibold ${toneClass}`}>{value}</p>
      {hint && <p className="text-[11px] text-white/50">{hint}</p>}
    </div>
  );
}

export function MarketDetail({
  market,
  history,
  orderbook,
  loadingHistory,
  loadingOrderbook,
  onOpenHistoryDetail
}: {
  market?: OpinionItem;
  history?: HistoryPoint[];
  orderbook?: Orderbook;
  loadingHistory?: boolean;
  loadingOrderbook?: boolean;
  onOpenHistoryDetail?: () => void;
}) {
  const safeHistory = useMemo(() => (Array.isArray(history) ? history : []), [history]);
  const stats = useMemo(() => {
    if (safeHistory.length === 0) return null;
    const sorted = [...safeHistory]
      .map((p) => ({ ...p, price: safeNum(p?.price, 0), volume: safeNum(p?.volume, 0), ts: typeof p?.ts === "number" ? p.ts : 0 }))
      .sort((a, b) => a.ts - b.ts);
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const high = sorted.reduce((m, p) => Math.max(m, p.price), sorted[0].price);
    const low = sorted.reduce((m, p) => Math.min(m, p.price), sorted[0].price);
    const changeAbs = last.price - first.price;
    const changePct = first.price !== 0 ? (changeAbs / first.price) * 100 : 0;
    const vol = sorted.reduce((sum, p) => sum + safeNum(p.volume, 0), 0);
    return { last: last.price, changeAbs, changePct, high, low, vol };
  }, [safeHistory]);

  if (!market) {
    return (
      <section className="mx-auto max-w-6xl px-4">
        <div className="glass-card rounded-2xl border border-white/10 p-5 text-sm text-white/70">Select a market to view details.</div>
      </section>
    );
  }

  const prob = safeNum(market.probability, 0);
  const sentimentTone =
    market.sentiment === "bull"
      ? "bg-emerald-500/15 text-emerald-200"
      : market.sentiment === "bear"
      ? "bg-rose-500/15 text-rose-200"
      : "bg-slate-500/15 text-slate-100";

  const mid = safeNum(orderbook?.mid, 0);
  const spread = safeNum(orderbook?.spread, 0);
  const slippageLabel = Array.isArray(orderbook?.slippage) && orderbook!.slippage.length > 0 ? `${safeNum(orderbook!.slippage[0].impactPct, 0) * 100}% ...` : "-";

  return (
    <section className="mx-auto max-w-6xl px-4 space-y-5">
      <div className="glass-card rounded-2xl border border-white/10 p-5 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs text-white/60">Market detail</p>
            <h3 className="text-xl font-semibold text-white leading-snug">{market.title}</h3>
            <p className="text-sm text-white/60">
              {market.category} · {(prob * 100).toFixed(1)}% · Updated {new Date(market.updatedAt).toLocaleTimeString()}
            </p>
          </div>
          <div className="flex gap-2 items-center">
            <span className={`px-3 py-1 rounded-full text-xs font-semibold border border-white/10 ${sentimentTone}`}>
              {market.sentiment === "bull" ? "Bullish" : market.sentiment === "bear" ? "Bearish" : "Neutral"}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-cyan-400/20 text-cyan-100 border border-cyan-400/40">
              Probability {(prob * 100).toFixed(1)}%
            </span>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-5 sm:grid-cols-2">
          <MetricCard label="Last price" value={stats ? stats.last.toFixed(3) : "-"} hint="From latest trade" />
          <MetricCard
            label="Range change"
            value={stats ? `${stats.changeAbs >= 0 ? "+" : ""}${stats.changeAbs.toFixed(3)} (${stats.changePct.toFixed(1)}%)` : "-"}
            hint={stats ? `Window ${new Date(safeHistory[0].ts).toLocaleTimeString()} - ${new Date(safeHistory[safeHistory.length - 1].ts).toLocaleTimeString()}` : "Waiting for more history"}
            tone={stats ? (stats.changeAbs >= 0 ? "pos" : "neg") : "muted"}
          />
          <MetricCard label="High / Low" value={stats ? `${stats.high.toFixed(3)} / ${stats.low.toFixed(3)}` : "-"} hint="Based on current history window" />
          <MetricCard label="Spread" value={orderbook ? spread.toFixed(3) : "-"} hint={orderbook ? `Mid ${mid.toFixed(3)}` : "Waiting for orderbook"} />
          <MetricCard label="Slippage (100/500/1000)" value={slippageLabel} hint={orderbook?.slippage ? "Estimated from depth" : "Waiting for orderbook"} />
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <div className="space-y-3">
          <HistoryChart data={safeHistory} loading={loadingHistory} />
          {safeHistory.length > 0 && (
            <button
              onClick={onOpenHistoryDetail}
              className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-sm text-white/80 hover:border-cyan-400/50 hover:text-white transition"
            >
              View history details and annotations
            </button>
          )}
        </div>
        <OrderbookDepth data={orderbook} loading={loadingOrderbook} />
      </div>
    </section>
  );
}
