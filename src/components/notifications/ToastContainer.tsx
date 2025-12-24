// File: /src/components/notifications/ToastContainer.tsx
// Toast notification container component

import { useToast } from '@/lib/notifications/ToastContext'
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react'

export function ToastContainer() {
  const { toasts, removeToast } = useToast()

  if (toasts.length === 0) {return null}

  return (
    <div className="fixed bottom-0 right-0 z-50 flex flex-col gap-2 p-4 pointer-events-none">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  )
}

interface ToastProps {
  toast: ReturnType<typeof useToast>['toasts'][0]
  onClose: () => void
}

function Toast({ toast, onClose }: ToastProps) {
  const bgColor = {
    success: 'bg-success-light border-green-200',
    error: 'bg-error-light border-red-200',
    warning: 'bg-warning-light border-yellow-200',
    info: 'bg-blue-50 border-blue-200',
  }[toast.type]

  const textColor = {
    success: 'text-green-900',
    error: 'text-red-900',
    warning: 'text-yellow-900',
    info: 'text-blue-900',
  }[toast.type]

  const iconColor = {
    success: 'text-success',
    error: 'text-error',
    warning: 'text-warning',
    info: 'text-primary',
  }[toast.type]

  const Icon = {
    success: CheckCircle,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info,
  }[toast.type]

  return (
    <div
      className={`
        ${bgColor} border rounded-lg shadow-lg p-4 pointer-events-auto
        max-w-md w-full animate-in fade-in slide-in-from-bottom-4 duration-300
      `}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <Icon className={`${iconColor} w-5 h-5 flex-shrink-0 mt-0.5`} />

        <div className="flex-1 min-w-0">
          <h3 className={`${textColor} font-semibold text-sm mb-1`}>{toast.title}</h3>
          {toast.message && (
            <p className={`${textColor} text-sm opacity-90`}>{toast.message}</p>
          )}

          {toast.action && (
            <button
              onClick={() => {
                toast.action?.onClick()
                onClose()
              }}
              className={`
                mt-2 text-sm font-medium
                ${toast.type === 'success' && 'text-success-dark hover:text-green-900'}
                ${toast.type === 'error' && 'text-error-dark hover:text-red-900'}
                ${toast.type === 'warning' && 'text-yellow-700 hover:text-yellow-900'}
                ${toast.type === 'info' && 'text-primary-hover hover:text-blue-900'}
                underline
              `}
            >
              {toast.action.label}
            </button>
          )}
        </div>

        {toast.dismissible && (
          <button
            onClick={onClose}
            className={`${textColor} opacity-50 hover:opacity-100 flex-shrink-0`}
            aria-label="Close notification"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}
