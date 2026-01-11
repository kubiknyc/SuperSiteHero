// File: /src/components/ui/sortable-list.tsx
// Drag-and-drop sortable list component
// Note: Requires @dnd-kit/core and @dnd-kit/sortable to be installed

import * as React from 'react'
import { GripVertical, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './button'

// ============================================================================
// Types
// ============================================================================

export interface SortableItem {
  id: string
  [key: string]: any
}

export interface SortableListProps<T extends SortableItem> {
  /** Items to display */
  items: T[]
  /** Callback when items are reordered */
  onReorder: (items: T[]) => void
  /** Callback when an item is removed */
  onRemove?: (id: string) => void
  /** Render function for each item */
  renderItem: (item: T, index: number) => React.ReactNode
  /** Custom class name */
  className?: string
  /** Custom item class name */
  itemClassName?: string
  /** Whether to show drag handles */
  showDragHandle?: boolean
  /** Whether to show remove buttons */
  showRemoveButton?: boolean
  /** Whether the list is disabled */
  disabled?: boolean
  /** Empty state message */
  emptyMessage?: string
  /** Orientation */
  direction?: 'vertical' | 'horizontal'
}

// ============================================================================
// Simple Sortable List (using HTML5 drag and drop)
// For more complex use cases, consider using @dnd-kit libraries
// ============================================================================

export function SortableList<T extends SortableItem>({
  items,
  onReorder,
  onRemove,
  renderItem,
  className,
  itemClassName,
  showDragHandle = true,
  showRemoveButton = false,
  disabled = false,
  emptyMessage = 'No items',
  direction = 'vertical',
}: SortableListProps<T>) {
  const [draggedId, setDraggedId] = React.useState<string | null>(null)
  const [dragOverId, setDragOverId] = React.useState<string | null>(null)

  const handleDragStart = (e: React.DragEvent, id: string) => {
    if (disabled) {return}
    setDraggedId(id)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', id)
  }

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault()
    if (disabled || id === draggedId) {return}
    setDragOverId(id)
  }

  const handleDragLeave = () => {
    setDragOverId(null)
  }

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    if (disabled || !draggedId || draggedId === targetId) {
      setDraggedId(null)
      setDragOverId(null)
      return
    }

    const draggedIndex = items.findIndex((item) => item.id === draggedId)
    const targetIndex = items.findIndex((item) => item.id === targetId)

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedId(null)
      setDragOverId(null)
      return
    }

    const newItems = [...items]
    const [removed] = newItems.splice(draggedIndex, 1)
    newItems.splice(targetIndex, 0, removed)

    onReorder(newItems)
    setDraggedId(null)
    setDragOverId(null)
  }

  const handleDragEnd = () => {
    setDraggedId(null)
    setDragOverId(null)
  }

  if (items.length === 0) {
    return (
      <div className={cn('text-center py-8 text-muted-foreground', className)}>
        {emptyMessage}
      </div>
    )
  }

  return (
    <div
      className={cn(
        direction === 'vertical' ? 'flex flex-col gap-2' : 'flex flex-row gap-2 flex-wrap',
        className
      )}
    >
      {items.map((item, index) => (
        <div
          key={item.id}
          draggable={!disabled}
          onDragStart={(e) => handleDragStart(e, item.id)}
          onDragOver={(e) => handleDragOver(e, item.id)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, item.id)}
          onDragEnd={handleDragEnd}
          className={cn(
            'group relative',
            'border rounded-lg bg-card transition-all duration-200',
            draggedId === item.id && 'opacity-50 scale-[0.98]',
            dragOverId === item.id && 'border-primary border-2 bg-primary/5',
            !disabled && 'cursor-grab active:cursor-grabbing',
            disabled && 'opacity-60 cursor-not-allowed',
            itemClassName
          )}
        >
          <div className="flex items-center gap-2 p-2">
            {/* Drag handle */}
            {showDragHandle && !disabled && (
              <div className="flex-shrink-0 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing">
                <GripVertical className="h-5 w-5" />
              </div>
            )}

            {/* Item content */}
            <div className="flex-1 min-w-0">
              {renderItem(item, index)}
            </div>

            {/* Remove button */}
            {showRemoveButton && onRemove && !disabled && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onRemove(item.id)}
                className="flex-shrink-0 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Remove item"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// ============================================================================
// Reorder Helper Functions
// ============================================================================

export function moveItem<T>(array: T[], fromIndex: number, toIndex: number): T[] {
  const newArray = [...array]
  const [removed] = newArray.splice(fromIndex, 1)
  newArray.splice(toIndex, 0, removed)
  return newArray
}

export function moveItemUp<T>(array: T[], index: number): T[] {
  if (index <= 0) {return array}
  return moveItem(array, index, index - 1)
}

export function moveItemDown<T>(array: T[], index: number): T[] {
  if (index >= array.length - 1) {return array}
  return moveItem(array, index, index + 1)
}

export function moveItemToStart<T>(array: T[], index: number): T[] {
  if (index === 0) {return array}
  return moveItem(array, index, 0)
}

export function moveItemToEnd<T>(array: T[], index: number): T[] {
  if (index === array.length - 1) {return array}
  return moveItem(array, index, array.length - 1)
}

// ============================================================================
// Compact Reorder Controls (for items with up/down buttons)
// ============================================================================

export interface ReorderControlsProps {
  index: number
  total: number
  onMoveUp: () => void
  onMoveDown: () => void
  onMoveToStart?: () => void
  onMoveToEnd?: () => void
  disabled?: boolean
  className?: string
}

export function ReorderControls({
  index,
  total,
  onMoveUp,
  onMoveDown,
  onMoveToStart,
  onMoveToEnd,
  disabled = false,
  className,
}: ReorderControlsProps) {
  const canMoveUp = index > 0
  const canMoveDown = index < total - 1

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {onMoveToStart && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onMoveToStart}
          disabled={disabled || !canMoveUp}
          className="h-7 w-7"
          aria-label="Move to start"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 18L11 12L17 6" />
            <path d="M11 18L5 12L11 6" />
          </svg>
        </Button>
      )}
      <Button
        variant="ghost"
        size="icon"
        onClick={onMoveUp}
        disabled={disabled || !canMoveUp}
        className="h-7 w-7"
        aria-label="Move up"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 15L12 9L6 15" />
        </svg>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={onMoveDown}
        disabled={disabled || !canMoveDown}
        className="h-7 w-7"
        aria-label="Move down"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 9L12 15L18 9" />
        </svg>
      </Button>
      {onMoveToEnd && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onMoveToEnd}
          disabled={disabled || !canMoveDown}
          className="h-7 w-7"
          aria-label="Move to end"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M7 18L13 12L7 6" />
            <path d="M13 18L19 12L13 6" />
          </svg>
        </Button>
      )}
    </div>
  )
}

// ============================================================================
// Numbered List Item Wrapper
// ============================================================================

export interface NumberedItemProps {
  number: number
  children: React.ReactNode
  className?: string
}

export function NumberedItem({ number, children, className }: NumberedItemProps) {
  return (
    <div className={cn('flex items-start gap-3', className)}>
      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
        {number}
      </span>
      <div className="flex-1 min-w-0 pt-0.5">{children}</div>
    </div>
  )
}
