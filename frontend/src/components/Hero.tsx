import { useI18n } from "../i18n";

type Props = { onSubmitClick: () => void };

export function Hero({ onSubmitClick }: Props) {
  const { t } = useI18n();
  const chips = t("hero.chips") as string[];

  return (
    <section className="pt-24 pb-6 mx-auto max-w-6xl px-4 grid md:grid-cols-[1.15fr_0.85fr] gap-8 items-center">
      <div className="space-y-4">
        <p className="text-xs uppercase tracking-[0.2em] text-white/60">{t("hero.kicker")}</p>
        <h1 className="text-4xl md:text-5xl font-bold leading-tight text-gradient">{t("hero.title")}</h1>
        <p className="text-base md:text-lg text-white/70 leading-relaxed">{t("hero.body")}</p>
        <div className="flex flex-wrap gap-2 text-xs md:text-sm text-white/70">
          {chips.map((chip) => (
            <span key={chip} className="px-3 py-1 rounded-full bg-white/10 border border-white/10">
              {chip}
            </span>
          ))}
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={onSubmitClick}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-primary to-primary-100 text-[#0B1021] font-semibold shadow-glass hover:scale-[1.01] transition"
          >
            {t("hero.cta.submit")}
          </button>
          <a
            href="#market"
            className="px-4 py-2 rounded-lg border border-white/15 text-white/80 hover:border-white/40 hover:text-white"
          >
            {t("hero.cta.browse")}
          </a>
        </div>
      </div>
      <div className="glass-card p-5 rounded-2xl border border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-white/70">{t("hero.snapshot")}</p>
          <span className="px-2 py-1 text-[11px] rounded-full bg-emerald-400/15 text-emerald-100 border border-emerald-400/40">{t("hero.snapshot.status")}</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <p className="text-xs text-white/60">{t("hero.snapshot.polling")}</p>
            <p className="text-xl font-semibold text-white">20s</p>
          </div>
          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <p className="text-xs text-white/60">{t("hero.snapshot.depth")}</p>
            <p className="text-xl font-semibold text-white">12s</p>
          </div>
          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <p className="text-xs text-white/60">{t("hero.snapshot.history")}</p>
            <p className="text-xl font-semibold text-white">5min</p>
          </div>
          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <p className="text-xs text-white/60">{t("hero.snapshot.alert")}</p>
            <p className="text-xl font-semibold text-white">30s</p>
          </div>
        </div>
      </div>
    </section>
  );
}
