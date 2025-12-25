/**
 * useSemanticSearch Hook
 * React hook for natural language search with LLM query expansion.
 * Provides debounced search, entity filtering, and result management.
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth/AuthContext'
import {
  semanticSearch,
  simpleSearch,
  checkRateLimit,
  type SearchEntityType,
  type SearchOptions,
  type SearchResult,
  type SemanticSearchResponse,
  type RateLimitInfo,
  type DateRange,
} from '@/lib/api/services/semantic-search'
import { logger } from '@/lib/utils/logger'

// ============================================================================
// Types
// ============================================================================

export interface UseSemanticSearchOptions {
  /** Default entity types to search */
  defaultEntities?: SearchEntityType[]
  /** Default project ID filter */
  defaultProjectId?: string
  /** Debounce delay in milliseconds (default: 300) */
  debounceMs?: number
  /** Enable LLM query expansion (default: true) */
  enableExpansion?: boolean
  /** Auto-search on query change (default: false) */
  autoSearch?: boolean
  /** Minimum query length to trigger search (default: 2) */
  minQueryLength?: number
}

export interface UseSemanticSearchReturn {
  /** Current search query */
  query: string
  /** Update search query */
  setQuery: (query: string) => void
  /** Search results */
  results: SearchResult[]
  /** Expanded search terms from LLM */
  expandedTerms: string[]
  /** Whether search is in progress */
  isLoading: boolean
  /** Whether initial search has been performed */
  hasSearched: boolean
  /** Error from search */
  error: Error | null
  /** Execute search */
  search: (options?: Partial<SearchOptions>) => void
  /** Clear search results */
  clearResults: () => void
  /** Total number of results */
  totalResults: number
  /** Search execution time in ms */
  searchTimeMs: number
  /** Query expansion time in ms */
  queryExpansionTimeMs: number
  /** Currently selected entity filters */
  entityFilters: SearchEntityType[]
  /** Update entity filters */
  setEntityFilters: (entities: SearchEntityType[]) => void
  /** Current date range filter */
  dateRange: DateRange | undefined
  /** Update date range filter */
  setDateRange: (range: DateRange | undefined) => void
  /** Current project ID filter */
  projectId: string | undefined
  /** Update project ID filter */
  setProjectId: (projectId: string | undefined) => void
  /** Rate limit information */
  rateLimit: RateLimitInfo | null
  /** Whether LLM expansion is enabled */
  expansionEnabled: boolean
  /** Toggle LLM expansion */
  setExpansionEnabled: (enabled: boolean) => void
  /** Recent searches */
  recentSearches: string[]
  /** Clear recent searches */
  clearRecentSearches: () => void
}

// ============================================================================
// Query Keys
// ============================================================================

export const semanticSearchQueryKeys = {
  all: ['semantic-search'] as const,
  search: (query: string, options?: SearchOptions) =>
    [...semanticSearchQueryKeys.all, 'search', query, options] as const,
  rateLimit: (userId: string) =>
    [...semanticSearchQueryKeys.all, 'rate-limit', userId] as const,
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_DEBOUNCE_MS = 300
const DEFAULT_MIN_QUERY_LENGTH = 2
const MAX_RECENT_SEARCHES = 10
const RECENT_SEARCHES_KEY = 'jobsight_recent_searches'

// ============================================================================
// Local Storage Helpers
// ============================================================================

function getRecentSearches(): string[] {
  try {
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function saveRecentSearch(query: string): string[] {
  try {
    const recent = getRecentSearches()
    const filtered = recent.filter(s => s.toLowerCase() !== query.toLowerCase())
    const updated = [query, ...filtered].slice(0, MAX_RECENT_SEARCHES)
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated))
    return updated
  } catch {
    return [query]
  }
}

function clearStoredRecentSearches(): void {
  try {
    localStorage.removeItem(RECENT_SEARCHES_KEY)
  } catch {
    // Ignore errors
  }
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useSemanticSearch(
  options: UseSemanticSearchOptions = {}
): UseSemanticSearchReturn {
  const {
    defaultEntities = [],
    defaultProjectId,
    debounceMs = DEFAULT_DEBOUNCE_MS,
    enableExpansion = true,
    autoSearch = false,
    minQueryLength = DEFAULT_MIN_QUERY_LENGTH,
  } = options

  const { user } = useAuth()
  const queryClient = useQueryClient()

  // State
  const [query, setQueryState] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [expandedTerms, setExpandedTerms] = useState<string[]>([])
  const [hasSearched, setHasSearched] = useState(false)
  const [totalResults, setTotalResults] = useState(0)
  const [searchTimeMs, setSearchTimeMs] = useState(0)
  const [queryExpansionTimeMs, setQueryExpansionTimeMs] = useState(0)
  const [entityFilters, setEntityFilters] = useState<SearchEntityType[]>(defaultEntities)
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)
  const [projectId, setProjectId] = useState<string | undefined>(defaultProjectId)
  const [expansionEnabled, setExpansionEnabled] = useState(enableExpansion)
  const [recentSearches, setRecentSearches] = useState<string[]>(getRecentSearches)

  // Refs for debouncing
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const lastSearchRef = useRef<string>('')

  // Rate limit query
  const { data: rateLimit } = useQuery({
    queryKey: semanticSearchQueryKeys.rateLimit(user?.id || ''),
    queryFn: () => (user?.id ? checkRateLimit(user.id) : null),
    enabled: !!user?.id,
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 60 * 1000, // Refetch every minute
  })

  // Search mutation
  const searchMutation = useMutation({
    mutationFn: async (searchOptions: SearchOptions & { query: string }) => {
      if (!user?.id) {
        throw new Error('User not authenticated')
      }

      const searchFn = expansionEnabled ? semanticSearch : simpleSearch
      return searchFn(searchOptions.query, user.id, searchOptions)
    },
    onSuccess: (response: SemanticSearchResponse, variables) => {
      setResults(response.results)
      setExpandedTerms(response.expandedTerms)
      setTotalResults(response.totalResults)
      setSearchTimeMs(response.searchTimeMs)
      setQueryExpansionTimeMs(response.queryExpansionTimeMs)
      setHasSearched(true)

      // Save to recent searches
      if (variables.query.trim()) {
        const updated = saveRecentSearch(variables.query.trim())
        setRecentSearches(updated)
      }

      // Invalidate rate limit query to get updated count
      queryClient.invalidateQueries({
        queryKey: semanticSearchQueryKeys.rateLimit(user?.id || ''),
      })

      logger.log('[useSemanticSearch] Search completed:', {
        query: variables.query,
        resultsCount: response.results.length,
        totalResults: response.totalResults,
        expansionEnabled,
        expandedTerms: response.expandedTerms,
      })
    },
    onError: (error: Error) => {
      logger.error('[useSemanticSearch] Search failed:', error)
    },
  })

  // Execute search function
  const executeSearch = useCallback(
    (searchQuery: string, searchOptions?: Partial<SearchOptions>) => {
      if (!searchQuery.trim() || searchQuery.trim().length < minQueryLength) {
        return
      }

      // Prevent duplicate searches
      const searchKey = `${searchQuery}-${JSON.stringify(searchOptions || {})}`
      if (searchKey === lastSearchRef.current && hasSearched) {
        return
      }
      lastSearchRef.current = searchKey

      searchMutation.mutate({
        query: searchQuery,
        entities: searchOptions?.entities || entityFilters.length > 0 ? entityFilters : undefined,
        projectId: searchOptions?.projectId || projectId,
        dateRange: searchOptions?.dateRange || dateRange,
        limit: searchOptions?.limit,
        offset: searchOptions?.offset,
      })
    },
    [searchMutation, entityFilters, projectId, dateRange, minQueryLength, hasSearched]
  )

  // Debounced search for auto-search mode
  const debouncedSearch = useCallback(
    (searchQuery: string) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }

      if (!searchQuery.trim() || searchQuery.trim().length < minQueryLength) {
        return
      }

      debounceTimerRef.current = setTimeout(() => {
        executeSearch(searchQuery)
      }, debounceMs)
    },
    [executeSearch, debounceMs, minQueryLength]
  )

  // Query setter with optional auto-search
  const setQuery = useCallback(
    (newQuery: string) => {
      setQueryState(newQuery)

      if (autoSearch) {
        debouncedSearch(newQuery)
      }
    },
    [autoSearch, debouncedSearch]
  )

  // Manual search trigger
  const search = useCallback(
    (additionalOptions?: Partial<SearchOptions>) => {
      executeSearch(query, additionalOptions)
    },
    [query, executeSearch]
  )

  // Clear results
  const clearResults = useCallback(() => {
    setResults([])
    setExpandedTerms([])
    setHasSearched(false)
    setTotalResults(0)
    setSearchTimeMs(0)
    setQueryExpansionTimeMs(0)
    lastSearchRef.current = ''
  }, [])

  // Clear recent searches
  const clearRecentSearches = useCallback(() => {
    clearStoredRecentSearches()
    setRecentSearches([])
  }, [])

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  return {
    query,
    setQuery,
    results,
    expandedTerms,
    isLoading: searchMutation.isPending,
    hasSearched,
    error: searchMutation.error,
    search,
    clearResults,
    totalResults,
    searchTimeMs,
    queryExpansionTimeMs,
    entityFilters,
    setEntityFilters,
    dateRange,
    setDateRange,
    projectId,
    setProjectId,
    rateLimit: rateLimit || null,
    expansionEnabled,
    setExpansionEnabled,
    recentSearches,
    clearRecentSearches,
  }
}

// ============================================================================
// Re-exports
// ============================================================================

export type { SearchEntityType, SearchResult, DateRange } from '@/lib/api/services/semantic-search'
