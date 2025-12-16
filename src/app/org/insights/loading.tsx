export default function LoadingOrgInsightsPage() {
  return (
    <div className="px-10 pt-8 pb-10">
      <div className="mb-4 h-6 w-40 animate-pulse rounded bg-slate-800/60" />
      <div className="mb-6 h-3 w-72 animate-pulse rounded bg-slate-800/40" />

      {/* Summary cards skeleton */}
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-slate-800 bg-[#020617] px-4 py-4"
          >
            <div className="h-3 w-16 animate-pulse rounded bg-slate-800/60" />
            <div className="mt-3 h-6 w-10 animate-pulse rounded bg-slate-800/60" />
            <div className="mt-2 h-3 w-24 animate-pulse rounded bg-slate-800/40" />
          </div>
        ))}
      </div>

      {/* Charts skeleton */}
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div className="h-72 rounded-2xl border border-slate-800 bg-[#020617] px-4 py-4">
          <div className="mb-3 h-3 w-40 animate-pulse rounded bg-slate-800/60" />
          <div className="h-52 w-full animate-pulse rounded bg-slate-800/40" />
        </div>
        <div className="h-72 rounded-2xl border border-slate-800 bg-[#020617] px-4 py-4">
          <div className="mb-3 h-3 w-44 animate-pulse rounded bg-slate-800/60" />
          <div className="h-52 w-full animate-pulse rounded bg-slate-800/40" />
        </div>
      </div>
    </div>
  );
}

