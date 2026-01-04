// File: /src/features/shop-drawings/hooks/useShopDrawings.ts
// React Query hooks for Shop Drawings (filtered subset of Submittals)
// Shop drawings are submittals with submittal_type = 'shop_drawing'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth/AuthContext'
import { notificationService, type NotificationRecipient } from '@/lib/notifications/notification-service'
import { logger } from '@/lib/utils/logger'
import type {
  Submittal,
  SubmittalReviewStatus,
  SubmittalApprovalCode,
} from '@/types/database'
import {
  isValidShopDrawingTransition,
  isShopDrawingLocked,
  getShopDrawingNextStatusOptions,
  getRevisionLabel,
  type ShopDrawingPriority,
  type ShopDrawingDiscipline,
  SHOP_DRAWING_PRIORITIES,
  SHOP_DRAWING_DISCIPLINES,
  SUBMITTAL_REVIEW_STATUSES,
} from '@/types/submittal'

// =============================================
// Types
// =============================================

export interface ShopDrawing extends Submittal {
  // Shop drawing specific fields
  priority: ShopDrawingPriority
  long_lead_item: boolean
  drawing_number: string | null
  parent_revision_id: string | null
  // Computed fields
  revision_label?: string
  is_locked?: boolean
  days_until_required?: number | null
  days_in_review?: number | null
  is_overdue?: boolean
}

export interface ShopDrawingWithDetails extends ShopDrawing {
  project?: { id: string; name: string } | null
  subcontractor?: { id: string; name: string; company_name: string } | null
  submitted_by_user?: { id: string; full_name: string; email: string } | null
  reviewer?: { id: string; full_name: string; email: string } | null
}

export interface CreateShopDrawingDTO {
  project_id: string
  title: string
  description?: string
  spec_section: string
  spec_section_title?: string
  discipline?: ShopDrawingDiscipline
  date_required?: string
  priority?: ShopDrawingPriority
  long_lead_item?: boolean
  subcontractor_id?: string
  reviewer_id?: string
  days_for_review?: number
}

export interface UpdateShopDrawingDTO {
  title?: string
  description?: string
  spec_section?: string
  spec_section_title?: string
  discipline?: string
  date_required?: string
  priority?: ShopDrawingPriority
  long_lead_item?: boolean
  subcontractor_id?: string
  reviewer_id?: string
  days_for_review?: number
  ball_in_court?: string
  ball_in_court_entity?: string
}

export interface ShopDrawingFilters {
  status?: SubmittalReviewStatus | SubmittalReviewStatus[]
  discipline?: ShopDrawingDiscipline | ShopDrawingDiscipline[]
  priority?: ShopDrawingPriority | ShopDrawingPriority[]
  longLeadOnly?: boolean
  overdueOnly?: boolean
  subcontractorId?: string
}

// =============================================
// Query Keys
// =============================================

export const shopDrawingKeys = {
  all: ['shop-drawings'] as const,
  lists: () => [...shopDrawingKeys.all, 'list'] as const,
  list: (projectId: string, filters?: ShopDrawingFilters) =>
    [...shopDrawingKeys.lists(), projectId, filters] as const,
  details: () => [...shopDrawingKeys.all, 'detail'] as const,
  detail: (id: string) => [...shopDrawingKeys.details(), id] as const,
  revisions: (id: string) => [...shopDrawingKeys.detail(id), 'revisions'] as const,
  stats: (projectId: string) => [...shopDrawingKeys.all, 'stats', projectId] as const,
}

// =============================================
// Query Hooks
// =============================================

/**
 * Fetch all shop drawings for a project
 */
export function useShopDrawings(projectId: string | undefined, filters?: ShopDrawingFilters) {
  return useQuery({
    queryKey: shopDrawingKeys.list(projectId || '', filters),
    queryFn: async () => {
      if (!projectId) throw new Error('Project ID required')

      let query = supabase
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
        .eq('submittal_type', 'shop_drawing')
        .is('deleted_at', null)

      // Apply filters
      if (filters?.status) {
        const statuses = Array.isArray(filters.status) ? filters.status : [filters.status]
        query = query.in('review_status', statuses)
      }

      if (filters?.discipline) {
        const disciplines = Array.isArray(filters.discipline) ? filters.discipline : [filters.discipline]
        query = query.in('discipline', disciplines)
      }

      if (filters?.priority) {
        const priorities = Array.isArray(filters.priority) ? filters.priority : [filters.priority]
        query = query.in('priority', priorities)
      }

      if (filters?.longLeadOnly) {
        query = query.eq('long_lead_item', true)
      }

      if (filters?.subcontractorId) {
        query = query.eq('subcontractor_id', filters.subcontractorId)
      }

      const { data, error } = await query
        .order('spec_section', { ascending: true })
        .order('drawing_number', { ascending: true })

      if (error) throw error

      // Add computed fields
      const shopDrawings = (data as ShopDrawingWithDetails[]).map((sd) => ({
        ...sd,
        revision_label: getRevisionLabel(sd.revision_number || 0),
        is_locked: isShopDrawingLocked(sd.review_status as SubmittalReviewStatus),
        days_until_required: sd.date_required
          ? Math.ceil((new Date(sd.date_required).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          : null,
        days_in_review: sd.date_submitted && !sd.date_returned
          ? Math.ceil((Date.now() - new Date(sd.date_submitted).getTime()) / (1000 * 60 * 60 * 24))
          : null,
        is_overdue:
          sd.date_required &&
          new Date(sd.date_required) < new Date() &&
          !['approved', 'approved_as_noted', 'rejected'].includes(sd.review_status),
      }))

      // Filter overdue if requested
      if (filters?.overdueOnly) {
        return shopDrawings.filter((sd) => sd.is_overdue)
      }

      return shopDrawings
    },
    enabled: !!projectId,
  })
}

/**
 * Fetch a single shop drawing by ID
 */
export function useShopDrawing(shopDrawingId: string | undefined) {
  return useQuery({
    queryKey: shopDrawingKeys.detail(shopDrawingId || ''),
    queryFn: async () => {
      if (!shopDrawingId) throw new Error('Shop drawing ID required')

      const { data, error } = await supabase
        .from('submittals')
        .select(`
          *,
          project:project_id (id, name),
          subcontractor:subcontractor_id (id, name, company_name),
          submitted_by_user:submitted_by_user (id, full_name, email),
          reviewer:reviewer_id (id, full_name, email)
        `)
        .eq('id', shopDrawingId)
        .eq('submittal_type', 'shop_drawing')
        .single()

      if (error) throw error

      const sd = data as ShopDrawingWithDetails
      return {
        ...sd,
        revision_label: getRevisionLabel(sd.revision_number || 0),
        is_locked: isShopDrawingLocked(sd.review_status as SubmittalReviewStatus),
        days_until_required: sd.date_required
          ? Math.ceil((new Date(sd.date_required).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          : null,
        days_in_review: sd.date_submitted && !sd.date_returned
          ? Math.ceil((Date.now() - new Date(sd.date_submitted).getTime()) / (1000 * 60 * 60 * 24))
          : null,
        is_overdue:
          sd.date_required &&
          new Date(sd.date_required) < new Date() &&
          !['approved', 'approved_as_noted', 'rejected'].includes(sd.review_status),
      }
    },
    enabled: !!shopDrawingId,
  })
}

/**
 * Fetch revision history for a shop drawing
 */
export function useShopDrawingRevisions(shopDrawingId: string | undefined) {
  return useQuery({
    queryKey: shopDrawingKeys.revisions(shopDrawingId || ''),
    queryFn: async () => {
      if (!shopDrawingId) throw new Error('Shop drawing ID required')

      // Get the current shop drawing to find its drawing_number
      const { data: current, error: currentError } = await supabase
        .from('submittals')
        .select('drawing_number, project_id')
        .eq('id', shopDrawingId)
        .single()

      if (currentError) throw currentError
      if (!current?.drawing_number) return []

      // Get all revisions with the same drawing_number
      const { data, error } = await supabase
        .from('submittals')
        .select('*')
        .eq('project_id', current.project_id)
        .eq('drawing_number', current.drawing_number)
        .eq('submittal_type', 'shop_drawing')
        .is('deleted_at', null)
        .order('revision_number', { ascending: false })

      if (error) throw error
      return data as ShopDrawing[]
    },
    enabled: !!shopDrawingId,
  })
}

/**
 * Get shop drawing statistics for a project
 */
export function useShopDrawingStats(projectId: string | undefined) {
  const { data: shopDrawings } = useShopDrawings(projectId)

  return {
    total: shopDrawings?.length || 0,
    byStatus: {
      not_submitted: shopDrawings?.filter((sd) => sd.review_status === 'not_submitted').length || 0,
      submitted: shopDrawings?.filter((sd) => sd.review_status === 'submitted').length || 0,
      under_gc_review: shopDrawings?.filter((sd) => sd.review_status === 'under_gc_review').length || 0,
      submitted_to_architect: shopDrawings?.filter((sd) => sd.review_status === 'submitted_to_architect').length || 0,
      approved: shopDrawings?.filter((sd) => sd.review_status === 'approved').length || 0,
      approved_as_noted: shopDrawings?.filter((sd) => sd.review_status === 'approved_as_noted').length || 0,
      revise_resubmit: shopDrawings?.filter((sd) => sd.review_status === 'revise_resubmit').length || 0,
      rejected: shopDrawings?.filter((sd) => sd.review_status === 'rejected').length || 0,
    },
    byPriority: {
      critical_path: shopDrawings?.filter((sd) => sd.priority === 'critical_path').length || 0,
      standard: shopDrawings?.filter((sd) => sd.priority === 'standard').length || 0,
      non_critical: shopDrawings?.filter((sd) => sd.priority === 'non_critical').length || 0,
    },
    longLeadItems: shopDrawings?.filter((sd) => sd.long_lead_item).length || 0,
    overdue: shopDrawings?.filter((sd) => sd.is_overdue).length || 0,
    pendingReview: shopDrawings?.filter((sd) =>
      ['submitted', 'under_gc_review', 'submitted_to_architect'].includes(sd.review_status)
    ).length || 0,
  }
}

// =============================================
// Mutation Hooks
// =============================================

/**
 * Create a new shop drawing
 */
export function useCreateShopDrawing() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async (data: CreateShopDrawingDTO) => {
      if (!userProfile?.company_id) throw new Error('Company ID required')

      // Generate drawing number
      const { data: countData } = await supabase
        .from('submittals')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', data.project_id)
        .eq('submittal_type', 'shop_drawing')
        .is('deleted_at', null)

      const count = countData || 0
      const disciplinePrefix = SHOP_DRAWING_DISCIPLINES.find(d => d.value === data.discipline)?.prefix || 'SD'
      const drawingNumber = `${disciplinePrefix}-${String(count + 1).padStart(3, '0')}`

      // Generate submittal number
      const submittalNumber = `${data.spec_section}-${count + 1}`

      const { data: created, error } = await supabase
        .from('submittals')
        .insert({
          ...data,
          company_id: userProfile.company_id,
          created_by: userProfile.id,
          submittal_type: 'shop_drawing',
          submittal_number: submittalNumber,
          drawing_number: drawingNumber,
          review_status: 'not_submitted',
          revision_number: 0,
          priority: data.priority || 'standard',
          long_lead_item: data.long_lead_item || false,
          days_for_review: data.days_for_review || 14,
          ball_in_court_entity: 'subcontractor',
        })
        .select()
        .single()

      if (error) throw error
      return created as ShopDrawing
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: shopDrawingKeys.lists() })
      queryClient.invalidateQueries({ queryKey: shopDrawingKeys.list(data.project_id) })
    },
  })
}

/**
 * Update a shop drawing
 */
export function useUpdateShopDrawing() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateShopDrawingDTO & { id: string }) => {
      // Check if shop drawing is locked
      const { data: current } = await supabase
        .from('submittals')
        .select('review_status')
        .eq('id', id)
        .single()

      if (current && isShopDrawingLocked(current.review_status as SubmittalReviewStatus)) {
        throw new Error('Cannot update a locked shop drawing (approved or approved as noted)')
      }

      const { data, error } = await supabase
        .from('submittals')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as ShopDrawing
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: shopDrawingKeys.lists() })
      queryClient.invalidateQueries({ queryKey: shopDrawingKeys.detail(data.id) })
    },
  })
}

/**
 * Delete a shop drawing (soft delete)
 */
export function useDeleteShopDrawing() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (shopDrawingId: string) => {
      const { error } = await supabase
        .from('submittals')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', shopDrawingId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shopDrawingKeys.all })
    },
  })
}

/**
 * Transition shop drawing status with validation
 */
export function useTransitionShopDrawingStatus() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async ({
      id,
      newStatus,
      approvalCode,
      comments,
    }: {
      id: string
      newStatus: SubmittalReviewStatus
      approvalCode?: SubmittalApprovalCode
      comments?: string
    }) => {
      // Get current status
      const { data: current, error: fetchError } = await supabase
        .from('submittals')
        .select('review_status, project_id')
        .eq('id', id)
        .single()

      if (fetchError) throw fetchError

      const currentStatus = current.review_status as SubmittalReviewStatus

      // Validate transition
      if (!isValidShopDrawingTransition(currentStatus, newStatus)) {
        const validOptions = getShopDrawingNextStatusOptions(currentStatus)
        throw new Error(
          `Invalid status transition from ${currentStatus} to ${newStatus}. ` +
          `Valid options: ${validOptions.join(', ') || 'none (terminal state)'}`
        )
      }

      // Build update object
      const updates: Record<string, unknown> = {
        review_status: newStatus,
        review_comments: comments,
      }

      // Set approval code if provided
      if (approvalCode) {
        updates.approval_code = approvalCode
        updates.approval_code_date = new Date().toISOString()
        updates.approval_code_set_by = userProfile?.id
      }

      // Set dates based on status
      if (newStatus === 'submitted') {
        updates.date_submitted = new Date().toISOString()
        updates.submitted_by_user = userProfile?.id
        updates.ball_in_court_entity = 'gc'
      } else if (['approved', 'approved_as_noted', 'rejected'].includes(newStatus)) {
        updates.date_returned = new Date().toISOString()
      } else if (newStatus === 'revise_resubmit') {
        updates.ball_in_court_entity = 'subcontractor'
      } else if (newStatus === 'submitted_to_architect') {
        updates.ball_in_court_entity = 'architect'
      }

      // Update the shop drawing
      const { data, error } = await supabase
        .from('submittals')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          project:project_id (id, name),
          submitted_by_user:submitted_by_user (id, email, full_name)
        `)
        .single()

      if (error) throw error

      // Create review record if it's a review action
      if (['approved', 'approved_as_noted', 'revise_resubmit', 'rejected'].includes(newStatus)) {
        await supabase.from('submittal_reviews').insert({
          submittal_id: id,
          review_status: newStatus,
          approval_code: approvalCode,
          comments,
          reviewed_by: userProfile?.id,
          reviewer_name: userProfile?.full_name || userProfile?.email,
        })
      }

      return { ...data, previousStatus: currentStatus }
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: shopDrawingKeys.all })
      queryClient.invalidateQueries({ queryKey: shopDrawingKeys.detail(data.id) })

      // Send notification for status changes
      if (data.submitted_by_user && data.submitted_by_user.id !== data.approval_code_set_by) {
        try {
          const appUrl = import.meta.env.VITE_APP_URL || 'https://supersitehero.com'
          const statusLabel = SUBMITTAL_REVIEW_STATUSES.find(s => s.value === data.review_status)?.label

          const recipient: NotificationRecipient = {
            userId: data.submitted_by_user.id,
            email: data.submitted_by_user.email,
            name: data.submitted_by_user.full_name || undefined,
          }

          await notificationService.notifySubmittalStatusChange([recipient], {
            submittalNumber: data.drawing_number || data.submittal_number,
            specSection: data.spec_section,
            specSectionTitle: data.spec_section_title || undefined,
            projectName: data.project?.name || 'Unknown Project',
            previousStatus: data.previousStatus,
            newStatus: data.review_status,
            approvalCode: data.approval_code || undefined,
            reviewedBy: 'Reviewer',
            comments: data.review_comments || undefined,
            revisionNumber: data.revision_number || undefined,
            viewUrl: `${appUrl}/projects/${data.project_id}/shop-drawings/${data.id}`,
          })
        } catch (err) {
          logger.warn('[ShopDrawing] Failed to send status change notification:', err)
        }
      }
    },
  })
}

/**
 * Create a new revision of a shop drawing
 */
export function useCreateShopDrawingRevision() {
  const queryClient = useQueryClient()
  const { userProfile } = useAuth()

  return useMutation({
    mutationFn: async ({
      shopDrawingId,
      changeDescription,
    }: {
      shopDrawingId: string
      changeDescription?: string
    }) => {
      if (!userProfile?.id) throw new Error('User not authenticated')

      // Get current shop drawing
      const { data: current, error: fetchError } = await supabase
        .from('submittals')
        .select('*')
        .eq('id', shopDrawingId)
        .single()

      if (fetchError) throw fetchError

      // Update current shop drawing for new revision
      const { data, error } = await supabase
        .from('submittals')
        .update({
          revision_number: (current.revision_number || 0) + 1,
          review_status: 'not_submitted',
          date_submitted: null,
          date_returned: null,
          review_comments: null,
          approval_code: null,
          approval_code_date: null,
          ball_in_court_entity: 'subcontractor',
          parent_revision_id: shopDrawingId,
        })
        .eq('id', shopDrawingId)
        .select()
        .single()

      if (error) throw error

      // Create history entry
      await supabase.from('submittal_history').insert({
        submittal_id: shopDrawingId,
        action: 'revision_created',
        field_changed: 'revision_number',
        old_value: String(current.revision_number || 0),
        new_value: String((current.revision_number || 0) + 1),
        changed_by: userProfile.id,
      })

      // Create revision record if the table exists
      try {
        await supabase.from('submittal_revisions').insert({
          submittal_id: shopDrawingId,
          revision_number: (current.revision_number || 0) + 1,
          status: 'current',
          is_current: true,
          change_description: changeDescription,
          reason_for_resubmission: changeDescription,
          created_by: userProfile.id,
        })
      } catch {
        // submittal_revisions table may not exist, continue anyway
      }

      return data as ShopDrawing
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: shopDrawingKeys.all })
      queryClient.invalidateQueries({ queryKey: shopDrawingKeys.detail(data.id) })
      queryClient.invalidateQueries({ queryKey: shopDrawingKeys.revisions(data.id) })
    },
  })
}

// =============================================
// Exports
// =============================================

export {
  SHOP_DRAWING_PRIORITIES,
  SHOP_DRAWING_DISCIPLINES,
  isValidShopDrawingTransition,
  isShopDrawingLocked,
  getShopDrawingNextStatusOptions,
  getRevisionLabel,
}
