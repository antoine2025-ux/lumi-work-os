import React from "react";

export function OrgHealthStrip({
  overallPercent,
  metrics,
}: {
  overallPercent: number; // 0..100
  metrics: Array<{
    label: string;
    percent: number; // 0..100
    hint: string;
  }>;
}) {
  return (
    <div className="mb-4 rounded-2xl border border-black/5 bg-white/70 p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-black/90 dark:text-white/90">
            Org health
          </div>
          <div className="mt-1 text-xs text-black/50 dark:text-white/50">
            Progress narrative: completeness over error spam.
          </div>
        </div>

        <div className="flex items-baseline gap-2">
          <div className="text-2xl font-semibold tracking-[-0.03em] text-black dark:text-white">
            {overallPercent}%
          </div>
          <div className="text-xs text-black/50 dark:text-white/50">
            modeled
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
        {metrics.map((m) => (
          <div
            key={m.label}
            className="rounded-xl border border-black/10 bg-transparent p-3 dark:border-white/10"
            title={m.hint}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs font-medium text-black/80 dark:text-white/80">
                {m.label}
              </div>
              <div className="text-xs text-black/60 dark:text-white/60">
                {m.percent}%
              </div>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
              <div
                className="h-full rounded-full bg-black/60 dark:bg-white/60"
                style={{ width: `${Math.max(0, Math.min(100, m.percent))}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

