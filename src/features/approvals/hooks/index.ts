/**
 * Approval Hooks - Public exports
 */

// Workflow hooks
export {
  useApprovalWorkflows,
  useApprovalWorkflow,
  useActiveWorkflowsByType,
  useCreateApprovalWorkflow,
  useCreateApprovalWorkflow as useCreateWorkflow,
  useUpdateApprovalWorkflow,
  useUpdateApprovalWorkflow as useUpdateWorkflow,
  useDeleteApprovalWorkflow,
  useDeleteApprovalWorkflow as useDeleteWorkflow,
  useDuplicateApprovalWorkflow,
  useDuplicateApprovalWorkflow as useDuplicateWorkflow,
  useCreateApprovalWorkflowWithNotification,
  useUpdateApprovalWorkflowWithNotification,
  useDeleteApprovalWorkflowWithNotification,
} from './useApprovalWorkflows'

// Request hooks
export {
  useApprovalRequests,
  useApprovalRequest,
  usePendingApprovals,
  useEntityApprovalStatus,
  useCanUserApprove,
  useCreateApprovalRequest,
  useCancelApprovalRequest,
  useCreateApprovalRequestWithNotification,
  useCancelApprovalRequestWithNotification,
} from './useApprovalRequests'

// Action hooks
export {
  useApprovalHistory,
  useApproveRequest,
  useApproveWithConditions,
  useRejectRequest,
  useDelegateRequest,
  useAddApprovalComment,
  useApproveRequestWithNotification,
  useApproveWithConditionsWithNotification,
  useRejectRequestWithNotification,
  useAddApprovalCommentWithNotification,
} from './useApprovalActions'

// Public approval link hooks
export {
  publicApprovalKeys,
  usePublicApprovalLinks,
  useCreatePublicApprovalLink,
  useRevokePublicApprovalLink,
  useSendApprovalLinkEmail,
  useClientApprovalResponses,
  useValidatePublicApprovalToken,
  usePublicApprovalPageData,
  useSubmitClientApprovalResponse,
  usePublicApprovalLinkManager,
  usePublicApprovalPage,
} from './usePublicApprovalLinks'
