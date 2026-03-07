/**
 * Skeleton components for Org Insights page.
 */

export function OrgInsightsSummaryCardsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-border bg-background px-4 py-4 shadow-sm animate-pulse"
        >
          <div className="h-3 w-16 bg-muted rounded mb-2" />
          <div className="h-8 w-12 bg-muted rounded mb-2" />
          <div className="h-3 w-32 bg-muted rounded" />
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
          className="h-72 rounded-2xl border border-border bg-background px-4 py-4 animate-pulse"
        >
          <div className="h-4 w-40 bg-muted rounded mb-1" />
          <div className="h-3 w-64 bg-muted rounded mb-3" />
          <div className="h-56 bg-muted/50 rounded" />
        </div>
      ))}
    </div>
  );
}

