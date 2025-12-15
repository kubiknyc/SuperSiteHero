/**
 * Equipment Maintenance Schedule Hook
 * Phase 5: Field Workflow Automation - Milestone 5.2
 *
 * Provides React Query hooks for managing equipment maintenance schedules and alerts
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { equipmentMaintenanceScheduleApi } from '@/lib/api/services/equipment-maintenance-schedules'
import { useToast } from '@/components/ui/use-toast'
import type {
  EquipmentMaintenanceSchedule,
  EquipmentMaintenanceAlert,
  CreateMaintenanceScheduleInput,
  UpdateMaintenanceScheduleInput,
  RecordMaintenanceInput,
  MaintenanceStatus,
  MaintenanceAlertType,
} from '@/types/workflow-automation'

// ============================================================================
// Query Keys
// ============================================================================

export const maintenanceScheduleKeys = {
  all: ['maintenance-schedules'] as const,
  schedules: () => [...maintenanceScheduleKeys.all, 'schedules'] as const,
  schedulesByEquipment: (equipmentId: string) =>
    [...maintenanceScheduleKeys.schedules(), 'equipment', equipmentId] as const,
  schedulesByCompany: (companyId: string) =>
    [...maintenanceScheduleKeys.schedules(), 'company', companyId] as const,
  dueSchedules: (companyId: string) =>
    [...maintenanceScheduleKeys.schedules(), 'due', companyId] as const,
  scheduleDetail: (id: string) =>
    [...maintenanceScheduleKeys.schedules(), 'detail', id] as const,
  alerts: () => [...maintenanceScheduleKeys.all, 'alerts'] as const,
  alertsByEquipment: (equipmentId: string) =>
    [...maintenanceScheduleKeys.alerts(), 'equipment', equipmentId] as const,
  alertsByCompany: (companyId: string) =>
    [...maintenanceScheduleKeys.alerts(), 'company', companyId] as const,
  alertCount: (companyId: string) =>
    [...maintenanceScheduleKeys.alerts(), 'count', companyId] as const,
  maintenanceStatus: (equipmentId: string) =>
    [...maintenanceScheduleKeys.all, 'status', equipmentId] as const,
}

// ============================================================================
// Schedule Hooks
// ============================================================================

/**
 * Get maintenance schedules for an equipment
 */
export function useMaintenanceSchedules(equipmentId: string | undefined) {
  return useQuery({
    queryKey: maintenanceScheduleKeys.schedulesByEquipment(equipmentId || ''),
    queryFn: () => equipmentMaintenanceScheduleApi.schedules.getSchedules(equipmentId!),
    enabled: !!equipmentId,
  })
}

/**
 * Get all maintenance schedules for a company
 */
export function useCompanyMaintenanceSchedules(companyId: string | undefined) {
  return useQuery({
    queryKey: maintenanceScheduleKeys.schedulesByCompany(companyId || ''),
    queryFn: () => equipmentMaintenanceScheduleApi.schedules.getAllSchedules(companyId!),
    enabled: !!companyId,
  })
}

/**
 * Get schedules that are due or upcoming
 */
export function useDueMaintenanceSchedules(companyId: string | undefined) {
  return useQuery({
    queryKey: maintenanceScheduleKeys.dueSchedules(companyId || ''),
    queryFn: () => equipmentMaintenanceScheduleApi.schedules.getDueSchedules(companyId!),
    enabled: !!companyId,
    // Refresh every 5 minutes to catch newly due schedules
    refetchInterval: 5 * 60 * 1000,
  })
}

/**
 * Get a single maintenance schedule
 */
export function useMaintenanceSchedule(scheduleId: string | undefined) {
  return useQuery({
    queryKey: maintenanceScheduleKeys.scheduleDetail(scheduleId || ''),
    queryFn: () => equipmentMaintenanceScheduleApi.schedules.getSchedule(scheduleId!),
    enabled: !!scheduleId,
  })
}

/**
 * Create a new maintenance schedule
 */
export function useCreateMaintenanceSchedule() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: (input: CreateMaintenanceScheduleInput) =>
      equipmentMaintenanceScheduleApi.schedules.createSchedule(input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: maintenanceScheduleKeys.schedules() })
      toast({
        title: 'Schedule created',
        description: `Maintenance schedule for "${data.maintenance_type}" has been created.`,
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create maintenance schedule.',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Update a maintenance schedule
 */
export function useUpdateMaintenanceSchedule() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateMaintenanceScheduleInput }) =>
      equipmentMaintenanceScheduleApi.schedules.updateSchedule(id, updates),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: maintenanceScheduleKeys.schedules() })
      queryClient.invalidateQueries({ queryKey: maintenanceScheduleKeys.scheduleDetail(data.id) })
      toast({
        title: 'Schedule updated',
        description: 'Maintenance schedule has been updated.',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update maintenance schedule.',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Record that maintenance was performed
 */
export function useRecordMaintenance() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: (input: RecordMaintenanceInput) =>
      equipmentMaintenanceScheduleApi.schedules.recordMaintenance(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: maintenanceScheduleKeys.schedules() })
      queryClient.invalidateQueries({ queryKey: maintenanceScheduleKeys.alerts() })
      toast({
        title: 'Maintenance recorded',
        description: 'Maintenance has been recorded and next due date calculated.',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to record maintenance.',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Delete a maintenance schedule
 */
export function useDeleteMaintenanceSchedule() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: (id: string) =>
      equipmentMaintenanceScheduleApi.schedules.deleteSchedule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: maintenanceScheduleKeys.schedules() })
      toast({
        title: 'Schedule deleted',
        description: 'Maintenance schedule has been deleted.',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete maintenance schedule.',
        variant: 'destructive',
      })
    },
  })
}

// ============================================================================
// Alert Hooks
// ============================================================================

/**
 * Get maintenance alerts for an equipment
 */
export function useMaintenanceAlerts(equipmentId: string | undefined) {
  return useQuery({
    queryKey: maintenanceScheduleKeys.alertsByEquipment(equipmentId || ''),
    queryFn: () => equipmentMaintenanceScheduleApi.alerts.getAlerts(equipmentId!),
    enabled: !!equipmentId,
  })
}

/**
 * Get all maintenance alerts for a company
 */
export function useCompanyMaintenanceAlerts(companyId: string | undefined) {
  return useQuery({
    queryKey: maintenanceScheduleKeys.alertsByCompany(companyId || ''),
    queryFn: () => equipmentMaintenanceScheduleApi.alerts.getAllAlerts(companyId!),
    enabled: !!companyId,
    // Refresh regularly
    refetchInterval: 5 * 60 * 1000,
  })
}

/**
 * Get unacknowledged alert count
 */
export function useMaintenanceAlertCount(companyId: string | undefined) {
  return useQuery({
    queryKey: maintenanceScheduleKeys.alertCount(companyId || ''),
    queryFn: () => equipmentMaintenanceScheduleApi.alerts.getUnacknowledgedCount(companyId!),
    enabled: !!companyId,
    refetchInterval: 2 * 60 * 1000,
  })
}

/**
 * Acknowledge an alert
 */
export function useAcknowledgeAlert() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: (alertId: string) =>
      equipmentMaintenanceScheduleApi.alerts.acknowledgeAlert(alertId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: maintenanceScheduleKeys.alerts() })
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
export function useDismissAlert() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: ({ alertId, dismissUntil }: { alertId: string; dismissUntil?: string }) =>
      equipmentMaintenanceScheduleApi.alerts.dismissAlert(alertId, dismissUntil),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: maintenanceScheduleKeys.alerts() })
      toast({
        title: 'Alert dismissed',
        description: 'Maintenance alert has been dismissed temporarily.',
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
 * Resolve an alert
 */
export function useResolveAlert() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ alertId, maintenanceId }: { alertId: string; maintenanceId?: string }) =>
      equipmentMaintenanceScheduleApi.alerts.resolveAlert(alertId, maintenanceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: maintenanceScheduleKeys.alerts() })
    },
  })
}

// ============================================================================
// Status Hook
// ============================================================================

/**
 * Check maintenance status for an equipment
 */
export function useCheckMaintenanceDue(equipmentId: string | undefined) {
  return useQuery({
    queryKey: maintenanceScheduleKeys.maintenanceStatus(equipmentId || ''),
    queryFn: () => equipmentMaintenanceScheduleApi.schedules.checkMaintenanceStatus(equipmentId!),
    enabled: !!equipmentId,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Check if equipment is blocked due to overdue maintenance
 */
export function useIsEquipmentBlocked(equipmentId: string | undefined): boolean {
  const { data: statuses } = useCheckMaintenanceDue(equipmentId)
  return statuses?.some((s) => s.is_blocked) ?? false
}

// ============================================================================
// Alert Creation Hook
// ============================================================================

/**
 * Check and create alerts for all due maintenance
 */
export function useCheckAndCreateAlerts() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: (companyId: string) =>
      equipmentMaintenanceScheduleApi.alerts.checkAndCreateAlerts(companyId),
    onSuccess: (count) => {
      if (count > 0) {
        queryClient.invalidateQueries({ queryKey: maintenanceScheduleKeys.alerts() })
        toast({
          title: 'Alerts created',
          description: `${count} new maintenance alert(s) have been created.`,
        })
      }
    },
  })
}
