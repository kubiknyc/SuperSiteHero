/**
 * Pending Users Hooks
 *
 * React Query hooks for managing pending user approvals
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/lib/notifications/ToastContext';
import { userApprovalApi } from '@/lib/api/services/user-approval';

// Query keys
export const pendingUsersKeys = {
  all: ['pending-users'] as const,
  list: () => [...pendingUsersKeys.all, 'list'] as const,
};

/**
 * Get all pending users for the current user's company
 */
export function usePendingUsers() {
  return useQuery({
    queryKey: pendingUsersKeys.list(),
    queryFn: () => userApprovalApi.getPendingUsers(),
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute for real-time updates
  });
}

/**
 * Approve a pending user
 */
export function useApproveUser() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (userId: string) => userApprovalApi.approveUser(userId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: pendingUsersKeys.list(),
      });
      showToast({
        type: 'success',
        message: data.message || 'User approved successfully',
      });
    },
    onError: (error: Error) => {
      showToast({
        type: 'error',
        message: error.message || 'Failed to approve user',
      });
    },
  });
}

/**
 * Reject a pending user with optional reason
 */
export function useRejectUser() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason?: string }) =>
      userApprovalApi.rejectUser(userId, reason),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: pendingUsersKeys.list(),
      });
      showToast({
        type: 'success',
        message: data.message || 'User rejected successfully',
      });
    },
    onError: (error: Error) => {
      showToast({
        type: 'error',
        message: error.message || 'Failed to reject user',
      });
    },
  });
}
