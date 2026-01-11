/**
 * Resource Leveling Hook
 *
 * Analyzes resource allocation and provides leveling algorithms
 * to resolve over-allocation conflicts in the schedule.
 */

import { useMemo, useState, useCallback } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  eachDayOfInterval,
  format,
  parseISO,
  isWithinInterval,
  addDays,
  differenceInDays,
  max as maxDate,
} from 'date-fns'
import { scheduleActivitiesApi } from '@/lib/api/services/schedule-activities'
import { scheduleKeys } from './useScheduleActivities'
import type {
  ScheduleActivity,
  ScheduleResource,
  ResourceAssignment,
  UpdateScheduleActivityDTO,
} from '@/types/schedule-activities'

// =============================================
// Types
// =============================================

export interface ResourceAllocationDay {
  date: string
  allocations: {
    resourceId: string
    resourceName: string
    resourceType: 'labor' | 'equipment' | 'material' | 'cost'
    activities: {
      activityId: string
      activityName: string
      units: number
      hours: number
    }[]
    totalUnits: number
    totalHours: number
    capacity: number
    isOverallocated: boolean
    overallocationAmount: number
  }[]
}

export interface ResourceConflict {
  date: string
  resourceId: string
  resourceName: string
  resourceType: 'labor' | 'equipment' | 'material' | 'cost'
  totalDemand: number
  capacity: number
  overloadAmount: number
  affectedActivities: {
    activityId: string
    activityName: string
    units: number
    isCritical: boolean
    canDelay: boolean
  }[]
}

export interface LevelingOption {
  type: 'delay' | 'split' | 'reduce_units' | 'extend_duration'
  activityId: string
  activityName: string
  description: string
  impact: {
    delayDays?: number
    newStart?: string
    newFinish?: string
    projectDelayDays?: number
  }
  priority: number
}

export interface LevelingSolution {
  conflicts: ResourceConflict[]
  options: LevelingOption[]
  recommendations: LevelingOption[]
  projectedProjectEnd: string | null
  originalProjectEnd: string | null
  totalDelayDays: number
}

export interface ResourceHistogramData {
  dates: string[]
  series: {
    resourceId: string
    resourceName: string
    resourceType: string
    data: number[]
    capacity: number
    color: string
  }[]
  overallocatedDates: string[]
}

export interface LevelingSettings {
  // Priority rules
  prioritizeBy: 'critical_path' | 'total_float' | 'start_date' | 'duration'
  preserveCriticalPath: boolean

  // Leveling methods
  allowDelay: boolean
  allowSplit: boolean
  allowReduceUnits: boolean
  allowExtendDuration: boolean

  // Constraints
  respectConstraints: boolean
  levelWithinFloat: boolean
  maxDelayPerActivity: number // days

  // Resources to level
  resourceFilter: string[] // empty = all resources
}

export const DEFAULT_LEVELING_SETTINGS: LevelingSettings = {
  prioritizeBy: 'critical_path',
  preserveCriticalPath: true,
  allowDelay: true,
  allowSplit: false,
  allowReduceUnits: false,
  allowExtendDuration: false,
  respectConstraints: true,
  levelWithinFloat: true,
  maxDelayPerActivity: 30,
  resourceFilter: [],
}

// =============================================
// Helper Functions
// =============================================

function getResourceColor(resourceType: string, index: number): string {
  const colors = {
    labor: ['#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe'],
    equipment: ['#f97316', '#fb923c', '#fdba74', '#fed7aa'],
    material: ['#22c55e', '#4ade80', '#86efac', '#bbf7d0'],
    cost: ['#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe'],
  }
  const typeColors = colors[resourceType as keyof typeof colors] || colors.labor
  return typeColors[index % typeColors.length]
}

function calculateActivityDuration(start: string, finish: string): number {
  if (!start || !finish) {return 0}
  try {
    return Math.max(1, differenceInDays(parseISO(finish), parseISO(start)) + 1)
  } catch {
    return 1
  }
}

// =============================================
// Hook
// =============================================

export function useResourceLeveling(
  projectId: string,
  activities: ScheduleActivity[],
  resources: ScheduleResource[],
  assignments: ResourceAssignment[],
  options?: {
    startDate?: Date
    endDate?: Date
    settings?: Partial<LevelingSettings>
  }
) {
  const queryClient = useQueryClient()
  const [settings, setSettings] = useState<LevelingSettings>({
    ...DEFAULT_LEVELING_SETTINGS,
    ...options?.settings,
  })

  // Calculate date range
  const dateRange = useMemo(() => {
    if (options?.startDate && options?.endDate) {
      return { start: options.startDate, end: options.endDate }
    }

    const starts = activities
      .filter((a) => a.planned_start)
      .map((a) => parseISO(a.planned_start!))

    const ends = activities
      .filter((a) => a.planned_finish)
      .map((a) => parseISO(a.planned_finish!))

    if (starts.length === 0 || ends.length === 0) {
      const now = new Date()
      return { start: now, end: addDays(now, 90) }
    }

    return {
      start: new Date(Math.min(...starts.map((d) => d.getTime()))),
      end: new Date(Math.max(...ends.map((d) => d.getTime()))),
    }
  }, [activities, options?.startDate, options?.endDate])

  // Build resource map
  const resourceMap = useMemo(() => {
    const map = new Map<string, ScheduleResource>()
    resources.forEach((r) => map.set(r.id, r))
    return map
  }, [resources])

  // Build assignment map (activity -> resources)
  const activityAssignments = useMemo(() => {
    const map = new Map<string, ResourceAssignment[]>()
    assignments.forEach((a) => {
      const existing = map.get(a.activity_id) || []
      existing.push(a)
      map.set(a.activity_id, existing)
    })
    return map
  }, [assignments])

  // Calculate daily allocations
  const dailyAllocations = useMemo((): ResourceAllocationDay[] => {
    const days = eachDayOfInterval(dateRange)

    return days.map((day) => {
      const dateStr = format(day, 'yyyy-MM-dd')
      const resourceAllocations = new Map<string, ResourceAllocationDay['allocations'][0]>()

      // Initialize all resources
      resources.forEach((resource) => {
        if (
          settings.resourceFilter.length > 0 &&
          !settings.resourceFilter.includes(resource.id)
        ) {
          return
        }

        resourceAllocations.set(resource.id, {
          resourceId: resource.id,
          resourceName: resource.name,
          resourceType: resource.resource_type,
          activities: [],
          totalUnits: 0,
          totalHours: 0,
          capacity: resource.max_units * 8, // Assuming 8 hours per unit per day
          isOverallocated: false,
          overallocationAmount: 0,
        })
      })

      // Find activities active on this day
      activities.forEach((activity) => {
        if (!activity.planned_start || !activity.planned_finish) {return}

        const actStart = parseISO(activity.planned_start)
        const actEnd = parseISO(activity.planned_finish)

        if (!isWithinInterval(day, { start: actStart, end: actEnd })) {return}

        // Get assignments for this activity
        const actAssignments = activityAssignments.get(activity.id) || []

        actAssignments.forEach((assignment) => {
          const allocation = resourceAllocations.get(assignment.resource_id)
          if (!allocation) {return}

          const duration = calculateActivityDuration(activity.planned_start!, activity.planned_finish!)
          const dailyHours = (assignment.planned_work_hours || 8) / duration

          allocation.activities.push({
            activityId: activity.id,
            activityName: activity.name,
            units: assignment.units,
            hours: dailyHours,
          })
          allocation.totalUnits += assignment.units
          allocation.totalHours += dailyHours
        })
      })

      // Calculate over-allocation
      resourceAllocations.forEach((allocation) => {
        if (allocation.totalHours > allocation.capacity) {
          allocation.isOverallocated = true
          allocation.overallocationAmount = allocation.totalHours - allocation.capacity
        }
      })

      return {
        date: dateStr,
        allocations: Array.from(resourceAllocations.values()),
      }
    })
  }, [activities, resources, assignments, activityAssignments, dateRange, settings.resourceFilter])

  // Detect conflicts
  const conflicts = useMemo((): ResourceConflict[] => {
    const result: ResourceConflict[] = []

    dailyAllocations.forEach((day) => {
      day.allocations.forEach((allocation) => {
        if (allocation.isOverallocated) {
          result.push({
            date: day.date,
            resourceId: allocation.resourceId,
            resourceName: allocation.resourceName,
            resourceType: allocation.resourceType,
            totalDemand: allocation.totalHours,
            capacity: allocation.capacity,
            overloadAmount: allocation.overallocationAmount,
            affectedActivities: allocation.activities.map((a) => {
              const activity = activities.find((act) => act.id === a.activityId)
              return {
                activityId: a.activityId,
                activityName: a.activityName,
                units: a.units,
                isCritical: activity?.is_critical || false,
                canDelay: (activity?.total_float || 0) > 0,
              }
            }),
          })
        }
      })
    })

    return result
  }, [dailyAllocations, activities])

  // Generate histogram data
  const histogramData = useMemo((): ResourceHistogramData => {
    const dates = dailyAllocations.map((d) => d.date)
    const overallocatedDates = new Set<string>()

    // Group allocations by resource
    const resourceData = new Map<string, { data: number[]; capacity: number }>()

    resources.forEach((resource) => {
      if (
        settings.resourceFilter.length > 0 &&
        !settings.resourceFilter.includes(resource.id)
      ) {
        return
      }

      resourceData.set(resource.id, {
        data: [],
        capacity: resource.max_units * 8,
      })
    })

    dailyAllocations.forEach((day) => {
      day.allocations.forEach((allocation) => {
        const data = resourceData.get(allocation.resourceId)
        if (data) {
          data.data.push(allocation.totalHours)
          if (allocation.isOverallocated) {
            overallocatedDates.add(day.date)
          }
        }
      })
    })

    const series = resources
      .filter((r) =>
        settings.resourceFilter.length === 0 ||
        settings.resourceFilter.includes(r.id)
      )
      .map((resource, index) => {
        const data = resourceData.get(resource.id)
        return {
          resourceId: resource.id,
          resourceName: resource.name,
          resourceType: resource.resource_type,
          data: data?.data || [],
          capacity: data?.capacity || resource.max_units * 8,
          color: getResourceColor(resource.resource_type, index),
        }
      })

    return {
      dates,
      series,
      overallocatedDates: Array.from(overallocatedDates),
    }
  }, [dailyAllocations, resources, settings.resourceFilter])

  // Generate leveling options
  const levelingOptions = useMemo((): LevelingOption[] => {
    const options: LevelingOption[] = []

    // Group conflicts by resource and date range
    const conflictsByResource = new Map<string, ResourceConflict[]>()
    conflicts.forEach((conflict) => {
      const existing = conflictsByResource.get(conflict.resourceId) || []
      existing.push(conflict)
      conflictsByResource.set(conflict.resourceId, existing)
    })

    conflictsByResource.forEach((resourceConflicts, resourceId) => {
      // Find all affected activities
      const affectedActivityIds = new Set<string>()
      resourceConflicts.forEach((c) => {
        c.affectedActivities.forEach((a) => affectedActivityIds.add(a.activityId))
      })

      affectedActivityIds.forEach((activityId) => {
        const activity = activities.find((a) => a.id === activityId)
        if (!activity) {return}

        const isCritical = activity.is_critical
        const totalFloat = activity.total_float || 0
        const canDelay = totalFloat > 0 || !settings.preserveCriticalPath

        // Option 1: Delay activity
        if (settings.allowDelay && canDelay) {
          const delayDays = Math.min(
            Math.max(1, Math.ceil(totalFloat)),
            settings.maxDelayPerActivity
          )
          const newStart = activity.planned_start
            ? format(addDays(parseISO(activity.planned_start), delayDays), 'yyyy-MM-dd')
            : null
          const newFinish = activity.planned_finish
            ? format(addDays(parseISO(activity.planned_finish), delayDays), 'yyyy-MM-dd')
            : null

          options.push({
            type: 'delay',
            activityId,
            activityName: activity.name,
            description: `Delay "${activity.name}" by ${delayDays} day(s)`,
            impact: {
              delayDays,
              newStart: newStart || undefined,
              newFinish: newFinish || undefined,
              projectDelayDays: isCritical ? delayDays : 0,
            },
            priority: isCritical ? 0 : totalFloat > 5 ? 3 : 2,
          })
        }

        // Option 2: Extend duration (reduce daily effort)
        if (settings.allowExtendDuration) {
          const currentDuration = activity.planned_duration || 1
          const newDuration = Math.ceil(currentDuration * 1.5)
          const extensionDays = newDuration - currentDuration

          const newFinish = activity.planned_start
            ? format(addDays(parseISO(activity.planned_start), newDuration - 1), 'yyyy-MM-dd')
            : null

          options.push({
            type: 'extend_duration',
            activityId,
            activityName: activity.name,
            description: `Extend "${activity.name}" from ${currentDuration} to ${newDuration} days`,
            impact: {
              newFinish: newFinish || undefined,
              projectDelayDays: isCritical ? extensionDays : 0,
            },
            priority: isCritical ? 1 : 2,
          })
        }
      })
    })

    // Sort by priority (lower = better)
    return options.sort((a, b) => a.priority - b.priority)
  }, [conflicts, activities, settings])

  // Generate recommendations (top options that resolve conflicts)
  const recommendations = useMemo((): LevelingOption[] => {
    // Simple recommendation: pick best option for each conflicted activity
    const recommended = new Map<string, LevelingOption>()

    levelingOptions.forEach((option) => {
      if (!recommended.has(option.activityId)) {
        recommended.set(option.activityId, option)
      }
    })

    return Array.from(recommended.values()).slice(0, 10)
  }, [levelingOptions])

  // Apply leveling mutation
  const applyLevelingMutation = useMutation({
    mutationFn: async (optionsToApply: LevelingOption[]) => {
      const updates: { id: string; updates: UpdateScheduleActivityDTO }[] = []

      for (const option of optionsToApply) {
        const activity = activities.find((a) => a.id === option.activityId)
        if (!activity) {continue}

        const update: UpdateScheduleActivityDTO = {}

        if (option.type === 'delay' && option.impact.newStart && option.impact.newFinish) {
          update.planned_start = option.impact.newStart
          update.planned_finish = option.impact.newFinish
        }

        if (option.type === 'extend_duration' && option.impact.newFinish) {
          update.planned_finish = option.impact.newFinish
          const newDuration = differenceInDays(
            parseISO(option.impact.newFinish),
            parseISO(activity.planned_start!)
          ) + 1
          update.planned_duration = newDuration
        }

        if (Object.keys(update).length > 0) {
          updates.push({ id: option.activityId, updates: update })
        }
      }

      if (updates.length > 0) {
        return scheduleActivitiesApi.bulkUpdateActivities(updates)
      }

      return { updated: 0 }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: scheduleKeys.lists(),
      })
      queryClient.invalidateQueries({
        queryKey: scheduleKeys.stats(projectId),
      })
      toast.success('Resource leveling applied successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to apply resource leveling')
    },
  })

  // Calculate solution summary
  const solution = useMemo((): LevelingSolution => {
    const originalProjectEnd = activities
      .filter((a) => a.planned_finish)
      .map((a) => a.planned_finish!)
      .sort()
      .pop() || null

    const totalDelay = recommendations.reduce(
      (sum, r) => sum + (r.impact.projectDelayDays || 0),
      0
    )

    const projectedEnd = originalProjectEnd && totalDelay > 0
      ? format(addDays(parseISO(originalProjectEnd), totalDelay), 'yyyy-MM-dd')
      : originalProjectEnd

    return {
      conflicts,
      options: levelingOptions,
      recommendations,
      projectedProjectEnd: projectedEnd,
      originalProjectEnd,
      totalDelayDays: totalDelay,
    }
  }, [conflicts, levelingOptions, recommendations, activities])

  // Update settings
  const updateSettings = useCallback((updates: Partial<LevelingSettings>) => {
    setSettings((prev) => ({ ...prev, ...updates }))
  }, [])

  return {
    // Data
    dailyAllocations,
    conflicts,
    histogramData,
    solution,
    settings,

    // Stats
    hasConflicts: conflicts.length > 0,
    totalConflicts: conflicts.length,
    uniqueConflictDays: new Set(conflicts.map((c) => c.date)).size,
    affectedResources: new Set(conflicts.map((c) => c.resourceId)).size,

    // Actions
    updateSettings,
    applyLeveling: applyLevelingMutation.mutate,
    applySelectedOptions: (options: LevelingOption[]) => applyLevelingMutation.mutate(options),
    isApplying: applyLevelingMutation.isPending,

    // Date range
    dateRange,
  }
}

export default useResourceLeveling
