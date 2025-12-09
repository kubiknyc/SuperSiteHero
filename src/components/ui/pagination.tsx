/**
 * Pagination Component
 * UI controls for navigating paginated lists
 * Phase 3: Server-side pagination UI
 */

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { Button } from './button'
import { NativeSelect as Select } from './select'
import { cn } from '@/lib/utils'

export interface PaginationProps {
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
  canNextPage?: boolean
  canPreviousPage?: boolean
  className?: string
  showPageSizeSelector?: boolean
  pageSizeOptions?: number[]
}

/**
 * Pagination Component
 *
 * @example
 * <Pagination
 *   page={0}
 *   pageSize={20}
 *   totalCount={150}
 *   totalPages={8}
 *   onPageChange={handlePageChange}
 *   onPageSizeChange={handlePageSizeChange}
 *   showPageSizeSelector
 * />
 */
export function Pagination({
  page,
  pageSize,
  totalCount,
  totalPages,
  onPageChange,
  onPageSizeChange,
  canNextPage = page < totalPages - 1,
  canPreviousPage = page > 0,
  className,
  showPageSizeSelector = true,
  pageSizeOptions = [10, 20, 50, 100],
}: PaginationProps) {
  const startItem = page * pageSize + 1
  const endItem = Math.min((page + 1) * pageSize, totalCount)

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-4 px-4 py-3 border-t border-gray-200',
        className
      )}
    >
      {/* Page size selector */}
      {showPageSizeSelector && (
        <div className="flex items-center gap-2">
          <label htmlFor="page-size" className="text-sm text-gray-600">
            Items per page:
          </label>
          <Select
            id="page-size"
            value={pageSize.toString()}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onPageSizeChange(Number(e.target.value))}
            className="w-20"
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </Select>
        </div>
      )}

      {/* Item count display */}
      <div className="text-sm text-gray-600">
        {totalCount === 0 ? (
          <span>No items</span>
        ) : (
          <span>
            Showing <span className="font-medium">{startItem}</span> to{' '}
            <span className="font-medium">{endItem}</span> of{' '}
            <span className="font-medium">{totalCount}</span> items
          </span>
        )}
      </div>

      {/* Page navigation */}
      <div className="flex items-center gap-1">
        {/* First page button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(0)}
          disabled={!canPreviousPage}
          title="First page"
          className="h-9 w-9 p-0"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>

        {/* Previous page button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={!canPreviousPage}
          title="Previous page"
          className="h-9 w-9 p-0"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {/* Page number display */}
        <div className="flex items-center gap-1 px-2 text-sm">
          <span className="text-gray-600">Page</span>
          <span className="font-medium">{page + 1}</span>
          <span className="text-gray-600">of</span>
          <span className="font-medium">{totalPages}</span>
        </div>

        {/* Next page button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={!canNextPage}
          title="Next page"
          className="h-9 w-9 p-0"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>

        {/* Last page button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(totalPages - 1)}
          disabled={!canNextPage}
          title="Last page"
          className="h-9 w-9 p-0"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

/**
 * SimplePagination Component - Compact version
 * For smaller spaces or mobile layouts
 */
export function SimplePagination({
  page,
  totalPages,
  onPageChange,
  canNextPage = page < totalPages - 1,
  canPreviousPage = page > 0,
  className,
}: Omit<PaginationProps, 'pageSize' | 'totalCount' | 'onPageSizeChange'> & {
  totalPages: number
}) {
  return (
    <div className={cn('flex items-center justify-between gap-2', className)}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(page - 1)}
        disabled={!canPreviousPage}
      >
        Previous
      </Button>

      <span className="text-sm text-gray-600">
        Page {page + 1} of {totalPages}
      </span>

      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(page + 1)}
        disabled={!canNextPage}
      >
        Next
      </Button>
    </div>
  )
}
