/**
 * useSemanticSearch Hook Tests
 * Tests for the semantic search React hook.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { type ReactNode } from 'react'
import { useSemanticSearch } from '../useSemanticSearch'

// Mock the auth context
vi.mock('@/lib/auth/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user-123' },
    userProfile: { id: 'test-user-123', email: 'test@example.com' },
  }),
}))

// Mock the semantic search service
vi.mock('@/lib/api/services/semantic-search', () => ({
  semanticSearch: vi.fn(),
  simpleSearch: vi.fn(),
  checkRateLimit: vi.fn(() => ({
    remaining: 45,
    limit: 50,
    resetAt: new Date(Date.now() + 3600000),
  })),
}))

// Mock logger
vi.mock('@/lib/utils/logger', () => ({
  logger: {
    log: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}))

// Create wrapper with QueryClient
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    )
  }
}

describe('useSemanticSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  // ============================================================================
  // Initial State Tests
  // ============================================================================

  describe('initial state', () => {
    it('should initialize with empty query', () => {
      const { result } = renderHook(() => useSemanticSearch(), {
        wrapper: createWrapper(),
      })

      expect(result.current.query).toBe('')
    })

    it('should initialize with empty results', () => {
      const { result } = renderHook(() => useSemanticSearch(), {
        wrapper: createWrapper(),
      })

      expect(result.current.results).toEqual([])
      expect(result.current.totalResults).toBe(0)
    })

    it('should initialize with default entity filters', () => {
      const { result } = renderHook(
        () => useSemanticSearch({ defaultEntities: ['rfi', 'submittal'] }),
        { wrapper: createWrapper() }
      )

      expect(result.current.entityFilters).toEqual(['rfi', 'submittal'])
    })

    it('should initialize with expansion enabled by default', () => {
      const { result } = renderHook(() => useSemanticSearch(), {
        wrapper: createWrapper(),
      })

      expect(result.current.expansionEnabled).toBe(true)
    })

    it('should initialize with hasSearched as false', () => {
      const { result } = renderHook(() => useSemanticSearch(), {
        wrapper: createWrapper(),
      })

      expect(result.current.hasSearched).toBe(false)
    })

    it('should not be loading initially', () => {
      const { result } = renderHook(() => useSemanticSearch(), {
        wrapper: createWrapper(),
      })

      expect(result.current.isLoading).toBe(false)
    })
  })

  // ============================================================================
  // Query Management Tests
  // ============================================================================

  describe('query management', () => {
    it('should update query when setQuery is called', () => {
      const { result } = renderHook(() => useSemanticSearch(), {
        wrapper: createWrapper(),
      })

      act(() => {
        result.current.setQuery('test query')
      })

      expect(result.current.query).toBe('test query')
    })

    it('should clear query when clearResults is called', () => {
      const { result } = renderHook(() => useSemanticSearch(), {
        wrapper: createWrapper(),
      })

      act(() => {
        result.current.setQuery('test query')
      })

      act(() => {
        result.current.clearResults()
      })

      expect(result.current.hasSearched).toBe(false)
      expect(result.current.results).toEqual([])
    })
  })

  // ============================================================================
  // Filter Management Tests
  // ============================================================================

  describe('filter management', () => {
    it('should update entity filters', () => {
      const { result } = renderHook(() => useSemanticSearch(), {
        wrapper: createWrapper(),
      })

      act(() => {
        result.current.setEntityFilters(['rfi', 'document'])
      })

      expect(result.current.entityFilters).toEqual(['rfi', 'document'])
    })

    it('should update date range', () => {
      const { result } = renderHook(() => useSemanticSearch(), {
        wrapper: createWrapper(),
      })

      const dateRange = { start: '2024-01-01', end: '2024-12-31' }

      act(() => {
        result.current.setDateRange(dateRange)
      })

      expect(result.current.dateRange).toEqual(dateRange)
    })

    it('should update project ID', () => {
      const { result } = renderHook(() => useSemanticSearch(), {
        wrapper: createWrapper(),
      })

      act(() => {
        result.current.setProjectId('project-123')
      })

      expect(result.current.projectId).toBe('project-123')
    })

    it('should toggle expansion enabled', () => {
      const { result } = renderHook(() => useSemanticSearch(), {
        wrapper: createWrapper(),
      })

      expect(result.current.expansionEnabled).toBe(true)

      act(() => {
        result.current.setExpansionEnabled(false)
      })

      expect(result.current.expansionEnabled).toBe(false)
    })
  })

  // ============================================================================
  // Search Execution Tests
  // ============================================================================

  describe('search execution', () => {
    it('should execute search when search() is called', async () => {
      const { semanticSearch } = await import('@/lib/api/services/semantic-search')

      vi.mocked(semanticSearch).mockResolvedValueOnce({
        results: [
          {
            id: '1',
            entityType: 'rfi',
            title: 'Test RFI',
            description: 'Test description',
            projectId: 'proj-1',
            projectName: 'Project 1',
            createdAt: '2024-01-15',
            matchedTerms: ['test'],
            relevanceScore: 90,
            url: '/rfis/1',
          },
        ],
        expandedTerms: ['test', 'testing'],
        totalResults: 1,
        searchTimeMs: 150,
        queryExpansionTimeMs: 50,
      })

      const { result } = renderHook(() => useSemanticSearch(), {
        wrapper: createWrapper(),
      })

      act(() => {
        result.current.setQuery('test')
      })

      act(() => {
        result.current.search()
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(semanticSearch).toHaveBeenCalled()
    })

    it('should not search if query is too short', async () => {
      const { semanticSearch } = await import('@/lib/api/services/semantic-search')

      const { result } = renderHook(
        () => useSemanticSearch({ minQueryLength: 3 }),
        { wrapper: createWrapper() }
      )

      act(() => {
        result.current.setQuery('ab')
      })

      act(() => {
        result.current.search()
      })

      expect(semanticSearch).not.toHaveBeenCalled()
    })

    it('should use simple search when expansion is disabled', async () => {
      const { simpleSearch } = await import('@/lib/api/services/semantic-search')

      vi.mocked(simpleSearch).mockResolvedValueOnce({
        results: [],
        expandedTerms: ['test'],
        totalResults: 0,
        searchTimeMs: 100,
        queryExpansionTimeMs: 0,
      })

      const { result } = renderHook(
        () => useSemanticSearch({ enableExpansion: false }),
        { wrapper: createWrapper() }
      )

      act(() => {
        result.current.setQuery('test query')
      })

      act(() => {
        result.current.search()
      })

      await waitFor(() => {
        expect(simpleSearch).toHaveBeenCalled()
      })
    })
  })

  // ============================================================================
  // Auto-Search Tests
  // ============================================================================

  describe('auto-search mode', () => {
    it('should auto-search when enabled and query changes', async () => {
      vi.useFakeTimers()
      const { semanticSearch } = await import('@/lib/api/services/semantic-search')

      vi.mocked(semanticSearch).mockResolvedValue({
        results: [],
        expandedTerms: ['test'],
        totalResults: 0,
        searchTimeMs: 100,
        queryExpansionTimeMs: 50,
      })

      const { result } = renderHook(
        () => useSemanticSearch({ autoSearch: true, debounceMs: 300 }),
        { wrapper: createWrapper() }
      )

      act(() => {
        result.current.setQuery('test query')
      })

      // Should not have searched yet (debounce)
      expect(semanticSearch).not.toHaveBeenCalled()

      // Fast-forward past debounce
      act(() => {
        vi.advanceTimersByTime(350)
      })

      await waitFor(() => {
        expect(semanticSearch).toHaveBeenCalled()
      })

      vi.useRealTimers()
    })

    it('should debounce rapid query changes', async () => {
      vi.useFakeTimers()
      const { semanticSearch } = await import('@/lib/api/services/semantic-search')

      vi.mocked(semanticSearch).mockResolvedValue({
        results: [],
        expandedTerms: [],
        totalResults: 0,
        searchTimeMs: 100,
        queryExpansionTimeMs: 50,
      })

      const { result } = renderHook(
        () => useSemanticSearch({ autoSearch: true, debounceMs: 300 }),
        { wrapper: createWrapper() }
      )

      // Rapidly change query
      act(() => {
        result.current.setQuery('t')
      })
      act(() => {
        result.current.setQuery('te')
      })
      act(() => {
        result.current.setQuery('tes')
      })
      act(() => {
        result.current.setQuery('test')
      })

      // Fast-forward past debounce
      act(() => {
        vi.advanceTimersByTime(350)
      })

      await waitFor(() => {
        // Should only search once with final query
        expect(semanticSearch).toHaveBeenCalledTimes(1)
      })

      vi.useRealTimers()
    })
  })

  // ============================================================================
  // Recent Searches Tests
  // ============================================================================

  describe('recent searches', () => {
    it('should load recent searches from localStorage', () => {
      localStorage.setItem(
        'jobsight_recent_searches',
        JSON.stringify(['search 1', 'search 2'])
      )

      const { result } = renderHook(() => useSemanticSearch(), {
        wrapper: createWrapper(),
      })

      expect(result.current.recentSearches).toEqual(['search 1', 'search 2'])
    })

    it('should clear recent searches', () => {
      localStorage.setItem(
        'jobsight_recent_searches',
        JSON.stringify(['search 1', 'search 2'])
      )

      const { result } = renderHook(() => useSemanticSearch(), {
        wrapper: createWrapper(),
      })

      act(() => {
        result.current.clearRecentSearches()
      })

      expect(result.current.recentSearches).toEqual([])
      expect(localStorage.getItem('jobsight_recent_searches')).toBeNull()
    })

    it('should handle invalid localStorage data', () => {
      localStorage.setItem('jobsight_recent_searches', 'invalid json')

      const { result } = renderHook(() => useSemanticSearch(), {
        wrapper: createWrapper(),
      })

      expect(result.current.recentSearches).toEqual([])
    })
  })

  // ============================================================================
  // Rate Limit Tests
  // ============================================================================

  describe('rate limit', () => {
    it('should fetch rate limit info', async () => {
      const { result } = renderHook(() => useSemanticSearch(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.rateLimit).not.toBeNull()
      })

      expect(result.current.rateLimit?.remaining).toBeDefined()
      expect(result.current.rateLimit?.limit).toBe(50)
    })
  })

  // ============================================================================
  // Error Handling Tests
  // ============================================================================

  describe('error handling', () => {
    it('should set error state on search failure', async () => {
      const { semanticSearch } = await import('@/lib/api/services/semantic-search')

      vi.mocked(semanticSearch).mockRejectedValueOnce(new Error('Search failed'))

      const { result } = renderHook(() => useSemanticSearch(), {
        wrapper: createWrapper(),
      })

      act(() => {
        result.current.setQuery('test query')
      })

      act(() => {
        result.current.search()
      })

      await waitFor(() => {
        expect(result.current.error).toBeTruthy()
      })

      expect(result.current.error?.message).toBe('Search failed')
    })

    it('should clear error on new search', async () => {
      const { semanticSearch } = await import('@/lib/api/services/semantic-search')

      // First search fails
      vi.mocked(semanticSearch).mockRejectedValueOnce(new Error('Search failed'))

      const { result } = renderHook(() => useSemanticSearch(), {
        wrapper: createWrapper(),
      })

      act(() => {
        result.current.setQuery('test query')
      })

      act(() => {
        result.current.search()
      })

      await waitFor(() => {
        expect(result.current.error).toBeTruthy()
      })

      // Second search succeeds
      vi.mocked(semanticSearch).mockResolvedValueOnce({
        results: [],
        expandedTerms: ['test'],
        totalResults: 0,
        searchTimeMs: 100,
        queryExpansionTimeMs: 50,
      })

      act(() => {
        result.current.search()
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
    })
  })

  // ============================================================================
  // Options Tests
  // ============================================================================

  describe('hook options', () => {
    it('should respect defaultProjectId option', () => {
      const { result } = renderHook(
        () => useSemanticSearch({ defaultProjectId: 'proj-123' }),
        { wrapper: createWrapper() }
      )

      expect(result.current.projectId).toBe('proj-123')
    })

    it('should respect defaultEntities option', () => {
      const { result } = renderHook(
        () => useSemanticSearch({ defaultEntities: ['rfi', 'submittal'] }),
        { wrapper: createWrapper() }
      )

      expect(result.current.entityFilters).toEqual(['rfi', 'submittal'])
    })

    it('should respect enableExpansion option', () => {
      const { result } = renderHook(
        () => useSemanticSearch({ enableExpansion: false }),
        { wrapper: createWrapper() }
      )

      expect(result.current.expansionEnabled).toBe(false)
    })
  })
})
