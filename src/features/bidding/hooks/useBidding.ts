/**
 * Bidding Module React Query Hooks
 * Provides comprehensive hooks for bid package management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth/AuthContext'
import type {
  BidPackage,
  BidPackageWithDetails,
  BidPackageItem,
  BidInvitation,
  BidInvitationWithDetails,
  BidQuestion,
  BidAddendum,
  BidSubmission,
  BidSubmissionWithDetails,
  BidSubmissionItem,
  BidComparison,
  BidEvaluationCriteria,
  BidPackageFilters,
  BidSubmissionFilters,
  BidPackageStatistics,
  CreateBidPackageDTO,
  UpdateBidPackageDTO,
  CreateBidInvitationDTO,
  CreateBidSubmissionDTO,
  AnswerBidQuestionDTO,
  AwardBidDTO,
} from '@/types/bidding'

// Use any for tables not in generated types
const db = supabase as any

// Query keys
export const bidPackageKeys = {
  all: ['bidPackages'] as const,
  lists: () => [...bidPackageKeys.all, 'list'] as const,
  list: (filters: BidPackageFilters) => [...bidPackageKeys.lists(), filters] as const,
  detail: (id: string) => [...bidPackageKeys.all, 'detail', id] as const,
  stats: (id: string) => [...bidPackageKeys.all, 'stats', id] as const,
  items: (id: string) => [...bidPackageKeys.all, 'items', id] as const,
  invitations: (id: string) => [...bidPackageKeys.all, 'invitations', id] as const,
  questions: (id: string) => [...bidPackageKeys.all, 'questions', id] as const,
  addenda: (id: string) => [...bidPackageKeys.all, 'addenda', id] as const,
  submissions: (id: string) => [...bidPackageKeys.all, 'submissions', id] as const,
  comparison: (id: string) => [...bidPackageKeys.all, 'comparison', id] as const,
}

// =============================================
// Bid Package Queries
// =============================================

/**
 * Get bid packages with filters
 */
export function useBidPackages(filters: BidPackageFilters = {}) {
  const { userProfile } = useAuth()

  return useQuery({
    queryKey: bidPackageKeys.list(filters),
    queryFn: async () => {
      let query = db
        .from('bid_packages')
        .select(`
          *,
          project:projects(id, name, project_number)
        `)
        .eq('company_id', userProfile?.company_id)
        .is('deleted_at', null)

      if (filters.projectId) {
        query = query.eq('project_id', filters.projectId)
      }

      if (filters.status) {
        if (Array.isArray(filters.status)) {
          query = query.in('status', filters.status)
        } else {
          query = query.eq('status', filters.status)
        }
      }

      if (filters.bidType) {
        query = query.eq('bid_type', filters.bidType)
      }

      if (filters.division) {
        query = query.eq('division', filters.division)
      }

      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,package_number.ilike.%${filters.search}%`)
      }

      if (filters.dueDateFrom) {
        query = query.gte('bid_due_date', filters.dueDateFrom)
      }

      if (filters.dueDateTo) {
        query = query.lte('bid_due_date', filters.dueDateTo)
      }

      query = query.order('bid_due_date', { ascending: true })

      const { data, error } = await query

      if (error) throw error
      return data as BidPackageWithDetails[]
    },
    enabled: !!userProfile?.company_id,
  })
}

/**
 * Get single bid package
 */
export function useBidPackage(id: string | undefined) {
  return useQuery({
    queryKey: bidPackageKeys.detail(id || ''),
    queryFn: async () => {
      const { data, error } = await db
        .from('bid_packages')
        .select(`
          *,
          project:projects(id, name, project_number)
        `)
        .eq('id', id)
        .single()

      if (error) throw error
      return data as BidPackageWithDetails
    },
    enabled: !!id,
  })
}

/**
 * Get bid package statistics
 */
export function useBidPackageStats(packageId: string | undefined) {
  return useQuery({
    queryKey: bidPackageKeys.stats(packageId || ''),
    queryFn: async () => {
      const { data, error } = await db.rpc('get_bid_package_stats', {
        p_package_id: packageId,
      })

      if (error) throw error
      return data?.[0] as BidPackageStatistics
    },
    enabled: !!packageId,
  })
}

/**
 * Get bid package items
 */
export function useBidPackageItems(packageId: string | undefined) {
  return useQuery({
    queryKey: bidPackageKeys.items(packageId || ''),
    queryFn: async () => {
      const { data, error } = await db
        .from('bid_package_items')
        .select('*')
        .eq('bid_package_id', packageId)
        .order('sort_order', { ascending: true })

      if (error) throw error
      return data as BidPackageItem[]
    },
    enabled: !!packageId,
  })
}

// =============================================
// Bid Invitation Queries
// =============================================

/**
 * Get invitations for a bid package
 */
export function useBidInvitations(packageId: string | undefined) {
  return useQuery({
    queryKey: bidPackageKeys.invitations(packageId || ''),
    queryFn: async () => {
      const { data, error } = await db
        .from('bid_invitations')
        .select(`
          *,
          subcontractor:subcontractors(id, company_name, contact_name)
        `)
        .eq('bid_package_id', packageId)
        .order('invited_at', { ascending: false })

      if (error) throw error
      return data as BidInvitationWithDetails[]
    },
    enabled: !!packageId,
  })
}

// =============================================
// Bid Question Queries
// =============================================

/**
 * Get questions for a bid package
 */
export function useBidQuestions(packageId: string | undefined) {
  return useQuery({
    queryKey: bidPackageKeys.questions(packageId || ''),
    queryFn: async () => {
      const { data, error } = await db
        .from('bid_questions')
        .select('*')
        .eq('bid_package_id', packageId)
        .order('question_number', { ascending: true })

      if (error) throw error
      return data as BidQuestion[]
    },
    enabled: !!packageId,
  })
}

// =============================================
// Bid Addenda Queries
// =============================================

/**
 * Get addenda for a bid package
 */
export function useBidAddenda(packageId: string | undefined) {
  return useQuery({
    queryKey: bidPackageKeys.addenda(packageId || ''),
    queryFn: async () => {
      const { data, error } = await db
        .from('bid_addenda')
        .select('*')
        .eq('bid_package_id', packageId)
        .order('addendum_number', { ascending: true })

      if (error) throw error
      return data as BidAddendum[]
    },
    enabled: !!packageId,
  })
}

// =============================================
// Bid Submission Queries
// =============================================

/**
 * Get submissions for a bid package
 */
export function useBidSubmissions(packageId: string | undefined, filters: Partial<BidSubmissionFilters> = {}) {
  return useQuery({
    queryKey: bidPackageKeys.submissions(packageId || ''),
    queryFn: async () => {
      let query = db
        .from('bid_submissions')
        .select(`
          *,
          invitation:bid_invitations(*)
        `)
        .eq('bid_package_id', packageId)

      if (filters.status) {
        if (Array.isArray(filters.status)) {
          query = query.in('status', filters.status)
        } else {
          query = query.eq('status', filters.status)
        }
      }

      if (filters.isLate !== undefined) {
        query = query.eq('is_late', filters.isLate)
      }

      query = query.order('base_bid_amount', { ascending: true })

      const { data, error } = await query

      if (error) throw error
      return data as BidSubmissionWithDetails[]
    },
    enabled: !!packageId,
  })
}

/**
 * Get single bid submission
 */
export function useBidSubmission(id: string | undefined) {
  return useQuery({
    queryKey: ['bidSubmission', id],
    queryFn: async () => {
      const { data, error } = await db
        .from('bid_submissions')
        .select(`
          *,
          invitation:bid_invitations(*),
          package:bid_packages(*)
        `)
        .eq('id', id)
        .single()

      if (error) throw error
      return data as BidSubmissionWithDetails
    },
    enabled: !!id,
  })
}

/**
 * Get submission line items
 */
export function useBidSubmissionItems(submissionId: string | undefined) {
  return useQuery({
    queryKey: ['bidSubmissionItems', submissionId],
    queryFn: async () => {
      const { data, error } = await db
        .from('bid_submission_items')
        .select(`
          *,
          package_item:bid_package_items(*)
        `)
        .eq('submission_id', submissionId)

      if (error) throw error
      return data as (BidSubmissionItem & { package_item: BidPackageItem })[]
    },
    enabled: !!submissionId,
  })
}

// =============================================
// Bid Package Mutations
// =============================================

/**
 * Create bid package
 */
export function useCreateBidPackage() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async (dto: CreateBidPackageDTO) => {
      const { data, error } = await db
        .from('bid_packages')
        .insert({
          ...dto,
          company_id: userProfile?.company_id,
          created_by: userProfile?.id,
        })
        .select()
        .single()

      if (error) throw error
      return data as BidPackage
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bidPackageKeys.lists() })
      toast.success('Bid package created')
    },
    onError: (error: Error) => {
      toast.error(`Failed to create bid package: ${error.message}`)
    },
  })
}

/**
 * Update bid package
 */
export function useUpdateBidPackage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, dto }: { id: string; dto: UpdateBidPackageDTO }) => {
      const { data, error } = await db
        .from('bid_packages')
        .update(dto)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as BidPackage
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: bidPackageKeys.detail(data.id) })
      queryClient.invalidateQueries({ queryKey: bidPackageKeys.lists() })
      toast.success('Bid package updated')
    },
    onError: (error: Error) => {
      toast.error(`Failed to update bid package: ${error.message}`)
    },
  })
}

/**
 * Publish bid package
 */
export function usePublishBidPackage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await db
        .from('bid_packages')
        .update({
          status: 'published',
          issue_date: new Date().toISOString().split('T')[0],
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as BidPackage
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: bidPackageKeys.detail(data.id) })
      queryClient.invalidateQueries({ queryKey: bidPackageKeys.lists() })
      toast.success('Bid package published')
    },
    onError: (error: Error) => {
      toast.error(`Failed to publish bid package: ${error.message}`)
    },
  })
}

/**
 * Award bid
 */
export function useAwardBid() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ packageId, dto }: { packageId: string; dto: AwardBidDTO }) => {
      // Update bid package
      const { error: packageError } = await db
        .from('bid_packages')
        .update({
          status: 'awarded',
          awarded_to_bid_id: dto.submission_id,
          award_amount: dto.award_amount,
          award_notes: dto.award_notes,
          award_date: new Date().toISOString().split('T')[0],
        })
        .eq('id', packageId)

      if (packageError) throw packageError

      // Update winning submission
      const { error: submissionError } = await db
        .from('bid_submissions')
        .update({
          status: 'awarded',
          is_awarded: true,
          award_amount: dto.award_amount,
          award_date: new Date().toISOString().split('T')[0],
        })
        .eq('id', dto.submission_id)

      if (submissionError) throw submissionError

      // Update other submissions to not_awarded
      const { error: othersError } = await db
        .from('bid_submissions')
        .update({ status: 'not_awarded' })
        .eq('bid_package_id', packageId)
        .neq('id', dto.submission_id)
        .not('status', 'in', '("withdrawn","disqualified")')

      if (othersError) throw othersError

      return { packageId, submissionId: dto.submission_id }
    },
    onSuccess: ({ packageId }) => {
      queryClient.invalidateQueries({ queryKey: bidPackageKeys.detail(packageId) })
      queryClient.invalidateQueries({ queryKey: bidPackageKeys.submissions(packageId) })
      queryClient.invalidateQueries({ queryKey: bidPackageKeys.lists() })
      toast.success('Bid awarded successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to award bid: ${error.message}`)
    },
  })
}

/**
 * Delete bid package
 */
export function useDeleteBidPackage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db
        .from('bid_packages')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bidPackageKeys.lists() })
      toast.success('Bid package deleted')
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete bid package: ${error.message}`)
    },
  })
}

// =============================================
// Bid Invitation Mutations
// =============================================

/**
 * Send bid invitation
 */
export function useSendBidInvitation() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async (dto: CreateBidInvitationDTO) => {
      // Generate portal access token
      const token = crypto.randomUUID()
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 30) // 30 days

      const { data, error } = await db
        .from('bid_invitations')
        .insert({
          ...dto,
          invited_by: userProfile?.id,
          portal_access_token: token,
          portal_token_expires_at: expiresAt.toISOString(),
        })
        .select()
        .single()

      if (error) throw error
      return data as BidInvitation
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: bidPackageKeys.invitations(data.bid_package_id) })
      queryClient.invalidateQueries({ queryKey: bidPackageKeys.stats(data.bid_package_id) })
      toast.success('Invitation sent')
    },
    onError: (error: Error) => {
      toast.error(`Failed to send invitation: ${error.message}`)
    },
  })
}

/**
 * Bulk send invitations
 */
export function useBulkSendInvitations() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async ({ packageId, invitations }: { packageId: string; invitations: Omit<CreateBidInvitationDTO, 'bid_package_id'>[] }) => {
      const records = invitations.map((inv) => {
        const token = crypto.randomUUID()
        const expiresAt = new Date()
        expiresAt.setDate(expiresAt.getDate() + 30)

        return {
          ...inv,
          bid_package_id: packageId,
          invited_by: userProfile?.id,
          portal_access_token: token,
          portal_token_expires_at: expiresAt.toISOString(),
        }
      })

      const { data, error } = await db
        .from('bid_invitations')
        .insert(records)
        .select()

      if (error) throw error
      return { packageId, count: data.length }
    },
    onSuccess: ({ packageId, count }) => {
      queryClient.invalidateQueries({ queryKey: bidPackageKeys.invitations(packageId) })
      queryClient.invalidateQueries({ queryKey: bidPackageKeys.stats(packageId) })
      toast.success(`${count} invitations sent`)
    },
    onError: (error: Error) => {
      toast.error(`Failed to send invitations: ${error.message}`)
    },
  })
}

// =============================================
// Bid Question Mutations
// =============================================

/**
 * Answer bid question
 */
export function useAnswerBidQuestion() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async ({ questionId, dto }: { questionId: string; dto: AnswerBidQuestionDTO }) => {
      const { data, error } = await db
        .from('bid_questions')
        .update({
          answer: dto.answer,
          is_published: dto.is_published ?? false,
          answer_attachments: dto.answer_attachments,
          answered_by: userProfile?.id,
          answered_at: new Date().toISOString(),
          status: 'answered',
        })
        .eq('id', questionId)
        .select()
        .single()

      if (error) throw error
      return data as BidQuestion
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: bidPackageKeys.questions(data.bid_package_id) })
      toast.success('Question answered')
    },
    onError: (error: Error) => {
      toast.error(`Failed to answer question: ${error.message}`)
    },
  })
}

// =============================================
// Bid Submission Mutations
// =============================================

/**
 * Create bid submission (for subcontractor portal)
 */
export function useCreateBidSubmission() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (dto: CreateBidSubmissionDTO) => {
      const { data, error } = await db
        .from('bid_submissions')
        .insert(dto)
        .select()
        .single()

      if (error) throw error
      return data as BidSubmission
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: bidPackageKeys.submissions(data.bid_package_id) })
      queryClient.invalidateQueries({ queryKey: bidPackageKeys.stats(data.bid_package_id) })
      toast.success('Bid submitted successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to submit bid: ${error.message}`)
    },
  })
}

/**
 * Update bid submission status
 */
export function useUpdateBidSubmissionStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, status, reason }: { id: string; status: BidSubmission['status']; reason?: string }) => {
      const updates: Partial<BidSubmission> = { status }
      if (status === 'disqualified' && reason) {
        updates.disqualification_reason = reason
      }

      const { data, error } = await db
        .from('bid_submissions')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as BidSubmission
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: bidPackageKeys.submissions(data.bid_package_id) })
      toast.success('Submission status updated')
    },
    onError: (error: Error) => {
      toast.error(`Failed to update status: ${error.message}`)
    },
  })
}

// =============================================
// Bid Addendum Mutations
// =============================================

/**
 * Create addendum
 */
export function useCreateAddendum() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async (dto: {
      bid_package_id: string
      title: string
      description?: string
      changes_summary?: string
      affected_documents?: string[]
      extends_bid_date?: boolean
      new_bid_due_date?: string
      document_url?: string
    }) => {
      // Get next addendum number
      const { data: existing } = await db
        .from('bid_addenda')
        .select('addendum_number')
        .eq('bid_package_id', dto.bid_package_id)
        .order('addendum_number', { ascending: false })
        .limit(1)

      const nextNumber = existing?.[0]?.addendum_number ? existing[0].addendum_number + 1 : 1

      const { data, error } = await db
        .from('bid_addenda')
        .insert({
          ...dto,
          addendum_number: nextNumber,
          issued_by: userProfile?.id,
        })
        .select()
        .single()

      if (error) throw error

      // If extends bid date, update the package
      if (dto.extends_bid_date && dto.new_bid_due_date) {
        await db
          .from('bid_packages')
          .update({ bid_due_date: dto.new_bid_due_date })
          .eq('id', dto.bid_package_id)
      }

      return data as BidAddendum
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: bidPackageKeys.addenda(data.bid_package_id) })
      queryClient.invalidateQueries({ queryKey: bidPackageKeys.detail(data.bid_package_id) })
      toast.success(`Addendum #${data.addendum_number} issued`)
    },
    onError: (error: Error) => {
      toast.error(`Failed to create addendum: ${error.message}`)
    },
  })
}

// =============================================
// Bid Package Items Mutations
// =============================================

/**
 * Add item to bid package
 */
export function useAddBidPackageItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (dto: Omit<BidPackageItem, 'id' | 'created_at'>) => {
      const { data, error } = await db
        .from('bid_package_items')
        .insert(dto)
        .select()
        .single()

      if (error) throw error
      return data as BidPackageItem
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: bidPackageKeys.items(data.bid_package_id) })
      toast.success('Item added')
    },
    onError: (error: Error) => {
      toast.error(`Failed to add item: ${error.message}`)
    },
  })
}

/**
 * Update bid package item
 */
export function useUpdateBidPackageItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, packageId, updates }: { id: string; packageId: string; updates: Partial<BidPackageItem> }) => {
      const { data, error } = await db
        .from('bid_package_items')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return { item: data as BidPackageItem, packageId }
    },
    onSuccess: ({ packageId }) => {
      queryClient.invalidateQueries({ queryKey: bidPackageKeys.items(packageId) })
      toast.success('Item updated')
    },
    onError: (error: Error) => {
      toast.error(`Failed to update item: ${error.message}`)
    },
  })
}

/**
 * Delete bid package item
 */
export function useDeleteBidPackageItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, packageId }: { id: string; packageId: string }) => {
      const { error } = await db
        .from('bid_package_items')
        .delete()
        .eq('id', id)

      if (error) throw error
      return { packageId }
    },
    onSuccess: ({ packageId }) => {
      queryClient.invalidateQueries({ queryKey: bidPackageKeys.items(packageId) })
      toast.success('Item deleted')
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete item: ${error.message}`)
    },
  })
}

// =============================================
// Bid Comparison
// =============================================

/**
 * Generate bid comparison
 */
export function useGenerateBidComparison() {
  return useQuery({
    queryKey: ['bidComparison'],
    queryFn: async () => null,
    enabled: false,
  })
}

/**
 * Get bid comparison for a package
 */
export function useBidComparison(packageId: string | undefined) {
  return useQuery({
    queryKey: bidPackageKeys.comparison(packageId || ''),
    queryFn: async () => {
      const { data, error } = await db.rpc('generate_bid_comparison', {
        p_package_id: packageId,
      })

      if (error) throw error
      return data
    },
    enabled: !!packageId,
  })
}
