import Redis from "ioredis";
import { config } from "./config";

const redis = new Redis(config.redisUrl);
const memory = new Map<string, { value: unknown; expires: number }>();

export async function cacheGet<T>(key: string): Promise<T | null> {
  const hit = await redis.get(key).catch((err) => {
    console.error("redis get", err);
    return null;
  });
  if (hit) return JSON.parse(hit) as T;
  const mem = memory.get(key);
  if (mem && mem.expires > Date.now()) return mem.value as T;
  return null;
}

export async function cacheSet(key: string, value: unknown, ttlMs: number) {
  const payload = JSON.stringify(value);
  await redis.set(key, payload, "PX", ttlMs).catch((err) => console.error("redis set", err));
  memory.set(key, { value, expires: Date.now() + ttlMs });
}
