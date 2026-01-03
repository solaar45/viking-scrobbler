import { Skeleton } from "@/components/ui/skeleton"

export function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6 w-full">
      {/* STATS SKELETON */}
      <div className="card-dense">
        {/* Header Skeleton */}
        <div className="card-header-dense">
          <div className="flex items-center gap-3">
            <Skeleton className="h-5 w-24" />
            <span className="text-viking-border-emphasis text-xl font-light">|</span>
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-10 w-96" />
        </div>

        {/* Metrics Grid Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 divide-x divide-viking-border-subtle">
          {[...Array(4)].map((_, i) => (
            <MetricSkeleton key={i} />
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 divide-x divide-viking-border-subtle border-t border-viking-border-subtle">
          {[...Array(4)].map((_, i) => (
            <MetricSkeleton key={i} />
          ))}
        </div>
      </div>

      {/* TABLE SKELETON */}
      <div className="card-dense flex-1 min-h-[500px]">
        <div className="card-header-dense">
          <div className="flex items-center gap-3">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
          <Skeleton className="h-4 w-48" />
        </div>

        <div className="p-6 space-y-3">
          {[...Array(8)].map((_, i) => (
            <TableRowSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  )
}

// Metric Card Skeleton
function MetricSkeleton() {
  return (
    <div className="h-36 px-5 py-4 flex flex-col justify-between">
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-12 w-32 my-auto" />
      <div className="flex justify-between pt-2 border-t border-transparent">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-12" />
      </div>
    </div>
  )
}

// Table Row Skeleton
function TableRowSkeleton() {
  return (
    <div className="flex items-center gap-4 h-12">
      <Skeleton className="h-4 flex-1" />
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-4 w-16" />
      <Skeleton className="h-4 w-12" />
    </div>
  )
}
