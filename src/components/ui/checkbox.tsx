// File: /src/components/ui/checkbox.tsx
// Checkbox component
// Touch-friendly with larger touch target wrapper

import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const checkboxVariants = cva(
  'rounded border-input text-primary focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 touch-manipulation cursor-pointer dark:border-gray-600 dark:bg-surface dark:ring-offset-gray-950 dark:focus:ring-blue-400 dark:checked:bg-blue-500 dark:checked:border-blue-500',
  {
    variants: {
      checkboxSize: {
        // Default: 16px checkbox with 44px touch target on mobile
        default: 'h-4 w-4',
        // Small: 14px checkbox
        sm: 'h-3.5 w-3.5',
        // Large: 20px checkbox for mobile
        lg: 'h-5 w-5',
        // Extra large: 24px checkbox
        xl: 'h-6 w-6',
      },
    },
    defaultVariants: {
      checkboxSize: 'default',
    },
  }
)

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'>,
    VariantProps<typeof checkboxVariants> {
  onCheckedChange?: (checked: boolean) => void
  /** Wrap checkbox in a touch-friendly container */
  touchFriendly?: boolean
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, onCheckedChange, onChange, checkboxSize, touchFriendly = true, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange?.(e)
      onCheckedChange?.(e.target.checked)
    }

    const checkbox = (
      <input
        type="checkbox"
        className={cn(checkboxVariants({ checkboxSize, className }))}
        ref={ref}
        onChange={handleChange}
        {...props}
      />
    )

    // Wrap in touch-friendly container on mobile
    if (touchFriendly) {
      return (
        <span className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0 -m-2 md:m-0 p-2 md:p-0">
          {checkbox}
        </span>
      )
    }

    return checkbox
  }
)
Checkbox.displayName = 'Checkbox'

export { Checkbox, checkboxVariants }
