import { Skeleton } from "@/components/ui/skeleton"

export default function TeamSpacesLoading() {
  return (
    <div className="flex-1 p-6 overflow-y-auto">
      {/* Header skeleton */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-8 w-40" />
          </div>
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-9 w-36" />
      </div>

      {/* Space cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-lg" />
        ))}
      </div>
    </div>
  )
}
