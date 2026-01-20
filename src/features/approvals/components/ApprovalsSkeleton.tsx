/**
 * Approvals Skeleton Components
 * Loading states for the Approvals Hub
 */

import { cn } from '@/lib/utils'

/**
 * Skeleton shimmer effect
 */
function Shimmer({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'animate-pulse rounded bg-gradient-to-r from-muted via-muted/70 to-muted',
        className
      )}
    />
  )
}

/**
 * Skeleton for approval request cards
 */
export function ApprovalCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'bg-card border rounded-xl p-5 space-y-4',
        'border-l-4 border-l-muted',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Shimmer className="w-10 h-10 rounded-lg" />
          <div className="space-y-2">
            <Shimmer className="h-3 w-16" />
            <Shimmer className="h-5 w-48" />
          </div>
        </div>
        <Shimmer className="h-6 w-20 rounded-full" />
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex justify-between">
          <Shimmer className="h-3 w-32" />
          <Shimmer className="h-3 w-8" />
        </div>
        <Shimmer className="h-2 w-full rounded-full" />
      </div>

      {/* Meta info */}
      <div className="flex items-center gap-4">
        <Shimmer className="h-4 w-24" />
        <Shimmer className="h-4 w-32" />
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <Shimmer className="h-9 w-24 rounded-md" />
        <Shimmer className="h-9 w-36 rounded-md" />
        <Shimmer className="h-9 w-20 rounded-md" />
        <Shimmer className="h-9 w-24 rounded-md ml-auto" />
      </div>
    </div>
  )
}

/**
 * Skeleton for stat cards in header
 */
export function StatCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'bg-card/50 border rounded-xl p-4 flex items-center gap-4',
        className
      )}
    >
      <Shimmer className="w-12 h-12 rounded-lg" />
      <div className="space-y-2">
        <Shimmer className="h-3 w-16" />
        <Shimmer className="h-7 w-12" />
      </div>
    </div>
  )
}

/**
 * Full page skeleton for approvals hub
 */
export function ApprovalsPageSkeleton() {
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 animate-fade-in">
      {/* Hero header skeleton */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-muted/50 via-transparent to-muted/30 p-6 border border-muted">
        <div className="flex items-start justify-between gap-6">
          <div className="space-y-3">
            <Shimmer className="h-8 w-48" />
            <Shimmer className="h-4 w-64" />
          </div>
          <div className="flex gap-3">
            <StatCardSkeleton />
            <StatCardSkeleton className="hidden md:flex" />
          </div>
        </div>
      </div>

      {/* Tabs skeleton */}
      <div className="flex gap-2">
        <Shimmer className="h-10 w-36 rounded-lg" />
        <Shimmer className="h-10 w-28 rounded-lg" />
      </div>

      {/* Filter pills skeleton */}
      <div className="flex gap-2 flex-wrap">
        <Shimmer className="h-8 w-20 rounded-full" />
        <Shimmer className="h-8 w-24 rounded-full" />
        <Shimmer className="h-8 w-28 rounded-full" />
        <Shimmer className="h-8 w-16 rounded-full" />
        <Shimmer className="h-8 w-32 rounded-full" />
      </div>

      {/* Cards skeleton */}
      <div className="space-y-4">
        <ApprovalCardSkeleton />
        <ApprovalCardSkeleton className="opacity-75" />
        <ApprovalCardSkeleton className="opacity-50" />
      </div>
    </div>
  )
}

export default ApprovalsPageSkeleton
