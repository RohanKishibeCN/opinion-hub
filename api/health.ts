import type { VercelRequest, VercelResponse } from "@vercel/node";
import { fetchUpstream, methodNotAllowed } from "./_lib/upstream";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);
  try {
    const data = await fetchUpstream(`/health`);
    res.status(200).json(data);
  } catch (err: any) {
    res.status(502).json({ error: err.message || "Upstream error" });
  }
}
