import type { VercelRequest, VercelResponse } from "@vercel/node";
import { fetchUpstream, methodNotAllowed, badRequest } from "../_lib/upstream";
import { cacheGet, cacheSet } from "../_lib/cache";

const TTL = 60; // seconds

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);
  const tokenId = req.query.tokenId;
  if (!tokenId) return badRequest(res, "tokenId is required");
  try {
    const params = new URLSearchParams();
    if (req.query.interval) params.set("interval", String(req.query.interval));
    if (req.query.limit) params.set("limit", String(req.query.limit));
    const qs = params.toString() ? `?${params.toString()}` : "";
    const key = `history:${tokenId}:${qs}`;
    const cached = await cacheGet(key);
    if (cached) return res.status(200).json(cached);
    const data = await fetchUpstream(`/history/${encodeURIComponent(String(tokenId))}${qs}`);
    cacheSet(key, data, TTL).catch(() => {});
    res.status(200).json(data);
  } catch (err: any) {
    res.status(502).json({ error: err.message || "Upstream error" });
  }
}
