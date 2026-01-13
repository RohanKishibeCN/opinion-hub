## Opinion Hub
A lightweight, data-dense prediction/markets dashboard (retro/modern skin). Online deployment lives on cloud server `43.159.63.122`, latest code at `/root/Prediction-AI_20260113181942`.

### Features
- **Overview**: Hot markets list with probability/sentiment/updated time, search + category filters.
- **Depth**: Orderbook depth waterfall and slippage; pixel-progress fallback when upstream has no liquidity.
- **Strategy**: Opinion vs Polymarket spread table with EV highlight and direction hints.
- **Alerts**: Discord webhook alerts with cooldown and one-click “Send test to Discord”.
- **Internationalization**: English/Chinese toggle (default English); mobile-friendly layout.

### Stack
- **Frontend**: React + TypeScript + Vite + SWR + Recharts; Tailwind with custom retro styling.
- **Backend**: Node + Express + TypeScript.
- **Deploy**: Docker Compose (web/api/worker/proxy/redis) with Nginx reverse proxy.

### Project layout
- `frontend/`: React app and Vite config.
- `backend/`: API, worker, routes.
- `deploy/`: `docker-compose.yml`, `Dockerfile.web` / `Dockerfile.api` / `Dockerfile.proxy`.
- `.env.example`: environment sample (keep real secrets out of git).

### Local development
1) Install deps
   - Frontend: `cd frontend && npm install`
   - Backend: `cd backend && npm install`
2) Configure env
   - Copy `.env.example` to `.env` (or `.env.local`), set at least:
     - `VITE_API_BASE` (local: `http://localhost:4000`)
     - `OPINION_API_KEY` (real key)
     - `REDIS_URL` (local: `redis://localhost:6379`)
     - `DISCORD_WEBHOOK` (optional for alerts)
3) Run
   - Backend: `cd backend && npm run build && npm start` (4000)
   - Frontend: `cd frontend && npm run dev` (5173, ensure `VITE_API_BASE` matches backend)

### Docker deploy (same as online)
- From repo root: `docker compose -f deploy/docker-compose.yml up -d --build`
- Prepare `.env.production` (not committed) with `VITE_API_BASE`, `OPINION_API_KEY`, `DISCORD_WEBHOOK`, etc.
- Web served on port 80 via Nginx; internal web runs on 3000.

### GitHub hygiene
- `.gitignore` already ignores `node_modules/`, `dist/`, `.env*` (incl. `.env.production`), `.codebuddy`, editor files, logs.
- Never commit real secrets; rely on `.env.example` for documentation.

### Ops quick checks
- `docker compose -f deploy/docker-compose.yml ps` — container health
- `curl -s http://127.0.0.1/api/health` — health & cache stats
- `docker logs --tail 200 deploy-worker-1` — upstream fetch & alert pushes
