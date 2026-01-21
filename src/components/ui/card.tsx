// File: /src/components/ui/card.tsx
// Premium Card component with sophisticated shadows and refined styling

import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const cardVariants = cva(
  // Base premium card styles - using semantic CSS variables
  `rounded-xl text-card-foreground transition-all duration-300 ease-out`,
  {
    variants: {
      variant: {
        /** Default elevated card with layered shadows */
        default: `
          bg-card border border-border
          shadow-[0_1px_3px_rgba(0,0,0,0.05),0_1px_2px_rgba(0,0,0,0.03)]
          hover:shadow-[0_8px_24px_rgba(0,0,0,0.08),0_4px_8px_rgba(0,0,0,0.04)]
          hover:-translate-y-1 hover:border-border/80
          dark:shadow-[0_1px_3px_rgba(0,0,0,0.2),0_1px_2px_rgba(0,0,0,0.15)]
          dark:hover:shadow-[0_8px_32px_rgba(0,0,0,0.35),0_4px_12px_rgba(0,0,0,0.2)]
        `,
        /** Subtle flat card - minimal elevation */
        flat: `
          bg-muted border border-border
          hover:bg-card hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)]
          dark:hover:shadow-[0_2px_12px_rgba(0,0,0,0.2)]
        `,
        /** Interactive card with glow on hover */
        interactive: `
          bg-card border border-border cursor-pointer
          shadow-[0_1px_3px_rgba(0,0,0,0.05)]
          hover:shadow-[0_8px_24px_rgba(30,64,175,0.1),0_4px_8px_rgba(0,0,0,0.04)]
          hover:-translate-y-1 hover:border-primary/20
          active:translate-y-0 active:shadow-[0_2px_4px_rgba(0,0,0,0.04)]
          dark:hover:shadow-[0_8px_32px_rgba(96,165,250,0.15),0_4px_12px_rgba(0,0,0,0.2)]
          dark:hover:border-primary/30
        `,
        /** Ghost/transparent card */
        ghost: `
          bg-transparent border border-transparent
          hover:bg-muted hover:border-border
        `,
        /** Glass morphism card - uses CSS utility class */
        glass: 'glass-card',
        /** Highlighted/featured card */
        featured: `
          bg-gradient-to-br from-card to-muted border border-primary/20
          shadow-[0_4px_16px_rgba(30,64,175,0.08),0_2px_4px_rgba(0,0,0,0.04)]
          hover:shadow-[0_12px_32px_rgba(30,64,175,0.12),0_4px_8px_rgba(0,0,0,0.04)]
          hover:-translate-y-1 hover:border-primary/30
          dark:border-primary/30
          dark:shadow-[0_4px_24px_rgba(96,165,250,0.1)]
          dark:hover:shadow-[0_12px_40px_rgba(96,165,250,0.18)]
        `,
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
      'text-xl font-semibold leading-tight tracking-tight text-foreground',
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
    className={cn('text-sm text-muted-foreground leading-relaxed', className)}
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
