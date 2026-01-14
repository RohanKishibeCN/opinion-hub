import type { VercelRequest, VercelResponse } from "@vercel/node";
import { methodNotAllowed } from "./_lib/upstream";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return methodNotAllowed(res, ["POST"]);
  // Placeholder: this endpoint is not backed by upstream in the new architecture.
  // Accept payload and return 202 for compatibility.
  return res.status(202).json({ ok: true, message: "Submission accepted (placeholder)." });
}
