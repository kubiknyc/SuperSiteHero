// File: /src/components/ui/loading-states.tsx
// Comprehensive loading state components for consistent UX patterns

import * as React from 'react'
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button, ButtonProps } from './button'

// ============================================================================
// Types
// ============================================================================

export type LoadingSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

export interface AsyncState<T> {
  data: T | null
  isLoading: boolean
  isError: boolean
  error: Error | null
  refetch?: () => void
}

// ============================================================================
// Spinner Component
// ============================================================================

export interface SpinnerProps {
  size?: LoadingSize
  className?: string
  /** Accessible label for screen readers */
  label?: string
}

const sizeClasses: Record<LoadingSize, string> = {
  xs: 'h-3 w-3',
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
  xl: 'h-8 w-8',
}

/**
 * Animated spinner for inline loading indicators
 */
export function Spinner({ size = 'md', className, label = 'Loading' }: SpinnerProps) {
  return (
    <Loader2
      className={cn('animate-spin text-muted-foreground', sizeClasses[size], className)}
      aria-hidden="true"
    >
      <span className="sr-only">{label}</span>
    </Loader2>
  )
}

// ============================================================================
// LoadingButton Component
// ============================================================================

export interface LoadingButtonProps extends ButtonProps {
  /** Show loading state */
  isLoading?: boolean
  /** Text to show while loading (optional, defaults to children) */
  loadingText?: string
  /** Position of the spinner */
  spinnerPosition?: 'left' | 'right'
  /** Size of the spinner */
  spinnerSize?: LoadingSize
}

/**
 * Button with built-in loading state
 *
 * @example
 * <LoadingButton isLoading={isPending}>
 *   Save Changes
 * </LoadingButton>
 *
 * @example
 * <LoadingButton isLoading={isPending} loadingText="Saving...">
 *   Save Changes
 * </LoadingButton>
 */
export const LoadingButton = React.forwardRef<HTMLButtonElement, LoadingButtonProps>(
  (
    {
      children,
      isLoading = false,
      loadingText,
      spinnerPosition = 'left',
      spinnerSize = 'sm',
      disabled,
      className,
      ...props
    },
    ref
  ) => {
    return (
      <Button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          isLoading && 'cursor-wait',
          className
        )}
        aria-busy={isLoading}
        {...props}
      >
        {isLoading && spinnerPosition === 'left' && (
          <Spinner size={spinnerSize} className="mr-2" />
        )}
        {isLoading && loadingText ? loadingText : children}
        {isLoading && spinnerPosition === 'right' && (
          <Spinner size={spinnerSize} className="ml-2" />
        )}
      </Button>
    )
  }
)
LoadingButton.displayName = 'LoadingButton'

// ============================================================================
// LoadingOverlay Component
// ============================================================================

export interface LoadingOverlayProps {
  /** Show the overlay */
  isLoading: boolean
  /** Content to render behind the overlay */
  children: React.ReactNode
  /** Message to show on overlay */
  message?: string
  /** Use blur effect on content */
  blur?: boolean
  /** Spinner size */
  spinnerSize?: LoadingSize
  className?: string
}

/**
 * Overlay loading state on content
 *
 * @example
 * <LoadingOverlay isLoading={isPending} message="Saving changes...">
 *   <Form>...</Form>
 * </LoadingOverlay>
 */
export function LoadingOverlay({
  isLoading,
  children,
  message,
  blur = true,
  spinnerSize = 'lg',
  className,
}: LoadingOverlayProps) {
  return (
    <div className={cn('relative', className)}>
      {children}
      {isLoading && (
        <div
          className={cn(
            'absolute inset-0 z-50 flex flex-col items-center justify-center',
            'bg-background/80 backdrop-blur-sm',
            blur && 'backdrop-blur-sm'
          )}
          role="status"
          aria-live="polite"
        >
          <Spinner size={spinnerSize} />
          {message && (
            <p className="mt-3 text-sm text-muted-foreground">{message}</p>
          )}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// LoadingCard Component
// ============================================================================

export interface LoadingCardProps {
  /** Show loading state */
  isLoading?: boolean
  /** Content to render */
  children: React.ReactNode
  /** Loading placeholder height */
  minHeight?: string
  className?: string
}

/**
 * Card wrapper with loading state
 */
export function LoadingCard({
  isLoading = false,
  children,
  minHeight = '200px',
  className,
}: LoadingCardProps) {
  if (isLoading) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-lg border border-border bg-card',
          className
        )}
        style={{ minHeight }}
        role="status"
        aria-label="Loading"
      >
        <div className="flex flex-col items-center gap-3">
          <Spinner size="lg" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

// ============================================================================
// AsyncBoundary Component
// ============================================================================

export interface AsyncBoundaryProps<T> {
  /** Async state from React Query or similar */
  state: AsyncState<T>
  /** Render when data is available */
  children: (data: T) => React.ReactNode
  /** Custom loading component */
  loadingFallback?: React.ReactNode
  /** Custom error component */
  errorFallback?: React.ReactNode | ((error: Error, refetch?: () => void) => React.ReactNode)
  /** Custom empty state */
  emptyFallback?: React.ReactNode
  /** Check if data is empty */
  isEmpty?: (data: T) => boolean
  /** Minimum height for loading state */
  minHeight?: string
  className?: string
}

/**
 * Declarative async state boundary
 *
 * @example
 * const { data, isLoading, isError, error, refetch } = useProjects()
 *
 * <AsyncBoundary
 *   state={{ data, isLoading, isError, error, refetch }}
 *   isEmpty={(data) => data.length === 0}
 *   emptyFallback={<EmptyState message="No projects found" />}
 * >
 *   {(projects) => <ProjectList projects={projects} />}
 * </AsyncBoundary>
 */
export function AsyncBoundary<T>({
  state,
  children,
  loadingFallback,
  errorFallback,
  emptyFallback,
  isEmpty,
  minHeight = '200px',
  className,
}: AsyncBoundaryProps<T>) {
  const { data, isLoading, isError, error, refetch } = state

  // Loading state
  if (isLoading) {
    return (
      loadingFallback ?? (
        <div
          className={cn('flex items-center justify-center', className)}
          style={{ minHeight }}
          role="status"
          aria-label="Loading"
        >
          <Spinner size="lg" />
        </div>
      )
    )
  }

  // Error state
  if (isError && error) {
    if (errorFallback) {
      return typeof errorFallback === 'function'
        ? errorFallback(error, refetch)
        : errorFallback
    }

    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center gap-4 rounded-lg border border-destructive/50 bg-destructive/10 p-6',
          className
        )}
        style={{ minHeight }}
        role="alert"
      >
        <AlertCircle className="h-8 w-8 text-destructive" />
        <div className="text-center">
          <p className="font-medium text-destructive">Something went wrong</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {error.message || 'An unexpected error occurred'}
          </p>
        </div>
        {refetch && (
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
        )}
      </div>
    )
  }

  // Empty state
  if (data !== null && isEmpty?.(data)) {
    return emptyFallback ?? null
  }

  // Data available
  if (data !== null) {
    return <>{children(data)}</>
  }

  // No data yet (shouldn't happen if isLoading is handled correctly)
  return null
}

// ============================================================================
// InlineLoading Component
// ============================================================================

export interface InlineLoadingProps {
  /** Loading message */
  message?: string
  /** Size of spinner */
  size?: LoadingSize
  className?: string
}

/**
 * Inline loading indicator for use within text or lists
 */
export function InlineLoading({ message, size = 'sm', className }: InlineLoadingProps) {
  return (
    <span
      className={cn('inline-flex items-center gap-2 text-muted-foreground', className)}
      role="status"
      aria-live="polite"
    >
      <Spinner size={size} />
      {message && <span className="text-sm">{message}</span>}
    </span>
  )
}

// ============================================================================
// FullPageLoading Component
// ============================================================================

export interface FullPageLoadingProps {
  /** Loading message */
  message?: string
  /** Show logo/branding */
  showBranding?: boolean
}

/**
 * Full page loading indicator for route transitions or initial load
 */
export function FullPageLoading({ message = 'Loading...', showBranding = false }: FullPageLoadingProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background"
      role="status"
      aria-live="polite"
    >
      {showBranding && (
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-primary">JobSight</h1>
        </div>
      )}
      <Spinner size="xl" />
      <p className="mt-4 text-muted-foreground">{message}</p>
    </div>
  )
}

// ============================================================================
// LoadingDots Component
// ============================================================================

export interface LoadingDotsProps {
  className?: string
}

/**
 * Animated loading dots for inline or minimal loading indicators
 */
export function LoadingDots({ className }: LoadingDotsProps) {
  return (
    <span className={cn('inline-flex items-center gap-1', className)} role="status" aria-label="Loading">
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.3s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.15s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current" />
    </span>
  )
}

// ============================================================================
// PendingIndicator Component
// ============================================================================

export interface PendingIndicatorProps {
  /** Show pending state */
  isPending: boolean
  /** Position of indicator */
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
  className?: string
}

/**
 * Small pending indicator for optimistic updates
 * Shows a subtle indicator when an item is being synced
 */
export function PendingIndicator({
  isPending,
  position = 'top-right',
  className,
}: PendingIndicatorProps) {
  if (!isPending) {return null}

  const positionClasses = {
    'top-right': 'top-1 right-1',
    'top-left': 'top-1 left-1',
    'bottom-right': 'bottom-1 right-1',
    'bottom-left': 'bottom-1 left-1',
  }

  return (
    <span
      className={cn(
        'absolute flex h-2 w-2',
        positionClasses[position],
        className
      )}
      role="status"
      aria-label="Syncing"
    >
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/50" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
    </span>
  )
}

// ============================================================================
// useLoadingState Hook
// ============================================================================

/**
 * Hook for managing loading states with minimum display time
 * Prevents flash of loading state for fast operations
 */
export function useLoadingState(
  isLoading: boolean,
  minDisplayTime: number = 300
): boolean {
  const [showLoading, setShowLoading] = React.useState(isLoading)
  const loadingStartTime = React.useRef<number | null>(null)

  React.useEffect(() => {
    if (isLoading) {
      loadingStartTime.current = Date.now()
      setShowLoading(true)
    } else if (loadingStartTime.current !== null) {
      const elapsed = Date.now() - loadingStartTime.current
      const remaining = Math.max(0, minDisplayTime - elapsed)

      if (remaining > 0) {
        const timer = setTimeout(() => {
          setShowLoading(false)
          loadingStartTime.current = null
        }, remaining)
        return () => clearTimeout(timer)
      } else {
        setShowLoading(false)
        loadingStartTime.current = null
      }
    }
  }, [isLoading, minDisplayTime])

  return showLoading
}

// ============================================================================
// useDeferredLoading Hook
// ============================================================================

/**
 * Hook that delays showing loading state to prevent flicker
 * Only shows loading if operation takes longer than delay
 */
export function useDeferredLoading(
  isLoading: boolean,
  delay: number = 200
): boolean {
  const [showLoading, setShowLoading] = React.useState(false)

  React.useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => setShowLoading(true), delay)
      return () => clearTimeout(timer)
    } else {
      setShowLoading(false)
    }
  }, [isLoading, delay])

  return showLoading
}
