// File: /src/components/ui/input.tsx
// Input component for forms
// Touch-friendly with WCAG-compliant minimum touch targets (44px height)

import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const inputVariants = cva(
  // Base styles with touch-friendly defaults
  'flex w-full rounded-md border border-gray-300 bg-white px-3 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 touch-manipulation dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:ring-offset-gray-950 dark:placeholder:text-gray-400 dark:focus-visible:ring-blue-400',
  {
    variants: {
      inputSize: {
        // Default: 40px height on desktop, 44px on mobile (WCAG compliant)
        default: 'h-10 py-2 min-h-[44px] md:min-h-0',
        // Small: compact for desktop, still touch-friendly on mobile
        sm: 'h-9 py-1.5 text-sm min-h-[44px] md:min-h-0',
        // Large: 48px for prominent inputs
        lg: 'h-12 py-3 text-base min-h-[48px]',
        // Extra large: for primary mobile form inputs
        xl: 'h-14 py-4 text-base min-h-[56px] px-4',
      },
    },
    defaultVariants: {
      inputSize: 'default',
    },
  }
)

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  /** Override the native size attribute if needed */
  htmlSize?: number
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, inputSize, htmlSize, ...props }, ref) => {
    return (
      <input
        type={type}
        size={htmlSize}
        className={cn(inputVariants({ inputSize, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = 'Input'

export { Input, inputVariants }
