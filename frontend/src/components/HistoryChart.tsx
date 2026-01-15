import { Area, Bar, CartesianGrid, ComposedChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { HistoryPoint } from "../types";

function safeNum(val: any, fallback = 0) {
  return Number.isFinite(val) ? Number(val) : fallback;
}

export function HistoryChart({ data, loading }: { data?: HistoryPoint[]; loading?: boolean }) {
  const list = Array.isArray(data) ? data : [];
  const rows = list.map((p) => {
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

  const priceDomain = (() => {
    if (!rows.length) return [0, 1];
    const prices = rows.map((r) => r.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const pad = (max - min || 0.05) * 0.15;
    return [Math.max(0, min - pad), max + pad];
  })();

  const lastPrice = rows.length > 0 ? safeNum(rows[rows.length - 1]?.price, 0) : 0;

  return (
    <div className="retro-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-white/50">History</p>
          <h3 className="text-lg font-semibold text-white">Price & Volume</h3>
        </div>
        {rows.length > 0 && <p className="text-xs text-white/60">Last {lastPrice.toFixed(3)}</p>}
      </div>
      {loading && (
        <div className="space-y-2">
          <div className="h-4 w-28 rounded-full bg-white/5 animate-pulse" />
          <div className="h-72 rounded-2xl bg-white/5 animate-pulse" />
        </div>
      )}
      {!loading && rows.length === 0 && (
        <div className="rounded-xl border border-dashed border-white/15 bg-white/5 px-4 py-6 text-center text-sm text-white/60">
          No history yet. Waiting for new trades.
        </div>
      )}
      {!loading && rows.length > 0 && (
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={rows} margin={{ left: -10, right: 16, top: 10 }}>
              <defs>
                <linearGradient id="priceGradient" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#5CE1E6" stopOpacity={0.8} />
                  <stop offset="100%" stopColor="#7C8CFF" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2a44" />
              <XAxis dataKey="time" tick={{ fill: "#8FA4C7", fontSize: 11 }} interval={4} />
              <YAxis yAxisId="left" tick={{ fill: "#8FA4C7", fontSize: 11 }} tickFormatter={(v) => safeNum(v, 0).toFixed(2)} domain={priceDomain as [number, number]} />
              <YAxis yAxisId="right" orientation="right" tick={{ fill: "#8FA4C7", fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: "#11182A", border: "1px solid #1f2a44", borderRadius: 12 }}
                labelStyle={{ color: "#E6ECF5" }}
                formatter={(val: number, key: string) => (key === "volume" ? [`${safeNum(val, 0)}`, "Volume"] : [safeNum(val, 0).toFixed(3), "Price"])}
              />
              <Area yAxisId="left" type="monotone" dataKey="price" stroke="#5CE1E6" fill="url(#priceGradient)" name="Price" />
              <Bar yAxisId="right" dataKey="volume" barSize={16} fill="#42A5F5" opacity={0.7} name="Volume" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
