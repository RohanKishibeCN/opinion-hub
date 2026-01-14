import { useMemo } from "react";
import { Area, Bar, CartesianGrid, ComposedChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Orderbook } from "../types";
import { OrderbookSlippage } from "./OrderbookSlippage";

type DepthBucket = {
  label: string;
  bidSize: number;
  askSize: number;
};

type SignedRow = {
  price: number;
  size: number; // bid positive, ask negative
  side: "Bid" | "Ask";
};

function SummaryChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-xs text-white/80 shadow-inner shadow-cyan-500/5">
      <p className="text-[11px] uppercase tracking-wide text-white/50">{label}</p>
      <p className="text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function num(val: any, fallback = 0) {
  return Number.isFinite(val) ? (val as number) : fallback;
}

export function OrderbookDepth({ data, loading }: { data?: Orderbook; loading?: boolean }) {
  const bids = Array.isArray(data?.bids) ? data!.bids : [];
  const asks = Array.isArray(data?.asks) ? data!.asks : [];
  const rows: SignedRow[] = data
    ? [...bids.map((b) => ({ price: num(b.price), size: num(b.size), side: "Bid" })), ...asks.map((a) => ({ price: num(a.price), size: -num(a.size), side: "Ask" }))].sort(
        (a, b) => a.price - b.price
      )
    : [];

  const stats = useMemo(() => {
    if (!data || rows.length === 0) return null;
    const bestBid = bids.reduce((m, p) => Math.max(m, num(p.price)), bids[0]?.price || 0);
    const bestAsk = asks.reduce((m, p) => Math.min(m, num(p.price)), asks[0]?.price || 0);
    const bidSize = bids.reduce((sum, p) => sum + num(p.size), 0);
    const askSize = asks.reduce((sum, p) => sum + num(p.size), 0);
    return { bestBid, bestAsk, bidSize, askSize };
  }, [data, rows, bids, asks]);

  const yDomain = useMemo(() => {
    if (rows.length === 0) return [0, 1];
    const maxAbs = rows.reduce((m, r) => Math.max(m, Math.abs(r.size)), 0);
    return [-maxAbs * 1.1, maxAbs * 1.1];
  }, [rows]);

  const buckets = useMemo<DepthBucket[]>(() => {
    if (rows.length === 0) return [];
    const prices = rows.map((r) => r.price);
    const minP = Math.min(...prices);
    const maxP = Math.max(...prices);
    const step = Math.max((maxP - minP) / 12, 0.01);
    const map = new Map<number, DepthBucket>();
    rows.forEach((r) => {
      const bucketIdx = Math.floor((r.price - minP) / step);
      const start = minP + bucketIdx * step;
      const end = start + step;
      const key = Number(start.toFixed(4));
      if (!map.has(key)) {
        map.set(key, { label: `${start.toFixed(3)} - ${end.toFixed(3)}`, bidSize: 0, askSize: 0 });
      }
      const bucket = map.get(key)!;
      if (r.side === "Bid") bucket.bidSize += r.size;
      else bucket.askSize += Math.abs(r.size);
    });
    return Array.from(map.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([, v]) => v);
  }, [rows]);

  const maxBucket = useMemo(() => {
    return buckets.reduce((m, b) => Math.max(m, b.bidSize, b.askSize), 0);
  }, [buckets]);

  return (
    <div className="retro-card p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs text-white/50">Orderbook depth</p>
          <h3 className="text-lg font-semibold text-white">Orderbook</h3>
        </div>
        {data && (
          <div className="flex gap-2">
            <SummaryChip label="Mid price" value={num(data.mid).toFixed(3)} />
            <SummaryChip label="Spread" value={num(data.spread).toFixed(3)} />
          </div>
        )}
      </div>

      {data && stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <SummaryChip label="Best bid" value={stats.bestBid ? stats.bestBid.toFixed(3) : "-"} />
          <SummaryChip label="Best ask" value={stats.bestAsk ? stats.bestAsk.toFixed(3) : "-"} />
          <SummaryChip label="Bid size" value={stats.bidSize.toFixed(2)} />
          <SummaryChip label="Ask size" value={stats.askSize.toFixed(2)} />
        </div>
      )}

      {loading && (
        <div className="space-y-3">
          <div className="pixel-bar" />
          <div className="pixel-bar w-3/4" />
          <div className="pixel-bar w-2/3" />
          <div className="rounded-lg border border-dashed border-white/20 bg-white/5 px-4 py-4 text-sm text-white/70">
            Loading orderbook · pixel progress
          </div>
        </div>
      )}

      {!loading && rows.length === 0 && (
        <div className="rounded-xl border border-dashed border-white/15 bg-white/5 px-4 py-6 text-center text-sm text-white/60 space-y-2">
          <div className="pixel-bar w-2/3 mx-auto" />
          <p className="text-[13px]">No orderbook yet. Waiting for trades.</p>
        </div>
      )}

      {!loading && rows.length > 0 && (
        <div className="space-y-4">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={rows} margin={{ left: -10, right: 10, top: 10 }}>
                <defs>
                  <linearGradient id="bid" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#4CAF50" stopOpacity={0.65} />
                    <stop offset="100%" stopColor="#4CAF50" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="ask" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#E53935" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="#E53935" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2a44" />
                <XAxis dataKey="price" tick={{ fill: "#8FA4C7", fontSize: 12 }} tickFormatter={(v) => Number(v).toFixed(2)} />
                <YAxis
                  tick={{ fill: "#8FA4C7", fontSize: 12 }}
                  tickFormatter={(v) => `${Math.abs(Number(v)).toFixed(2)}`}
                  domain={yDomain as [number, number]}
                />
                <Tooltip
                  contentStyle={{ background: "#11182A", border: "1px solid #1f2a44", borderRadius: 12 }}
                  labelStyle={{ color: "#E6ECF5" }}
                  formatter={(val: number, _key: string, payload) => {
                    const side = payload?.payload?.side as string;
                    return [`${Math.abs(val).toFixed(3)}`, side];
                  }}
                  labelFormatter={(value) => `Price ${Number(value).toFixed(3)}`}
                />
                <ReferenceLine y={0} stroke="#1f2a44" strokeDasharray="3 3" />
                <Bar dataKey={(d: SignedRow) => (d.size > 0 ? d.size : 0)} fill="url(#bid)" name="Bids" isAnimationActive={false} />
                <Bar dataKey={(d: SignedRow) => (d.size < 0 ? Math.abs(d.size) : 0)} fill="url(#ask)" name="Asks" isAnimationActive={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs text-white/60">Buckets · volume comparison</p>
              {data && <p className="text-[11px] text-white/50">Dynamic step ~{num(data.spread).toFixed(3)}</p>}
            </div>
            {buckets.length === 0 && <p className="text-sm text-white/60">Waiting for more bucket data</p>}
            {buckets.length > 0 && (
              <div className="space-y-2">
                {buckets.map((b) => {
                  const bidWidth = maxBucket ? (b.bidSize / maxBucket) * 100 : 0;
                  const askWidth = maxBucket ? (b.askSize / maxBucket) * 100 : 0;
                  return (
                    <div key={b.label} className="rounded-lg border border-white/5 bg-white/5 px-3 py-2">
                      <div className="flex items-center justify-between text-xs text-white/70">
                        <span>{b.label}</span>
                        <span className="flex gap-3">
                          <span className="text-emerald-200">Bid {b.bidSize.toFixed(2)}</span>
                          <span className="text-rose-200">Ask {b.askSize.toFixed(2)}</span>
                        </span>
                      </div>
                      <div className="mt-2 h-3 rounded-full bg-white/10 overflow-hidden flex">
                        <div className="h-full bg-emerald-500/60" style={{ width: `${bidWidth}%` }} />
                        <div className="h-full bg-rose-500/60 ml-0.5" style={{ width: `${askWidth}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {buckets.length > 0 && (
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={buckets} margin={{ left: -10, right: 10, top: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2a44" />
                  <XAxis dataKey="label" tick={{ fill: "#8FA4C7", fontSize: 10 }} interval={0} angle={-25} textAnchor="end" height={50} />
                  <YAxis tick={{ fill: "#8FA4C7", fontSize: 11 }} tickFormatter={(v) => `${v}`} />
                  <Tooltip
                    contentStyle={{ background: "#11182A", border: "1px solid #1f2a44", borderRadius: 12 }}
                    labelStyle={{ color: "#E6ECF5" }}
                    formatter={(val: number, key: string) => [val.toFixed(2), key === "bidSize" ? "Bids" : "Asks"]}
                  />
                  <Bar dataKey="bidSize" fill="#4CAF50" opacity={0.85} name="Bids" />
                  <Bar dataKey="askSize" fill="#E53935" opacity={0.85} name="Asks" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}

          <OrderbookSlippage ob={data} />
        </div>
      )}
    </div>
  );
}
