// File: /src/components/ui/virtualized-table.tsx
// Virtualized table component for rendering large datasets efficiently
// Phase 2 Performance: Uses @tanstack/react-virtual for smooth 1000+ item rendering

import { useRef, ReactNode } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { cn } from '@/lib/utils'

interface VirtualizedTableProps<T> {
  data: T[]
  columns: {
    key: string
    header: string | ReactNode
    render: (item: T, index: number) => ReactNode
    className?: string
  }[]
  estimatedRowHeight?: number
  className?: string
  headerClassName?: string
  rowClassName?: string | ((item: T, index: number) => string)
  onRowClick?: (item: T, index: number) => void
  emptyMessage?: string
}

export function VirtualizedTable<T>({
  data,
  columns,
  estimatedRowHeight = 73,
  className,
  headerClassName,
  rowClassName,
  onRowClick,
  emptyMessage = 'No data available',
}: VirtualizedTableProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimatedRowHeight,
    overscan: 5, // Render 5 extra items above/below viewport for smoother scrolling
  })

  const items = virtualizer.getVirtualItems()

  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className={cn('overflow-hidden rounded-lg border border-gray-200', className)}>
      {/* Table Header - Fixed */}
      <div className={cn('bg-gray-50 border-b border-gray-200', headerClassName)}>
        <div className="grid" style={{ gridTemplateColumns: columns.map(col => col.className?.includes('w-') ? 'auto' : '1fr').join(' ') }}>
          {columns.map((column) => (
            <div
              key={column.key}
              className={cn(
                'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider',
                column.className
              )}
            >
              {column.header}
            </div>
          ))}
        </div>
      </div>

      {/* Table Body - Virtualized */}
      <div
        ref={parentRef}
        className="overflow-auto"
        style={{ maxHeight: '600px' }}
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {items.map((virtualRow) => {
            const item = data[virtualRow.index]
            const rowClassNameValue = typeof rowClassName === 'function'
              ? rowClassName(item, virtualRow.index)
              : rowClassName

            return (
              <div
                key={virtualRow.key}
                data-index={virtualRow.index}
                ref={virtualizer.measureElement}
                className={cn(
                  'absolute top-0 left-0 w-full border-b border-gray-200 hover:bg-gray-50 transition-colors',
                  onRowClick && 'cursor-pointer',
                  rowClassNameValue
                )}
                style={{
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                onClick={() => onRowClick?.(item, virtualRow.index)}
              >
                <div className="grid" style={{ gridTemplateColumns: columns.map(col => col.className?.includes('w-') ? 'auto' : '1fr').join(' ') }}>
                  {columns.map((column) => (
                    <div
                      key={column.key}
                      className={cn('px-6 py-4', column.className)}
                    >
                      {column.render(item, virtualRow.index)}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// Simplified virtualized list component for card-based layouts
interface VirtualizedListProps<T> {
  data: T[]
  renderItem: (item: T, index: number) => ReactNode
  estimatedItemHeight?: number
  className?: string
  emptyMessage?: string
  maxHeight?: string
}

export function VirtualizedList<T>({
  data,
  renderItem,
  estimatedItemHeight = 100,
  className,
  emptyMessage = 'No items available',
  maxHeight = '600px',
}: VirtualizedListProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimatedItemHeight,
    overscan: 5,
  })

  const items = virtualizer.getVirtualItems()

  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div
      ref={parentRef}
      className={cn('overflow-auto', className)}
      style={{ maxHeight }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {items.map((virtualItem) => {
          const item = data[virtualItem.index]

          return (
            <div
              key={virtualItem.key}
              data-index={virtualItem.index}
              ref={virtualizer.measureElement}
              className="absolute top-0 left-0 w-full"
              style={{
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              {renderItem(item, virtualItem.index)}
            </div>
          )
        })}
      </div>
    </div>
  )
}
