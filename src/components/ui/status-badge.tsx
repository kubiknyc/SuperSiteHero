// File: /src/components/ui/status-badge.tsx
// Unified StatusBadge component for consistent status display across all features
// Replaces 64+ feature-specific badge implementations with a single, configurable component

import * as React from 'react'
import { cn } from '@/lib/utils'
import {
  getStatusStyle,
  getPriorityStyle,
  formatStatusLabel,
  type StatusDomain,
  type StatusStyle,
  type PriorityStyle,
} from '@/lib/theme/status-colors'

// ============================================================================
// TYPES
// ============================================================================

export interface StatusBadgeProps {
  /** The status value (e.g., 'approved', 'in_progress', 'rejected') */
  status: string | null | undefined
  /**
   * The domain/context for status interpretation
   * Different domains may have different color mappings for the same status
   */
  domain?: StatusDomain
  /** Optional custom label override */
  label?: string
  /** Additional CSS classes */
  className?: string
  /** Badge size variant */
  size?: 'sm' | 'default' | 'lg'
  /** Badge shape variant */
  shape?: 'rounded' | 'pill' | 'square'
  /** Whether to show border */
  bordered?: boolean
  /** Whether to show a dot indicator before the label */
  showDot?: boolean
  /** Custom status style override (bypasses domain lookup) */
  customStyle?: StatusStyle
}

export interface PriorityBadgeProps {
  /** The priority value (e.g., 'low', 'medium', 'high', 'critical') */
  priority: string | null | undefined
  /** Optional custom label override */
  label?: string
  /** Additional CSS classes */
  className?: string
  /** Badge size variant */
  size?: 'sm' | 'default' | 'lg'
  /** Badge shape variant */
  shape?: 'rounded' | 'pill' | 'square'
  /** Whether to show border */
  bordered?: boolean
  /** Custom priority style override */
  customStyle?: PriorityStyle
}

export interface StatusWithPriorityBadgeProps {
  /** The status value */
  status: string | null | undefined
  /** The priority value (optional) */
  priority?: string | null | undefined
  /** The domain for status interpretation */
  domain?: StatusDomain
  /** Additional CSS classes for the container */
  className?: string
  /** Badge size variant */
  size?: 'sm' | 'default' | 'lg'
}

// ============================================================================
// SIZE & SHAPE CONFIGURATIONS
// ============================================================================

const sizeClasses = {
  sm: 'px-2 py-0.5 text-[10px]',
  default: 'px-2.5 py-0.5 text-xs',
  lg: 'px-3 py-1 text-sm',
} as const

const shapeClasses = {
  rounded: 'rounded-md',
  pill: 'rounded-full',
  square: 'rounded-sm',
} as const

// ============================================================================
// COMPONENTS
// ============================================================================

/**
 * StatusBadge - Unified status badge component
 *
 * @example Basic usage
 * ```tsx
 * <StatusBadge status="approved" />
 * <StatusBadge status="in_progress" domain="task" />
 * <StatusBadge status="submitted" domain="rfi" />
 * ```
 *
 * @example With customization
 * ```tsx
 * <StatusBadge status="approved" size="lg" shape="pill" />
 * <StatusBadge status="pending" showDot />
 * <StatusBadge status="custom" label="Custom Label" />
 * ```
 *
 * @example Domain-specific
 * ```tsx
 * <StatusBadge status="verified" domain="punch" />
 * <StatusBadge status="approved_as_noted" domain="submittal" />
 * <StatusBadge status="executed" domain="change_order" />
 * ```
 */
export function StatusBadge({
  status,
  domain = 'general',
  label,
  className,
  size = 'default',
  shape = 'rounded',
  bordered = true,
  showDot = false,
  customStyle,
}: StatusBadgeProps) {
  // Handle null/undefined status
  const safeStatus = status || 'unknown'

  // Get style (custom or from lookup)
  const style = customStyle || getStatusStyle(safeStatus, domain)

  // Determine display label
  const displayLabel = label || style.label || formatStatusLabel(safeStatus)

  return (
    <span
      className={cn(
        'inline-flex items-center font-semibold transition-colors',
        sizeClasses[size],
        shapeClasses[shape],
        bordered && 'border',
        style.className,
        className
      )}
      role="status"
      aria-label={`Status: ${displayLabel}`}
    >
      {showDot && (
        <span
          className={cn(
            'mr-1.5 h-1.5 w-1.5 rounded-full',
            'bg-current opacity-70'
          )}
          aria-hidden="true"
        />
      )}
      {displayLabel}
    </span>
  )
}

/**
 * PriorityBadge - Badge for displaying priority levels
 *
 * @example
 * ```tsx
 * <PriorityBadge priority="high" />
 * <PriorityBadge priority="critical" size="lg" />
 * ```
 */
export function PriorityBadge({
  priority,
  label,
  className,
  size = 'default',
  shape = 'rounded',
  bordered = true,
  customStyle,
}: PriorityBadgeProps) {
  // Handle null/undefined priority
  const safePriority = priority || 'normal'

  // Get style (custom or from lookup)
  const style = customStyle || getPriorityStyle(safePriority)

  // Determine display label
  const displayLabel = label || style.label || formatStatusLabel(safePriority)

  return (
    <span
      className={cn(
        'inline-flex items-center font-semibold transition-colors',
        sizeClasses[size],
        shapeClasses[shape],
        bordered && 'border',
        style.className,
        className
      )}
      role="status"
      aria-label={`Priority: ${displayLabel}`}
    >
      {displayLabel}
    </span>
  )
}

/**
 * StatusWithPriorityBadge - Combined status and priority display
 *
 * @example
 * ```tsx
 * <StatusWithPriorityBadge status="in_progress" priority="high" />
 * <StatusWithPriorityBadge status="open" priority="critical" domain="punch" />
 * ```
 */
export function StatusWithPriorityBadge({
  status,
  priority,
  domain = 'general',
  className,
  size = 'default',
}: StatusWithPriorityBadgeProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <StatusBadge status={status} domain={domain} size={size} />
      {priority && <PriorityBadge priority={priority} size={size} />}
    </div>
  )
}

// ============================================================================
// CONVENIENCE EXPORTS
// ============================================================================

// Re-export types and utilities for easy access
export type { StatusDomain, StatusStyle, PriorityStyle }
export { getStatusStyle, getPriorityStyle, formatStatusLabel }
