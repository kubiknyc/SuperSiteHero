/**
 * Alert Dialog Component
 * Based on shadcn/ui AlertDialog pattern
 *
 * Accessibility features:
 * - role="alertdialog" for screen readers
 * - aria-modal="true" to indicate modal behavior
 * - aria-labelledby/aria-describedby for content association
 * - Focus trap to keep keyboard users within the dialog
 * - Escape key to close
 * - Focus restoration on close
 */

import * as React from 'react'
import { cn } from '@/lib/utils'
import { useFocusTrap } from '@/hooks/useFocusTrap'

interface AlertDialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

interface AlertDialogContextValue {
  open: boolean
  onOpenChange: (open: boolean) => void
  titleId: string
  descriptionId: string
}

const AlertDialogContext = React.createContext<AlertDialogContextValue>({
  open: false,
  onOpenChange: () => {},
  titleId: '',
  descriptionId: '',
})

export function AlertDialog({ open = false, onOpenChange = () => {}, children }: AlertDialogProps) {
  const [internalOpen, setInternalOpen] = React.useState(open)
  const titleId = React.useId()
  const descriptionId = React.useId()

  const handleOpenChange = React.useCallback(
    (newOpen: boolean) => {
      setInternalOpen(newOpen)
      onOpenChange(newOpen)
    },
    [onOpenChange]
  )

  React.useEffect(() => {
    setInternalOpen(open)
  }, [open])

  return (
    <AlertDialogContext.Provider value={{ open: internalOpen, onOpenChange: handleOpenChange, titleId, descriptionId }}>
      {children}
    </AlertDialogContext.Provider>
  )
}

export function AlertDialogTrigger({
  children,
  asChild,
}: {
  children: React.ReactNode
  asChild?: boolean
}) {
  const { onOpenChange } = React.useContext(AlertDialogContext)

  const handleClick = () => onOpenChange(true)

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<{ onClick?: () => void }>, {
      onClick: handleClick,
    })
  }

  return <button onClick={handleClick}>{children}</button>
}

export function AlertDialogContent({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  const { open, onOpenChange, titleId, descriptionId } = React.useContext(AlertDialogContext)
  const focusTrapRef = useFocusTrap<HTMLDivElement>({ enabled: open })

  // Handle Escape key
  React.useEffect(() => {
    if (!open) {return}

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onOpenChange(false)
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [open, onOpenChange])

  // Prevent body scroll when open
  React.useEffect(() => {
    if (open) {
      const originalOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = originalOverflow
      }
    }
  }, [open])

  if (!open) {return null}

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 animate-in fade-in-0"
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />
      {/* Dialog */}
      <div
        ref={focusTrapRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className={cn(
          'relative z-50 w-full max-w-lg rounded-lg bg-card p-6 shadow-lg',
          'animate-in fade-in-0 zoom-in-95',
          className
        )}
      >
        {children}
      </div>
    </div>
  )
}

export function AlertDialogHeader({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col space-y-2 text-center sm:text-left', className)}>
      {children}
    </div>
  )
}

export function AlertDialogFooter({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 mt-4', className)}
    >
      {children}
    </div>
  )
}

export function AlertDialogTitle({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  const { titleId } = React.useContext(AlertDialogContext)

  return (
    <h2
      id={titleId}
      className={cn('text-lg font-semibold', className)}
    >
      {children}
    </h2>
  )
}

export function AlertDialogDescription({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  const { descriptionId } = React.useContext(AlertDialogContext)

  return (
    <p
      id={descriptionId}
      className={cn('text-sm text-muted-foreground', className)}
    >
      {children}
    </p>
  )
}

export function AlertDialogAction({
  children,
  className,
  onClick,
  disabled,
}: {
  children: React.ReactNode
  className?: string
  onClick?: () => void
  disabled?: boolean
}) {
  const { onOpenChange } = React.useContext(AlertDialogContext)

  const handleClick = () => {
    onClick?.()
    onOpenChange(false)
  }

  return (
    <button
      className={cn(
        'inline-flex h-10 min-h-[44px] items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground',
        'transition-colors hover:bg-primary/90',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      onClick={handleClick}
      disabled={disabled}
    >
      {children}
    </button>
  )
}

export function AlertDialogCancel({
  children,
  className,
  onClick,
  disabled,
}: {
  children: React.ReactNode
  className?: string
  onClick?: () => void
  disabled?: boolean
}) {
  const { onOpenChange } = React.useContext(AlertDialogContext)

  const handleClick = () => {
    onClick?.()
    onOpenChange(false)
  }

  return (
    <button
      className={cn(
        'inline-flex h-10 min-h-[44px] items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium',
        'transition-colors hover:bg-accent hover:text-accent-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      onClick={handleClick}
      disabled={disabled}
    >
      {children}
    </button>
  )
}
