import { getMarkets, getOrderbook, getHistory, Market } from "./opinionClient";
import { config } from "./config";
import { getAlerts, markTriggered } from "./alertStore";

function warmMarket(m: Market) {
  if (!m || !m.id) return;
  Promise.all([getOrderbook(m.id), getHistory(m.id)])
    .then(() => console.log("worker prewarmed", m.id))
    .catch((err) => console.error("worker prewarm", err));
}

function sendWebhook(url: string, text: string) {
  if (!url) return Promise.resolve();
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: text })
  }).catch((err) => console.error("webhook", err));
}

function evaluateAlerts(markets: Market[]) {
  const now = Date.now();
  getAlerts()
    .then((alerts) => {
      alerts.forEach((rule) => {
        const market = markets.find((m) => m.id === rule.marketId);
        if (!market) return;
        const prob = market.probability || 0.5;
        const hit = rule.direction === "above" ? prob >= rule.threshold : prob <= rule.threshold;
        const cooldownMin = rule.cooldownMinutes ?? 30;
        const last = rule.lastTriggered ? new Date(rule.lastTriggered).getTime() : 0;
        const cooled = now - last >= cooldownMin * 60 * 1000;
        if (hit && cooled) {
          const msg = `🚨 ${market.title} ${rule.direction === "above" ? "≥" : "≤"} ${Math.round(rule.threshold * 100)}% · Current ${Math.round(prob * 100)}% \nView: http://43.159.63.122/`;
          const webhook = rule.webhook || config.discordWebhook;
          markTriggered(rule.id).catch((err) => console.error("alert mark", err));
          sendWebhook(webhook, msg);
          console.log("alert hit", rule.id, msg);
        }
      });
    })
    .catch((err) => console.error("alerts check", err));
}

function tick() {
  getMarkets()
    .then((markets) => {
      const top = (markets || []).slice(0, 3);
      top.forEach((m) => warmMarket(m));
      evaluateAlerts(markets || []);
      console.log("worker refreshed markets", top.length, new Date().toISOString());
    })
    .catch((err) => console.error("worker error", err));
}

setInterval(tick, config.refreshMs);
tick();
