/**
 * Maintenance Alerts Hook
 * Phase 5.2: Equipment Maintenance Alerts
 *
 * Provides React Query hooks for maintenance alert management
 * and equipment availability checks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/use-toast'
import { logger } from '@/lib/utils/logger'
import type {
  EquipmentMaintenanceAlertWithDetails,
  MaintenanceAlertType,
  MaintenanceStatus,
} from '@/types/workflow-automation'

// =============================================================================
// QUERY KEYS
// =============================================================================

export const maintenanceAlertKeys = {
  all: ['maintenance-alerts'] as const,
  byEquipment: (equipmentId: string) =>
    [...maintenanceAlertKeys.all, 'equipment', equipmentId] as const,
  byCompany: (companyId: string) =>
    [...maintenanceAlertKeys.all, 'company', companyId] as const,
  byProject: (projectId: string) =>
    [...maintenanceAlertKeys.all, 'project', projectId] as const,
  unacknowledged: (companyId: string) =>
    [...maintenanceAlertKeys.all, 'unacknowledged', companyId] as const,
  critical: (companyId: string) =>
    [...maintenanceAlertKeys.all, 'critical', companyId] as const,
  availability: (equipmentId: string) =>
    [...maintenanceAlertKeys.all, 'availability', equipmentId] as const,
  blockedEquipment: (projectId: string) =>
    [...maintenanceAlertKeys.all, 'blocked', projectId] as const,
}

// =============================================================================
// ALERT QUERIES
// =============================================================================

/**
 * Get active maintenance alerts for an equipment
 */
export function useEquipmentMaintenanceAlerts(equipmentId: string | undefined) {
  return useQuery({
    queryKey: maintenanceAlertKeys.byEquipment(equipmentId || ''),
    queryFn: async (): Promise<EquipmentMaintenanceAlertWithDetails[]> => {
      if (!equipmentId) {
        return []
      }

      const { data, error } = await supabase
        .from('equipment_maintenance_alerts')
        .select(`
          *,
          equipment:equipment(id, equipment_number, name),
          schedule:equipment_maintenance_schedules(id, maintenance_type, block_usage_when_overdue),
          acknowledged_by_user:profiles!equipment_maintenance_alerts_acknowledged_by_fkey(id, full_name)
        `)
        .eq('equipment_id', equipmentId)
        .is('resolved_at', null)
        .or(`dismiss_until.is.null,dismiss_until.lte.${new Date().toISOString()}`)
        .order('triggered_at', { ascending: false })

      if (error) {
        logger.error('[MaintenanceAlerts] Error fetching alerts:', error)
        throw error
      }

      return data || []
    },
    enabled: !!equipmentId,
  })
}

/**
 * Get all active maintenance alerts for a company
 */
export function useCompanyMaintenanceAlerts(companyId: string | undefined) {
  return useQuery({
    queryKey: maintenanceAlertKeys.byCompany(companyId || ''),
    queryFn: async (): Promise<EquipmentMaintenanceAlertWithDetails[]> => {
      if (!companyId) {
        return []
      }

      const { data, error } = await supabase
        .from('equipment_maintenance_alerts')
        .select(`
          *,
          equipment:equipment!inner(id, equipment_number, name, company_id),
          schedule:equipment_maintenance_schedules(id, maintenance_type, block_usage_when_overdue)
        `)
        .eq('equipment.company_id', companyId)
        .is('resolved_at', null)
        .or(`dismiss_until.is.null,dismiss_until.lte.${new Date().toISOString()}`)
        .order('alert_type', { ascending: false })
        .order('triggered_at', { ascending: false })

      if (error) {
        logger.error('[MaintenanceAlerts] Error fetching company alerts:', error)
        throw error
      }

      return data || []
    },
    enabled: !!companyId,
    // Refresh every 5 minutes
    refetchInterval: 5 * 60 * 1000,
  })
}

/**
 * Get critical alerts for a company (real-time subscription)
 */
export function useCriticalMaintenanceAlerts(companyId: string | undefined) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: maintenanceAlertKeys.critical(companyId || ''),
    queryFn: async (): Promise<EquipmentMaintenanceAlertWithDetails[]> => {
      if (!companyId) {
        return []
      }

      const { data, error } = await supabase
        .from('equipment_maintenance_alerts')
        .select(`
          *,
          equipment:equipment!inner(id, equipment_number, name, company_id),
          schedule:equipment_maintenance_schedules(id, maintenance_type, block_usage_when_overdue)
        `)
        .eq('equipment.company_id', companyId)
        .in('alert_type', ['critical', 'overdue'])
        .is('resolved_at', null)
        .or(`dismiss_until.is.null,dismiss_until.lte.${new Date().toISOString()}`)
        .order('triggered_at', { ascending: false })

      if (error) {
        throw error
      }
      return data || []
    },
    enabled: !!companyId,
  })

  // Subscribe to real-time updates
  useEffect(() => {
    if (!companyId) {
      return
    }

    const subscription = supabase
      .channel('critical-maintenance-alerts')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'equipment_maintenance_alerts',
        },
        () => {
          // Invalidate queries on any change
          queryClient.invalidateQueries({
            queryKey: maintenanceAlertKeys.critical(companyId),
          })
          queryClient.invalidateQueries({
            queryKey: maintenanceAlertKeys.byCompany(companyId),
          })
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [companyId, queryClient])

  return query
}

/**
 * Get unacknowledged alert count
 */
export function useUnacknowledgedAlertCount(companyId: string | undefined) {
  return useQuery({
    queryKey: maintenanceAlertKeys.unacknowledged(companyId || ''),
    queryFn: async (): Promise<number> => {
      if (!companyId) return 0

      const { count, error } = await supabase
        .from('equipment_maintenance_alerts')
        .select('*, equipment!inner(company_id)', { count: 'exact', head: true })
        .eq('equipment.company_id', companyId)
        .is('resolved_at', null)
        .is('acknowledged_at', null)
        .or(`dismiss_until.is.null,dismiss_until.lte.${new Date().toISOString()}`)

      if (error) {
        logger.error('[MaintenanceAlerts] Error fetching count:', error)
        return 0
      }

      return count || 0
    },
    enabled: !!companyId,
    refetchInterval: 2 * 60 * 1000,
  })
}

// =============================================================================
// ALERT MUTATIONS
// =============================================================================

/**
 * Acknowledge an alert
 */
export function useAcknowledgeMaintenanceAlert() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (alertId: string) => {
      const { data: user } = await supabase.auth.getUser()

      const { error } = await supabase
        .from('equipment_maintenance_alerts')
        .update({
          acknowledged_by: user?.user?.id,
          acknowledged_at: new Date().toISOString(),
        })
        .eq('id', alertId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: maintenanceAlertKeys.all })
      toast({
        title: 'Alert acknowledged',
        description: 'Maintenance alert has been acknowledged.',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to acknowledge alert.',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Dismiss an alert temporarily
 */
export function useDismissMaintenanceAlert() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({
      alertId,
      hours = 24,
    }: {
      alertId: string
      hours?: number
    }) => {
      const { data: user } = await supabase.auth.getUser()
      const dismissUntil = new Date(
        Date.now() + hours * 60 * 60 * 1000
      ).toISOString()

      const { error } = await supabase
        .from('equipment_maintenance_alerts')
        .update({
          dismissed_by: user?.user?.id,
          dismissed_at: new Date().toISOString(),
          dismiss_until: dismissUntil,
        })
        .eq('id', alertId)

      if (error) throw error
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: maintenanceAlertKeys.all })
      toast({
        title: 'Alert dismissed',
        description: `Alert dismissed for ${variables.hours} hours.`,
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to dismiss alert.',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Resolve an alert (maintenance completed)
 */
export function useResolveMaintenanceAlert() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({
      alertId,
      notes,
    }: {
      alertId: string
      notes?: string
    }) => {
      const { error } = await supabase
        .from('equipment_maintenance_alerts')
        .update({
          resolved_at: new Date().toISOString(),
          resolution_notes: notes || null,
        })
        .eq('id', alertId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: maintenanceAlertKeys.all })
      toast({
        title: 'Alert resolved',
        description: 'Maintenance alert has been resolved.',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to resolve alert.',
        variant: 'destructive',
      })
    },
  })
}

// =============================================================================
// AVAILABILITY CHECKS
// =============================================================================

/**
 * Check equipment availability (not blocked by overdue maintenance)
 */
export function useEquipmentAvailability(equipmentId: string | undefined) {
  return useQuery({
    queryKey: maintenanceAlertKeys.availability(equipmentId || ''),
    queryFn: async (): Promise<{
      isAvailable: boolean
      isBlocked: boolean
      blockingReasons: string[]
      alerts: MaintenanceStatus[]
    }> => {
      if (!equipmentId) {
        return {
          isAvailable: true,
          isBlocked: false,
          blockingReasons: [],
          alerts: [],
        }
      }

      // Get equipment details
      const { data: equipment, error: eqError } = await supabase
        .from('equipment')
        .select('id, current_hours, status')
        .eq('id', equipmentId)
        .single()

      if (eqError || !equipment) {
        return {
          isAvailable: false,
          isBlocked: true,
          blockingReasons: ['Equipment not found'],
          alerts: [],
        }
      }

      // Check if equipment is in maintenance or out of service
      if (equipment.status === 'maintenance') {
        return {
          isAvailable: false,
          isBlocked: true,
          blockingReasons: ['Equipment is currently in maintenance'],
          alerts: [],
        }
      }

      if (equipment.status === 'out_of_service') {
        return {
          isAvailable: false,
          isBlocked: true,
          blockingReasons: ['Equipment is out of service'],
          alerts: [],
        }
      }

      // Get active schedules that block usage when overdue
      const { data: schedules, error: schError } = await supabase
        .from('equipment_maintenance_schedules')
        .select('*')
        .eq('equipment_id', equipmentId)
        .eq('is_active', true)
        .eq('block_usage_when_overdue', true)

      if (schError) {
        logger.error('[Availability] Error checking schedules:', schError)
        return {
          isAvailable: true,
          isBlocked: false,
          blockingReasons: [],
          alerts: [],
        }
      }

      const now = new Date()
      const currentHours = equipment.current_hours || 0
      const blockingReasons: string[] = []
      const alerts: MaintenanceStatus[] = []

      for (const schedule of schedules || []) {
        let alertType: MaintenanceAlertType | null = null

        // Check date-based overdue
        if (
          schedule.next_due_at &&
          new Date(schedule.next_due_at) < now
        ) {
          alertType = 'overdue'
          blockingReasons.push(
            `${schedule.maintenance_type} is overdue (date)`
          )
        }

        // Check hours-based overdue
        if (
          schedule.next_due_hours &&
          currentHours >= schedule.next_due_hours
        ) {
          if (!alertType) {
            alertType = 'overdue'
            blockingReasons.push(
              `${schedule.maintenance_type} is overdue (hours)`
            )
          }
        }

        if (alertType) {
          alerts.push({
            schedule_id: schedule.id,
            maintenance_type: schedule.maintenance_type,
            alert_type: alertType,
            is_blocked: true,
          })
        }
      }

      return {
        isAvailable: blockingReasons.length === 0,
        isBlocked: blockingReasons.length > 0,
        blockingReasons,
        alerts,
      }
    },
    enabled: !!equipmentId,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Simple boolean check for equipment blocked status
 */
export function useIsEquipmentBlocked(
  equipmentId: string | undefined
): boolean {
  const { data } = useEquipmentAvailability(equipmentId)
  return data?.isBlocked ?? false
}

/**
 * Get all blocked equipment for a project
 */
export function useBlockedEquipment(projectId: string | undefined) {
  return useQuery({
    queryKey: maintenanceAlertKeys.blockedEquipment(projectId || ''),
    queryFn: async () => {
      if (!projectId) return []

      // Get equipment assigned to the project
      const { data: assignments, error: assError } = await supabase
        .from('equipment_assignments')
        .select(`
          equipment_id,
          equipment:equipment(
            id,
            equipment_number,
            name,
            current_hours,
            status
          )
        `)
        .eq('project_id', projectId)
        .eq('status', 'active')

      if (assError) {
        logger.error('[BlockedEquipment] Error fetching assignments:', assError)
        return []
      }

      const blockedEquipment: Array<{
        equipment_id: string
        equipment_number: string
        equipment_name: string
        blocking_reasons: string[]
      }> = []

      for (const assignment of assignments || []) {
        const eq = assignment.equipment as any

        // Skip if equipment is null or already marked unavailable
        if (!eq) continue
        if (eq.status === 'maintenance' || eq.status === 'out_of_service') {
          blockedEquipment.push({
            equipment_id: eq.id,
            equipment_number: eq.equipment_number,
            equipment_name: eq.name,
            blocking_reasons: [
              eq.status === 'maintenance'
                ? 'In maintenance'
                : 'Out of service',
            ],
          })
          continue
        }

        // Check maintenance schedules
        const { data: schedules } = await supabase
          .from('equipment_maintenance_schedules')
          .select('*')
          .eq('equipment_id', eq.id)
          .eq('is_active', true)
          .eq('block_usage_when_overdue', true)

        const reasons: string[] = []
        const now = new Date()
        const currentHours = eq.current_hours || 0

        for (const schedule of schedules || []) {
          if (
            (schedule.next_due_at && new Date(schedule.next_due_at) < now) ||
            (schedule.next_due_hours && currentHours >= schedule.next_due_hours)
          ) {
            reasons.push(`${schedule.maintenance_type} overdue`)
          }
        }

        if (reasons.length > 0) {
          blockedEquipment.push({
            equipment_id: eq.id,
            equipment_number: eq.equipment_number,
            equipment_name: eq.name,
            blocking_reasons: reasons,
          })
        }
      }

      return blockedEquipment
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  })
}

// =============================================================================
// ALERT GENERATION
// =============================================================================

/**
 * Manually trigger alert generation for a company
 */
export function useGenerateMaintenanceAlerts() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (companyId: string) => {
      // Call the database function to generate alerts
      const { data, error } = await supabase.rpc('generate_maintenance_alerts')

      if (error) throw error
      return data as number
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: maintenanceAlertKeys.all })
      if (count > 0) {
        toast({
          title: 'Alerts generated',
          description: `${count} new maintenance alert(s) created.`,
        })
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to generate alerts.',
        variant: 'destructive',
      })
    },
  })
}

// Re-export types for convenience
export type { MaintenanceAlertType, MaintenanceStatus }
