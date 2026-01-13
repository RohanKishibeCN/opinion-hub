import { Router } from "express";
import { getHealth, getMarkets, getOrderbook, getHistory, getStrategySignals, getSpreadCompare } from "./opinionClient";
import { addAlert, getAlerts } from "./alertStore";
import { randomUUID } from "crypto";
import { config } from "./config";

const router = Router();

router.get("/health", (_req, res) => {
  getHealth()
    .then((data) => res.json(data))
    .catch((err) => {
      console.error(err);
      res.status(500).json({ ok: false });
    });
});

router.get("/markets", (req, res) => {
  const q = typeof req.query.q === "string" ? req.query.q : undefined;
  getMarkets(q)
    .then((data) => res.json(data))
    .catch((err) => {
      console.error(err);
      res.status(502).json({ error: "upstream" });
    });
});

router.get("/orderbook/:tokenId", (req, res) => {
  const tokenId = req.params.tokenId;
  if (!tokenId) {
    res.status(400).json({ error: "missing tokenId" });
    return;
  }
  getOrderbook(tokenId)
    .then((data) => res.json(data))
    .catch((err) => {
      console.error(err);
      res.status(502).json({ error: "orderbook upstream" });
    });
});

router.get("/history/:tokenId", (req, res) => {
  const tokenId = req.params.tokenId;
  if (!tokenId) {
    res.status(400).json({ error: "missing tokenId" });
    return;
  }
  const interval = typeof req.query.interval === "string" ? req.query.interval : undefined;
  const limitRaw = typeof req.query.limit === "string" ? Number(req.query.limit) : undefined;
  const limit = typeof limitRaw === "number" && !Number.isNaN(limitRaw) ? limitRaw : undefined;
  getHistory(tokenId, { interval, limit })
    .then((data) => res.json(data))
    .catch((err) => {
      console.error(err);
      res.status(502).json({ error: "history upstream" });
    });
});

router.get("/strategy/signals", (_req, res) => {
  getStrategySignals()
    .then((data) => res.json(data))
    .catch((err) => {
      console.error(err);
      res.status(502).json({ error: "strategy upstream" });
    });
});

router.get("/strategy/spreads", (_req, res) => {
  getSpreadCompare()
    .then((data) => res.json(data))
    .catch((err) => {
      console.error(err);
      res.status(502).json({ error: "spread upstream" });
    });
});

router.get("/alerts", (_req, res) => {
  getAlerts()
    .then((data) => res.json(data))
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: "alerts" });
    });
});

router.post("/alerts", (req, res) => {
  const { marketId, title, direction, threshold, webhook, cooldownMinutes } = req.body || {};
  const okMarket = typeof marketId === "string" && marketId.trim().length > 0;
  const okTitle = typeof title === "string" && title.trim().length > 0;
  const okDir = direction === "above" || direction === "below";
  const okNum = typeof threshold === "number" && threshold >= 0 && threshold <= 1;
  const okCooldown = cooldownMinutes === undefined || (typeof cooldownMinutes === "number" && cooldownMinutes >= 1 && cooldownMinutes <= 1440);
  if (!(okMarket && okTitle && okDir && okNum && okCooldown)) {
    res.status(400).json({ error: "invalid" });
    return;
  }
  const rule = {
    id: randomUUID(),
    marketId,
    title,
    direction,
    threshold,
    webhook,
    cooldownMinutes: cooldownMinutes ?? 30,
    lastTriggered: undefined
  };
  addAlert(rule)
    .then(() => res.json({ ok: true, rule }))
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: "alert save" });
    });
});

router.post("/alerts/test", (req, res) => {
  const { webhook, title, message } = req.body || {};
  const target = typeof webhook === "string" && webhook.length > 0 ? webhook : config.discordWebhook;
  if (!target) {
    res.status(400).json({ error: "missing webhook" });
    return;
  }
  const text = message || `Test alert: ${title || "Opinion Hub"}`;
  fetch(target, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: text })
  })
    .then(() => res.json({ ok: true }))
    .catch((err) => {
      console.error("test alert", err);
      res.status(500).json({ error: "test failed" });
    });
});

router.post("/submit", (req, res) => {
  const { title, category, sentiment, threshold } = req.body || {};
  const ok = title && category && sentiment;
  if (!ok) {
    res.status(400).json({ error: "invalid" });
    return;
  }
  console.log("submit", { title, category, sentiment, threshold });
  res.json({ ok: true });
});

export default router;
