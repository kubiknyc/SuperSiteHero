// File: /src/components/ui/input.tsx
// Premium Input component with refined focus states and animations
// Touch-friendly with WCAG-compliant minimum touch targets (44px height)

import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const inputVariants = cva(
  // Base styles with premium transitions and focus effects - using semantic CSS variables
  [
    'flex w-full rounded-lg border bg-background px-3.5 text-sm text-foreground',
    'transition-all duration-200 ease-out',
    'placeholder:text-muted-foreground',
    'file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground',
    // Premium focus state with glow
    'focus:outline-none focus:ring-0',
    'focus:border-primary focus:shadow-[0_0_0_3px_hsl(var(--primary)/0.1),0_1px_2px_rgba(0,0,0,0.05)]',
    // Hover state
    'hover:border-input',
    // Disabled state
    'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted',
    // Touch optimization
    'touch-manipulation',
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
        default: 'border-input',
        // Filled style - subtle background
        filled: [
          'bg-muted border-transparent',
          'hover:bg-muted/80 hover:border-transparent',
          'focus:bg-background focus:border-primary',
        ].join(' '),
        // Ghost style - minimal border until focused
        ghost: [
          'border-transparent bg-transparent',
          'hover:bg-muted',
          'focus:bg-background focus:border-primary',
        ].join(' '),
        // Error state
        error: [
          'border-destructive/50 bg-destructive/5',
          'focus:border-destructive focus:shadow-[0_0_0_3px_hsl(var(--destructive)/0.1)]',
        ].join(' '),
        // Success state
        success: [
          'border-success/50 bg-success/5',
          'focus:border-success focus:shadow-[0_0_0_3px_hsl(var(--success)/0.1)]',
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
