// File: /src/features/visual-search/hooks/useVisualSearch.ts
// React Query hooks for AI-powered visual pattern search in drawings

import { useState, useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type {
  VisualSearchPattern,
  VisualSearchPatternInsert,
  VisualSearchPatternUpdate,
  VisualSearchMatch,
  FindPatternMatchesRequest,
  FindPatternMatchesResponse,
} from '@/types/drawing-sheets'

// =============================================
// QUERY KEYS
// =============================================

export const visualSearchKeys = {
  all: ['visual-search'] as const,
  patterns: () => [...visualSearchKeys.all, 'patterns'] as const,
  patternList: (projectId: string) => [...visualSearchKeys.patterns(), projectId] as const,
  patternDetail: (patternId: string) => [...visualSearchKeys.patterns(), 'detail', patternId] as const,
  patternsByCompany: (companyId: string) => [...visualSearchKeys.patterns(), 'company', companyId] as const,
  popularPatterns: (companyId: string) => [...visualSearchKeys.patterns(), 'popular', companyId] as const,
  searchResults: () => [...visualSearchKeys.all, 'results'] as const,
  searchResult: (searchId: string) => [...visualSearchKeys.searchResults(), searchId] as const,
}

// =============================================
// PATTERN QUERIES
// =============================================

/**
 * Fetch all visual search patterns for a project
 */
export function useVisualSearchPatterns(projectId: string | undefined) {
  return useQuery({
    queryKey: visualSearchKeys.patternList(projectId || ''),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('visual_search_patterns')
        .select('*')
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .order('name', { ascending: true })

      if (error) {throw error}
      return data as VisualSearchPattern[]
    },
    enabled: !!projectId,
  })
}

/**
 * Fetch a single pattern by ID
 */
export function useVisualSearchPattern(patternId: string | undefined) {
  return useQuery({
    queryKey: visualSearchKeys.patternDetail(patternId || ''),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('visual_search_patterns')
        .select('*')
        .eq('id', patternId)
        .single()

      if (error) {throw error}
      return data as VisualSearchPattern
    },
    enabled: !!patternId,
  })
}

/**
 * Fetch all patterns for a company (for pattern library)
 */
export function useCompanyPatterns(companyId: string | undefined) {
  return useQuery({
    queryKey: visualSearchKeys.patternsByCompany(companyId || ''),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('visual_search_patterns')
        .select('*')
        .eq('company_id', companyId)
        .is('deleted_at', null)
        .order('usage_count', { ascending: false })

      if (error) {throw error}
      return data as VisualSearchPattern[]
    },
    enabled: !!companyId,
  })
}

/**
 * Fetch popular patterns (most used in company)
 */
export function usePopularPatterns(companyId: string | undefined, limit: number = 10) {
  return useQuery({
    queryKey: visualSearchKeys.popularPatterns(companyId || ''),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('visual_search_patterns')
        .select('*')
        .eq('company_id', companyId)
        .is('deleted_at', null)
        .gt('usage_count', 0)
        .order('usage_count', { ascending: false })
        .limit(limit)

      if (error) {throw error}
      return data as VisualSearchPattern[]
    },
    enabled: !!companyId,
  })
}

// =============================================
// PATTERN MUTATIONS
// =============================================

/**
 * Create a new visual search pattern
 */
export function useCreatePattern() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (pattern: VisualSearchPatternInsert) => {
      const { data, error } = await supabase
        .from('visual_search_patterns')
        .insert(pattern as any)
        .select()
        .single()

      if (error) {throw error}
      return data as VisualSearchPattern
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: visualSearchKeys.patternList(data.project_id) })
      queryClient.invalidateQueries({ queryKey: visualSearchKeys.patternsByCompany(data.company_id) })
    },
  })
}

/**
 * Update a pattern
 */
export function useUpdatePattern() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      patternId,
      updates,
    }: {
      patternId: string
      updates: VisualSearchPatternUpdate
    }) => {
      const { data, error } = await supabase
        .from('visual_search_patterns')
        .update(updates as any)
        .eq('id', patternId)
        .select()
        .single()

      if (error) {throw error}
      return data as VisualSearchPattern
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: visualSearchKeys.patternDetail(data.id) })
      queryClient.invalidateQueries({ queryKey: visualSearchKeys.patternList(data.project_id) })
      queryClient.invalidateQueries({ queryKey: visualSearchKeys.patternsByCompany(data.company_id) })
    },
  })
}

/**
 * Delete a pattern (soft delete)
 */
export function useDeletePattern() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (patternId: string) => {
      // First get the pattern to know which queries to invalidate
      const { data: pattern } = await supabase
        .from('visual_search_patterns')
        .select('project_id, company_id')
        .eq('id', patternId)
        .single()

      const { error } = await supabase
        .from('visual_search_patterns')
        .update({ deleted_at: new Date().toISOString() } as any)
        .eq('id', patternId)

      if (error) {throw error}
      return pattern as { project_id: string; company_id: string }
    },
    onSuccess: (data) => {
      if (data) {
        queryClient.invalidateQueries({ queryKey: visualSearchKeys.patternList(data.project_id) })
        queryClient.invalidateQueries({ queryKey: visualSearchKeys.patternsByCompany(data.company_id) })
      }
    },
  })
}

// =============================================
// SEARCH MUTATIONS
// =============================================

interface SearchRequest {
  patternId?: string
  patternImageBase64?: string
  patternDescription?: string
  sheetIds: string[]
  matchTolerance?: number
}

interface SearchResult {
  success: boolean
  patternId?: string
  matches: VisualSearchMatch[]
  totalSheetsSearched: number
  searchDuration?: number
}

/**
 * Execute a visual pattern search across sheets
 */
export function useFindPatternMatches() {
  return useMutation({
    mutationFn: async (request: SearchRequest): Promise<SearchResult> => {
      const startTime = Date.now()

      // Get auth token
      const { data: sessionData } = await supabase.auth.getSession()
      const accessToken = sessionData?.session?.access_token

      if (!accessToken) {
        throw new Error('Authentication required')
      }

      // Build request body
      const body: FindPatternMatchesRequest = {
        sheet_ids: request.sheetIds,
        match_tolerance: request.matchTolerance,
      }

      if (request.patternId) {
        body.pattern_id = request.patternId
      } else if (request.patternImageBase64) {
        body.pattern_image_base64 = request.patternImageBase64
        if (request.patternDescription) {
          body.pattern_description = request.patternDescription
        }
      } else {
        throw new Error('Either patternId or patternImageBase64 is required')
      }

      // Call Edge Function
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/find-pattern-matches`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(body),
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Search failed: ${response.status}`)
      }

      const result: FindPatternMatchesResponse = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Search failed')
      }

      return {
        success: true,
        patternId: request.patternId,
        matches: result.matches || [],
        totalSheetsSearched: result.total_sheets_searched || 0,
        searchDuration: Date.now() - startTime,
      }
    },
  })
}

// =============================================
// SEARCH STATE MANAGEMENT
// =============================================

interface VisualSearchState {
  isSelecting: boolean
  selectedRegion: {
    x: number
    y: number
    width: number
    height: number
  } | null
  patternImageBase64: string | null
  matches: VisualSearchMatch[]
  excludedMatchIds: Set<string>
  isSearching: boolean
  searchError: string | null
}

const initialState: VisualSearchState = {
  isSelecting: false,
  selectedRegion: null,
  patternImageBase64: null,
  matches: [],
  excludedMatchIds: new Set(),
  isSearching: false,
  searchError: null,
}

/**
 * Custom hook for managing visual search state
 */
export function useVisualSearchState() {
  const [state, setState] = useState<VisualSearchState>(initialState)

  const startSelection = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isSelecting: true,
      selectedRegion: null,
      patternImageBase64: null,
      matches: [],
      excludedMatchIds: new Set(),
      searchError: null,
    }))
  }, [])

  const setSelectedRegion = useCallback(
    (region: { x: number; y: number; width: number; height: number }) => {
      setState((prev) => ({
        ...prev,
        selectedRegion: region,
        isSelecting: false,
      }))
    },
    []
  )

  const setPatternImage = useCallback((base64: string) => {
    setState((prev) => ({
      ...prev,
      patternImageBase64: base64,
    }))
  }, [])

  const setMatches = useCallback((matches: VisualSearchMatch[]) => {
    setState((prev) => ({
      ...prev,
      matches,
      isSearching: false,
      searchError: null,
    }))
  }, [])

  const toggleMatchExclusion = useCallback((matchIndex: number) => {
    setState((prev) => {
      const newExcluded = new Set(prev.excludedMatchIds)
      const matchId = `${matchIndex}`
      if (newExcluded.has(matchId)) {
        newExcluded.delete(matchId)
      } else {
        newExcluded.add(matchId)
      }
      return {
        ...prev,
        excludedMatchIds: newExcluded,
      }
    })
  }, [])

  const setSearching = useCallback((isSearching: boolean) => {
    setState((prev) => ({
      ...prev,
      isSearching,
    }))
  }, [])

  const setSearchError = useCallback((error: string | null) => {
    setState((prev) => ({
      ...prev,
      searchError: error,
      isSearching: false,
    }))
  }, [])

  const reset = useCallback(() => {
    setState(initialState)
  }, [])

  const getIncludedMatches = useCallback(() => {
    return state.matches.filter((_, index) => !state.excludedMatchIds.has(`${index}`))
  }, [state.matches, state.excludedMatchIds])

  return {
    ...state,
    startSelection,
    setSelectedRegion,
    setPatternImage,
    setMatches,
    toggleMatchExclusion,
    setSearching,
    setSearchError,
    reset,
    getIncludedMatches,
  }
}

// =============================================
// UTILITY FUNCTIONS
// =============================================

/**
 * Convert canvas region to base64 image
 */
export async function captureRegionAsBase64(
  canvasOrImage: HTMLCanvasElement | HTMLImageElement,
  region: { x: number; y: number; width: number; height: number },
  outputSize: number = 512
): Promise<string> {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    throw new Error('Failed to create canvas context')
  }

  // Set output size (square for consistency)
  canvas.width = outputSize
  canvas.height = outputSize

  // Calculate source dimensions
  let sourceWidth: number
  let sourceHeight: number

  if (canvasOrImage instanceof HTMLCanvasElement) {
    sourceWidth = canvasOrImage.width
    sourceHeight = canvasOrImage.height
  } else {
    sourceWidth = canvasOrImage.naturalWidth
    sourceHeight = canvasOrImage.naturalHeight
  }

  // Convert percentage-based region to pixel coordinates
  const srcX = (region.x / 100) * sourceWidth
  const srcY = (region.y / 100) * sourceHeight
  const srcW = (region.width / 100) * sourceWidth
  const srcH = (region.height / 100) * sourceHeight

  // Draw the cropped region
  ctx.drawImage(canvasOrImage, srcX, srcY, srcW, srcH, 0, 0, outputSize, outputSize)

  // Return base64 without the data URL prefix
  const dataUrl = canvas.toDataURL('image/png')
  return dataUrl.replace(/^data:image\/png;base64,/, '')
}

/**
 * Calculate match count by sheet
 */
export function groupMatchesBySheet(matches: VisualSearchMatch[]): Map<string, VisualSearchMatch[]> {
  const grouped = new Map<string, VisualSearchMatch[]>()

  for (const match of matches) {
    const existing = grouped.get(match.sheet_id) || []
    existing.push(match)
    grouped.set(match.sheet_id, existing)
  }

  return grouped
}

/**
 * Sort matches by confidence
 */
export function sortMatchesByConfidence(
  matches: VisualSearchMatch[],
  descending: boolean = true
): VisualSearchMatch[] {
  return [...matches].sort((a, b) =>
    descending ? b.confidence - a.confidence : a.confidence - b.confidence
  )
}

// =============================================
// EXPORTS
// =============================================

export type { SearchRequest, SearchResult, VisualSearchState }
