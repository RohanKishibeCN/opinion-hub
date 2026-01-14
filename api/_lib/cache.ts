import { kv } from "@vercel/kv";

const hasKv = Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

export async function cacheGet<T = any>(key: string): Promise<T | null> {
  if (!hasKv) return null;
  try {
    return (await kv.get<T>(key)) ?? null;
  } catch (err) {
    console.warn("KV get failed", err);
    return null;
  }
}

export async function cacheSet<T = any>(key: string, value: T, ttlSeconds = 60): Promise<void> {
  if (!hasKv) return;
  try {
    await kv.set(key, value, { ex: ttlSeconds });
  } catch (err) {
    console.warn("KV set failed", err);
  }
}
