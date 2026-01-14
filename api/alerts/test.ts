import type { VercelRequest, VercelResponse } from "@vercel/node";
import { methodNotAllowed } from "../_lib/upstream";

const DEFAULT_WEBHOOK = process.env.DISCORD_WEBHOOK || "";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);
  const { webhook, title, message } = req.body || {};
  const target = typeof webhook === "string" && webhook.length > 0 ? webhook : DEFAULT_WEBHOOK;
  if (!target) return res.status(400).json({ error: "Missing webhook" });

  const text = message || `Test alert: ${title || "Opinion Hub"}`;
  try {
    await fetch(target, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: text })
    });
    res.status(200).json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Webhook failed" });
  }
}
