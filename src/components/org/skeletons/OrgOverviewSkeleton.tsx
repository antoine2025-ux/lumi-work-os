/**
 * Skeleton components for Org Overview page.
 * Used in Suspense boundaries to show loading states without blocking the page.
 */

export function OrgOverviewStatsSkeleton() {
  return (
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-border bg-background p-4 animate-pulse"
        >
          <div className="h-3 w-20 bg-muted rounded mb-3" />
          <div className="h-8 w-16 bg-muted rounded mb-2" />
          <div className="h-3 w-24 bg-muted rounded" />
        </div>
      ))}
    </section>
  );
}

export function OrgOverviewKeyWorkspacesSkeleton() {
  return (
    <section className="space-y-3">
      <div className="h-3 w-32 bg-muted rounded animate-pulse" />
      <div className="grid gap-4 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col rounded-xl border border-border bg-background p-4 animate-pulse"
          >
            <div className="mb-2 flex-1 space-y-2">
              <div className="h-4 w-32 bg-muted rounded" />
              <div className="h-3 w-full bg-muted rounded" />
              <div className="h-3 w-3/4 bg-muted rounded" />
            </div>
            <div className="mt-auto pt-3">
              <div className="h-8 w-28 bg-muted rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function OrgOverviewStructureSkeleton() {
  return (
    <section className="mt-8 space-y-4">
      <div className="space-y-2">
        <div className="h-5 w-48 bg-muted rounded animate-pulse" />
        <div className="h-3 w-64 bg-muted rounded animate-pulse" />
      </div>
      {Array.from({ length: 2 }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-border bg-background p-4 animate-pulse"
        >
          <div className="h-4 w-32 bg-muted rounded mb-3" />
          <div className="ml-2 space-y-2">
            <div className="h-3 w-40 bg-muted rounded" />
            <div className="h-3 w-36 bg-muted rounded" />
          </div>
        </div>
      ))}
    </section>
  );
}

