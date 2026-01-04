// File: /src/components/ui/loading-skeleton.tsx
// Comprehensive loading skeleton components for consistent loading states

import * as React from 'react'
import { cn } from '@/lib/utils'

// Base skeleton component
export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Animation variant */
  animation?: 'pulse' | 'shimmer' | 'none'
}

export function Skeleton({
  className,
  animation = 'pulse',
  ...props
}: SkeletonProps) {
  return (
    <div
      className={cn(
        'rounded-md bg-muted',
        animation === 'pulse' && 'animate-pulse',
        animation === 'shimmer' && 'animate-shimmer bg-gradient-to-r from-muted via-muted/50 to-muted bg-[length:200%_100%]',
        className
      )}
      {...props}
    />
  )
}

// Table skeleton
export interface TableSkeletonProps {
  rows?: number
  columns?: number
  showHeader?: boolean
  className?: string
}

export function TableSkeleton({
  rows = 5,
  columns = 4,
  showHeader = true,
  className,
}: TableSkeletonProps) {
  return (
    <div className={cn('w-full space-y-3', className)}>
      {showHeader && (
        <div className="flex gap-4 pb-2 border-b border-border">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton
              key={`header-${i}`}
              className={cn(
                'h-4',
                i === 0 ? 'w-8' : 'flex-1'
              )}
            />
          ))}
        </div>
      )}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={`row-${rowIndex}`} className="flex items-center gap-4 py-2">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton
              key={`cell-${rowIndex}-${colIndex}`}
              className={cn(
                'h-10',
                colIndex === 0 ? 'w-8' : 'flex-1'
              )}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

// Card skeleton
export interface CardSkeletonProps {
  showImage?: boolean
  showTitle?: boolean
  showDescription?: boolean
  showFooter?: boolean
  className?: string
}

export function CardSkeleton({
  showImage = false,
  showTitle = true,
  showDescription = true,
  showFooter = false,
  className,
}: CardSkeletonProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-card p-4 space-y-4',
        className
      )}
    >
      {showImage && (
        <Skeleton className="h-40 w-full rounded-md" />
      )}
      {showTitle && (
        <Skeleton className="h-5 w-3/4" />
      )}
      {showDescription && (
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      )}
      {showFooter && (
        <div className="flex items-center justify-between pt-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-24" />
        </div>
      )}
    </div>
  )
}

// Card grid skeleton
export interface CardGridSkeletonProps {
  cards?: number
  columns?: 1 | 2 | 3 | 4
  showImage?: boolean
  className?: string
}

export function CardGridSkeleton({
  cards = 6,
  columns = 3,
  showImage = false,
  className,
}: CardGridSkeletonProps) {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  }

  return (
    <div className={cn('grid gap-4', gridCols[columns], className)}>
      {Array.from({ length: cards }).map((_, i) => (
        <CardSkeleton key={i} showImage={showImage} />
      ))}
    </div>
  )
}

// List skeleton
export interface ListSkeletonProps {
  items?: number
  showAvatar?: boolean
  showSecondaryText?: boolean
  className?: string
}

export function ListSkeleton({
  items = 5,
  showAvatar = true,
  showSecondaryText = true,
  className,
}: ListSkeletonProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          {showAvatar && (
            <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
          )}
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            {showSecondaryText && (
              <Skeleton className="h-3 w-1/2" />
            )}
          </div>
          <Skeleton className="h-8 w-16" />
        </div>
      ))}
    </div>
  )
}

// Form skeleton
export interface FormSkeletonProps {
  fields?: number
  showLabels?: boolean
  className?: string
}

export function FormSkeleton({
  fields = 4,
  showLabels = true,
  className,
}: FormSkeletonProps) {
  return (
    <div className={cn('space-y-6', className)}>
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          {showLabels && (
            <Skeleton className="h-4 w-24" />
          )}
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
      <div className="flex justify-end gap-2 pt-4">
        <Skeleton className="h-10 w-20" />
        <Skeleton className="h-10 w-24" />
      </div>
    </div>
  )
}

// Stats/Dashboard skeleton
export interface StatSkeletonProps {
  className?: string
}

export function StatSkeleton({ className }: StatSkeletonProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-card p-6 space-y-2',
        className
      )}
    >
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-8 w-3/4" />
      <Skeleton className="h-3 w-1/3" />
    </div>
  )
}

export interface StatsGridSkeletonProps {
  stats?: number
  className?: string
}

export function StatsGridSkeleton({
  stats = 4,
  className,
}: StatsGridSkeletonProps) {
  return (
    <div
      className={cn(
        'grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
        className
      )}
    >
      {Array.from({ length: stats }).map((_, i) => (
        <StatSkeleton key={i} />
      ))}
    </div>
  )
}

// Page skeleton (combines multiple skeletons for full page loading)
export interface PageSkeletonProps {
  showHeader?: boolean
  showStats?: boolean
  showFilters?: boolean
  contentType?: 'table' | 'cards' | 'list'
  className?: string
}

export function PageSkeleton({
  showHeader = true,
  showStats = false,
  showFilters = true,
  contentType = 'table',
  className,
}: PageSkeletonProps) {
  return (
    <div className={cn('space-y-6 p-4 md:p-6', className)}>
      {/* Header skeleton */}
      {showHeader && (
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
      )}

      {/* Stats skeleton */}
      {showStats && <StatsGridSkeleton />}

      {/* Filters skeleton */}
      {showFilters && (
        <div className="flex flex-wrap gap-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
      )}

      {/* Content skeleton */}
      {contentType === 'table' && <TableSkeleton rows={8} columns={5} />}
      {contentType === 'cards' && <CardGridSkeleton cards={6} columns={3} />}
      {contentType === 'list' && <ListSkeleton items={8} />}
    </div>
  )
}

// Detail page skeleton
export interface DetailPageSkeletonProps {
  className?: string
}

export function DetailPageSkeleton({ className }: DetailPageSkeletonProps) {
  return (
    <div className={cn('space-y-6 p-4 md:p-6', className)}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>

      {/* Two column layout */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <CardSkeleton showDescription showFooter />
          <CardSkeleton showDescription />
        </div>
        <div className="space-y-6">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    </div>
  )
}
