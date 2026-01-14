# Opinion Hub (Vercel-ready)

English-only retro-styled markets dashboard. Frontend is Vite (React + Tailwind). Backend endpoints are now serverless-friendly under `/api` (Vercel Functions), currently proxying to the existing upstream while keeping the new URL surface.

## Structure
- `frontend/`: Vite app (`npm run dev` inside frontend)
- `api/`: Vercel Functions (health, markets, history, orderbook, strategy, alerts, submit placeholder)
- `vercel.json`: Vercel build config (builds frontend, uses Node 18 for functions)
- `package.json`: Root scripts for Vercel/CI

## Local dev
```bash
npm install           # installs root deps (@vercel/node, typescript)
npm --prefix frontend install
npm --prefix frontend run dev
```

## Build
```bash
npm --prefix frontend run build
```

## Deploy to Vercel
- Connect repo to Vercel.
- Build Command: `npm --prefix frontend install && npm --prefix frontend run build`
- Output Directory: `frontend/dist`
- Functions runtime: Node 18 (configured in vercel.json)
- Default API base (frontend): `/api`

## Environment variables
- `UPSTREAM_BASE` (optional): Upstream REST base for proxying (default `http://43.159.63.122/api`). Set this in Vercel to your desired backend source.
- `KV_REST_API_URL`, `KV_REST_API_TOKEN` (**required for alerts**): Vercel KV is used for alerts storage and response caching. Without these, `/api/alerts` and `/api/cron` will return 503.
- `DISCORD_WEBHOOK` (optional): Default webhook fallback when an alert rule omits its own webhook and for `/api/alerts/test`.
- `SITE_URL` (optional): Link used in alert notifications; defaults to `https://opinionhub.vercel.app`.

## API surface (proxy to upstream unless noted)
- `GET /api/health`
- `GET /api/markets?q=...`
- `GET /api/history/:tokenId?interval=5m&limit=200`
- `GET /api/orderbook/:tokenId`
- `GET /api/strategy/spreads`
- `GET /api/strategy/signals`
- `GET /api/alerts` (served from Vercel KV)
- `POST /api/alerts` (served from Vercel KV)
- `POST /api/alerts/test` (direct webhook send)
- `POST /api/submit` (placeholder 202)
- `GET /api/cron` (internal/scheduled warmup + alert checks)

## Notes
- Redis is not used in this Vercel-ready cut; alerts now live in Vercel KV.
- Vercel Cron (configured for every 10 minutes) calls `/api/cron` to warm caches and evaluate alerts.
