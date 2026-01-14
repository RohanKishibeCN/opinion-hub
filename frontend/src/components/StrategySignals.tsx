import { StrategySignal } from "../types";

function safeNum(val: any, fallback = 0) {
  return Number.isFinite(val) ? (val as number) : fallback;
}

function EvBadge({ edge }: { edge: number }) {
  const ev = safeNum(edge, 0) * 100;
  const strong = Math.abs(ev) >= 5;
  const tone = ev > 0 ? "bg-emerald-500/20 text-emerald-200" : "bg-rose-500/20 text-rose-200";
  return (
    <span
      className={`px-3 py-1 rounded-full text-[11px] font-semibold border border-white/10 ${tone} ${strong ? "shadow-lg shadow-cyan-500/20" : ""}`}
    >
      EV {ev.toFixed(1)}%
    </span>
  );
}

export function StrategySignals({ data, loading }: { data?: StrategySignal[]; loading?: boolean }) {
  const list = Array.isArray(data) ? data : [];
  const sorted = [...list].sort((a, b) => Math.abs(safeNum(b.edge, 0)) - Math.abs(safeNum(a.edge, 0)));

  return (
    <div className="glass-card rounded-2xl border border-white/10 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-white/50">Strategy signals</p>
          <h3 className="text-lg font-semibold text-white">Alpha Signals</h3>
        </div>
        {sorted.length > 0 && <p className="text-xs text-white/60">Total {sorted.length}</p>}
      </div>
      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-12 rounded-xl bg-white/5 animate-pulse" />
          ))}
        </div>
      )}
      {!loading && sorted.length === 0 && (
        <div className="rounded-xl border border-dashed border-white/15 bg-white/5 px-4 py-6 text-center text-sm text-white/60">
          No signals yet. Waiting for the strategy engine.
        </div>
      )}
      {!loading && sorted.length > 0 && (
        <div className="space-y-3">
          {sorted.map((s) => {
            const edge = safeNum(s.edge, 0);
            const confidence = safeNum(s.confidence, 0);
            const history = Array.isArray(s.history) ? s.history : [];
            return (
              <div
                key={s.id}
                className={`border rounded-xl p-3 transition bg-gradient-to-r from-white/5 to-transparent ${
                  Math.abs(edge) >= 0.05 ? "border-cyan-400/50" : "border-white/10"
                }`}
              >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-white font-semibold text-sm mb-1">{s.title}</p>
                  <p className="text-xs text-white/60">
                    Confidence {(confidence * 100).toFixed(1)}% · Edge {(edge * 100).toFixed(1)}% · Refreshed {new Date(s.updatedAt).toLocaleTimeString()}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <EvBadge edge={edge} />
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      s.direction === "long" ? "bg-emerald-500/20 text-emerald-200" : "bg-red-500/20 text-red-200"
                    }`}
                  >
                    {s.direction === "long" ? "Long" : "Short"}
                  </span>
                </div>
              </div>
              {history.length > 0 && (
                <div className="mt-3 grid md:grid-cols-5 sm:grid-cols-3 gap-2 text-[11px] text-white/60">
                  {history.map((h, idx) => (
                    <div key={`${s.id}-h-${idx}`} className="rounded-lg border border-white/10 bg-white/5 px-2 py-2">
                      <p className="font-semibold text-white/80">{(safeNum(h.edge, 0) * 100).toFixed(1)}% EV</p>
                      <p className="text-[10px]">Confidence {Math.round(safeNum(h.confidence, 0) * 100)}%</p>
                      <p className="text-[10px] text-white/50">{new Date(h.ts).toLocaleTimeString()}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
