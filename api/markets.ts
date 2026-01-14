import type { VercelRequest, VercelResponse } from "@vercel/node";
import { fetchUpstream, methodNotAllowed } from "./_lib/upstream";
import { cacheGet, cacheSet } from "./_lib/cache";

const TTL = 20; // seconds

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);
  try {
    const q = req.query.q ? `?q=${encodeURIComponent(String(req.query.q))}` : "";
    const key = `markets${q}`;
    const cached = await cacheGet(key);
    if (cached) return res.status(200).json(cached);
    const data = await fetchUpstream(`/markets${q}`);
    cacheSet(key, data, TTL).catch(() => {});
    res.status(200).json(data);
  } catch (err: any) {
    res.status(502).json({ error: err.message || "Upstream error" });
  }
}
