import { ApiHealth } from "../types";

type Props = { health?: ApiHealth };

export function HealthBadge({ health }: Props) {
  const ok = health?.ok;
  const color = ok ? "bg-emerald-500/20 text-emerald-100" : "bg-red-500/20 text-red-100";
  const label = ok ? "API healthy" : "API issue";
  return (
    <div className={`px-3 py-2 rounded-xl text-sm border border-white/10 ${color}`}>
      {label}
      {health?.cacheHitRate !== undefined && (
        <span className="ml-2 text-white/70">Hit {(health.cacheHitRate * 100).toFixed(0)}%</span>
      )}
      {health?.lastRefresh && <span className="ml-2 text-white/50">Updated {health.lastRefresh}</span>}
    </div>
  );
}
