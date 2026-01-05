// File: /src/components/ui/button.tsx
// Button component with variants using class-variance-authority
// Touch-friendly with WCAG-compliant minimum touch targets (44x44px)

import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  // Base styles with touch-friendly defaults and premium transitions
  // Using min-h-[44px] for WCAG 2.1 compliant touch targets on mobile
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-all duration-200 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none touch-manipulation dark:ring-offset-gray-950 dark:focus-visible:outline-primary relative overflow-hidden',
  {
    variants: {
      variant: {
        // Premium default with gradient, shadow, and glow
        default: [
          'bg-gradient-to-b from-primary to-primary/90 text-white',
          'shadow-[0_1px_3px_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.1)]',
          'hover:shadow-[0_4px_12px_rgba(30,64,175,0.25),0_2px_4px_rgba(0,0,0,0.1)]',
          'hover:from-primary/95 hover:to-primary/85 hover:-translate-y-0.5',
          'active:translate-y-0 active:shadow-[0_1px_2px_rgba(0,0,0,0.1)]',
          'focus-visible:ring-primary',
          'dark:from-primary dark:to-primary/80',
          'dark:hover:shadow-[0_4px_20px_rgba(96,165,250,0.3),0_2px_4px_rgba(0,0,0,0.2)]',
        ].join(' '),
        // Destructive with red gradient and glow
        destructive: [
          'bg-gradient-to-b from-red-500 to-red-600 text-white',
          'shadow-[0_1px_3px_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.1)]',
          'hover:shadow-[0_4px_12px_rgba(239,68,68,0.3),0_2px_4px_rgba(0,0,0,0.1)]',
          'hover:from-red-400 hover:to-red-500 hover:-translate-y-0.5',
          'active:translate-y-0 active:shadow-[0_1px_2px_rgba(0,0,0,0.1)]',
          'focus-visible:ring-red-500',
          'dark:from-red-500 dark:to-red-600',
          'dark:hover:shadow-[0_4px_20px_rgba(248,113,113,0.35)]',
        ].join(' '),
        // Refined outline with subtle hover glow
        outline: [
          'border-2 border-gray-200 bg-white text-gray-700',
          'shadow-[0_1px_2px_rgba(0,0,0,0.04)]',
          'hover:border-primary/50 hover:bg-primary/5 hover:text-primary',
          'hover:shadow-[0_2px_8px_rgba(30,64,175,0.1)]',
          'active:bg-primary/10',
          'focus-visible:ring-gray-400',
          'dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100',
          'dark:hover:border-primary/50 dark:hover:bg-primary/10',
          'dark:hover:shadow-[0_2px_12px_rgba(96,165,250,0.15)]',
        ].join(' '),
        // Secondary with refined muted styling
        secondary: [
          'bg-gray-100 text-gray-700',
          'shadow-[0_1px_2px_rgba(0,0,0,0.04)]',
          'hover:bg-gray-200/80 hover:shadow-[0_2px_4px_rgba(0,0,0,0.06)]',
          'active:bg-gray-200',
          'focus-visible:ring-gray-400',
          'dark:bg-gray-800 dark:text-gray-100',
          'dark:hover:bg-gray-700 dark:hover:shadow-[0_2px_8px_rgba(0,0,0,0.2)]',
        ].join(' '),
        // Ghost with smooth transitions
        ghost: [
          'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
          'active:bg-gray-200',
          'focus-visible:ring-gray-400',
          'dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-gray-100',
        ].join(' '),
        // Premium link with animated underline
        link: [
          'text-primary underline-offset-4 hover:underline',
          'focus-visible:ring-primary',
          'dark:text-blue-400',
        ].join(' '),
        // NEW: Success variant
        success: [
          'bg-gradient-to-b from-emerald-500 to-emerald-600 text-white',
          'shadow-[0_1px_3px_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.1)]',
          'hover:shadow-[0_4px_12px_rgba(16,185,129,0.3),0_2px_4px_rgba(0,0,0,0.1)]',
          'hover:from-emerald-400 hover:to-emerald-500 hover:-translate-y-0.5',
          'active:translate-y-0',
          'focus-visible:ring-emerald-500',
        ].join(' '),
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
