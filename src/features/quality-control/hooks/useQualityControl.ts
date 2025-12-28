/**
 * Quality Control React Query Hooks
 *
 * Query and mutation hooks for managing Non-Conformance Reports (NCRs)
 * and QC Inspections.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { qualityControlApi } from '@/lib/api/services/quality-control';
import { useToast } from '@/components/ui/use-toast';

import type {
  NCRFilters,
  InspectionFilters,
  CreateNCRDTO,
  UpdateNCRDTO,
  CreateInspectionDTO,
  UpdateInspectionDTO,
  NCRStatus,
} from '@/types/quality-control';

// ============================================================================
// QUERY KEYS
// ============================================================================

export const qualityControlKeys = {
  all: ['quality-control'] as const,

  // NCRs
  ncrs: () => [...qualityControlKeys.all, 'ncr'] as const,
  ncrLists: () => [...qualityControlKeys.ncrs(), 'list'] as const,
  ncrList: (filters: NCRFilters) => [...qualityControlKeys.ncrLists(), filters] as const,
  ncrDetails: () => [...qualityControlKeys.ncrs(), 'detail'] as const,
  ncrDetail: (id: string) => [...qualityControlKeys.ncrDetails(), id] as const,
  ncrHistory: (id: string) => [...qualityControlKeys.ncrs(), 'history', id] as const,

  // Inspections
  inspections: () => [...qualityControlKeys.all, 'inspection'] as const,
  inspectionLists: () => [...qualityControlKeys.inspections(), 'list'] as const,
  inspectionList: (filters: InspectionFilters) => [...qualityControlKeys.inspectionLists(), filters] as const,
  inspectionDetails: () => [...qualityControlKeys.inspections(), 'detail'] as const,
  inspectionDetail: (id: string) => [...qualityControlKeys.inspectionDetails(), id] as const,
  checklistItems: (inspectionId: string) => [...qualityControlKeys.inspections(), 'checklist', inspectionId] as const,

  // Stats & Summaries
  stats: () => [...qualityControlKeys.all, 'stats'] as const,
  projectStats: (projectId: string) => [...qualityControlKeys.stats(), 'project', projectId] as const,
  ncrSummaryByStatus: (projectId: string) => [...qualityControlKeys.stats(), 'ncr-status', projectId] as const,
  ncrSummaryBySeverity: (projectId: string) => [...qualityControlKeys.stats(), 'ncr-severity', projectId] as const,
};

// ============================================================================
// NCR QUERY HOOKS
// ============================================================================

/**
 * Get all NCRs with filters
 */
export function useNCRs(filters: NCRFilters) {
  return useQuery({
    queryKey: qualityControlKeys.ncrList(filters),
    queryFn: () => qualityControlApi.ncr.getNCRs(filters),
    enabled: !!filters.projectId,
  });
}

/**
 * Get a single NCR by ID
 */
export function useNCR(id: string | undefined) {
  return useQuery({
    queryKey: qualityControlKeys.ncrDetail(id || ''),
    queryFn: () => qualityControlApi.ncr.getNCR(id!),
    enabled: !!id,
  });
}

/**
 * Get NCR history
 */
export function useNCRHistory(ncrId: string | undefined) {
  return useQuery({
    queryKey: qualityControlKeys.ncrHistory(ncrId || ''),
    queryFn: () => qualityControlApi.ncr.getNCRHistory(ncrId!),
    enabled: !!ncrId,
  });
}

// ============================================================================
// NCR MUTATION HOOKS - CRUD
// ============================================================================

/**
 * Create a new NCR
 */
export function useCreateNCR() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (dto: CreateNCRDTO) => qualityControlApi.ncr.createNCR(dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: qualityControlKeys.ncrLists() });
      queryClient.invalidateQueries({ queryKey: qualityControlKeys.stats() });

      toast({
        title: 'NCR created',
        description: `NCR #${data.ncr_number} has been created.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create NCR.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Update an NCR
 */
export function useUpdateNCR() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateNCRDTO }) =>
      qualityControlApi.ncr.updateNCR(id, dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: qualityControlKeys.ncrLists() });
      queryClient.invalidateQueries({ queryKey: qualityControlKeys.ncrDetail(data.id) });
      queryClient.invalidateQueries({ queryKey: qualityControlKeys.stats() });

      toast({
        title: 'NCR updated',
        description: 'Non-conformance report has been updated.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update NCR.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Delete an NCR
 */
export function useDeleteNCR() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => qualityControlApi.ncr.deleteNCR(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qualityControlKeys.ncrs() });
      queryClient.invalidateQueries({ queryKey: qualityControlKeys.stats() });

      toast({
        title: 'NCR deleted',
        description: 'Non-conformance report has been deleted.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete NCR.',
        variant: 'destructive',
      });
    },
  });
}

// ============================================================================
// NCR MUTATION HOOKS - WORKFLOW
// ============================================================================

/**
 * Transition NCR to new status
 */
export function useTransitionNCRStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, status, notes }: { id: string; status: NCRStatus; notes?: string }) =>
      qualityControlApi.ncr.transitionStatus(id, status, notes),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: qualityControlKeys.ncrs() });
      queryClient.invalidateQueries({ queryKey: qualityControlKeys.stats() });

      toast({
        title: 'Status updated',
        description: `NCR status changed to ${data.status.replace(/_/g, ' ')}.`,
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
 * Start investigation on NCR
 */
export function useStartNCRInvestigation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => qualityControlApi.ncr.startInvestigation(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: qualityControlKeys.ncrs() });

      toast({
        title: 'Investigation started',
        description: `NCR #${data.ncr_number} is now under investigation.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to start investigation.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Start corrective action on NCR
 */
export function useStartCorrectiveAction() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: string }) =>
      qualityControlApi.ncr.startCorrectiveAction(id, action),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: qualityControlKeys.ncrs() });

      toast({
        title: 'Corrective action started',
        description: `NCR #${data.ncr_number} corrective action is in progress.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to start corrective action.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Submit NCR for verification
 */
export function useSubmitNCRForVerification() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => qualityControlApi.ncr.submitForVerification(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: qualityControlKeys.ncrs() });

      toast({
        title: 'Submitted for verification',
        description: `NCR #${data.ncr_number} is pending verification.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit for verification.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Verify and close NCR
 */
export function useVerifyNCR() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) =>
      qualityControlApi.ncr.verifyAndClose(id, notes),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: qualityControlKeys.ncrs() });
      queryClient.invalidateQueries({ queryKey: qualityControlKeys.stats() });

      toast({
        title: 'NCR verified',
        description: `NCR #${data.ncr_number} has been verified and closed.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to verify NCR.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Close NCR
 */
export function useCloseNCR() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, disposition }: { id: string; disposition?: string }) =>
      qualityControlApi.ncr.closeNCR(id, disposition),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: qualityControlKeys.ncrs() });
      queryClient.invalidateQueries({ queryKey: qualityControlKeys.stats() });

      toast({
        title: 'NCR closed',
        description: `NCR #${data.ncr_number} has been closed.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to close NCR.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Reopen a closed NCR
 */
export function useReopenNCR() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      qualityControlApi.ncr.reopenNCR(id, reason),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: qualityControlKeys.ncrs() });
      queryClient.invalidateQueries({ queryKey: qualityControlKeys.stats() });

      toast({
        title: 'NCR reopened',
        description: `NCR #${data.ncr_number} has been reopened.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to reopen NCR.',
        variant: 'destructive',
      });
    },
  });
}

// ============================================================================
// INSPECTION QUERY HOOKS
// ============================================================================

/**
 * Get all inspections with filters
 */
export function useInspections(filters: InspectionFilters) {
  return useQuery({
    queryKey: qualityControlKeys.inspectionList(filters),
    queryFn: () => qualityControlApi.inspections.getInspections(filters),
    enabled: !!filters.projectId,
  });
}

/**
 * Get a single inspection by ID
 */
export function useInspection(id: string | undefined) {
  return useQuery({
    queryKey: qualityControlKeys.inspectionDetail(id || ''),
    queryFn: () => qualityControlApi.inspections.getInspection(id!),
    enabled: !!id,
  });
}

/**
 * Get checklist items for an inspection
 */
export function useInspectionChecklistItems(inspectionId: string | undefined) {
  return useQuery({
    queryKey: qualityControlKeys.checklistItems(inspectionId || ''),
    queryFn: () => qualityControlApi.inspections.getChecklistItems(inspectionId!),
    enabled: !!inspectionId,
  });
}

// ============================================================================
// INSPECTION MUTATION HOOKS - CRUD
// ============================================================================

/**
 * Create a new inspection
 */
export function useCreateInspection() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (dto: CreateInspectionDTO) => qualityControlApi.inspections.createInspection(dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: qualityControlKeys.inspectionLists() });
      queryClient.invalidateQueries({ queryKey: qualityControlKeys.stats() });

      toast({
        title: 'Inspection created',
        description: `${data.title} has been scheduled.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create inspection.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Update an inspection
 */
export function useUpdateInspection() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateInspectionDTO }) =>
      qualityControlApi.inspections.updateInspection(id, dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: qualityControlKeys.inspectionLists() });
      queryClient.invalidateQueries({ queryKey: qualityControlKeys.inspectionDetail(data.id) });

      toast({
        title: 'Inspection updated',
        description: 'Inspection has been updated.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update inspection.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Delete an inspection
 */
export function useDeleteInspection() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => qualityControlApi.inspections.deleteInspection(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qualityControlKeys.inspections() });
      queryClient.invalidateQueries({ queryKey: qualityControlKeys.stats() });

      toast({
        title: 'Inspection deleted',
        description: 'Inspection has been deleted.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete inspection.',
        variant: 'destructive',
      });
    },
  });
}

// ============================================================================
// INSPECTION MUTATION HOOKS - WORKFLOW
// ============================================================================

/**
 * Start an inspection
 */
export function useStartInspection() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => qualityControlApi.inspections.startInspection(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: qualityControlKeys.inspections() });

      toast({
        title: 'Inspection started',
        description: `${data.title} is now in progress.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to start inspection.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Complete an inspection
 */
export function useCompleteInspection() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      id,
      result,
      notes,
    }: {
      id: string;
      result: 'pass' | 'fail' | 'conditional_pass';
      notes?: string;
    }) => qualityControlApi.inspections.completeInspection(id, result, notes),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: qualityControlKeys.inspections() });
      queryClient.invalidateQueries({ queryKey: qualityControlKeys.stats() });

      const resultText = data.result === 'pass' ? 'passed' : data.result === 'fail' ? 'failed' : 'conditionally passed';
      toast({
        title: 'Inspection completed',
        description: `${data.title} has ${resultText}.`,
        variant: data.result === 'fail' ? 'destructive' : 'default',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to complete inspection.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Cancel an inspection
 */
export function useCancelInspection() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      qualityControlApi.inspections.cancelInspection(id, reason),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: qualityControlKeys.inspections() });

      toast({
        title: 'Inspection cancelled',
        description: `${data.title} has been cancelled.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to cancel inspection.',
        variant: 'destructive',
      });
    },
  });
}

// ============================================================================
// CHECKLIST ITEM MUTATIONS
// ============================================================================

/**
 * Update a checklist item
 */
export function useUpdateChecklistItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      status,
      notes,
    }: {
      id: string;
      status: 'pending' | 'pass' | 'fail' | 'na';
      notes?: string;
    }) => qualityControlApi.inspections.updateChecklistItem(id, status, notes),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: qualityControlKeys.checklistItems(data.inspection_id) });
    },
  });
}

/**
 * Batch update checklist items
 */
export function useBatchUpdateChecklistItems() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (
      updates: Array<{ id: string; status: 'pending' | 'pass' | 'fail' | 'na'; notes?: string }>
    ) => qualityControlApi.inspections.batchUpdateChecklistItems(updates),
    onSuccess: (data) => {
      if (data.length > 0) {
        queryClient.invalidateQueries({ queryKey: qualityControlKeys.checklistItems(data[0].inspection_id) });
      }
      queryClient.invalidateQueries({ queryKey: qualityControlKeys.inspections() });

      toast({
        title: 'Checklist updated',
        description: `${data.length} items have been updated.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update checklist.',
        variant: 'destructive',
      });
    },
  });
}

// ============================================================================
// STATISTICS HOOKS
// ============================================================================

/**
 * Get project QC statistics
 */
export function useProjectQCStats(projectId: string | undefined) {
  return useQuery({
    queryKey: qualityControlKeys.projectStats(projectId || ''),
    queryFn: () => qualityControlApi.stats.getProjectQCStats(projectId!),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Get NCR summary by status
 */
export function useNCRSummaryByStatus(projectId: string | undefined) {
  return useQuery({
    queryKey: qualityControlKeys.ncrSummaryByStatus(projectId || ''),
    queryFn: () => qualityControlApi.stats.getNCRSummaryByStatus(projectId!),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Get NCR summary by severity
 */
export function useNCRSummaryBySeverity(projectId: string | undefined) {
  return useQuery({
    queryKey: qualityControlKeys.ncrSummaryBySeverity(projectId || ''),
    queryFn: () => qualityControlApi.stats.getNCRSummaryBySeverity(projectId!),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  });
}
