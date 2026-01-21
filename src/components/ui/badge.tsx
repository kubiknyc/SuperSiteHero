// File: /src/components/ui/badge.tsx
// Premium Badge component with refined styling and compound sub-components

import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

/**
 * Core badge variants using semantic CSS variables
 */
const badgeVariants = cva(
  [
    'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold',
    'transition-all duration-200 ease-out',
    'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring',
  ].join(' '),
  {
    variants: {
      variant: {
        // Core semantic variants using CSS variables
        default: [
          'border-transparent bg-primary text-primary-foreground',
          'shadow-[0_1px_2px_hsl(var(--primary)/0.2)]',
          'hover:shadow-[0_2px_4px_hsl(var(--primary)/0.3)]',
        ].join(' '),
        secondary: [
          'border-border bg-secondary text-secondary-foreground',
          'hover:bg-secondary/80',
        ].join(' '),
        destructive: [
          'border-transparent bg-destructive text-destructive-foreground',
          'shadow-[0_1px_2px_hsl(var(--destructive)/0.2)]',
          'hover:shadow-[0_2px_4px_hsl(var(--destructive)/0.3)]',
        ].join(' '),
        outline: [
          'border-border bg-transparent text-foreground',
          'hover:bg-muted',
        ].join(' '),
        success: [
          'border-transparent bg-success text-success-foreground',
          'shadow-[0_1px_2px_hsl(var(--success)/0.2)]',
          'hover:shadow-[0_2px_4px_hsl(var(--success)/0.3)]',
        ].join(' '),
        warning: [
          'border-transparent bg-warning text-warning-foreground',
          'shadow-[0_1px_2px_hsl(var(--warning)/0.2)]',
          'hover:shadow-[0_2px_4px_hsl(var(--warning)/0.3)]',
        ].join(' '),
        info: [
          'border-transparent bg-info text-info-foreground',
          'shadow-[0_1px_2px_hsl(var(--info)/0.2)]',
          'hover:shadow-[0_2px_4px_hsl(var(--info)/0.3)]',
        ].join(' '),
        // Subtle/soft variants for less emphasis
        'subtle-primary': [
          'border-transparent bg-primary/10 text-primary',
          'hover:bg-primary/15',
        ].join(' '),
        'subtle-success': [
          'border-transparent bg-success/10 text-success',
          'hover:bg-success/15',
        ].join(' '),
        'subtle-warning': [
          'border-transparent bg-warning/10 text-warning',
          'hover:bg-warning/15',
        ].join(' '),
        'subtle-destructive': [
          'border-transparent bg-destructive/10 text-destructive',
          'hover:bg-destructive/15',
        ].join(' '),
      },
      size: {
        default: 'px-2.5 py-0.5 text-xs',
        sm: 'px-2 py-0.5 text-[10px]',
        lg: 'px-3 py-1 text-sm',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant, size }), className)} {...props} />
  )
}

/**
 * Industrial Badge - Construction-themed with left accent bar
 */
const industrialVariants = cva(
  [
    'inline-flex items-center pl-3 pr-2.5 py-1 rounded-sm',
    'border-l-4 font-semibold uppercase tracking-wide text-[10px]',
    'transition-all duration-200',
  ].join(' '),
  {
    variants: {
      variant: {
        default: [
          'bg-muted border-primary',
          'text-foreground',
        ].join(' '),
        danger: [
          'bg-destructive/10 border-destructive',
          'text-destructive',
        ].join(' '),
        success: [
          'bg-success/10 border-success',
          'text-success',
        ].join(' '),
        warning: [
          'bg-warning/10 border-warning',
          'text-warning',
        ].join(' '),
        info: [
          'bg-info/10 border-info',
          'text-info',
        ].join(' '),
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface IndustrialBadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof industrialVariants> {}

function IndustrialBadge({ className, variant, ...props }: IndustrialBadgeProps) {
  return (
    <div className={cn(industrialVariants({ variant }), className)} {...props} />
  )
}

/**
 * Safety Badge - High visibility construction safety styling
 */
const safetyVariants = cva(
  [
    'inline-flex items-center px-2.5 py-1 rounded-md',
    'font-bold uppercase tracking-wide text-[10px]',
    'shadow-sm transition-all duration-200',
  ].join(' '),
  {
    variants: {
      variant: {
        caution: [
          'bg-gradient-to-r from-caution-yellow to-amber-500',
          'text-amber-950 border border-amber-600/20',
        ].join(' '),
        danger: [
          'bg-gradient-to-r from-red-500 to-red-600',
          'text-white shadow-md shadow-red-500/30',
        ].join(' '),
        safe: [
          'bg-gradient-to-r from-emerald-500 to-emerald-600',
          'text-white',
        ].join(' '),
        notice: [
          'bg-gradient-to-r from-blue-500 to-blue-600',
          'text-white',
        ].join(' '),
      },
    },
    defaultVariants: {
      variant: 'caution',
    },
  }
)

export interface SafetyBadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof safetyVariants> {}

function SafetyBadge({ className, variant, ...props }: SafetyBadgeProps) {
  return (
    <div className={cn(safetyVariants({ variant }), className)} {...props} />
  )
}

/**
 * Status Badge - For workflow and progress indicators
 */
const statusVariants = cva(
  [
    'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full',
    'text-xs font-medium transition-all duration-200',
  ].join(' '),
  {
    variants: {
      variant: {
        pending: [
          'bg-muted text-muted-foreground',
        ].join(' '),
        'in-progress': [
          'bg-primary text-primary-foreground',
        ].join(' '),
        completed: [
          'bg-success text-success-foreground',
        ].join(' '),
        urgent: [
          'bg-destructive text-destructive-foreground',
          'shadow-md shadow-destructive/30 animate-pulse',
        ].join(' '),
        blocked: [
          'bg-destructive/20 text-destructive border border-destructive/30',
        ].join(' '),
        review: [
          'bg-warning text-warning-foreground',
        ].join(' '),
      },
      showDot: {
        true: '',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'pending',
      showDot: false,
    },
  }
)

export interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof statusVariants> {}

function StatusBadge({ className, variant, showDot, children, ...props }: StatusBadgeProps) {
  const dotColors: Record<string, string> = {
    pending: 'bg-muted-foreground',
    'in-progress': 'bg-primary-foreground',
    completed: 'bg-success-foreground',
    urgent: 'bg-destructive-foreground',
    blocked: 'bg-destructive',
    review: 'bg-warning-foreground',
  }

  return (
    <div className={cn(statusVariants({ variant }), className)} {...props}>
      {showDot && (
        <span
          className={cn(
            'w-2 h-2 rounded-full',
            dotColors[variant || 'pending'],
            variant === 'in-progress' && 'animate-pulse'
          )}
        />
      )}
      {children}
    </div>
  )
}

/**
 * Blueprint Badge - Technical annotation style
 */
function BlueprintBadge({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-none',
        'bg-primary/10 border border-dashed border-primary/50',
        'text-primary font-mono text-[10px] uppercase tracking-wider',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

/**
 * StatusDot component for composing with badges or standalone use
 */
export type StatusDotStatus = 'active' | 'pending' | 'error' | 'success' | 'warning' | 'info'

export interface StatusDotProps {
  status: StatusDotStatus
  className?: string
  pulse?: boolean
}

function StatusDot({ status, className, pulse }: StatusDotProps) {
  const colors: Record<StatusDotStatus, string> = {
    active: 'bg-success',
    pending: 'bg-warning',
    error: 'bg-destructive',
    success: 'bg-success',
    warning: 'bg-warning',
    info: 'bg-info',
  }

  return (
    <span
      className={cn(
        'inline-block w-2 h-2 rounded-full',
        colors[status],
        (pulse || status === 'active') && 'animate-pulse',
        className
      )}
    />
  )
}

// Compound component exports
Badge.Industrial = IndustrialBadge
Badge.Safety = SafetyBadge
Badge.Status = StatusBadge
Badge.Blueprint = BlueprintBadge

export {
  Badge,
  badgeVariants,
  StatusDot,
  IndustrialBadge,
  SafetyBadge,
  StatusBadge,
  BlueprintBadge,
  industrialVariants,
  safetyVariants,
  statusVariants,
}
