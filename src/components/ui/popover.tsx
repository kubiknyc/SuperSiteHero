// File: /src/components/ui/popover.tsx
// Popover component

import * as React from 'react'
import { cn } from '@/lib/utils'

interface PopoverProps {
  children: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

const PopoverContext = React.createContext<{
  open: boolean
  setOpen: (open: boolean) => void
}>({
  open: false,
  setOpen: () => {},
})

export function Popover({ children, open: controlledOpen, onOpenChange }: PopoverProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false)

  const open = controlledOpen !== undefined ? controlledOpen : uncontrolledOpen
  const setOpen = React.useCallback(
    (value: boolean) => {
      if (controlledOpen === undefined) {
        setUncontrolledOpen(value)
      }
      onOpenChange?.(value)
    },
    [controlledOpen, onOpenChange]
  )

  return (
    <PopoverContext.Provider value={{ open, setOpen }}>
      <div className="relative inline-block">{children}</div>
    </PopoverContext.Provider>
  )
}

interface PopoverTriggerProps {
  children: React.ReactNode
  asChild?: boolean
  className?: string
}

export function PopoverTrigger({ children, asChild, className }: PopoverTriggerProps) {
  const { open, setOpen } = React.useContext(PopoverContext)

  const handleClick = () => {
    setOpen(!open)
  }

  if (asChild && React.isValidElement<{ onClick?: (e: React.MouseEvent) => void }>(children)) {
    return React.cloneElement(children, {
      onClick: (e: React.MouseEvent) => {
        children.props.onClick?.(e)
        handleClick()
      },
    })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn('inline-flex items-center', className)}
    >
      {children}
    </button>
  )
}

interface PopoverContentProps {
  children: React.ReactNode
  className?: string
  align?: 'start' | 'center' | 'end'
  side?: 'top' | 'right' | 'bottom' | 'left'
}

export function PopoverContent({
  children,
  className,
  align = 'center',
  side = 'bottom',
}: PopoverContentProps) {
  const { open, setOpen } = React.useContext(PopoverContext)
  const ref = React.useRef<HTMLDivElement>(null)

  // Close on outside click
  React.useEffect(() => {
    if (!open) {return}

    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open, setOpen])

  // Close on escape key
  React.useEffect(() => {
    if (!open) {return}

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [open, setOpen])

  if (!open) {return null}

  const alignmentClasses = {
    start: 'left-0',
    center: 'left-1/2 -translate-x-1/2',
    end: 'right-0',
  }

  const sideClasses = {
    top: 'bottom-full mb-2',
    bottom: 'top-full mt-2',
    left: 'right-full mr-2',
    right: 'left-full ml-2',
  }

  return (
    <div
      ref={ref}
      className={cn(
        'absolute z-50 w-72 rounded-md border border-border bg-card p-4 shadow-lg outline-none dark:border-border dark:bg-background dark:text-gray-100',
        sideClasses[side],
        alignmentClasses[align],
        className
      )}
    >
      {children}
    </div>
  )
}
