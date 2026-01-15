import { useMemo } from "react";
import { Area, AreaChart, CartesianGrid, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { HistoryPoint, OpinionItem } from "../types";

function safeNum(val: any, fallback = 0) {
  return Number.isFinite(val) ? Number(val) : fallback;
}

function deriveEvents(history?: HistoryPoint[]) {
  const list = Array.isArray(history) ? history : [];
  if (list.length === 0) return [] as { ts: number; label: string; desc: string }[];
  const sorted = [...list]
    .map((p) => ({ ...p, price: safeNum(p?.price, 0), volume: safeNum(p?.volume, 0), ts: typeof p?.ts === "number" ? p.ts : 0 }))
    .sort((a, b) => a.ts - b.ts);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const high = sorted.reduce((m, p) => (p.price > m.price ? p : m), first);
  const low = sorted.reduce((m, p) => (p.price < m.price ? p : m), first);
  const maxVol = sorted.reduce((m, p) => (p.volume > m.volume ? p : m), first);
  const changePct = first.price ? ((last.price - first.price) / first.price) * 100 : 0;

  const events = [
    { ts: first.ts, label: "Start", desc: `Start ${first.price.toFixed(3)}` },
    { ts: high.ts, label: "High", desc: `High ${high.price.toFixed(3)}` },
    { ts: low.ts, label: "Low", desc: `Low ${low.price.toFixed(3)}` },
    { ts: maxVol.ts, label: "Volume spike", desc: `Volume ${maxVol.volume}` },
    { ts: last.ts, label: changePct >= 0 ? "Close up" : "Close down", desc: `${changePct >= 0 ? "+" : ""}${changePct.toFixed(1)}% · Closed ${last.price.toFixed(3)}` }
  ];

  const unique = new Map<number, { ts: number; label: string; desc: string }>();
  events.forEach((e) => {
    const key = Math.round(e.ts / 60000) * 60000;
    if (!unique.has(key)) unique.set(key, e);
  });
  return Array.from(unique.values()).slice(0, 8);
}

export function HistoryDetail({ open, onClose, market, history }: { open: boolean; onClose: () => void; market?: OpinionItem; history?: HistoryPoint[] }) {
  const safeHistory = useMemo(() => (Array.isArray(history) ? history : []), [history]);

  const rows = useMemo(() => {
    return safeHistory.map((p) => {
      const ts = typeof p?.ts === "number" ? p.ts : 0;
      const price = safeNum(p?.price, 0);
      const volume = safeNum(p?.volume, 0);
      return {
        ...p,
        ts,
        price,
        volume,
        time: new Date(ts || 0).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      };
    });
  }, [safeHistory]);

  const priceDomain = useMemo(() => {
    if (rows.length === 0) return [0, 1];
    const prices = rows.map((r) => r.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const pad = (max - min || 0.05) * 0.15;
    return [Math.max(0, min - pad), max + pad];
  }, [rows]);

  const events = useMemo(() => deriveEvents(safeHistory), [safeHistory]);
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
    const changePct = first.price ? (changeAbs / first.price) * 100 : 0;
    const vol = sorted.reduce((sum, p) => sum + safeNum(p.volume, 0), 0);
    return { first: first.price, last: last.price, high, low, changeAbs, changePct, vol };
  }, [safeHistory]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur" onClick={onClose} />
      <div className="relative z-50 w-[min(1100px,95vw)] max-h-[90vh] overflow-y-auto retro-card bg-[#dcdcdc]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 sticky top-0 bg-[#0D1428]/95 backdrop-blur">
          <div>
            <p className="text-xs text-white/60">History detail · Timeline</p>
            <h3 className="text-lg font-semibold text-white leading-snug">{market?.title || "No market selected"}</h3>
          </div>
          <button onClick={onClose} className="px-3 py-1.5 rounded-lg border border-white/15 text-sm text-white/70 hover:text-white hover:border-white/40">
            Close
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard label="Start" value={stats ? stats.first.toFixed(3) : "-"} />
            <StatCard
              label="Range change"
              value={stats ? `${stats.changeAbs >= 0 ? "+" : ""}${stats.changeAbs.toFixed(3)} (${stats.changePct.toFixed(1)}%)` : "-"}
              tone={stats ? (stats.changeAbs >= 0 ? "pos" : "neg") : "muted"}
            />
            <StatCard label="High / Low" value={stats ? `${stats.high.toFixed(3)} / ${stats.low.toFixed(3)}` : "-"} />
            <StatCard label="Total volume" value={stats ? stats.vol.toLocaleString() : "-"} />
          </div>

          <div className="h-80 glass-card rounded-2xl border border-white/10 p-4">
            {rows.length === 0 ? (
              <div className="h-full flex items-center justify-center text-white/60">No history data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={rows} margin={{ left: -10, right: 16, top: 10 }}>
                  <defs>
                    <linearGradient id="historyArea" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#5CE1E6" stopOpacity={0.8} />
                      <stop offset="100%" stopColor="#7C8CFF" stopOpacity={0.15} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2a44" />
                  <XAxis dataKey="time" tick={{ fill: "#8FA4C7", fontSize: 11 }} interval={4} />
                  <YAxis tick={{ fill: "#8FA4C7", fontSize: 11 }} tickFormatter={(v) => safeNum(v, 0).toFixed(2)} domain={priceDomain as [number, number]} />
                  <Tooltip contentStyle={{ background: "#11182A", border: "1px solid #1f2a44", borderRadius: 12 }} labelStyle={{ color: "#E6ECF5" }} formatter={(val: number) => [safeNum(val, 0).toFixed(3), "Price"]} />
                  <Area type="monotone" dataKey="price" stroke="#5CE1E6" fill="url(#historyArea)" name="Price" />
                  {events.map((e) => (
                    <ReferenceDot
                      key={e.ts}
                      x={new Date(e.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      y={rows.find((r) => r.ts === e.ts)?.price ?? rows[rows.length - 1]?.price ?? 0}
                      r={5}
                      fill="#F6C344"
                      stroke="#11182A"
                      isFront
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {events.length > 0 && (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-white">Event timeline</p>
                <span className="text-[11px] px-2 py-1 rounded-full bg-white/10 border border-white/15 text-white/60">{events.length} annotations</span>
              </div>
              <div className="space-y-3">
                {events.map((e) => (
                  <div key={e.ts} className="flex items-start gap-3">
                    <div className="mt-1 h-2 w-2 rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400" />
                    <div className="flex-1">
                      <p className="text-sm text-white font-semibold">{e.label}</p>
                      <p className="text-xs text-white/60">{new Date(e.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</p>
                      <p className="text-sm text-white/80 mt-0.5">{e.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: string; tone?: "pos" | "neg" | "muted" }) {
  const toneClass = tone === "pos" ? "text-emerald-200" : tone === "neg" ? "text-rose-200" : "text-white";
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3 space-y-1 shadow-inner shadow-cyan-500/5">
      <p className="text-[11px] uppercase tracking-wide text-white/50">{label}</p>
      <p className={`text-lg font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}
