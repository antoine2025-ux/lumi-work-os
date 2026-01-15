"use client";

export function OutcomeSummary({ metrics }: { metrics: any }) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5">
      <div className="text-sm font-semibold">Outcome impact</div>
      <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <div className="text-xs text-black/50 dark:text-white/50">Before</div>
          <div className="text-lg font-semibold">{metrics.before?.missingManager ?? "—"}</div>
        </div>
        <div>
          <div className="text-xs text-black/50 dark:text-white/50">After</div>
          <div className="text-lg font-semibold">{metrics.after?.missingManager ?? "—"}</div>
        </div>
        <div>
          <div className="text-xs text-black/50 dark:text-white/50">Improved</div>
          <div className="text-lg font-semibold">{metrics.improved ? "Yes" : "No"}</div>
        </div>
      </div>
    </div>
  );
}

