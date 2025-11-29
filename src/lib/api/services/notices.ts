// File: /src/lib/api/services/notices.ts
// API service layer for Notice/Correspondence operations

import { supabase } from '@/lib/supabase'
import type { Notice, NoticeCreateInput, NoticeUpdateInput, NoticeResponseInput, NoticeFilters } from '@/features/notices/types'

// =============================================
// Notice API Service
// =============================================

export const noticesApi = {
  /**
   * Fetch all notices for a project with optional filtering
   */
  async getProjectNotices(projectId: string, filters?: NoticeFilters): Promise<Notice[]> {
    let query = supabase
      .from('notices')
      .select('*')
      .eq('project_id', projectId)
      .is('deleted_at', null)

    // Apply filters
    if (filters?.status) {
      query = query.eq('status', filters.status)
    }
    if (filters?.notice_type) {
      query = query.eq('notice_type', filters.notice_type)
    }
    if (filters?.direction) {
      query = query.eq('direction', filters.direction)
    }
    if (filters?.is_critical !== undefined) {
      query = query.eq('is_critical', filters.is_critical)
    }
    if (filters?.response_required !== undefined) {
      query = query.eq('response_required', filters.response_required)
    }
    if (filters?.search) {
      query = query.or(
        `subject.ilike.%${filters.search}%,reference_number.ilike.%${filters.search}%,from_party.ilike.%${filters.search}%,to_party.ilike.%${filters.search}%`
      )
    }

    // Order by notice_date descending (most recent first)
    query = query.order('notice_date', { ascending: false })

    const { data, error } = await query

    if (error) throw error
    return data as Notice[]
  },

  /**
   * Fetch a single notice by ID
   */
  async getNotice(noticeId: string): Promise<Notice> {
    const { data, error } = await supabase
      .from('notices')
      .select('*')
      .eq('id', noticeId)
      .is('deleted_at', null)
      .single()

    if (error) throw error
    return data as Notice
  },

  /**
   * Create a new notice
   */
  async createNotice(input: NoticeCreateInput, userId: string): Promise<Notice> {
    const { data, error } = await supabase
      .from('notices')
      .insert({
        project_id: input.project_id,
        notice_type: input.notice_type,
        subject: input.subject.trim(),
        direction: input.direction,
        description: input.description?.trim() || null,
        from_party: input.from_party?.trim() || null,
        to_party: input.to_party?.trim() || null,
        notice_date: input.notice_date,
        received_date: input.received_date || null,
        response_due_date: input.response_due_date || null,
        response_required: input.response_required || false,
        is_critical: input.is_critical || false,
        reference_number: input.reference_number?.trim() || null,
        document_url: input.document_url || null,
        notes: input.notes?.trim() || null,
        status: input.status || 'draft',
        created_by: userId,
      })
      .select()
      .single()

    if (error) throw error
    return data as Notice
  },

  /**
   * Update an existing notice
   */
  async updateNotice(noticeId: string, updates: NoticeUpdateInput): Promise<Notice> {
    // Build update object with trimmed strings
    const cleanedUpdates: Record<string, any> = {}

    if (updates.subject !== undefined) {
      cleanedUpdates.subject = updates.subject.trim()
    }
    if (updates.description !== undefined) {
      cleanedUpdates.description = updates.description?.trim() || null
    }
    if (updates.notice_type !== undefined) {
      cleanedUpdates.notice_type = updates.notice_type
    }
    if (updates.direction !== undefined) {
      cleanedUpdates.direction = updates.direction
    }
    if (updates.from_party !== undefined) {
      cleanedUpdates.from_party = updates.from_party?.trim() || null
    }
    if (updates.to_party !== undefined) {
      cleanedUpdates.to_party = updates.to_party?.trim() || null
    }
    if (updates.notice_date !== undefined) {
      cleanedUpdates.notice_date = updates.notice_date
    }
    if (updates.received_date !== undefined) {
      cleanedUpdates.received_date = updates.received_date || null
    }
    if (updates.response_due_date !== undefined) {
      cleanedUpdates.response_due_date = updates.response_due_date || null
    }
    if (updates.response_required !== undefined) {
      cleanedUpdates.response_required = updates.response_required
    }
    if (updates.is_critical !== undefined) {
      cleanedUpdates.is_critical = updates.is_critical
    }
    if (updates.status !== undefined) {
      cleanedUpdates.status = updates.status
    }
    if (updates.reference_number !== undefined) {
      cleanedUpdates.reference_number = updates.reference_number?.trim() || null
    }
    if (updates.document_url !== undefined) {
      cleanedUpdates.document_url = updates.document_url || null
    }
    if (updates.notes !== undefined) {
      cleanedUpdates.notes = updates.notes?.trim() || null
    }

    const { data, error } = await supabase
      .from('notices')
      .update(cleanedUpdates)
      .eq('id', noticeId)
      .select()
      .single()

    if (error) throw error
    return data as Notice
  },

  /**
   * Soft delete a notice
   */
  async deleteNotice(noticeId: string): Promise<void> {
    const { error } = await supabase
      .from('notices')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', noticeId)

    if (error) throw error
  },

  /**
   * Update notice status
   */
  async updateNoticeStatus(noticeId: string, status: string): Promise<Notice> {
    const { data, error } = await supabase
      .from('notices')
      .update({ status })
      .eq('id', noticeId)
      .select()
      .single()

    if (error) throw error
    return data as Notice
  },

  /**
   * Record a response to a notice
   */
  async recordResponse(noticeId: string, response: NoticeResponseInput): Promise<Notice> {
    const { data, error } = await supabase
      .from('notices')
      .update({
        response_date: response.response_date,
        response_status: response.response_status,
        response_document_url: response.response_document_url || null,
        status: 'responded',
      })
      .eq('id', noticeId)
      .select()
      .single()

    if (error) throw error
    return data as Notice
  },

  /**
   * Get notices with overdue responses
   */
  async getOverdueNotices(projectId?: string): Promise<Notice[]> {
    const today = new Date().toISOString().split('T')[0]

    let query = supabase
      .from('notices')
      .select('*')
      .eq('response_required', true)
      .is('response_date', null)
      .lt('response_due_date', today)
      .is('deleted_at', null)

    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    query = query.order('response_due_date', { ascending: true })

    const { data, error } = await query

    if (error) throw error
    return data as Notice[]
  },

  /**
   * Get notices with responses due within specified days
   */
  async getNoticesDueSoon(projectId: string, days: number = 7): Promise<Notice[]> {
    const today = new Date()
    const futureDate = new Date(today)
    futureDate.setDate(futureDate.getDate() + days)

    const todayStr = today.toISOString().split('T')[0]
    const futureDateStr = futureDate.toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('notices')
      .select('*')
      .eq('project_id', projectId)
      .eq('response_required', true)
      .is('response_date', null)
      .gte('response_due_date', todayStr)
      .lte('response_due_date', futureDateStr)
      .is('deleted_at', null)
      .order('response_due_date', { ascending: true })

    if (error) throw error
    return data as Notice[]
  },

  /**
   * Get critical notices for a project
   */
  async getCriticalNotices(projectId: string): Promise<Notice[]> {
    const { data, error } = await supabase
      .from('notices')
      .select('*')
      .eq('project_id', projectId)
      .eq('is_critical', true)
      .is('deleted_at', null)
      .order('notice_date', { ascending: false })

    if (error) throw error
    return data as Notice[]
  },

  /**
   * Get notice statistics for a project
   */
  async getNoticeStats(projectId: string): Promise<{
    total: number
    critical: number
    awaitingResponse: number
    overdue: number
    sentThisMonth: number
  }> {
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]

    // Get all notices for the project
    const { data: notices, error } = await supabase
      .from('notices')
      .select('*')
      .eq('project_id', projectId)
      .is('deleted_at', null)

    if (error) throw error

    const total = notices.length
    const critical = notices.filter((n) => n.is_critical).length
    const awaitingResponse = notices.filter(
      (n) => n.response_required && !n.response_date
    ).length
    const overdue = notices.filter(
      (n) =>
        n.response_required &&
        !n.response_date &&
        n.response_due_date &&
        n.response_due_date < todayStr
    ).length
    const sentThisMonth = notices.filter(
      (n) => n.direction === 'outgoing' && n.notice_date >= monthStart
    ).length

    return {
      total,
      critical,
      awaitingResponse,
      overdue,
      sentThisMonth,
    }
  },

  /**
   * Upload document to Supabase Storage
   */
  async uploadDocument(
    projectId: string,
    noticeId: string,
    file: File,
    type: 'notice' | 'response'
  ): Promise<string> {
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}.${fileExt}`
    const filePath = `${projectId}/notices/${noticeId}/${type}/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) throw uploadError

    const { data: urlData } = supabase.storage
      .from('documents')
      .getPublicUrl(filePath)

    return urlData.publicUrl
  },

  /**
   * Delete document from Supabase Storage
   */
  async deleteDocument(documentUrl: string): Promise<void> {
    // Extract path from URL
    const urlParts = documentUrl.split('/documents/')
    if (urlParts.length !== 2) {
      throw new Error('Invalid document URL')
    }
    const filePath = urlParts[1]

    const { error } = await supabase.storage
      .from('documents')
      .remove([filePath])

    if (error) throw error
  },
}

export default noticesApi
