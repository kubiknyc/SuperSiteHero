// File: /src/components/layout/PageHeader.tsx
// Standardized page header component with title, actions, and optional features

import * as React from 'react'
import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface PageHeaderProps {
  /** Page title */
  title: string
  /** Optional subtitle/description */
  subtitle?: string
  /** Optional icon to display before title */
  icon?: LucideIcon
  /** Action buttons to display on the right */
  actions?: React.ReactNode
  /** Optional breadcrumb content */
  breadcrumb?: React.ReactNode
  /** Additional content below the title row */
  children?: React.ReactNode
  /** Custom class name */
  className?: string
  /** Whether the header is sticky */
  sticky?: boolean
}

export function PageHeader({
  title,
  subtitle,
  icon: Icon,
  actions,
  breadcrumb,
  children,
  className,
  sticky = false,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        'border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60',
        sticky && 'sticky top-0 z-40',
        className
      )}
    >
      <div className="px-4 py-4 md:px-6 lg:px-8">
        {/* Breadcrumb */}
        {breadcrumb && (
          <div className="mb-2 text-sm text-muted-foreground">
            {breadcrumb}
          </div>
        )}

        {/* Title row */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            {Icon && (
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                {title}
              </h1>
              {subtitle && (
                <p className="mt-1 text-sm text-muted-foreground md:text-base">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {/* Actions */}
          {actions && (
            <div className="flex flex-wrap items-center gap-2">
              {actions}
            </div>
          )}
        </div>

        {/* Additional content */}
        {children && (
          <div className="mt-4">
            {children}
          </div>
        )}
      </div>
    </header>
  )
}

// Compact variant for secondary pages
export interface PageHeaderCompactProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
  className?: string
}

export function PageHeaderCompact({
  title,
  subtitle,
  actions,
  className,
}: PageHeaderCompactProps) {
  return (
    <header className={cn('mb-6', className)}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground">
              {subtitle}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-2">
            {actions}
          </div>
        )}
      </div>
    </header>
  )
}
