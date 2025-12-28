// File: src/lib/api/services/schedule.ts
// API service for Gantt Charts & Scheduling feature

import { supabase } from '@/lib/supabase'
import { ApiErrorClass } from '../errors'
import type {
  ScheduleItem,
  ScheduleItemWithVariance,
  ScheduleBaseline,
  TaskDependency,
  CreateScheduleItemDTO,
  UpdateScheduleItemDTO,
  CreateDependencyDTO,
  ScheduleFilters,
} from '@/types/schedule'

// Use 'any' for tables not in generated types
const db = supabase as any

export const scheduleApi = {
  // =============================================
  // SCHEDULE ITEMS
  // =============================================

  /**
   * Fetch all schedule items for a project
   */
  async getScheduleItems(filters: ScheduleFilters): Promise<ScheduleItem[]> {
    try {
      let query = db
        .from('schedule_items')
        .select('*')
        .eq('project_id', filters.project_id)
        .is('deleted_at', null)
        .order('sort_order', { ascending: true })
        .order('start_date', { ascending: true })

      // Apply filters
      if (filters.show_completed === false) {
        query = query.lt('percent_complete', 100)
      }

      if (filters.show_milestones_only) {
        query = query.eq('is_milestone', true)
      }

      if (filters.assigned_to) {
        query = query.eq('assigned_to', filters.assigned_to)
      }

      if (filters.date_from) {
        query = query.gte('start_date', filters.date_from)
      }

      if (filters.date_to) {
        query = query.lte('finish_date', filters.date_to)
      }

      if (filters.search) {
        query = query.ilike('task_name', `%${filters.search}%`)
      }

      if (filters.critical_only) {
        query = query.eq('is_critical', true)
      }

      const { data, error } = await query

      if (error) {
        throw new ApiErrorClass({
          code: 'FETCH_SCHEDULE_ITEMS_ERROR',
          message: `Failed to fetch schedule items: ${error.message}`,
        })
      }

      return (data || []) as ScheduleItem[]
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_SCHEDULE_ITEMS_ERROR',
            message: 'Failed to fetch schedule items',
          })
    }
  },

  /**
   * Fetch a single schedule item by ID
   */
  async getScheduleItem(itemId: string): Promise<ScheduleItem> {
    try {
      if (!itemId) {
        throw new ApiErrorClass({
          code: 'ITEM_ID_REQUIRED',
          message: 'Schedule item ID is required',
        })
      }

      const { data, error } = await db
        .from('schedule_items')
        .select('*')
        .eq('id', itemId)
        .is('deleted_at', null)
        .single()

      if (error) {
        throw new ApiErrorClass({
          code: 'FETCH_SCHEDULE_ITEM_ERROR',
          message: `Failed to fetch schedule item: ${error.message}`,
        })
      }

      if (!data) {
        throw new ApiErrorClass({
          code: 'SCHEDULE_ITEM_NOT_FOUND',
          message: 'Schedule item not found',
        })
      }

      return data as ScheduleItem
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_SCHEDULE_ITEM_ERROR',
            message: 'Failed to fetch schedule item',
          })
    }
  },

  /**
   * Create a new schedule item
   */
  async createScheduleItem(data: CreateScheduleItemDTO): Promise<ScheduleItem> {
    try {
      if (!data.project_id) {
        throw new ApiErrorClass({
          code: 'PROJECT_ID_REQUIRED',
          message: 'Project ID is required',
        })
      }

      if (!data.task_name) {
        throw new ApiErrorClass({
          code: 'TASK_NAME_REQUIRED',
          message: 'Task name is required',
        })
      }

      const { data: newItem, error } = await db
        .from('schedule_items')
        .insert({
          project_id: data.project_id,
          task_name: data.task_name,
          start_date: data.start_date,
          finish_date: data.finish_date,
          duration_days: data.duration_days || 1,
          percent_complete: data.percent_complete || 0,
          is_milestone: data.is_milestone || false,
          assigned_to: data.assigned_to,
          notes: data.notes,
          color: data.color,
          wbs: data.wbs,
          parent_id: data.parent_id,
          is_critical: false,
          created_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) {
        throw new ApiErrorClass({
          code: 'CREATE_SCHEDULE_ITEM_ERROR',
          message: `Failed to create schedule item: ${error.message}`,
        })
      }

      return newItem as ScheduleItem
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'CREATE_SCHEDULE_ITEM_ERROR',
            message: 'Failed to create schedule item',
          })
    }
  },

  /**
   * Update a schedule item
   */
  async updateScheduleItem(
    itemId: string,
    updates: UpdateScheduleItemDTO
  ): Promise<ScheduleItem> {
    try {
      if (!itemId) {
        throw new ApiErrorClass({
          code: 'ITEM_ID_REQUIRED',
          message: 'Schedule item ID is required',
        })
      }

      const { data, error } = await db
        .from('schedule_items')
        .update({
          ...updates,
          last_updated_at: new Date().toISOString(),
        })
        .eq('id', itemId)
        .select()
        .single()

      if (error) {
        throw new ApiErrorClass({
          code: 'UPDATE_SCHEDULE_ITEM_ERROR',
          message: `Failed to update schedule item: ${error.message}`,
        })
      }

      return data as ScheduleItem
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'UPDATE_SCHEDULE_ITEM_ERROR',
            message: 'Failed to update schedule item',
          })
    }
  },

  /**
   * Delete a schedule item (soft delete)
   */
  async deleteScheduleItem(itemId: string): Promise<void> {
    try {
      if (!itemId) {
        throw new ApiErrorClass({
          code: 'ITEM_ID_REQUIRED',
          message: 'Schedule item ID is required',
        })
      }

      const { error } = await db
        .from('schedule_items')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', itemId)

      if (error) {
        throw new ApiErrorClass({
          code: 'DELETE_SCHEDULE_ITEM_ERROR',
          message: `Failed to delete schedule item: ${error.message}`,
        })
      }
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'DELETE_SCHEDULE_ITEM_ERROR',
            message: 'Failed to delete schedule item',
          })
    }
  },

  /**
   * Update progress percentage for a schedule item
   */
  async updateProgress(itemId: string, percentComplete: number): Promise<ScheduleItem> {
    return this.updateScheduleItem(itemId, {
      percent_complete: Math.max(0, Math.min(100, percentComplete)),
    })
  },

  /**
   * Reorder schedule items
   */
  async reorderItems(items: { id: string; sort_order: number }[]): Promise<void> {
    try {
      await Promise.all(
        items.map((item) =>
          db
            .from('schedule_items')
            .update({ sort_order: item.sort_order })
            .eq('id', item.id)
        )
      )
    } catch (_error) {
      throw new ApiErrorClass({
        code: 'REORDER_ITEMS_ERROR',
        message: 'Failed to reorder schedule items',
      })
    }
  },

  // =============================================
  // TASK DEPENDENCIES
  // =============================================

  /**
   * Fetch all dependencies for a project
   */
  async getDependencies(projectId: string): Promise<TaskDependency[]> {
    try {
      if (!projectId) {
        throw new ApiErrorClass({
          code: 'PROJECT_ID_REQUIRED',
          message: 'Project ID is required',
        })
      }

      const { data, error } = await db
        .from('task_dependencies')
        .select('*')
        .eq('project_id', projectId)

      if (error) {
        throw new ApiErrorClass({
          code: 'FETCH_DEPENDENCIES_ERROR',
          message: `Failed to fetch dependencies: ${error.message}`,
        })
      }

      return (data || []) as TaskDependency[]
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_DEPENDENCIES_ERROR',
            message: 'Failed to fetch dependencies',
          })
    }
  },

  /**
   * Create a dependency between two tasks
   */
  async createDependency(data: CreateDependencyDTO): Promise<TaskDependency> {
    try {
      if (!data.predecessor_id || !data.successor_id) {
        throw new ApiErrorClass({
          code: 'DEPENDENCY_IDS_REQUIRED',
          message: 'Both predecessor and successor IDs are required',
        })
      }

      if (data.predecessor_id === data.successor_id) {
        throw new ApiErrorClass({
          code: 'INVALID_DEPENDENCY',
          message: 'A task cannot depend on itself',
        })
      }

      const { data: newDep, error } = await db
        .from('task_dependencies')
        .insert({
          project_id: data.project_id,
          predecessor_id: data.predecessor_id,
          successor_id: data.successor_id,
          dependency_type: data.dependency_type || 'FS',
          lag_days: data.lag_days || 0,
          created_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) {
        // Check for circular dependency error
        if (error.message.includes('Circular dependency')) {
          throw new ApiErrorClass({
            code: 'CIRCULAR_DEPENDENCY',
            message: 'Cannot create dependency: this would create a circular reference',
          })
        }
        throw new ApiErrorClass({
          code: 'CREATE_DEPENDENCY_ERROR',
          message: `Failed to create dependency: ${error.message}`,
        })
      }

      return newDep as TaskDependency
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'CREATE_DEPENDENCY_ERROR',
            message: 'Failed to create dependency',
          })
    }
  },

  /**
   * Delete a dependency
   */
  async deleteDependency(dependencyId: string): Promise<void> {
    try {
      if (!dependencyId) {
        throw new ApiErrorClass({
          code: 'DEPENDENCY_ID_REQUIRED',
          message: 'Dependency ID is required',
        })
      }

      const { error } = await db
        .from('task_dependencies')
        .delete()
        .eq('id', dependencyId)

      if (error) {
        throw new ApiErrorClass({
          code: 'DELETE_DEPENDENCY_ERROR',
          message: `Failed to delete dependency: ${error.message}`,
        })
      }
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'DELETE_DEPENDENCY_ERROR',
            message: 'Failed to delete dependency',
          })
    }
  },

  // =============================================
  // SCHEDULE STATISTICS
  // =============================================

  /**
   * Get schedule summary statistics
   */
  async getScheduleStats(projectId: string): Promise<{
    total_tasks: number
    completed_tasks: number
    in_progress_tasks: number
    not_started_tasks: number
    overdue_tasks: number
    milestones: number
    critical_tasks: number
    overall_progress: number
  }> {
    try {
      const items = await this.getScheduleItems({ project_id: projectId })
      const today = new Date().toISOString().split('T')[0]

      const stats = {
        total_tasks: items.length,
        completed_tasks: items.filter((i) => i.percent_complete === 100).length,
        in_progress_tasks: items.filter((i) => i.percent_complete > 0 && i.percent_complete < 100).length,
        not_started_tasks: items.filter((i) => i.percent_complete === 0).length,
        overdue_tasks: items.filter((i) => i.finish_date < today && i.percent_complete < 100).length,
        milestones: items.filter((i) => i.is_milestone).length,
        critical_tasks: items.filter((i) => i.is_critical).length,
        overall_progress: 0,
      }

      // Calculate weighted progress
      if (items.length > 0) {
        const totalProgress = items.reduce((sum, item) => sum + item.percent_complete, 0)
        stats.overall_progress = Math.round(totalProgress / items.length)
      }

      return stats
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_SCHEDULE_STATS_ERROR',
            message: 'Failed to fetch schedule statistics',
          })
    }
  },

  /**
   * Get date range for project schedule
   */
  async getScheduleDateRange(projectId: string): Promise<{
    earliest_start: string | null
    latest_finish: string | null
  }> {
    try {
      const items = await this.getScheduleItems({ project_id: projectId })

      if (items.length === 0) {
        return { earliest_start: null, latest_finish: null }
      }

      const dates = items.map((i) => ({
        start: new Date(i.start_date),
        finish: new Date(i.finish_date),
      }))

      const earliestStart = new Date(Math.min(...dates.map((d) => d.start.getTime())))
      const latestFinish = new Date(Math.max(...dates.map((d) => d.finish.getTime())))

      return {
        earliest_start: earliestStart.toISOString().split('T')[0],
        latest_finish: latestFinish.toISOString().split('T')[0],
      }
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_DATE_RANGE_ERROR',
            message: 'Failed to fetch schedule date range',
          })
    }
  },

  // =============================================
  // BASELINE MANAGEMENT
  // =============================================

  /**
   * Get schedule items with variance calculations
   */
  async getScheduleItemsWithVariance(projectId: string): Promise<ScheduleItemWithVariance[]> {
    try {
      const { data, error } = await db
        .from('schedule_items_with_variance')
        .select('*')
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .order('sort_order', { ascending: true })
        .order('start_date', { ascending: true })

      if (error) {
        throw new ApiErrorClass({
          code: 'FETCH_VARIANCE_ERROR',
          message: `Failed to fetch schedule variance: ${error.message}`,
        })
      }

      return (data || []) as ScheduleItemWithVariance[]
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_VARIANCE_ERROR',
            message: 'Failed to fetch schedule variance',
          })
    }
  },

  /**
   * Save current schedule as baseline
   */
  async saveBaseline(
    projectId: string,
    name: string = 'Baseline',
    description?: string
  ): Promise<string> {
    try {
      const { data, error } = await db.rpc('save_schedule_baseline', {
        p_project_id: projectId,
        p_name: name,
        p_description: description || null,
      })

      if (error) {
        throw new ApiErrorClass({
          code: 'SAVE_BASELINE_ERROR',
          message: `Failed to save baseline: ${error.message}`,
        })
      }

      return data as string
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'SAVE_BASELINE_ERROR',
            message: 'Failed to save baseline',
          })
    }
  },

  /**
   * Clear baseline for a project
   */
  async clearBaseline(projectId: string): Promise<void> {
    try {
      const { error } = await db.rpc('clear_schedule_baseline', {
        p_project_id: projectId,
      })

      if (error) {
        throw new ApiErrorClass({
          code: 'CLEAR_BASELINE_ERROR',
          message: `Failed to clear baseline: ${error.message}`,
        })
      }
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'CLEAR_BASELINE_ERROR',
            message: 'Failed to clear baseline',
          })
    }
  },

  /**
   * Get all baselines for a project
   */
  async getBaselines(projectId: string): Promise<ScheduleBaseline[]> {
    try {
      const { data, error } = await db
        .from('schedule_baselines')
        .select('*')
        .eq('project_id', projectId)
        .order('saved_at', { ascending: false })

      if (error) {
        throw new ApiErrorClass({
          code: 'FETCH_BASELINES_ERROR',
          message: `Failed to fetch baselines: ${error.message}`,
        })
      }

      return (data || []) as ScheduleBaseline[]
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_BASELINES_ERROR',
            message: 'Failed to fetch baselines',
          })
    }
  },

  /**
   * Check if project has an active baseline
   */
  async hasBaseline(projectId: string): Promise<boolean> {
    try {
      const items = await this.getScheduleItems({ project_id: projectId })
      return items.some(item => item.baseline_start_date !== null)
    } catch (_error) {
      return false
    }
  },

  // =============================================
  // BULK IMPORT
  // =============================================

  /**
   * Import schedule items in bulk (for MS Project import)
   */
  async importScheduleItems(
    projectId: string,
    items: Omit<CreateScheduleItemDTO, 'project_id'>[],
    clearExisting: boolean = false
  ): Promise<{ imported: number; errors: string[] }> {
    const errors: string[] = []
    let imported = 0

    try {
      // Optionally clear existing items
      if (clearExisting) {
        const { error: deleteError } = await db
          .from('schedule_items')
          .update({ deleted_at: new Date().toISOString() })
          .eq('project_id', projectId)

        if (deleteError) {
          errors.push(`Failed to clear existing items: ${deleteError.message}`)
        }
      }

      // Insert items in batches of 50
      const batchSize = 50
      for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize).map((item, index) => ({
          project_id: projectId,
          task_name: item.task_name,
          start_date: item.start_date,
          finish_date: item.finish_date,
          duration_days: item.duration_days || 1,
          percent_complete: item.percent_complete || 0,
          is_milestone: item.is_milestone || false,
          assigned_to: item.assigned_to,
          notes: item.notes,
          color: item.color,
          wbs: item.wbs,
          is_critical: false,
          sort_order: i + index,
          imported_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        }))

        const { error: insertError, data: insertedData } = await db
          .from('schedule_items')
          .insert(batch)
          .select('id')

        if (insertError) {
          errors.push(`Batch ${Math.floor(i / batchSize) + 1} failed: ${insertError.message}`)
        } else {
          imported += insertedData?.length || 0
        }
      }

      return { imported, errors }
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'IMPORT_SCHEDULE_ERROR',
            message: 'Failed to import schedule items',
          })
    }
  },

  /**
   * Import dependencies in bulk
   */
  async importDependencies(
    projectId: string,
    dependencies: Omit<CreateDependencyDTO, 'project_id'>[]
  ): Promise<{ imported: number; errors: string[] }> {
    const errors: string[] = []
    let imported = 0

    try {
      for (const dep of dependencies) {
        try {
          await this.createDependency({
            project_id: projectId,
            ...dep,
          })
          imported++
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Unknown error'
          errors.push(`Dependency ${dep.predecessor_id} -> ${dep.successor_id}: ${message}`)
        }
      }

      return { imported, errors }
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'IMPORT_DEPENDENCIES_ERROR',
            message: 'Failed to import dependencies',
          })
    }
  },

  /**
   * Update critical path flags based on calculation
   */
  async updateCriticalPath(
    projectId: string,
    criticalTaskIds: string[]
  ): Promise<void> {
    try {
      // First, reset all tasks to non-critical
      await db
        .from('schedule_items')
        .update({ is_critical: false })
        .eq('project_id', projectId)

      // Then mark critical tasks
      if (criticalTaskIds.length > 0) {
        await db
          .from('schedule_items')
          .update({ is_critical: true })
          .in('id', criticalTaskIds)
      }
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'UPDATE_CRITICAL_PATH_ERROR',
            message: 'Failed to update critical path',
          })
    }
  },
}
