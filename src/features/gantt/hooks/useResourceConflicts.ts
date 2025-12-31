/**
 * Resource Conflict Detection Hook
 *
 * Analyzes schedule items to detect:
 * - Over-allocated resources on specific dates
 * - Concurrent task assignments
 * - Resource utilization patterns
 */

import { useMemo } from 'react'
import { eachDayOfInterval, format, parseISO, isWithinInterval } from 'date-fns'
import type { ScheduleItem } from '@/types/schedule'

export interface ResourceAllocation {
  date: string
  resource: string
  resourceType: 'labor' | 'equipment' | 'subcontractor'
  taskCount: number
  tasks: {
    id: string
    name: string
    workload: number // hours or percentage
  }[]
  totalWorkload: number
  isOverallocated: boolean
}

export interface ResourceConflict {
  date: string
  resource: string
  resourceType: 'labor' | 'equipment' | 'subcontractor'
  totalWorkload: number
  capacity: number
  overloadAmount: number
  affectedTasks: string[]
}

export interface DailyResourceSummary {
  date: string
  totalLabor: number
  totalEquipment: number
  laborCapacity: number
  equipmentCapacity: number
  hasConflicts: boolean
  conflicts: ResourceConflict[]
}

export interface ResourceAnalysis {
  allocations: Map<string, ResourceAllocation[]> // keyed by date
  conflicts: ResourceConflict[]
  dailySummaries: DailyResourceSummary[]
  overallUtilization: number
  peakUtilization: {
    date: string
    value: number
  }
  laborByDay: { date: string; count: number }[]
  equipmentByDay: { date: string; count: number }[]
}

interface UseResourceConflictsOptions {
  laborCapacityPerDay?: number // default hours per day for labor
  equipmentCapacityPerDay?: number // number of equipment items available
  workHoursPerDay?: number // standard work day hours
}

export function useResourceConflicts(
  items: ScheduleItem[],
  startDate: Date,
  endDate: Date,
  options: UseResourceConflictsOptions = {}
): ResourceAnalysis {
  const {
    laborCapacityPerDay = 8,
    equipmentCapacityPerDay = 4,
    workHoursPerDay = 8,
  } = options

  return useMemo(() => {
    if (items.length === 0) {
      return {
        allocations: new Map(),
        conflicts: [],
        dailySummaries: [],
        overallUtilization: 0,
        peakUtilization: { date: '', value: 0 },
        laborByDay: [],
        equipmentByDay: [],
      }
    }

    // Get all days in the range
    const allDays = eachDayOfInterval({ start: startDate, end: endDate })
    const allocations = new Map<string, ResourceAllocation[]>()
    const conflicts: ResourceConflict[] = []

    // For each day, calculate resource allocation
    const dailySummaries: DailyResourceSummary[] = allDays.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd')
      const dayAllocations: ResourceAllocation[] = []

      // Group tasks by assigned resource
      const resourceMap = new Map<string, {
        tasks: { id: string; name: string; workload: number }[]
        type: 'labor' | 'equipment' | 'subcontractor'
      }>()

      // Find all tasks active on this day
      items.forEach(item => {
        const taskStart = parseISO(item.start_date)
        const taskEnd = parseISO(item.finish_date)

        if (isWithinInterval(day, { start: taskStart, end: taskEnd })) {
          // Get assignee (could be person, equipment, or subcontractor)
          const assignee = item.assigned_to || 'Unassigned'
          const resourceType: 'labor' | 'equipment' | 'subcontractor' =
            assignee.toLowerCase().includes('equipment') || assignee.toLowerCase().includes('crane') || assignee.toLowerCase().includes('forklift')
              ? 'equipment'
              : assignee.toLowerCase().includes('subcontractor') || assignee.toLowerCase().includes('sub ')
                ? 'subcontractor'
                : 'labor'

          // Calculate daily workload (assume 8-hour days spread across duration)
          const taskDays = Math.max(1, item.duration_days)
          const dailyWorkload = workHoursPerDay / taskDays * (item.percent_complete < 100 ? 1 : 0.5)

          if (!resourceMap.has(assignee)) {
            resourceMap.set(assignee, { tasks: [], type: resourceType })
          }

          resourceMap.get(assignee)!.tasks.push({
            id: item.id,
            name: item.task_name,
            workload: dailyWorkload,
          })
        }
      })

      // Convert to allocations
      let totalLabor = 0
      let totalEquipment = 0
      const dayConflicts: ResourceConflict[] = []

      resourceMap.forEach((data, resource) => {
        const totalWorkload = data.tasks.reduce((sum, t) => sum + t.workload, 0)
        const capacity = data.type === 'equipment' ? equipmentCapacityPerDay : laborCapacityPerDay
        const isOverallocated = data.tasks.length > 1 && totalWorkload > capacity

        const allocation: ResourceAllocation = {
          date: dateStr,
          resource,
          resourceType: data.type,
          taskCount: data.tasks.length,
          tasks: data.tasks,
          totalWorkload,
          isOverallocated,
        }

        dayAllocations.push(allocation)

        if (data.type === 'labor') {
          totalLabor += data.tasks.length
        } else if (data.type === 'equipment') {
          totalEquipment += data.tasks.length
        }

        // Track conflicts
        if (isOverallocated) {
          dayConflicts.push({
            date: dateStr,
            resource,
            resourceType: data.type,
            totalWorkload,
            capacity,
            overloadAmount: totalWorkload - capacity,
            affectedTasks: data.tasks.map(t => t.id),
          })
        }
      })

      allocations.set(dateStr, dayAllocations)
      conflicts.push(...dayConflicts)

      return {
        date: dateStr,
        totalLabor,
        totalEquipment,
        laborCapacity: laborCapacityPerDay,
        equipmentCapacity: equipmentCapacityPerDay,
        hasConflicts: dayConflicts.length > 0,
        conflicts: dayConflicts,
      }
    })

    // Calculate overall utilization
    const totalWorkDays = dailySummaries.length
    const totalAllocatedDays = dailySummaries.reduce((sum, d) => sum + d.totalLabor, 0)
    const overallUtilization = totalWorkDays > 0 ? (totalAllocatedDays / (totalWorkDays * laborCapacityPerDay)) * 100 : 0

    // Find peak utilization
    const peakDay = dailySummaries.reduce((max, d) =>
      d.totalLabor > (max?.totalLabor || 0) ? d : max
    , dailySummaries[0])

    // Build labor/equipment by day arrays for histogram
    const laborByDay = dailySummaries.map(d => ({
      date: d.date,
      count: d.totalLabor,
    }))

    const equipmentByDay = dailySummaries.map(d => ({
      date: d.date,
      count: d.totalEquipment,
    }))

    return {
      allocations,
      conflicts,
      dailySummaries,
      overallUtilization: Math.round(overallUtilization),
      peakUtilization: {
        date: peakDay?.date || '',
        value: peakDay?.totalLabor || 0,
      },
      laborByDay,
      equipmentByDay,
    }
  }, [items, startDate, endDate, laborCapacityPerDay, equipmentCapacityPerDay, workHoursPerDay])
}

export default useResourceConflicts
