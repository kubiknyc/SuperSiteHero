// File: /src/components/ui/badge.tsx
// Badge component for status indicators

import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 dark:ring-offset-gray-950',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-white hover:bg-primary-hover dark:bg-blue-500 dark:hover:bg-primary',
        secondary: 'border-transparent bg-muted text-foreground hover:bg-muted dark:bg-surface dark:text-gray-100 dark:hover:bg-gray-700',
        destructive: 'border-transparent bg-error text-white hover:bg-red-700 dark:bg-red-500 dark:hover:bg-error',
        outline: 'text-foreground border-input dark:text-gray-100 dark:border-gray-700',
        success: 'border-transparent bg-success text-white hover:bg-green-700 dark:bg-green-500 dark:hover:bg-success',
        warning: 'border-transparent bg-warning text-white hover:bg-yellow-600 dark:bg-yellow-600 dark:hover:bg-yellow-700',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
