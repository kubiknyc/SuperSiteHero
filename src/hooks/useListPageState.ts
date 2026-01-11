// File: /src/hooks/useListPageState.ts
// Reusable hook for managing list page state with URL synchronization

import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

// ============================================================================
// Types
// ============================================================================

export type SortDirection = 'asc' | 'desc'
export type ViewMode = 'list' | 'grid' | 'calendar' | 'table'

export interface SortConfig {
  field: string
  direction: SortDirection
}

export interface PaginationConfig {
  page: number
  pageSize: number
}

export interface UseListPageStateOptions<TFilters extends Record<string, any>> {
  /** Default filter values */
  defaultFilters?: Partial<TFilters>
  /** Default sort configuration */
  defaultSort?: SortConfig
  /** Default view mode */
  defaultView?: ViewMode
  /** Default pagination */
  defaultPagination?: PaginationConfig
  /** Filter keys to sync with URL */
  filterKeys?: (keyof TFilters)[]
  /** Whether to sync state with URL */
  syncWithUrl?: boolean
}

export interface UseListPageStateReturn<TFilters extends Record<string, any>> {
  // Filters
  filters: TFilters
  setFilter: <K extends keyof TFilters>(key: K, value: TFilters[K]) => void
  setFilters: (filters: Partial<TFilters>) => void
  clearFilters: () => void
  hasActiveFilters: boolean

  // Search
  searchQuery: string
  setSearchQuery: (query: string) => void

  // Sort
  sort: SortConfig | null
  setSort: (field: string, direction?: SortDirection) => void
  toggleSort: (field: string) => void
  clearSort: () => void

  // View mode
  viewMode: ViewMode
  setViewMode: (mode: ViewMode) => void

  // Pagination
  pagination: PaginationConfig
  setPage: (page: number) => void
  setPageSize: (size: number) => void
  resetPagination: () => void

  // Utilities
  reset: () => void
  getUrlParams: () => URLSearchParams
}

// ============================================================================
// Helper Functions
// ============================================================================

function parseUrlValue(value: string | null): any {
  if (value === null) {return undefined}
  if (value === 'true') {return true}
  if (value === 'false') {return false}
  if (value === 'null') {return null}
  if (!isNaN(Number(value)) && value !== '') {return Number(value)}
  // Handle arrays (comma-separated)
  if (value.includes(',')) {return value.split(',')}
  return value
}

function stringifyValue(value: any): string | null {
  if (value === undefined || value === null) {return null}
  if (Array.isArray(value)) {return value.join(',')}
  return String(value)
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useListPageState<TFilters extends Record<string, any> = Record<string, any>>({
  defaultFilters = {} as Partial<TFilters>,
  defaultSort,
  defaultView = 'list',
  defaultPagination = { page: 1, pageSize: 20 },
  filterKeys = [],
  syncWithUrl = true,
}: UseListPageStateOptions<TFilters> = {}): UseListPageStateReturn<TFilters> {
  const [searchParams, setSearchParams] = useSearchParams()

  // ============================================================================
  // Parse state from URL
  // ============================================================================

  const filters = useMemo(() => {
    if (!syncWithUrl) {return defaultFilters as TFilters}

    const urlFilters: Record<string, any> = {}

    // Parse filter keys from URL
    filterKeys.forEach((key) => {
      const value = searchParams.get(String(key))
      if (value !== null) {
        urlFilters[key as string] = parseUrlValue(value)
      }
    })

    return { ...defaultFilters, ...urlFilters } as TFilters
  }, [searchParams, defaultFilters, filterKeys, syncWithUrl])

  const searchQuery = useMemo(() => {
    return syncWithUrl ? (searchParams.get('q') || '') : ''
  }, [searchParams, syncWithUrl])

  const sort = useMemo((): SortConfig | null => {
    if (!syncWithUrl) {return defaultSort || null}

    const sortField = searchParams.get('sort')
    const sortDir = searchParams.get('dir') as SortDirection | null

    if (sortField) {
      return {
        field: sortField,
        direction: sortDir || 'asc',
      }
    }

    return defaultSort || null
  }, [searchParams, defaultSort, syncWithUrl])

  const viewMode = useMemo((): ViewMode => {
    if (!syncWithUrl) {return defaultView}

    const view = searchParams.get('view') as ViewMode | null
    return view || defaultView
  }, [searchParams, defaultView, syncWithUrl])

  const pagination = useMemo((): PaginationConfig => {
    if (!syncWithUrl) {return defaultPagination}

    const page = parseInt(searchParams.get('page') || '', 10)
    const pageSize = parseInt(searchParams.get('pageSize') || '', 10)

    return {
      page: isNaN(page) ? defaultPagination.page : page,
      pageSize: isNaN(pageSize) ? defaultPagination.pageSize : pageSize,
    }
  }, [searchParams, defaultPagination, syncWithUrl])

  // ============================================================================
  // Update functions
  // ============================================================================

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      if (!syncWithUrl) {return}

      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)

        Object.entries(updates).forEach(([key, value]) => {
          if (value === null || value === '') {
            next.delete(key)
          } else {
            next.set(key, value)
          }
        })

        return next
      }, { replace: true })
    },
    [setSearchParams, syncWithUrl]
  )

  // Filter setters
  const setFilter = useCallback(
    <K extends keyof TFilters>(key: K, value: TFilters[K]) => {
      updateParams({ [String(key)]: stringifyValue(value) })
    },
    [updateParams]
  )

  const setFilters = useCallback(
    (newFilters: Partial<TFilters>) => {
      const updates: Record<string, string | null> = {}
      Object.entries(newFilters).forEach(([key, value]) => {
        updates[key] = stringifyValue(value)
      })
      updateParams(updates)
    },
    [updateParams]
  )

  const clearFilters = useCallback(() => {
    const updates: Record<string, string | null> = {}
    filterKeys.forEach((key) => {
      updates[String(key)] = null
    })
    updates['q'] = null
    updateParams(updates)
  }, [updateParams, filterKeys])

  const hasActiveFilters = useMemo(() => {
    return (
      searchQuery.length > 0 ||
      filterKeys.some((key) => {
        const value = filters[key]
        const defaultValue = defaultFilters[key]
        return value !== undefined && value !== defaultValue
      })
    )
  }, [filters, defaultFilters, filterKeys, searchQuery])

  // Search setter
  const setSearchQuery = useCallback(
    (query: string) => {
      updateParams({ q: query || null, page: '1' }) // Reset page on search
    },
    [updateParams]
  )

  // Sort setters
  const setSort = useCallback(
    (field: string, direction: SortDirection = 'asc') => {
      updateParams({ sort: field, dir: direction, page: '1' })
    },
    [updateParams]
  )

  const toggleSort = useCallback(
    (field: string) => {
      if (sort?.field === field) {
        if (sort.direction === 'asc') {
          updateParams({ dir: 'desc' })
        } else {
          updateParams({ sort: null, dir: null })
        }
      } else {
        updateParams({ sort: field, dir: 'asc', page: '1' })
      }
    },
    [sort, updateParams]
  )

  const clearSort = useCallback(() => {
    updateParams({ sort: null, dir: null })
  }, [updateParams])

  // View mode setter
  const setViewMode = useCallback(
    (mode: ViewMode) => {
      updateParams({ view: mode === defaultView ? null : mode })
    },
    [updateParams, defaultView]
  )

  // Pagination setters
  const setPage = useCallback(
    (page: number) => {
      updateParams({ page: page === 1 ? null : String(page) })
    },
    [updateParams]
  )

  const setPageSize = useCallback(
    (size: number) => {
      updateParams({
        pageSize: size === defaultPagination.pageSize ? null : String(size),
        page: '1',
      })
    },
    [updateParams, defaultPagination.pageSize]
  )

  const resetPagination = useCallback(() => {
    updateParams({ page: null, pageSize: null })
  }, [updateParams])

  // Reset all
  const reset = useCallback(() => {
    if (syncWithUrl) {
      setSearchParams(new URLSearchParams(), { replace: true })
    }
  }, [setSearchParams, syncWithUrl])

  // Get current URL params
  const getUrlParams = useCallback(() => {
    return new URLSearchParams(searchParams)
  }, [searchParams])

  return {
    // Filters
    filters,
    setFilter,
    setFilters,
    clearFilters,
    hasActiveFilters,

    // Search
    searchQuery,
    setSearchQuery,

    // Sort
    sort,
    setSort,
    toggleSort,
    clearSort,

    // View mode
    viewMode,
    setViewMode,

    // Pagination
    pagination,
    setPage,
    setPageSize,
    resetPagination,

    // Utilities
    reset,
    getUrlParams,
  }
}

// ============================================================================
// Utility hook for simple search-only pages
// ============================================================================

export function useSearchState(defaultValue = '') {
  const [searchParams, setSearchParams] = useSearchParams()

  const query = searchParams.get('q') || defaultValue

  const setQuery = useCallback(
    (value: string) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        if (value) {
          next.set('q', value)
        } else {
          next.delete('q')
        }
        return next
      }, { replace: true })
    },
    [setSearchParams]
  )

  const clearQuery = useCallback(() => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.delete('q')
      return next
    }, { replace: true })
  }, [setSearchParams])

  return { query, setQuery, clearQuery }
}
