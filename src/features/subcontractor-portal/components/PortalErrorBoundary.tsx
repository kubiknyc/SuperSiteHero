/**
 * Portal Error Boundary
 * Construction-themed error fallback for the Subcontractor Portal
 */

import { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { HardHat, RefreshCw, Home, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LocalErrorBoundary } from '@/components/errors/LocalErrorBoundary'

interface PortalErrorFallbackProps {
  error?: Error
  resetError?: () => void
}

/**
 * Construction-themed error fallback component
 */
export function PortalErrorFallback({ error, resetError }: PortalErrorFallbackProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-6 text-center">
      {/* Construction-themed icon */}
      <div className={cn(
        'w-20 h-20 rounded-2xl flex items-center justify-center mb-6',
        'bg-gradient-to-br from-warning/20 via-warning/10 to-transparent',
        'border border-warning/20'
      )}>
        <div className="relative">
          <HardHat className="h-10 w-10 text-warning" />
          <AlertTriangle className="h-4 w-4 text-destructive absolute -bottom-1 -right-1" />
        </div>
      </div>

      <h2 className="heading-section text-foreground mb-2">
        Work Zone Ahead
      </h2>
      <p className="text-muted-foreground text-sm mb-6 max-w-md leading-relaxed">
        We encountered an unexpected issue loading this section.
        Don&apos;t worry, your data is safe. Try refreshing or head back to the dashboard.
      </p>

      <div className="flex gap-3">
        {resetError && (
          <Button onClick={resetError} variant="outline" size="sm" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>
        )}
        <Button asChild size="sm" className="gap-2">
          <Link to="/sub">
            <Home className="h-4 w-4" />
            Dashboard
          </Link>
        </Button>
      </div>

      {/* Error details in development */}
      {import.meta.env.DEV && error && (
        <details className="mt-8 text-xs text-left w-full max-w-lg">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors">
            Error details (dev only)
          </summary>
          <pre className={cn(
            'mt-2 p-4 rounded-lg text-xs overflow-auto max-h-40',
            'bg-muted/50 border border-border font-mono'
          )}>
            {error.message}
            {'\n\n'}
            {error.stack}
          </pre>
        </details>
      )}
    </div>
  )
}

interface PortalErrorBoundaryProps {
  children: ReactNode
  /** Optional callback when error occurs for logging/analytics */
  onError?: (error: Error) => void
}

/**
 * Error boundary wrapper for Subcontractor Portal pages
 * Provides a construction-themed fallback UI with recovery options
 */
export function PortalErrorBoundary({ children, onError }: PortalErrorBoundaryProps) {
  return (
    <LocalErrorBoundary
      fallback={<PortalErrorFallback />}
      onError={(error, errorInfo) => {
        // Log error for debugging
        console.error('Portal Error:', error, errorInfo)
        onError?.(error)
      }}
    >
      {children}
    </LocalErrorBoundary>
  )
}

export default PortalErrorBoundary
