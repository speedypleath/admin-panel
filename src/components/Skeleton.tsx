import { cx } from "./format"

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx("skeleton rounded", className)} />
}

export function CardSkeleton({ lines = 2 }: { lines?: number }) {
  return (
    <div className="bg-surface border-line flex flex-col gap-4 rounded-[10px] border p-5">
      <Skeleton className="h-2.5 w-20" />
      <Skeleton className="h-8 w-28" />
      <div className="flex flex-col gap-2">
        {Array.from({ length: lines }).map((_, index) => (
          <Skeleton key={index} className="h-1.5 w-full" />
        ))}
      </div>
    </div>
  )
}

export function GridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
      role="status"
      aria-label="Loading"
    >
      {Array.from({ length: count }).map((_, index) => (
        <CardSkeleton key={index} lines={index % 2 === 0 ? 3 : 2} />
      ))}
    </div>
  )
}
