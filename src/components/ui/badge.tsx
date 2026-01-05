// File: /src/components/ui/badge.tsx
// Premium Badge component with refined styling and subtle animations

import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  [
    'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold',
    'transition-all duration-200 ease-out',
    'focus:outline-none focus:ring-2 focus:ring-offset-2',
    'dark:ring-offset-gray-950',
  ].join(' '),
  {
    variants: {
      variant: {
        // Premium default with subtle gradient
        default: [
          'border-transparent bg-gradient-to-r from-primary to-primary/90 text-white',
          'shadow-[0_1px_2px_rgba(30,64,175,0.2)]',
          'hover:shadow-[0_2px_4px_rgba(30,64,175,0.3)]',
          'dark:from-blue-500 dark:to-blue-600',
        ].join(' '),
        // Refined secondary
        secondary: [
          'border-gray-200 bg-gray-100 text-gray-700',
          'hover:bg-gray-200',
          'dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300',
          'dark:hover:bg-gray-700',
        ].join(' '),
        // Destructive with glow
        destructive: [
          'border-transparent bg-gradient-to-r from-red-500 to-red-600 text-white',
          'shadow-[0_1px_2px_rgba(239,68,68,0.2)]',
          'hover:shadow-[0_2px_4px_rgba(239,68,68,0.3)]',
          'dark:from-red-500 dark:to-red-600',
        ].join(' '),
        // Refined outline
        outline: [
          'border-gray-300 bg-transparent text-gray-700',
          'hover:bg-gray-50 hover:border-gray-400',
          'dark:border-gray-600 dark:text-gray-300',
          'dark:hover:bg-gray-800 dark:hover:border-gray-500',
        ].join(' '),
        // Success with gradient
        success: [
          'border-transparent bg-gradient-to-r from-emerald-500 to-emerald-600 text-white',
          'shadow-[0_1px_2px_rgba(16,185,129,0.2)]',
          'hover:shadow-[0_2px_4px_rgba(16,185,129,0.3)]',
          'dark:from-emerald-500 dark:to-emerald-600',
        ].join(' '),
        // Warning with gradient
        warning: [
          'border-transparent bg-gradient-to-r from-amber-500 to-amber-600 text-white',
          'shadow-[0_1px_2px_rgba(245,158,11,0.2)]',
          'hover:shadow-[0_2px_4px_rgba(245,158,11,0.3)]',
          'dark:from-amber-500 dark:to-amber-600',
        ].join(' '),
        // NEW: Info variant
        info: [
          'border-transparent bg-gradient-to-r from-cyan-500 to-cyan-600 text-white',
          'shadow-[0_1px_2px_rgba(6,182,212,0.2)]',
          'hover:shadow-[0_2px_4px_rgba(6,182,212,0.3)]',
          'dark:from-cyan-500 dark:to-cyan-600',
        ].join(' '),
        // NEW: Subtle/soft variants for less emphasis
        'subtle-primary': [
          'border-transparent bg-primary/10 text-primary',
          'hover:bg-primary/15',
          'dark:bg-primary/20 dark:text-blue-400',
        ].join(' '),
        'subtle-success': [
          'border-transparent bg-emerald-500/10 text-emerald-700',
          'hover:bg-emerald-500/15',
          'dark:bg-emerald-500/20 dark:text-emerald-400',
        ].join(' '),
        'subtle-warning': [
          'border-transparent bg-amber-500/10 text-amber-700',
          'hover:bg-amber-500/15',
          'dark:bg-amber-500/20 dark:text-amber-400',
        ].join(' '),
        'subtle-destructive': [
          'border-transparent bg-red-500/10 text-red-700',
          'hover:bg-red-500/15',
          'dark:bg-red-500/20 dark:text-red-400',
        ].join(' '),
        // Industrial tag style - bold left bar
        'industrial': [
          'pl-3 pr-2.5 py-1 rounded-sm',
          'bg-slate-100 dark:bg-slate-800',
          'border-l-4 border-primary',
          'font-semibold uppercase tracking-wide text-[10px]',
          'text-slate-700 dark:text-slate-200',
        ].join(' '),
        // Safety badge - high visibility
        'safety': [
          'px-2.5 py-1 rounded-md',
          'bg-gradient-to-r from-amber-400 to-amber-500',
          'text-amber-950 font-bold uppercase tracking-wide text-[10px]',
          'shadow-sm',
          'border border-amber-600/20',
        ].join(' '),
        // Danger industrial - with warning indicator
        'danger-industrial': [
          'pl-3 pr-2.5 py-1 rounded-sm',
          'bg-red-50 dark:bg-red-950/50',
          'border-l-4 border-red-500',
          'font-semibold uppercase tracking-wide text-[10px]',
          'text-red-700 dark:text-red-300',
        ].join(' '),
        // Success industrial
        'success-industrial': [
          'pl-3 pr-2.5 py-1 rounded-sm',
          'bg-emerald-50 dark:bg-emerald-950/50',
          'border-l-4 border-emerald-500',
          'font-semibold uppercase tracking-wide text-[10px]',
          'text-emerald-700 dark:text-emerald-300',
        ].join(' '),
        // Status with dot indicator
        'status-dot': [
          'inline-flex items-center gap-1.5',
          'px-2.5 py-1 rounded-full',
          'bg-slate-100 dark:bg-slate-800',
          'text-slate-700 dark:text-slate-300',
          'text-xs font-medium',
        ].join(' '),
        // Blueprint annotation style
        'blueprint': [
          'px-2 py-0.5 rounded-none',
          'bg-blue-50 dark:bg-blue-950/30',
          'border border-dashed border-blue-300 dark:border-blue-700',
          'text-blue-700 dark:text-blue-300',
          'font-mono text-[10px] uppercase tracking-wider',
        ].join(' '),
        // Overdue/urgent - pulsing attention
        'urgent': [
          'px-2.5 py-1 rounded-md',
          'bg-gradient-to-r from-red-500 to-red-600',
          'text-white font-bold uppercase tracking-wide text-[10px]',
          'shadow-md shadow-red-500/30',
          'animate-pulse',
        ].join(' '),
        // Pending/in-progress with subtle animation
        'in-progress': [
          'px-2.5 py-1 rounded-md',
          'bg-gradient-to-r from-blue-500 to-blue-600',
          'text-white font-semibold uppercase tracking-wide text-[10px]',
          'shadow-sm',
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

// StatusDot component for composing with badges or standalone use
export type StatusDotStatus = 'active' | 'pending' | 'error' | 'success'

export interface StatusDotProps {
  status: StatusDotStatus
  className?: string
}

function StatusDot({ status, className }: StatusDotProps) {
  const colors = {
    active: 'bg-emerald-500',
    pending: 'bg-amber-500',
    error: 'bg-red-500',
    success: 'bg-emerald-500'
  }

  return (
    <span
      className={cn(
        'inline-block w-2 h-2 rounded-full',
        colors[status],
        status === 'active' && 'animate-pulse',
        className
      )}
    />
  )
}

export { Badge, badgeVariants, StatusDot }
