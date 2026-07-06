// TECH-WEB-003 D42 — Skeleton shimmer 动画 + reduced-motion 降级
export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-shimmer rounded bg-surface-200 bg-gradient-to-r from-surface-200 via-surface-100 to-surface-200 dark:bg-surface-700 dark:from-surface-700 dark:via-surface-600 dark:to-surface-700 ${className}`}
    />
  )
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-3 py-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-xl border border-surface-200 p-3 dark:border-surface-700">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  )
}
