import { Skeleton } from "@/components/ui/skeleton"

/**
 * Skeleton loaders to prevent layout shift
 */

// Task list skeleton
export function TaskListSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
          <Skeleton className="h-4 w-4 rounded" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      ))}
    </div>
  )
}

// Project card skeleton
export function ProjectCardSkeleton() {
  return (
    <div className="p-6 border rounded-lg">
      <div className="space-y-3">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <div className="flex items-center space-x-2">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      </div>
    </div>
  )
}

// Wiki page skeleton
export function WikiPageSkeleton() {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  )
}

// Dashboard skeleton
export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Welcome section */}
      <div className="space-y-3">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-4 w-1/4" />
      </div>
      
      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="p-4 border rounded-lg">
            <Skeleton className="h-6 w-1/2 mb-2" />
            <Skeleton className="h-8 w-1/3" />
          </div>
        ))}
      </div>
      
      {/* Recent activity */}
      <div className="space-y-4">
        <Skeleton className="h-6 w-1/4" />
        <TaskListSkeleton />
      </div>
    </div>
  )
}

// Kanban board skeleton
export function KanbanSkeleton() {
  return (
    <div className="flex space-x-4 overflow-x-auto">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex-shrink-0 w-80">
          <div className="p-4 border rounded-lg">
            <div className="space-y-3">
              <Skeleton className="h-6 w-1/2" />
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="p-3 border rounded">
                  <Skeleton className="h-4 w-3/4 mb-2" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
