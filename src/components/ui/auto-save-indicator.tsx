// File: /src/components/ui/auto-save-indicator.tsx
// Auto-save status indicator for forms with unsaved changes warning

import * as React from 'react'
import { Check, Cloud, CloudOff, Loader2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'offline'

export interface AutoSaveIndicatorProps {
  /** Current save status */
  status: SaveStatus
  /** Last saved timestamp */
  lastSaved?: Date | null
  /** Whether there are unsaved changes */
  hasUnsavedChanges?: boolean
  /** Error message to display */
  errorMessage?: string
  /** Custom class name */
  className?: string
  /** Size variant */
  size?: 'sm' | 'default'
  /** Show timestamp */
  showTimestamp?: boolean
}

function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)

  if (diffSecs < 10) return 'Just now'
  if (diffSecs < 60) return `${diffSecs}s ago`
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  return date.toLocaleDateString()
}

const statusConfig = {
  idle: {
    icon: Cloud,
    text: 'Ready',
    className: 'text-muted-foreground',
    iconClassName: '',
  },
  saving: {
    icon: Loader2,
    text: 'Saving...',
    className: 'text-blue-600 dark:text-blue-400',
    iconClassName: 'animate-spin',
  },
  saved: {
    icon: Check,
    text: 'Saved',
    className: 'text-green-600 dark:text-green-400',
    iconClassName: '',
  },
  error: {
    icon: AlertCircle,
    text: 'Save failed',
    className: 'text-destructive',
    iconClassName: '',
  },
  offline: {
    icon: CloudOff,
    text: 'Offline',
    className: 'text-yellow-600 dark:text-yellow-400',
    iconClassName: '',
  },
}

export function AutoSaveIndicator({
  status,
  lastSaved,
  hasUnsavedChanges = false,
  errorMessage,
  className,
  size = 'default',
  showTimestamp = true,
}: AutoSaveIndicatorProps) {
  const config = statusConfig[status]
  const Icon = config.icon

  const sizeClasses = {
    sm: {
      container: 'text-xs gap-1',
      icon: 'h-3 w-3',
    },
    default: {
      container: 'text-sm gap-1.5',
      icon: 'h-4 w-4',
    },
  }

  const sizes = sizeClasses[size]

  // Show unsaved changes indicator
  if (hasUnsavedChanges && status !== 'saving') {
    return (
      <div
        className={cn(
          'inline-flex items-center',
          sizes.container,
          'text-yellow-600 dark:text-yellow-400',
          className
        )}
      >
        <div className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse" />
        <span>Unsaved changes</span>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'inline-flex items-center',
        sizes.container,
        config.className,
        className
      )}
      title={errorMessage || (lastSaved ? `Last saved: ${lastSaved.toLocaleString()}` : undefined)}
    >
      <Icon className={cn(sizes.icon, config.iconClassName)} />
      <span>{config.text}</span>
      {showTimestamp && lastSaved && status === 'saved' && (
        <span className="text-muted-foreground">
          {formatRelativeTime(lastSaved)}
        </span>
      )}
      {status === 'error' && errorMessage && (
        <span className="text-destructive/80">- {errorMessage}</span>
      )}
    </div>
  )
}

// Hook for managing auto-save state
export interface UseAutoSaveOptions {
  /** Function to perform the save */
  onSave: () => Promise<void>
  /** Debounce delay in ms */
  debounceMs?: number
  /** Auto-save on changes */
  autoSave?: boolean
}

export interface UseAutoSaveReturn {
  status: SaveStatus
  lastSaved: Date | null
  hasUnsavedChanges: boolean
  markDirty: () => void
  save: () => Promise<void>
  reset: () => void
}

export function useAutoSave({
  onSave,
  debounceMs = 2000,
  autoSave = true,
}: UseAutoSaveOptions): UseAutoSaveReturn {
  const [status, setStatus] = React.useState<SaveStatus>('idle')
  const [lastSaved, setLastSaved] = React.useState<Date | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = React.useState(false)
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null)

  const save = React.useCallback(async () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }

    setStatus('saving')

    try {
      await onSave()
      setStatus('saved')
      setLastSaved(new Date())
      setHasUnsavedChanges(false)

      // Reset to idle after 3 seconds
      setTimeout(() => {
        setStatus((current) => (current === 'saved' ? 'idle' : current))
      }, 3000)
    } catch (error) {
      setStatus('error')
      console.error('Auto-save failed:', error)
    }
  }, [onSave])

  const markDirty = React.useCallback(() => {
    setHasUnsavedChanges(true)

    if (autoSave) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      timeoutRef.current = setTimeout(save, debounceMs)
    }
  }, [autoSave, debounceMs, save])

  const reset = React.useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    setStatus('idle')
    setHasUnsavedChanges(false)
  }, [])

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  // Handle offline status
  React.useEffect(() => {
    const handleOnline = () => {
      if (status === 'offline') {
        setStatus('idle')
        if (hasUnsavedChanges) {
          save()
        }
      }
    }

    const handleOffline = () => {
      setStatus('offline')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Check initial status
    if (!navigator.onLine) {
      setStatus('offline')
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [status, hasUnsavedChanges, save])

  return {
    status,
    lastSaved,
    hasUnsavedChanges,
    markDirty,
    save,
    reset,
  }
}

// Unsaved changes warning component
export interface UnsavedChangesWarningProps {
  hasUnsavedChanges: boolean
  message?: string
}

export function useUnsavedChangesWarning({
  hasUnsavedChanges,
  message = 'You have unsaved changes. Are you sure you want to leave?',
}: UnsavedChangesWarningProps) {
  React.useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault()
        e.returnValue = message
        return message
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges, message])
}
