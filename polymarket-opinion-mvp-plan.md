# Polymarket × Opinion 24h 套利机器人 —— 迭代建设方案

> **约束复述**：所有可执行代码继续在本地仓库生成，但一切工具、插件、依赖缓存、数据库与运行时数据都必须部署/持久化在云服务器（新加坡 Zone 1，实例 `lhins-qv8mnmff`）或其挂载的云服务中，禁止落盘到本地硬盘。

## 0. 现状速写（MVP 已交付）
- **后端**：FastAPI + Uvicorn，内置模拟价差计算、风险参数、日志接口，并以 Docker 形式部署在云服务器，端口 `80 -> 8000`。
- **前端**：Vite + React + Tailwind 的单页仪表，展示运行状态、风险阈值、机会表与日志条。
- **任务循环**：`simulate_polling` 定期刷新机会与日志，未来将被真实行情采集替换。
- **部署链路**：`Dockerfile` 构建多阶段镜像，`arb-bot` 容器以 `--restart unless-stopped` 常驻。已具备 `/`, `/web`, `/api/*`, `/health`。

## 1. 迭代愿景
1. **数据真实性**：替换模拟数据为 Polymarket + Opinion 实盘行情、订单簿、成交、费率等，并保证速率限制与鉴权安全。
2. **策略执行闭环**：实现价差发现 → 风险校验 → 下单/撤单 → 结果追踪的最小闭环，初期可“半自动”（人工确认）模式。
3. **持续运营能力**：提供前端可视化、告警、审计日志、参数热更新以及一键回滚/重启能力。
4. **云优先**：所有新依赖（Redis、队列、对象存储、监控代理）均在云服务器或其同地域托管资源中部署，避免本地任何持久化。

## 2. 阶段化路线

### Phase 1 —— 真实行情与缓存基建（目标：T+1）
**后端**
- 实装 Polymarket GraphQL + Opinion REST 客户端，云端 `.env` 通过 Docker secrets/环境变量注入。
- 新建 `asyncio` 调度器：分模块拉取市场列表、盘口、成交，落缓存。
- 引入云端 Redis（同实例或外部托管）保存快照 + 节流锁；若同机安装，使用 Docker Compose 方式放云端。
- 新建 `/api/markets`、`/api/book/{id}` 供前端调试。

**前端**
- 扩展仪表：增加“数据健康”卡片，显示采集延迟、请求成功率、速率限制命中次数。

**云/运维**
- 在实例上以 Docker 方式运行 Redis；通过 `docker network` 将 API 容器与 Redis 容器隔离。
- 追加 `docker-compose.yml`（仅在云端存储）以便运维统一拉起。

### Phase 2 —— 策略 & 风控升级（目标：T+2）
**策略内核**
- 编写 `SpreadDetector`：根据盘口价、费用、Gas/手续费，输出净收益 bps。
- `RiskEngine`：限额、黑白名单、资金占用、频控（最小间隔/批次额度）。
- `OpportunityStore`：将实时机会写入 Redis Sorted Set，并打上 TTL。

**执行链路**
- 先实现“人工确认”模式：风险通过后将机会推送到待确认列表，前端允许标记“执行/忽略”。
- `/api/action/approve`、`/api/action/reject` 仅写入云端 Postgres/SQLite（运行在服务器上，采用 Docker 卷存储在云盘）。

**前端**
- 新增“待执行队列”表格，允许筛选 + 操作。
- 增强告警条：推送风控拒单、API 错误等。

### Phase 3 —— 半自动下单与监控（目标：T+3）
**后端**
- 集成 Polymarket、Opinion 的下单/撤单 API（仍保持 Dry-run 旗标）。
- `ExecutionWorker`：消费“已确认”机会，通过实际 API 或模拟接口执行，并写回执行状态。
- 增加 Prometheus 格式的 `/metrics` 端点，提供轮询耗时、API 成功率、机会数量等指标。

**前端**
- 扩展状态页：展示执行流水、盈亏估算、各平台仓位占用。
- 嵌入基础图表（折线/柱状）显示 24h Spread、执行结果。

**运维**
- 在云服务器部署 node_exporter + prometheus（Docker），Grafana 选择云端 SaaS 或同机容器。
- 告警：配置 Prometheus Alertmanager 或外部 Webhook（钉钉/Slack）。

### Phase 4 —— 全自动与治理（目标：T+4）
- 切换至自动执行模式（可配置“安全窗口”和“最大敞口”）。
- 增加策略配置中心：支持通过前端更新阈值、黑名单、资金上限，变更写入云端 DB。
- 制定审计日志方案：重要操作写入 Append-only Log（可放对象存储或远端 DB）。
- 考虑多实例部署：若吞吐增长，可在云服务器上使用 Docker Swarm/Kubernetes（如 TKE）或扩容第二台轻量实例承担前端/CDN。

## 3. 详细交付清单
| 领域 | 交付物 | 关键说明 |
| --- | --- | --- |
| 数据采集 | `ingestion/polymarket.py`, `ingestion/opinion.py` | 全部部署在云端容器；凭证以环境变量注入，严禁写入仓库 |
| 缓存/队列 | `docker-compose.redis.yml` + Redis 配置 | 文件存 Git，但数据卷挂载服务器磁盘；提供冷热备策略 |
| 风控 | `core/risk.py` | 提供限额/黑白名单/频控；所有状态数据落云端 DB/Redis |
| 策略 | `core/spread.py` | 统一价差 + 成本计算，输出净利/权重 |
| 执行 | `services/execution.py` | Dry-run 与 real-run 统一接口，可配置 API endpoint |
| API | `/api/markets`, `/api/opportunities`, `/api/actions`, `/api/logs`, `/metrics` | FastAPI Router + Pydantic schema |
| 前端 | `src/sections/*` | 仪表卡、机会表、执行队列、日志、图表；全部消费云端 API |
| DevOps | `Dockerfile`, `docker-compose.yml`, `scripts/deploy.sh` | 构建在本地完成，镜像上传/运行在云端；脚本中写死服务器路径 |
| 监控 | Prometheus/Grafana/Alertmanager | 均以 Docker 部署在云端；配置文件可在仓库但敏感信息使用环境变量 |

## 4. 架构拓扑（目标阶段）
```
Browser -> Nginx(80) -> FastAPI (uvicorn)
                             |-> Redis (Docker, same host)
                             |-> Postgres/SQLite (Docker volume)
                             |-> External APIs (Polymarket/Opinion)
ExecutionWorker (async / celery-like) --shares codebase--> FastAPI container or separate worker container
Prometheus/Grafana stack -> monitors FastAPI & Worker via /metrics + docker stats
```

## 5. 部署与环境策略
1. **单一 `docker compose`**：在云服务器 `/root/arb-bot-compose`（云端目录）存放 `docker-compose.yml`，定义 `api`, `worker`, `redis`, `monitoring` 服务；所有数据卷（Redis dump、DB、Grafana storage）均挂载服务器云盘。
2. **配置管理**：
   - `.env.production` 仅保存在服务器（通过 `scp` 上传）；在仓库放 `.env.example` 供说明。
   - Secrets（API Keys、Webhook URL）写入 `/root/.arb-bot-secrets/`，由 compose `env_file` 引入。
3. **发布流程**：
   - 本地完成开发与单元测试 → `docker build` → 推送镜像到云端或直接 `scp` 项目到服务器。
   - 在服务器执行 `docker compose pull && docker compose up -d --build`。
   - 通过 `curl http://43.159.63.122/health` + 前端页面验证。
4. **备份与回滚**：
   - 机会/执行/日志若写入 SQLite，设置每日 `sqlitebackup.sh`（云端 cron）复制到 `/root/backups/` 并同步到对象存储（如 COS/S3）。
   - 镜像采用版本号 `arb-bot:v0.2.x`，保留上一版镜像，发生异常时 `docker compose rollback`。

## 6. 风险与缓解
- **API 速率限制**：实现自适应速率控制（令牌桶），超限时指数退避；在前端展示当前 RPS。
- **网络抖动**：在云服务器配置 `systemd` health check + `docker restart` policy；Prometheus 告警连续 3 次失败时短信/IM 提醒。
- **资金安全**：实盘前增加多级确认（参数审核、金额双签），并默认 dry-run。
- **云资源**：监控 CPU/Mem；若瓶颈，升级实例或拆分到第二台服务器，将 Redis/DB 独立出来。

## 7. 时间表（建议）
| 周次 | 目标 | 关键输出 |
| --- | --- | --- |
| Week 1 | 完成 Phase 1 | 真实行情采集 + Redis + 数据健康卡片 |
| Week 2 | 完成 Phase 2 | Spread/Risk 内核 + 待执行队列 + 人工确认 API |
| Week 3 | 完成 Phase 3 | 执行 Worker + Dry-run 下单 + Prometheus/Grafana |
| Week 4 | 完成 Phase 4 | 自动模式 + 配置中心 + 审计/备份 |

---
该方案已覆盖后续迭代的功能、技术、运维与云端限制。后续若需要更细的任务拆分，可直接在本文件下追加子章节，或根据上述阶段在任务系统中建立对应 Sprint。

## 8. Polymarket 文档洞察
- **速率限制**：《Rate Limits》明确了 CLOB/行情/交易多档限制：如通用 CLOB 9,000 次/10s、`/book`/`/price` 1,500 次/10s、交易写请求（`POST /order`）突发 3,500 次/10s 且持续窗 36,000 次/10min。方案需在客户端以令牌桶 + Cloudflare 排队提示结合实现，并把剩余额度暴露到仪表。
- **双层鉴权**：`Authentication` 章节要求先用 L1(EIP-712) 生成/恢复 API key，再用 L2(HMAC) 对每次请求签名，Headers 需包含 `POLY_ADDRESS/POLY_SIGNATURE/POLY_TIMESTAMP/POLY_API_KEY/POLY_PASSPHRASE`。部署时必须把私钥、API secret 写入云端 secrets；本地仓库只放接口定义。
- **下单协议**：`create-order` 需提交 `{ orderType, order }`，`order` 内含 salt、maker/taker、tokenId、makerAmount、takerAmount、expiration、nonce、feeRateBps、side、signatureType、signature 等字段，全部由客户端提前签名，Relayer 再执行撮合或入簿。我们的 `services/execution.py` 需映射这些字段并将签名逻辑托管至云端 HSM/密钥服务。
- **WebSocket**：`WSS Overview` 说明 USER 与 MARKET 频道订阅差异，订阅消息需带 `auth` 块（API key + timestamp + signature），并在断线后快速重连 + 重发订阅。`simulate_polling` 将逐步替换为真实 WSS 流，并为每个 condition/token 维护本地快照及心跳监控。
- **附加资源**：Builder Profile/Signing Server/Relayer Client 文档要求登记 Builder ID、Order Attribution header；`RTDS`/`Gamma` 提供额外行情、评论与体育市场元数据，可在 Phase 2 作为补充信号源。

## 9. Opinion 文档洞察
- **Open API**：采用 OAuth2 Client Credentials，`Authorization: Bearer <token>`，默认速率 60 req/min、突发 100 req/10s，并附 `X-RateLimit-*` 响应头。主要资源 `/api/v1/markets|tokens|positions|trades`，均带 `limit/offset` 分页。
- **CLOB SDK**：`@opinion/clob-sdk` 暴露 REST + WSS：`placeOrder/cancelOrder/getOrders` 与 `ws.subscribe('orderbook'|'trades'|'orders')`。初始化需提供 `network/apiKey/rpcUrl/wsUrl`，并内建自动重连、事件监听。可在 Phase 1 先以 SDK 获取盘口，再逐渐切换为我们自定义客户端以便统一风控。
- **架构 & 支持**：官方推荐通过 SDK 直接落单（签名由 SDK 处理），我们可在云端 worker 内加载 SDK，凭证同样写入 secrets。FAQ/Troubleshooting 指出了常见错误（精度、最小单位、订单被拒等），可映射到风控提示。

## 10. 方案与代码优化要点
### 10.1 客户端封装
- 后端新增 `backend/clients/polymarket.py` 与 `backend/clients/opinion.py`：分别管理 REST/HMAC、WebSocket、SDK 适配，并对外暴露统一 `fetch_order_book`, `fetch_markets`, `place_order`, `cancel_order` 接口。
- 抽象 `backend/core/signing.py`，封装 EIP-712 + HMAC 签名，调用时自动注入 Header，避免重复拼装。

### 10.2 速率限制与缓存策略
- 在 Redis 中维护各端点配额（如 `poly:quota:book`、`opinion:quota:trades`），并以脚本扣减/恢复，超限时自动降频或切换备用数据源。
- `simulate_polling` 替换为 `ingestion/poller.py`，支持 REST + WSS 双路输入，并将最近 N 档盘口/成交写入 Redis Sorted Set，供 `/api/markets`、前端图表读取。

### 10.3 执行链路强化
- `RiskEngine` 需引用文档要求检查：最小 tick-size、最小 size、GTD ≥ 当前时间+60s。未满足时在前端直接告警。
- `ExecutionWorker` 在实际 `POST /order` 前先调用 `/balance`、`/status` 确认账户可用余额、CLOB 状态；下单后监听 USER WSS 频道对账，失败时自动撤单或重提。
- Opinion 侧先走 SDK 的 `placeOrder`，并在 `orders` 频道监听执行反馈，把订单 ID 与我们的 opportunity ID 做映射。

### 10.4 前端与监控优化
- 仪表新增“Polymarket/Opinion rate limit”卡片、Builder Attribution、最新订单状态、WS 心跳状态。
- `/metrics` 暴露请求耗时、速率剩余额度、WS 重连次数，Prometheus + Grafana 用于生成 24h 运营视图。

## 11. 必要补充信息清单
1. **Polymarket**：Builder Profile ID、Order Attribution header、L1 私钥/签名方式、预期下单侧（FOK/FAK/GTC/GTD）、目标 condition/token 列表、可接受的费率/滑点、是否需要专用 Signing Server。
2. **Opinion**：API Key/Secret、OAuth clientId/clientSecret、可交易 marketId、允许的 quote/settlement token、对 SDK 的环境（mainnet/testnet）、WS 订阅偏好。
3. **Runbook**：当速率受限或 WSS 掉线时的业务策略（等待/降级/切换另一个平台）、告警联系人、手动干预流程。
4. **密钥/Secrets 管理**：在云服务器上准备 `.env.production` 或 secrets 文件夹的具体位置及权限策略。
5. **资金与风控参数**：单腿预算、最大并发订单数、黑白名单初始列表、人工确认流程（审批人、SLA）。

## 12. 当前进展与下一步（2025-12-22）
### 已完成
- 后端 FastAPI MVP：提供 `/`, `/web`, `/api/*`, `/health`，当前使用模拟价差/机会/日志数据，定时刷新。Docker 化部署完成，前端仪表可访问。
- 策略/风控初版：`SpreadDetector` 与 `RiskEngine` 已接入基础参数（maker/taker/slippage/min spread、黑白名单、单腿上限、并发上限、dry-run 开关）。
- 数据存储：SQLite 行为日志表与内存机会存储，支持 Redis 缓存占位（需要实际 Redis 实例）。
- 规划文档：分阶段路线与交付清单明确，云优先/密钥不落盘原则已记录。

### 待完成/下一步
- Polymarket 实盘接入：
  - 新增 `core/signing.py`（EIP-712 + HMAC 双层签名，支持 builder 归因头）。
  - 扩展 `clients/polymarket.py`：markets/book/trades 拉取 + 令牌桶限频 + Redis 缓存；占位 `place_order/cancel_order`（默认 dry-run）。
  - 环境注入：云端 `.env.production` 填入 `POLY_PRIVATE_KEY`、`POLY_PASSPHRASE`、`POLY_API_KEY`、`POLY_API_SECRET`，可选 `POLY_BUILDER_API_KEY/SECRET`。
- Opinion 接入：优先用 Python SDK 拉盘口/下单（dry-run），凭证走云端 secrets；若需 TS 版按 Open API 重写客户端。
- 采集与缓存：用 `ingestion/poller.py` 替换模拟轮询，持续写 Redis；前端 `/api/markets`、`/api/book/{id}` 读缓存。
- 风控增强：落地最小 tick/size、GTD >= now+60s、余额与 CLOB 状态探针；执行前二次校验。
- DevOps：云端 docker-compose 加入 redis/worker/monitoring，数据卷落云盘；`.env.example` 保留占位，不含密钥。

### 待确认
- Polymarket 交易密钥：`POLY_API_KEY`、`POLY_API_SECRET`（必需）；是否启用 builder 归因（提供 builder key/secret）。
- 下单模式与标的：偏好 GTC/GTD/FAK/FOK，目标 condition/token 列表、允许滑点/feeRateBps。
- Opinion 凭证与网络：apiKey/clientId/clientSecret、network(mainnet/testnet)、WS URL/订阅偏好。
- 资金参数：单腿预算、最大并发、初始黑/白名单、dry-run 是否保持。
