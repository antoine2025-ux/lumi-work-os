/**
 * Skeleton components for Org Insights page.
 */

export function OrgInsightsSummaryCardsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-slate-800 bg-[#020617] px-4 py-4 shadow-sm animate-pulse"
        >
          <div className="h-3 w-16 bg-slate-800 rounded mb-2" />
          <div className="h-8 w-12 bg-slate-800 rounded mb-2" />
          <div className="h-3 w-32 bg-slate-800 rounded" />
        </div>
      ))}
    </div>
  );
}

export function OrgInsightsChartsSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {Array.from({ length: 2 }).map((_, i) => (
        <div
          key={i}
          className="h-72 rounded-2xl border border-slate-800 bg-[#020617] px-4 py-4 animate-pulse"
        >
          <div className="h-4 w-40 bg-slate-800 rounded mb-1" />
          <div className="h-3 w-64 bg-slate-800 rounded mb-3" />
          <div className="h-56 bg-slate-800/50 rounded" />
        </div>
      ))}
    </div>
  );
}

