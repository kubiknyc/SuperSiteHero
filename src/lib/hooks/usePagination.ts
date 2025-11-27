/**
 * usePagination Hook
 * Reusable pagination state management for list views
 * Phase 3: Server-side pagination implementation
 */

import { useState, useCallback } from 'react'

export interface PaginationState {
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
}

export interface PaginationActions {
  goToPage: (page: number) => void
  goToFirstPage: () => void
  goToLastPage: () => void
  nextPage: () => void
  previousPage: () => void
  setPageSize: (size: number) => void
}

export interface UsePaginationOptions {
  initialPage?: number
  initialPageSize?: number
  totalCount?: number
}

/**
 * usePagination - Manage pagination state for lists
 *
 * @param options - Pagination options
 * @returns Pagination state and actions
 *
 * @example
 * const { page, pageSize, nextPage, previousPage } = usePagination({
 *   initialPage: 0,
 *   initialPageSize: 20,
 *   totalCount: 150,
 * })
 */
export function usePagination({
  initialPage = 0,
  initialPageSize = 20,
  totalCount = 0,
}: UsePaginationOptions = {}): PaginationState & PaginationActions {
  const [page, setPage] = useState(initialPage)
  const [pageSize, setPageSize] = useState(initialPageSize)

  const totalPages = Math.ceil(totalCount / pageSize) || 1
  const canNextPage = page < totalPages - 1
  const canPreviousPage = page > 0

  const goToPage = useCallback(
    (pageIndex: number) => {
      const index = Math.max(0, Math.min(pageIndex, totalPages - 1))
      setPage(index)
    },
    [totalPages]
  )

  const goToFirstPage = useCallback(() => {
    setPage(0)
  }, [])

  const goToLastPage = useCallback(() => {
    setPage(Math.max(0, totalPages - 1))
  }, [totalPages])

  const nextPage = useCallback(() => {
    if (canNextPage) {
      setPage((p) => p + 1)
    }
  }, [canNextPage])

  const previousPage = useCallback(() => {
    if (canPreviousPage) {
      setPage((p) => p - 1)
    }
  }, [canPreviousPage])

  const updatePageSize = useCallback((newSize: number) => {
    setPageSize(newSize)
    setPage(0) // Reset to first page when page size changes
  }, [])

  return {
    page,
    pageSize,
    totalCount,
    totalPages,
    goToPage,
    goToFirstPage,
    goToLastPage,
    nextPage,
    previousPage,
    setPageSize: updatePageSize,
  }
}

/**
 * Utility function to calculate offset for SQL OFFSET/LIMIT
 */
export function getOffsetLimit(
  page: number,
  pageSize: number
): { offset: number; limit: number } {
  return {
    offset: page * pageSize,
    limit: pageSize,
  }
}

/**
 * Utility function to calculate start and end indices for array slicing
 */
export function getPageIndices(
  page: number,
  pageSize: number
): { start: number; end: number } {
  return {
    start: page * pageSize,
    end: (page + 1) * pageSize,
  }
}
