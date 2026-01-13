import { useEffect, useMemo, useState } from "react";
import { Header } from "./components/Header";
import { Hero } from "./components/Hero";
import { FiltersBar } from "./components/FiltersBar";
import { OpinionForm } from "./components/OpinionForm";
import { OpinionList } from "./components/OpinionList";
import { HealthBadge } from "./components/HealthBadge";
import { OrderbookDepth } from "./components/OrderbookDepth";
import { HistoryChart } from "./components/HistoryChart";
import { StrategySignals } from "./components/StrategySignals";
import { SpreadTable } from "./components/SpreadTable";
import { AlertsPanel } from "./components/AlertsPanel";
import { MarketDetail } from "./components/MarketDetail";
import { HistoryDetail } from "./components/HistoryDetail";
import { useOpinions, useHealth, useOrderbook, useHistory, useStrategySignals, useSpreadCompare, useAlerts } from "./lib/api";
import { installWalletGuard, type WalletGuardIssue } from "./utils/walletGuard";
import { useI18n } from "./i18n";
import "./index.css";

const placeholderOpinions = [
  {
    id: "m1",
    title: "BTC holds above 90k in 2026 Q1, 62%",
    category: "Crypto",
    sentiment: "bull" as const,
    score: 0.62,
    probability: 0.62,
    updatedAt: new Date().toISOString()
  },
  {
    id: "m2",
    title: "Fed holds rates in March, 68%",
    category: "Macro",
    sentiment: "bear" as const,
    score: 0.68,
    probability: 0.68,
    updatedAt: new Date().toISOString()
  },
  {
    id: "m3",
    title: "Arsenal wins the Premier League, 35%",
    category: "Sports",
    sentiment: "neutral" as const,
    score: 0.35,
    probability: 0.35,
    updatedAt: new Date().toISOString()
  }
];


export default function App() {
  const { t, lang } = useI18n();
  const [query, setQuery] = useState("");
  const [sentiment, setSentiment] = useState("all");
  const [sortKey, setSortKey] = useState<"recent" | "prob">("recent");
  const [hotOnly, setHotOnly] = useState(false);
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [walletIssue, setWalletIssue] = useState<WalletGuardIssue | null>(null);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);

  const tabs = useMemo(
    () => [
      { id: "overview", label: t("tabs.overview"), desc: t("tabs.desc.overview") },
      { id: "depth", label: t("tabs.depth"), desc: t("tabs.desc.depth") },
      { id: "strategy", label: t("tabs.strategy"), desc: t("tabs.desc.strategy") },
      { id: "alerts", label: t("tabs.alerts"), desc: t("tabs.desc.alerts") },
      { id: "submit", label: t("tabs.submit"), desc: t("tabs.desc.submit") }
    ],
    [t, lang]
  );

  const { data, isLoading } = useOpinions(query);
  const { data: health } = useHealth();

  const list = useMemo(() => {
    const base = data && data.length > 0 ? data : placeholderOpinions;
    const hotFiltered = hotOnly ? base.filter((item) => item.probability >= 0.9) : base;
    const filtered = hotFiltered.filter((item) =>
      query ? item.title.toLowerCase().includes(query.toLowerCase()) || item.category.toLowerCase().includes(query.toLowerCase()) : true
    );
    const sorted = [...filtered].sort((a, b) => {
      if (sortKey === "prob") return b.probability - a.probability;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
    return sorted;
  }, [data, hotOnly, query, sortKey]);

  useEffect(() => {
    const cleanup = installWalletGuard((issue) => setWalletIssue(issue));
    return cleanup;
  }, []);

  useEffect(() => {
    if (!selectedId && list.length > 0) {
      setSelectedId(list[0].id);
    }
  }, [list, selectedId]);

  const { data: orderbook, isLoading: obLoading } = useOrderbook(selectedId);
  const { data: history, isLoading: hisLoading } = useHistory(selectedId, { interval: "5m", limit: 200 });
  const { data: signals, isLoading: sigLoading } = useStrategySignals();
  const { data: spreads, isLoading: sprLoading } = useSpreadCompare();
  const { data: alerts } = useAlerts();

  const selectedMarket = useMemo(() => list.find((m) => m.id === selectedId), [list, selectedId]);
  const activeTabMeta = tabs.find((t) => t.id === activeTab);

  return (
    <div className="app-retro min-h-screen bg-[#c0c0c0] text-black pb-12">
      <Header />
      <main className="pt-24 space-y-10">
        {walletIssue && (
          <div className="mx-auto max-w-6xl px-4">
            <div className="mt-2 glass-card rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 space-y-1">
              <p className="text-sm font-semibold text-amber-100">{t("alert.wallet.title")}</p>
              <p className="text-xs text-amber-50/80">{t("alert.wallet.msg")}</p>
              <p className="text-[11px] text-amber-50/60">{walletIssue.message}{walletIssue.source ? ` · ${walletIssue.source}` : ""}</p>
            </div>
          </div>
        )}
        <div className="mx-auto max-w-6xl px-4">
          <div className="retro-card p-3 flex flex-wrap items-center gap-2 sticky top-14 z-20 animate-[fadeIn_0.4s_ease]">
            <div className="flex flex-wrap gap-2 flex-1">
              {tabs.map((tab) => {
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`retro-btn text-sm ${active ? "active" : ""}`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
            {activeTabMeta && <span className="retro-badge text-[12px]">{activeTabMeta.desc}</span>}
          </div>
        </div>

        {activeTab === "overview" && (
          <div className="space-y-8">
            <Hero onSubmitClick={() => setActiveTab("submit")}
            />
            <section id="market" className="mx-auto max-w-6xl px-4 flex flex-col gap-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <p className="text-xs text-white/60">{t("overview.subtitle")}</p>
                  <h2 className="text-2xl font-semibold text-gradient">{t("overview.title")}</h2>
                </div>
                <HealthBadge health={health} />
              </div>
              <FiltersBar
                query={query}
                setQuery={setQuery}
                sentiment={sentiment}
                setSentiment={setSentiment}
                sortKey={sortKey}
                setSortKey={setSortKey}
                hotOnly={hotOnly}
                setHotOnly={setHotOnly}
                items={data && data.length > 0 ? data : placeholderOpinions}
              />
              {isLoading && (
                <div className="grid md:grid-cols-2 gap-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="glass-card rounded-2xl border border-white/10 p-4 space-y-3 animate-pulse bg-white/5">
                      <div className="flex items-center justify-between">
                        <div className="h-3 w-24 bg-white/10 rounded-full" />
                        <div className="h-6 w-16 bg-white/10 rounded-full" />
                      </div>
                      <div className="h-5 bg-white/10 rounded-full" />
                      <div className="h-5 bg-white/10 rounded-full w-5/6" />
                      <div className="h-2.5 bg-white/10 rounded-full" />
                      <div className="h-2.5 bg-white/10 rounded-full w-2/3" />
                    </div>
                  ))}
                </div>
              )}
              <OpinionList items={list} sentiment={sentiment} selectedId={selectedId} onSelect={(id) => setSelectedId(id)} />
              <MarketDetail
                market={selectedMarket}
                history={history}
                orderbook={orderbook}
                loadingHistory={hisLoading}
                loadingOrderbook={obLoading}
                onOpenHistoryDetail={() => setHistoryModalOpen(true)}
              />
            </section>
          </div>
        )}

        {activeTab === "depth" && (
          <div className="space-y-6 mx-auto max-w-6xl px-4">
            <div className="glass-card rounded-2xl border border-white/10 p-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs text-white/60">{t("depth.subtitle")}</p>
                <h3 className="text-xl font-semibold text-white">{t("depth.title")}</h3>
                {selectedMarket && <p className="text-sm text-white/60 mt-1">{selectedMarket.title}</p>}
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {list.slice(0, 8).map((m) => {
                  const active = m.id === selectedId;
                  return (
                    <button
                      key={m.id}
                      onClick={() => setSelectedId(m.id)}
                      className={`whitespace-nowrap px-3 py-2 rounded-lg border text-sm transition ${
                        active ? "border-cyan-400/70 bg-cyan-400/10" : "border-white/10 text-white/80 hover:border-white/30"
                      }`}
                    >
                      {m.title.length > 18 ? `${m.title.slice(0, 18)}…` : m.title}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="grid lg:grid-cols-2 gap-6">
              <OrderbookDepth data={orderbook} loading={obLoading} />
              <HistoryChart data={history} loading={hisLoading} />
            </div>
          </div>
        )}

        {activeTab === "strategy" && (
          <div className="mx-auto max-w-6xl px-4 grid lg:grid-cols-2 gap-6">
            <StrategySignals data={signals} loading={sigLoading} />
            <SpreadTable data={spreads} loading={sprLoading} />
          </div>
        )}

        {activeTab === "alerts" && (
          <div className="mx-auto max-w-6xl px-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-white/60">{t("alerts.subtitle")}</p>
                <h3 className="text-xl font-semibold">{t("alerts.title")}</h3>
              </div>
              <span className="text-xs px-3 py-1 rounded-full bg-amber-400/15 text-amber-200 border border-amber-400/30">{t("alerts.badge")}</span>
            </div>
            <AlertsPanel alerts={alerts} markets={list} />
          </div>
        )}

        {activeTab === "submit" && (
          <div className="mx-auto max-w-6xl px-4 grid md:grid-cols-2 gap-6">
            <OpinionForm />
            <div className="glass-card rounded-2xl border border-white/10 p-5 space-y-3">
              <p className="text-sm text-white/70">{t("submit.subtitle")}</p>
              <ul className="space-y-2 text-white/70 text-sm">
                {(t("submit.bullets") as string[]).map((item) => (
                  <li key={item}>· {item}</li>
                ))}
              </ul>
              <p className="text-xs text-white/50">{t("submit.hint")}</p>
            </div>
          </div>
        )}
      </main>
      <HistoryDetail open={historyModalOpen} onClose={() => setHistoryModalOpen(false)} market={selectedMarket} history={history} />
    </div>
  );
}
