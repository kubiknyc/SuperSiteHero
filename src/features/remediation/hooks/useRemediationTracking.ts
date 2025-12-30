/**
 * Remediation Tracking Hooks
 * React Query hooks for tracking remediation of issues from inspections and checklists
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/use-toast';
import { remediationService } from '@/lib/api/services/remediation-tracking';
import type {
  RemediationSourceType,
  CreatePunchFromInspectionDTO,
  CreatePunchFromChecklistDTO,
  UpdateRemediationStatusDTO,
  VerifyRemediationDTO,
  UpdateAutoLinkConfigDTO,
  RemediationFilters,
} from '@/types/remediation-tracking';

// =============================================================================
// QUERY KEYS
// =============================================================================

export const remediationKeys = {
  all: ['remediation'] as const,
  tracking: () => [...remediationKeys.all, 'tracking'] as const,
  bySource: (sourceType: RemediationSourceType, sourceId: string) =>
    [...remediationKeys.tracking(), 'source', sourceType, sourceId] as const,
  byPunchItem: (punchItemId: string) =>
    [...remediationKeys.tracking(), 'punch', punchItemId] as const,
  filtered: (filters: RemediationFilters) =>
    [...remediationKeys.tracking(), 'filtered', filters] as const,
  stats: (projectId: string) =>
    [...remediationKeys.all, 'stats', projectId] as const,
  config: () => [...remediationKeys.all, 'config'] as const,
  configByType: (sourceType: RemediationSourceType) =>
    [...remediationKeys.config(), sourceType] as const,
};

// =============================================================================
// REMEDIATION TRACKING HOOKS
// =============================================================================

/**
 * Get remediation tracking by source (inspection, checklist, etc.)
 */
export function useRemediationBySource(
  sourceType: RemediationSourceType,
  sourceId: string | undefined
) {
  return useQuery({
    queryKey: remediationKeys.bySource(sourceType, sourceId || ''),
    queryFn: () => remediationService.tracking.getBySource(sourceType, sourceId!),
    enabled: !!sourceId,
  });
}

/**
 * Get remediation tracking by punch item
 */
export function useRemediationByPunchItem(punchItemId: string | undefined) {
  return useQuery({
    queryKey: remediationKeys.byPunchItem(punchItemId || ''),
    queryFn: () => remediationService.tracking.getByPunchItem(punchItemId!),
    enabled: !!punchItemId,
  });
}

/**
 * Get all remediation records with filters
 */
export function useRemediationFiltered(filters: RemediationFilters) {
  return useQuery({
    queryKey: remediationKeys.filtered(filters),
    queryFn: () => remediationService.tracking.getRemediation(filters),
    enabled: !!filters.project_id || !!filters.source_id,
  });
}

/**
 * Get remediation statistics for a project
 */
export function useRemediationStats(projectId: string | undefined) {
  return useQuery({
    queryKey: remediationKeys.stats(projectId || ''),
    queryFn: () => remediationService.tracking.getStats(projectId!),
    enabled: !!projectId,
  });
}

/**
 * Update remediation status
 */
export function useUpdateRemediationStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateRemediationStatusDTO }) =>
      remediationService.tracking.updateStatus(id, dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: remediationKeys.tracking(),
      });
      toast({
        title: 'Status updated',
        description: `Remediation status changed to ${data.status}.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update status.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Verify remediation
 */
export function useVerifyRemediation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: VerifyRemediationDTO }) =>
      remediationService.tracking.verify(id, dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: remediationKeys.tracking(),
      });
      const message = data.status === 'verified'
        ? 'Remediation verified successfully.'
        : 'Verification failed. The item needs more work.';
      toast({
        title: data.status === 'verified' ? 'Verified' : 'Verification failed',
        description: message,
        variant: data.status === 'verified' ? 'default' : 'destructive',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to verify remediation.',
        variant: 'destructive',
      });
    },
  });
}

// =============================================================================
// AUTO-CREATE PUNCH HOOKS
// =============================================================================

/**
 * Create punch item from failed inspection
 */
export function useCreatePunchFromInspection() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (dto: CreatePunchFromInspectionDTO) =>
      remediationService.autoCreate.createFromInspection(dto),
    onSuccess: (punchId, variables) => {
      queryClient.invalidateQueries({
        queryKey: remediationKeys.bySource('inspection', variables.inspection_id),
      });
      queryClient.invalidateQueries({
        queryKey: ['punch-items'],
      });
      toast({
        title: 'Punch item created',
        description: 'A punch item has been created from the failed inspection.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create punch item.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Create punch item from failed checklist item
 */
export function useCreatePunchFromChecklist() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (dto: CreatePunchFromChecklistDTO) =>
      remediationService.autoCreate.createFromChecklist(dto),
    onSuccess: (punchId, variables) => {
      queryClient.invalidateQueries({
        queryKey: remediationKeys.bySource('checklist', variables.execution_id),
      });
      queryClient.invalidateQueries({
        queryKey: ['punch-items'],
      });
      toast({
        title: 'Punch item created',
        description: 'A punch item has been created from the failed checklist item.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create punch item.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Batch create punch items from multiple failed checklist items
 */
export function useBatchCreatePunchFromChecklist() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      executionId,
      failedItems,
    }: {
      executionId: string;
      failedItems: Array<{ responseId: string; templateItemId: string }>;
    }) => remediationService.autoCreate.batchCreateFromChecklist(executionId, failedItems),
    onSuccess: (punchIds, variables) => {
      queryClient.invalidateQueries({
        queryKey: remediationKeys.bySource('checklist', variables.executionId),
      });
      queryClient.invalidateQueries({
        queryKey: ['punch-items'],
      });
      toast({
        title: 'Punch items created',
        description: `${punchIds.length} punch item(s) created from failed checklist items.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create punch items.',
        variant: 'destructive',
      });
    },
  });
}

// =============================================================================
// AUTO-LINK CONFIG HOOKS
// =============================================================================

/**
 * Get auto-link configuration for a source type
 */
export function useAutoLinkConfig(sourceType: RemediationSourceType) {
  return useQuery({
    queryKey: remediationKeys.configByType(sourceType),
    queryFn: () => remediationService.config.getConfig(sourceType),
  });
}

/**
 * Get all auto-link configurations
 */
export function useAllAutoLinkConfigs() {
  return useQuery({
    queryKey: remediationKeys.config(),
    queryFn: () => remediationService.config.getAllConfigs(),
  });
}

/**
 * Update auto-link configuration
 */
export function useUpdateAutoLinkConfig() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      sourceType,
      dto,
    }: {
      sourceType: RemediationSourceType;
      dto: UpdateAutoLinkConfigDTO;
    }) => remediationService.config.updateConfig(sourceType, dto),
    onSuccess: (_data) => {
      queryClient.invalidateQueries({
        queryKey: remediationKeys.config(),
      });
      toast({
        title: 'Configuration updated',
        description: 'Auto-link settings have been saved.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update configuration.',
        variant: 'destructive',
      });
    },
  });
}
