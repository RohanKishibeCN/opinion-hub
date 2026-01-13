export type OpinionItem = {
  id: string;
  title: string;
  category: string;
  sentiment: "bull" | "bear" | "neutral";
  score: number;
  probability: number;
  updatedAt: string;
};

export type OrderbookSide = { price: number; size: number };
export type Orderbook = {
  tokenId: string;
  bids: OrderbookSide[];
  asks: OrderbookSide[];
  mid: number;
  spread: number;
  updatedAt: string;
  slippage?: { side: "buy" | "sell"; size: number; avgPrice: number; impact: number; impactPct: number }[];
};

export type HistoryPoint = {
  ts: number;
  price: number;
  volume: number;
};

export type ApiHealth = {
  ok: boolean;
  lastRefresh?: string;
  cacheHitRate?: number;
};

export type StrategySignal = {
  id: string;
  title: string;
  direction: "long" | "short";
  confidence: number;
  edge: number;
  updatedAt: string;
  history?: { ts: number; edge: number; confidence: number }[];
};

export type SpreadCompare = {
  id: string;
  title: string;
  opinionProb: number;
  polyProb: number;
  edge: number;
  evPct: number;
  direction: "opinion-long" | "poly-long";
  volume24h: number;
  liquidityScore: number;
  action: string;
  hint: string;
  polySource: "clob" | "gamma";
};

export type AlertRule = {
  id: string;
  marketId: string;
  title: string;
  direction: "above" | "below";
  threshold: number;
  webhook?: string;
  lastTriggered?: string;
  cooldownMinutes?: number;
};
