// File: /src/lib/notifications/types.ts
// Toast notification types

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: string
  type: ToastType
  title: string
  message?: string
  duration?: number // milliseconds, 0 = persistent
  action?: {
    label: string
    onClick: () => void
  }
  dismissible?: boolean
}

export interface ToastOptions {
  duration?: number
  action?: Toast['action']
}
