/**
 * DestructiveActionDialog Component
 * Confirmation dialog for destructive actions like delete operations
 * Provides consistent UX with warning styling and optional undo support
 */

import * as React from 'react'
import { AlertTriangle, Trash2, XCircle, type LucideIcon } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './dialog'
import { Button } from './button'
import { cn } from '@/lib/utils'

// ============================================================================
// Types
// ============================================================================

export interface DestructiveActionDialogProps {
  /** Whether the dialog is open */
  open: boolean
  /** Callback when dialog should close */
  onOpenChange: (open: boolean) => void
  /** Action title (e.g., "Delete Project") */
  title: string
  /** Description of what will happen */
  description: string
  /** Name of the item being affected */
  itemName?: string
  /** Custom icon to display */
  icon?: LucideIcon
  /** Type of destructive action */
  variant?: 'delete' | 'remove' | 'cancel' | 'destructive'
  /** Primary action button label */
  confirmLabel?: string
  /** Cancel button label */
  cancelLabel?: string
  /** Whether the action is currently processing */
  isLoading?: boolean
  /** Callback when action is confirmed */
  onConfirm: () => void | Promise<void>
  /** Optional callback when action is cancelled */
  onCancel?: () => void
  /** Whether to require typing confirmation */
  requireConfirmation?: boolean
  /** Text user must type to confirm (if requireConfirmation is true) */
  confirmationText?: string
  /** Additional warning message */
  warningMessage?: string
  /** Whether this action is reversible */
  isReversible?: boolean
  /** Children to render in the dialog body */
  children?: React.ReactNode
}

// ============================================================================
// Variant Configuration
// ============================================================================

const VARIANT_CONFIG = {
  delete: {
    icon: Trash2,
    buttonVariant: 'destructive' as const,
    defaultLabel: 'Delete',
    iconColor: 'text-destructive',
    bgColor: 'bg-destructive/10',
  },
  remove: {
    icon: XCircle,
    buttonVariant: 'destructive' as const,
    defaultLabel: 'Remove',
    iconColor: 'text-destructive',
    bgColor: 'bg-destructive/10',
  },
  cancel: {
    icon: XCircle,
    buttonVariant: 'destructive' as const,
    defaultLabel: 'Cancel',
    iconColor: 'text-amber-600',
    bgColor: 'bg-amber-100',
  },
  destructive: {
    icon: AlertTriangle,
    buttonVariant: 'destructive' as const,
    defaultLabel: 'Confirm',
    iconColor: 'text-destructive',
    bgColor: 'bg-destructive/10',
  },
}

// ============================================================================
// Component
// ============================================================================

export function DestructiveActionDialog({
  open,
  onOpenChange,
  title,
  description,
  itemName,
  icon,
  variant = 'delete',
  confirmLabel,
  cancelLabel = 'Cancel',
  isLoading = false,
  onConfirm,
  onCancel,
  requireConfirmation = false,
  confirmationText,
  warningMessage,
  isReversible = false,
  children,
}: DestructiveActionDialogProps) {
  const [confirmInput, setConfirmInput] = React.useState('')
  const [isProcessing, setIsProcessing] = React.useState(false)

  const config = VARIANT_CONFIG[variant]
  const Icon = icon ?? config.icon
  const buttonLabel = confirmLabel ?? config.defaultLabel
  const textToConfirm = confirmationText ?? itemName ?? 'DELETE'

  // Check if confirmation is valid
  const isConfirmationValid = requireConfirmation
    ? confirmInput.toLowerCase() === textToConfirm.toLowerCase()
    : true

  // Reset confirmation input when dialog closes
  React.useEffect(() => {
    if (!open) {
      setConfirmInput('')
    }
  }, [open])

  const handleConfirm = async () => {
    if (!isConfirmationValid) {return}

    setIsProcessing(true)
    try {
      await onConfirm()
      onOpenChange(false)
    } catch {
      // Error handling is expected to be done by the onConfirm callback
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCancel = () => {
    onCancel?.()
    onOpenChange(false)
  }

  const processing = isLoading || isProcessing

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-start gap-4">
            {/* Icon */}
            <div
              className={cn(
                'flex h-12 w-12 shrink-0 items-center justify-center rounded-full',
                config.bgColor
              )}
            >
              <Icon className={cn('h-6 w-6', config.iconColor)} />
            </div>

            <div className="flex-1">
              <DialogTitle className="text-lg">{title}</DialogTitle>
              <DialogDescription className="mt-1">
                {description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          {/* Item name highlight */}
          {itemName && (
            <div className="rounded-md bg-muted p-3">
              <p className="text-sm font-medium text-foreground">{itemName}</p>
            </div>
          )}

          {/* Warning message */}
          {warningMessage && (
            <div className="flex items-start gap-2 rounded-md bg-amber-50 p-3 dark:bg-amber-950/30">
              <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
              <p className="text-sm text-amber-800 dark:text-amber-200">
                {warningMessage}
              </p>
            </div>
          )}

          {/* Reversibility notice */}
          {!isReversible && (
            <p className="text-sm text-muted-foreground">
              This action cannot be undone.
            </p>
          )}

          {/* Confirmation input */}
          {requireConfirmation && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Type <span className="font-mono font-semibold">{textToConfirm}</span> to confirm:
              </p>
              <input
                type="text"
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                placeholder={textToConfirm}
                className={cn(
                  'w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm',
                  'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                  'placeholder:text-muted-foreground'
                )}
                disabled={processing}
                autoComplete="off"
              />
            </div>
          )}

          {/* Custom children */}
          {children}
        </div>

        <DialogFooter className="mt-6 flex-col-reverse gap-2 sm:flex-row sm:gap-2">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={processing}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={config.buttonVariant}
            onClick={handleConfirm}
            disabled={processing || !isConfirmationValid}
          >
            {processing ? 'Processing...' : buttonLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
// Preset Dialogs
// ============================================================================

/** Simple delete confirmation dialog */
export function DeleteConfirmDialog({
  itemType = 'item',
  itemName,
  ...props
}: Omit<DestructiveActionDialogProps, 'title' | 'description' | 'variant'> & {
  itemType?: string
}) {
  return (
    <DestructiveActionDialog
      title={`Delete ${itemType}`}
      description={`Are you sure you want to delete this ${itemType.toLowerCase()}? This action cannot be undone.`}
      itemName={itemName}
      variant="delete"
      {...props}
    />
  )
}

/** Remove from list confirmation dialog */
export function RemoveConfirmDialog({
  itemType = 'item',
  fromContext = 'the list',
  ...props
}: Omit<DestructiveActionDialogProps, 'title' | 'description' | 'variant'> & {
  itemType?: string
  fromContext?: string
}) {
  return (
    <DestructiveActionDialog
      title={`Remove ${itemType}`}
      description={`Are you sure you want to remove this ${itemType.toLowerCase()} from ${fromContext}?`}
      variant="remove"
      isReversible
      {...props}
    />
  )
}

/** Cancel operation confirmation dialog */
export function CancelConfirmDialog({
  operationType = 'operation',
  ...props
}: Omit<DestructiveActionDialogProps, 'title' | 'description' | 'variant'> & {
  operationType?: string
}) {
  return (
    <DestructiveActionDialog
      title={`Cancel ${operationType}`}
      description={`Are you sure you want to cancel this ${operationType.toLowerCase()}? Any unsaved changes will be lost.`}
      variant="cancel"
      confirmLabel="Yes, cancel"
      cancelLabel="No, continue"
      {...props}
    />
  )
}

/** High-stakes confirmation with typing requirement */
export function CriticalConfirmDialog({
  ...props
}: Omit<DestructiveActionDialogProps, 'requireConfirmation'>) {
  return (
    <DestructiveActionDialog
      requireConfirmation
      {...props}
    />
  )
}
