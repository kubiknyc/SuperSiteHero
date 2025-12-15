/**
 * Equipment Daily Status Hooks
 * React Query hooks for equipment status tracking within daily reports
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/use-toast';
import { equipmentDailyStatusService } from '@/lib/api/services/equipment-daily-status';
import type {
  CreateEquipmentDailyStatusDTO,
  UpdateEquipmentDailyStatusDTO,
  CompleteChecklistDTO,
  CreateChecklistTemplateDTO,
  UpdateChecklistTemplateDTO,
  EquipmentDailyStatusFilters,
} from '@/types/equipment-daily-status';

// =============================================================================
// QUERY KEYS
// =============================================================================

export const equipmentDailyStatusKeys = {
  all: ['equipment-daily-status'] as const,
  status: () => [...equipmentDailyStatusKeys.all, 'status'] as const,
  statusByReport: (reportId: string) =>
    [...equipmentDailyStatusKeys.status(), 'report', reportId] as const,
  statusById: (id: string) =>
    [...equipmentDailyStatusKeys.status(), id] as const,
  statusFiltered: (filters: EquipmentDailyStatusFilters) =>
    [...equipmentDailyStatusKeys.status(), 'filtered', filters] as const,
  summary: (reportId: string) =>
    [...equipmentDailyStatusKeys.all, 'summary', reportId] as const,
  alerts: (projectId: string) =>
    [...equipmentDailyStatusKeys.all, 'alerts', projectId] as const,
  templates: () => [...equipmentDailyStatusKeys.all, 'templates'] as const,
  template: (id: string) =>
    [...equipmentDailyStatusKeys.templates(), id] as const,
  templateForType: (equipmentType: string) =>
    [...equipmentDailyStatusKeys.templates(), 'type', equipmentType] as const,
};

// =============================================================================
// EQUIPMENT DAILY STATUS HOOKS
// =============================================================================

/**
 * Get equipment status records for a daily report
 */
export function useEquipmentDailyStatus(dailyReportId: string | undefined) {
  return useQuery({
    queryKey: equipmentDailyStatusKeys.statusByReport(dailyReportId || ''),
    queryFn: () => equipmentDailyStatusService.status.getStatusByReport(dailyReportId!),
    enabled: !!dailyReportId,
  });
}

/**
 * Get equipment status by ID
 */
export function useEquipmentDailyStatusById(id: string | undefined) {
  return useQuery({
    queryKey: equipmentDailyStatusKeys.statusById(id || ''),
    queryFn: () => equipmentDailyStatusService.status.getStatusById(id!),
    enabled: !!id,
  });
}

/**
 * Get equipment status records with filters
 */
export function useEquipmentDailyStatusFiltered(filters: EquipmentDailyStatusFilters) {
  return useQuery({
    queryKey: equipmentDailyStatusKeys.statusFiltered(filters),
    queryFn: () => equipmentDailyStatusService.status.getStatus(filters),
    enabled: !!filters.daily_report_id || !!filters.project_id,
  });
}

/**
 * Get equipment status summary for a daily report
 */
export function useEquipmentDailyStatusSummary(dailyReportId: string | undefined) {
  return useQuery({
    queryKey: equipmentDailyStatusKeys.summary(dailyReportId || ''),
    queryFn: () => equipmentDailyStatusService.status.getSummary(dailyReportId!),
    enabled: !!dailyReportId,
  });
}

/**
 * Get maintenance alerts for a project
 */
export function useEquipmentMaintenanceAlerts(projectId: string | undefined) {
  return useQuery({
    queryKey: equipmentDailyStatusKeys.alerts(projectId || ''),
    queryFn: () => equipmentDailyStatusService.status.getMaintenanceAlerts(projectId!),
    enabled: !!projectId,
  });
}

/**
 * Create equipment daily status entry
 */
export function useCreateEquipmentDailyStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (dto: CreateEquipmentDailyStatusDTO) =>
      equipmentDailyStatusService.status.createStatus(dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: equipmentDailyStatusKeys.statusByReport(data.daily_report_id),
      });
      toast({
        title: 'Equipment added',
        description: 'Equipment has been added to the daily report.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add equipment.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Update equipment daily status
 */
export function useUpdateEquipmentDailyStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateEquipmentDailyStatusDTO }) =>
      equipmentDailyStatusService.status.updateStatus(id, dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: equipmentDailyStatusKeys.statusByReport(data.daily_report_id),
      });
      queryClient.invalidateQueries({
        queryKey: equipmentDailyStatusKeys.statusById(data.id),
      });
      toast({
        title: 'Equipment updated',
        description: 'Equipment status has been updated.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update equipment status.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Complete equipment checklist
 */
export function useCompleteEquipmentChecklist() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: CompleteChecklistDTO }) =>
      equipmentDailyStatusService.status.completeChecklist(id, dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: equipmentDailyStatusKeys.statusByReport(data.daily_report_id),
      });
      queryClient.invalidateQueries({
        queryKey: equipmentDailyStatusKeys.statusById(data.id),
      });
      toast({
        title: 'Checklist completed',
        description: `Equipment marked as ${data.status.replace('_', ' ')}.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to complete checklist.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Delete equipment daily status entry
 */
export function useDeleteEquipmentDailyStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) =>
      equipmentDailyStatusService.status.deleteStatus(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: equipmentDailyStatusKeys.status(),
      });
      toast({
        title: 'Equipment removed',
        description: 'Equipment has been removed from the daily report.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove equipment.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Copy equipment from previous day
 */
export function useCopyEquipmentFromPreviousDay() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      dailyReportId,
      projectId,
    }: {
      dailyReportId: string;
      projectId: string;
    }) =>
      equipmentDailyStatusService.status.copyFromPreviousDay(dailyReportId, projectId),
    onSuccess: (count, variables) => {
      queryClient.invalidateQueries({
        queryKey: equipmentDailyStatusKeys.statusByReport(variables.dailyReportId),
      });
      toast({
        title: 'Equipment copied',
        description: `${count} equipment item(s) copied from previous day.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to copy equipment.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Batch create equipment status entries
 */
export function useBatchCreateEquipmentDailyStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      dailyReportId,
      projectId,
      equipmentIds,
    }: {
      dailyReportId: string;
      projectId: string;
      equipmentIds: string[];
    }) =>
      equipmentDailyStatusService.status.batchCreateStatus(
        dailyReportId,
        projectId,
        equipmentIds
      ),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: equipmentDailyStatusKeys.statusByReport(variables.dailyReportId),
      });
      toast({
        title: 'Equipment added',
        description: `${data.length} equipment item(s) added to the daily report.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add equipment.',
        variant: 'destructive',
      });
    },
  });
}

// =============================================================================
// CHECKLIST TEMPLATE HOOKS
// =============================================================================

/**
 * Get all checklist templates
 */
export function useEquipmentChecklistTemplates() {
  return useQuery({
    queryKey: equipmentDailyStatusKeys.templates(),
    queryFn: () => equipmentDailyStatusService.templates.getTemplates(),
  });
}

/**
 * Get checklist template by ID
 */
export function useEquipmentChecklistTemplate(id: string | undefined) {
  return useQuery({
    queryKey: equipmentDailyStatusKeys.template(id || ''),
    queryFn: () => equipmentDailyStatusService.templates.getTemplateById(id!),
    enabled: !!id,
  });
}

/**
 * Get checklist template for equipment type
 */
export function useEquipmentChecklistTemplateForType(equipmentType: string | undefined) {
  return useQuery({
    queryKey: equipmentDailyStatusKeys.templateForType(equipmentType || ''),
    queryFn: () => equipmentDailyStatusService.templates.getTemplateForEquipmentType(equipmentType!),
    enabled: !!equipmentType,
  });
}

/**
 * Create checklist template
 */
export function useCreateEquipmentChecklistTemplate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (dto: CreateChecklistTemplateDTO) =>
      equipmentDailyStatusService.templates.createTemplate(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: equipmentDailyStatusKeys.templates(),
      });
      toast({
        title: 'Template created',
        description: 'Checklist template has been created.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create template.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Update checklist template
 */
export function useUpdateEquipmentChecklistTemplate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateChecklistTemplateDTO }) =>
      equipmentDailyStatusService.templates.updateTemplate(id, dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: equipmentDailyStatusKeys.templates(),
      });
      queryClient.invalidateQueries({
        queryKey: equipmentDailyStatusKeys.template(data.id),
      });
      toast({
        title: 'Template updated',
        description: 'Checklist template has been updated.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update template.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Delete checklist template
 */
export function useDeleteEquipmentChecklistTemplate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) =>
      equipmentDailyStatusService.templates.deleteTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: equipmentDailyStatusKeys.templates(),
      });
      toast({
        title: 'Template deleted',
        description: 'Checklist template has been deleted.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete template.',
        variant: 'destructive',
      });
    },
  });
}
