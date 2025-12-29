/**
 * Equipment Maintenance Schedules API Service
 * Phase 5: Field Workflow Automation - Milestone 5.2
 *
 * Provides API methods for:
 * - Maintenance schedule management
 * - Maintenance alerts
 * - Equipment maintenance status checks
 */

import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/utils/logger'
import type {
  EquipmentMaintenanceSchedule,
  EquipmentMaintenanceScheduleWithDetails,
  EquipmentMaintenanceAlert,
  EquipmentMaintenanceAlertWithDetails,
  CreateMaintenanceScheduleInput,
  UpdateMaintenanceScheduleInput,
  RecordMaintenanceInput,
  MaintenanceStatus,
  MaintenanceAlertType,
} from '@/types/workflow-automation'

// ============================================================================
// Maintenance Schedules API
// ============================================================================

export const maintenanceSchedulesApi = {
  /**
   * Get maintenance schedules for an equipment
   */
  async getSchedules(equipmentId: string): Promise<EquipmentMaintenanceScheduleWithDetails[]> {
    const { data, error } = await supabase
      .from('equipment_maintenance_schedules')
      .select(`
        *,
        equipment:equipment(id, equipment_number, name, current_hours),
        default_assignee:profiles!equipment_maintenance_schedules_default_assignee_id_fkey(id, full_name, email)
      `)
      .eq('equipment_id', equipmentId)
      .eq('is_active', true)
      .order('maintenance_type', { ascending: true })

    if (error) {
      logger.error('[MaintenanceSchedules] Error fetching schedules:', error)
      throw error
    }

    return data || []
  },

  /**
   * Get all active schedules for a company
   */
  async getAllSchedules(companyId: string): Promise<EquipmentMaintenanceScheduleWithDetails[]> {
    const { data, error } = await supabase
      .from('equipment_maintenance_schedules')
      .select(`
        *,
        equipment:equipment!inner(id, equipment_number, name, current_hours, company_id)
      `)
      .eq('equipment.company_id', companyId)
      .eq('is_active', true)
      .order('next_due_at', { ascending: true, nullsFirst: false })

    if (error) {
      logger.error('[MaintenanceSchedules] Error fetching all schedules:', error)
      throw error
    }

    return data || []
  },

  /**
   * Get schedules that are due or upcoming
   */
  async getDueSchedules(companyId: string): Promise<EquipmentMaintenanceScheduleWithDetails[]> {
    const warningDate = new Date()
    warningDate.setDate(warningDate.getDate() + 7) // Default 7 days warning

    const { data, error } = await supabase
      .from('equipment_maintenance_schedules')
      .select(`
        *,
        equipment:equipment!inner(id, equipment_number, name, current_hours, company_id)
      `)
      .eq('equipment.company_id', companyId)
      .eq('is_active', true)
      .or(`next_due_at.lte.${warningDate.toISOString()},next_due_hours.is.not.null`)
      .order('next_due_at', { ascending: true, nullsFirst: false })

    if (error) {
      logger.error('[MaintenanceSchedules] Error fetching due schedules:', error)
      throw error
    }

    // Filter hour-based schedules that are due
    const filteredData = (data || []).filter((schedule) => {
      if (schedule.next_due_at) {
        return new Date(schedule.next_due_at) <= warningDate
      }
      if (schedule.next_due_hours && schedule.equipment?.current_hours) {
        const warningHours = schedule.warning_threshold_hours || 50
        return schedule.equipment.current_hours >= schedule.next_due_hours - warningHours
      }
      return false
    })

    return filteredData
  },

  /**
   * Get a single schedule by ID
   */
  async getSchedule(scheduleId: string): Promise<EquipmentMaintenanceScheduleWithDetails> {
    const { data, error } = await supabase
      .from('equipment_maintenance_schedules')
      .select(`
        *,
        equipment:equipment(id, equipment_number, name, current_hours),
        default_assignee:profiles!equipment_maintenance_schedules_default_assignee_id_fkey(id, full_name, email)
      `)
      .eq('id', scheduleId)
      .single()

    if (error) {
      logger.error('[MaintenanceSchedules] Error fetching schedule:', error)
      throw error
    }

    return data
  },

  /**
   * Create a new maintenance schedule
   */
  async createSchedule(input: CreateMaintenanceScheduleInput): Promise<EquipmentMaintenanceSchedule> {
    const { data: user } = await supabase.auth.getUser()

    // Calculate initial next_due values
    const nextDueAt = input.frequency_days
      ? new Date(Date.now() + input.frequency_days * 24 * 60 * 60 * 1000).toISOString()
      : null

    // Get equipment's current hours for hour-based scheduling
    let nextDueHours: number | null = null
    if (input.frequency_hours) {
      const { data: equipment } = await supabase
        .from('equipment')
        .select('current_hours')
        .eq('id', input.equipment_id)
        .single()

      if (equipment) {
        nextDueHours = (equipment.current_hours || 0) + input.frequency_hours
      }
    }

    const scheduleData = {
      equipment_id: input.equipment_id,
      maintenance_type: input.maintenance_type,
      description: input.description || null,
      frequency_hours: input.frequency_hours || null,
      frequency_days: input.frequency_days || null,
      next_due_at: nextDueAt,
      next_due_hours: nextDueHours,
      block_usage_when_overdue: input.block_usage_when_overdue ?? false,
      warning_threshold_hours: input.warning_threshold_hours ?? 50,
      warning_threshold_days: input.warning_threshold_days ?? 7,
      default_assignee_id: input.default_assignee_id || null,
      service_provider: input.service_provider || null,
      notify_on_due: input.notify_on_due ?? true,
      notify_on_overdue: input.notify_on_overdue ?? true,
      notification_recipients: input.notification_recipients || null,
      is_active: true,
      created_by: user?.user?.id || null,
    }

    const { data, error } = await supabase
      .from('equipment_maintenance_schedules')
      .insert(scheduleData)
      .select()
      .single()

    if (error) {
      logger.error('[MaintenanceSchedules] Error creating schedule:', error)
      throw error
    }

    logger.info('[MaintenanceSchedules] Created schedule:', data.id)
    return data
  },

  /**
   * Update a maintenance schedule
   */
  async updateSchedule(
    scheduleId: string,
    updates: UpdateMaintenanceScheduleInput
  ): Promise<EquipmentMaintenanceSchedule> {
    const { data, error } = await supabase
      .from('equipment_maintenance_schedules')
      .update(updates)
      .eq('id', scheduleId)
      .select()
      .single()

    if (error) {
      logger.error('[MaintenanceSchedules] Error updating schedule:', error)
      throw error
    }

    return data
  },

  /**
   * Record that maintenance was performed
   */
  async recordMaintenance(input: RecordMaintenanceInput): Promise<void> {
    const { schedule_id, performed_at, performed_hours, notes: _notes } = input

    // Get the schedule to calculate next due
    const schedule = await this.getSchedule(schedule_id)

    // Calculate next due values
    let nextDueAt: string | null = null
    let nextDueHours: number | null = null

    if (schedule.frequency_days) {
      nextDueAt = new Date(
        new Date(performed_at).getTime() + schedule.frequency_days * 24 * 60 * 60 * 1000
      ).toISOString()
    }

    if (schedule.frequency_hours && performed_hours !== undefined) {
      nextDueHours = performed_hours + schedule.frequency_hours
    }

    // Update the schedule
    const { error } = await supabase
      .from('equipment_maintenance_schedules')
      .update({
        last_performed_at: performed_at,
        last_performed_hours: performed_hours || null,
        next_due_at: nextDueAt,
        next_due_hours: nextDueHours,
      })
      .eq('id', schedule_id)

    if (error) {
      logger.error('[MaintenanceSchedules] Error recording maintenance:', error)
      throw error
    }

    // Resolve any related alerts
    const { error: alertError } = await supabase
      .from('equipment_maintenance_alerts')
      .update({ resolved_at: new Date().toISOString() })
      .eq('schedule_id', schedule_id)
      .is('resolved_at', null)

    if (alertError) {
      logger.warn('[MaintenanceSchedules] Error resolving alerts:', alertError)
    }

    logger.info('[MaintenanceSchedules] Recorded maintenance for schedule:', schedule_id)
  },

  /**
   * Delete (deactivate) a maintenance schedule
   */
  async deleteSchedule(scheduleId: string): Promise<void> {
    const { error } = await supabase
      .from('equipment_maintenance_schedules')
      .update({ is_active: false })
      .eq('id', scheduleId)

    if (error) {
      logger.error('[MaintenanceSchedules] Error deleting schedule:', error)
      throw error
    }
  },

  /**
   * Check maintenance status for an equipment
   */
  async checkMaintenanceStatus(equipmentId: string): Promise<MaintenanceStatus[]> {
    // Get equipment details
    const { data: equipment, error: eqError } = await supabase
      .from('equipment')
      .select('id, current_hours')
      .eq('id', equipmentId)
      .single()

    if (eqError || !equipment) {
      return []
    }

    // Get active schedules
    const { data: schedules, error: schError } = await supabase
      .from('equipment_maintenance_schedules')
      .select('*')
      .eq('equipment_id', equipmentId)
      .eq('is_active', true)

    if (schError || !schedules) {
      return []
    }

    const statuses: MaintenanceStatus[] = []
    const now = new Date()

    for (const schedule of schedules) {
      let alertType: MaintenanceAlertType | null = null
      let isBlocked = false

      // Check hour-based due
      if (schedule.next_due_hours !== null) {
        const currentHours = equipment.current_hours || 0
        const warningHours = schedule.warning_threshold_hours || 50

        if (currentHours >= schedule.next_due_hours) {
          alertType = 'overdue'
        } else if (currentHours >= schedule.next_due_hours - warningHours) {
          alertType = 'upcoming'
        }
      }

      // Check date-based due
      if (schedule.next_due_at !== null) {
        const dueDate = new Date(schedule.next_due_at)
        const warningDays = schedule.warning_threshold_days || 7
        const warningDate = new Date(dueDate.getTime() - warningDays * 24 * 60 * 60 * 1000)

        if (now >= dueDate) {
          alertType = alertType === 'overdue' ? 'critical' : 'overdue'
        } else if (now >= warningDate) {
          alertType = alertType || 'upcoming'
        }
      }

      if (alertType) {
        isBlocked = schedule.block_usage_when_overdue &&
          (alertType === 'overdue' || alertType === 'critical')

        statuses.push({
          schedule_id: schedule.id,
          maintenance_type: schedule.maintenance_type,
          alert_type: alertType,
          is_blocked: isBlocked,
        })
      }
    }

    return statuses
  },
}

// ============================================================================
// Maintenance Alerts API
// ============================================================================

export const maintenanceAlertsApi = {
  /**
   * Get active alerts for an equipment
   */
  async getAlerts(equipmentId: string): Promise<EquipmentMaintenanceAlertWithDetails[]> {
    const { data, error } = await supabase
      .from('equipment_maintenance_alerts')
      .select(`
        *,
        equipment:equipment(id, equipment_number, name),
        schedule:equipment_maintenance_schedules(id, maintenance_type),
        acknowledged_by_user:profiles!equipment_maintenance_alerts_acknowledged_by_fkey(id, full_name)
      `)
      .eq('equipment_id', equipmentId)
      .is('resolved_at', null)
      .or(`dismissed_at.is.null,dismiss_until.lte.${new Date().toISOString()}`)
      .order('triggered_at', { ascending: false })

    if (error) {
      logger.error('[MaintenanceAlerts] Error fetching alerts:', error)
      throw error
    }

    return data || []
  },

  /**
   * Get all active alerts for a company
   */
  async getAllAlerts(companyId: string): Promise<EquipmentMaintenanceAlertWithDetails[]> {
    const { data, error } = await supabase
      .from('equipment_maintenance_alerts')
      .select(`
        *,
        equipment:equipment!inner(id, equipment_number, name, company_id),
        schedule:equipment_maintenance_schedules(id, maintenance_type)
      `)
      .eq('equipment.company_id', companyId)
      .is('resolved_at', null)
      .or(`dismissed_at.is.null,dismiss_until.lte.${new Date().toISOString()}`)
      .order('alert_type', { ascending: false }) // critical, overdue, due, upcoming
      .order('triggered_at', { ascending: false })

    if (error) {
      logger.error('[MaintenanceAlerts] Error fetching all alerts:', error)
      throw error
    }

    return data || []
  },

  /**
   * Get unacknowledged alert count
   */
  async getUnacknowledgedCount(companyId: string): Promise<number> {
    const { count, error } = await supabase
      .from('equipment_maintenance_alerts')
      .select('*, equipment!inner(company_id)', { count: 'exact', head: true })
      .eq('equipment.company_id', companyId)
      .is('resolved_at', null)
      .is('acknowledged_at', null)
      .or(`dismissed_at.is.null,dismiss_until.lte.${new Date().toISOString()}`)

    if (error) {
      logger.error('[MaintenanceAlerts] Error fetching count:', error)
      return 0
    }

    return count || 0
  },

  /**
   * Create a maintenance alert
   */
  async createAlert(params: {
    equipmentId: string;
    scheduleId: string | null;
    alertType: MaintenanceAlertType;
    message?: string;
  }): Promise<EquipmentMaintenanceAlert> {
    // Check if alert already exists
    const existing = await supabase
      .from('equipment_maintenance_alerts')
      .select('id')
      .eq('equipment_id', params.equipmentId)
      .eq('schedule_id', params.scheduleId)
      .eq('alert_type', params.alertType)
      .is('resolved_at', null)
      .single()

    if (existing.data) {
      return existing.data as unknown as EquipmentMaintenanceAlert
    }

    const { data, error } = await supabase
      .from('equipment_maintenance_alerts')
      .insert({
        equipment_id: params.equipmentId,
        schedule_id: params.scheduleId,
        alert_type: params.alertType,
        message: params.message || null,
      })
      .select()
      .single()

    if (error) {
      logger.error('[MaintenanceAlerts] Error creating alert:', error)
      throw error
    }

    return data
  },

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(alertId: string): Promise<void> {
    const { data: user } = await supabase.auth.getUser()

    const { error } = await supabase
      .from('equipment_maintenance_alerts')
      .update({
        acknowledged_by: user?.user?.id,
        acknowledged_at: new Date().toISOString(),
      })
      .eq('id', alertId)

    if (error) {
      logger.error('[MaintenanceAlerts] Error acknowledging alert:', error)
      throw error
    }
  },

  /**
   * Dismiss an alert temporarily
   */
  async dismissAlert(alertId: string, dismissUntil?: string): Promise<void> {
    const { data: user } = await supabase.auth.getUser()

    // Default to dismissing for 24 hours if not specified
    const until = dismissUntil ||
      new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

    const { error } = await supabase
      .from('equipment_maintenance_alerts')
      .update({
        dismissed_by: user?.user?.id,
        dismissed_at: new Date().toISOString(),
        dismiss_until: until,
      })
      .eq('id', alertId)

    if (error) {
      logger.error('[MaintenanceAlerts] Error dismissing alert:', error)
      throw error
    }
  },

  /**
   * Resolve an alert (maintenance completed)
   */
  async resolveAlert(alertId: string, maintenanceId?: string): Promise<void> {
    const { error } = await supabase
      .from('equipment_maintenance_alerts')
      .update({
        resolved_at: new Date().toISOString(),
        resolved_by_maintenance_id: maintenanceId || null,
      })
      .eq('id', alertId)

    if (error) {
      logger.error('[MaintenanceAlerts] Error resolving alert:', error)
      throw error
    }
  },

  /**
   * Check and create alerts for all due maintenance
   */
  async checkAndCreateAlerts(companyId: string): Promise<number> {
    const dueSchedules = await maintenanceSchedulesApi.getDueSchedules(companyId)
    let alertsCreated = 0

    for (const schedule of dueSchedules) {
      const statuses = await maintenanceSchedulesApi.checkMaintenanceStatus(schedule.equipment_id)

      for (const status of statuses) {
        if (status.schedule_id === schedule.id) {
          try {
            await this.createAlert({
              equipmentId: schedule.equipment_id,
              scheduleId: schedule.id,
              alertType: status.alert_type,
              message: `${schedule.maintenance_type} maintenance is ${status.alert_type}`,
            })
            alertsCreated++
          } catch (error) {
            // Alert might already exist
            logger.debug('[MaintenanceAlerts] Alert creation skipped:', error)
          }
        }
      }
    }

    return alertsCreated
  },
}

// Combined export
export const equipmentMaintenanceScheduleApi = {
  schedules: maintenanceSchedulesApi,
  alerts: maintenanceAlertsApi,
}
