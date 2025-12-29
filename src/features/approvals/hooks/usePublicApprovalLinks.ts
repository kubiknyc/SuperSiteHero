/**
 * Public Approval Links Hooks
 *
 * React Query hooks for managing public approval links
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/lib/notifications/ToastContext';
import { publicApprovalsApi } from '@/lib/api/services/public-approvals';
import type {
  CreatePublicLinkInput,
  SubmitClientApprovalInput,
} from '@/types/approval-workflow';

// Query keys
export const publicApprovalKeys = {
  all: ['public-approvals'] as const,
  links: (requestId: string) => [...publicApprovalKeys.all, 'links', requestId] as const,
  validation: (token: string) => [...publicApprovalKeys.all, 'validation', token] as const,
  pageData: (token: string) => [...publicApprovalKeys.all, 'page-data', token] as const,
  responses: (requestId: string) => [...publicApprovalKeys.all, 'responses', requestId] as const,
};

// ============================================================================
// AUTHENTICATED HOOKS (for internal users)
// ============================================================================

/**
 * Get all public approval links for an approval request
 */
export function usePublicApprovalLinks(approvalRequestId: string | undefined) {
  return useQuery({
    queryKey: publicApprovalKeys.links(approvalRequestId || ''),
    queryFn: () => publicApprovalsApi.getPublicApprovalLinks(approvalRequestId!),
    enabled: !!approvalRequestId,
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Create a new public approval link
 */
export function useCreatePublicApprovalLink() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (input: CreatePublicLinkInput) =>
      publicApprovalsApi.createPublicApprovalLink(input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: publicApprovalKeys.links(data.approval_request_id),
      });
      showToast({
        type: 'success',
        message: 'Approval link created successfully',
      });
    },
    onError: (error: Error) => {
      showToast({
        type: 'error',
        message: error.message || 'Failed to create approval link',
      });
    },
  });
}

/**
 * Revoke a public approval link
 */
export function useRevokePublicApprovalLink() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({
      linkId,
      approvalRequestId,
    }: {
      linkId: string;
      approvalRequestId: string;
    }) => publicApprovalsApi.revokePublicApprovalLink(linkId).then(() => ({ approvalRequestId })),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: publicApprovalKeys.links(variables.approvalRequestId),
      });
      showToast({
        type: 'success',
        message: 'Approval link revoked',
      });
    },
    onError: (error: Error) => {
      showToast({
        type: 'error',
        message: error.message || 'Failed to revoke approval link',
      });
    },
  });
}

/**
 * Send approval link via email
 */
export function useSendApprovalLinkEmail() {
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({
      linkId,
      recipientEmail,
      customMessage,
    }: {
      linkId: string;
      recipientEmail: string;
      customMessage?: string;
    }) => publicApprovalsApi.sendApprovalLinkEmail(linkId, recipientEmail, customMessage),
    onSuccess: () => {
      showToast({
        type: 'success',
        message: 'Approval link email sent',
      });
    },
    onError: (error: Error) => {
      showToast({
        type: 'error',
        message: error.message || 'Failed to send email',
      });
    },
  });
}

/**
 * Get client approval responses for an approval request
 */
export function useClientApprovalResponses(approvalRequestId: string | undefined) {
  return useQuery({
    queryKey: publicApprovalKeys.responses(approvalRequestId || ''),
    queryFn: () => publicApprovalsApi.getClientApprovalResponses(approvalRequestId!),
    enabled: !!approvalRequestId,
    staleTime: 30 * 1000, // 30 seconds
  });
}

// ============================================================================
// PUBLIC HOOKS (for external clients - no authentication required)
// ============================================================================

/**
 * Validate a public approval token
 */
export function useValidatePublicApprovalToken(token: string | undefined) {
  return useQuery({
    queryKey: publicApprovalKeys.validation(token || ''),
    queryFn: () => publicApprovalsApi.validatePublicApprovalToken(token!),
    enabled: !!token,
    staleTime: 60 * 1000, // 1 minute
    retry: false, // Don't retry on failure
  });
}

/**
 * Get public approval page data
 */
export function usePublicApprovalPageData(token: string | undefined) {
  return useQuery({
    queryKey: publicApprovalKeys.pageData(token || ''),
    queryFn: () => publicApprovalsApi.getPublicApprovalPageData(token!),
    enabled: !!token,
    staleTime: 60 * 1000, // 1 minute
    retry: false, // Don't retry on failure
  });
}

/**
 * Submit a client approval response
 */
export function useSubmitClientApprovalResponse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      input,
      ipAddress,
      userAgent,
    }: {
      input: SubmitClientApprovalInput;
      ipAddress?: string;
      userAgent?: string;
    }) => publicApprovalsApi.submitClientApprovalResponse(input, ipAddress, userAgent),
    onSuccess: (data) => {
      // Invalidate the page data query to show updated status
      queryClient.invalidateQueries({
        queryKey: publicApprovalKeys.all,
      });
    },
  });
}

// ============================================================================
// COMPOUND HOOKS
// ============================================================================

/**
 * Hook for managing public approval links with all operations
 */
export function usePublicApprovalLinkManager(approvalRequestId: string | undefined) {
  const links = usePublicApprovalLinks(approvalRequestId);
  const createLink = useCreatePublicApprovalLink();
  const revokeLink = useRevokePublicApprovalLink();
  const sendEmail = useSendApprovalLinkEmail();
  const responses = useClientApprovalResponses(approvalRequestId);

  return {
    // Data
    links: links.data || [],
    responses: responses.data || [],
    isLoading: links.isLoading || responses.isLoading,
    error: links.error || responses.error,

    // Operations
    createLink: async (input: Omit<CreatePublicLinkInput, 'approval_request_id'>) => {
      if (!approvalRequestId) {return;}
      return createLink.mutateAsync({
        ...input,
        approval_request_id: approvalRequestId,
      });
    },
    revokeLink: async (linkId: string) => {
      if (!approvalRequestId) {return;}
      return revokeLink.mutateAsync({ linkId, approvalRequestId });
    },
    sendEmail: async (linkId: string, email: string, message?: string) => {
      return sendEmail.mutateAsync({
        linkId,
        recipientEmail: email,
        customMessage: message,
      });
    },

    // Mutation states
    isCreating: createLink.isPending,
    isRevoking: revokeLink.isPending,
    isSending: sendEmail.isPending,
  };
}

/**
 * Hook for the public approval page (client-facing)
 */
export function usePublicApprovalPage(token: string | undefined) {
  const pageData = usePublicApprovalPageData(token);
  const submitResponse = useSubmitClientApprovalResponse();

  return {
    // Data
    data: pageData.data,
    isLoading: pageData.isLoading,
    error: pageData.error,
    isValid: !!pageData.data,

    // Operations
    submitResponse: async (input: Omit<SubmitClientApprovalInput, 'public_link_id'>) => {
      if (!pageData.data?.link.id) {
        throw new Error('Invalid approval link');
      }
      return submitResponse.mutateAsync({
        input: {
          ...input,
          public_link_id: pageData.data.link.id,
        },
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      });
    },

    // Mutation states
    isSubmitting: submitResponse.isPending,
    submitError: submitResponse.error,
    submitSuccess: submitResponse.isSuccess,
    submittedResponse: submitResponse.data,
  };
}
