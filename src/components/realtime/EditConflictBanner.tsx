// File: src/components/realtime/EditConflictBanner.tsx
// Banner component shown when another user updates a record while editing

import { AlertTriangle, RefreshCw, X, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface EditConflictBannerProps {
  /** Message to show (optional, defaults to generic message) */
  message?: string
  /** Who made the update (optional) */
  updatedBy?: string
  /** Callback to accept server changes and refresh form */
  onAcceptServer: () => void
  /** Callback to keep local changes (will overwrite server on save) */
  onKeepLocal: () => void
  /** Callback to dismiss the banner without action */
  onDismiss?: () => void
  /** Additional CSS classes */
  className?: string
}

/**
 * Banner shown in edit dialogs when another user updates the same record.
 * Provides options to:
 * - Accept server changes (refresh form with latest data)
 * - Keep local changes (will overwrite on save)
 * - Dismiss (continue editing, reminder stays visible)
 */
export function EditConflictBanner({
  message,
  updatedBy,
  onAcceptServer,
  onKeepLocal,
  onDismiss,
  className,
}: EditConflictBannerProps) {
  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 rounded-lg',
        'bg-warning-light border border-amber-300 dark:bg-amber-950/40 dark:border-amber-700',
        className
      )}
      role="alert"
    >
      <div className="flex items-center gap-2 flex-1">
        <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
            {message || 'This record was updated by another user'}
          </p>
          {updatedBy && (
            <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-0.5">
              <Users className="h-3 w-3" />
              Updated by {updatedBy}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onAcceptServer}
          className="text-xs border-amber-400 hover:bg-amber-100 dark:border-amber-600 dark:hover:bg-amber-900"
        >
          <RefreshCw className="h-3 w-3 mr-1" />
          Load Latest
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={onKeepLocal}
          className="text-xs hover:bg-amber-100 dark:hover:bg-amber-900"
        >
          Keep Mine
        </Button>
        {onDismiss && (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={onDismiss}
            className="h-6 w-6 hover:bg-amber-100 dark:hover:bg-amber-900"
          >
            <X className="h-3 w-3" />
            <span className="sr-only">Dismiss</span>
          </Button>
        )}
      </div>
    </div>
  )
}

/**
 * Compact inline version for smaller forms
 */
export function EditConflictInline({
  onAcceptServer,
  onKeepLocal,
  className,
}: Pick<EditConflictBannerProps, 'onAcceptServer' | 'onKeepLocal' | 'className'>) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 text-xs text-warning px-2 py-1 rounded bg-warning-light/50',
        className
      )}
    >
      <AlertTriangle className="h-3 w-3" />
      <span>Updated by another user</span>
      <button
        type="button"
        onClick={onAcceptServer}
        className="underline hover:no-underline font-medium"
      >
        Refresh
      </button>
      <span className="text-muted">or</span>
      <button
        type="button"
        onClick={onKeepLocal}
        className="underline hover:no-underline"
      >
        keep yours
      </button>
    </div>
  )
}
