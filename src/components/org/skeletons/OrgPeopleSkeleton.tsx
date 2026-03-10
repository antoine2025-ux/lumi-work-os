/**
 * Skeleton components for Org People page.
 */

export function OrgPeopleTableSkeleton() {
  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-background">
      <table className="min-w-full border-separate border-spacing-0 text-[12px]">
        <thead>
          <tr className="text-left text-muted-foreground">
            {Array.from({ length: 5 }).map((_, i) => (
              <th key={i} className="px-4 py-3">
                <div className="h-3 w-20 bg-muted rounded animate-pulse" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 5 }).map((_, i) => (
            <tr key={i} className="border-t border-border">
              {Array.from({ length: 5 }).map((_, j) => (
                <td key={j} className="px-4 py-2.5">
                  <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

