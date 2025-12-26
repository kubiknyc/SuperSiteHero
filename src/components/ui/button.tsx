// File: /src/components/ui/button.tsx
// Button component with variants using class-variance-authority
// Touch-friendly with WCAG-compliant minimum touch targets (44x44px)

import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  // Base styles with touch-friendly defaults
  // Using min-h-[44px] for WCAG 2.1 compliant touch targets on mobile
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none touch-manipulation dark:ring-offset-gray-950 dark:focus-visible:outline-primary',
  {
    variants: {
      variant: {
        default: 'bg-primary text-white hover:bg-primary/90 focus-visible:ring-primary active:bg-primary/80 dark:bg-primary dark:hover:bg-primary/90 dark:active:bg-primary/80',
        destructive: 'bg-error text-white hover:bg-red-700 focus-visible:ring-red-600 active:bg-red-800 dark:bg-red-500 dark:hover:bg-error dark:active:bg-red-700',
        outline: 'border border-input bg-card hover:bg-surface text-foreground focus-visible:ring-gray-400 active:bg-muted dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:hover:bg-surface dark:active:bg-gray-700',
        secondary: 'bg-muted text-foreground hover:bg-muted focus-visible:ring-gray-400 active:bg-gray-300 dark:bg-surface dark:text-gray-100 dark:hover:bg-gray-700 dark:active:bg-gray-600',
        ghost: 'hover:bg-muted text-foreground focus-visible:ring-gray-400 active:bg-muted dark:text-gray-100 dark:hover:bg-surface dark:active:bg-gray-700',
        link: 'text-primary underline-offset-4 hover:underline focus-visible:ring-primary dark:text-primary-400',
      },
      size: {
        // Default: 40px height on desktop, 44px on mobile (WCAG compliant)
        default: 'h-10 px-4 py-2 md:h-10 min-h-[44px] md:min-h-0',
        // Small: 36px on desktop, 44px minimum on mobile
        sm: 'h-9 rounded-md px-3 min-h-[44px] md:min-h-0',
        // Large: 44px+ on all devices
        lg: 'h-11 rounded-md px-8 min-h-[48px]',
        // Extra large: 56px for primary mobile actions
        xl: 'h-14 rounded-lg px-10 text-base min-h-[56px]',
        // Icon button: 44x44px minimum
        icon: 'h-10 w-10 min-h-[44px] min-w-[44px]',
        // Icon small: 44x44px on mobile, smaller on desktop
        'icon-sm': 'h-8 w-8 min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0',
        // Icon large: 48x48px
        'icon-lg': 'h-12 w-12 min-h-[48px] min-w-[48px]',
      },
      // Touch size modifier for explicit mobile-first sizing
      touchSize: {
        default: '',
        // Force touch-friendly sizing on all viewports
        touch: 'min-h-[44px] min-w-[44px] p-3',
        // Comfortable touch target
        comfortable: 'min-h-[48px] min-w-[48px] p-4',
        // Large touch target for primary actions
        large: 'min-h-[56px] min-w-[56px] p-4',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      touchSize: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, touchSize, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, touchSize, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
