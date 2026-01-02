// File: /src/lib/notifications/ToastContext.tsx
// Toast notification context and provider using Sonner
// This provides a unified toast API - prefer importing { toast } from 'sonner' directly

import { createContext, useContext, useCallback, ReactNode } from 'react'
import { toast as sonnerToast, Toaster } from 'sonner'
import { ToastType, ToastOptions } from './types'

interface ToastContextType {
  toasts: never[] // Kept for backward compatibility, but Sonner manages state internally
  addToast: (type: ToastType, title: string, message?: string, options?: ToastOptions) => string
  removeToast: (id: string) => void
  clearAll: () => void
  success: (title: string, message?: string, options?: ToastOptions) => string
  error: (title: string, message?: string, options?: ToastOptions) => string
  warning: (title: string, message?: string, options?: ToastOptions) => string
  info: (title: string, message?: string, options?: ToastOptions) => string
  showToast: (options: { type: ToastType; title: string; message?: string }) => string
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: ReactNode }) {
  const removeToast = useCallback((id: string) => {
    sonnerToast.dismiss(id)
  }, [])

  const addToast = useCallback(
    (type: ToastType, title: string, message?: string, options?: ToastOptions) => {
      const id = `toast-${Date.now()}-${Math.random()}`
      const duration = options?.duration ?? (type === 'error' ? 5000 : 3000)

      const toastOptions = {
        id,
        duration,
        description: message,
        action: options?.action
          ? {
              label: options.action.label,
              onClick: options.action.onClick,
            }
          : undefined,
      }

      switch (type) {
        case 'success':
          sonnerToast.success(title, toastOptions)
          break
        case 'error':
          sonnerToast.error(title, toastOptions)
          break
        case 'warning':
          sonnerToast.warning(title, toastOptions)
          break
        case 'info':
          sonnerToast.info(title, toastOptions)
          break
        default:
          sonnerToast(title, toastOptions)
      }

      return id
    },
    []
  )

  const clearAll = useCallback(() => {
    sonnerToast.dismiss()
  }, [])

  const success = useCallback(
    (title: string, message?: string, options?: ToastOptions) =>
      addToast('success', title, message, options),
    [addToast]
  )

  const error = useCallback(
    (title: string, message?: string, options?: ToastOptions) =>
      addToast('error', title, message, options),
    [addToast]
  )

  const warning = useCallback(
    (title: string, message?: string, options?: ToastOptions) =>
      addToast('warning', title, message, options),
    [addToast]
  )

  const info = useCallback(
    (title: string, message?: string, options?: ToastOptions) =>
      addToast('info', title, message, options),
    [addToast]
  )

  const showToast = useCallback(
    (options: { type: ToastType; title: string; message?: string }) =>
      addToast(options.type, options.title, options.message),
    [addToast]
  )

  const value: ToastContextType = {
    toasts: [], // Sonner manages state internally
    addToast,
    removeToast,
    clearAll,
    success,
    error,
    warning,
    info,
    showToast,
  }

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}

// Export Sonner's Toaster component for use in App.tsx
export { Toaster }

// Re-export toast from sonner for convenience
// This allows direct imports: import { toast } from '@/lib/notifications/ToastContext'
export { toast } from 'sonner'
