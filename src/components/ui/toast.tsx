// File: /src/components/ui/toast.tsx
// Toast notification component with animations and semantic variants

import * as React from 'react'
import { cn } from '@/lib/utils'
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react'

// ============================================================================
// Toast Component
// ============================================================================

type ToastVariant = 'default' | 'destructive' | 'success' | 'warning' | 'info'

type ToastProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: ToastVariant
  /** Show icon based on variant */
  showIcon?: boolean
  /** Callback when close button is clicked */
  onClose?: () => void
}

const variantConfig = {
  default: {
    styles: 'bg-card border-border text-card-foreground',
    icon: null,
  },
  destructive: {
    styles: 'bg-destructive/10 border-destructive/50 text-destructive',
    icon: AlertCircle,
  },
  success: {
    styles: 'bg-success/10 border-success/50 text-success',
    icon: CheckCircle2,
  },
  warning: {
    styles: 'bg-warning/10 border-warning/50 text-warning',
    icon: AlertTriangle,
  },
  info: {
    styles: 'bg-info/10 border-info/50 text-info',
    icon: Info,
  },
}

const Toast = React.forwardRef<HTMLDivElement, ToastProps>(
  ({ className, variant = 'default', showIcon = true, onClose, children, ...props }, ref) => {
    const config = variantConfig[variant]
    const Icon = config.icon

    return (
      <div
        ref={ref}
        role="alert"
        aria-live="polite"
        className={cn(
          'pointer-events-auto flex w-full max-w-md rounded-lg border p-4 shadow-lg',
          'animate-in slide-in-from-bottom-5 fade-in-0 duration-300',
          'data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right-full data-[state=closed]:fade-out-0',
          config.styles,
          className
        )}
        {...props}
      >
        {showIcon && Icon && (
          <Icon className="h-5 w-5 flex-shrink-0 mr-3 mt-0.5" />
        )}
        <div className="flex-1">{children}</div>
        {onClose && (
          <button
            onClick={onClose}
            className={cn(
              'ml-4 rounded-md p-1 transition-colors',
              'opacity-70 hover:opacity-100',
              'focus:outline-none focus:ring-2 focus:ring-ring'
            )}
            aria-label="Close notification"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    )
  }
)
Toast.displayName = 'Toast'

// ============================================================================
// Toast Sub-components
// ============================================================================

const ToastTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn('text-sm font-semibold', className)}
    {...props}
  />
))
ToastTitle.displayName = 'ToastTitle'

const ToastDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm opacity-90 mt-1', className)}
    {...props}
  />
))
ToastDescription.displayName = 'ToastDescription'

const ToastAction = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, ...props }, ref) => (
  <button
    ref={ref}
    className={cn(
      'mt-2 inline-flex items-center justify-center rounded-md px-3 py-1.5',
      'text-xs font-medium transition-colors',
      'bg-background/50 hover:bg-background',
      'focus:outline-none focus:ring-2 focus:ring-ring',
      className
    )}
    {...props}
  />
))
ToastAction.displayName = 'ToastAction'

// ============================================================================
// Toast Provider and Hook
// ============================================================================

type ToastType = {
  id: string
  title?: string
  description?: string
  variant?: ToastVariant
  /** Auto-dismiss duration in ms (default: 5000, set to 0 to disable) */
  duration?: number
  /** Action button */
  action?: {
    label: string
    onClick: () => void
  }
}

type ToastContextType = {
  toasts: ToastType[]
  addToast: (toast: Omit<ToastType, 'id'>) => string
  removeToast: (id: string) => void
  /** Convenience methods */
  success: (title: string, description?: string) => string
  error: (title: string, description?: string) => string
  warning: (title: string, description?: string) => string
  info: (title: string, description?: string) => string
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined)

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = React.useState<ToastType[]>([])
  const timeoutsRef = React.useRef<Map<string, NodeJS.Timeout>>(new Map())

  const removeToast = React.useCallback((id: string) => {
    // Clear any existing timeout
    const timeout = timeoutsRef.current.get(id)
    if (timeout) {
      clearTimeout(timeout)
      timeoutsRef.current.delete(id)
    }
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const addToast = React.useCallback((toast: Omit<ToastType, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9)
    const duration = toast.duration ?? 5000

    setToasts((prev) => [...prev, { ...toast, id }])

    // Auto-remove after duration (if not 0)
    if (duration > 0) {
      const timeout = setTimeout(() => {
        removeToast(id)
      }, duration)
      timeoutsRef.current.set(id, timeout)
    }

    return id
  }, [removeToast])

  // Convenience methods
  const success = React.useCallback((title: string, description?: string) => {
    return addToast({ title, description, variant: 'success' })
  }, [addToast])

  const error = React.useCallback((title: string, description?: string) => {
    return addToast({ title, description, variant: 'destructive', duration: 8000 })
  }, [addToast])

  const warning = React.useCallback((title: string, description?: string) => {
    return addToast({ title, description, variant: 'warning' })
  }, [addToast])

  const info = React.useCallback((title: string, description?: string) => {
    return addToast({ title, description, variant: 'info' })
  }, [addToast])

  // Cleanup timeouts on unmount
  React.useEffect(() => {
    return () => {
      timeoutsRef.current.forEach((timeout) => clearTimeout(timeout))
    }
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, success, error, warning, info }}>
      {children}
      <div
        className={cn(
          'fixed bottom-0 right-0 z-50 flex max-h-screen w-full flex-col-reverse gap-2 p-4',
          'sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]'
        )}
        role="region"
        aria-label="Notifications"
      >
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            variant={toast.variant}
            onClose={() => removeToast(toast.id)}
          >
            <div>
              {toast.title && <ToastTitle>{toast.title}</ToastTitle>}
              {toast.description && (
                <ToastDescription>{toast.description}</ToastDescription>
              )}
              {toast.action && (
                <ToastAction onClick={toast.action.onClick}>
                  {toast.action.label}
                </ToastAction>
              )}
            </div>
          </Toast>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => {
  const context = React.useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}

export { Toast, ToastTitle, ToastDescription, ToastAction }
export type { ToastVariant, ToastType }
