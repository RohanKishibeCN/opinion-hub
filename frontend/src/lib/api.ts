import axios from "axios";
import useSWR from "swr";
import { OpinionItem, ApiHealth, Orderbook, HistoryPoint, StrategySignal, SpreadCompare } from "../types";

const apiBase = (import.meta.env.VITE_API_BASE || "").replace(/\/$/, "");

const withBase = (path: string) => `${apiBase}${path}` || path;
const fetcher = (url: string) => axios.get(url).then((r) => r.data);

export const useOpinions = (query: string) => {
  const params = query ? `?q=${encodeURIComponent(query)}` : "";
  return useSWR<OpinionItem[]>(withBase(`/api/markets${params}`), fetcher, {
    refreshInterval: 20000,
    dedupingInterval: 10000
  });
};

export const useOrderbook = (tokenId?: string) => {
  return useSWR<Orderbook>(tokenId ? withBase(`/api/orderbook/${tokenId}`) : null, fetcher, {
    refreshInterval: 12000,
    dedupingInterval: 8000
  });
};

export const useHistory = (tokenId?: string, opts?: { interval?: string; limit?: number }) => {
  const query: Record<string, string> = {};
  if (opts?.interval) query.interval = opts.interval;
  if (opts?.limit) query.limit = String(opts.limit);
  const qs = Object.keys(query).length ? `?${new URLSearchParams(query).toString()}` : "";
  return useSWR<HistoryPoint[]>(tokenId ? withBase(`/api/history/${tokenId}${qs}`) : null, fetcher, {
    refreshInterval: 5 * 60 * 1000,
    dedupingInterval: 60 * 1000
  });
};

export const useStrategySignals = () => {
  return useSWR<StrategySignal[]>(withBase(`/api/strategy/signals`), fetcher, {
    refreshInterval: 45000,
    dedupingInterval: 20000
  });
};

export const useSpreadCompare = () => {
  return useSWR<SpreadCompare[]>(withBase(`/api/strategy/spreads`), fetcher, {
    refreshInterval: 45000,
    dedupingInterval: 20000
  });
};

export const useAlerts = () => {
  return useSWR<AlertRule[]>(withBase(`/api/alerts`), fetcher, {
    refreshInterval: 45000,
    dedupingInterval: 20000
  });
};

export const createAlert = (payload: { marketId: string; title: string; direction: "above" | "below"; threshold: number; webhook?: string; cooldownMinutes?: number }) => {
  return axios.post(withBase(`/api/alerts`), payload).then((r) => r.data);
};

export const testAlert = (payload: { webhook?: string; title?: string; message?: string }) => {
  return axios.post(withBase(`/api/alerts/test`), payload).then((r) => r.data);
};

export const useHealth = () => {
  return useSWR<ApiHealth>(withBase(`/api/health`), fetcher, {
    refreshInterval: 30000,
    dedupingInterval: 15000
  });
};

export const submitOpinion = (payload: { title: string; category: string; sentiment: string; threshold: number }) => {
  return axios.post(withBase(`/api/submit`), payload).then((r) => r.data);
};
