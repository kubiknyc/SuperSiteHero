/**
 * AgentFeatureToggle Component
 * Reusable toggle component for individual agent features
 */

import * as React from 'react'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

// ============================================================================
// Types
// ============================================================================

export interface AgentFeatureToggleProps {
  /** Unique identifier for the feature */
  id: string
  /** Feature display name */
  name: string
  /** Feature description */
  description: string
  /** Whether the feature is currently enabled */
  enabled: boolean
  /** Callback when the toggle is changed */
  onToggle: (enabled: boolean) => void
  /** Whether the feature is a premium/pro feature */
  isPremium?: boolean
  /** Whether the toggle is disabled (e.g., during loading) */
  disabled?: boolean
  /** Whether the feature is currently being updated */
  isUpdating?: boolean
  /** Optional icon to display */
  icon?: React.ReactNode
  /** Optional className for the container */
  className?: string
}

// ============================================================================
// Component
// ============================================================================

export function AgentFeatureToggle({
  id,
  name,
  description,
  enabled,
  onToggle,
  isPremium = false,
  disabled = false,
  isUpdating = false,
  icon,
  className,
}: AgentFeatureToggleProps) {
  const handleToggle = React.useCallback(
    (checked: boolean) => {
      if (!disabled && !isUpdating) {
        onToggle(checked)
      }
    },
    [disabled, isUpdating, onToggle]
  )

  return (
    <div
      className={cn(
        'group flex items-start gap-4 rounded-lg border border-gray-200 bg-white p-4 transition-all duration-200',
        'hover:border-gray-300 hover:shadow-sm',
        'dark:border-gray-700 dark:bg-gray-900 dark:hover:border-gray-600',
        disabled && 'opacity-60 cursor-not-allowed',
        isUpdating && 'animate-pulse',
        className
      )}
    >
      {/* Icon */}
      {icon && (
        <div
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
            'bg-gray-100 text-gray-600',
            'dark:bg-gray-800 dark:text-gray-400',
            enabled && 'bg-primary/10 text-primary dark:bg-primary/20'
          )}
        >
          {icon}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Label
            htmlFor={id}
            className={cn(
              'text-sm font-medium text-gray-900 dark:text-gray-100',
              'cursor-pointer',
              disabled && 'cursor-not-allowed'
            )}
          >
            {name}
          </Label>
          {isPremium && (
            <Badge
              variant="subtle-primary"
              size="sm"
              className="shrink-0"
            >
              Pro
            </Badge>
          )}
        </div>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
          {description}
        </p>
      </div>

      {/* Toggle */}
      <div className="shrink-0 pt-0.5">
        <Switch
          id={id}
          checked={enabled}
          onCheckedChange={handleToggle}
          disabled={disabled || isUpdating}
          aria-label={`Toggle ${name}`}
        />
      </div>
    </div>
  )
}

// ============================================================================
// Feature Group Component
// ============================================================================

export interface FeatureGroupProps {
  /** Group title */
  title: string
  /** Group description */
  description?: string
  /** Child feature toggles */
  children: React.ReactNode
  /** Optional className */
  className?: string
}

export function FeatureGroup({
  title,
  description,
  children,
  className,
}: FeatureGroupProps) {
  return (
    <div className={cn('space-y-3', className)}>
      <div>
        <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {title}
        </h4>
        {description && (
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            {description}
          </p>
        )}
      </div>
      <div className="space-y-2">
        {children}
      </div>
    </div>
  )
}

// ============================================================================
// Compact Feature Toggle (for inline use)
// ============================================================================

export interface CompactFeatureToggleProps {
  /** Unique identifier */
  id: string
  /** Label text */
  label: string
  /** Whether enabled */
  enabled: boolean
  /** Toggle callback */
  onToggle: (enabled: boolean) => void
  /** Whether disabled */
  disabled?: boolean
  /** Optional className */
  className?: string
}

export function CompactFeatureToggle({
  id,
  label,
  enabled,
  onToggle,
  disabled = false,
  className,
}: CompactFeatureToggleProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3 py-2',
        className
      )}
    >
      <Label
        htmlFor={id}
        className={cn(
          'text-sm text-gray-700 dark:text-gray-300',
          'cursor-pointer',
          disabled && 'cursor-not-allowed opacity-60'
        )}
      >
        {label}
      </Label>
      <Switch
        id={id}
        checked={enabled}
        onCheckedChange={onToggle}
        disabled={disabled}
        aria-label={`Toggle ${label}`}
      />
    </div>
  )
}
