/**
 * RFI React Query Hooks (V2 - Dedicated Table)
 *
 * Query and mutation hooks for the dedicated RFI system
 * Aligned with migration 049_dedicated_rfis.sql
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { rfiApiV2 } from '@/lib/api/services/rfis-v2'
import { useToast } from '@/components/ui/use-toast'
import type {
  RFIFilters,
  CreateRFIDTO,
  UpdateRFIDTO,
  SubmitRFIResponseDTO,
  CreateRFIAttachmentDTO,
  CreateRFICommentDTO,
  UpdateRFICommentDTO,
} from '@/types/rfi'

// ============================================================================
// QUERY KEYS
// ============================================================================

export const rfiKeysV2 = {
  all: ['rfis-v2'] as const,

  // RFIs
  rfis: () => [...rfiKeysV2.all, 'list'] as const,
  rfisList: (filters: RFIFilters) => [...rfiKeysV2.rfis(), filters] as const,
  rfiDetail: (id: string) => [...rfiKeysV2.all, 'detail', id] as const,
  rfiStatistics: (projectId: string) => [...rfiKeysV2.all, 'statistics', projectId] as const,
  rfisByBallInCourt: (userId: string, projectId?: string) => [...rfiKeysV2.all, 'ball-in-court', userId, projectId] as const,
  overdueRfis: (projectId: string) => [...rfiKeysV2.all, 'overdue', projectId] as const,

  // Attachments
  attachments: (rfiId: string) => [...rfiKeysV2.all, 'attachments', rfiId] as const,

  // Comments
  comments: (rfiId: string) => [...rfiKeysV2.all, 'comments', rfiId] as const,

  // History
  history: (rfiId: string) => [...rfiKeysV2.all, 'history', rfiId] as const,
}

// ============================================================================
// RFI HOOKS
// ============================================================================

/**
 * Get all RFIs with filters
 */
export function useRFIsV2(filters: RFIFilters) {
  return useQuery({
    queryKey: rfiKeysV2.rfisList(filters),
    queryFn: () => rfiApiV2.rfis.getRFIs(filters),
    enabled: !!filters.projectId,
  })
}

/**
 * Get a single RFI with all details
 */
export function useRFIV2(id: string | undefined) {
  return useQuery({
    queryKey: rfiKeysV2.rfiDetail(id || ''),
    queryFn: () => rfiApiV2.rfis.getRFI(id!),
    enabled: !!id,
  })
}

/**
 * Get RFI statistics for a project
 */
export function useRFIStatisticsV2(projectId: string | undefined) {
  return useQuery({
    queryKey: rfiKeysV2.rfiStatistics(projectId || ''),
    queryFn: () => rfiApiV2.rfis.getRFIStatistics(projectId!),
    enabled: !!projectId,
  })
}

/**
 * Get RFIs where user is ball-in-court
 */
export function useRFIsByBallInCourt(userId: string | undefined, projectId?: string) {
  return useQuery({
    queryKey: rfiKeysV2.rfisByBallInCourt(userId || '', projectId),
    queryFn: () => rfiApiV2.rfis.getRFIsByBallInCourt(userId!, projectId),
    enabled: !!userId,
  })
}

/**
 * Get overdue RFIs for a project
 */
export function useOverdueRFIs(projectId: string | undefined) {
  return useQuery({
    queryKey: rfiKeysV2.overdueRfis(projectId || ''),
    queryFn: () => rfiApiV2.rfis.getOverdueRFIs(projectId!),
    enabled: !!projectId,
  })
}

/**
 * Create a new RFI
 */
export function useCreateRFIV2() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: (dto: CreateRFIDTO) => rfiApiV2.rfis.createRFI(dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: rfiKeysV2.rfis() })
      queryClient.invalidateQueries({ queryKey: rfiKeysV2.rfiStatistics(data.project_id) })
      toast({
        title: 'RFI created',
        description: `RFI-${String(data.rfi_number).padStart(3, '0')} has been created.`,
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create RFI.',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Update an RFI
 */
export function useUpdateRFIV2() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateRFIDTO }) =>
      rfiApiV2.rfis.updateRFI(id, dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: rfiKeysV2.rfis() })
      queryClient.invalidateQueries({ queryKey: rfiKeysV2.rfiDetail(data.id) })
      queryClient.invalidateQueries({ queryKey: rfiKeysV2.rfiStatistics(data.project_id) })
      toast({
        title: 'RFI updated',
        description: 'RFI has been updated.',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update RFI.',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Submit an RFI (draft -> submitted)
 */
export function useSubmitRFIV2() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: (id: string) => rfiApiV2.rfis.submitRFI(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: rfiKeysV2.rfis() })
      queryClient.invalidateQueries({ queryKey: rfiKeysV2.rfiDetail(data.id) })
      queryClient.invalidateQueries({ queryKey: rfiKeysV2.rfiStatistics(data.project_id) })
      toast({
        title: 'RFI submitted',
        description: `RFI-${String(data.rfi_number).padStart(3, '0')} has been submitted.`,
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit RFI.',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Submit a response to an RFI
 */
export function useSubmitRFIResponseV2() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: SubmitRFIResponseDTO }) =>
      rfiApiV2.rfis.submitResponse(id, dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: rfiKeysV2.rfis() })
      queryClient.invalidateQueries({ queryKey: rfiKeysV2.rfiDetail(data.id) })
      queryClient.invalidateQueries({ queryKey: rfiKeysV2.rfiStatistics(data.project_id) })
      toast({
        title: 'Response submitted',
        description: 'RFI response has been submitted.',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit response.',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Approve an RFI
 */
export function useApproveRFIV2() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: (id: string) => rfiApiV2.rfis.approveRFI(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: rfiKeysV2.rfis() })
      queryClient.invalidateQueries({ queryKey: rfiKeysV2.rfiDetail(data.id) })
      queryClient.invalidateQueries({ queryKey: rfiKeysV2.rfiStatistics(data.project_id) })
      toast({
        title: 'RFI approved',
        description: 'RFI has been approved.',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to approve RFI.',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Reject an RFI
 */
export function useRejectRFIV2() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: (id: string) => rfiApiV2.rfis.rejectRFI(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: rfiKeysV2.rfis() })
      queryClient.invalidateQueries({ queryKey: rfiKeysV2.rfiDetail(data.id) })
      queryClient.invalidateQueries({ queryKey: rfiKeysV2.rfiStatistics(data.project_id) })
      toast({
        title: 'RFI rejected',
        description: 'RFI has been rejected.',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to reject RFI.',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Close an RFI
 */
export function useCloseRFIV2() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: (id: string) => rfiApiV2.rfis.closeRFI(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: rfiKeysV2.rfis() })
      queryClient.invalidateQueries({ queryKey: rfiKeysV2.rfiDetail(data.id) })
      queryClient.invalidateQueries({ queryKey: rfiKeysV2.rfiStatistics(data.project_id) })
      toast({
        title: 'RFI closed',
        description: 'RFI has been closed.',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to close RFI.',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Update ball-in-court assignment
 */
export function useUpdateRFIBallInCourt() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: ({
      id,
      ballInCourt,
      ballInCourtRole,
    }: {
      id: string
      ballInCourt: string | null
      ballInCourtRole: string | null
    }) => rfiApiV2.rfis.updateBallInCourt(id, ballInCourt, ballInCourtRole),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: rfiKeysV2.rfis() })
      queryClient.invalidateQueries({ queryKey: rfiKeysV2.rfiDetail(data.id) })
      toast({
        title: 'Ball-in-court updated',
        description: 'RFI assignment has been updated.',
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
 * Delete an RFI
 */
export function useDeleteRFIV2() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: (id: string) => rfiApiV2.rfis.deleteRFI(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rfiKeysV2.rfis() })
      toast({
        title: 'RFI deleted',
        description: 'RFI has been deleted.',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete RFI.',
        variant: 'destructive',
      })
    },
  })
}

// ============================================================================
// ATTACHMENT HOOKS
// ============================================================================

/**
 * Get attachments for an RFI
 */
export function useRFIAttachments(rfiId: string | undefined) {
  return useQuery({
    queryKey: rfiKeysV2.attachments(rfiId || ''),
    queryFn: () => rfiApiV2.attachments.getAttachments(rfiId!),
    enabled: !!rfiId,
  })
}

/**
 * Add an attachment to an RFI
 */
export function useAddRFIAttachment() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: (dto: CreateRFIAttachmentDTO) => rfiApiV2.attachments.addAttachment(dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: rfiKeysV2.attachments(data.rfi_id) })
      queryClient.invalidateQueries({ queryKey: rfiKeysV2.rfiDetail(data.rfi_id) })
      toast({
        title: 'Attachment added',
        description: 'File has been attached to the RFI.',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add attachment.',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Delete an attachment
 */
export function useDeleteRFIAttachment() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: ({ id, rfiId }: { id: string; rfiId: string }) =>
      rfiApiV2.attachments.deleteAttachment(id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: rfiKeysV2.attachments(variables.rfiId) })
      queryClient.invalidateQueries({ queryKey: rfiKeysV2.rfiDetail(variables.rfiId) })
      toast({
        title: 'Attachment deleted',
        description: 'Attachment has been removed.',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete attachment.',
        variant: 'destructive',
      })
    },
  })
}

// ============================================================================
// COMMENT HOOKS
// ============================================================================

/**
 * Get comments for an RFI
 */
export function useRFIComments(rfiId: string | undefined) {
  return useQuery({
    queryKey: rfiKeysV2.comments(rfiId || ''),
    queryFn: () => rfiApiV2.comments.getComments(rfiId!),
    enabled: !!rfiId,
  })
}

/**
 * Add a comment to an RFI
 */
export function useAddRFIComment() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: (dto: CreateRFICommentDTO) => rfiApiV2.comments.addComment(dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: rfiKeysV2.comments(data.rfi_id) })
      queryClient.invalidateQueries({ queryKey: rfiKeysV2.rfiDetail(data.rfi_id) })
      toast({
        title: 'Comment added',
        description: 'Your comment has been added.',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add comment.',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Update a comment
 */
export function useUpdateRFIComment() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: ({ id, rfiId, dto }: { id: string; rfiId: string; dto: UpdateRFICommentDTO }) =>
      rfiApiV2.comments.updateComment(id, dto),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: rfiKeysV2.comments(variables.rfiId) })
      toast({
        title: 'Comment updated',
        description: 'Your comment has been updated.',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update comment.',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Delete a comment
 */
export function useDeleteRFIComment() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: ({ id, rfiId }: { id: string; rfiId: string }) =>
      rfiApiV2.comments.deleteComment(id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: rfiKeysV2.comments(variables.rfiId) })
      queryClient.invalidateQueries({ queryKey: rfiKeysV2.rfiDetail(variables.rfiId) })
      toast({
        title: 'Comment deleted',
        description: 'Comment has been deleted.',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete comment.',
        variant: 'destructive',
      })
    },
  })
}

// ============================================================================
// HISTORY HOOKS
// ============================================================================

/**
 * Get history for an RFI
 */
export function useRFIHistory(rfiId: string | undefined) {
  return useQuery({
    queryKey: rfiKeysV2.history(rfiId || ''),
    queryFn: () => rfiApiV2.history.getHistory(rfiId!),
    enabled: !!rfiId,
  })
}
