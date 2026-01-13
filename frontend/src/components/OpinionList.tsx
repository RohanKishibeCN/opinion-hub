import { useI18n } from "../i18n";
import { OpinionItem } from "../types";

type Props = { items: OpinionItem[]; sentiment: string; selectedId?: string; onSelect?: (id: string) => void };

export function OpinionList({ items, sentiment, selectedId, onSelect }: Props) {
  const { t, lang } = useI18n();
  const filtered = items.filter((x) => (sentiment === "all" ? true : x.sentiment === sentiment));

  return (
    <div id="market" className="grid md:grid-cols-2 gap-4 animate-[fadeIn_0.4s_ease]">
      {filtered.map((item) => {
        const active = selectedId === item.id;
        const prob = Math.round(item.probability * 100);
        const isHot = prob >= 90;
        return (
          <button
            key={item.id}
            onClick={() => onSelect && onSelect(item.id)}
            className={`text-left retro-card p-4 transition ${active ? "outline outline-2 outline-[#003399]" : ""}`}
          >
            <div className="flex items-center justify-between mb-2 gap-2">
              <p className="text-sm text-black/70">{item.category}</p>
              <div className="flex items-center gap-2">
                {isHot && <span className="retro-badge text-[11px]">Hot</span>}
                <span className="retro-tag text-xs">
                  {item.sentiment === "bull"
                    ? (t("opinion.sentiment.bull") as string)
                    : item.sentiment === "bear"
                    ? (t("opinion.sentiment.bear") as string)
                    : (t("opinion.sentiment.neutral") as string)}
                </span>
              </div>
            </div>
            <h3 className="text-lg font-semibold text-black mb-2 leading-snug">{item.title}</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm text-black/80">
                <span>
                  {t("opinion.probability")} {prob}%
                </span>
                <span className="text-black/60">
                  {t("opinion.updated")} {" "}
                  {new Date(item.updatedAt).toLocaleTimeString(lang === "zh" ? "zh-CN" : "en-US")}
                </span>
              </div>
              <div className="h-2.5 bg-[#e0e0e0] overflow-hidden border border-[#7a7a7a]">
                <div
                  className="h-full bg-[#003399] transition-all"
                  style={{ width: `${prob}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-black/70">
                <span>Probability</span>
                <span>{prob}%</span>
              </div>
            </div>
          </button>
        );
      })}
      {filtered.length === 0 && (
        <div className="col-span-2 text-center text-white/60 py-10 border border-dashed border-white/20 rounded-2xl">
          {t("opinion.empty")}
        </div>
      )}
    </div>
  );
}
