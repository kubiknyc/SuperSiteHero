/**
 * Change Orders React Query Hooks - V2
 * For dedicated change_orders table with enhanced PCO/CO workflow
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  changeOrdersApiV2,
  changeOrderItemsApiV2,
  changeOrderAttachmentsApiV2,
  changeOrderHistoryApiV2,
} from '../../../lib/api/services/change-orders-v2';
import { changeOrderBudgetIntegration } from '../../../lib/api/services/change-order-budget-integration';
import { supabase } from '@/lib/supabase';
import { sendChangeOrderStatusNotification, type NotificationRecipient } from '@/lib/notifications/notification-service';
import type {
  CreateChangeOrderDTO,
  UpdateChangeOrderDTO,
  CreateChangeOrderItemDTO,
  UpdateChangeOrderItemDTO,
  CreateChangeOrderAttachmentDTO,
  ChangeOrderFilters,
  SubmitEstimateDTO,
  InternalApprovalDTO,
  OwnerApprovalDTO,
} from '../../../types/change-order';

const APP_URL = import.meta.env.VITE_APP_URL || 'https://JobSight.com';

/**
 * Helper to get project stakeholders for change order notifications
 * Returns project managers and other key stakeholders
 */
async function getChangeOrderRecipients(
  projectId: string,
  excludeUserId?: string
): Promise<NotificationRecipient[]> {
  const { data: projectMembers } = await supabase
    .from('project_members')
    .select('user_id, role, users!inner(id, email, full_name)')
    .eq('project_id', projectId)
    .in('role', ['owner', 'project_manager', 'superintendent', 'admin']);

  if (!projectMembers) {return [];}

  return projectMembers
    .filter((pm: any) => pm.users?.id !== excludeUserId)
    .map((pm: any) => ({
      userId: pm.users.id,
      email: pm.users.email,
      name: pm.users.full_name,
    }));
}

/**
 * Helper to get project name
 */
async function getProjectName(projectId: string): Promise<string> {
  const { data } = await supabase
    .from('projects')
    .select('name')
    .eq('id', projectId)
    .single();
  return data?.name || 'Project';
}

/**
 * Helper to format currency
 */
function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) {return 'N/A';}
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

// =============================================================================
// QUERY KEYS
// =============================================================================

export const changeOrderKeysV2 = {
  all: ['change-orders-v2'] as const,
  lists: () => [...changeOrderKeysV2.all, 'list'] as const,
  list: (filters: ChangeOrderFilters) => [...changeOrderKeysV2.lists(), filters] as const,
  details: () => [...changeOrderKeysV2.all, 'detail'] as const,
  detail: (id: string) => [...changeOrderKeysV2.details(), id] as const,
  items: (changeOrderId: string) => [...changeOrderKeysV2.all, 'items', changeOrderId] as const,
  attachments: (changeOrderId: string) => [...changeOrderKeysV2.all, 'attachments', changeOrderId] as const,
  history: (changeOrderId: string) => [...changeOrderKeysV2.all, 'history', changeOrderId] as const,
  statistics: (projectId: string) => [...changeOrderKeysV2.all, 'statistics', projectId] as const,
  byBallInCourt: (userId: string) => [...changeOrderKeysV2.all, 'ball-in-court', userId] as const,
  budgetImpact: (changeOrderId: string) => [...changeOrderKeysV2.all, 'budget-impact', changeOrderId] as const,
};

// =============================================================================
// CHANGE ORDER QUERIES
// =============================================================================

/**
 * Hook to fetch change orders with filters
 */
export function useChangeOrdersV2(filters: ChangeOrderFilters = {}) {
  return useQuery({
    queryKey: changeOrderKeysV2.list(filters),
    queryFn: () => changeOrdersApiV2.getChangeOrders(filters),
    staleTime: 30000,
  });
}

/**
 * Hook to fetch a single change order by ID
 */
export function useChangeOrderV2(id: string | undefined) {
  return useQuery({
    queryKey: changeOrderKeysV2.detail(id || ''),
    queryFn: () => changeOrdersApiV2.getChangeOrderById(id!),
    enabled: !!id,
    staleTime: 30000,
  });
}

/**
 * Hook to fetch change orders by ball-in-court user
 */
export function useChangeOrdersByBallInCourt(userId: string | undefined) {
  return useQuery({
    queryKey: changeOrderKeysV2.byBallInCourt(userId || ''),
    queryFn: () => changeOrdersApiV2.getChangeOrders({ ball_in_court: userId }),
    enabled: !!userId,
    staleTime: 30000,
  });
}

/**
 * Hook to fetch change order statistics
 */
export function useChangeOrderStatisticsV2(projectId: string | undefined) {
  return useQuery({
    queryKey: changeOrderKeysV2.statistics(projectId || ''),
    queryFn: () => changeOrdersApiV2.getStatistics(projectId!),
    enabled: !!projectId,
    staleTime: 60000,
  });
}

/**
 * Hook to fetch PCOs only
 */
export function usePCOs(projectId: string | undefined) {
  return useChangeOrdersV2({
    project_id: projectId,
    is_pco: true,
  });
}

/**
 * Hook to fetch approved COs only
 */
export function useApprovedCOs(projectId: string | undefined) {
  return useChangeOrdersV2({
    project_id: projectId,
    is_pco: false,
  });
}

// =============================================================================
// CHANGE ORDER MUTATIONS
// =============================================================================

/**
 * Hook to create a new change order (PCO)
 */
export function useCreateChangeOrderV2() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateChangeOrderDTO) => changeOrdersApiV2.createChangeOrder(dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: changeOrderKeysV2.lists() });
      queryClient.invalidateQueries({ queryKey: changeOrderKeysV2.statistics(data.project_id) });
    },
  });
}

/**
 * Hook to update a change order
 */
export function useUpdateChangeOrderV2() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...dto }: { id: string } & UpdateChangeOrderDTO) =>
      changeOrdersApiV2.updateChangeOrder(id, dto),
    onSuccess: (data) => {
      queryClient.setQueryData(changeOrderKeysV2.detail(data.id), data);
      queryClient.invalidateQueries({ queryKey: changeOrderKeysV2.lists() });
      queryClient.invalidateQueries({ queryKey: changeOrderKeysV2.statistics(data.project_id) });
    },
  });
}

/**
 * Hook to delete a change order
 */
export function useDeleteChangeOrderV2() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => changeOrdersApiV2.deleteChangeOrder(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: changeOrderKeysV2.lists() });
      queryClient.removeQueries({ queryKey: changeOrderKeysV2.detail(id) });
    },
  });
}

/**
 * Hook to submit estimate
 */
export function useSubmitEstimate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...dto }: { id: string } & SubmitEstimateDTO) =>
      changeOrdersApiV2.submitEstimate(id, dto),
    onSuccess: (data) => {
      queryClient.setQueryData(changeOrderKeysV2.detail(data.id), data);
      queryClient.invalidateQueries({ queryKey: changeOrderKeysV2.lists() });
      queryClient.invalidateQueries({ queryKey: changeOrderKeysV2.items(data.id) });
    },
  });
}

/**
 * Hook to process internal approval
 */
export function useProcessInternalApproval() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...dto }: { id: string } & InternalApprovalDTO) =>
      changeOrdersApiV2.processInternalApproval(id, dto),
    onSuccess: async (data, variables) => {
      queryClient.setQueryData(changeOrderKeysV2.detail(data.id), data);
      queryClient.invalidateQueries({ queryKey: changeOrderKeysV2.lists() });
      queryClient.invalidateQueries({ queryKey: changeOrderKeysV2.statistics(data.project_id) });

      // Send notification to stakeholders about approval decision
      const recipients = await getChangeOrderRecipients(data.project_id);
      if (recipients.length > 0) {
        const projectName = await getProjectName(data.project_id);
        const statusLabel = variables.approved ? 'Internally Approved' : 'Internally Rejected';

        sendChangeOrderStatusNotification(recipients, {
          changeOrderNumber: data.number || `PCO-${data.id.slice(0, 8)}`,
          title: data.title || 'Change Order',
          projectName,
          previousStatus: 'pending_internal_approval',
          newStatus: statusLabel.toLowerCase().replace(' ', '_'),
          amount: formatCurrency(data.total_amount),
          changedBy: 'Internal Approver',
          viewUrl: `${APP_URL}/projects/${data.project_id}/change-orders/${data.id}`,
        }).catch(console.error);
      }
    },
  });
}

/**
 * Hook to submit to owner
 */
export function useSubmitToOwner() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => changeOrdersApiV2.submitToOwner(id),
    onSuccess: async (data) => {
      queryClient.setQueryData(changeOrderKeysV2.detail(data.id), data);
      queryClient.invalidateQueries({ queryKey: changeOrderKeysV2.lists() });

      // Notify stakeholders that CO has been submitted to owner
      const recipients = await getChangeOrderRecipients(data.project_id);
      if (recipients.length > 0) {
        const projectName = await getProjectName(data.project_id);

        sendChangeOrderStatusNotification(recipients, {
          changeOrderNumber: data.number || `CO-${data.id.slice(0, 8)}`,
          title: data.title || 'Change Order',
          projectName,
          previousStatus: 'internally_approved',
          newStatus: 'submitted_to_owner',
          amount: formatCurrency(data.total_amount),
          changedBy: 'Project Team',
          viewUrl: `${APP_URL}/projects/${data.project_id}/change-orders/${data.id}`,
        }).catch(console.error);
      }
    },
  });
}

/**
 * Hook to process owner approval
 * Also invalidates budget queries since approval triggers budget adjustment
 */
export function useProcessOwnerApproval() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...dto }: { id: string } & OwnerApprovalDTO) =>
      changeOrdersApiV2.processOwnerApproval(id, dto),
    onSuccess: async (data, variables) => {
      queryClient.setQueryData(changeOrderKeysV2.detail(data.id), data);
      queryClient.invalidateQueries({ queryKey: changeOrderKeysV2.lists() });
      queryClient.invalidateQueries({ queryKey: changeOrderKeysV2.statistics(data.project_id) });
      // Invalidate budget queries since approval triggers budget adjustment
      queryClient.invalidateQueries({ queryKey: ['project-budgets'] });
      queryClient.invalidateQueries({ queryKey: ['cost-transactions'] });
      queryClient.invalidateQueries({ queryKey: changeOrderKeysV2.history(data.id) });

      // Notify stakeholders about owner's decision
      const recipients = await getChangeOrderRecipients(data.project_id);
      if (recipients.length > 0) {
        const projectName = await getProjectName(data.project_id);
        const statusLabel = variables.approved ? 'Owner Approved' : 'Owner Rejected';

        sendChangeOrderStatusNotification(recipients, {
          changeOrderNumber: data.number || `CO-${data.id.slice(0, 8)}`,
          title: data.title || 'Change Order',
          projectName,
          previousStatus: 'submitted_to_owner',
          newStatus: statusLabel.toLowerCase().replace(' ', '_'),
          amount: formatCurrency(data.total_amount),
          changedBy: 'Owner',
          viewUrl: `${APP_URL}/projects/${data.project_id}/change-orders/${data.id}`,
        }).catch(console.error);
      }
    },
  });
}

/**
 * Hook to execute change order
 */
export function useExecuteChangeOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => changeOrdersApiV2.executeChangeOrder(id),
    onSuccess: async (data) => {
      queryClient.setQueryData(changeOrderKeysV2.detail(data.id), data);
      queryClient.invalidateQueries({ queryKey: changeOrderKeysV2.lists() });

      // Notify stakeholders that CO has been executed
      const recipients = await getChangeOrderRecipients(data.project_id);
      if (recipients.length > 0) {
        const projectName = await getProjectName(data.project_id);

        sendChangeOrderStatusNotification(recipients, {
          changeOrderNumber: data.number || `CO-${data.id.slice(0, 8)}`,
          title: data.title || 'Change Order',
          projectName,
          previousStatus: 'owner_approved',
          newStatus: 'executed',
          amount: formatCurrency(data.total_amount),
          changedBy: 'Project Manager',
          viewUrl: `${APP_URL}/projects/${data.project_id}/change-orders/${data.id}`,
        }).catch(console.error);
      }
    },
  });
}

/**
 * Hook to void a change order
 * Also invalidates budget queries since voiding a CO reverses budget adjustments
 */
export function useVoidChangeOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      changeOrdersApiV2.voidChangeOrder(id, reason),
    onSuccess: async (data) => {
      queryClient.setQueryData(changeOrderKeysV2.detail(data.id), data);
      queryClient.invalidateQueries({ queryKey: changeOrderKeysV2.lists() });
      queryClient.invalidateQueries({ queryKey: changeOrderKeysV2.statistics(data.project_id) });
      // Invalidate budget queries since voiding can reverse budget adjustments
      queryClient.invalidateQueries({ queryKey: ['project-budgets'] });
      queryClient.invalidateQueries({ queryKey: ['cost-transactions'] });
      queryClient.invalidateQueries({ queryKey: changeOrderKeysV2.history(data.id) });

      // Notify stakeholders that CO has been voided
      const recipients = await getChangeOrderRecipients(data.project_id);
      if (recipients.length > 0) {
        const projectName = await getProjectName(data.project_id);

        sendChangeOrderStatusNotification(recipients, {
          changeOrderNumber: data.number || `CO-${data.id.slice(0, 8)}`,
          title: data.title || 'Change Order',
          projectName,
          previousStatus: data.status || 'unknown',
          newStatus: 'voided',
          amount: formatCurrency(data.total_amount),
          changedBy: 'Project Manager',
          viewUrl: `${APP_URL}/projects/${data.project_id}/change-orders/${data.id}`,
        }).catch(console.error);
      }
    },
  });
}

/**
 * Hook to update ball-in-court
 */
export function useUpdateBallInCourt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, userId, role }: { id: string; userId: string; role: string }) =>
      changeOrdersApiV2.updateBallInCourt(id, userId, role),
    onSuccess: (data) => {
      queryClient.setQueryData(changeOrderKeysV2.detail(data.id), data);
      queryClient.invalidateQueries({ queryKey: changeOrderKeysV2.lists() });
    },
  });
}

/**
 * Hook to update change order owner signature
 */
export function useUpdateChangeOrderSignature() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      signatureUrl,
      signerName,
      signatureDate: _signatureDate,
    }: {
      id: string;
      signatureUrl: string | null;
      signerName?: string;
      signatureDate?: string | null;
    }) => {
      return changeOrdersApiV2.updateChangeOrder(id, {
        owner_signature_url: signatureUrl,
        owner_approver_name: signerName,
      });
    },
    onSuccess: (data) => {
      queryClient.setQueryData(changeOrderKeysV2.detail(data.id), data);
      queryClient.invalidateQueries({ queryKey: changeOrderKeysV2.lists() });
    },
  });
}

// =============================================================================
// CHANGE ORDER ITEMS
// =============================================================================

/**
 * Hook to fetch items for a change order
 */
export function useChangeOrderItems(changeOrderId: string | undefined) {
  return useQuery({
    queryKey: changeOrderKeysV2.items(changeOrderId || ''),
    queryFn: () => changeOrderItemsApiV2.getItems(changeOrderId!),
    enabled: !!changeOrderId,
    staleTime: 30000,
  });
}

/**
 * Hook to add item to change order
 */
export function useAddChangeOrderItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ changeOrderId, ...dto }: { changeOrderId: string } & CreateChangeOrderItemDTO) =>
      changeOrderItemsApiV2.addItem(changeOrderId, dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: changeOrderKeysV2.items(data.change_order_id) });
      queryClient.invalidateQueries({ queryKey: changeOrderKeysV2.detail(data.change_order_id) });
    },
  });
}

/**
 * Hook to update item
 */
export function useUpdateChangeOrderItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...dto }: { id: string } & UpdateChangeOrderItemDTO) =>
      changeOrderItemsApiV2.updateItem(id, dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: changeOrderKeysV2.items(data.change_order_id) });
      queryClient.invalidateQueries({ queryKey: changeOrderKeysV2.detail(data.change_order_id) });
    },
  });
}

/**
 * Hook to delete item
 */
export function useDeleteChangeOrderItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id }: { id: string; changeOrderId: string }) =>
      changeOrderItemsApiV2.deleteItem(id),
    onSuccess: (_, { changeOrderId }) => {
      queryClient.invalidateQueries({ queryKey: changeOrderKeysV2.items(changeOrderId) });
      queryClient.invalidateQueries({ queryKey: changeOrderKeysV2.detail(changeOrderId) });
    },
  });
}

/**
 * Hook to reorder items
 */
export function useReorderChangeOrderItems() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ changeOrderId, itemIds }: { changeOrderId: string; itemIds: string[] }) =>
      changeOrderItemsApiV2.reorderItems(changeOrderId, itemIds),
    onSuccess: (_, { changeOrderId }) => {
      queryClient.invalidateQueries({ queryKey: changeOrderKeysV2.items(changeOrderId) });
    },
  });
}

// =============================================================================
// CHANGE ORDER ATTACHMENTS
// =============================================================================

/**
 * Hook to fetch attachments for a change order
 */
export function useChangeOrderAttachments(changeOrderId: string | undefined) {
  return useQuery({
    queryKey: changeOrderKeysV2.attachments(changeOrderId || ''),
    queryFn: () => changeOrderAttachmentsApiV2.getAttachments(changeOrderId!),
    enabled: !!changeOrderId,
    staleTime: 30000,
  });
}

/**
 * Hook to add attachment
 */
export function useAddChangeOrderAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ changeOrderId, ...dto }: { changeOrderId: string } & CreateChangeOrderAttachmentDTO) =>
      changeOrderAttachmentsApiV2.addAttachment(changeOrderId, dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: changeOrderKeysV2.attachments(data.change_order_id) });
    },
  });
}

/**
 * Hook to delete attachment
 */
export function useDeleteChangeOrderAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id }: { id: string; changeOrderId: string }) =>
      changeOrderAttachmentsApiV2.deleteAttachment(id),
    onSuccess: (_, { changeOrderId }) => {
      queryClient.invalidateQueries({ queryKey: changeOrderKeysV2.attachments(changeOrderId) });
    },
  });
}

// =============================================================================
// CHANGE ORDER HISTORY
// =============================================================================

/**
 * Hook to fetch history for a change order
 */
export function useChangeOrderHistory(changeOrderId: string | undefined) {
  return useQuery({
    queryKey: changeOrderKeysV2.history(changeOrderId || ''),
    queryFn: () => changeOrderHistoryApiV2.getHistory(changeOrderId!),
    enabled: !!changeOrderId,
    staleTime: 60000,
  });
}

// =============================================================================
// BUDGET INTEGRATION
// =============================================================================

/**
 * Hook to preview budget impact before approving a change order
 * Shows which cost codes will be affected and by how much
 */
export function useChangeOrderBudgetImpact(changeOrderId: string | undefined) {
  return useQuery({
    queryKey: changeOrderKeysV2.budgetImpact(changeOrderId || ''),
    queryFn: () => changeOrderBudgetIntegration.previewBudgetImpact(changeOrderId!),
    enabled: !!changeOrderId,
    staleTime: 30000,
  });
}

// =============================================================================
// EXPORT ALL
// =============================================================================

export default {
  // Query keys
  keys: changeOrderKeysV2,

  // Queries
  useChangeOrdersV2,
  useChangeOrderV2,
  useChangeOrdersByBallInCourt,
  useChangeOrderStatisticsV2,
  usePCOs,
  useApprovedCOs,

  // Mutations
  useCreateChangeOrderV2,
  useUpdateChangeOrderV2,
  useDeleteChangeOrderV2,
  useSubmitEstimate,
  useProcessInternalApproval,
  useSubmitToOwner,
  useProcessOwnerApproval,
  useExecuteChangeOrder,
  useVoidChangeOrder,
  useUpdateBallInCourt,

  // Items
  useChangeOrderItems,
  useAddChangeOrderItem,
  useUpdateChangeOrderItem,
  useDeleteChangeOrderItem,
  useReorderChangeOrderItems,

  // Attachments
  useChangeOrderAttachments,
  useAddChangeOrderAttachment,
  useDeleteChangeOrderAttachment,

  // History
  useChangeOrderHistory,

  // Budget Integration
  useChangeOrderBudgetImpact,
};
