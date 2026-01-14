import type { VercelRequest, VercelResponse } from "@vercel/node";
import { fetchUpstream, methodNotAllowed } from "./_lib/upstream";
import { AlertRule, redisReady, listAlerts, markTriggered } from "./_lib/alerts";

const MAX_WARM_MARKETS = 3;
const siteUrl = process.env.SITE_URL || "https://opinionhub.vercel.app";
const fallbackWebhook = process.env.DISCORD_WEBHOOK || "";

function cleanProb(value: any) {
  const n = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(n)) return 0.5;
  return Math.min(1, Math.max(0, n));
}

async function sendWebhook(url: string, text: string) {
  if (!url) return false;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: text })
    });
    return true;
  } catch (err) {
    console.error("cron webhook", err);
    return false;
  }
}

function shouldTrigger(rule: AlertRule, prob: number, now: number) {
  const hit = rule.direction === "above" ? prob >= rule.threshold : prob <= rule.threshold;
  const cooldownMinutes = rule.cooldownMinutes ?? 30;
  const last = rule.lastTriggered ? Date.parse(rule.lastTriggered) : 0;
  const cooled = now - last >= cooldownMinutes * 60 * 1000;
  return { hit: hit && cooled, cooled, prob, last };
}

async function warmMarket(marketId: string) {
  await Promise.allSettled([
    fetchUpstream(`/orderbook/${marketId}`),
    fetchUpstream(`/history/${marketId}?interval=1h&limit=200`)
  ]);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return methodNotAllowed(res, ["GET"]);

  const summary = {
    ok: true,
    marketsWarmed: 0,
    strategyWarmed: 0,
    alertsEvaluated: 0,
    alertsTriggered: 0,
    errors: [] as string[]
  };

  let markets: any[] = [];
  try {
    const data = await fetchUpstream(`/markets`);
    markets = Array.isArray(data) ? data : [];
    summary.marketsWarmed = Math.min(markets.length, MAX_WARM_MARKETS);
  } catch (err: any) {
    summary.errors.push(`markets: ${err?.message || err}`);
  }

  if (markets.length > 0) {
    const top = markets.slice(0, MAX_WARM_MARKETS);
    await Promise.allSettled(top.map((m) => warmMarket(m.id)));
  }

  try {
    await Promise.allSettled([fetchUpstream(`/strategy/signals`), fetchUpstream(`/strategy/spreads`)]);
    summary.strategyWarmed = 2;
  } catch (err: any) {
    summary.errors.push(`strategy: ${err?.message || err}`);
  }

  if (redisReady()) {
    try {
      const alerts = await listAlerts();
      summary.alertsEvaluated = alerts.length;
      const now = Date.now();
      for (const rule of alerts) {
        const market = markets.find((m) => m.id === rule.marketId);
        if (!market) continue;
        const prob = cleanProb(market.probability ?? market.lastPrice ?? market.price ?? 0.5);
        const { hit } = shouldTrigger(rule, prob, now);
        if (!hit) continue;
        const targetWebhook = rule.webhook || fallbackWebhook;
        const text = `🚨 ${market.title} ${rule.direction === "above" ? "≥" : "≤"} ${Math.round(rule.threshold * 100)}% · Current ${Math.round(prob * 100)}%\nView: ${siteUrl}`;
        const delivered = await sendWebhook(targetWebhook, text);
        if (delivered || !targetWebhook) {
          await markTriggered(rule.id);
        }
        if (delivered) {
          summary.alertsTriggered += 1;
        }
      }
    } catch (err: any) {
      summary.errors.push(`alerts: ${err?.message || err}`);
    }
  }

  const status = summary.errors.length > 0 ? 207 : 200;
  return res.status(status).json(summary);
}
