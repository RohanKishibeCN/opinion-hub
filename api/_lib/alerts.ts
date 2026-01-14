import { randomUUID } from "crypto";
import { redisClient } from "./cache";

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

export type AlertPayload = Omit<AlertRule, "id" | "lastTriggered">;

const ALERT_KEY = "alerts:list";
const hasRedis = Boolean(redisClient);

function nowIso() {
  return new Date().toISOString();
}

export function redisReady() {
  return hasRedis;
}

export function parseAlertPayload(body: any): { ok: true; data: AlertPayload } | { ok: false; message: string } {
  const { marketId, title, direction, threshold, webhook, cooldownMinutes } = body || {};
  const okMarket = typeof marketId === "string" && marketId.trim().length > 0;
  const okTitle = typeof title === "string" && title.trim().length > 0;
  const okDir = direction === "above" || direction === "below";
  const okNum = typeof threshold === "number" && threshold >= 0 && threshold <= 1;
  const okCooldown =
    cooldownMinutes === undefined || (typeof cooldownMinutes === "number" && cooldownMinutes >= 1 && cooldownMinutes <= 1440);

  if (!(okMarket && okTitle && okDir && okNum && okCooldown)) {
    return { ok: false, message: "Invalid alert payload" };
  }

  return {
    ok: true,
    data: {
      marketId,
      title,
      direction,
      threshold,
      webhook,
      cooldownMinutes: cooldownMinutes ?? 30
    }
  };
}

export async function listAlerts(): Promise<AlertRule[]> {
  if (!hasRedis || !redisClient) return [];
  try {
    return (await redisClient.get<AlertRule[]>(ALERT_KEY)) ?? [];
  } catch (err) {
    console.warn("alerts:list", err);
    return [];
  }
}

async function saveAlerts(list: AlertRule[]) {
  if (!hasRedis || !redisClient) throw new Error("Redis not configured");
  await redisClient.set(ALERT_KEY, list);
}

export async function addAlert(input: AlertPayload): Promise<AlertRule> {
  if (!hasRedis || !redisClient) throw new Error("Redis not configured");
  const next: AlertRule = {
    ...input,
    id: randomUUID(),
    lastTriggered: undefined,
    cooldownMinutes: input.cooldownMinutes ?? 30
  };
  const existing = await listAlerts();
  const merged = [...existing.filter((x) => x.id !== next.id), next];
  await saveAlerts(merged);
  return next;
}

export async function markTriggered(id: string) {
  if (!hasRedis || !redisClient) return;
  const list = await listAlerts();
  const updated = list.map((item) => (item.id === id ? { ...item, lastTriggered: nowIso() } : item));
  await saveAlerts(updated);
}
