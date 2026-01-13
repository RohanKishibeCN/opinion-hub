import { useMemo } from "react";
import { useI18n } from "../i18n";
import { OpinionItem } from "../types";

type Props = {
  query: string;
  setQuery: (v: string) => void;
  sentiment: string;
  setSentiment: (v: string) => void;
  sortKey: "recent" | "prob";
  setSortKey: (v: "recent" | "prob") => void;
  hotOnly: boolean;
  setHotOnly: (v: boolean) => void;
  items: OpinionItem[];
};

export function FiltersBar({ query, setQuery, sentiment, setSentiment, sortKey, setSortKey, hotOnly, setHotOnly, items }: Props) {
  const { t } = useI18n();

  const sentiments = [
    { key: "all", label: t("filters.sentiment.all") },
    { key: "bull", label: t("filters.sentiment.bull") },
    { key: "bear", label: t("filters.sentiment.bear") },
    { key: "neutral", label: t("filters.sentiment.neutral") }
  ];

  const sorters = [
    { key: "recent" as const, label: t("filters.sort.recent") },
    { key: "prob" as const, label: t("filters.sort.prob") }
  ];

  const hotTags = ["Crypto", "Macro", "Sports", "Elections", "AI", "Rates"];

  const suggestions = useMemo(() => {
    if (!query.trim()) return [] as OpinionItem[];
    return items
      .filter((m) => m.title.toLowerCase().includes(query.toLowerCase()) || m.category.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 5);
  }, [items, query]);

  return (
    <div className="retro-card p-4 flex flex-wrap items-start gap-4">
      <div className="flex-1 min-w-[260px] space-y-2">
        <div>
          <div className="flex items-center justify-between">
            <label className="text-xs text-black/70">Global search</label>
            <button
              className={`retro-btn text-[11px] py-1 px-2 ${hotOnly ? "active" : ""}`}
              onClick={() => setHotOnly(!hotOnly)}
            >
              Hot ≥90%
            </button>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("filters.placeholder") as string}
              className="retro-input w-full"
            />
            {query && (
              <button className="retro-btn text-[11px] py-1 px-2" onClick={() => setQuery("")}>Clear</button>
            )}
          </div>
          {suggestions.length > 0 && (
            <div className="mt-2 space-y-1 retro-card p-2 max-h-40 overflow-auto">
              {suggestions.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setQuery(m.title)}
                  className="w-full text-left text-sm hover:bg-[#e8e8e8] px-2 py-1"
                >
                  {m.title}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2 text-[11px] text-black/70 items-center">
          <span className="retro-badge">Hot tags</span>
          {hotTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setQuery(tag)}
              className="retro-btn text-[12px] py-1 px-3"
            >
              {tag}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="text-xs text-black/70">{t("filters.sentiment")}</label>
        <div className="mt-1 flex gap-2">
          {sentiments.map((item) => (
            <button
              key={item.key}
              onClick={() => setSentiment(item.key)}
              className={`retro-btn text-sm ${sentiment === item.key ? "active" : ""}`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="text-xs text-black/70">{t("filters.sort")}</label>
        <div className="mt-1 flex gap-2">
          {sorters.map((item) => (
            <button
              key={item.key}
              onClick={() => setSortKey(item.key)}
              className={`retro-btn text-sm ${sortKey === item.key ? "active" : ""}`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
