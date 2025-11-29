/**
 * Toast Hook
 * Provides a simple toast notification API
 */

import { useState, useCallback } from 'react'

export interface ToastProps {
  title?: string
  description?: string
  variant?: 'default' | 'destructive'
}

export interface ToastState {
  toasts: ToastProps[]
}

export function useToast() {
  const [state, setState] = useState<ToastState>({ toasts: [] })

  const toast = useCallback(({ title, description, variant = 'default' }: ToastProps) => {
    const newToast = { title, description, variant }
    setState((prev) => ({
      toasts: [...prev.toasts, newToast],
    }))

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      setState((prev) => ({
        toasts: prev.toasts.filter((t) => t !== newToast),
      }))
    }, 5000)
  }, [])

  const dismiss = useCallback((index?: number) => {
    if (index !== undefined) {
      setState((prev) => ({
        toasts: prev.toasts.filter((_, i) => i !== index),
      }))
    } else {
      setState({ toasts: [] })
    }
  }, [])

  return {
    ...state,
    toast,
    dismiss,
  }
}
