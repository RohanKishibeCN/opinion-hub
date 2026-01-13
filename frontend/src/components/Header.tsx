import { useI18n } from "../i18n";

export function Header() {
  const { t, lang, setLang } = useI18n();

  return (
    <header className="fixed top-0 left-0 right-0 z-30 bg-[#0B1021]/85 backdrop-blur-xl border-b border-white/10">
      <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-primary-100 to-primary shadow-glass" />
          <div className="leading-tight">
            <p className="text-base font-semibold text-gradient">{t("header.brand")}</p>
            <p className="text-[12px] text-white/60">{t("header.tag")}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-white/70">
          <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15">
            <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_0_6px_rgba(16,185,129,0.15)]" />
            {t("header.live")}
          </span>
          <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white/60">{t("header.api")}</span>
          <div className="flex items-center gap-1 rounded-full bg-white/5 border border-white/10 p-1">
            {(
              [
                { key: "zh", label: t("lang.zh") },
                { key: "en", label: t("lang.en") }
              ] as const
            ).map((item) => {
              const active = lang === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => setLang(item.key)}
                  className={`px-2.5 py-1 rounded-full text-[11px] transition ${
                    active ? "bg-white text-[#0B1021] font-semibold" : "text-white/70 hover:text-white"
                  }`}
                >
                  {item.label as string}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </header>
  );
}
