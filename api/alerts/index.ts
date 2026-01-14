import type { VercelRequest, VercelResponse } from "@vercel/node";
import { methodNotAllowed } from "../_lib/upstream";
import { addAlert, redisReady, listAlerts, parseAlertPayload } from "../_lib/alerts";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!redisReady()) {
    return res.status(503).json({ error: "Redis not configured" });
  }

  if (req.method === "GET") {
    try {
      const data = await listAlerts();
      return res.status(200).json(data);
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || "Failed to list alerts" });
    }
  }

  if (req.method === "POST") {
    const parsed = parseAlertPayload(req.body);
    if (!parsed.ok) {
      const message = "message" in parsed && typeof parsed.message === "string" ? parsed.message : "Invalid alert payload";
      return res.status(400).json({ error: message });
    }
    try {
      const rule = await addAlert(parsed.data);
      return res.status(200).json({ ok: true, rule });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || "Failed to save alert" });
    }
  }

  return methodNotAllowed(res, ["GET", "POST"]);
}
