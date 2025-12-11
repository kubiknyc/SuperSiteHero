/**
 * Schedule Activities API Service
 * CRUD operations for the schedule_activities schema (Migration 092)
 */

import { supabase } from '@/lib/supabase'
import { ApiErrorClass } from '../errors'
import type {
  ScheduleActivity,
  ScheduleActivityWithDetails,
  ScheduleDependency,
  ScheduleBaseline,
  ScheduleCalendar,
  ScheduleResource,
  ResourceAssignment,
  ScheduleImportLog,
  ScheduleVarianceResult,
  CriticalPathActivity,
  ScheduleStats,
  CreateScheduleActivityDTO,
  UpdateScheduleActivityDTO,
  CreateScheduleDependencyDTO,
  CreateScheduleBaselineDTO,
  CreateScheduleCalendarDTO,
  CreateScheduleResourceDTO,
  CreateResourceAssignmentDTO,
  ScheduleActivityFilters,
} from '@/types/schedule-activities'

// Use 'any' for tables not yet in generated types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

export const scheduleActivitiesApi = {
  // =============================================
  // SCHEDULE ACTIVITIES
  // =============================================

  /**
   * Fetch all schedule activities for a project
   */
  async getActivities(filters: ScheduleActivityFilters): Promise<ScheduleActivity[]> {
    try {
      let query = db
        .from('schedule_activities')
        .select('*')
        .eq('project_id', filters.project_id)
        .order('sort_order', { ascending: true })
        .order('planned_start', { ascending: true })

      // Apply filters
      if (!filters.show_deleted) {
        query = query.is('deleted_at', null)
      }

      if (filters.status && filters.status.length > 0) {
        query = query.in('status', filters.status)
      }

      if (filters.activity_type && filters.activity_type.length > 0) {
        query = query.in('activity_type', filters.activity_type)
      }

      if (filters.is_critical !== undefined) {
        query = query.eq('is_critical', filters.is_critical)
      }

      if (filters.is_milestone !== undefined) {
        query = query.eq('is_milestone', filters.is_milestone)
      }

      if (filters.responsible_user_id) {
        query = query.eq('responsible_user_id', filters.responsible_user_id)
      }

      if (filters.subcontractor_id) {
        query = query.eq('subcontractor_id', filters.subcontractor_id)
      }

      if (filters.wbs_code) {
        query = query.ilike('wbs_code', `${filters.wbs_code}%`)
      }

      if (filters.date_from) {
        query = query.gte('planned_start', filters.date_from)
      }

      if (filters.date_to) {
        query = query.lte('planned_finish', filters.date_to)
      }

      if (filters.search) {
        query = query.or(
          `name.ilike.%${filters.search}%,activity_id.ilike.%${filters.search}%,description.ilike.%${filters.search}%`
        )
      }

      if (filters.parent_activity_id !== undefined) {
        if (filters.parent_activity_id === null) {
          query = query.is('parent_activity_id', null)
        } else {
          query = query.eq('parent_activity_id', filters.parent_activity_id)
        }
      }

      const { data, error } = await query

      if (error) {
        throw new ApiErrorClass({
          code: 'FETCH_ACTIVITIES_ERROR',
          message: `Failed to fetch schedule activities: ${error.message}`,
        })
      }

      return (data || []) as ScheduleActivity[]
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_ACTIVITIES_ERROR',
            message: 'Failed to fetch schedule activities',
          })
    }
  },

  /**
   * Fetch activities with related details from the view
   */
  async getActivitiesWithDetails(
    projectId: string
  ): Promise<ScheduleActivityWithDetails[]> {
    try {
      const { data, error } = await db
        .from('schedule_activity_details')
        .select('*')
        .eq('project_id', projectId)
        .order('sort_order', { ascending: true })
        .order('planned_start', { ascending: true })

      if (error) {
        // If view doesn't exist, fall back to basic query
        if (error.message.includes('does not exist')) {
          return this.getActivities({ project_id: projectId })
        }
        throw new ApiErrorClass({
          code: 'FETCH_ACTIVITY_DETAILS_ERROR',
          message: `Failed to fetch activity details: ${error.message}`,
        })
      }

      return (data || []) as ScheduleActivityWithDetails[]
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_ACTIVITY_DETAILS_ERROR',
            message: 'Failed to fetch activity details',
          })
    }
  },

  /**
   * Fetch a single schedule activity
   */
  async getActivity(activityId: string): Promise<ScheduleActivity> {
    try {
      if (!activityId) {
        throw new ApiErrorClass({
          code: 'ACTIVITY_ID_REQUIRED',
          message: 'Activity ID is required',
        })
      }

      const { data, error } = await db
        .from('schedule_activities')
        .select('*')
        .eq('id', activityId)
        .is('deleted_at', null)
        .single()

      if (error) {
        throw new ApiErrorClass({
          code: 'FETCH_ACTIVITY_ERROR',
          message: `Failed to fetch activity: ${error.message}`,
        })
      }

      if (!data) {
        throw new ApiErrorClass({
          code: 'ACTIVITY_NOT_FOUND',
          message: 'Activity not found',
        })
      }

      return data as ScheduleActivity
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_ACTIVITY_ERROR',
            message: 'Failed to fetch activity',
          })
    }
  },

  /**
   * Create a new schedule activity
   */
  async createActivity(dto: CreateScheduleActivityDTO): Promise<ScheduleActivity> {
    try {
      if (!dto.project_id || !dto.company_id) {
        throw new ApiErrorClass({
          code: 'PROJECT_ID_REQUIRED',
          message: 'Project ID and Company ID are required',
        })
      }

      if (!dto.name || !dto.activity_id) {
        throw new ApiErrorClass({
          code: 'REQUIRED_FIELDS_MISSING',
          message: 'Activity name and ID are required',
        })
      }

      const { data, error } = await db
        .from('schedule_activities')
        .insert({
          project_id: dto.project_id,
          company_id: dto.company_id,
          activity_id: dto.activity_id,
          name: dto.name,
          description: dto.description || null,
          wbs_code: dto.wbs_code || null,
          wbs_level: dto.wbs_level || 1,
          parent_activity_id: dto.parent_activity_id || null,
          sort_order: dto.sort_order || 0,
          planned_start: dto.planned_start || null,
          planned_finish: dto.planned_finish || null,
          planned_duration: dto.planned_duration || null,
          duration_type: dto.duration_type || 'fixed_duration',
          activity_type: dto.activity_type || 'task',
          is_milestone: dto.is_milestone || false,
          constraint_type: dto.constraint_type || null,
          constraint_date: dto.constraint_date || null,
          responsible_party: dto.responsible_party || null,
          responsible_user_id: dto.responsible_user_id || null,
          subcontractor_id: dto.subcontractor_id || null,
          budgeted_cost: dto.budgeted_cost || null,
          budgeted_labor_hours: dto.budgeted_labor_hours || null,
          notes: dto.notes || null,
          bar_color: dto.bar_color || null,
          calendar_id: dto.calendar_id || null,
          status: 'not_started',
          percent_complete: 0,
          is_critical: false,
          is_on_critical_path: false,
        })
        .select()
        .single()

      if (error) {
        throw new ApiErrorClass({
          code: 'CREATE_ACTIVITY_ERROR',
          message: `Failed to create activity: ${error.message}`,
        })
      }

      return data as ScheduleActivity
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'CREATE_ACTIVITY_ERROR',
            message: 'Failed to create activity',
          })
    }
  },

  /**
   * Update a schedule activity
   */
  async updateActivity(
    activityId: string,
    updates: UpdateScheduleActivityDTO
  ): Promise<ScheduleActivity> {
    try {
      if (!activityId) {
        throw new ApiErrorClass({
          code: 'ACTIVITY_ID_REQUIRED',
          message: 'Activity ID is required',
        })
      }

      const { data, error } = await db
        .from('schedule_activities')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', activityId)
        .select()
        .single()

      if (error) {
        throw new ApiErrorClass({
          code: 'UPDATE_ACTIVITY_ERROR',
          message: `Failed to update activity: ${error.message}`,
        })
      }

      return data as ScheduleActivity
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'UPDATE_ACTIVITY_ERROR',
            message: 'Failed to update activity',
          })
    }
  },

  /**
   * Bulk update activities (for drag-drop, reordering)
   */
  async bulkUpdateActivities(
    updates: Array<{ id: string; updates: UpdateScheduleActivityDTO }>
  ): Promise<void> {
    try {
      await Promise.all(
        updates.map((item) =>
          db
            .from('schedule_activities')
            .update({
              ...item.updates,
              updated_at: new Date().toISOString(),
            })
            .eq('id', item.id)
        )
      )
    } catch (error) {
      throw new ApiErrorClass({
        code: 'BULK_UPDATE_ERROR',
        message: 'Failed to bulk update activities',
      })
    }
  },

  /**
   * Delete a schedule activity (soft delete)
   */
  async deleteActivity(activityId: string): Promise<void> {
    try {
      if (!activityId) {
        throw new ApiErrorClass({
          code: 'ACTIVITY_ID_REQUIRED',
          message: 'Activity ID is required',
        })
      }

      const { error } = await db
        .from('schedule_activities')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', activityId)

      if (error) {
        throw new ApiErrorClass({
          code: 'DELETE_ACTIVITY_ERROR',
          message: `Failed to delete activity: ${error.message}`,
        })
      }
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'DELETE_ACTIVITY_ERROR',
            message: 'Failed to delete activity',
          })
    }
  },

  // =============================================
  // DEPENDENCIES
  // =============================================

  /**
   * Fetch all dependencies for a project
   */
  async getDependencies(projectId: string): Promise<ScheduleDependency[]> {
    try {
      const { data, error } = await db
        .from('schedule_dependencies')
        .select('*')
        .eq('project_id', projectId)

      if (error) {
        throw new ApiErrorClass({
          code: 'FETCH_DEPENDENCIES_ERROR',
          message: `Failed to fetch dependencies: ${error.message}`,
        })
      }

      return (data || []) as ScheduleDependency[]
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
   * Create a dependency
   */
  async createDependency(dto: CreateScheduleDependencyDTO): Promise<ScheduleDependency> {
    try {
      if (!dto.predecessor_id || !dto.successor_id) {
        throw new ApiErrorClass({
          code: 'DEPENDENCY_IDS_REQUIRED',
          message: 'Predecessor and successor IDs are required',
        })
      }

      if (dto.predecessor_id === dto.successor_id) {
        throw new ApiErrorClass({
          code: 'INVALID_DEPENDENCY',
          message: 'An activity cannot depend on itself',
        })
      }

      const { data, error } = await db
        .from('schedule_dependencies')
        .insert({
          project_id: dto.project_id,
          predecessor_id: dto.predecessor_id,
          successor_id: dto.successor_id,
          dependency_type: dto.dependency_type || 'FS',
          lag_days: dto.lag_days || 0,
          lag_type: dto.lag_type || 'days',
          lag_value: dto.lag_days || 0,
          is_driving: false,
        })
        .select()
        .single()

      if (error) {
        throw new ApiErrorClass({
          code: 'CREATE_DEPENDENCY_ERROR',
          message: `Failed to create dependency: ${error.message}`,
        })
      }

      return data as ScheduleDependency
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
      const { error } = await db
        .from('schedule_dependencies')
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
  // BASELINES
  // =============================================

  /**
   * Fetch all baselines for a project
   */
  async getBaselines(projectId: string): Promise<ScheduleBaseline[]> {
    try {
      const { data, error } = await db
        .from('schedule_baselines')
        .select('*')
        .eq('project_id', projectId)
        .order('baseline_number', { ascending: false })

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
   * Create a new baseline (snapshot of current schedule)
   */
  async createBaseline(dto: CreateScheduleBaselineDTO): Promise<ScheduleBaseline> {
    try {
      // Get next baseline number
      const { data: existingBaselines } = await db
        .from('schedule_baselines')
        .select('baseline_number')
        .eq('project_id', dto.project_id)
        .order('baseline_number', { ascending: false })
        .limit(1)

      const nextNumber = (existingBaselines?.[0]?.baseline_number || 0) + 1

      // Get current schedule stats
      const activities = await this.getActivities({ project_id: dto.project_id })
      const totalActivities = activities.length
      const plannedStarts = activities
        .filter((a) => a.planned_start)
        .map((a) => a.planned_start!)
      const plannedFinishes = activities
        .filter((a) => a.planned_finish)
        .map((a) => a.planned_finish!)

      const minStart = plannedStarts.length > 0 ? plannedStarts.sort()[0] : null
      const maxFinish = plannedFinishes.length > 0 ? plannedFinishes.sort().pop() : null

      // Create baseline
      const { data: baseline, error } = await db
        .from('schedule_baselines')
        .insert({
          project_id: dto.project_id,
          name: dto.name,
          description: dto.description || null,
          baseline_number: nextNumber,
          baseline_date: new Date().toISOString().split('T')[0],
          is_active: true,
          total_activities: totalActivities,
          planned_start: minStart,
          planned_finish: maxFinish,
        })
        .select()
        .single()

      if (error) {
        throw new ApiErrorClass({
          code: 'CREATE_BASELINE_ERROR',
          message: `Failed to create baseline: ${error.message}`,
        })
      }

      // Copy current activity data to baseline_activities
      const baselineActivities = activities.map((a) => ({
        baseline_id: baseline.id,
        activity_id: a.id,
        planned_start: a.planned_start,
        planned_finish: a.planned_finish,
        planned_duration: a.planned_duration,
        budgeted_cost: a.budgeted_cost,
        budgeted_labor_hours: a.budgeted_labor_hours,
      }))

      if (baselineActivities.length > 0) {
        await db.from('baseline_activities').insert(baselineActivities)
      }

      // Update activities with baseline dates
      await db
        .from('schedule_activities')
        .update({
          baseline_start: db.raw('planned_start'),
          baseline_finish: db.raw('planned_finish'),
        })
        .eq('project_id', dto.project_id)
        .is('deleted_at', null)

      // Set other baselines as inactive
      await db
        .from('schedule_baselines')
        .update({ is_active: false })
        .eq('project_id', dto.project_id)
        .neq('id', baseline.id)

      return baseline as ScheduleBaseline
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'CREATE_BASELINE_ERROR',
            message: 'Failed to create baseline',
          })
    }
  },

  /**
   * Set a baseline as active
   */
  async setActiveBaseline(baselineId: string, projectId: string): Promise<void> {
    try {
      // Deactivate all baselines for the project
      await db
        .from('schedule_baselines')
        .update({ is_active: false })
        .eq('project_id', projectId)

      // Activate the selected baseline
      await db
        .from('schedule_baselines')
        .update({ is_active: true })
        .eq('id', baselineId)

      // Update activities with baseline dates from this baseline
      const { data: baselineActivities } = await db
        .from('baseline_activities')
        .select('activity_id, planned_start, planned_finish')
        .eq('baseline_id', baselineId)

      if (baselineActivities) {
        for (const ba of baselineActivities) {
          await db
            .from('schedule_activities')
            .update({
              baseline_start: ba.planned_start,
              baseline_finish: ba.planned_finish,
            })
            .eq('id', ba.activity_id)
        }
      }
    } catch (error) {
      throw new ApiErrorClass({
        code: 'SET_BASELINE_ERROR',
        message: 'Failed to set active baseline',
      })
    }
  },

  /**
   * Clear active baseline (remove baseline dates from activities)
   */
  async clearActiveBaseline(projectId: string): Promise<void> {
    try {
      // Deactivate all baselines for the project
      await db
        .from('schedule_baselines')
        .update({ is_active: false })
        .eq('project_id', projectId)

      // Clear baseline dates from all activities
      await db
        .from('schedule_activities')
        .update({
          baseline_start: null,
          baseline_finish: null,
        })
        .eq('project_id', projectId)
    } catch (error) {
      throw new ApiErrorClass({
        code: 'CLEAR_BASELINE_ERROR',
        message: 'Failed to clear baseline',
      })
    }
  },

  // =============================================
  // CALENDARS
  // =============================================

  /**
   * Fetch calendars for a company/project
   */
  async getCalendars(
    companyId: string,
    projectId?: string
  ): Promise<ScheduleCalendar[]> {
    try {
      let query = db
        .from('schedule_calendars')
        .select('*')
        .eq('company_id', companyId)
        .order('name')

      if (projectId) {
        query = query.or(`project_id.eq.${projectId},project_id.is.null`)
      } else {
        query = query.is('project_id', null)
      }

      const { data, error } = await query

      if (error) {
        throw new ApiErrorClass({
          code: 'FETCH_CALENDARS_ERROR',
          message: `Failed to fetch calendars: ${error.message}`,
        })
      }

      return (data || []) as ScheduleCalendar[]
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_CALENDARS_ERROR',
            message: 'Failed to fetch calendars',
          })
    }
  },

  /**
   * Create a calendar
   */
  async createCalendar(dto: CreateScheduleCalendarDTO): Promise<ScheduleCalendar> {
    try {
      const { data, error } = await db
        .from('schedule_calendars')
        .insert({
          company_id: dto.company_id,
          project_id: dto.project_id || null,
          name: dto.name,
          description: dto.description || null,
          is_default: dto.is_default || false,
          sunday_hours: dto.sunday_hours ?? 0,
          monday_hours: dto.monday_hours ?? 8,
          tuesday_hours: dto.tuesday_hours ?? 8,
          wednesday_hours: dto.wednesday_hours ?? 8,
          thursday_hours: dto.thursday_hours ?? 8,
          friday_hours: dto.friday_hours ?? 8,
          saturday_hours: dto.saturday_hours ?? 0,
          work_start_time: dto.work_start_time || '07:00',
          work_end_time: dto.work_end_time || '17:00',
        })
        .select()
        .single()

      if (error) {
        throw new ApiErrorClass({
          code: 'CREATE_CALENDAR_ERROR',
          message: `Failed to create calendar: ${error.message}`,
        })
      }

      return data as ScheduleCalendar
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'CREATE_CALENDAR_ERROR',
            message: 'Failed to create calendar',
          })
    }
  },

  /**
   * Update a calendar
   */
  async updateCalendar(
    calendarId: string,
    updates: Partial<CreateScheduleCalendarDTO>
  ): Promise<ScheduleCalendar> {
    try {
      if (!calendarId) {
        throw new ApiErrorClass({
          code: 'CALENDAR_ID_REQUIRED',
          message: 'Calendar ID is required',
        })
      }

      const { data, error } = await db
        .from('schedule_calendars')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', calendarId)
        .select()
        .single()

      if (error) {
        throw new ApiErrorClass({
          code: 'UPDATE_CALENDAR_ERROR',
          message: `Failed to update calendar: ${error.message}`,
        })
      }

      return data as ScheduleCalendar
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'UPDATE_CALENDAR_ERROR',
            message: 'Failed to update calendar',
          })
    }
  },

  /**
   * Delete a calendar (only if not in use)
   */
  async deleteCalendar(calendarId: string): Promise<void> {
    try {
      if (!calendarId) {
        throw new ApiErrorClass({
          code: 'CALENDAR_ID_REQUIRED',
          message: 'Calendar ID is required',
        })
      }

      // Check if calendar is in use
      const { count } = await db
        .from('schedule_activities')
        .select('id', { count: 'exact', head: true })
        .eq('calendar_id', calendarId)
        .is('deleted_at', null)

      if (count && count > 0) {
        throw new ApiErrorClass({
          code: 'CALENDAR_IN_USE',
          message: `Cannot delete calendar: ${count} activities are using it`,
        })
      }

      const { error } = await db
        .from('schedule_calendars')
        .delete()
        .eq('id', calendarId)

      if (error) {
        throw new ApiErrorClass({
          code: 'DELETE_CALENDAR_ERROR',
          message: `Failed to delete calendar: ${error.message}`,
        })
      }
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'DELETE_CALENDAR_ERROR',
            message: 'Failed to delete calendar',
          })
    }
  },

  /**
   * Get a single calendar
   */
  async getCalendar(calendarId: string): Promise<ScheduleCalendar> {
    try {
      if (!calendarId) {
        throw new ApiErrorClass({
          code: 'CALENDAR_ID_REQUIRED',
          message: 'Calendar ID is required',
        })
      }

      const { data, error } = await db
        .from('schedule_calendars')
        .select('*')
        .eq('id', calendarId)
        .single()

      if (error) {
        throw new ApiErrorClass({
          code: 'FETCH_CALENDAR_ERROR',
          message: `Failed to fetch calendar: ${error.message}`,
        })
      }

      if (!data) {
        throw new ApiErrorClass({
          code: 'CALENDAR_NOT_FOUND',
          message: 'Calendar not found',
        })
      }

      return data as ScheduleCalendar
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_CALENDAR_ERROR',
            message: 'Failed to fetch calendar',
          })
    }
  },

  // =============================================
  // RESOURCES
  // =============================================

  /**
   * Fetch resources for a company/project
   */
  async getResources(companyId: string, projectId?: string): Promise<ScheduleResource[]> {
    try {
      let query = db
        .from('schedule_resources')
        .select('*')
        .eq('company_id', companyId)
        .order('name')

      if (projectId) {
        query = query.or(`project_id.eq.${projectId},project_id.is.null`)
      }

      const { data, error } = await query

      if (error) {
        throw new ApiErrorClass({
          code: 'FETCH_RESOURCES_ERROR',
          message: `Failed to fetch resources: ${error.message}`,
        })
      }

      return (data || []) as ScheduleResource[]
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_RESOURCES_ERROR',
            message: 'Failed to fetch resources',
          })
    }
  },

  /**
   * Create a resource
   */
  async createResource(dto: CreateScheduleResourceDTO): Promise<ScheduleResource> {
    try {
      const { data, error } = await db
        .from('schedule_resources')
        .insert({
          company_id: dto.company_id,
          project_id: dto.project_id || null,
          name: dto.name,
          resource_type: dto.resource_type || 'labor',
          user_id: dto.user_id || null,
          max_units: dto.max_units ?? 1.0,
          standard_rate: dto.standard_rate || null,
          overtime_rate: dto.overtime_rate || null,
          cost_per_use: dto.cost_per_use || null,
          calendar_id: dto.calendar_id || null,
        })
        .select()
        .single()

      if (error) {
        throw new ApiErrorClass({
          code: 'CREATE_RESOURCE_ERROR',
          message: `Failed to create resource: ${error.message}`,
        })
      }

      return data as ScheduleResource
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'CREATE_RESOURCE_ERROR',
            message: 'Failed to create resource',
          })
    }
  },

  /**
   * Get resource assignments for an activity
   */
  async getResourceAssignments(activityId: string): Promise<ResourceAssignment[]> {
    try {
      const { data, error } = await db
        .from('resource_assignments')
        .select('*, schedule_resources(name, resource_type)')
        .eq('activity_id', activityId)

      if (error) {
        throw new ApiErrorClass({
          code: 'FETCH_ASSIGNMENTS_ERROR',
          message: `Failed to fetch assignments: ${error.message}`,
        })
      }

      return (data || []) as ResourceAssignment[]
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_ASSIGNMENTS_ERROR',
            message: 'Failed to fetch assignments',
          })
    }
  },

  /**
   * Create a resource assignment
   */
  async createResourceAssignment(
    dto: CreateResourceAssignmentDTO
  ): Promise<ResourceAssignment> {
    try {
      const { data, error } = await db
        .from('resource_assignments')
        .insert({
          activity_id: dto.activity_id,
          resource_id: dto.resource_id,
          units: dto.units ?? 1.0,
          planned_work_hours: dto.planned_work_hours || null,
          start_date: dto.start_date || null,
          finish_date: dto.finish_date || null,
        })
        .select()
        .single()

      if (error) {
        throw new ApiErrorClass({
          code: 'CREATE_ASSIGNMENT_ERROR',
          message: `Failed to create assignment: ${error.message}`,
        })
      }

      return data as ResourceAssignment
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'CREATE_ASSIGNMENT_ERROR',
            message: 'Failed to create assignment',
          })
    }
  },

  // =============================================
  // IMPORT LOGS
  // =============================================

  /**
   * Get import logs for a project
   */
  async getImportLogs(projectId: string): Promise<ScheduleImportLog[]> {
    try {
      const { data, error } = await db
        .from('schedule_import_logs')
        .select('*')
        .eq('project_id', projectId)
        .order('import_date', { ascending: false })

      if (error) {
        throw new ApiErrorClass({
          code: 'FETCH_IMPORT_LOGS_ERROR',
          message: `Failed to fetch import logs: ${error.message}`,
        })
      }

      return (data || []) as ScheduleImportLog[]
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_IMPORT_LOGS_ERROR',
            message: 'Failed to fetch import logs',
          })
    }
  },

  /**
   * Create an import log entry
   */
  async createImportLog(
    projectId: string,
    fileName: string,
    fileType: string,
    sourceSystem: string,
    userId?: string
  ): Promise<ScheduleImportLog> {
    try {
      const { data, error } = await db
        .from('schedule_import_logs')
        .insert({
          project_id: projectId,
          file_name: fileName,
          file_type: fileType,
          source_system: sourceSystem,
          status: 'pending',
          activities_imported: 0,
          dependencies_imported: 0,
          resources_imported: 0,
          imported_by: userId || null,
        })
        .select()
        .single()

      if (error) {
        throw new ApiErrorClass({
          code: 'CREATE_IMPORT_LOG_ERROR',
          message: `Failed to create import log: ${error.message}`,
        })
      }

      return data as ScheduleImportLog
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'CREATE_IMPORT_LOG_ERROR',
            message: 'Failed to create import log',
          })
    }
  },

  /**
   * Update import log with results
   */
  async updateImportLog(
    logId: string,
    results: {
      status: 'processing' | 'completed' | 'failed'
      activities_imported?: number
      dependencies_imported?: number
      resources_imported?: number
      warnings?: string[]
      errors?: string[]
    }
  ): Promise<void> {
    try {
      await db
        .from('schedule_import_logs')
        .update(results)
        .eq('id', logId)
    } catch (error) {
      throw new ApiErrorClass({
        code: 'UPDATE_IMPORT_LOG_ERROR',
        message: 'Failed to update import log',
      })
    }
  },

  // =============================================
  // STATISTICS & VARIANCE
  // =============================================

  /**
   * Get schedule variance using DB function
   */
  async getScheduleVariance(projectId: string): Promise<ScheduleVarianceResult | null> {
    try {
      const { data, error } = await db.rpc('calculate_schedule_variance', {
        p_project_id: projectId,
      })

      if (error) {
        // Function may not exist yet, fall back to manual calculation
        console.warn('calculate_schedule_variance function not found:', error.message)
        return null
      }

      return data?.[0] || null
    } catch {
      return null
    }
  },

  /**
   * Get critical path activities using DB function
   */
  async getCriticalPathActivities(
    projectId: string
  ): Promise<CriticalPathActivity[]> {
    try {
      const { data, error } = await db.rpc('get_critical_path_activities', {
        p_project_id: projectId,
      })

      if (error) {
        // Function may not exist, fall back to query
        const { data: activities } = await db
          .from('schedule_activities')
          .select('id, name, planned_start, planned_finish, total_float')
          .eq('project_id', projectId)
          .eq('is_critical', true)
          .is('deleted_at', null)
          .order('planned_start')

        return (activities || []).map((a: any) => ({
          activity_id: a.id,
          activity_name: a.name,
          planned_start: a.planned_start,
          planned_finish: a.planned_finish,
          total_float: a.total_float,
        }))
      }

      return data || []
    } catch {
      return []
    }
  },

  /**
   * Get schedule statistics
   */
  async getScheduleStats(projectId: string): Promise<ScheduleStats> {
    try {
      const activities = await this.getActivities({ project_id: projectId })
      const today = new Date().toISOString().split('T')[0]

      const stats: ScheduleStats = {
        total_activities: activities.length,
        completed_activities: activities.filter((a) => a.status === 'completed').length,
        in_progress_activities: activities.filter((a) => a.status === 'in_progress').length,
        not_started_activities: activities.filter((a) => a.status === 'not_started').length,
        overdue_activities: activities.filter(
          (a) =>
            a.planned_finish &&
            a.planned_finish < today &&
            a.status !== 'completed'
        ).length,
        milestones: activities.filter((a) => a.is_milestone).length,
        critical_activities: activities.filter((a) => a.is_critical).length,
        overall_progress: 0,
        project_start: null,
        project_finish: null,
        baseline_finish: null,
        variance_days: null,
      }

      // Calculate overall progress
      if (activities.length > 0) {
        const totalProgress = activities.reduce(
          (sum, a) => sum + (a.percent_complete || 0),
          0
        )
        stats.overall_progress = Math.round(totalProgress / activities.length)
      }

      // Get date range
      const starts = activities
        .filter((a) => a.planned_start)
        .map((a) => a.planned_start!)
        .sort()
      const finishes = activities
        .filter((a) => a.planned_finish)
        .map((a) => a.planned_finish!)
        .sort()
      const baselineFinishes = activities
        .filter((a) => a.baseline_finish)
        .map((a) => a.baseline_finish!)
        .sort()

      stats.project_start = starts[0] || null
      stats.project_finish = finishes[finishes.length - 1] || null
      stats.baseline_finish = baselineFinishes[baselineFinishes.length - 1] || null

      // Calculate variance
      if (stats.project_finish && stats.baseline_finish) {
        const finish = new Date(stats.project_finish)
        const baseline = new Date(stats.baseline_finish)
        stats.variance_days = Math.round(
          (finish.getTime() - baseline.getTime()) / (1000 * 60 * 60 * 24)
        )
      }

      return stats
    } catch (error) {
      throw error instanceof ApiErrorClass
        ? error
        : new ApiErrorClass({
            code: 'FETCH_STATS_ERROR',
            message: 'Failed to fetch schedule statistics',
          })
    }
  },

  // =============================================
  // BULK IMPORT
  // =============================================

  /**
   * Import activities in bulk
   */
  async importActivities(
    projectId: string,
    companyId: string,
    activities: Array<Omit<CreateScheduleActivityDTO, 'project_id' | 'company_id'>>,
    clearExisting = false
  ): Promise<{ imported: number; errors: string[] }> {
    const errors: string[] = []
    let imported = 0

    try {
      if (clearExisting) {
        await db
          .from('schedule_activities')
          .update({ deleted_at: new Date().toISOString() })
          .eq('project_id', projectId)
      }

      // Import in batches
      const batchSize = 50
      for (let i = 0; i < activities.length; i += batchSize) {
        const batch = activities.slice(i, i + batchSize).map((a, idx) => ({
          project_id: projectId,
          company_id: companyId,
          activity_id: a.activity_id,
          name: a.name,
          description: a.description || null,
          wbs_code: a.wbs_code || null,
          wbs_level: a.wbs_level || 1,
          parent_activity_id: a.parent_activity_id || null,
          sort_order: i + idx,
          planned_start: a.planned_start || null,
          planned_finish: a.planned_finish || null,
          planned_duration: a.planned_duration || null,
          duration_type: a.duration_type || 'fixed_duration',
          activity_type: a.activity_type || 'task',
          is_milestone: a.is_milestone || false,
          status: 'not_started',
          percent_complete: 0,
          is_critical: false,
        }))

        const { error, data } = await db
          .from('schedule_activities')
          .insert(batch)
          .select('id')

        if (error) {
          errors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${error.message}`)
        } else {
          imported += data?.length || 0
        }
      }

      return { imported, errors }
    } catch (error) {
      throw new ApiErrorClass({
        code: 'IMPORT_ERROR',
        message: 'Failed to import activities',
      })
    }
  },

  // =============================================
  // LOOK-AHEAD INTEGRATION
  // =============================================

  /**
   * Sync schedule activities to look-ahead
   */
  async syncToLookAhead(
    projectId: string,
    companyId: string,
    activityIds: string[],
    options: { overwriteExisting?: boolean } = {}
  ): Promise<{ synced: number; skipped: number; errors: string[] }> {
    const errors: string[] = []
    let synced = 0
    let skipped = 0

    try {
      // Get activities to sync
      const activities = await this.getActivities({ project_id: projectId })
      const toSync = activities.filter((a) => activityIds.includes(a.id))

      for (const activity of toSync) {
        try {
          // Check if already linked to a look-ahead activity
          const { data: existing } = await db
            .from('look_ahead_activities')
            .select('id')
            .eq('schedule_item_id', activity.id)
            .is('deleted_at', null)
            .single()

          if (existing && !options.overwriteExisting) {
            skipped++
            continue
          }

          // Calculate week info
          const startDate = activity.planned_start
            ? new Date(activity.planned_start)
            : new Date()
          const weekStart = new Date(startDate)
          weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1) // Monday

          // Get week number of the year
          const startOfYear = new Date(weekStart.getFullYear(), 0, 1)
          const weekNumber = Math.ceil(
            ((weekStart.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7
          )

          const lookAheadActivity = {
            project_id: projectId,
            company_id: companyId,
            activity_name: activity.name,
            description: activity.description || null,
            trade: null, // Could be derived from responsible_party
            subcontractor_id: activity.subcontractor_id || null,
            planned_start_date: activity.planned_start,
            planned_end_date: activity.planned_finish,
            duration_days: activity.planned_duration || 1,
            status: 'planned' as const,
            percent_complete: activity.percent_complete || 0,
            week_number: weekNumber,
            week_start_date: weekStart.toISOString().split('T')[0],
            schedule_item_id: activity.id,
          }

          if (existing && options.overwriteExisting) {
            // Update existing
            await db
              .from('look_ahead_activities')
              .update(lookAheadActivity)
              .eq('id', existing.id)
          } else {
            // Insert new
            await db.from('look_ahead_activities').insert(lookAheadActivity)
          }

          synced++
        } catch (err) {
          errors.push(`Activity ${activity.name}: ${err instanceof Error ? err.message : 'Unknown error'}`)
        }
      }

      return { synced, skipped, errors }
    } catch (error) {
      throw new ApiErrorClass({
        code: 'SYNC_TO_LOOKAHEAD_ERROR',
        message: 'Failed to sync to look-ahead',
      })
    }
  },
}
