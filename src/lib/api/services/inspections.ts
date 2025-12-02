/**
 * Inspections API Service
 *
 * CRUD operations for inspections and related functionality.
 */

import { apiClient } from '../client'
import { ApiErrorClass } from '../errors'
import type { QueryOptions, QueryFilter } from '../types'
import type {
  Inspection,
  CreateInspectionInput,
  UpdateInspectionInput,
  InspectionFilters,
  RecordInspectionResultInput,
  InspectionWithRelations,
  InspectionStats,
} from '@/features/inspections/types'

export const inspectionsApi = {
  /**
   * Fetch all inspections for a project
   */
  async getProjectInspections(
    projectId: string,
    filters?: InspectionFilters,
    options?: QueryOptions
  ): Promise<Inspection[]> {
    try {
      if (!projectId) {
        throw new ApiErrorClass({
          code: 'PROJECT_ID_REQUIRED',
          message: 'Project ID is required',
        })
      }

      const queryFilters: QueryFilter[] = [
        { column: 'project_id', operator: 'eq', value: projectId },
        { column: 'deleted_at', operator: 'eq', value: null },
      ]

      // Add status filter
      if (filters?.status) {
        queryFilters.push({
          column: 'status',
          operator: 'eq',
          value: filters.status,
        })
      }

      // Add result filter
      if (filters?.result) {
        queryFilters.push({
          column: 'result',
          operator: 'eq',
          value: filters.result,
        })
      }

      // Add inspection type filter
      if (filters?.inspection_type) {
        queryFilters.push({
          column: 'inspection_type',
          operator: 'eq',
          value: filters.inspection_type,
        })
      }

      // Add date range filter
      if (filters?.dateRange?.start) {
        queryFilters.push({
          column: 'scheduled_date',
          operator: 'gte',
          value: filters.dateRange.start,
        })
      }
      if (filters?.dateRange?.end) {
        queryFilters.push({
          column: 'scheduled_date',
          operator: 'lte',
          value: filters.dateRange.end,
        })
      }

      return await apiClient.select<Inspection>('inspections', {
        ...options,
        filters: queryFilters,
        orderBy: options?.orderBy || { column: 'scheduled_date', ascending: true },
      })
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_INSPECTIONS_ERROR',
            message: 'Failed to fetch inspections',
          })
    }
  },

  /**
   * Fetch a single inspection by ID with related data
   */
  async getInspection(id: string): Promise<InspectionWithRelations> {
    try {
      if (!id) {
        throw new ApiErrorClass({
          code: 'INSPECTION_ID_REQUIRED',
          message: 'Inspection ID is required',
        })
      }

      const data = await apiClient.selectOne<InspectionWithRelations>('inspections', id, {
        select: `
          *,
          project:projects(id, name),
          related_checklist:checklists(id, name),
          related_permit:permits(id, permit_name),
          created_by_user:users!inspections_created_by_fkey(id, first_name, last_name, email)
        `,
      })

      return data
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_INSPECTION_ERROR',
            message: 'Failed to fetch inspection',
          })
    }
  },

  /**
   * Create a new inspection
   */
  async createInspection(data: CreateInspectionInput): Promise<Inspection> {
    try {
      if (!data.project_id) {
        throw new ApiErrorClass({
          code: 'PROJECT_ID_REQUIRED',
          message: 'Project ID is required',
        })
      }

      if (!data.inspection_name || !data.inspection_type) {
        throw new ApiErrorClass({
          code: 'VALIDATION_ERROR',
          message: 'Inspection name and type are required',
        })
      }

      return await apiClient.insert<Inspection>('inspections', {
        ...data,
        status: data.scheduled_date ? 'scheduled' : 'pending',
      })
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'CREATE_INSPECTION_ERROR',
            message: 'Failed to create inspection',
          })
    }
  },

  /**
   * Update an existing inspection
   */
  async updateInspection(id: string, updates: UpdateInspectionInput): Promise<Inspection> {
    try {
      if (!id) {
        throw new ApiErrorClass({
          code: 'INSPECTION_ID_REQUIRED',
          message: 'Inspection ID is required',
        })
      }

      return await apiClient.update<Inspection>('inspections', id, updates)
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'UPDATE_INSPECTION_ERROR',
            message: 'Failed to update inspection',
          })
    }
  },

  /**
   * Soft delete an inspection
   */
  async deleteInspection(id: string): Promise<void> {
    try {
      if (!id) {
        throw new ApiErrorClass({
          code: 'INSPECTION_ID_REQUIRED',
          message: 'Inspection ID is required',
        })
      }

      await apiClient.update('inspections', id, {
        deleted_at: new Date().toISOString(),
      })
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'DELETE_INSPECTION_ERROR',
            message: 'Failed to delete inspection',
          })
    }
  },

  /**
   * Record inspection result
   */
  async recordResult(input: RecordInspectionResultInput): Promise<Inspection> {
    try {
      const { id, result, result_date, inspector_notes, ...rest } = input

      if (!id || !result || !result_date) {
        throw new ApiErrorClass({
          code: 'VALIDATION_ERROR',
          message: 'Inspection ID, result, and result date are required',
        })
      }

      // Determine status based on result
      let status: string
      switch (result) {
        case 'pass':
          status = 'completed'
          break
        case 'fail':
          status = 'failed'
          break
        case 'conditional':
          status = 'completed'
          break
        default:
          status = 'completed'
      }

      return await apiClient.update<Inspection>('inspections', id, {
        result,
        result_date,
        inspector_notes,
        status,
        ...rest,
      })
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'RECORD_RESULT_ERROR',
            message: 'Failed to record inspection result',
          })
    }
  },

  /**
   * Schedule reinspection for a failed inspection
   */
  async scheduleReinspection(
    id: string,
    scheduledDate: string,
    scheduledTime?: string
  ): Promise<Inspection> {
    try {
      if (!id || !scheduledDate) {
        throw new ApiErrorClass({
          code: 'VALIDATION_ERROR',
          message: 'Inspection ID and scheduled date are required',
        })
      }

      return await apiClient.update<Inspection>('inspections', id, {
        reinspection_scheduled_date: scheduledDate,
        scheduled_date: scheduledDate,
        scheduled_time: scheduledTime || null,
        status: 'scheduled',
        result: null,
        result_date: null,
        inspector_notes: null,
      })
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'SCHEDULE_REINSPECTION_ERROR',
            message: 'Failed to schedule reinspection',
          })
    }
  },

  /**
   * Get inspection statistics for a project
   */
  async getInspectionStats(projectId: string): Promise<InspectionStats> {
    try {
      if (!projectId) {
        throw new ApiErrorClass({
          code: 'PROJECT_ID_REQUIRED',
          message: 'Project ID is required',
        })
      }

      const inspections = await this.getProjectInspections(projectId)

      const now = new Date()
      const oneWeekFromNow = new Date()
      oneWeekFromNow.setDate(now.getDate() + 7)

      const stats: InspectionStats = {
        total_inspections: inspections.length,
        scheduled_count: inspections.filter((i) => i.status === 'scheduled').length,
        completed_count: inspections.filter((i) => i.status === 'completed').length,
        passed_count: inspections.filter((i) => i.result === 'pass').length,
        failed_count: inspections.filter((i) => i.result === 'fail').length,
        upcoming_this_week: inspections.filter((i) => {
          if (!i.scheduled_date || i.status !== 'scheduled') return false
          const scheduledDate = new Date(i.scheduled_date)
          return scheduledDate >= now && scheduledDate <= oneWeekFromNow
        }).length,
        overdue_count: inspections.filter((i) => {
          if (!i.scheduled_date || i.status !== 'scheduled') return false
          const scheduledDate = new Date(i.scheduled_date)
          return scheduledDate < now
        }).length,
      }

      return stats
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_STATS_ERROR',
            message: 'Failed to fetch inspection statistics',
          })
    }
  },

  /**
   * Get upcoming inspections (next 7 days)
   */
  async getUpcomingInspections(projectId: string): Promise<Inspection[]> {
    try {
      const now = new Date()
      const oneWeekFromNow = new Date()
      oneWeekFromNow.setDate(now.getDate() + 7)

      return await this.getProjectInspections(projectId, {
        status: 'scheduled',
        dateRange: {
          start: now.toISOString().split('T')[0],
          end: oneWeekFromNow.toISOString().split('T')[0],
        },
      })
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_UPCOMING_ERROR',
            message: 'Failed to fetch upcoming inspections',
          })
    }
  },

  /**
   * Cancel an inspection
   */
  async cancelInspection(id: string): Promise<Inspection> {
    try {
      if (!id) {
        throw new ApiErrorClass({
          code: 'INSPECTION_ID_REQUIRED',
          message: 'Inspection ID is required',
        })
      }

      return await apiClient.update<Inspection>('inspections', id, {
        status: 'cancelled',
      })
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'CANCEL_INSPECTION_ERROR',
            message: 'Failed to cancel inspection',
          })
    }
  },
}
