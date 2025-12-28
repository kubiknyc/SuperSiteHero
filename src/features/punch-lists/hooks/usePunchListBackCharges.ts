/**
 * Punch List Back-Charges React Query Hooks
 *
 * Query and mutation hooks for managing back-charges on punch list items.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { punchListBackChargesApi } from '@/lib/api/services/punch-list-back-charges';
import { useToast } from '@/components/ui/use-toast';

import type {
  BackChargeFilters,
  CreateBackChargeDTO,
  UpdateBackChargeDTO,
  ApproveBackChargeDTO,
  DisputeBackChargeDTO,
  ResolveDisputeDTO,
  ApplyBackChargeDTO,
} from '@/types/punch-list-back-charge';

// ============================================================================
// QUERY KEYS
// ============================================================================

export const backChargeKeys = {
  all: ['punch-list-back-charges'] as const,

  // Lists
  lists: () => [...backChargeKeys.all, 'list'] as const,
  list: (filters: BackChargeFilters) => [...backChargeKeys.lists(), filters] as const,
  byPunchItem: (punchItemId: string) => [...backChargeKeys.lists(), 'punch-item', punchItemId] as const,

  // Details
  details: () => [...backChargeKeys.all, 'detail'] as const,
  detail: (id: string) => [...backChargeKeys.details(), id] as const,

  // History
  history: (id: string) => [...backChargeKeys.all, 'history', id] as const,

  // Summaries
  summaries: () => [...backChargeKeys.all, 'summary'] as const,
  bySubcontractor: (projectId: string) => [...backChargeKeys.summaries(), 'subcontractor', projectId] as const,
  byProject: (projectId: string) => [...backChargeKeys.summaries(), 'project', projectId] as const,
  stats: (projectId: string) => [...backChargeKeys.summaries(), 'stats', projectId] as const,
};

// ============================================================================
// QUERY HOOKS
// ============================================================================

/**
 * Get all back-charges with filters
 */
export function useBackCharges(filters: BackChargeFilters) {
  return useQuery({
    queryKey: backChargeKeys.list(filters),
    queryFn: () => punchListBackChargesApi.getBackCharges(filters),
    enabled: !!filters.projectId,
  });
}

/**
 * Get back-charges for a specific punch item
 */
export function useBackChargesForPunchItem(punchItemId: string | undefined) {
  return useQuery({
    queryKey: backChargeKeys.byPunchItem(punchItemId || ''),
    queryFn: () => punchListBackChargesApi.getBackChargesForPunchItem(punchItemId!),
    enabled: !!punchItemId,
  });
}

/**
 * Get a single back-charge by ID
 */
export function useBackCharge(id: string | undefined) {
  return useQuery({
    queryKey: backChargeKeys.detail(id || ''),
    queryFn: () => punchListBackChargesApi.getBackCharge(id!),
    enabled: !!id,
  });
}

/**
 * Get back-charge history
 */
export function useBackChargeHistory(backChargeId: string | undefined) {
  return useQuery({
    queryKey: backChargeKeys.history(backChargeId || ''),
    queryFn: () => punchListBackChargesApi.getBackChargeHistory(backChargeId!),
    enabled: !!backChargeId,
  });
}

/**
 * Get back-charges summary by subcontractor
 */
export function useBackChargesBySubcontractor(projectId: string | undefined) {
  return useQuery({
    queryKey: backChargeKeys.bySubcontractor(projectId || ''),
    queryFn: () => punchListBackChargesApi.getBackChargesBySubcontractor(projectId!),
    enabled: !!projectId,
  });
}

/**
 * Get back-charges summary by project
 */
export function useBackChargesByProject(projectId: string | undefined) {
  return useQuery({
    queryKey: backChargeKeys.byProject(projectId || ''),
    queryFn: () => punchListBackChargesApi.getBackChargesByProject(projectId!),
    enabled: !!projectId,
  });
}

/**
 * Get project back-charge statistics
 */
export function useBackChargeStats(projectId: string | undefined) {
  return useQuery({
    queryKey: backChargeKeys.stats(projectId || ''),
    queryFn: () => punchListBackChargesApi.getProjectBackChargeStats(projectId!),
    enabled: !!projectId,
  });
}

// ============================================================================
// MUTATION HOOKS - CRUD
// ============================================================================

/**
 * Create a new back-charge
 */
export function useCreateBackCharge() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (dto: CreateBackChargeDTO) => punchListBackChargesApi.createBackCharge(dto),
    onSuccess: (data) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: backChargeKeys.lists() });
      queryClient.invalidateQueries({ queryKey: backChargeKeys.byPunchItem(data.punch_item_id) });
      queryClient.invalidateQueries({ queryKey: backChargeKeys.summaries() });

      toast({
        title: 'Back-charge created',
        description: `Back-charge #${data.back_charge_number} has been created.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create back-charge.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Update a back-charge
 */
export function useUpdateBackCharge() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateBackChargeDTO }) =>
      punchListBackChargesApi.updateBackCharge(id, dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: backChargeKeys.lists() });
      queryClient.invalidateQueries({ queryKey: backChargeKeys.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: backChargeKeys.byPunchItem(data.punch_item_id) });
      queryClient.invalidateQueries({ queryKey: backChargeKeys.summaries() });

      toast({
        title: 'Back-charge updated',
        description: 'Back-charge has been updated.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update back-charge.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Delete a back-charge
 */
export function useDeleteBackCharge() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => punchListBackChargesApi.deleteBackCharge(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: backChargeKeys.all });

      toast({
        title: 'Back-charge deleted',
        description: 'Back-charge has been deleted.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete back-charge.',
        variant: 'destructive',
      });
    },
  });
}

// ============================================================================
// MUTATION HOOKS - WORKFLOW
// ============================================================================

/**
 * Mark back-charge as estimated
 */
export function useMarkEstimated() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => punchListBackChargesApi.markEstimated(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: backChargeKeys.all });

      toast({
        title: 'Estimation complete',
        description: 'Back-charge has been marked as estimated.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update back-charge.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Submit for approval
 */
export function useSubmitForApproval() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => punchListBackChargesApi.submitForApproval(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: backChargeKeys.all });

      toast({
        title: 'Submitted for approval',
        description: 'Back-charge has been submitted for approval.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit for approval.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Approve back-charge
 */
export function useApproveBackCharge() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto?: ApproveBackChargeDTO }) =>
      punchListBackChargesApi.approveBackCharge(id, dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: backChargeKeys.all });

      toast({
        title: 'Back-charge approved',
        description: `Back-charge #${data.back_charge_number} has been approved.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to approve back-charge.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Send to subcontractor
 */
export function useSendToSubcontractor() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => punchListBackChargesApi.sendToSubcontractor(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: backChargeKeys.all });

      toast({
        title: 'Sent to subcontractor',
        description: 'Back-charge notification has been sent to the subcontractor.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send to subcontractor.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Dispute back-charge
 */
export function useDisputeBackCharge() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: DisputeBackChargeDTO }) =>
      punchListBackChargesApi.disputeBackCharge(id, dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: backChargeKeys.all });

      toast({
        title: 'Back-charge disputed',
        description: 'The dispute has been recorded.',
        variant: 'warning',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to record dispute.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Resolve dispute
 */
export function useResolveDispute() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: ResolveDisputeDTO }) =>
      punchListBackChargesApi.resolveDispute(id, dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: backChargeKeys.all });

      toast({
        title: 'Dispute resolved',
        description: 'The dispute has been resolved.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to resolve dispute.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Apply to payment
 */
export function useApplyToPayment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto?: ApplyBackChargeDTO }) =>
      punchListBackChargesApi.applyToPayment(id, dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: backChargeKeys.all });

      toast({
        title: 'Back-charge applied',
        description: `Back-charge #${data.back_charge_number} has been applied to payment.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to apply to payment.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Void back-charge
 */
export function useVoidBackCharge() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      punchListBackChargesApi.voidBackCharge(id, reason),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: backChargeKeys.all });

      toast({
        title: 'Back-charge voided',
        description: `Back-charge #${data.back_charge_number} has been voided.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to void back-charge.',
        variant: 'destructive',
      });
    },
  });
}
