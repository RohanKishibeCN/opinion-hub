import { useMemo, useState } from "react";
import { AlertRule, OpinionItem } from "../types";
import { createAlert, testAlert } from "../lib/api";
import { twMerge } from "tailwind-merge";

type Props = { alerts?: AlertRule[]; markets: OpinionItem[] };

export function AlertsPanel({ alerts, markets }: Props) {
  const safeAlerts = Array.isArray(alerts) ? alerts : [];
  const safeMarkets = Array.isArray(markets) ? markets : [];

  const [title, setTitle] = useState("");
  const [marketId, setMarketId] = useState("");
  const [direction, setDirection] = useState<"above" | "below">("above");
  const [threshold, setThreshold] = useState(0.6);
  const [webhook, setWebhook] = useState("");
  const [cooldown, setCooldown] = useState(30);
  const [submitting, setSubmitting] = useState(false);
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState<string>("");
  const sortedMarkets = useMemo(() => safeMarkets.slice(0, 20), [safeMarkets]);

  const submit = () => {
    if (!marketId || !title) {
      setStatus("Please select a market and title");
      return;
    }
    setSubmitting(true);
    setStatus("");
    createAlert({ marketId, title, direction, threshold, webhook, cooldownMinutes: cooldown })
      .then(() => {
        setStatus("Saved. Backend will push to Discord webhook when hit.");
      })
      .catch(() => setStatus("Save failed, please retry"))
      .finally(() => setSubmitting(false));
  };

  const triggerTest = () => {
    setTesting(true);
    setStatus("");
    testAlert({ webhook, title: title || "Test Alert", message: "This is a test alert" })
      .then(() => setStatus("Test alert sent (if webhook set, it will deliver now)"))
      .catch(() => setStatus("Test failed, please check webhook"))
      .finally(() => setTesting(false));
  };

  return (
    <div className="glass-card rounded-2xl border border-white/10 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-white/50">Alerts & notifications</p>
          <h3 className="text-lg font-semibold text-white">Alerts</h3>
        </div>
        {alerts && <p className="text-xs text-white/60">{safeAlerts.length} items</p>}
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <div className="space-y-2">
          <label className="text-xs text-black/70">Market</label>
          <select value={marketId} onChange={(e) => setMarketId(e.target.value)} className="retro-input w-full">
            <option value="">Select a market</option>
            {sortedMarkets.map((m) => (
              <option key={m.id} value={m.id} className="bg-white text-black">
                {m.title}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-xs text-black/70">Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Buy if it breaks 65%" className="retro-input w-full" />
        </div>
        <div className="space-y-2">
          <label className="text-xs text-black/70">Direction</label>
          <div className="flex gap-2">
            {[
              { label: "Above", value: "above" as const },
              { label: "Below", value: "below" as const }
            ].map((opt) => (
              <button key={opt.value} onClick={() => setDirection(opt.value)} className={twMerge("flex-1 retro-btn text-sm", direction === opt.value ? "active" : "")}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-xs text-black/70">Probability threshold (0-1)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            max="1"
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            className="retro-input w-full"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs text-black/70">Cooldown (minutes)</label>
          <select value={cooldown} onChange={(e) => setCooldown(Number(e.target.value))} className="retro-input w-full">
            {[5, 15, 30, 60, 120].map((m) => (
              <option key={m} value={m} className="bg-white text-black">
                {m} mins
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2 md:col-span-2">
          <label className="text-xs text-black/70">Discord Webhook (optional)</label>
          <input value={webhook} onChange={(e) => setWebhook(e.target.value)} placeholder="https://discord.com/api/webhooks/..." className="retro-input w-full" />
        </div>
        <div className="md:col-span-2 space-y-2">
          <div className="flex gap-2 flex-col sm:flex-row">
            <button
              onClick={submit}
              disabled={submitting || !marketId || !title}
              className={twMerge("w-full retro-btn text-sm justify-center", submitting || !marketId || !title ? "opacity-70 cursor-not-allowed" : "active")}
            >
              {submitting ? "Submitting…" : "Create alert"}
            </button>
            <button onClick={triggerTest} disabled={testing} className={twMerge("w-full retro-btn text-sm justify-center", testing ? "opacity-70 cursor-not-allowed" : "")}>
              {testing ? "Sending…" : "Send test to Discord"}
            </button>
          </div>
          {status && <p className="text-xs text-black/70">{status}</p>}
        </div>
      </div>

      <div className="retro-card divide-y divide-[#7a7a7a]">
        {safeAlerts.map((a) => (
          <div key={a.id} className="px-3 py-3 flex items-center justify-between">
            <div>
              <p className="text-sm text-black font-semibold">{a.title}</p>
              <p className="text-xs text-black/70">
                {a.direction === "above" ? "Above" : "Below"} {(a.threshold * 100).toFixed(1)}% · Market {a.marketId}
                {a.lastTriggered && ` · Last triggered ${new Date(a.lastTriggered).toLocaleTimeString()}`}
                {a.cooldownMinutes && ` · Cooldown ${a.cooldownMinutes} mins`}
                {a.webhook && " · Webhook set"}
              </p>
            </div>
            <span className="retro-badge">Saved</span>
          </div>
        ))}
        {alerts && safeAlerts.length === 0 && <p className="px-3 py-4 text-sm text-black/70">No alerts yet. Create one.</p>}
      </div>
    </div>
  );
}
