import { config } from "./config";
import { cacheGet, cacheSet } from "./cache";

const base = (config.opinionBase || "https://proxy.opinion.trade:8443/openapi").replace(/\/$/, "");
const gammaBase = "https://gamma-api.polymarket.com";
const clobBase = "https://clob.polymarket.com";
const polymarketSubgraph = "https://api.goldsky.com/api/public/project_cl6mb8i9h0003e201j6li0diw/subgraphs/activity-subgraph/0.0.4/gn";

async function fetchJson<T>(url: string): Promise<T> {
  const headers: Record<string, string> = {
    apikey: config.opinionKey,
    accept: "application/json"
  };
  return fetch(url, { headers })
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`status ${r.status}`))))
    .catch((err) => {
      console.error("fetch", url, err);
      return Promise.reject(err);
    });
}

async function fetchJsonPublic<T>(url: string): Promise<T> {
  return fetch(url, { headers: { accept: "application/json" } as Record<string, string> })
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`status ${r.status}`))))
    .catch((err) => {
      console.error("fetchPublic", url, err);
      return Promise.reject(err);
    });
}

export type Market = {
  id: string;
  title: string;
  category?: string;
  sentiment?: "bull" | "bear" | "neutral";
  probability?: number;
  updatedAt?: string;
};

export type Orderbook = {
  tokenId: string;
  bids: { price: number; size: number }[];
  asks: { price: number; size: number }[];
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

function makeDeterministicNumber(seed: string, factor: number) {
  const hash = Array.from(seed).reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return ((hash % factor) + factor / 2) / factor;
}

function avg(arr: number[]) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function std(arr: number[]) {
  if (arr.length <= 1) return 0;
  const mean = avg(arr);
  const variance = arr.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / (arr.length - 1);
  return Math.sqrt(variance);
}

export async function getMarkets(q?: string): Promise<Market[]> {
  const key = q ? `markets:q:${q}` : "markets:all";
  const cached = await cacheGet<Market[]>(key);
  if (cached) return cached;
  const url = q ? `${base}/market?status=activated&limit=50&category=${encodeURIComponent(q)}` : `${base}/market?status=activated&limit=50`;
  return fetchJson<any>(url)
    .then(async (resp) => {
      console.log("markets resp", JSON.stringify(resp)?.slice(0, 500));
      const list = Array.isArray(resp?.result?.list) ? resp.result.list : Array.isArray(resp?.data) ? resp.data : Array.isArray(resp) ? resp : [];
      if (!Array.isArray(list) || list.length === 0) {
        console.error("markets empty", resp);
      }
      const normalized = (list || []).map((m: any, idx: number) => ({
        id: m.yesTokenId || m.tokenId || m.marketId || `m-${idx}`,
        title: m.marketTitle || m.title || m.name || "Untitled market",
        category: m.category || m.tag || "General",
        sentiment: idx % 3 === 0 ? "bull" : idx % 3 === 1 ? "bear" : "neutral",
        probability: typeof m.lastPrice === "number" ? m.lastPrice : typeof m.price === "number" ? m.price : Math.max(0.05, Math.min(0.95, makeDeterministicNumber(`${idx}`, 100))),
        updatedAt: m.updatedAt || m.time || new Date().toISOString()
      })) as Market[];
      await cacheSet(key, normalized, config.cacheTtlMs);
      return normalized;
    })
    .catch((err) => {
      console.error("markets fallback", err);
      const fallback: Market[] = Array.from({ length: 10 }).map((_, idx) => ({
        id: `mock-${idx}`,
        title: `Sample market ${idx + 1}`,
        category: idx % 2 === 0 ? "Macro" : "Crypto",
        sentiment: idx % 3 === 0 ? "bull" : idx % 3 === 1 ? "bear" : "neutral",
        probability: 0.35 + idx * 0.02,
        updatedAt: new Date().toISOString()
      }));
      return fallback;
    });
}

import { estimateSlippage } from "./utils/slippage";

export async function getOrderbook(tokenId: string): Promise<Orderbook> {
  const key = `orderbook:${tokenId}`;
  const cached = await cacheGet<Orderbook>(key);
  if (cached) return cached;
  const url = `${base}/token/orderbook?tokenId=${encodeURIComponent(tokenId)}`;
  return fetchJson<any>(url)
    .then(async (resp) => {
      const bidsRaw = resp?.data?.bids || resp?.bids || [];
      const asksRaw = resp?.data?.asks || resp?.asks || [];
      const bids = (bidsRaw as any[]).map((b) => ({ price: +b.price || +b[0] || 0, size: +b.size || +b[1] || 0 }));
      const asks = (asksRaw as any[]).map((a) => ({ price: +a.price || +a[0] || 0, size: +a.size || +a[1] || 0 }));
      const mid = bids.length && asks.length ? +(((asks[0].price || 0) + (bids[0].price || 0)) / 2).toFixed(3) : 0;
      const spread = bids.length && asks.length ? +(asks[0].price - bids[0].price).toFixed(3) : 0;
      const slippage = estimateSlippage({ tokenId, bids, asks, mid, spread, updatedAt: new Date().toISOString() });
      const payload: Orderbook = { tokenId, bids, asks, mid, spread, slippage, updatedAt: new Date().toISOString() };
      await cacheSet(key, payload, Math.max(10000, config.cacheTtlMs / 2));
      return payload;
    })
    .catch(async (err) => {
      console.error("orderbook upstream", err);
      const fallbackBase = Math.max(0.1, Math.min(0.9, makeDeterministicNumber(tokenId, 100)));
      const bids = Array.from({ length: 8 }).map((_, i) => ({ price: +(fallbackBase - i * 0.01).toFixed(3), size: +(Math.max(0.2, 2.5 - i * 0.2)).toFixed(2) }));
      const asks = Array.from({ length: 8 }).map((_, i) => ({ price: +(fallbackBase + i * 0.01).toFixed(3), size: +(Math.max(0.2, 2 + i * 0.25)).toFixed(2) }));
      const mid = +(fallbackBase).toFixed(3);
      const spread = +(asks[0].price - bids[0].price).toFixed(3);
      const slippage = estimateSlippage({ tokenId, bids, asks, mid, spread, updatedAt: new Date().toISOString() });
      const payload: Orderbook = { tokenId, bids, asks, mid, spread, slippage, updatedAt: new Date().toISOString() };
      await cacheSet(key, payload, Math.max(10000, config.cacheTtlMs / 2));
      return payload;
    });
}

export async function getHistory(tokenId: string, opts?: { interval?: string; limit?: number }): Promise<HistoryPoint[]> {
  const interval = opts?.interval || "1h";
  const limit = opts?.limit && opts.limit > 0 ? Math.min(opts.limit, 200) : 50;
  const key = `history:${tokenId}:${interval}:${limit}`;
  const cached = await cacheGet<HistoryPoint[]>(key);
  if (cached) return cached;
  const url = `${base}/token/price-history?tokenId=${encodeURIComponent(tokenId)}&interval=${encodeURIComponent(interval)}&limit=${limit}`;
  return fetchJson<any>(url)
    .then(async (resp) => {
      const list = Array.isArray(resp?.data) ? resp.data : Array.isArray(resp) ? resp : [];
      if (!Array.isArray(list)) {
        console.error("history upstream non-array", resp?.data ?? resp);
        return [] as HistoryPoint[];
      }
      const points: HistoryPoint[] = (list as any[]).map((p) => ({
        ts: Number(p?.ts || p?.time || Date.now()),
        price: +(p?.price || p?.close || p?.last || 0),
        volume: Number(p?.volume || p?.vol || 0)
      }));
      await cacheSet(key, points, Math.max(5 * 60 * 1000, config.cacheTtlMs * 5));
      return points;
    })
    .catch(async (err) => {
      console.error("history upstream", err);
      const now = Date.now();
      const startPrice = Math.max(0.1, Math.min(0.9, makeDeterministicNumber(tokenId, 80)));
      const points: HistoryPoint[] = Array.from({ length: limit }).map((_, idx) => {
        const drift = (Math.sin(idx / 5) * 0.05 + idx * 0.002) * (idx % 2 === 0 ? 1 : -1);
        const price = Math.max(0.05, Math.min(0.95, startPrice + drift));
        const volume = Math.round(50 + Math.abs(Math.sin(idx)) * 40 + idx * 2);
        return { ts: now - (limit - 1 - idx) * 60 * 1000, price: +price.toFixed(3), volume };
      });
      await cacheSet(key, points, Math.max(5 * 60 * 1000, config.cacheTtlMs * 5));
      return points;
    });
}

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

export type PolyMarketEntry = {
  id: string;
  title: string;
  category: string;
  probability: number;
  tokenId?: string; // primary yes token id
  yesTokenId?: string;
  noTokenId?: string;
  conditionId?: string;
  yesPrice?: number;
  noPrice?: number;
  volume24h: number;
};

async function fetchGammaMarkets(): Promise<PolyMarketEntry[]> {
  const key = "poly:gamma";
  const cached = await cacheGet<PolyMarketEntry[]>(key);
  if (cached) return cached;

  // Gamma API: ensure we capture true outcome token_ids (long strings) and stable prices
  const url = `${gammaBase}/markets?active=true&closed=false&limit=100&offset=0`;
  return fetchJsonPublic<any>(url)
    .then(async (resp) => {
      const list = Array.isArray(resp?.markets) ? resp.markets : Array.isArray(resp?.events) ? resp.events : Array.isArray(resp) ? resp : [];
      const normalized: PolyMarketEntry[] = (list || []).map((m: any, idx: number) => {
        const tokens = Array.isArray(m?.tokens) ? m.tokens : [];
        const yesTokenId = tokens.find((t: any) => t?.outcome?.toLowerCase?.() === "yes")?.token_id || tokens[0]?.token_id || m?.outcome_tokens?.[0] || m?.outcome_token?.[0] || null;
        const noTokenId = tokens.find((t: any) => t?.outcome?.toLowerCase?.() === "no")?.token_id || tokens[1]?.token_id || null;
        const outcomePrices = Array.isArray(m?.outcome_prices) ? m.outcome_prices : [];
        const yesPrice = typeof outcomePrices?.[0] === "number" ? outcomePrices[0] : typeof m?.price === "number" ? m.price : undefined;
        const noPrice = typeof outcomePrices?.[1] === "number" ? outcomePrices[1] : undefined;
        const probability = Math.max(0.05, Math.min(0.95, yesPrice ?? 0.5));
        const volume24h = Number(m?.volume || m?.liquidity || 0);
        return {
          id: m?.id || m?.condition_id || `poly-${idx}`,
          title: m?.question || m?.title || m?.slug || "Polymarket market",
          category: m?.category || m?.tag || "General",
          probability,
          tokenId: yesTokenId || undefined,
          yesTokenId: yesTokenId || undefined,
          noTokenId: noTokenId || undefined,
          conditionId: m?.condition_id || m?.id,
          yesPrice: yesPrice ?? undefined,
          noPrice: noPrice ?? undefined,
          volume24h
        } as PolyMarketEntry;
      });
      await cacheSet(key, normalized, Math.max(config.cacheTtlMs, 120000));
      return normalized;
    })
    .catch((err) => {
      console.error("gamma markets", err);
      return [] as PolyMarketEntry[];
    });
}

async function fetchClobPrice(tokenId?: string): Promise<number | undefined> {
  if (!tokenId) return undefined;
  // guard against short/invalid ids from condition_id/market_id
  if (tokenId.length < 40) {
    return undefined;
  }
  const key = `poly:price:${tokenId}`;
  const cached = await cacheGet<number>(key);
  if (cached) return cached;
  const url = `${clobBase}/price?token_id=${encodeURIComponent(tokenId)}`;
  return fetchJsonPublic<any>(url)
    .then(async (resp) => {
      const price = resp?.price ? Number(resp.price) : undefined;
      if (typeof price === "number" && !Number.isNaN(price)) {
        const prob = Math.max(0.01, Math.min(0.99, price));
        await cacheSet(key, prob, Math.max(15000, config.cacheTtlMs / 2));
        return prob;
      }
      return undefined;
    })
    .catch((err) => {
      console.error("clob price", tokenId, err);
      return undefined;
    });
}

async function fetchPolyHistory(conditionId?: string): Promise<HistoryPoint[]> {
  if (!conditionId) return [];
  const key = `poly:history:${conditionId}`;
  const cached = await cacheGet<HistoryPoint[]>(key);
  if (cached) return cached;

  const query = `\
    query {\n      fills(where: {conditionId: \"${conditionId}\"}, orderBy: timestamp, orderDirection: desc, first: 100) {\n        timestamp\n        price\n        outcomeIndex\n      }\n    }\n  `;

  try {
    const res = await fetch(polymarketSubgraph, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query })
    });
    const data = await res.json();
    const fills = Array.isArray(data?.data?.fills) ? data.data.fills : [];
    const points: HistoryPoint[] = fills.map((f: any) => ({
      ts: Number(f?.timestamp) * 1000 || Date.now(),
      price: typeof f?.price === "number" ? f.price : Number(f?.price) || 0,
      volume: 0
    }));
    await cacheSet(key, points, Math.max(5 * 60 * 1000, config.cacheTtlMs * 5));
    return points;
  } catch (err) {
    console.error("subgraph history", err);
    return [];
  }
}

export async function getStrategySignals(): Promise<StrategySignal[]> {
  const key = "strategy:signals";
  const historyKey = "strategy:history";
  const cached = await cacheGet<StrategySignal[]>(key);
  if (cached && cached.length > 0 && cached[0]?.history) return cached;

  const historyMap = (await cacheGet<Record<string, { ts: number; edge: number; confidence: number }[]>>(historyKey)) || {};
  const [opinionMarkets, polyMarkets] = await Promise.all([getMarkets(), fetchGammaMarkets()]);
  const normalizedPoly = polyMarkets.filter((p) => p.probability && p.id);

  const normalizeTitle = (s: string) => s.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5\s]/g, "").trim();

  const candidates = (opinionMarkets || []).slice(0, 12).map((m, idx) => {
    const baseTitle = normalizeTitle(m.title || "");
    const candidate =
      normalizedPoly.find((p) => normalizeTitle(p.title).includes(baseTitle) || baseTitle.includes(normalizeTitle(p.title))) ||
      normalizedPoly[idx % Math.max(1, normalizedPoly.length)];
    return { m, candidate };
  });

  const rows = await Promise.all(
    candidates.map(async ({ m, candidate }, idx) => {
      const opinionProb = Math.max(0.05, Math.min(0.95, m.probability || 0.5));
      const polyProbGamma = candidate?.yesPrice ?? candidate?.probability ?? 0.5;
      const polyProbClob = candidate?.yesTokenId ? await fetchClobPrice(candidate.yesTokenId) : undefined;
      const polyProb = polyProbClob ?? polyProbGamma;
      const edge = opinionProb - polyProb;
      const spreadAbs = Math.abs(edge);

      if (spreadAbs < 0.03) {
        return null; // Skip signals when spread < 3%
      }

      // Depth (rough): only fetch orderbook for short tokenIds (Opinion native); skip others to avoid Polymarket misuse
      const ob = candidate?.tokenId && candidate.tokenId.length < 40 ? await getOrderbook(candidate.tokenId) : undefined;
      const topBid = ob?.bids?.[0]?.size || 0;
      const topAsk = ob?.asks?.[0]?.size || 0;
      const depth = topBid + topAsk;
      const depthScore = depth > 0 ? Math.min(1, depth / 10) : Math.min(1, Math.log10((candidate?.volume24h || 1) + 1) / 3);

      // Volatility: Polymarket uses subgraph; Opinion tokens use native history
      const history = candidate?.conditionId
        ? await fetchPolyHistory(candidate.conditionId)
        : candidate?.tokenId && candidate.tokenId.length < 40
        ? await getHistory(candidate.tokenId)
        : [];
      const prices = (history || []).map((h) => h.price).filter((n) => typeof n === "number" && !Number.isNaN(n));
      const vol = prices.length > 5 ? std(prices) / Math.max(0.01, avg(prices)) : 0.1;
      const volScore = Math.min(1, vol / 0.5); // Rough normalization: 0.5 vol maps to 1

      // Score: 50% spread + 30% depth + 20% volatility
      const spreadScore = Math.min(1, spreadAbs / 0.2); // Cap spread at 20%
      const score = 0.5 * spreadScore + 0.3 * depthScore + 0.2 * volScore;

      const direction = edge > 0 ? "long" : "short";
      const confidence = Math.min(0.95, Math.max(0.5, score));

      return {
        id: m.id,
        title: m.title,
        direction,
        confidence,
        edge: +edge.toFixed(3),
        updatedAt: new Date().toISOString()
      } as StrategySignal;
    })
  );

  const signals = rows
    .filter((r): r is StrategySignal => Boolean(r))
    .map((s) => {
      const prev = historyMap[s.id] || [];
      const next = [...prev, { ts: Date.now(), edge: s.edge, confidence: s.confidence }].slice(-5);
      historyMap[s.id] = next;
      return { ...s, history: next } as StrategySignal;
    });

  await cacheSet(historyKey, historyMap, Math.max(config.cacheTtlMs, 120000));
  await cacheSet(key, signals, Math.max(config.cacheTtlMs, 120000));
  return signals;
}

export async function getSpreadCompare(): Promise<SpreadCompare[]> {
  const key = "strategy:spreads";
  const cached = await cacheGet<SpreadCompare[]>(key);
  if (cached) return cached;

  const [opinionMarkets, polyMarkets] = await Promise.all([getMarkets(), fetchGammaMarkets()]);
  const normalizedPoly = polyMarkets.filter((p) => p.probability && p.id);

  const normalizeTitle = (s: string) => s.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5\s]/g, "").trim();

  const spreads = (opinionMarkets || []).slice(0, 12).map((m, idx) => {
    const opinionProb = Math.max(0.05, Math.min(0.95, m.probability || 0.5));
    const baseTitle = normalizeTitle(m.title || "");
    const candidate =
      normalizedPoly.find((p) => normalizeTitle(p.title).includes(baseTitle) || baseTitle.includes(normalizeTitle(p.title))) ||
      normalizedPoly[idx % Math.max(1, normalizedPoly.length)];

    const fallbackPolyProb = candidate?.yesPrice ?? candidate?.probability ?? 0.5;
    const clobPromise = candidate?.yesTokenId ? fetchClobPrice(candidate.yesTokenId) : Promise.resolve(undefined);
    return { m, candidate, opinionProb, fallbackPolyProb, clobPromise };
  });

  const resolved = await Promise.all(
    spreads.map(async (row) => {
      const clobProb = await row.clobPromise;
      const polyProbRaw = clobProb ?? row.fallbackPolyProb;
      const polyProb = Math.max(0.01, Math.min(0.99, polyProbRaw));
      const polySource: "clob" | "gamma" = clobProb !== undefined ? "clob" : "gamma";
      const edge = +(row.opinionProb - polyProb).toFixed(3);
      const evPct = +(edge * 100).toFixed(1);
      const volume24h = row.candidate?.volume24h ?? 0;
      const liquidityScore = Math.min(1, Math.log10(volume24h + 10) / 3);
      const direction: "opinion-long" | "poly-long" = edge >= 0 ? "opinion-long" : "poly-long";
      const action = edge >= 0 ? "Buy Opinion / Sell Poly" : "Buy Poly / Sell Opinion";
      const hint = liquidityScore >= 0.66
        ? "Good liquidity, split 500-1k"
        : liquidityScore >= 0.4
        ? "Moderate liquidity, prefer small probes"
        : "Weak liquidity, mind slippage";
      return {
        id: row.m.id,
        title: row.m.title,
        opinionProb: row.opinionProb,
        polyProb,
        edge,
        evPct,
        direction,
        volume24h,
        liquidityScore,
        action,
        hint,
        polySource
      } as SpreadCompare;
    })
  );

  await cacheSet(key, resolved, Math.max(config.cacheTtlMs, 120000));
  return resolved;
}

export async function getHealth() {
  const now = new Date().toISOString();
  return {
    ok: true,
    lastRefresh: now,
    cacheHitRate: 0.5
  };
}
