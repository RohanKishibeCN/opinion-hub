import type { VercelRequest, VercelResponse } from "@vercel/node";
import { methodNotAllowed } from "../_lib/upstream";
import { addAlert, kvReady, listAlerts, parseAlertPayload } from "../_lib/alerts";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!kvReady()) {
    return res.status(503).json({ error: "KV not configured" });
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
    if (!parsed.ok) return res.status(400).json({ error: parsed.message });
    try {
      const rule = await addAlert(parsed.data);
      return res.status(200).json({ ok: true, rule });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || "Failed to save alert" });
    }
  }

  return methodNotAllowed(res, ["GET", "POST"]);
}
