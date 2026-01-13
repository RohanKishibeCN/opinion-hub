import express from "express";
import cors from "cors";
import router from "./routes";
import { config } from "./config";

const app = express();
app.use(cors());
app.use(express.json());

const buckets = new Map<string, { count: number; reset: number }>();
app.use((req, res, next) => {
  const now = Date.now();
  const key = (req.headers["x-forwarded-for"] as string) || req.ip || "unknown";
  const bucket = buckets.get(key);
  if (bucket && now < bucket.reset) {
    if (bucket.count >= config.rateLimitMax) {
      res.status(429).json({ error: "rate limit" });
      return;
    }
    buckets.set(key, { count: bucket.count + 1, reset: bucket.reset });
  } else {
    buckets.set(key, { count: 1, reset: now + config.rateLimitWindowMs });
  }
  next();
});

app.use((req, res, next) => {
  if (!config.apiToken) {
    next();
    return;
  }
  const token = (req.headers["x-api-key"] as string) || "";
  if (token !== config.apiToken) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  next();
});

app.use("/api", router);

app.listen(config.apiPort, "0.0.0.0", () => {
  console.log(`API listening on ${config.apiPort}`);
});
