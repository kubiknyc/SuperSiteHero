/**
 * Skeleton Component
 * Loading placeholder with pulse animation and variants
 */

import { cn } from '@/lib/utils'

type SkeletonProps = React.HTMLAttributes<HTMLDivElement>

/**
 * Base skeleton with pulse animation
 */
export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-muted', className)}
      {...props}
    />
  )
}

/**
 * Skeleton with shimmer animation effect
 */
export function SkeletonShimmer({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-md bg-muted',
        'before:absolute before:inset-0',
        'before:-translate-x-full before:animate-[shimmer_2s_infinite]',
        'before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent',
        className
      )}
      {...props}
    />
  )
}

// ============================================================================
// Preset Skeleton Shapes
// ============================================================================

/**
 * Avatar skeleton - circular placeholder
 */
export function SkeletonAvatar({
  size = 'md',
  className,
  ...props
}: SkeletonProps & { size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16',
  }

  return (
    <Skeleton
      className={cn('rounded-full', sizeClasses[size], className)}
      {...props}
    />
  )
}

/**
 * Text line skeleton
 */
export function SkeletonText({
  lines = 1,
  className,
  ...props
}: SkeletonProps & { lines?: number }) {
  return (
    <div className={cn('space-y-2', className)} {...props}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn(
            'h-4',
            // Last line is shorter for natural text appearance
            i === lines - 1 && lines > 1 ? 'w-3/4' : 'w-full'
          )}
        />
      ))}
    </div>
  )
}

/**
 * Button skeleton
 */
export function SkeletonButton({
  size = 'md',
  className,
  ...props
}: SkeletonProps & { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'h-8 w-20',
    md: 'h-10 w-24',
    lg: 'h-11 w-28',
  }

  return (
    <Skeleton
      className={cn('rounded-md', sizeClasses[size], className)}
      {...props}
    />
  )
}

/**
 * Input field skeleton
 */
export function SkeletonInput({ className, ...props }: SkeletonProps) {
  return (
    <Skeleton
      className={cn('h-10 w-full rounded-md', className)}
      {...props}
    />
  )
}

/**
 * Card skeleton with configurable content
 */
export function SkeletonCard({
  hasImage = false,
  hasAvatar = false,
  lines = 2,
  hasFooter = false,
  className,
  ...props
}: SkeletonProps & {
  hasImage?: boolean
  hasAvatar?: boolean
  lines?: number
  hasFooter?: boolean
}) {
  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-card p-4 space-y-4',
        className
      )}
      {...props}
    >
      {hasImage && (
        <Skeleton className="h-48 w-full rounded-md" />
      )}

      {hasAvatar && (
        <div className="flex items-center gap-3">
          <SkeletonAvatar />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/4" />
          </div>
        </div>
      )}

      <SkeletonText lines={lines} />

      {hasFooter && (
        <div className="flex justify-end gap-2 pt-2">
          <SkeletonButton size="sm" />
          <SkeletonButton size="sm" />
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Table Skeleton
// ============================================================================

/**
 * Table row skeleton
 */
export function SkeletonTableRow({
  columns = 4,
  className,
  ...props
}: SkeletonProps & { columns?: number }) {
  return (
    <div
      className={cn('flex items-center gap-4 py-3 px-4', className)}
      {...props}
    >
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn(
            'h-4',
            i === 0 ? 'w-10' : 'flex-1',
            i === columns - 1 ? 'w-20' : ''
          )}
        />
      ))}
    </div>
  )
}

/**
 * Complete table skeleton with header and rows
 */
export function SkeletonTable({
  columns = 4,
  rows = 5,
  hasCheckbox = false,
  className,
  ...props
}: SkeletonProps & {
  columns?: number
  rows?: number
  hasCheckbox?: boolean
}) {
  const totalColumns = hasCheckbox ? columns + 1 : columns

  return (
    <div
      className={cn('rounded-lg border border-border', className)}
      {...props}
    >
      {/* Header */}
      <div className="flex items-center gap-4 py-3 px-4 bg-muted/50 border-b border-border">
        {hasCheckbox && <Skeleton className="h-4 w-4" />}
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton
            key={i}
            className={cn('h-4', i === 0 ? 'w-24' : 'flex-1')}
          />
        ))}
      </div>

      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'flex items-center gap-4 py-3 px-4',
            i !== rows - 1 && 'border-b border-border'
          )}
        >
          {hasCheckbox && <Skeleton className="h-4 w-4" />}
          {Array.from({ length: columns }).map((_, j) => (
            <Skeleton
              key={j}
              className={cn('h-4', j === 0 ? 'w-20' : 'flex-1')}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

// ============================================================================
// Form Skeleton
// ============================================================================

/**
 * Form field skeleton (label + input)
 */
export function SkeletonFormField({ className, ...props }: SkeletonProps) {
  return (
    <div className={cn('space-y-2', className)} {...props}>
      <Skeleton className="h-4 w-24" />
      <SkeletonInput />
    </div>
  )
}

/**
 * Complete form skeleton
 */
export function SkeletonForm({
  fields = 4,
  hasSubmit = true,
  className,
  ...props
}: SkeletonProps & {
  fields?: number
  hasSubmit?: boolean
}) {
  return (
    <div className={cn('space-y-6', className)} {...props}>
      {Array.from({ length: fields }).map((_, i) => (
        <SkeletonFormField key={i} />
      ))}

      {hasSubmit && (
        <div className="flex justify-end gap-2 pt-4">
          <SkeletonButton />
          <SkeletonButton />
        </div>
      )}
    </div>
  )
}

// ============================================================================
// List Skeleton
// ============================================================================

/**
 * List item skeleton
 */
export function SkeletonListItem({
  hasAvatar = false,
  hasAction = false,
  className,
  ...props
}: SkeletonProps & {
  hasAvatar?: boolean
  hasAction?: boolean
}) {
  return (
    <div
      className={cn('flex items-center gap-3 py-3', className)}
      {...props}
    >
      {hasAvatar && <SkeletonAvatar />}
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      {hasAction && <SkeletonButton size="sm" />}
    </div>
  )
}

/**
 * List skeleton
 */
export function SkeletonList({
  items = 5,
  hasAvatar = false,
  hasAction = false,
  className,
  ...props
}: SkeletonProps & {
  items?: number
  hasAvatar?: boolean
  hasAction?: boolean
}) {
  return (
    <div className={cn('divide-y divide-border', className)} {...props}>
      {Array.from({ length: items }).map((_, i) => (
        <SkeletonListItem
          key={i}
          hasAvatar={hasAvatar}
          hasAction={hasAction}
        />
      ))}
    </div>
  )
}

// ============================================================================
// Dashboard Skeleton
// ============================================================================

/**
 * Stat card skeleton for dashboards
 */
export function SkeletonStatCard({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-card p-6 space-y-3',
        className
      )}
      {...props}
    >
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-8 w-24" />
      <Skeleton className="h-3 w-16" />
    </div>
  )
}

/**
 * Chart placeholder skeleton
 */
export function SkeletonChart({
  height = 300,
  className,
  ...props
}: SkeletonProps & { height?: number }) {
  return (
    <div
      className={cn('rounded-lg border border-border bg-card p-4', className)}
      style={{ height }}
      {...props}
    >
      <div className="flex justify-between items-center mb-4">
        <Skeleton className="h-5 w-32" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
        </div>
      </div>
      <Skeleton className="h-full w-full rounded" />
    </div>
  )
}
