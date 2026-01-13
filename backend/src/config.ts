export const config = {
  apiPort: Number(process.env.PORT_API || 4000),
  opinionKey: process.env.OPINION_API_KEY || "",
  opinionBase: process.env.OPINION_API_BASE || "https://proxy.opinion.trade:8443/openapi",
  redisUrl: process.env.REDIS_URL || "redis://redis:6379",
  refreshMs: Number(process.env.REFRESH_INTERVAL_MS || 30000),
  cacheTtlMs: Number(process.env.CACHE_TTL_MS || 60000),
  apiToken: process.env.API_TOKEN || "",
  rateLimitWindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60000),
  rateLimitMax: Number(process.env.RATE_LIMIT_MAX || 120),
  discordWebhook: process.env.DISCORD_WEBHOOK || ""
};
