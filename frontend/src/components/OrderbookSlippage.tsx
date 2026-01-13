import { Orderbook } from "../types";

export function OrderbookSlippage({ ob }: { ob?: Orderbook }) {
  if (!ob?.slippage || ob.slippage.length === 0) return null;
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-white/50">Slippage estimate</p>
          <h3 className="text-lg font-semibold text-white">Impact @ Size</h3>
        </div>
      </div>
      <div className="grid sm:grid-cols-3 gap-3">
        {ob.slippage.map((s) => (
          <div key={`${s.side}-${s.size}`} className="rounded-xl border border-white/10 bg-white/5 px-3 py-3">
            <div className="flex items-center justify-between text-xs text-white/70">
              <span className="uppercase tracking-wide">{s.side === "buy" ? "Buy" : "Sell"}</span>
              <span className="text-white/60">Size {s.size}</span>
            </div>
            <p className="text-sm text-white font-semibold mt-1">Avg {s.avgPrice.toFixed(3)}</p>
            <p className={`text-xs ${s.side === "buy" ? "text-rose-200" : "text-emerald-200"}`}>
              Impact {s.impact >= 0 ? "+" : ""}{s.impact.toFixed(4)} ({(s.impactPct * 100).toFixed(2)}%)
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
