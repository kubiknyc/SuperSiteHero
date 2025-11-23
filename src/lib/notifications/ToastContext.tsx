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
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

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
    []
  )

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

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

  const value: ToastContextType = {
    toasts,
    addToast,
    removeToast,
    clearAll,
    success,
    error,
    warning,
    info,
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
