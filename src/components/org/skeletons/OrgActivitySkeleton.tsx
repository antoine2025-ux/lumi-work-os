/**
 * Skeleton components for Org Activity page.
 */

export function OrgActivityListSkeleton() {
  return (
    <div className="space-y-2 rounded-2xl border border-[#111827] bg-[#020617] p-3">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="h-3 w-32 bg-slate-800 rounded animate-pulse" />
        <div className="h-3 w-20 bg-slate-800 rounded animate-pulse" />
      </div>
      <ul className="space-y-1.5">
        {Array.from({ length: 6 }).map((_, i) => (
          <li
            key={i}
            className="flex items-center justify-between gap-3 animate-pulse"
          >
            <div className="flex flex-col gap-1 flex-1">
              <div className="h-3 w-48 bg-slate-800 rounded" />
              <div className="h-2 w-32 bg-slate-800 rounded" />
            </div>
            <div className="h-2 w-12 bg-slate-800 rounded shrink-0" />
          </li>
        ))}
      </ul>
    </div>
  );
}

