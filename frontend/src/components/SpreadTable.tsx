import { SpreadCompare } from "../types";

function EvPill({ ev }: { ev: number }) {
  const strong = Math.abs(ev) >= 5;
  const tone = ev >= 0 ? "bg-emerald-500/15 text-emerald-100" : "bg-rose-500/15 text-rose-100";
  return (
    <span
      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-semibold border border-white/10 ${tone} ${
        strong ? "shadow-[0_0_20px_rgba(91,140,255,0.35)]" : ""
      }`}
    >
      <span
        className={`inline-block h-2 w-2 rounded-full ${ev >= 0 ? "bg-emerald-300" : "bg-rose-300"} animate-pulse`}
      />
      EV {ev.toFixed(1)}%
    </span>
  );
}

function LiquidityBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color = score >= 0.66 ? "from-emerald-400/80 to-cyan-400/80" : score >= 0.4 ? "from-amber-300/80 to-orange-400/80" : "from-rose-400/80 to-pink-500/70";
  const label = score >= 0.66 ? "Strong" : score >= 0.4 ? "Moderate" : "Weak";
  return (
    <div className="space-y-1">
      <div className="h-2 rounded-full bg-white/10 overflow-hidden">
        <div className={`h-full bg-gradient-to-r ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-[11px] text-white/60">Liquidity {label}</p>
    </div>
  );
}

function DirectionTag({ dir }: { dir: SpreadCompare["direction"] }) {
  const isLongOpinion = dir === "opinion-long";
  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-semibold border border-white/10 ${
        isLongOpinion ? "bg-emerald-500/20 text-emerald-100" : "bg-sky-500/20 text-sky-100"
      }`}
    >
      {isLongOpinion ? "Long Opinion" : "Long Poly"}
    </span>
  );
}

function ArbBar({ ev }: { ev: number }) {
  const width = Math.min(100, Math.abs(ev));
  const tone = ev >= 0 ? "from-emerald-400/90 to-cyan-400/80" : "from-rose-400/90 to-orange-400/80";
  return (
    <div className="space-y-1 min-w-[140px]">
      <div className="h-2 rounded-full bg-white/10 overflow-hidden">
        <div className={`h-full bg-gradient-to-r ${tone}`} style={{ width: `${width}%` }} />
      </div>
      <p className="text-[11px] text-white/60">Arb window {ev >= 0 ? "Opinion higher" : "Poly higher"}</p>
    </div>
  );
}

function safeNumber(value: any, fallback = 0) {
  return Number.isFinite(value) ? (value as number) : fallback;
}

export function SpreadTable({ data, loading }: { data?: SpreadCompare[]; loading?: boolean }) {
  const list = Array.isArray(data) ? data : [];
  return (
    <div className="glass-card rounded-2xl border border-white/10 p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs text-white/50">Cross-venue spread</p>
          <h3 className="text-lg font-semibold text-white">Opinion vs Polymarket</h3>
          <p className="text-[11px] text-white/50 mt-1">Includes CLOB live prices and Gamma fallback</p>
        </div>
        {list.length > 0 && <p className="text-xs text-white/60">Top {list.length}</p>}
      </div>
      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-12 rounded-xl bg-white/5 animate-pulse" />
          ))}
        </div>
      )}
      {!loading && list.length === 0 && (
        <div className="rounded-xl border border-dashed border-white/15 bg-white/5 px-4 py-6 text-center text-sm text-white/60">
          No spread data yet. Waiting for latest quotes.
        </div>
      )}
      {!loading && list.length > 0 && (
        <div className="retro-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="retro-table text-sm">
              <thead>
                <tr>
                  <th className="text-left">Market</th>
                  <th className="text-right">Opinion</th>
                  <th className="text-right">Poly</th>
                  <th className="text-center">EV%</th>
                  <th className="text-center">Direction</th>
                  <th className="text-center">Arb window</th>
                  <th className="text-center">Liquidity</th>
                  <th className="text-left">Execution hint</th>
                  <th className="text-right">24h Volume</th>
                </tr>
              </thead>
              <tbody>
                {list.map((row) => {
                  const opinionProb = safeNumber(row.opinionProb, 0);
                  const polyProb = safeNumber(row.polyProb, 0);
                  const evPct = safeNumber(row.evPct, 0);
                  const liquidityScore = safeNumber(row.liquidityScore, 0);
                  const volume24h = safeNumber(row.volume24h, 0);
                  return (
                    <tr key={row.id}>
                      <td className="max-w-[240px]">
                        <p className="font-semibold leading-snug line-clamp-2">{row.title}</p>
                        <p className="text-[11px] text-black/70 mt-1">Source {row.polySource === "clob" ? "CLOB" : "Gamma"}</p>
                      </td>
                      <td className="text-right">{(opinionProb * 100).toFixed(1)}%</td>
                      <td className="text-right">{(polyProb * 100).toFixed(1)}%</td>
                      <td className="text-center">
                        <EvPill ev={evPct} />
                      </td>
                      <td className="text-center">
                        <DirectionTag dir={row.direction} />
                      </td>
                      <td className="text-center">
                        <ArbBar ev={evPct} />
                      </td>
                      <td className="text-center">
                        <div className="min-w-[140px] mx-auto">
                          <LiquidityBar score={liquidityScore} />
                        </div>
                      </td>
                      <td className="text-left text-black/80">
                        <p className="text-sm font-semibold">{row.action}</p>
                        <p className="text-[11px] text-black/70 mt-1">{row.hint}</p>
                      </td>
                      <td className="text-right">${volume24h.toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
