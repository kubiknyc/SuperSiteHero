// File: /src/lib/notifications/ToastContext.tsx
// Toast notification context and provider

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { Toast, ToastType, ToastOptions } from './types'

interface ToastContextType {
  toasts: Toast[]
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
  const [toasts, setToasts] = useState<Toast[]>([])

  // Define removeToast before addToast that uses it
  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const addToast = useCallback(
    (type: ToastType, title: string, message?: string, options?: ToastOptions) => {
      const id = `toast-${Date.now()}-${Math.random()}`

      const toast: Toast = {
        id,
        type,
        title,
        message,
        duration: options?.duration ?? (type === 'error' ? 5000 : 3000),
        action: options?.action,
        dismissible: true,
      }

      setToasts((prev) => [...prev, toast])

      // Auto-remove after duration
      if (toast.duration && toast.duration > 0) {
        setTimeout(() => {
          removeToast(id)
        }, toast.duration)
      }

      return id
    },
    [removeToast]
  )

  const clearAll = useCallback(() => {
    setToasts([])
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
    toasts,
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

// Re-export toast from sonner for convenience
// This allows direct imports: import { toast } from '@/lib/notifications/ToastContext'
export { toast } from 'sonner'
