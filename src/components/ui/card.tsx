// File: /src/components/ui/card.tsx
// Premium Card component with sophisticated shadows and refined styling

import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const cardVariants = cva(
  // Base premium card styles
  [
    'rounded-xl text-gray-950 dark:text-gray-50',
    'transition-all duration-300 ease-out',
  ].join(' '),
  {
    variants: {
      variant: {
        // Default elevated card with layered shadows
        default: [
          'bg-white border border-gray-100',
          'shadow-[0_1px_3px_rgba(0,0,0,0.05),0_1px_2px_rgba(0,0,0,0.03)]',
          'hover:shadow-[0_8px_24px_rgba(0,0,0,0.08),0_4px_8px_rgba(0,0,0,0.04)]',
          'hover:-translate-y-1 hover:border-gray-200/80',
          'dark:bg-gray-900 dark:border-gray-800',
          'dark:shadow-[0_1px_3px_rgba(0,0,0,0.2),0_1px_2px_rgba(0,0,0,0.15)]',
          'dark:hover:shadow-[0_8px_32px_rgba(0,0,0,0.35),0_4px_12px_rgba(0,0,0,0.2)]',
          'dark:hover:border-gray-700',
        ].join(' '),
        // Subtle flat card - minimal elevation
        flat: [
          'bg-gray-50 border border-gray-100',
          'hover:bg-white hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)]',
          'dark:bg-gray-900/50 dark:border-gray-800',
          'dark:hover:bg-gray-900 dark:hover:shadow-[0_2px_12px_rgba(0,0,0,0.2)]',
        ].join(' '),
        // Interactive card with glow on hover
        interactive: [
          'bg-white border border-gray-100 cursor-pointer',
          'shadow-[0_1px_3px_rgba(0,0,0,0.05)]',
          'hover:shadow-[0_8px_24px_rgba(30,64,175,0.1),0_4px_8px_rgba(0,0,0,0.04)]',
          'hover:-translate-y-1 hover:border-primary/20',
          'active:translate-y-0 active:shadow-[0_2px_4px_rgba(0,0,0,0.04)]',
          'dark:bg-gray-900 dark:border-gray-800',
          'dark:hover:shadow-[0_8px_32px_rgba(96,165,250,0.15),0_4px_12px_rgba(0,0,0,0.2)]',
          'dark:hover:border-primary/30',
        ].join(' '),
        // Ghost/transparent card
        ghost: [
          'bg-transparent border border-transparent',
          'hover:bg-gray-50 hover:border-gray-100',
          'dark:hover:bg-gray-800/50 dark:hover:border-gray-700',
        ].join(' '),
        // Glass morphism card
        glass: [
          'bg-white/70 backdrop-blur-xl border border-white/20',
          'shadow-[0_4px_24px_rgba(0,0,0,0.06)]',
          'hover:bg-white/80 hover:shadow-[0_8px_32px_rgba(0,0,0,0.08)]',
          'dark:bg-gray-900/70 dark:border-gray-700/30',
          'dark:hover:bg-gray-900/80',
        ].join(' '),
        // Highlighted/featured card
        featured: [
          'bg-gradient-to-br from-white to-gray-50 border border-primary/20',
          'shadow-[0_4px_16px_rgba(30,64,175,0.08),0_2px_4px_rgba(0,0,0,0.04)]',
          'hover:shadow-[0_12px_32px_rgba(30,64,175,0.12),0_4px_8px_rgba(0,0,0,0.04)]',
          'hover:-translate-y-1 hover:border-primary/30',
          'dark:from-gray-900 dark:to-gray-900/90 dark:border-primary/30',
          'dark:shadow-[0_4px_24px_rgba(96,165,250,0.1)]',
          'dark:hover:shadow-[0_12px_40px_rgba(96,165,250,0.18)]',
        ].join(' '),
      },
      padding: {
        default: '',
        none: 'p-0',
        sm: 'p-4',
        md: 'p-6',
        lg: 'p-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      padding: 'default',
    },
  }
)

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, padding, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ variant, padding, className }))}
      {...props}
    />
  )
)
Card.displayName = 'Card'

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex flex-col space-y-1.5 p-6', className)}
    {...props}
  />
))
CardHeader.displayName = 'CardHeader'

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      'text-xl font-semibold leading-tight tracking-tight text-gray-900 dark:text-gray-50',
      className
    )}
    {...props}
  />
))
CardTitle.displayName = 'CardTitle'

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-gray-500 dark:text-gray-400 leading-relaxed', className)}
    {...props}
  />
))
CardDescription.displayName = 'CardDescription'

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
))
CardContent.displayName = 'CardContent'

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex items-center p-6 pt-0', className)}
    {...props}
  />
))
CardFooter.displayName = 'CardFooter'

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent, cardVariants }
