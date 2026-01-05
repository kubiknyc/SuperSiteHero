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

export { Badge, badgeVariants }
