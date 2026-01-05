// File: /src/components/ui/input.tsx
// Premium Input component with refined focus states and animations
// Touch-friendly with WCAG-compliant minimum touch targets (44px height)

import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const inputVariants = cva(
  // Base styles with premium transitions and focus effects
  [
    'flex w-full rounded-lg border bg-white px-3.5 text-sm text-gray-900',
    'transition-all duration-200 ease-out',
    'placeholder:text-gray-400',
    'file:border-0 file:bg-transparent file:text-sm file:font-medium',
    // Premium focus state with glow
    'focus:outline-none focus:ring-0',
    'focus:border-primary focus:shadow-[0_0_0_3px_rgba(30,64,175,0.1),0_1px_2px_rgba(0,0,0,0.05)]',
    // Hover state
    'hover:border-gray-300',
    // Disabled state
    'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-50',
    // Touch optimization
    'touch-manipulation',
    // Dark mode
    'dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100',
    'dark:placeholder:text-gray-500',
    'dark:hover:border-gray-600',
    'dark:focus:border-primary dark:focus:shadow-[0_0_0_3px_rgba(96,165,250,0.15),0_1px_2px_rgba(0,0,0,0.2)]',
    'dark:disabled:bg-gray-800',
  ].join(' '),
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
      variant: {
        default: 'border-gray-200 dark:border-gray-700',
        // Filled style - subtle background
        filled: [
          'bg-gray-50 border-transparent',
          'hover:bg-gray-100 hover:border-transparent',
          'focus:bg-white focus:border-primary',
          'dark:bg-gray-800 dark:hover:bg-gray-750',
          'dark:focus:bg-gray-900',
        ].join(' '),
        // Ghost style - minimal border until focused
        ghost: [
          'border-transparent bg-transparent',
          'hover:bg-gray-50',
          'focus:bg-white focus:border-primary',
          'dark:hover:bg-gray-800',
          'dark:focus:bg-gray-900',
        ].join(' '),
        // Error state
        error: [
          'border-red-300 bg-red-50/50',
          'focus:border-red-500 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.1)]',
          'dark:border-red-700 dark:bg-red-900/10',
          'dark:focus:border-red-500 dark:focus:shadow-[0_0_0_3px_rgba(248,113,113,0.15)]',
        ].join(' '),
        // Success state
        success: [
          'border-emerald-300 bg-emerald-50/50',
          'focus:border-emerald-500 focus:shadow-[0_0_0_3px_rgba(16,185,129,0.1)]',
          'dark:border-emerald-700 dark:bg-emerald-900/10',
          'dark:focus:border-emerald-500 dark:focus:shadow-[0_0_0_3px_rgba(52,211,153,0.15)]',
        ].join(' '),
      },
    },
    defaultVariants: {
      inputSize: 'default',
      variant: 'default',
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
  ({ className, type, inputSize, variant, htmlSize, ...props }, ref) => {
    return (
      <input
        type={type}
        size={htmlSize}
        className={cn(inputVariants({ inputSize, variant, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = 'Input'

export { Input, inputVariants }
