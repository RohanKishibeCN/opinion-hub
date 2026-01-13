### Opinion Trade 综合分析 dApp 完整方案（Discord 版）

**项目名称**：**Opinion Analytics Hub**  
**描述**：一个一站式 Web dApp，提供 Opinion Trade 全市场数据可视化、历史分析、订单簿深度、概率警报（通过 Discord 推送）和跨平台套利扫描。纯前端 + 轻后端，MVP 聚焦读数据，无交易功能（后期可加）。目标：比官方界面更好用，成为预测市场玩家的日常工具。

**核心优势**：

- 整合 5 大功能（仪表盘、历史图表、订单簿可视化、警报、策略扫描）。
- 实时轮询（15-30s），数据准确。
- Discord 警报：用户设置 webhook，概率/价格变化时自动推送消息到 Discord 频道/DM。
- 跨平台 arb：对比 Polymarket，显示机会。

**技术栈（简单高效，便于 AI 生成代码）**

- **前端**：Next.js 14+ (App Router) + TypeScript
- **UI**：Tailwind CSS + Shadcn/UI (组件库：Button, Table, Tabs, Dialog, Input 等)
- **图表**：Recharts (轻量，适合线图/柱状) 或 react-chartjs-2
- **状态管理 & 数据**：SWR (自动轮询 + 缓存，完美避开 API 限速 15 req/s)
- **Discord 集成**：前端收集用户 Discord Webhook URL，后端用 Axios POST 发送消息（简单无 Bot Token）
- **后端**：Vercel Serverless Functions (API Routes) —— 处理警报检查 + Discord 发送（Cron-like 轮询）
- **存储**：Vercel KV (免费 Redis) 或 Upstash —— 存用户警报订阅（市场ID + 阈值 + webhook URL）
- **钱包（可选）**：wagmi + viem + WalletConnect (后期查看持仓)
- **其他库**：axios (API 调用), date-fns (时间格式), lodash (工具)
- **部署**：Vercel (一键，前后端一体)

**环境变量 (.env.local)**

```
OPINION_API_KEY=your_key_here
VERCEL_KV_URL=... (如果用 KV)
```

**项目结构（AI 生成代码时直接用这个文件夹结构）**

```
app/
  layout.tsx                  # 全局布局 (Navbar + Sidebar)
  page.tsx                    # 主页 - 仪表盘
  markets/
    [id]/
      page.tsx                # 市场详情页 (历史图表 + 订单簿)
  alerts/
    page.tsx                  # 警报管理页
  strategies/
    page.tsx                  # 套利策略页
components/
  MarketTable.tsx             # 市场列表表格
  ProbabilityChart.tsx        # 历史概率曲线
  OrderbookDepth.tsx          # 订单簿深度图
  AlertForm.tsx               # 订阅表单
  ArbOpportunityCard.tsx      # arb 机会卡片
lib/
  api.ts                      # 所有 Opinion API 调用函数
  polymarket.ts               # Polymarket GraphQL 查询
  discord.ts                  # 发送 Discord 消息函数
  utils.ts                    # 工具函数 (概率计算等)
server/
  cron-alerts.ts              # Vercel Cron Job: 每 5-10 min 检查警报并推送
```

**核心 API 调用（lib/api.ts，全局复用）**

```ts
const OPINION_BASE = 'https://api.opinion.trade';
const headers = { apikey: process.env.OPINION_API_KEY! };

export async function getMarkets(params = {}) {
  return fetch(`${OPINION_BASE}/market?status=active&limit=50${new URLSearchParams(params)}`, { headers }).then(r => r.json());
}

export async function getMarketDetail(id: string) {
  return fetch(`${OPINION_BASE}/market/${id}`, { headers }).then(r => r.json());
}

export async function getLatestPrice(tokenId: string) {
  return fetch(`${OPINION_BASE}/token/latest-price?tokenId=${tokenId}`, { headers }).then(r => r.json());
}

export async function getPriceHistory(tokenId: string, interval = '1h') {
  return fetch(`${OPINION_BASE}/token/price-history?tokenId=${tokenId}&interval=${interval}`, { headers }).then(r => r.json());
}

export async function getOrderbook(tokenId: string) {
  return fetch(`${OPINION_BASE}/token/orderbook?tokenId=${tokenId}`, { headers }).then(r => r.json());
}
```

**功能模块详细实现**

1. **仪表盘 (app/page.tsx)**
- 用 SWR 拉 `/market` 全列表。
- MarketTable 组件：列：标题、YES 概率 (price*100 + ‘%’)、24h volume、变化 % (对比昨日)。
- 支持排序 (volume 降序)、搜索 (fuse.js 客户端过滤)。
- 轮询：refreshInterval: 20000。
2. **市场详情页 (app/markets/[id]/page.tsx)**
- params.id 获取市场。
- Tabs：概览 | 历史图表 | 订单簿
- 历史图表：ProbabilityChart 用 getPriceHistory 绘制 YES/NO 双线 (Recharts LineChart)。
- 订单簿：OrderbookDepth 用柱状图 (bids 绿反转，asks 红)，显示前 20 档 + 滑点估算。
- 实时：两个独立 SWR，refreshInterval 10000-15000。
3. **警报管理 (app/alerts/page.tsx)**
- AlertForm：选择市场 (下拉从仪表盘缓存)、设置阈值 (YES > X% 或 变化 > Y%)、输入 Discord Webhook URL。
- 订阅列表：显示用户当前订阅 (从 KV 拉取，需简单 auth 如 localStorage userId)。
- 存储格式 (KV key: `alerts:${userId}`)：JSON array [{marketId, threshold, webhookUrl, lastTriggered}]。
4. **Discord 警报推送**
- 简单实现：用户提供 Webhook URL (https://discord.com/api/webhooks/… )。
- lib/discord.ts：
  
  ```ts
  export async function sendDiscordAlert(webhookUrl: string, message: string) {
    await axios.post(webhookUrl, { content: message });
  }
  ```
- 后台检查：server/cron-alerts.ts (Vercel Cron，每 5-10 min 运行)：
  - 拉所有订阅 (KV scan)。
  - 对每个：拉最新价格，比较阈值。
  - 命中：调用 sendDiscordAlert，消息如：
    
    ```
    🚨 Opinion Alert: [市场标题]
    YES 概率已达 75% (阈值 70%)
    当前价格: $0.75
    查看: https://your-dapp.com/markets/${id}
    ```
  - 更新 lastTriggered 防刷。
5. **策略页 (app/strategies/page.tsx)**
- 拉 Opinion 全市场 + Polymarket (GraphQL: 查询 active markets)。
- 手动/模糊匹配相同事件 (标题相似度 > 80%，用 string-similarity)。
- ArbOpportunityCard 列表：事件、Opinion YES 价、Polymarket YES 价、Spread (EV%)、可用流动性。
- 只显示 EV > 3-5% 的机会 + 执行提示 (手动下单步骤)。

**开发步骤（直接按顺序给 AI）**

1. npx create-next-app@latest opinion-hub –typescript –tailwind –app
2. 安装依赖：npm i swr recharts @recharts axios lodash string-similarity @vercel/kv
3. 配置 Tailwind + Shadcn (npx shadcn-ui@latest init)
4. 实现 lib/api.ts + 全局 SWR fetcher
5. 先做仪表盘 + MarketTable (用 mock 数据测试)
6. 加详情页 + 图表组件
7. 实现警报表单 + KV 存储 (Vercel dashboard 开 KV)
8. 写 server/cron-alerts.ts + Discord 发送
9. 加策略页 + Polymarket 查询
10. 美化 (暗黑模式、移动适配)、加 loading skeleton
11. 测试限速 + 部署 Vercel

**注意事项**

- 限速优化：SWR deduping + 批量拉市场 ID 后并行价格。
- 安全：Webhook URL 服务端存，绝不暴露。
- MVP 先无用户系统 (localStorage 模拟)，后期加 Clerk/Auth0。
- 推广：上线后 @opinionlabsxyz + Discord 社区分享。

这个方案已经非常细化（结构、组件、代码片段、流程全有），你可以直接复制整个内容丢给 Claude/GPT，说“基于这个方案，用 Next.js 生成完整代码”，它能一次性出大部分框架。遇到卡点（如具体组件代码）再问我，我可以继续补！加油，项目做好了绝对是生态爆款～