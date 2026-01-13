import { createContext, ReactNode, useContext, useMemo, useState } from "react";

type Locale = "en";

type Messages = Record<string, string | string[]>;

type Dictionary = Record<Locale, Messages>;

type I18nContextValue = {
  lang: Locale;
  setLang: (locale: Locale) => void;
  t: (key: string) => string | string[];
};

const dictionaries: Dictionary = {
  en: {
    "header.brand": "Opinion Hub",
    "header.tag": "Markets · Depth · Alerts",
    "header.live": "Live",
    "header.api": "API",
    "hero.kicker": "Markets · Depth · Alerts",
    "hero.title": "Minimal Markets & Alerts Desk",
    "hero.body": "Keep the essentials, drop the noise. Track markets, depth, spreads, and alerts in one calm surface across desktop and mobile.",
    "hero.chips": ["Light aggregation", "Live depth", "Cross-book view"],
    "hero.cta.submit": "Submit idea",
    "hero.cta.browse": "Browse markets",
    "hero.snapshot": "Runtime snapshot",
    "hero.snapshot.status": "Stable",
    "hero.snapshot.polling": "Quotes polling",
    "hero.snapshot.depth": "Depth refresh",
    "hero.snapshot.history": "History cache",
    "hero.snapshot.alert": "Alert cadence",
    "tabs.overview": "Overview",
    "tabs.depth": "Depth",
    "tabs.strategy": "Strategy",
    "tabs.alerts": "Alerts",
    "tabs.submit": "Submit",
    "tabs.desc.overview": "Markets and filters",
    "tabs.desc.depth": "Depth and history",
    "tabs.desc.strategy": "Signals & spreads",
    "tabs.desc.alerts": "Threshold alerts",
    "tabs.desc.submit": "Submit idea",
    "alert.wallet.title": "Wallet extension issue detected",
    "alert.wallet.msg": "Refresh or temporarily disable conflicting extensions (Backpack/MetaMask). Market viewing is unaffected.",
    "overview.subtitle": "Markets",
    "overview.title": "Core markets at a glance",
    "filters.keyword": "Keyword",
    "filters.placeholder": "Search title/category",
    "filters.sentiment": "Sentiment",
    "filters.sentiment.all": "All",
    "filters.sentiment.bull": "Bullish",
    "filters.sentiment.bear": "Bearish",
    "filters.sentiment.neutral": "Neutral",
    "filters.sort": "Sort",
    "filters.sort.recent": "Latest",
    "filters.sort.prob": "Higher probability",
    "depth.subtitle": "Depth / History",
    "depth.title": "Live depth and curve",
    "alerts.subtitle": "Alerts",
    "alerts.title": "Threshold & pushes",
    "alerts.badge": "30s cadence",
    "submit.subtitle": "Data notes",
    "submit.bullets": [
      "API aggregation for quotes, depth, and history.",
      "Cadence: quotes 20s, depth 12s, history 5min, alerts 30s.",
      "Intranet cache + container isolation to cut latency and noise."
    ],
    "submit.hint": "Back to list? Use the tabs above.",
    "opinion.sentiment.bull": "Bullish",
    "opinion.sentiment.bear": "Bearish",
    "opinion.sentiment.neutral": "Neutral",
    "opinion.probability": "Probability",
    "opinion.updated": "Updated",
    "opinion.empty": "No matching markets. Try another filter.",
    "lang.zh": "Chinese",
    "lang.en": "English"
  }
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Locale>("en");

  const t = (key: string) => {
    const dict = dictionaries["en"];
    return (dict && key in dict ? dict[key] : key) as string | string[];
  };

  const value = useMemo(() => ({ lang, setLang, t }), [lang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("I18nProvider is missing");
  }
  return ctx;
}
