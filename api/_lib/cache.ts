import { Redis } from "@upstash/redis";

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
export const redisClient = redisUrl && redisToken ? new Redis({ url: redisUrl, token: redisToken }) : null;
const hasRedis = Boolean(redisClient);

export async function cacheGet<T = any>(key: string): Promise<T | null> {
  if (!hasRedis || !redisClient) return null;
  try {
    return (await redisClient.get<T>(key)) ?? null;
  } catch (err) {
    console.warn("Redis get failed", err);
    return null;
  }
}

export async function cacheSet<T = any>(key: string, value: T, ttlSeconds = 60): Promise<void> {
  if (!hasRedis || !redisClient) return;
  try {
    await redisClient.set(key, value, { ex: ttlSeconds });
  } catch (err) {
    console.warn("Redis set failed", err);
  }
}
