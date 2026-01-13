import { Orderbook } from "../opinionClient";

export type SlippageBand = {
  size: number; // desired size (shares or units)
  avgPrice: number;
  impact: number; // absolute difference from mid
  impactPct: number; // relative to mid
  side: "buy" | "sell";
};

export function estimateSlippage(ob: Orderbook, sizes: number[] = [100, 500, 1000]): SlippageBand[] {
  if (!ob || !ob.bids || !ob.asks || ob.bids.length === 0 || ob.asks.length === 0) return [];
  const { bids, asks, mid } = ob;

  const walk = (side: "buy" | "sell", qty: number) => {
    let remaining = qty;
    let cost = 0;
    const levels = side === "buy" ? asks : bids;
    for (const lvl of levels) {
      if (remaining <= 0) break;
      const take = Math.min(remaining, lvl.size);
      cost += take * lvl.price;
      remaining -= take;
    }
    const filled = qty - remaining;
    if (filled <= 0) return { avg: mid, impact: 0 };
    const avg = cost / filled;
    const impact = side === "buy" ? avg - mid : mid - avg;
    return { avg, impact };
  };

  const bands: SlippageBand[] = [];
  for (const s of sizes) {
    const buy = walk("buy", s);
    const sell = walk("sell", s);
    bands.push(
      {
        size: s,
        avgPrice: +buy.avg.toFixed(4),
        impact: +buy.impact.toFixed(4),
        impactPct: mid ? +(buy.impact / mid).toFixed(4) : 0,
        side: "buy"
      },
      {
        size: s,
        avgPrice: +sell.avg.toFixed(4),
        impact: +sell.impact.toFixed(4),
        impactPct: mid ? +(sell.impact / mid).toFixed(4) : 0,
        side: "sell"
      }
    );
  }
  return bands;
}
