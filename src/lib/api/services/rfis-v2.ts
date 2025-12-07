// @ts-nocheck
/**
 * RFI API Service (V2 - Dedicated Table)
 *
 * Supabase API service for the dedicated RFI system
 * Aligned with migration 049_dedicated_rfis.sql
 *
 * This replaces the workflow_items-based RFI system with a dedicated table
 * that includes industry-standard construction fields like ball-in-court tracking,
 * response workflows, and impact assessments.
 */

import { supabase } from '@/lib/supabase'
import type {
  RFI,
  RFIWithDetails,
  RFIAttachment,
  RFIComment,
  RFICommentWithUser,
  RFIHistory,
  RFIFilters,
  RFIStatistics,
  CreateRFIDTO,
  UpdateRFIDTO,
  SubmitRFIResponseDTO,
  CreateRFIAttachmentDTO,
  CreateRFICommentDTO,
  UpdateRFICommentDTO,
} from '@/types/rfi'

// ============================================================================
// RFI API
// ============================================================================

export const rfisApiV2 = {
  /**
   * Get all RFIs with filters
   */
  async getRFIs(filters: RFIFilters): Promise<RFIWithDetails[]> {
    let query = supabase
      .from('rfi_summary')
      .select(`
        *,
        project:projects(id, name, number),
        drawing:documents!rfis_drawing_id_fkey(id, name, drawing_number),
        submitted_by_user:users!rfis_submitted_by_fkey(id, full_name, email),
        assigned_to_user:users!rfis_assigned_to_fkey(id, full_name, email),
        responded_by_user:users!rfis_responded_by_fkey(id, full_name, email),
        ball_in_court_user:users!rfis_ball_in_court_fkey(id, full_name, email),
        created_by_user:users!rfis_created_by_fkey(id, full_name, email)
      `)
      .eq('project_id', filters.projectId)
      .order('rfi_number', { ascending: false })

    // Apply filters
    if (filters.status) {
      if (Array.isArray(filters.status)) {
        query = query.in('status', filters.status)
      } else {
        query = query.eq('status', filters.status)
      }
    }

    if (filters.priority) {
      if (Array.isArray(filters.priority)) {
        query = query.in('priority', filters.priority)
      } else {
        query = query.eq('priority', filters.priority)
      }
    }

    if (filters.assignedTo) {
      query = query.eq('assigned_to', filters.assignedTo)
    }

    if (filters.ballInCourt) {
      query = query.eq('ball_in_court', filters.ballInCourt)
    }

    if (filters.discipline) {
      query = query.eq('discipline', filters.discipline)
    }

    if (filters.isOverdue === true) {
      query = query.eq('is_overdue', true)
    }

    if (filters.dateFrom) {
      query = query.gte('date_created', filters.dateFrom)
    }

    if (filters.dateTo) {
      query = query.lte('date_created', filters.dateTo)
    }

    if (filters.search) {
      query = query.or(`subject.ilike.%${filters.search}%,question.ilike.%${filters.search}%`)
    }

    const { data, error } = await query

    if (error) throw error
    return (data || []) as RFIWithDetails[]
  },

  /**
   * Get a single RFI with all details
   */
  async getRFI(id: string): Promise<RFIWithDetails> {
    const { data, error } = await supabase
      .from('rfi_summary')
      .select(`
        *,
        project:projects(id, name, number),
        drawing:documents!rfis_drawing_id_fkey(id, name, drawing_number),
        submitted_by_user:users!rfis_submitted_by_fkey(id, full_name, email),
        assigned_to_user:users!rfis_assigned_to_fkey(id, full_name, email),
        responded_by_user:users!rfis_responded_by_fkey(id, full_name, email),
        ball_in_court_user:users!rfis_ball_in_court_fkey(id, full_name, email),
        created_by_user:users!rfis_created_by_fkey(id, full_name, email)
      `)
      .eq('id', id)
      .single()

    if (error) throw error

    // Get attachments
    const { data: attachments } = await supabase
      .from('rfi_attachments')
      .select('*')
      .eq('rfi_id', id)
      .order('created_at', { ascending: false })

    // Get comments with user info
    const { data: comments } = await supabase
      .from('rfi_comments')
      .select(`
        *,
        created_by_user:users!rfi_comments_created_by_fkey(id, full_name, email, avatar_url)
      `)
      .eq('rfi_id', id)
      .is('deleted_at', null)
      .order('created_at', { ascending: true })

    return {
      ...data,
      attachments: attachments || [],
      comments: comments || [],
      attachment_count: attachments?.length || 0,
      comment_count: comments?.length || 0,
    } as RFIWithDetails
  },

  /**
   * Create a new RFI
   */
  async createRFI(dto: CreateRFIDTO): Promise<RFI> {
    // Get company_id from project
    const { data: project } = await supabase
      .from('projects')
      .select('company_id')
      .eq('id', dto.project_id)
      .single()

    if (!project) throw new Error('Project not found')

    // Get next RFI number using the database function
    const { data: nextNumber } = await supabase
      .rpc('get_next_rfi_number', { p_project_id: dto.project_id })

    const { data: user } = await supabase.auth.getUser()

    const rfiData = {
      project_id: dto.project_id,
      company_id: project.company_id,
      rfi_number: nextNumber || 1,
      subject: dto.subject,
      question: dto.question,
      spec_section: dto.spec_section || null,
      drawing_id: dto.drawing_id || null,
      drawing_reference: dto.drawing_reference || null,
      location: dto.location || null,
      date_required: dto.date_required || null,
      status: dto.auto_submit ? 'submitted' : 'draft',
      priority: dto.priority || 'normal',
      assigned_to: dto.assigned_to || null,
      submitted_by: dto.auto_submit ? user?.user?.id : null,
      ball_in_court: dto.ball_in_court || null,
      ball_in_court_role: dto.ball_in_court_role || null,
      discipline: dto.discipline || null,
      distribution_list: dto.distribution_list || [],
      date_submitted: dto.auto_submit ? new Date().toISOString() : null,
      created_by: user?.user?.id,
    }

    const { data, error } = await supabase
      .from('rfis')
      .insert(rfiData)
      .select()
      .single()

    if (error) throw error
    return data
  },

  /**
   * Update an RFI
   */
  async updateRFI(id: string, dto: UpdateRFIDTO): Promise<RFI> {
    const updateData: Record<string, unknown> = { ...dto }

    // Set date_responded if response is being added
    if (dto.response && dto.status === 'responded') {
      updateData.date_responded = new Date().toISOString()
      const { data: user } = await supabase.auth.getUser()
      if (!dto.responded_by) {
        updateData.responded_by = user?.user?.id
      }
    }

    // Set date_closed if closing
    if (dto.status === 'closed') {
      updateData.date_closed = new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('rfis')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  /**
   * Submit an RFI (transition from draft to submitted)
   */
  async submitRFI(id: string): Promise<RFI> {
    const { data: user } = await supabase.auth.getUser()

    const { data, error } = await supabase
      .from('rfis')
      .update({
        status: 'submitted',
        date_submitted: new Date().toISOString(),
        submitted_by: user?.user?.id,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  /**
   * Submit a response to an RFI
   */
  async submitResponse(id: string, dto: SubmitRFIResponseDTO): Promise<RFI> {
    const { data: user } = await supabase.auth.getUser()

    const { data, error } = await supabase
      .from('rfis')
      .update({
        response: dto.response,
        cost_impact: dto.cost_impact,
        schedule_impact_days: dto.schedule_impact_days,
        status: 'responded',
        date_responded: new Date().toISOString(),
        responded_by: user?.user?.id,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    // Add any attachments
    if (dto.attachments && dto.attachments.length > 0) {
      for (const attachment of dto.attachments) {
        await rfiAttachmentsApiV2.addAttachment({
          ...attachment,
          rfi_id: id,
          attachment_type: 'response',
        })
      }
    }

    return data
  },

  /**
   * Approve an RFI
   */
  async approveRFI(id: string): Promise<RFI> {
    const { data, error } = await supabase
      .from('rfis')
      .update({
        status: 'approved',
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  /**
   * Reject an RFI
   */
  async rejectRFI(id: string): Promise<RFI> {
    const { data, error } = await supabase
      .from('rfis')
      .update({
        status: 'rejected',
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  /**
   * Close an RFI
   */
  async closeRFI(id: string): Promise<RFI> {
    const { data, error } = await supabase
      .from('rfis')
      .update({
        status: 'closed',
        date_closed: new Date().toISOString(),
      })
      .eq('id', id)
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
    ballInCourtRole: string | null
  ): Promise<RFI> {
    const { data, error } = await supabase
      .from('rfis')
      .update({
        ball_in_court: ballInCourt,
        ball_in_court_role: ballInCourtRole,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  /**
   * Soft delete an RFI
   */
  async deleteRFI(id: string): Promise<void> {
    const { error } = await supabase
      .from('rfis')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)

    if (error) throw error
  },

  /**
   * Get RFI statistics for a project
   */
  async getRFIStatistics(projectId: string): Promise<RFIStatistics> {
    const { data: rfis, error } = await supabase
      .from('rfi_summary')
      .select('*')
      .eq('project_id', projectId)

    if (error) throw error

    const stats: RFIStatistics = {
      total: rfis?.length || 0,
      by_status: {
        draft: 0,
        submitted: 0,
        under_review: 0,
        responded: 0,
        approved: 0,
        rejected: 0,
        closed: 0,
      },
      by_priority: {
        low: 0,
        normal: 0,
        high: 0,
        critical: 0,
      },
      open: 0,
      overdue: 0,
      responded_this_week: 0,
      average_response_days: 0,
      oldest_open_days: 0,
    }

    if (!rfis) return stats

    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

    let totalResponseDays = 0
    let respondedCount = 0

    for (const rfi of rfis) {
      // Count by status
      if (rfi.status in stats.by_status) {
        stats.by_status[rfi.status as keyof typeof stats.by_status]++
      }

      // Count by priority
      if (rfi.priority in stats.by_priority) {
        stats.by_priority[rfi.priority as keyof typeof stats.by_priority]++
      }

      // Count open
      if (!['closed', 'approved', 'rejected'].includes(rfi.status)) {
        stats.open++

        // Track oldest open
        if (rfi.days_open && rfi.days_open > stats.oldest_open_days) {
          stats.oldest_open_days = rfi.days_open
        }
      }

      // Count overdue
      if (rfi.is_overdue) {
        stats.overdue++
      }

      // Count responded this week
      if (rfi.date_responded && new Date(rfi.date_responded) >= oneWeekAgo) {
        stats.responded_this_week++
      }

      // Calculate average response time
      if (rfi.date_responded && rfi.date_submitted) {
        const submitted = new Date(rfi.date_submitted)
        const responded = new Date(rfi.date_responded)
        const days = Math.ceil((responded.getTime() - submitted.getTime()) / (1000 * 60 * 60 * 24))
        totalResponseDays += days
        respondedCount++
      }
    }

    if (respondedCount > 0) {
      stats.average_response_days = Math.round(totalResponseDays / respondedCount)
    }

    return stats
  },

  /**
   * Get RFIs by ball-in-court user
   */
  async getRFIsByBallInCourt(userId: string, projectId?: string): Promise<RFIWithDetails[]> {
    let query = supabase
      .from('rfi_summary')
      .select(`
        *,
        project:projects(id, name, number)
      `)
      .eq('ball_in_court', userId)
      .not('status', 'in', '("closed","approved","rejected")')
      .order('date_required', { ascending: true, nullsFirst: false })

    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    const { data, error } = await query

    if (error) throw error
    return (data || []) as RFIWithDetails[]
  },

  /**
   * Get overdue RFIs for a project
   */
  async getOverdueRFIs(projectId: string): Promise<RFIWithDetails[]> {
    const { data, error } = await supabase
      .from('rfi_summary')
      .select(`
        *,
        project:projects(id, name, number),
        assigned_to_user:users!rfis_assigned_to_fkey(id, full_name, email),
        ball_in_court_user:users!rfis_ball_in_court_fkey(id, full_name, email)
      `)
      .eq('project_id', projectId)
      .eq('is_overdue', true)
      .order('date_required', { ascending: true })

    if (error) throw error
    return (data || []) as RFIWithDetails[]
  },
}

// ============================================================================
// RFI ATTACHMENTS API
// ============================================================================

export const rfiAttachmentsApiV2 = {
  /**
   * Get attachments for an RFI
   */
  async getAttachments(rfiId: string): Promise<RFIAttachment[]> {
    const { data, error } = await supabase
      .from('rfi_attachments')
      .select('*')
      .eq('rfi_id', rfiId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  },

  /**
   * Add an attachment to an RFI
   */
  async addAttachment(dto: CreateRFIAttachmentDTO): Promise<RFIAttachment> {
    const { data: user } = await supabase.auth.getUser()

    const { data, error } = await supabase
      .from('rfi_attachments')
      .insert({
        rfi_id: dto.rfi_id,
        document_id: dto.document_id || null,
        file_url: dto.file_url || null,
        file_name: dto.file_name || null,
        file_type: dto.file_type || null,
        file_size: dto.file_size || null,
        attachment_type: dto.attachment_type || 'general',
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
      .from('rfi_attachments')
      .delete()
      .eq('id', id)

    if (error) throw error
  },
}

// ============================================================================
// RFI COMMENTS API
// ============================================================================

export const rfiCommentsApiV2 = {
  /**
   * Get comments for an RFI
   */
  async getComments(rfiId: string): Promise<RFICommentWithUser[]> {
    const { data, error } = await supabase
      .from('rfi_comments')
      .select(`
        *,
        created_by_user:users!rfi_comments_created_by_fkey(id, full_name, email, avatar_url)
      `)
      .eq('rfi_id', rfiId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true })

    if (error) throw error
    return (data || []) as RFICommentWithUser[]
  },

  /**
   * Add a comment to an RFI
   */
  async addComment(dto: CreateRFICommentDTO): Promise<RFIComment> {
    const { data: user } = await supabase.auth.getUser()

    const { data, error } = await supabase
      .from('rfi_comments')
      .insert({
        rfi_id: dto.rfi_id,
        comment: dto.comment,
        comment_type: dto.comment_type || 'comment',
        mentioned_users: dto.mentioned_users || [],
        created_by: user?.user?.id,
      })
      .select()
      .single()

    if (error) throw error
    return data
  },

  /**
   * Update a comment
   */
  async updateComment(id: string, dto: UpdateRFICommentDTO): Promise<RFIComment> {
    const { data, error } = await supabase
      .from('rfi_comments')
      .update({
        comment: dto.comment,
        comment_type: dto.comment_type,
        mentioned_users: dto.mentioned_users,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  /**
   * Soft delete a comment
   */
  async deleteComment(id: string): Promise<void> {
    const { error } = await supabase
      .from('rfi_comments')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)

    if (error) throw error
  },
}

// ============================================================================
// RFI HISTORY API
// ============================================================================

export const rfiHistoryApiV2 = {
  /**
   * Get history for an RFI
   */
  async getHistory(rfiId: string): Promise<(RFIHistory & { changed_by_user?: { id: string; full_name: string; email: string } })[]> {
    const { data, error } = await supabase
      .from('rfi_history')
      .select(`
        *,
        changed_by_user:users!rfi_history_changed_by_fkey(id, full_name, email)
      `)
      .eq('rfi_id', rfiId)
      .order('changed_at', { ascending: false })

    if (error) throw error
    return data || []
  },
}

// Combined export
export const rfiApiV2 = {
  rfis: rfisApiV2,
  attachments: rfiAttachmentsApiV2,
  comments: rfiCommentsApiV2,
  history: rfiHistoryApiV2,
}
