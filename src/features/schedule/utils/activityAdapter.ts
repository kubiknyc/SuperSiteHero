/**
 * Activity Adapter Utility
 * Maps between ScheduleActivity (new schema) and ScheduleItem (Gantt component interface)
 */

import type { ScheduleItem, TaskDependency } from '@/types/schedule'
import type {
  ScheduleActivity,
  ScheduleDependency,
  ScheduleActivityWithDetails,
} from '@/types/schedule-activities'

/**
 * Map a ScheduleActivity to ScheduleItem for GanttChart compatibility
 */
export function mapActivityToScheduleItem(
  activity: ScheduleActivity | ScheduleActivityWithDetails
): ScheduleItem {
  return {
    id: activity.id,
    project_id: activity.project_id,
    task_id: activity.activity_id,
    task_name: activity.name,
    wbs: activity.wbs_code,
    start_date: activity.planned_start || new Date().toISOString().split('T')[0],
    finish_date: activity.planned_finish || new Date().toISOString().split('T')[0],
    baseline_start_date: activity.baseline_start || null,
    baseline_finish_date: activity.baseline_finish || null,
    baseline_duration_days: activity.planned_duration || null,
    baseline_saved_at: null, // Not tracked in new schema at item level
    baseline_saved_by: null,
    duration_days: activity.planned_duration || 1,
    percent_complete: activity.percent_complete || 0,
    predecessors: null, // Dependencies handled separately
    successors: null,
    is_critical: activity.is_critical || activity.is_on_critical_path || false,
    is_milestone: activity.is_milestone || false,
    assigned_to: activity.responsible_party || null,
    notes: activity.notes || null,
    color: activity.bar_color || null,
    imported_at: null,
    last_updated_at: activity.updated_at,
    created_at: activity.created_at,
    created_by: activity.created_by,
    deleted_at: activity.deleted_at,
  }
}

/**
 * Map multiple activities to ScheduleItems
 */
export function mapActivitiesToScheduleItems(
  activities: ScheduleActivity[]
): ScheduleItem[] {
  return activities.map(mapActivityToScheduleItem)
}

/**
 * Map a ScheduleDependency to TaskDependency for GanttChart compatibility
 */
export function mapScheduleDependencyToTaskDependency(
  dep: ScheduleDependency
): TaskDependency {
  return {
    id: dep.id,
    project_id: dep.project_id,
    predecessor_id: dep.predecessor_id,
    successor_id: dep.successor_id,
    dependency_type: dep.dependency_type,
    lag_days: dep.lag_days,
    created_at: dep.created_at,
    created_by: dep.created_by,
  }
}

/**
 * Map multiple dependencies
 */
export function mapDependenciesToTaskDependencies(
  dependencies: ScheduleDependency[]
): TaskDependency[] {
  return dependencies.map(mapScheduleDependencyToTaskDependency)
}

/**
 * Map ScheduleItem back to UpdateScheduleActivityDTO for saves
 */
export function mapScheduleItemToActivityUpdate(item: ScheduleItem): {
  planned_start: string | null
  planned_finish: string | null
  planned_duration: number
} {
  return {
    planned_start: item.start_date,
    planned_finish: item.finish_date,
    planned_duration: item.duration_days,
  }
}

/**
 * Build WBS hierarchy from flat activity list
 */
export function buildActivityHierarchy(
  activities: ScheduleActivityWithDetails[]
): ScheduleActivityWithDetails[] {
  const activityMap = new Map<string, ScheduleActivityWithDetails>()
  const rootActivities: ScheduleActivityWithDetails[] = []

  // First pass: create map and initialize children arrays
  activities.forEach((activity) => {
    activityMap.set(activity.id, { ...activity, children: [] })
  })

  // Second pass: build hierarchy
  activities.forEach((activity) => {
    const mappedActivity = activityMap.get(activity.id)!
    if (activity.parent_activity_id) {
      const parent = activityMap.get(activity.parent_activity_id)
      if (parent) {
        parent.children = parent.children || []
        parent.children.push(mappedActivity)
      } else {
        // Parent not found, add to root
        rootActivities.push(mappedActivity)
      }
    } else {
      rootActivities.push(mappedActivity)
    }
  })

  // Sort by sort_order at each level
  const sortActivities = (items: ScheduleActivityWithDetails[]) => {
    items.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
    items.forEach((item) => {
      if (item.children && item.children.length > 0) {
        sortActivities(item.children)
      }
    })
  }

  sortActivities(rootActivities)
  return rootActivities
}

/**
 * Flatten hierarchy back to list with proper WBS indentation
 */
export function flattenActivityHierarchy(
  activities: ScheduleActivityWithDetails[],
  level = 0
): Array<ScheduleActivityWithDetails & { level: number }> {
  const result: Array<ScheduleActivityWithDetails & { level: number }> = []

  activities.forEach((activity) => {
    result.push({ ...activity, level })
    if (activity.children && activity.children.length > 0) {
      result.push(...flattenActivityHierarchy(activity.children, level + 1))
    }
  })

  return result
}

/**
 * Calculate date range from activities
 */
export function calculateActivityDateRange(activities: ScheduleActivity[]): {
  earliest_start: string | null
  latest_finish: string | null
} {
  const starts = activities
    .filter((a) => a.planned_start)
    .map((a) => new Date(a.planned_start!))
  const finishes = activities
    .filter((a) => a.planned_finish)
    .map((a) => new Date(a.planned_finish!))

  if (starts.length === 0 || finishes.length === 0) {
    return { earliest_start: null, latest_finish: null }
  }

  const earliest = new Date(Math.min(...starts.map((d) => d.getTime())))
  const latest = new Date(Math.max(...finishes.map((d) => d.getTime())))

  return {
    earliest_start: earliest.toISOString().split('T')[0],
    latest_finish: latest.toISOString().split('T')[0],
  }
}

/**
 * Generate next activity ID based on existing activities
 */
export function generateNextActivityId(
  activities: ScheduleActivity[],
  prefix = 'A'
): string {
  const existingNumbers = activities
    .map((a) => {
      const match = a.activity_id.match(/^[A-Z]?(\d+)$/)
      return match ? parseInt(match[1], 10) : 0
    })
    .filter((n) => !isNaN(n))

  const maxNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0
  return `${prefix}${String(maxNumber + 1).padStart(4, '0')}`
}

/**
 * Generate WBS code for a new activity
 */
export function generateWBSCode(
  parentWBS: string | null,
  siblingCount: number
): string {
  if (!parentWBS) {
    return String(siblingCount + 1)
  }
  return `${parentWBS}.${siblingCount + 1}`
}
