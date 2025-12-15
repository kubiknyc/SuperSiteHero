// File: /src/components/ui/button.tsx
// Button component with variants using class-variance-authority
// Touch-friendly with WCAG-compliant minimum touch targets (44x44px)

import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  // Base styles with touch-friendly defaults
  // Using min-h-[44px] for WCAG 2.1 compliant touch targets on mobile
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none touch-manipulation dark:ring-offset-gray-950',
  {
    variants: {
      variant: {
        default: 'bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-600 active:bg-blue-800 dark:bg-blue-500 dark:hover:bg-blue-600 dark:active:bg-blue-700',
        destructive: 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600 active:bg-red-800 dark:bg-red-500 dark:hover:bg-red-600 dark:active:bg-red-700',
        outline: 'border border-gray-300 bg-white hover:bg-gray-50 text-gray-900 focus-visible:ring-gray-400 active:bg-gray-100 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:hover:bg-gray-800 dark:active:bg-gray-700',
        secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 focus-visible:ring-gray-400 active:bg-gray-300 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700 dark:active:bg-gray-600',
        ghost: 'hover:bg-gray-100 text-gray-900 focus-visible:ring-gray-400 active:bg-gray-200 dark:text-gray-100 dark:hover:bg-gray-800 dark:active:bg-gray-700',
        link: 'text-blue-600 underline-offset-4 hover:underline focus-visible:ring-blue-600 dark:text-blue-400',
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
