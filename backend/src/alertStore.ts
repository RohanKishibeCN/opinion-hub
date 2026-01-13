import Redis from "ioredis";
import { config } from "./config";

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

const redis = new Redis(config.redisUrl);
const ALERT_KEY = "alerts:list";

function nowIso() {
  return new Date().toISOString();
}

export async function getAlerts(): Promise<AlertRule[]> {
  return redis
    .get(ALERT_KEY)
    .then((raw) => (raw ? (JSON.parse(raw) as AlertRule[]) : []))
    .catch((err) => {
      console.error("alerts:get", err);
      return [];
    });
}

export async function saveAlerts(list: AlertRule[]) {
  const payload = JSON.stringify(list);
  return redis.set(ALERT_KEY, payload).catch((err) => console.error("alerts:save", err));
}

export async function addAlert(rule: AlertRule) {
  return getAlerts()
    .then((list) => {
      const merged = [...list.filter((x) => x.id !== rule.id), rule];
      return saveAlerts(merged);
    })
    .catch((err) => console.error("alerts:add", err));
}

export async function markTriggered(id: string) {
  return getAlerts()
    .then((list) => {
      const next = list.map((x) => (x.id === id ? { ...x, lastTriggered: nowIso() } : x));
      return saveAlerts(next);
    })
    .catch((err) => console.error("alerts:mark", err));
}
