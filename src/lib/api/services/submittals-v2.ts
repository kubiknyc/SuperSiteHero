// @ts-nocheck
/**
 * Submittal API Service (V2 - Dedicated Table)
 *
 * Supabase API service for the dedicated Submittal system
 * Aligned with migration 050_dedicated_submittals.sql
 *
 * This replaces the workflow_items-based Submittal system with a dedicated table
 * that includes industry-standard construction fields like spec-section numbering,
 * review workflows, and ball-in-court tracking.
 */

import { supabase } from '@/lib/supabase'
import type {
  Submittal,
  SubmittalWithDetails,
  SubmittalItem,
  SubmittalAttachment,
  SubmittalReview,
  SubmittalReviewWithUser,
  SubmittalHistory,
  SubmittalFilters,
  SubmittalStatistics,
  SubmittalRegisterSummary,
  CreateSubmittalDTO,
  UpdateSubmittalDTO,
  SubmitSubmittalDTO,
  ReviewSubmittalDTO,
  CreateSubmittalItemDTO,
  UpdateSubmittalItemDTO,
  CreateSubmittalAttachmentDTO,
  SubmittalReviewStatus,
  SubmittalType,
} from '@/types/submittal'

// ============================================================================
// SUBMITTAL API
// ============================================================================

export const submittalsApiV2 = {
  /**
   * Get all submittals with filters
   */
  async getSubmittals(filters: SubmittalFilters): Promise<SubmittalWithDetails[]> {
    let query = supabase
      .from('submittal_register')
      .select(`
        *,
        project:projects(id, name, number),
        submitted_by_company_data:companies!submittals_submitted_by_company_fkey(id, name),
        submitted_by_user_data:users!submittals_submitted_by_user_fkey(id, full_name, email),
        reviewer:users!submittals_reviewer_id_fkey(id, full_name, email),
        ball_in_court_user:users!submittals_ball_in_court_fkey(id, full_name, email),
        subcontractor:subcontractors(id, company_name, contact_name),
        created_by_user:users!submittals_created_by_fkey(id, full_name, email)
      `)
      .eq('project_id', filters.projectId)
      .order('spec_section', { ascending: true })
      .order('submittal_number', { ascending: true })

    // Apply filters
    if (filters.reviewStatus) {
      if (Array.isArray(filters.reviewStatus)) {
        query = query.in('review_status', filters.reviewStatus)
      } else {
        query = query.eq('review_status', filters.reviewStatus)
      }
    }

    if (filters.submittalType) {
      if (Array.isArray(filters.submittalType)) {
        query = query.in('submittal_type', filters.submittalType)
      } else {
        query = query.eq('submittal_type', filters.submittalType)
      }
    }

    if (filters.specSection) {
      query = query.eq('spec_section', filters.specSection)
    }

    if (filters.subcontractorId) {
      query = query.eq('subcontractor_id', filters.subcontractorId)
    }

    if (filters.ballInCourt) {
      query = query.eq('ball_in_court', filters.ballInCourt)
    }

    if (filters.ballInCourtEntity) {
      query = query.eq('ball_in_court_entity', filters.ballInCourtEntity)
    }

    if (filters.discipline) {
      query = query.eq('discipline', filters.discipline)
    }

    if (filters.isOverdue === true) {
      query = query.eq('is_overdue', true)
    }

    if (filters.dateFrom) {
      query = query.gte('created_at', filters.dateFrom)
    }

    if (filters.dateTo) {
      query = query.lte('created_at', filters.dateTo)
    }

    if (filters.search) {
      query = query.or(`title.ilike.%${filters.search}%,submittal_number.ilike.%${filters.search}%,spec_section.ilike.%${filters.search}%`)
    }

    const { data, error } = await query

    if (error) throw error
    return (data || []) as SubmittalWithDetails[]
  },

  /**
   * Get a single submittal with all details
   */
  async getSubmittal(id: string): Promise<SubmittalWithDetails> {
    const { data, error } = await supabase
      .from('submittal_register')
      .select(`
        *,
        project:projects(id, name, number),
        submitted_by_company_data:companies!submittals_submitted_by_company_fkey(id, name),
        submitted_by_user_data:users!submittals_submitted_by_user_fkey(id, full_name, email),
        reviewer:users!submittals_reviewer_id_fkey(id, full_name, email),
        ball_in_court_user:users!submittals_ball_in_court_fkey(id, full_name, email),
        subcontractor:subcontractors(id, company_name, contact_name),
        created_by_user:users!submittals_created_by_fkey(id, full_name, email)
      `)
      .eq('id', id)
      .single()

    if (error) throw error

    // Get items
    const { data: items } = await supabase
      .from('submittal_items')
      .select('*')
      .eq('submittal_id', id)
      .order('item_number', { ascending: true })

    // Get attachments
    const { data: attachments } = await supabase
      .from('submittal_attachments')
      .select('*')
      .eq('submittal_id', id)
      .order('created_at', { ascending: false })

    // Get reviews with user info
    const { data: reviews } = await supabase
      .from('submittal_reviews')
      .select(`
        *,
        reviewed_by_user:users!submittal_reviews_reviewed_by_fkey(id, full_name, email, avatar_url)
      `)
      .eq('submittal_id', id)
      .order('reviewed_at', { ascending: false })

    return {
      ...data,
      items: items || [],
      attachments: attachments || [],
      reviews: reviews || [],
      item_count: items?.length || 0,
      attachment_count: attachments?.length || 0,
      review_count: reviews?.length || 0,
    } as SubmittalWithDetails
  },

  /**
   * Create a new submittal
   */
  async createSubmittal(dto: CreateSubmittalDTO): Promise<Submittal> {
    // Get company_id from project
    const { data: project } = await supabase
      .from('projects')
      .select('company_id')
      .eq('id', dto.project_id)
      .single()

    if (!project) throw new Error('Project not found')

    // Generate submittal number using the database function
    const { data: submittalNumber } = await supabase
      .rpc('generate_submittal_number', {
        p_project_id: dto.project_id,
        p_spec_section: dto.spec_section,
      })

    const { data: user } = await supabase.auth.getUser()

    const submittalData = {
      project_id: dto.project_id,
      company_id: project.company_id,
      submittal_number: submittalNumber || `${dto.spec_section}-1`,
      revision_number: 0,
      title: dto.title,
      description: dto.description || null,
      spec_section: dto.spec_section,
      spec_section_title: dto.spec_section_title || null,
      submittal_type: dto.submittal_type,
      date_required: dto.date_required || null,
      review_status: 'not_submitted',
      ball_in_court: dto.ball_in_court || null,
      ball_in_court_entity: dto.ball_in_court_entity || null,
      submitted_by_company: dto.submitted_by_company || null,
      submitted_by_user: dto.submitted_by_user || null,
      reviewer_id: dto.reviewer_id || null,
      subcontractor_id: dto.subcontractor_id || null,
      days_for_review: dto.days_for_review || 14,
      discipline: dto.discipline || null,
      created_by: user?.user?.id,
    }

    const { data, error } = await supabase
      .from('submittals')
      .insert(submittalData)
      .select()
      .single()

    if (error) throw error

    // Create items if provided
    if (dto.items && dto.items.length > 0) {
      const itemsWithSubmittalId = dto.items.map((item, index) => ({
        submittal_id: data.id,
        item_number: index + 1,
        description: item.description,
        manufacturer: item.manufacturer || null,
        model_number: item.model_number || null,
        quantity: item.quantity || null,
        unit: item.unit || null,
        notes: item.notes || null,
      }))

      await supabase.from('submittal_items').insert(itemsWithSubmittalId)
    }

    return data
  },

  /**
   * Update a submittal
   */
  async updateSubmittal(id: string, dto: UpdateSubmittalDTO): Promise<Submittal> {
    const { data, error } = await supabase
      .from('submittals')
      .update(dto)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  /**
   * Submit a submittal (transition from not_submitted to submitted)
   */
  async submitSubmittal(id: string, dto?: SubmitSubmittalDTO): Promise<Submittal> {
    const { data: user } = await supabase.auth.getUser()

    const updateData: Record<string, unknown> = {
      review_status: 'submitted',
      date_submitted: dto?.date_submitted || new Date().toISOString(),
      submitted_by_user: dto?.submitted_by_user || user?.user?.id,
    }

    if (dto?.ball_in_court) {
      updateData.ball_in_court = dto.ball_in_court
    }
    if (dto?.ball_in_court_entity) {
      updateData.ball_in_court_entity = dto.ball_in_court_entity
    }

    // Calculate review due date
    const { data: submittal } = await supabase
      .from('submittals')
      .select('days_for_review')
      .eq('id', id)
      .single()

    if (submittal) {
      const dueDate = new Date(updateData.date_submitted as string)
      dueDate.setDate(dueDate.getDate() + submittal.days_for_review)
      updateData.review_due_date = dueDate.toISOString().split('T')[0]
    }

    const { data, error } = await supabase
      .from('submittals')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  /**
   * Review a submittal
   */
  async reviewSubmittal(id: string, dto: ReviewSubmittalDTO): Promise<Submittal> {
    const { data: user } = await supabase.auth.getUser()

    // Create review record
    await supabase.from('submittal_reviews').insert({
      submittal_id: id,
      review_status: dto.review_status,
      comments: dto.comments || null,
      reviewed_by: user?.user?.id,
      reviewer_name: dto.reviewer_name || null,
      reviewer_company: dto.reviewer_company || null,
      review_attachments: dto.review_attachments || [],
    })

    // Update submittal status
    const updateData: Record<string, unknown> = {
      review_status: dto.review_status,
      review_comments: dto.comments || null,
    }

    // Set date_returned for final statuses
    if (['approved', 'approved_as_noted', 'rejected'].includes(dto.review_status)) {
      updateData.date_returned = new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('submittals')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  /**
   * Create a revision (resubmit after revise_resubmit)
   */
  async createRevision(id: string): Promise<Submittal> {
    // Get the current submittal
    const { data: current, error: fetchError } = await supabase
      .from('submittals')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError) throw fetchError

    const { data: user } = await supabase.auth.getUser()

    // Create new revision
    const newSubmittal = {
      ...current,
      id: undefined,
      revision_number: current.revision_number + 1,
      review_status: 'not_submitted',
      date_submitted: null,
      date_received: null,
      date_returned: null,
      review_comments: null,
      review_due_date: null,
      created_at: undefined,
      updated_at: undefined,
      created_by: user?.user?.id,
    }

    delete newSubmittal.id
    delete newSubmittal.created_at
    delete newSubmittal.updated_at

    const { data, error } = await supabase
      .from('submittals')
      .insert(newSubmittal)
      .select()
      .single()

    if (error) throw error
    return data
  },

  /**
   * Update ball-in-court assignment
   */
  async updateBallInCourt(
    id: string,
    ballInCourt: string | null,
    ballInCourtEntity: string | null
  ): Promise<Submittal> {
    const { data, error } = await supabase
      .from('submittals')
      .update({
        ball_in_court: ballInCourt,
        ball_in_court_entity: ballInCourtEntity,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  /**
   * Soft delete a submittal
   */
  async deleteSubmittal(id: string): Promise<void> {
    const { error } = await supabase
      .from('submittals')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)

    if (error) throw error
  },

  /**
   * Get submittal statistics for a project
   */
  async getSubmittalStatistics(projectId: string): Promise<SubmittalStatistics> {
    const { data: submittals, error } = await supabase
      .from('submittal_register')
      .select('*')
      .eq('project_id', projectId)

    if (error) throw error

    const stats: SubmittalStatistics = {
      total: submittals?.length || 0,
      by_status: {
        not_submitted: 0,
        submitted: 0,
        under_gc_review: 0,
        submitted_to_architect: 0,
        approved: 0,
        approved_as_noted: 0,
        revise_resubmit: 0,
        rejected: 0,
      },
      by_type: {
        product_data: 0,
        shop_drawing: 0,
        sample: 0,
        mix_design: 0,
        test_report: 0,
        certificate: 0,
        warranty: 0,
        operation_maintenance: 0,
        closeout: 0,
        other: 0,
      },
      by_spec_section: [],
      open: 0,
      overdue: 0,
      approved_this_week: 0,
      average_review_days: 0,
      pending_review: 0,
    }

    if (!submittals) return stats

    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

    let totalReviewDays = 0
    let reviewedCount = 0
    const specSectionCounts: Record<string, number> = {}

    for (const submittal of submittals) {
      // Count by status
      if (submittal.review_status in stats.by_status) {
        stats.by_status[submittal.review_status as SubmittalReviewStatus]++
      }

      // Count by type
      if (submittal.submittal_type in stats.by_type) {
        stats.by_type[submittal.submittal_type as SubmittalType]++
      }

      // Count by spec section
      if (submittal.spec_section) {
        specSectionCounts[submittal.spec_section] = (specSectionCounts[submittal.spec_section] || 0) + 1
      }

      // Count open (not in final state)
      if (!['approved', 'approved_as_noted', 'rejected'].includes(submittal.review_status)) {
        stats.open++
      }

      // Count pending review
      if (['submitted', 'under_gc_review', 'submitted_to_architect'].includes(submittal.review_status)) {
        stats.pending_review++
      }

      // Count overdue
      if (submittal.is_overdue) {
        stats.overdue++
      }

      // Count approved this week
      if (
        submittal.date_returned &&
        ['approved', 'approved_as_noted'].includes(submittal.review_status) &&
        new Date(submittal.date_returned) >= oneWeekAgo
      ) {
        stats.approved_this_week++
      }

      // Calculate average review time
      if (submittal.date_submitted && submittal.date_returned) {
        const submitted = new Date(submittal.date_submitted)
        const returned = new Date(submittal.date_returned)
        const days = Math.ceil((returned.getTime() - submitted.getTime()) / (1000 * 60 * 60 * 24))
        totalReviewDays += days
        reviewedCount++
      }
    }

    if (reviewedCount > 0) {
      stats.average_review_days = Math.round(totalReviewDays / reviewedCount)
    }

    // Convert spec section counts to array
    stats.by_spec_section = Object.entries(specSectionCounts)
      .map(([spec_section, count]) => ({ spec_section, count }))
      .sort((a, b) => a.spec_section.localeCompare(b.spec_section))

    return stats
  },

  /**
   * Get submittal register summary by spec section
   */
  async getSubmittalRegisterSummary(projectId: string): Promise<SubmittalRegisterSummary[]> {
    const { data, error } = await supabase
      .from('submittal_register')
      .select('spec_section, spec_section_title, review_status')
      .eq('project_id', projectId)

    if (error) throw error

    const summaryMap: Record<string, SubmittalRegisterSummary> = {}

    for (const submittal of data || []) {
      const key = submittal.spec_section
      if (!summaryMap[key]) {
        summaryMap[key] = {
          spec_section: submittal.spec_section,
          spec_section_title: submittal.spec_section_title,
          total_submittals: 0,
          approved: 0,
          pending: 0,
          rejected: 0,
        }
      }

      summaryMap[key].total_submittals++

      if (['approved', 'approved_as_noted'].includes(submittal.review_status)) {
        summaryMap[key].approved++
      } else if (submittal.review_status === 'rejected') {
        summaryMap[key].rejected++
      } else {
        summaryMap[key].pending++
      }
    }

    return Object.values(summaryMap).sort((a, b) =>
      a.spec_section.localeCompare(b.spec_section)
    )
  },

  /**
   * Get submittals by ball-in-court user
   */
  async getSubmittalsByBallInCourt(userId: string, projectId?: string): Promise<SubmittalWithDetails[]> {
    let query = supabase
      .from('submittal_register')
      .select(`
        *,
        project:projects(id, name, number)
      `)
      .eq('ball_in_court', userId)
      .not('review_status', 'in', '("approved","approved_as_noted","rejected")')
      .order('date_required', { ascending: true, nullsFirst: false })

    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    const { data, error } = await query

    if (error) throw error
    return (data || []) as SubmittalWithDetails[]
  },

  /**
   * Get overdue submittals for a project
   */
  async getOverdueSubmittals(projectId: string): Promise<SubmittalWithDetails[]> {
    const { data, error } = await supabase
      .from('submittal_register')
      .select(`
        *,
        project:projects(id, name, number),
        subcontractor:subcontractors(id, company_name, contact_name),
        ball_in_court_user:users!submittals_ball_in_court_fkey(id, full_name, email)
      `)
      .eq('project_id', projectId)
      .eq('is_overdue', true)
      .order('date_required', { ascending: true })

    if (error) throw error
    return (data || []) as SubmittalWithDetails[]
  },
}

// ============================================================================
// SUBMITTAL ITEMS API
// ============================================================================

export const submittalItemsApiV2 = {
  /**
   * Get items for a submittal
   */
  async getItems(submittalId: string): Promise<SubmittalItem[]> {
    const { data, error } = await supabase
      .from('submittal_items')
      .select('*')
      .eq('submittal_id', submittalId)
      .order('item_number', { ascending: true })

    if (error) throw error
    return data || []
  },

  /**
   * Add an item to a submittal
   */
  async addItem(submittalId: string, dto: CreateSubmittalItemDTO): Promise<SubmittalItem> {
    // Get next item number
    const { data: existing } = await supabase
      .from('submittal_items')
      .select('item_number')
      .eq('submittal_id', submittalId)
      .order('item_number', { ascending: false })
      .limit(1)
      .single()

    const nextNumber = (existing?.item_number || 0) + 1

    const { data, error } = await supabase
      .from('submittal_items')
      .insert({
        submittal_id: submittalId,
        item_number: nextNumber,
        description: dto.description,
        manufacturer: dto.manufacturer || null,
        model_number: dto.model_number || null,
        quantity: dto.quantity || null,
        unit: dto.unit || null,
        notes: dto.notes || null,
      })
      .select()
      .single()

    if (error) throw error
    return data
  },

  /**
   * Update an item
   */
  async updateItem(id: string, dto: UpdateSubmittalItemDTO): Promise<SubmittalItem> {
    const { data, error } = await supabase
      .from('submittal_items')
      .update(dto)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  /**
   * Delete an item
   */
  async deleteItem(id: string): Promise<void> {
    const { error } = await supabase
      .from('submittal_items')
      .delete()
      .eq('id', id)

    if (error) throw error
  },

  /**
   * Reorder items
   */
  async reorderItems(submittalId: string, itemIds: string[]): Promise<void> {
    // Update each item with new order
    for (let i = 0; i < itemIds.length; i++) {
      const { error } = await supabase
        .from('submittal_items')
        .update({ item_number: i + 1 })
        .eq('id', itemIds[i])

      if (error) throw error
    }
  },
}

// ============================================================================
// SUBMITTAL ATTACHMENTS API
// ============================================================================

export const submittalAttachmentsApiV2 = {
  /**
   * Get attachments for a submittal
   */
  async getAttachments(submittalId: string): Promise<SubmittalAttachment[]> {
    const { data, error } = await supabase
      .from('submittal_attachments')
      .select('*')
      .eq('submittal_id', submittalId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  },

  /**
   * Add an attachment to a submittal
   */
  async addAttachment(dto: CreateSubmittalAttachmentDTO): Promise<SubmittalAttachment> {
    const { data: user } = await supabase.auth.getUser()

    const { data, error } = await supabase
      .from('submittal_attachments')
      .insert({
        submittal_id: dto.submittal_id,
        document_id: dto.document_id || null,
        file_url: dto.file_url || null,
        file_name: dto.file_name || null,
        file_type: dto.file_type || null,
        file_size: dto.file_size || null,
        uploaded_by: user?.user?.id,
      })
      .select()
      .single()

    if (error) throw error
    return data
  },

  /**
   * Delete an attachment
   */
  async deleteAttachment(id: string): Promise<void> {
    const { error } = await supabase
      .from('submittal_attachments')
      .delete()
      .eq('id', id)

    if (error) throw error
  },
}

// ============================================================================
// SUBMITTAL REVIEWS API
// ============================================================================

export const submittalReviewsApiV2 = {
  /**
   * Get reviews for a submittal
   */
  async getReviews(submittalId: string): Promise<SubmittalReviewWithUser[]> {
    const { data, error } = await supabase
      .from('submittal_reviews')
      .select(`
        *,
        reviewed_by_user:users!submittal_reviews_reviewed_by_fkey(id, full_name, email, avatar_url)
      `)
      .eq('submittal_id', submittalId)
      .order('reviewed_at', { ascending: false })

    if (error) throw error
    return (data || []) as SubmittalReviewWithUser[]
  },
}

// ============================================================================
// SUBMITTAL HISTORY API
// ============================================================================

export const submittalHistoryApiV2 = {
  /**
   * Get history for a submittal
   */
  async getHistory(submittalId: string): Promise<(SubmittalHistory & { changed_by_user?: { id: string; full_name: string; email: string } })[]> {
    const { data, error } = await supabase
      .from('submittal_history')
      .select(`
        *,
        changed_by_user:users!submittal_history_changed_by_fkey(id, full_name, email)
      `)
      .eq('submittal_id', submittalId)
      .order('changed_at', { ascending: false })

    if (error) throw error
    return data || []
  },
}

// Combined export
export const submittalApiV2 = {
  submittals: submittalsApiV2,
  items: submittalItemsApiV2,
  attachments: submittalAttachmentsApiV2,
  reviews: submittalReviewsApiV2,
  history: submittalHistoryApiV2,
}
