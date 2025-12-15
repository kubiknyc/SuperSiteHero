/**
 * Hook for Punch Items by Area Summary Report
 *
 * Groups punch items by location/area and provides aggregated statistics.
 * Supports filtering by status and exports to PDF/Excel.
 */

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { PunchItem, PunchItemStatus } from '@/types/database'
import { calculatePriorityScore, type PriorityLevel } from '../utils/priorityScoring'

// ============================================================================
// Types
// ============================================================================

export interface AreaSummary {
  area: string
  building: string | null
  floor: string | null
  room: string | null
  fullLocation: string
  total: number
  open: number
  inProgress: number
  readyForReview: number
  completed: number
  verified: number
  rejected: number
  overdue: number
  averagePriorityScore: number
  priorityDistribution: Record<PriorityLevel, number>
  items: PunchItem[]
}

export interface PunchByAreaFilters {
  status?: PunchItemStatus[]
  priorityLevel?: PriorityLevel[]
  includeCompleted?: boolean
}

export interface PunchByAreaSummary {
  areas: AreaSummary[]
  totals: {
    totalItems: number
    totalOpen: number
    totalInProgress: number
    totalReadyForReview: number
    totalCompleted: number
    totalVerified: number
    totalRejected: number
    totalOverdue: number
    uniqueAreas: number
    uniqueBuildings: number
    uniqueFloors: number
    averagePriorityScore: number
  }
  byBuilding: Record<string, AreaSummary[]>
  byFloor: Record<string, AreaSummary[]>
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate a unique location key for grouping
 */
function getLocationKey(item: PunchItem): string {
  const parts = [
    item.building || 'Unspecified Building',
    item.floor || 'Unspecified Floor',
    item.room || '',
    item.area || '',
  ].filter(Boolean)

  return parts.join(' / ')
}

/**
 * Check if a punch item is overdue
 */
function isOverdue(item: PunchItem): boolean {
  if (!item.due_date) {return false}
  const status = item.status
  if (status && ['completed', 'verified'].includes(status)) {return false}
  return new Date(item.due_date) < new Date()
}

/**
 * Calculate summary statistics for a group of punch items
 */
function calculateAreaSummary(
  locationKey: string,
  items: PunchItem[]
): AreaSummary {
  const firstItem = items[0]

  // Calculate status counts
  const open = items.filter(i => i.status === 'open').length
  const inProgress = items.filter(i => i.status === 'in_progress').length
  const readyForReview = items.filter(i => i.status === 'ready_for_review').length
  const completed = items.filter(i => i.status === 'completed').length
  const verified = items.filter(i => i.status === 'verified').length
  const rejected = items.filter(i => i.status === 'rejected').length
  const overdue = items.filter(isOverdue).length

  // Calculate priority scores
  const priorityDistribution: Record<PriorityLevel, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  }

  let totalPriorityScore = 0
  items.forEach(item => {
    const score = calculatePriorityScore(item)
    priorityDistribution[score.level]++
    totalPriorityScore += score.score
  })

  const averagePriorityScore = items.length > 0
    ? Math.round(totalPriorityScore / items.length)
    : 0

  return {
    area: firstItem?.area || '',
    building: firstItem?.building || null,
    floor: firstItem?.floor || null,
    room: firstItem?.room || null,
    fullLocation: locationKey,
    total: items.length,
    open,
    inProgress,
    readyForReview,
    completed,
    verified,
    rejected,
    overdue,
    averagePriorityScore,
    priorityDistribution,
    items,
  }
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook to fetch and summarize punch items by area
 */
export function usePunchByArea(
  projectId: string | undefined,
  filters: PunchByAreaFilters = {}
) {
  const {
    status = [],
    priorityLevel = [],
    includeCompleted = false
  } = filters

  // Fetch all punch items for the project
  const { data: punchItems, isLoading, error, refetch } = useQuery({
    queryKey: ['punch-items-by-area', projectId, status, priorityLevel, includeCompleted],
    queryFn: async () => {
      if (!projectId) {throw new Error('Project ID required')}

      let query = supabase
        .from('punch_items')
        .select('*')
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      // Filter by status if specified
      if (status.length > 0) {
        query = query.in('status', status)
      }

      // Optionally exclude completed items
      if (!includeCompleted) {
        query = query.not('status', 'in', '("completed","verified")')
      }

      const { data, error } = await query

      if (error) {throw error}
      return data as PunchItem[]
    },
    enabled: !!projectId,
  })

  // Process and group punch items by area
  const summary = useMemo<PunchByAreaSummary | null>(() => {
    if (!punchItems) {return null}

    // Apply priority level filter if specified
    let filteredItems = punchItems
    if (priorityLevel.length > 0) {
      filteredItems = punchItems.filter(item => {
        const score = calculatePriorityScore(item)
        return priorityLevel.includes(score.level)
      })
    }

    // Group by location
    const locationGroups = new Map<string, PunchItem[]>()
    filteredItems.forEach(item => {
      const key = getLocationKey(item)
      const existing = locationGroups.get(key) || []
      locationGroups.set(key, [...existing, item])
    })

    // Calculate summaries for each area
    const areas: AreaSummary[] = []
    locationGroups.forEach((items, key) => {
      areas.push(calculateAreaSummary(key, items))
    })

    // Sort by total count (descending)
    areas.sort((a, b) => b.total - a.total)

    // Group by building
    const byBuilding: Record<string, AreaSummary[]> = {}
    areas.forEach(area => {
      const building = area.building || 'Unspecified Building'
      if (!byBuilding[building]) {
        byBuilding[building] = []
      }
      byBuilding[building].push(area)
    })

    // Group by floor
    const byFloor: Record<string, AreaSummary[]> = {}
    areas.forEach(area => {
      const floor = area.floor || 'Unspecified Floor'
      if (!byFloor[floor]) {
        byFloor[floor] = []
      }
      byFloor[floor].push(area)
    })

    // Calculate totals
    const totals = {
      totalItems: filteredItems.length,
      totalOpen: filteredItems.filter(i => i.status === 'open').length,
      totalInProgress: filteredItems.filter(i => i.status === 'in_progress').length,
      totalReadyForReview: filteredItems.filter(i => i.status === 'ready_for_review').length,
      totalCompleted: filteredItems.filter(i => i.status === 'completed').length,
      totalVerified: filteredItems.filter(i => i.status === 'verified').length,
      totalRejected: filteredItems.filter(i => i.status === 'rejected').length,
      totalOverdue: filteredItems.filter(isOverdue).length,
      uniqueAreas: areas.length,
      uniqueBuildings: Object.keys(byBuilding).length,
      uniqueFloors: Object.keys(byFloor).length,
      averagePriorityScore: filteredItems.length > 0
        ? Math.round(
            filteredItems.reduce((sum, item) => sum + calculatePriorityScore(item).score, 0) /
            filteredItems.length
          )
        : 0,
    }

    return {
      areas,
      totals,
      byBuilding,
      byFloor,
    }
  }, [punchItems, priorityLevel])

  return {
    summary,
    isLoading,
    error,
    refetch,
  }
}

/**
 * Hook to get punch items for a specific area
 */
export function usePunchItemsByArea(
  projectId: string | undefined,
  area: string | undefined
) {
  return useQuery({
    queryKey: ['punch-items', projectId, 'area', area],
    queryFn: async () => {
      if (!projectId) {throw new Error('Project ID required')}

      let query = supabase
        .from('punch_items')
        .select('*')
        .eq('project_id', projectId)
        .is('deleted_at', null)

      if (area) {
        query = query.eq('area', area)
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) {throw error}
      return data as PunchItem[]
    },
    enabled: !!projectId,
  })
}
