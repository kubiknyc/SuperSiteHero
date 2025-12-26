// File: /src/features/submittals/hooks/useDedicatedSubmittals.ts
// React Query hooks for the dedicated Submittals table (Construction Industry Standard)
// This replaces the workflow_items-based approach with a proper submittals structure

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth/AuthContext'
import type {
  Submittal,
  SubmittalInsert,
  SubmittalUpdate,
  SubmittalItem,
  SubmittalAttachment,
  SubmittalReview,
  SubmittalHistory,
  SubmittalReviewStatus,
  SubmittalType,
  BallInCourtEntity,
} from '@/types/database'

// =============================================
// Constants and Types
// =============================================

// Submittal Types (Construction Industry Standard)
export const SUBMITTAL_TYPES: Array<{ value: SubmittalType; label: string; description: string }> = [
  { value: 'product_data', label: 'Product Data', description: 'Manufacturer product specifications and data sheets' },
  { value: 'shop_drawing', label: 'Shop Drawing', description: 'Detailed fabrication or installation drawings' },
  { value: 'sample', label: 'Sample', description: 'Physical samples of materials or finishes' },
  { value: 'mix_design', label: 'Mix Design', description: 'Concrete, asphalt, or other mixture designs' },
  { value: 'mock_up', label: 'Mock-up', description: 'Full-scale construction sample for approval' },
  { value: 'test_report', label: 'Test Report', description: 'Laboratory or field test results' },
  { value: 'certificate', label: 'Certificate', description: 'Compliance or qualification certificates' },
  { value: 'warranty', label: 'Warranty', description: 'Manufacturer or installer warranties' },
  { value: 'operation_manual', label: 'Operation Manual', description: 'Equipment operation instructions' },
  { value: 'maintenance_manual', label: 'Maintenance Manual', description: 'Maintenance procedures and schedules' },
  { value: 'as_built', label: 'As-Built', description: 'As-built drawings showing installed conditions' },
  { value: 'closeout', label: 'Closeout', description: 'Project closeout documentation' },
  { value: 'other', label: 'Other', description: 'Other submittal types' },
]

// Review Status Options (Construction Industry Standard)
export const REVIEW_STATUSES: Array<{ value: SubmittalReviewStatus; label: string; color: string; description: string }> = [
  { value: 'not_submitted', label: 'Not Submitted', color: 'gray', description: 'Submittal not yet submitted' },
  { value: 'submitted', label: 'Submitted', color: 'blue', description: 'Awaiting review' },
  { value: 'under_review', label: 'Under Review', color: 'yellow', description: 'Currently being reviewed' },
  { value: 'approved', label: 'Approved', color: 'green', description: 'Approved for use' },
  { value: 'approved_as_noted', label: 'Approved as Noted', color: 'lime', description: 'Approved with minor notes' },
  { value: 'revise_resubmit', label: 'Revise and Resubmit', color: 'orange', description: 'Corrections required' },
  { value: 'rejected', label: 'Rejected', color: 'red', description: 'Not approved - major issues' },
  { value: 'void', label: 'Void', color: 'gray', description: 'Submittal voided/cancelled' },
]

// Ball-in-Court Entity Options
export const BALL_IN_COURT_ENTITIES: Array<{ value: BallInCourtEntity; label: string }> = [
  { value: 'subcontractor', label: 'Subcontractor' },
  { value: 'gc', label: 'General Contractor' },
  { value: 'architect', label: 'Architect' },
  { value: 'owner', label: 'Owner' },
  { value: 'engineer', label: 'Engineer' },
]

// Extended Submittal type with relations
// Note: We explicitly extend Submittal but also define key properties to ensure proper type inference
// when TypeScript has trouble resolving the extended Database types
export interface SubmittalWithDetails extends Submittal {
  // Key properties from the base Submittal type (for type safety when TS can't resolve)
  spec_section: string
  spec_section_title: string | null
  review_status: string
  date_required: string | null
  // Relation fields
  items?: SubmittalItem[]
  attachments?: SubmittalAttachment[]
  reviews?: SubmittalReview[]
  history?: SubmittalHistory[]
  project?: { id: string; name: string } | null
  subcontractor?: { id: string; name: string; company_name: string } | null
}

// =============================================
// Query Hooks
// =============================================

/**
 * Fetch all submittals for a project
 */
export function useProjectSubmittals(projectId: string | undefined) {
  return useQuery({
    queryKey: ['dedicated-submittals', 'project', projectId],
    queryFn: async () => {
      if (!projectId) {throw new Error('Project ID required')}

      const { data, error } = await supabase
        .from('submittals')
        .select(`
          *,
          subcontractor:subcontractor_id (
            id,
            name,
            company_name
          )
        `)
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .order('spec_section', { ascending: true })
        .order('submittal_number', { ascending: true })

      if (error) {throw error}
      return data as SubmittalWithDetails[]
    },
    enabled: !!projectId,
  })
}

/**
 * Fetch all submittals across all projects for the company
 */
export function useAllSubmittals() {
  const { userProfile } = useAuth()

  return useQuery({
    queryKey: ['dedicated-submittals', 'all', userProfile?.company_id],
    queryFn: async () => {
      if (!userProfile?.company_id) {throw new Error('Company ID required')}

      const { data, error } = await supabase
        .from('submittals')
        .select(`
          *,
          project:project_id (
            id,
            name
          ),
          subcontractor:subcontractor_id (
            id,
            name,
            company_name
          )
        `)
        .eq('company_id', userProfile.company_id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (error) {throw error}
      return data as SubmittalWithDetails[]
    },
    enabled: !!userProfile?.company_id,
  })
}

/**
 * Fetch a single submittal by ID with all details
 */
export function useSubmittal(submittalId: string | undefined) {
  return useQuery({
    queryKey: ['dedicated-submittals', 'detail', submittalId],
    queryFn: async () => {
      if (!submittalId) {throw new Error('Submittal ID required')}

      const { data, error } = await supabase
        .from('submittals')
        .select(`
          *,
          project:project_id (
            id,
            name
          ),
          subcontractor:subcontractor_id (
            id,
            name,
            company_name
          )
        `)
        .eq('id', submittalId)
        .single()

      if (error) {throw error}
      return data as SubmittalWithDetails
    },
    enabled: !!submittalId,
  })
}

/**
 * Fetch submittals filtered by ball-in-court entity
 */
export function useSubmittalsByBallInCourt(
  projectId: string | undefined,
  entity: BallInCourtEntity | undefined
) {
  return useQuery({
    queryKey: ['dedicated-submittals', 'ball-in-court', projectId, entity],
    queryFn: async () => {
      if (!projectId) {throw new Error('Project ID required')}

      let query = supabase
        .from('submittals')
        .select('*')
        .eq('project_id', projectId)
        .is('deleted_at', null)

      if (entity) {
        query = query.eq('ball_in_court_entity', entity)
      }

      const { data, error } = await query.order('date_required', { ascending: true })

      if (error) {throw error}
      return data as Submittal[]
    },
    enabled: !!projectId,
  })
}

/**
 * Fetch submittals filtered by review status
 */
export function useSubmittalsByStatus(
  projectId: string | undefined,
  status: SubmittalReviewStatus | undefined
) {
  return useQuery({
    queryKey: ['dedicated-submittals', 'status', projectId, status],
    queryFn: async () => {
      if (!projectId) {throw new Error('Project ID required')}

      let query = supabase
        .from('submittals')
        .select('*')
        .eq('project_id', projectId)
        .is('deleted_at', null)

      if (status) {
        query = query.eq('review_status', status)
      }

      const { data, error } = await query.order('date_required', { ascending: true })

      if (error) {throw error}
      return data as Submittal[]
    },
    enabled: !!projectId,
  })
}

/**
 * Fetch submittals grouped by spec section
 */
export function useSubmittalsBySpecSection(projectId: string | undefined) {
  const { data: submittals, ...rest } = useProjectSubmittals(projectId)

  const groupedSubmittals = submittals?.reduce((acc, submittal) => {
    const section = submittal.spec_section
    if (!acc[section]) {
      acc[section] = {
        specSection: section,
        specSectionTitle: submittal.spec_section_title || '',
        submittals: [],
      }
    }
    acc[section].submittals.push(submittal)
    return acc
  }, {} as Record<string, { specSection: string; specSectionTitle: string; submittals: SubmittalWithDetails[] }>)

  return {
    ...rest,
    data: groupedSubmittals ? Object.values(groupedSubmittals) : undefined,
  }
}

/**
 * Fetch submittal items for a submittal
 */
export function useSubmittalItems(submittalId: string | undefined) {
  return useQuery({
    queryKey: ['dedicated-submittals', submittalId, 'items'],
    queryFn: async () => {
      if (!submittalId) {throw new Error('Submittal ID required')}

      const { data, error } = await supabase
        .from('submittal_items')
        .select('*')
        .eq('submittal_id', submittalId)
        .order('item_number', { ascending: true })

      if (error) {throw error}
      return data as SubmittalItem[]
    },
    enabled: !!submittalId,
  })
}

/**
 * Fetch submittal attachments
 */
export function useSubmittalAttachments(submittalId: string | undefined) {
  return useQuery({
    queryKey: ['dedicated-submittals', submittalId, 'attachments'],
    queryFn: async () => {
      if (!submittalId) {throw new Error('Submittal ID required')}

      const { data, error } = await supabase
        .from('submittal_attachments')
        .select('*')
        .eq('submittal_id', submittalId)
        .order('created_at', { ascending: false })

      if (error) {throw error}
      return data as SubmittalAttachment[]
    },
    enabled: !!submittalId,
  })
}

/**
 * Fetch submittal review history
 */
export function useSubmittalReviews(submittalId: string | undefined) {
  return useQuery({
    queryKey: ['dedicated-submittals', submittalId, 'reviews'],
    queryFn: async () => {
      if (!submittalId) {throw new Error('Submittal ID required')}

      const { data, error } = await supabase
        .from('submittal_reviews')
        .select('*')
        .eq('submittal_id', submittalId)
        .order('reviewed_at', { ascending: false })

      if (error) {throw error}
      return data as SubmittalReview[]
    },
    enabled: !!submittalId,
  })
}

/**
 * Fetch submittal change history
 */
export function useSubmittalHistory(submittalId: string | undefined) {
  return useQuery({
    queryKey: ['dedicated-submittals', submittalId, 'history'],
    queryFn: async () => {
      if (!submittalId) {throw new Error('Submittal ID required')}

      const { data, error } = await supabase
        .from('submittal_history')
        .select('*')
        .eq('submittal_id', submittalId)
        .order('changed_at', { ascending: false })

      if (error) {throw error}
      return data as SubmittalHistory[]
    },
    enabled: !!submittalId,
  })
}

// =============================================
// Mutation Hooks
// =============================================

/**
 * Create a new submittal
 */
export function useCreateSubmittal() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async (submittal: Omit<SubmittalInsert, 'company_id' | 'created_by'>) => {
      if (!userProfile?.company_id) {throw new Error('Company ID required')}

      const { data, error } = await supabase
        .from('submittals')
        .insert({
          ...submittal,
          company_id: userProfile.company_id,
          created_by: userProfile.id,
        })
        .select()
        .single()

      if (error) {throw error}
      return data as Submittal
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['dedicated-submittals'] })
      queryClient.invalidateQueries({ queryKey: ['dedicated-submittals', 'project', data.project_id] })
    },
  })
}

/**
 * Update an existing submittal
 */
export function useUpdateSubmittal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: SubmittalUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('submittals')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) {throw error}
      return data as Submittal
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['dedicated-submittals'] })
      queryClient.invalidateQueries({ queryKey: ['dedicated-submittals', 'detail', data.id] })
      queryClient.invalidateQueries({ queryKey: ['dedicated-submittals', 'project', data.project_id] })
    },
  })
}

/**
 * Soft delete a submittal
 */
export function useDeleteSubmittal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (submittalId: string) => {
      const { error } = await supabase
        .from('submittals')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', submittalId)

      if (error) {throw error}
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dedicated-submittals'] })
    },
  })
}

/**
 * Add a review to a submittal
 */
export function useAddSubmittalReview() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async ({
      submittalId,
      reviewStatus,
      comments,
    }: {
      submittalId: string
      reviewStatus: SubmittalReviewStatus
      comments?: string
    }) => {
      // Insert review record
      const { error: reviewError } = await supabase
        .from('submittal_reviews')
        .insert({
          submittal_id: submittalId,
          review_status: reviewStatus,
          comments,
          reviewed_by: userProfile?.id,
          reviewer_name: userProfile?.full_name || userProfile?.email,
        })

      if (reviewError) {throw reviewError}

      // Update submittal status
      const updates: SubmittalUpdate = {
        review_status: reviewStatus,
        review_comments: comments,
      }

      // Set return date if approved or rejected
      if (['approved', 'approved_as_noted', 'rejected'].includes(reviewStatus)) {
        updates.date_returned = new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('submittals')
        .update(updates)
        .eq('id', submittalId)
        .select()
        .single()

      if (error) {throw error}
      return data as Submittal
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['dedicated-submittals'] })
      queryClient.invalidateQueries({ queryKey: ['dedicated-submittals', 'detail', data.id] })
      queryClient.invalidateQueries({ queryKey: ['dedicated-submittals', data.id, 'reviews'] })
    },
  })
}

/**
 * Submit a submittal for review
 */
export function useSubmitForReview() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async (submittalId: string) => {
      const { data, error } = await supabase
        .from('submittals')
        .update({
          review_status: 'submitted',
          date_submitted: new Date().toISOString(),
          submitted_by_user: userProfile?.id,
          ball_in_court_entity: 'architect', // Default to architect for review
        })
        .eq('id', submittalId)
        .select()
        .single()

      if (error) {throw error}
      return data as Submittal
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['dedicated-submittals'] })
      queryClient.invalidateQueries({ queryKey: ['dedicated-submittals', 'detail', data.id] })
    },
  })
}

/**
 * Generate submittal number based on spec section
 */
export async function generateSubmittalNumber(
  projectId: string,
  specSection: string
): Promise<string> {
  // Count existing submittals for this spec section in this project
  const { count, error } = await supabase
    .from('submittals')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', projectId)
    .eq('spec_section', specSection)
    .is('deleted_at', null)

  if (error) {throw error}

  const nextNumber = (count || 0) + 1
  return `${specSection}-${nextNumber}`
}

// =============================================
// Statistics Hooks
// =============================================

/**
 * Get submittal statistics for a project
 */
export function useSubmittalStats(projectId: string | undefined) {
  const { data: submittals } = useProjectSubmittals(projectId)

  return {
    total: submittals?.length || 0,
    notSubmitted: submittals?.filter((s) => s.review_status === 'not_submitted').length || 0,
    submitted: submittals?.filter((s) => s.review_status === 'submitted').length || 0,
    underReview: submittals?.filter((s) => s.review_status === 'under_review').length || 0,
    approved: submittals?.filter((s) => s.review_status === 'approved').length || 0,
    approvedAsNoted: submittals?.filter((s) => s.review_status === 'approved_as_noted').length || 0,
    reviseResubmit: submittals?.filter((s) => s.review_status === 'revise_resubmit').length || 0,
    rejected: submittals?.filter((s) => s.review_status === 'rejected').length || 0,
    overdue: submittals?.filter((s) => {
      if (!s.date_required) {return false}
      const required = new Date(s.date_required)
      return required < new Date() && !['approved', 'approved_as_noted'].includes(s.review_status)
    }).length || 0,
  }
}

// =============================================
// Enhanced Attachment Hooks
// =============================================

/**
 * Upload an attachment to a submittal
 */
export function useUploadSubmittalAttachment() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async ({
      submittalId,
      file,
      attachmentType = 'submittal',
    }: {
      submittalId: string
      file: File
      attachmentType?: 'submittal' | 'response' | 'markup' | 'supporting'
    }) => {
      if (!userProfile?.id) {throw new Error('User not authenticated')}

      // Upload file to Supabase storage
      const fileExt = file.name.split('.').pop()
      const fileName = `${crypto.randomUUID()}.${fileExt}`
      const filePath = `submittal-attachments/${submittalId}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file)

      if (uploadError) {throw uploadError}

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath)

      // Create attachment record
      const { data, error } = await supabase
        .from('submittal_attachments')
        .insert({
          submittal_id: submittalId,
          file_url: urlData.publicUrl,
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
          attachment_type: attachmentType,
          uploaded_by: userProfile.id,
        })
        .select()
        .single()

      if (error) {throw error}
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['dedicated-submittals', variables.submittalId, 'attachments'] })
      queryClient.invalidateQueries({ queryKey: ['dedicated-submittals', 'detail', variables.submittalId] })
    },
  })
}

/**
 * Delete a submittal attachment
 */
export function useDeleteSubmittalAttachment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ attachmentId, submittalId }: { attachmentId: string; submittalId: string }) => {
      // Get attachment to find file path
      const { data: attachment, error: fetchError } = await supabase
        .from('submittal_attachments')
        .select('file_url')
        .eq('id', attachmentId)
        .single()

      if (fetchError) {throw fetchError}

      // Extract file path from URL and delete from storage
      if (attachment?.file_url) {
        const url = new URL(attachment.file_url)
        const pathMatch = url.pathname.match(/\/documents\/(.+)$/)
        if (pathMatch) {
          await supabase.storage.from('documents').remove([pathMatch[1]])
        }
      }

      // Delete attachment record
      const { error } = await supabase
        .from('submittal_attachments')
        .delete()
        .eq('id', attachmentId)

      if (error) {throw error}
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['dedicated-submittals', variables.submittalId, 'attachments'] })
      queryClient.invalidateQueries({ queryKey: ['dedicated-submittals', 'detail', variables.submittalId] })
    },
  })
}

// =============================================
// Revision Hooks
// =============================================

/**
 * Create a revision (resubmission) of a submittal
 * This increments the revision number and resets the status
 */
export function useCreateSubmittalRevision() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async ({
      submittalId,
      copyAttachments = true,
    }: {
      submittalId: string
      copyAttachments?: boolean
    }) => {
      if (!userProfile?.id) {throw new Error('User not authenticated')}

      // Get the current submittal
      const { data: currentSubmittal, error: fetchError } = await supabase
        .from('submittals')
        .select('*')
        .eq('id', submittalId)
        .single()

      if (fetchError) {throw fetchError}

      // Update the submittal with incremented revision and reset status
      const { data, error } = await supabase
        .from('submittals')
        .update({
          revision_number: (currentSubmittal.revision_number || 0) + 1,
          review_status: 'not_submitted',
          date_submitted: null,
          date_returned: null,
          review_comments: null,
          ball_in_court_entity: 'subcontractor',
        })
        .eq('id', submittalId)
        .select()
        .single()

      if (error) {throw error}

      // Create a history entry for the revision
      await supabase
        .from('submittal_history')
        .insert({
          submittal_id: submittalId,
          action: 'revision_created',
          field_changed: 'revision_number',
          old_value: String(currentSubmittal.revision_number || 0),
          new_value: String((currentSubmittal.revision_number || 0) + 1),
          changed_by: userProfile.id,
        })

      return data as Submittal
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['dedicated-submittals'] })
      queryClient.invalidateQueries({ queryKey: ['dedicated-submittals', 'detail', data.id] })
      queryClient.invalidateQueries({ queryKey: ['dedicated-submittals', data.id, 'history'] })
    },
  })
}

/**
 * Add a review with approval code (A/B/C/D)
 */
export function useSubmitReviewWithCode() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async ({
      submittalId,
      approvalCode,
      comments,
    }: {
      submittalId: string
      approvalCode: 'A' | 'B' | 'C' | 'D'
      comments?: string
    }) => {
      if (!userProfile?.id) {throw new Error('User not authenticated')}

      // Map approval codes to review statuses
      const codeToStatus: Record<string, SubmittalReviewStatus> = {
        'A': 'approved',
        'B': 'approved_as_noted',
        'C': 'revise_resubmit',
        'D': 'rejected',
      }

      const reviewStatus = codeToStatus[approvalCode]

      // Insert review record with approval code
      const { error: reviewError } = await supabase
        .from('submittal_reviews')
        .insert({
          submittal_id: submittalId,
          review_status: reviewStatus,
          approval_code: approvalCode,
          comments,
          reviewed_by: userProfile.id,
          reviewer_name: userProfile.full_name || userProfile.email,
        })

      if (reviewError) {throw reviewError}

      // Update submittal status
      const updates: SubmittalUpdate = {
        review_status: reviewStatus,
        review_comments: comments,
        approval_code: approvalCode,
      }

      // Set return date if approved or rejected
      if (['A', 'B', 'D'].includes(approvalCode)) {
        updates.date_returned = new Date().toISOString()
      }

      // Update ball-in-court based on approval code
      if (approvalCode === 'C') {
        updates.ball_in_court_entity = 'subcontractor' // Back to subcontractor for revision
      }

      const { data, error } = await supabase
        .from('submittals')
        .update(updates)
        .eq('id', submittalId)
        .select()
        .single()

      if (error) {throw error}
      return data as Submittal
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['dedicated-submittals'] })
      queryClient.invalidateQueries({ queryKey: ['dedicated-submittals', 'detail', data.id] })
      queryClient.invalidateQueries({ queryKey: ['dedicated-submittals', data.id, 'reviews'] })
    },
  })
}

// =============================================
// Submittal Items Hooks
// =============================================

/**
 * Add an item to a submittal
 */
export function useAddSubmittalItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      submittalId,
      description,
      manufacturer,
      model_number,
      quantity,
      unit,
    }: {
      submittalId: string
      description: string
      manufacturer?: string
      model_number?: string
      quantity?: number
      unit?: string
    }) => {
      // Get the next item number
      const { count } = await supabase
        .from('submittal_items')
        .select('*', { count: 'exact', head: true })
        .eq('submittal_id', submittalId)

      const nextItemNumber = (count || 0) + 1

      const { data, error } = await supabase
        .from('submittal_items')
        .insert({
          submittal_id: submittalId,
          item_number: nextItemNumber,
          description,
          manufacturer,
          model_number,
          quantity,
          unit,
        })
        .select()
        .single()

      if (error) {throw error}
      return data as SubmittalItem
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['dedicated-submittals', variables.submittalId, 'items'] })
    },
  })
}

/**
 * Update a submittal item
 */
export function useUpdateSubmittalItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      itemId,
      submittalId,
      ...updates
    }: {
      itemId: string
      submittalId: string
      description?: string
      manufacturer?: string
      model_number?: string
      quantity?: number
      unit?: string
    }) => {
      const { data, error } = await supabase
        .from('submittal_items')
        .update(updates)
        .eq('id', itemId)
        .select()
        .single()

      if (error) {throw error}
      return data as SubmittalItem
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['dedicated-submittals', variables.submittalId, 'items'] })
    },
  })
}

/**
 * Delete a submittal item
 */
export function useDeleteSubmittalItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ itemId, submittalId }: { itemId: string; submittalId: string }) => {
      const { error } = await supabase
        .from('submittal_items')
        .delete()
        .eq('id', itemId)

      if (error) {throw error}
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['dedicated-submittals', variables.submittalId, 'items'] })
    },
  })
}

export default {
  useProjectSubmittals,
  useAllSubmittals,
  useSubmittal,
  useSubmittalsByBallInCourt,
  useSubmittalsByStatus,
  useSubmittalsBySpecSection,
  useSubmittalItems,
  useSubmittalAttachments,
  useSubmittalReviews,
  useSubmittalHistory,
  useCreateSubmittal,
  useUpdateSubmittal,
  useDeleteSubmittal,
  useAddSubmittalReview,
  useSubmitForReview,
  useSubmittalStats,
  generateSubmittalNumber,
  // New hooks
  useUploadSubmittalAttachment,
  useDeleteSubmittalAttachment,
  useCreateSubmittalRevision,
  useSubmitReviewWithCode,
  useAddSubmittalItem,
  useUpdateSubmittalItem,
  useDeleteSubmittalItem,
  // Constants
  SUBMITTAL_TYPES,
  REVIEW_STATUSES,
  BALL_IN_COURT_ENTITIES,
}
