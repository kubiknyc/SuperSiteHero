/**
 * Equipment React Query Hooks
 *
 * Query and mutation hooks for the Equipment Tracking system
 * Aligned with migration 051_equipment_tracking.sql
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { equipmentApiService } from '@/lib/api/services/equipment'
import { useToast } from '@/components/ui/use-toast'
import {
  formatEquipmentName,
  type EquipmentFilters,
  type EquipmentLogFilters,
  type EquipmentMaintenanceFilters,
  type CreateEquipmentDTO,
  type UpdateEquipmentDTO,
  type CreateEquipmentAssignmentDTO,
  type UpdateEquipmentAssignmentDTO,
  type CreateEquipmentLogDTO,
  type UpdateEquipmentLogDTO,
  type CreateEquipmentMaintenanceDTO,
  type UpdateEquipmentMaintenanceDTO,
  type CreateEquipmentInspectionDTO,
  type EquipmentStatus,
  type EquipmentMaintenance,
} from '@/types/equipment'

// ============================================================================
// QUERY KEYS
// ============================================================================

export const equipmentKeys = {
  all: ['equipment'] as const,

  // Equipment
  equipment: () => [...equipmentKeys.all, 'list'] as const,
  equipmentList: (filters: EquipmentFilters) => [...equipmentKeys.equipment(), filters] as const,
  equipmentDetail: (id: string) => [...equipmentKeys.all, 'detail', id] as const,
  equipmentStatistics: (companyId: string) => [...equipmentKeys.all, 'statistics', companyId] as const,
  availableEquipment: (companyId: string) => [...equipmentKeys.all, 'available', companyId] as const,

  // Assignments
  assignments: (equipmentId: string) => [...equipmentKeys.all, 'assignments', equipmentId] as const,
  projectEquipment: (projectId: string) => [...equipmentKeys.all, 'project-equipment', projectId] as const,

  // Logs
  logs: () => [...equipmentKeys.all, 'logs'] as const,
  logsList: (filters: EquipmentLogFilters) => [...equipmentKeys.logs(), filters] as const,

  // Maintenance
  maintenance: () => [...equipmentKeys.all, 'maintenance'] as const,
  maintenanceList: (filters: EquipmentMaintenanceFilters) => [...equipmentKeys.maintenance(), filters] as const,
  maintenanceDetail: (id: string) => [...equipmentKeys.maintenance(), 'detail', id] as const,
  upcomingMaintenance: (companyId: string) => [...equipmentKeys.maintenance(), 'upcoming', companyId] as const,

  // Inspections
  inspections: (equipmentId: string) => [...equipmentKeys.all, 'inspections', equipmentId] as const,
  latestInspection: (equipmentId: string) => [...equipmentKeys.all, 'latest-inspection', equipmentId] as const,
}

// ============================================================================
// EQUIPMENT HOOKS
// ============================================================================

/**
 * Get all equipment with filters
 */
export function useEquipment(filters: EquipmentFilters) {
  return useQuery({
    queryKey: equipmentKeys.equipmentList(filters),
    queryFn: () => equipmentApiService.equipment.getEquipment(filters),
    enabled: !!filters.companyId,
  })
}

/**
 * Get a single equipment with all details
 */
export function useEquipmentDetail(id: string | undefined) {
  return useQuery({
    queryKey: equipmentKeys.equipmentDetail(id || ''),
    queryFn: () => equipmentApiService.equipment.getEquipmentById(id!),
    enabled: !!id,
  })
}

/**
 * Get equipment statistics for a company
 */
export function useEquipmentStatistics(companyId: string | undefined) {
  return useQuery({
    queryKey: equipmentKeys.equipmentStatistics(companyId || ''),
    queryFn: () => equipmentApiService.equipment.getEquipmentStatistics(companyId!),
    enabled: !!companyId,
  })
}

/**
 * Get available equipment for a company
 */
export function useAvailableEquipment(companyId: string | undefined) {
  return useQuery({
    queryKey: equipmentKeys.availableEquipment(companyId || ''),
    queryFn: () => equipmentApiService.equipment.getAvailableEquipment(companyId!),
    enabled: !!companyId,
  })
}

/**
 * Create new equipment
 */
export function useCreateEquipment() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: (dto: CreateEquipmentDTO) => equipmentApiService.equipment.createEquipment(dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: equipmentKeys.equipment() })
      toast({
        title: 'Equipment created',
        description: `${formatEquipmentName(data)} has been created.`,
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create equipment.',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Update equipment
 */
export function useUpdateEquipment() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateEquipmentDTO }) =>
      equipmentApiService.equipment.updateEquipment(id, dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: equipmentKeys.equipment() })
      queryClient.invalidateQueries({ queryKey: equipmentKeys.equipmentDetail(data.id) })
      toast({
        title: 'Equipment updated',
        description: 'Equipment has been updated.',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update equipment.',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Update equipment status
 */
export function useUpdateEquipmentStatus() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: EquipmentStatus }) =>
      equipmentApiService.equipment.updateEquipmentStatus(id, status),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: equipmentKeys.equipment() })
      queryClient.invalidateQueries({ queryKey: equipmentKeys.equipmentDetail(data.id) })
      toast({
        title: 'Status updated',
        description: 'Equipment status has been updated.',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update status.',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Delete equipment
 */
export function useDeleteEquipment() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: (id: string) => equipmentApiService.equipment.deleteEquipment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: equipmentKeys.equipment() })
      toast({
        title: 'Equipment deleted',
        description: 'Equipment has been deleted.',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete equipment.',
        variant: 'destructive',
      })
    },
  })
}

// ============================================================================
// ASSIGNMENT HOOKS
// ============================================================================

/**
 * Get assignments for an equipment
 */
export function useEquipmentAssignments(equipmentId: string | undefined) {
  return useQuery({
    queryKey: equipmentKeys.assignments(equipmentId || ''),
    queryFn: () => equipmentApiService.assignments.getAssignments(equipmentId!),
    enabled: !!equipmentId,
  })
}

/**
 * Get equipment assigned to a project
 */
export function useProjectEquipment(projectId: string | undefined) {
  return useQuery({
    queryKey: equipmentKeys.projectEquipment(projectId || ''),
    queryFn: () => equipmentApiService.assignments.getProjectEquipment(projectId!),
    enabled: !!projectId,
  })
}

/**
 * Assign equipment to a project
 */
export function useAssignEquipment() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: (dto: CreateEquipmentAssignmentDTO) =>
      equipmentApiService.assignments.assignEquipment(dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: equipmentKeys.equipment() })
      queryClient.invalidateQueries({ queryKey: equipmentKeys.equipmentDetail(data.equipment_id) })
      queryClient.invalidateQueries({ queryKey: equipmentKeys.assignments(data.equipment_id) })
      queryClient.invalidateQueries({ queryKey: equipmentKeys.projectEquipment(data.project_id) })
      toast({
        title: 'Equipment assigned',
        description: 'Equipment has been assigned to the project.',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to assign equipment.',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Update an assignment
 */
export function useUpdateEquipmentAssignment() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; equipmentId: string; dto: UpdateEquipmentAssignmentDTO }) =>
      equipmentApiService.assignments.updateAssignment(id, dto),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: equipmentKeys.assignments(variables.equipmentId) })
      toast({
        title: 'Assignment updated',
        description: 'Equipment assignment has been updated.',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update assignment.',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Return equipment (complete assignment)
 */
export function useReturnEquipment() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: ({ assignmentId, actualReturnDate }: { assignmentId: string; actualReturnDate?: string }) =>
      equipmentApiService.assignments.returnEquipment(assignmentId, actualReturnDate),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: equipmentKeys.equipment() })
      queryClient.invalidateQueries({ queryKey: equipmentKeys.equipmentDetail(data.equipment_id) })
      queryClient.invalidateQueries({ queryKey: equipmentKeys.assignments(data.equipment_id) })
      queryClient.invalidateQueries({ queryKey: equipmentKeys.projectEquipment(data.project_id) })
      toast({
        title: 'Equipment returned',
        description: 'Equipment has been returned and is now available.',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to return equipment.',
        variant: 'destructive',
      })
    },
  })
}

// ============================================================================
// LOG HOOKS
// ============================================================================

/**
 * Get equipment logs
 */
export function useEquipmentLogs(filters: EquipmentLogFilters) {
  return useQuery({
    queryKey: equipmentKeys.logsList(filters),
    queryFn: () => equipmentApiService.logs.getLogs(filters),
    enabled: !!filters.equipmentId || !!filters.projectId,
  })
}

/**
 * Create a log entry
 */
export function useCreateEquipmentLog() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: (dto: CreateEquipmentLogDTO) => equipmentApiService.logs.createLog(dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: equipmentKeys.logs() })
      queryClient.invalidateQueries({ queryKey: equipmentKeys.equipmentDetail(data.equipment_id) })
      toast({
        title: 'Log created',
        description: 'Equipment log has been recorded.',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create log.',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Update a log entry
 */
export function useUpdateEquipmentLog() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateEquipmentLogDTO }) =>
      equipmentApiService.logs.updateLog(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: equipmentKeys.logs() })
      toast({
        title: 'Log updated',
        description: 'Equipment log has been updated.',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update log.',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Delete a log entry
 */
export function useDeleteEquipmentLog() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: (id: string) => equipmentApiService.logs.deleteLog(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: equipmentKeys.logs() })
      toast({
        title: 'Log deleted',
        description: 'Equipment log has been deleted.',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete log.',
        variant: 'destructive',
      })
    },
  })
}

// ============================================================================
// MAINTENANCE HOOKS
// ============================================================================

/**
 * Get maintenance records
 */
export function useEquipmentMaintenance(filters: EquipmentMaintenanceFilters) {
  return useQuery({
    queryKey: equipmentKeys.maintenanceList(filters),
    queryFn: () => equipmentApiService.maintenance.getMaintenance(filters),
    enabled: true,
  })
}

/**
 * Get a single maintenance record
 */
export function useMaintenanceDetail(id: string | undefined) {
  return useQuery({
    queryKey: equipmentKeys.maintenanceDetail(id || ''),
    queryFn: () => equipmentApiService.maintenance.getMaintenanceById(id!),
    enabled: !!id,
  })
}

/**
 * Get upcoming maintenance for a company
 */
export function useUpcomingMaintenance(companyId: string | undefined) {
  return useQuery({
    queryKey: equipmentKeys.upcomingMaintenance(companyId || ''),
    queryFn: () => equipmentApiService.maintenance.getUpcomingMaintenance(companyId!),
    enabled: !!companyId,
  })
}

/**
 * Schedule maintenance
 */
export function useScheduleMaintenance() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: (dto: CreateEquipmentMaintenanceDTO) =>
      equipmentApiService.maintenance.scheduleMaintenance(dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: equipmentKeys.maintenance() })
      queryClient.invalidateQueries({ queryKey: equipmentKeys.equipmentDetail(data.equipment_id) })
      toast({
        title: 'Maintenance scheduled',
        description: 'Maintenance has been scheduled.',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to schedule maintenance.',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Update maintenance record
 */
export function useUpdateMaintenance() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateEquipmentMaintenanceDTO }) =>
      equipmentApiService.maintenance.updateMaintenance(id, dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: equipmentKeys.maintenance() })
      queryClient.invalidateQueries({ queryKey: equipmentKeys.maintenanceDetail(data.id) })
      toast({
        title: 'Maintenance updated',
        description: 'Maintenance record has been updated.',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update maintenance.',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Complete maintenance
 */
export function useCompleteMaintenance() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: ({
      id,
      completionData,
    }: {
      id: string
      completionData: {
        completed_date?: string
        completed_hours?: number
        completed_miles?: number
        work_performed?: string
        labor_cost?: number
        parts_cost?: number
        total_cost?: number
        parts_used?: EquipmentMaintenance['parts_used']
        downtime_hours?: number
        invoice_number?: string
        next_service_date?: string
        next_service_hours?: number
      }
    }) => equipmentApiService.maintenance.completeMaintenance(id, completionData),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: equipmentKeys.maintenance() })
      queryClient.invalidateQueries({ queryKey: equipmentKeys.maintenanceDetail(data.id) })
      queryClient.invalidateQueries({ queryKey: equipmentKeys.equipmentDetail(data.equipment_id) })
      toast({
        title: 'Maintenance completed',
        description: 'Maintenance has been marked as completed.',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to complete maintenance.',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Cancel maintenance
 */
export function useCancelMaintenance() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: (id: string) => equipmentApiService.maintenance.cancelMaintenance(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: equipmentKeys.maintenance() })
      queryClient.invalidateQueries({ queryKey: equipmentKeys.maintenanceDetail(data.id) })
      toast({
        title: 'Maintenance cancelled',
        description: 'Maintenance has been cancelled.',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to cancel maintenance.',
        variant: 'destructive',
      })
    },
  })
}

// ============================================================================
// INSPECTION HOOKS
// ============================================================================

/**
 * Get inspections for an equipment
 */
export function useEquipmentInspections(equipmentId: string | undefined) {
  return useQuery({
    queryKey: equipmentKeys.inspections(equipmentId || ''),
    queryFn: () => equipmentApiService.inspections.getInspections(equipmentId!),
    enabled: !!equipmentId,
  })
}

/**
 * Get latest inspection for equipment
 */
export function useLatestInspection(equipmentId: string | undefined) {
  return useQuery({
    queryKey: equipmentKeys.latestInspection(equipmentId || ''),
    queryFn: () => equipmentApiService.inspections.getLatestInspection(equipmentId!),
    enabled: !!equipmentId,
  })
}

/**
 * Create an inspection
 */
export function useCreateEquipmentInspection() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: (dto: CreateEquipmentInspectionDTO) =>
      equipmentApiService.inspections.createInspection(dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: equipmentKeys.inspections(data.equipment_id) })
      queryClient.invalidateQueries({ queryKey: equipmentKeys.latestInspection(data.equipment_id) })
      toast({
        title: 'Inspection recorded',
        description: 'Equipment inspection has been recorded.',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to record inspection.',
        variant: 'destructive',
      })
    },
  })
}

// ============================================================================
// COST INTEGRATION HOOKS
// ============================================================================

/**
 * Post equipment log cost to cost tracking
 * Calls the database function to create a cost transaction
 */
export function usePostEquipmentCost() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (logId: string) => {
      // postCostToTransaction returns the transaction ID directly, throws on error
      return await equipmentApiService.logs.postCostToTransaction(logId)
    },
    onSuccess: (_) => {
      queryClient.invalidateQueries({ queryKey: equipmentKeys.logs() })
      toast({
        title: 'Cost posted',
        description: 'Equipment cost has been posted to job costing.',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to post equipment cost.',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Get equipment logs with cost details
 */
export function useEquipmentLogsWithCosts(filters: EquipmentLogFilters) {
  return useQuery({
    queryKey: [...equipmentKeys.logsList(filters), 'with-costs'] as const,
    queryFn: () => equipmentApiService.logs.getLogsWithCosts(filters),
    enabled: !!filters.equipmentId || !!filters.projectId,
  })
}

/**
 * Get unposted equipment costs for a project
 */
export function useUnpostedEquipmentCosts(projectId: string | undefined) {
  return useQuery({
    queryKey: [...equipmentKeys.logs(), 'unposted', projectId] as const,
    queryFn: async () => {
      // getUnpostedCosts returns the array directly, throws on error
      return await equipmentApiService.logs.getUnpostedCosts(projectId!)
    },
    enabled: !!projectId,
  })
}

/**
 * Batch post multiple equipment costs
 */
export function useBatchPostEquipmentCosts() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (logIds: string[]) => {
      const results = await Promise.allSettled(
        logIds.map(id => equipmentApiService.logs.postCostToTransaction(id))
      )
      const succeeded = results.filter(r => r.status === 'fulfilled').length
      const failed = results.filter(r => r.status === 'rejected').length
      return { succeeded, failed }
    },
    onSuccess: ({ succeeded, failed }) => {
      queryClient.invalidateQueries({ queryKey: equipmentKeys.logs() })
      if (failed === 0) {
        toast({
          title: 'Costs posted',
          description: `${succeeded} equipment cost(s) posted to job costing.`,
        })
      } else {
        toast({
          title: 'Partial success',
          description: `${succeeded} posted, ${failed} failed.`,
          variant: 'destructive',
        })
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to post equipment costs.',
        variant: 'destructive',
      })
    },
  })
}

// ============================================================================
// EQUIPMENT AVAILABILITY HOOKS (Phase 5.2)
// ============================================================================

/**
 * Check if equipment is available (not blocked by overdue maintenance)
 * Re-exported from useMaintenanceAlerts for convenience
 */
export { useEquipmentAvailability, useIsEquipmentBlocked, useBlockedEquipment } from './useMaintenanceAlerts'
