import { Orderbook } from "../types";

function safeNum(val: any, fallback = 0) {
  return Number.isFinite(val) ? Number(val) : fallback;
}

export function OrderbookSlippage({ ob }: { ob?: Orderbook }) {
  const rows = Array.isArray(ob?.slippage)
    ? ob!.slippage.map((s) => ({
        ...s,
        size: safeNum(s?.size, 0),
        avgPrice: safeNum(s?.avgPrice, 0),
        impact: safeNum(s?.impact, 0),
        impactPct: safeNum(s?.impactPct, 0)
      }))
    : [];

  if (rows.length === 0) return null;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-white/50">Slippage estimate</p>
          <h3 className="text-lg font-semibold text-white">Impact @ Size</h3>
        </div>
      </div>
      <div className="grid sm:grid-cols-3 gap-3">
        {rows.map((s) => (
          <div key={`${s.side}-${s.size}`} className="rounded-xl border border-white/10 bg-white/5 px-3 py-3">
            <div className="flex items-center justify-between text-xs text-white/70">
              <span className="uppercase tracking-wide">{s.side === "buy" ? "Buy" : "Sell"}</span>
              <span className="text-white/60">Size {s.size}</span>
            </div>
            <p className="text-sm text-white font-semibold mt-1">Avg {s.avgPrice.toFixed(3)}</p>
            <p className={`text-xs ${s.side === "buy" ? "text-rose-200" : "text-emerald-200"}`}>
              Impact {s.impact >= 0 ? "+" : ""}
              {s.impact.toFixed(4)} ({(s.impactPct * 100).toFixed(2)}%)
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
