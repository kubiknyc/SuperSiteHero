// File: /src/components/ui/dialog.tsx
// Dialog (Modal) component using Radix UI primitives

import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cn } from '@/lib/utils'

// Dialog Context - must be defined before Dialog component
const DialogContext = React.createContext<{
  open: boolean
  onOpenChange: (open: boolean) => void
  titleId: string
  descriptionId: string
}>({
  open: false,
  onOpenChange: () => {},
  titleId: '',
  descriptionId: '',
})

// Dialog Root Component
export interface DialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

const Dialog: React.FC<DialogProps> = ({ open, onOpenChange, children }) => {
  const [isOpen, setIsOpen] = React.useState(open ?? false)
  const titleId = React.useId()
  const descriptionId = React.useId()

  React.useEffect(() => {
    if (open !== undefined) {
      setIsOpen(open)
    }
  }, [open])

  const handleOpenChange = (newOpen: boolean) => {
    setIsOpen(newOpen)
    onOpenChange?.(newOpen)
  }

  return (
    <DialogContext.Provider value={{ open: isOpen, onOpenChange: handleOpenChange, titleId, descriptionId }}>
      {children}
    </DialogContext.Provider>
  )
}

const DialogTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }
>(({ onClick, asChild = false, ...props }, ref) => {
  const { onOpenChange } = React.useContext(DialogContext)
  const Comp = asChild ? Slot : 'button'

  return (
    <Comp
      ref={ref}
      onClick={(e) => {
        onOpenChange(true)
        onClick?.(e)
      }}
      {...props}
    />
  )
})
DialogTrigger.displayName = 'DialogTrigger'

const DialogPortal: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { open } = React.useContext(DialogContext)

  if (!open) {return null}

  return (
    <div className="fixed inset-0 z-[60]">
      {children}
    </div>
  )
}

const DialogOverlay = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const { onOpenChange } = React.useContext(DialogContext)

  return (
    <div
      ref={ref}
      className={cn(
        'fixed inset-0 bg-black/50 backdrop-blur-sm',
        className
      )}
      onClick={() => onOpenChange(false)}
      {...props}
    />
  )
})
DialogOverlay.displayName = 'DialogOverlay'

const DialogContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  const { titleId, descriptionId, onOpenChange } = React.useContext(DialogContext)

  // Handle Escape key to close dialog
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onOpenChange(false)
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onOpenChange])

  // Trap focus within dialog
  React.useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement
    return () => {
      previouslyFocused?.focus?.()
    }
  }, [])

  return (
    <DialogPortal>
      <DialogOverlay />
      <div className="flex items-center justify-center min-h-screen p-4 pointer-events-none">
        <div
          ref={ref}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
          className={cn(
            'relative w-full max-w-lg rounded-lg border border-border bg-card p-6 shadow-lg dark:border-border dark:bg-background pointer-events-auto',
            className
          )}
          onClick={(e) => e.stopPropagation()}
          {...props}
        >
          {children}
        </div>
      </div>
    </DialogPortal>
  )
})
DialogContent.displayName = 'DialogContent'

const DialogHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'flex flex-col space-y-1.5 text-center sm:text-left',
      className
    )}
    {...props}
  />
))
DialogHeader.displayName = 'DialogHeader'

const DialogFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2',
      className
    )}
    {...props}
  />
))
DialogFooter.displayName = 'DialogFooter'

const DialogTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => {
  const { titleId } = React.useContext(DialogContext)
  return (
    <h2
      ref={ref}
      id={titleId}
      className={cn(
        'text-lg font-semibold leading-none tracking-tight',
        className
      )}
      {...props}
    />
  )
})
DialogTitle.displayName = 'DialogTitle'

const DialogDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => {
  const { descriptionId } = React.useContext(DialogContext)
  return (
    <p
      ref={ref}
      id={descriptionId}
      className={cn('text-sm text-muted dark:text-disabled', className)}
      {...props}
    />
  )
})
DialogDescription.displayName = 'DialogDescription'

const DialogClose = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }
>(({ onClick, asChild = false, ...props }, ref) => {
  const { onOpenChange } = React.useContext(DialogContext)
  const Comp = asChild ? Slot : 'button'

  return (
    <Comp
      ref={ref}
      onClick={(e) => {
        onOpenChange(false)
        onClick?.(e)
      }}
      {...props}
    />
  )
})
DialogClose.displayName = 'DialogClose'

export {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
}
