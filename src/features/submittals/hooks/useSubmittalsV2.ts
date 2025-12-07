/**
 * Submittal React Query Hooks (V2 - Dedicated Table)
 *
 * Query and mutation hooks for the dedicated Submittal system
 * Aligned with migration 050_dedicated_submittals.sql
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { submittalApiV2 } from '@/lib/api/services/submittals-v2'
import { useToast } from '@/components/ui/use-toast'
import type {
  SubmittalFilters,
  CreateSubmittalDTO,
  UpdateSubmittalDTO,
  SubmitSubmittalDTO,
  ReviewSubmittalDTO,
  CreateSubmittalItemDTO,
  UpdateSubmittalItemDTO,
  CreateSubmittalAttachmentDTO,
} from '@/types/submittal'
import { formatSubmittalNumber } from '@/types/submittal'

// ============================================================================
// QUERY KEYS
// ============================================================================

export const submittalKeysV2 = {
  all: ['submittals-v2'] as const,

  // Submittals
  submittals: () => [...submittalKeysV2.all, 'list'] as const,
  submittalsList: (filters: SubmittalFilters) => [...submittalKeysV2.submittals(), filters] as const,
  submittalDetail: (id: string) => [...submittalKeysV2.all, 'detail', id] as const,
  submittalStatistics: (projectId: string) => [...submittalKeysV2.all, 'statistics', projectId] as const,
  submittalRegisterSummary: (projectId: string) => [...submittalKeysV2.all, 'register-summary', projectId] as const,
  submittalsByBallInCourt: (userId: string, projectId?: string) => [...submittalKeysV2.all, 'ball-in-court', userId, projectId] as const,
  overdueSubmittals: (projectId: string) => [...submittalKeysV2.all, 'overdue', projectId] as const,

  // Items
  items: (submittalId: string) => [...submittalKeysV2.all, 'items', submittalId] as const,

  // Attachments
  attachments: (submittalId: string) => [...submittalKeysV2.all, 'attachments', submittalId] as const,

  // Reviews
  reviews: (submittalId: string) => [...submittalKeysV2.all, 'reviews', submittalId] as const,

  // History
  history: (submittalId: string) => [...submittalKeysV2.all, 'history', submittalId] as const,
}

// ============================================================================
// SUBMITTAL HOOKS
// ============================================================================

/**
 * Get all submittals with filters
 */
export function useSubmittalsV2(filters: SubmittalFilters) {
  return useQuery({
    queryKey: submittalKeysV2.submittalsList(filters),
    queryFn: () => submittalApiV2.submittals.getSubmittals(filters),
    enabled: !!filters.projectId,
  })
}

/**
 * Get a single submittal with all details
 */
export function useSubmittalV2(id: string | undefined) {
  return useQuery({
    queryKey: submittalKeysV2.submittalDetail(id || ''),
    queryFn: () => submittalApiV2.submittals.getSubmittal(id!),
    enabled: !!id,
  })
}

/**
 * Get submittal statistics for a project
 */
export function useSubmittalStatisticsV2(projectId: string | undefined) {
  return useQuery({
    queryKey: submittalKeysV2.submittalStatistics(projectId || ''),
    queryFn: () => submittalApiV2.submittals.getSubmittalStatistics(projectId!),
    enabled: !!projectId,
  })
}

/**
 * Get submittal register summary by spec section
 */
export function useSubmittalRegisterSummary(projectId: string | undefined) {
  return useQuery({
    queryKey: submittalKeysV2.submittalRegisterSummary(projectId || ''),
    queryFn: () => submittalApiV2.submittals.getSubmittalRegisterSummary(projectId!),
    enabled: !!projectId,
  })
}

/**
 * Get submittals where user is ball-in-court
 */
export function useSubmittalsByBallInCourt(userId: string | undefined, projectId?: string) {
  return useQuery({
    queryKey: submittalKeysV2.submittalsByBallInCourt(userId || '', projectId),
    queryFn: () => submittalApiV2.submittals.getSubmittalsByBallInCourt(userId!, projectId),
    enabled: !!userId,
  })
}

/**
 * Get overdue submittals for a project
 */
export function useOverdueSubmittals(projectId: string | undefined) {
  return useQuery({
    queryKey: submittalKeysV2.overdueSubmittals(projectId || ''),
    queryFn: () => submittalApiV2.submittals.getOverdueSubmittals(projectId!),
    enabled: !!projectId,
  })
}

/**
 * Create a new submittal
 */
export function useCreateSubmittalV2() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: (dto: CreateSubmittalDTO) => submittalApiV2.submittals.createSubmittal(dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: submittalKeysV2.submittals() })
      queryClient.invalidateQueries({ queryKey: submittalKeysV2.submittalStatistics(data.project_id) })
      queryClient.invalidateQueries({ queryKey: submittalKeysV2.submittalRegisterSummary(data.project_id) })
      toast({
        title: 'Submittal created',
        description: `${formatSubmittalNumber(data.submittal_number, data.revision_number)} has been created.`,
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create submittal.',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Update a submittal
 */
export function useUpdateSubmittalV2() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateSubmittalDTO }) =>
      submittalApiV2.submittals.updateSubmittal(id, dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: submittalKeysV2.submittals() })
      queryClient.invalidateQueries({ queryKey: submittalKeysV2.submittalDetail(data.id) })
      queryClient.invalidateQueries({ queryKey: submittalKeysV2.submittalStatistics(data.project_id) })
      toast({
        title: 'Submittal updated',
        description: 'Submittal has been updated.',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update submittal.',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Submit a submittal (not_submitted -> submitted)
 */
export function useSubmitSubmittalV2() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto?: SubmitSubmittalDTO }) =>
      submittalApiV2.submittals.submitSubmittal(id, dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: submittalKeysV2.submittals() })
      queryClient.invalidateQueries({ queryKey: submittalKeysV2.submittalDetail(data.id) })
      queryClient.invalidateQueries({ queryKey: submittalKeysV2.submittalStatistics(data.project_id) })
      toast({
        title: 'Submittal submitted',
        description: `${formatSubmittalNumber(data.submittal_number, data.revision_number)} has been submitted.`,
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit submittal.',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Review a submittal
 */
export function useReviewSubmittalV2() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: ReviewSubmittalDTO }) =>
      submittalApiV2.submittals.reviewSubmittal(id, dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: submittalKeysV2.submittals() })
      queryClient.invalidateQueries({ queryKey: submittalKeysV2.submittalDetail(data.id) })
      queryClient.invalidateQueries({ queryKey: submittalKeysV2.submittalStatistics(data.project_id) })
      queryClient.invalidateQueries({ queryKey: submittalKeysV2.reviews(data.id) })
      toast({
        title: 'Review submitted',
        description: 'Submittal review has been recorded.',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit review.',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Create a revision (resubmit after revise_resubmit)
 */
export function useCreateSubmittalRevision() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: (id: string) => submittalApiV2.submittals.createRevision(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: submittalKeysV2.submittals() })
      queryClient.invalidateQueries({ queryKey: submittalKeysV2.submittalStatistics(data.project_id) })
      toast({
        title: 'Revision created',
        description: `${formatSubmittalNumber(data.submittal_number, data.revision_number)} has been created.`,
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create revision.',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Update ball-in-court assignment
 */
export function useUpdateSubmittalBallInCourt() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: ({
      id,
      ballInCourt,
      ballInCourtEntity,
    }: {
      id: string
      ballInCourt: string | null
      ballInCourtEntity: string | null
    }) => submittalApiV2.submittals.updateBallInCourt(id, ballInCourt, ballInCourtEntity),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: submittalKeysV2.submittals() })
      queryClient.invalidateQueries({ queryKey: submittalKeysV2.submittalDetail(data.id) })
      toast({
        title: 'Ball-in-court updated',
        description: 'Submittal assignment has been updated.',
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
 * Delete a submittal
 */
export function useDeleteSubmittalV2() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: (id: string) => submittalApiV2.submittals.deleteSubmittal(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: submittalKeysV2.submittals() })
      toast({
        title: 'Submittal deleted',
        description: 'Submittal has been deleted.',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete submittal.',
        variant: 'destructive',
      })
    },
  })
}

// ============================================================================
// ITEM HOOKS
// ============================================================================

/**
 * Get items for a submittal
 */
export function useSubmittalItems(submittalId: string | undefined) {
  return useQuery({
    queryKey: submittalKeysV2.items(submittalId || ''),
    queryFn: () => submittalApiV2.items.getItems(submittalId!),
    enabled: !!submittalId,
  })
}

/**
 * Add an item to a submittal
 */
export function useAddSubmittalItem() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: ({ submittalId, dto }: { submittalId: string; dto: CreateSubmittalItemDTO }) =>
      submittalApiV2.items.addItem(submittalId, dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: submittalKeysV2.items(data.submittal_id) })
      queryClient.invalidateQueries({ queryKey: submittalKeysV2.submittalDetail(data.submittal_id) })
      toast({
        title: 'Item added',
        description: 'Item has been added to the submittal.',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add item.',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Update an item
 */
export function useUpdateSubmittalItem() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: ({ id, submittalId, dto }: { id: string; submittalId: string; dto: UpdateSubmittalItemDTO }) =>
      submittalApiV2.items.updateItem(id, dto),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: submittalKeysV2.items(variables.submittalId) })
      toast({
        title: 'Item updated',
        description: 'Item has been updated.',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update item.',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Delete an item
 */
export function useDeleteSubmittalItem() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: ({ id, submittalId }: { id: string; submittalId: string }) =>
      submittalApiV2.items.deleteItem(id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: submittalKeysV2.items(variables.submittalId) })
      queryClient.invalidateQueries({ queryKey: submittalKeysV2.submittalDetail(variables.submittalId) })
      toast({
        title: 'Item deleted',
        description: 'Item has been removed.',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete item.',
        variant: 'destructive',
      })
    },
  })
}

/**
 * Reorder items
 */
export function useReorderSubmittalItems() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: ({ submittalId, itemIds }: { submittalId: string; itemIds: string[] }) =>
      submittalApiV2.items.reorderItems(submittalId, itemIds),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: submittalKeysV2.items(variables.submittalId) })
      toast({
        title: 'Items reordered',
        description: 'Item order has been updated.',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to reorder items.',
        variant: 'destructive',
      })
    },
  })
}

// ============================================================================
// ATTACHMENT HOOKS
// ============================================================================

/**
 * Get attachments for a submittal
 */
export function useSubmittalAttachments(submittalId: string | undefined) {
  return useQuery({
    queryKey: submittalKeysV2.attachments(submittalId || ''),
    queryFn: () => submittalApiV2.attachments.getAttachments(submittalId!),
    enabled: !!submittalId,
  })
}

/**
 * Add an attachment to a submittal
 */
export function useAddSubmittalAttachment() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: (dto: CreateSubmittalAttachmentDTO) => submittalApiV2.attachments.addAttachment(dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: submittalKeysV2.attachments(data.submittal_id) })
      queryClient.invalidateQueries({ queryKey: submittalKeysV2.submittalDetail(data.submittal_id) })
      toast({
        title: 'Attachment added',
        description: 'File has been attached to the submittal.',
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
export function useDeleteSubmittalAttachment() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: ({ id, submittalId }: { id: string; submittalId: string }) =>
      submittalApiV2.attachments.deleteAttachment(id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: submittalKeysV2.attachments(variables.submittalId) })
      queryClient.invalidateQueries({ queryKey: submittalKeysV2.submittalDetail(variables.submittalId) })
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
// REVIEW HOOKS
// ============================================================================

/**
 * Get reviews for a submittal
 */
export function useSubmittalReviews(submittalId: string | undefined) {
  return useQuery({
    queryKey: submittalKeysV2.reviews(submittalId || ''),
    queryFn: () => submittalApiV2.reviews.getReviews(submittalId!),
    enabled: !!submittalId,
  })
}

// ============================================================================
// HISTORY HOOKS
// ============================================================================

/**
 * Get history for a submittal
 */
export function useSubmittalHistory(submittalId: string | undefined) {
  return useQuery({
    queryKey: submittalKeysV2.history(submittalId || ''),
    queryFn: () => submittalApiV2.history.getHistory(submittalId!),
    enabled: !!submittalId,
  })
}
