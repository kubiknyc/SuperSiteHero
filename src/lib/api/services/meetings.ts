// @ts-nocheck
/**
 * Meetings API Service
 *
 * Enhanced Supabase API service for meetings with notes, action items,
 * attendees, and attachments
 */

import { supabase } from '@/lib/supabase'
import type {
  Meeting,
  MeetingNote,
  MeetingActionItem,
  MeetingAttendee,
  MeetingAttachment,
  MeetingWithDetails,
  CreateMeetingDTO,
  UpdateMeetingDTO,
  CreateMeetingNoteDTO,
  UpdateMeetingNoteDTO,
  CreateMeetingActionItemDTO,
  UpdateMeetingActionItemDTO,
  CreateMeetingAttendeeDTO,
  UpdateMeetingAttendeeDTO,
  CreateMeetingAttachmentDTO,
  MeetingFilters,
  ActionItemFilters,
} from '@/types/meetings'

// ============================================================================
// MEETINGS API
// ============================================================================

export const meetingsApi = {
  /**
   * Get meetings with filters
   */
  async getMeetings(filters: MeetingFilters = {}): Promise<Meeting[]> {
    let query = supabase
      .from('meetings')
      .select(`
        *,
        project:projects(id, name, project_number),
        created_by_user:users!meetings_created_by_fkey(id, full_name, email)
      `)
      .is('deleted_at', null)
      .order('meeting_date', { ascending: false })

    if (filters.project_id) {
      query = query.eq('project_id', filters.project_id)
    }

    if (filters.meeting_type) {
      query = query.eq('meeting_type', filters.meeting_type)
    }

    if (filters.status) {
      query = query.eq('status', filters.status)
    }

    if (filters.date_from) {
      query = query.gte('meeting_date', filters.date_from)
    }

    if (filters.date_to) {
      query = query.lte('meeting_date', filters.date_to)
    }

    if (filters.search) {
      query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
    }

    const { data, error } = await query

    if (error) {throw error}
    return (data || []) as Meeting[]
  },

  /**
   * Get a single meeting by ID
   */
  async getMeetingById(id: string): Promise<Meeting> {
    const { data, error } = await supabase
      .from('meetings')
      .select(`
        *,
        project:projects(id, name, project_number),
        created_by_user:users!meetings_created_by_fkey(id, full_name, email),
        previous_meeting:meetings!meetings_previous_meeting_id_fkey(id, title, meeting_date, meeting_type)
      `)
      .eq('id', id)
      .single()

    if (error) {throw error}
    return data as Meeting
  },

  /**
   * Get the next meeting that references this meeting as its previous meeting
   */
  async getNextMeeting(id: string): Promise<Meeting | null> {
    const { data, error } = await supabase
      .from('meetings')
      .select(`
        id, title, meeting_date, meeting_type,
        project:projects(id, name)
      `)
      .eq('previous_meeting_id', id)
      .is('deleted_at', null)
      .single()

    if (error && error.code !== 'PGRST116') {throw error} // PGRST116 = no rows
    return data as Meeting | null
  },

  /**
   * Get available previous meetings for linking (same project, completed/finished, before a date)
   */
  async getAvailablePreviousMeetings(
    projectId: string,
    meetingType?: string,
    beforeDate?: string
  ): Promise<Meeting[]> {
    let query = supabase
      .from('meetings')
      .select(`
        id, title, meeting_date, meeting_type, status
      `)
      .eq('project_id', projectId)
      .is('deleted_at', null)
      .in('status', ['completed', 'minutes_distributed', 'cancelled'])
      .order('meeting_date', { ascending: false })
      .limit(20)

    if (meetingType) {
      query = query.eq('meeting_type', meetingType)
    }

    if (beforeDate) {
      query = query.lt('meeting_date', beforeDate)
    }

    const { data, error } = await query

    if (error) {throw error}
    return (data || []) as Meeting[]
  },

  /**
   * Get a meeting with all details (notes, action items, attendees, attachments)
   */
  async getMeetingWithDetails(id: string): Promise<MeetingWithDetails> {
    const meeting = await this.getMeetingById(id)

    const [notesResult, actionItemsResult, attendeesResult, attachmentsResult] = await Promise.all([
      meetingNotesApi.getNotes(id),
      meetingActionItemsApi.getActionItems(id),
      meetingAttendeesApi.getAttendees(id),
      meetingAttachmentsApi.getAttachments(id),
    ])

    return {
      ...meeting,
      notes: notesResult,
      actionItems: actionItemsResult,
      attendeesList: attendeesResult,
      attachments: attachmentsResult,
    } as MeetingWithDetails
  },

  /**
   * Create a new meeting
   */
  async createMeeting(dto: CreateMeetingDTO): Promise<Meeting> {
    const { data: user } = await supabase.auth.getUser()

    const meetingData = {
      project_id: dto.project_id,
      title: dto.title,
      description: dto.description || null,
      meeting_type: dto.meeting_type,
      status: dto.status || 'scheduled',
      location: dto.location || null,
      location_type: dto.location_type || null,
      virtual_meeting_link: dto.virtual_meeting_link || null,
      meeting_date: dto.meeting_date,
      start_time: dto.start_time || null,
      end_time: dto.end_time || null,
      duration_minutes: dto.duration_minutes || null,
      template_id: dto.template_id || null,
      is_recurring: dto.is_recurring || false,
      recurrence_rule: dto.recurrence_rule || null,
      created_by: user?.user?.id,
    }

    const { data, error } = await supabase
      .from('meetings')
      .insert(meetingData)
      .select(`
        *,
        project:projects(id, name, project_number),
        created_by_user:users!meetings_created_by_fkey(id, full_name, email)
      `)
      .single()

    if (error) {throw error}
    return data as Meeting
  },

  /**
   * Update a meeting
   */
  async updateMeeting(id: string, dto: UpdateMeetingDTO): Promise<Meeting> {
    const { data, error } = await supabase
      .from('meetings')
      .update({
        ...dto,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select(`
        *,
        project:projects(id, name, project_number),
        created_by_user:users!meetings_created_by_fkey(id, full_name, email)
      `)
      .single()

    if (error) {throw error}
    return data as Meeting
  },

  /**
   * Publish meeting minutes
   */
  async publishMinutes(id: string): Promise<Meeting> {
    const { data: user } = await supabase.auth.getUser()

    return this.updateMeeting(id, {
      minutes_published: true,
    })
  },

  /**
   * Distribute meeting minutes to all attendees
   */
  async distributeMinutes(id: string): Promise<{
    success: boolean
    recipientCount: number
    distributedAt: string
  }> {
    const { data: user } = await supabase.auth.getUser()
    if (!user?.user?.id) {
      throw new Error('Not authenticated')
    }

    // Get meeting with all details
    const meeting = await this.getMeetingWithDetails(id)

    // Get attendees with email addresses
    const attendees = meeting.attendeesList?.filter(a => a.email) || []
    if (attendees.length === 0) {
      throw new Error('No attendees with email addresses to distribute to')
    }

    // Get project details for the email
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, name, project_number')
      .eq('id', meeting.project_id)
      .single()

    if (projectError) {throw projectError}

    // Get the distributing user's name
    const { data: distributingUser, error: userError } = await supabase
      .from('users')
      .select('full_name, email')
      .eq('id', user.user.id)
      .single()

    if (userError) {throw userError}

    // Prepare distribution data for each attendee
    const distributionPromises = attendees.map(async (attendee) => {
      // Get action items assigned to this attendee
      const assigneeActionItems = meeting.actionItems?.filter(
        ai => ai.assignee_id === attendee.user_id ||
              ai.assignee_name?.toLowerCase() === attendee.name?.toLowerCase()
      ) || []

      // Call the send-email edge function
      const { error } = await supabase.functions.invoke('send-email', {
        body: {
          to: attendee.email,
          template: 'meeting-minutes',
          data: {
            recipientName: attendee.name || attendee.email?.split('@')[0],
            meetingTitle: meeting.title,
            meetingType: meeting.meeting_type,
            meetingDate: meeting.meeting_date,
            meetingTime: meeting.start_time,
            projectName: project.name,
            location: meeting.location,
            attendees: meeting.attendeesList?.map(a => ({
              name: a.name,
              company: a.company,
              role: a.role,
              attended: a.attended || a.attendance_status === 'attended',
            })) || [],
            absentees: meeting.attendeesList?.filter(a =>
              a.attendance_status === 'absent' || a.attended === false
            ).map(a => ({
              name: a.name,
              company: a.company,
            })) || [],
            minutesText: meeting.minutes_text || '',
            actionItems: meeting.actionItems?.map(ai => ({
              description: ai.description,
              assignee: ai.assignee?.full_name || ai.assignee_name || 'Unassigned',
              dueDate: ai.due_date,
              priority: ai.priority || 'normal',
              status: ai.status,
            })) || [],
            notes: meeting.notes?.map(n => ({
              sectionTitle: n.section_title,
              content: n.content,
            })) || [],
            distributedBy: distributingUser.full_name || distributingUser.email,
            viewUrl: `${import.meta.env.VITE_APP_URL || ''}/meetings/${id}`,
          },
        },
      })

      if (error) {
        console.error(`Failed to send minutes to ${attendee.email}:`, error)
        return false
      }

      // Create in-app notification
      await supabase.from('notifications').insert({
        user_id: attendee.user_id,
        type: 'meeting_minutes_distributed',
        title: 'Meeting Minutes Distributed',
        message: `Minutes from "${meeting.title}" have been distributed`,
        data: {
          meeting_id: id,
          project_id: meeting.project_id,
          action_item_count: assigneeActionItems.length,
        },
        read: false,
      })

      return true
    })

    await Promise.all(distributionPromises)

    // Update meeting with distribution timestamp and status
    const distributedAt = new Date().toISOString()
    await this.updateMeeting(id, {
      minutes_distributed_at: distributedAt,
      status: 'minutes_distributed',
    })

    return {
      success: true,
      recipientCount: attendees.length,
      distributedAt,
    }
  },

  /**
   * Soft delete a meeting
   */
  async deleteMeeting(id: string): Promise<void> {
    const { error } = await supabase
      .from('meetings')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {throw error}
  },

  /**
   * Get upcoming meetings
   */
  async getUpcomingMeetings(projectId?: string, limit: number = 5): Promise<Meeting[]> {
    const today = new Date().toISOString().split('T')[0]

    let query = supabase
      .from('meetings')
      .select(`
        *,
        project:projects(id, name, project_number)
      `)
      .is('deleted_at', null)
      .gte('meeting_date', today)
      .in('status', ['scheduled', 'in_progress'])
      .order('meeting_date', { ascending: true })
      .limit(limit)

    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    const { data, error } = await query

    if (error) {throw error}
    return (data || []) as Meeting[]
  },
}

// ============================================================================
// MEETING NOTES API
// ============================================================================

export const meetingNotesApi = {
  /**
   * Get notes for a meeting
   */
  async getNotes(meetingId: string): Promise<MeetingNote[]> {
    const { data, error } = await supabase
      .from('meeting_notes')
      .select(`
        *,
        created_by_user:users!meeting_notes_created_by_fkey(id, full_name, email)
      `)
      .eq('meeting_id', meetingId)
      .order('note_order', { ascending: true })

    if (error) {throw error}
    return (data || []) as MeetingNote[]
  },

  /**
   * Create a note
   */
  async createNote(dto: CreateMeetingNoteDTO): Promise<MeetingNote> {
    const { data: user } = await supabase.auth.getUser()

    const noteData = {
      meeting_id: dto.meeting_id,
      section_title: dto.section_title || null,
      content: dto.content,
      note_order: dto.note_order || 0,
      note_type: dto.note_type || 'general',
      created_by: user?.user?.id,
    }

    const { data, error } = await supabase
      .from('meeting_notes')
      .insert(noteData)
      .select()
      .single()

    if (error) {throw error}
    return data as MeetingNote
  },

  /**
   * Update a note
   */
  async updateNote(id: string, dto: UpdateMeetingNoteDTO): Promise<MeetingNote> {
    const { data, error } = await supabase
      .from('meeting_notes')
      .update({
        ...dto,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {throw error}
    return data as MeetingNote
  },

  /**
   * Delete a note
   */
  async deleteNote(id: string): Promise<void> {
    const { error } = await supabase
      .from('meeting_notes')
      .delete()
      .eq('id', id)

    if (error) {throw error}
  },

  /**
   * Reorder notes
   */
  async reorderNotes(meetingId: string, noteIds: string[]): Promise<void> {
    const updates = noteIds.map((id, index) => ({
      id,
      note_order: index,
    }))

    for (const update of updates) {
      await supabase
        .from('meeting_notes')
        .update({ note_order: update.note_order })
        .eq('id', update.id)
    }
  },
}

// ============================================================================
// MEETING ACTION ITEMS API
// ============================================================================

export const meetingActionItemsApi = {
  /**
   * Get action items for a meeting
   */
  async getActionItems(meetingId: string): Promise<MeetingActionItem[]> {
    const { data, error } = await supabase
      .from('meeting_action_items')
      .select(`
        *,
        assignee:users!meeting_action_items_assignee_id_fkey(id, full_name, email),
        task:tasks!meeting_action_items_task_id_fkey(id, title, status)
      `)
      .eq('meeting_id', meetingId)
      .order('item_order', { ascending: true })

    if (error) {throw error}
    return (data || []) as MeetingActionItem[]
  },

  /**
   * Get action items with filters (across meetings)
   */
  async getActionItemsFiltered(filters: ActionItemFilters): Promise<MeetingActionItem[]> {
    let query = supabase
      .from('meeting_action_items')
      .select(`
        *,
        assignee:users!meeting_action_items_assignee_id_fkey(id, full_name, email),
        meeting:meetings!meeting_action_items_meeting_id_fkey(id, title, meeting_date, project_id)
      `)
      .order('due_date', { ascending: true, nullsFirst: false })

    if (filters.meeting_id) {
      query = query.eq('meeting_id', filters.meeting_id)
    }

    if (filters.assignee_id) {
      query = query.eq('assignee_id', filters.assignee_id)
    }

    if (filters.status) {
      query = query.eq('status', filters.status)
    }

    if (filters.priority) {
      query = query.eq('priority', filters.priority)
    }

    if (filters.due_before) {
      query = query.lte('due_date', filters.due_before)
    }

    if (filters.overdue) {
      const today = new Date().toISOString().split('T')[0]
      query = query
        .lt('due_date', today)
        .not('status', 'in', '("completed","cancelled")')
    }

    const { data, error } = await query

    if (error) {throw error}
    return (data || []) as MeetingActionItem[]
  },

  /**
   * Create an action item
   */
  async createActionItem(dto: CreateMeetingActionItemDTO): Promise<MeetingActionItem> {
    const { data: user } = await supabase.auth.getUser()

    const itemData = {
      meeting_id: dto.meeting_id,
      description: dto.description,
      status: dto.status || 'pending',
      priority: dto.priority || 'medium',
      assignee_id: dto.assignee_id || null,
      assignee_name: dto.assignee_name || null,
      assignee_company: dto.assignee_company || null,
      due_date: dto.due_date || null,
      item_order: dto.item_order || 0,
      notes: dto.notes || null,
      created_by: user?.user?.id,
    }

    const { data, error } = await supabase
      .from('meeting_action_items')
      .insert(itemData)
      .select()
      .single()

    if (error) {throw error}
    return data as MeetingActionItem
  },

  /**
   * Update an action item
   */
  async updateActionItem(id: string, dto: UpdateMeetingActionItemDTO): Promise<MeetingActionItem> {
    const { data, error } = await supabase
      .from('meeting_action_items')
      .update({
        ...dto,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {throw error}
    return data as MeetingActionItem
  },

  /**
   * Complete an action item
   */
  async completeActionItem(id: string): Promise<MeetingActionItem> {
    return this.updateActionItem(id, {
      status: 'completed',
      completed_date: new Date().toISOString().split('T')[0],
    })
  },

  /**
   * Delete an action item
   */
  async deleteActionItem(id: string): Promise<void> {
    const { error } = await supabase
      .from('meeting_action_items')
      .delete()
      .eq('id', id)

    if (error) {throw error}
  },

  /**
   * Convert action item to task
   */
  async convertToTask(id: string, projectId: string): Promise<MeetingActionItem> {
    const { data: user } = await supabase.auth.getUser()

    // Get the action item
    const { data: actionItem, error: fetchError } = await supabase
      .from('meeting_action_items')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError) {throw fetchError}

    // Create the task
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .insert({
        project_id: projectId,
        title: actionItem.description,
        description: actionItem.notes,
        status: actionItem.status === 'completed' ? 'completed' : 'pending',
        priority: actionItem.priority,
        assigned_to: actionItem.assignee_id,
        due_date: actionItem.due_date,
        created_by: user?.user?.id,
      })
      .select()
      .single()

    if (taskError) {throw taskError}

    // Link the task to the action item
    return this.updateActionItem(id, { task_id: task.id })
  },
}

// ============================================================================
// MEETING ATTENDEES API
// ============================================================================

export const meetingAttendeesApi = {
  /**
   * Get attendees for a meeting
   */
  async getAttendees(meetingId: string): Promise<MeetingAttendee[]> {
    const { data, error } = await supabase
      .from('meeting_attendees')
      .select(`
        *,
        user:users!meeting_attendees_user_id_fkey(id, full_name, email)
      `)
      .eq('meeting_id', meetingId)
      .order('is_required', { ascending: false })
      .order('name', { ascending: true })

    if (error) {throw error}
    return (data || []) as MeetingAttendee[]
  },

  /**
   * Add an attendee
   */
  async addAttendee(dto: CreateMeetingAttendeeDTO): Promise<MeetingAttendee> {
    const attendeeData = {
      meeting_id: dto.meeting_id,
      user_id: dto.user_id || null,
      name: dto.name,
      email: dto.email || null,
      company: dto.company || null,
      role: dto.role || null,
      attendance_status: dto.attendance_status || 'invited',
      is_required: dto.is_required || false,
      notes: dto.notes || null,
    }

    const { data, error } = await supabase
      .from('meeting_attendees')
      .insert(attendeeData)
      .select()
      .single()

    if (error) {throw error}
    return data as MeetingAttendee
  },

  /**
   * Update an attendee
   */
  async updateAttendee(id: string, dto: UpdateMeetingAttendeeDTO): Promise<MeetingAttendee> {
    const { data, error } = await supabase
      .from('meeting_attendees')
      .update({
        ...dto,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {throw error}
    return data as MeetingAttendee
  },

  /**
   * Mark attendance
   */
  async markAttendance(
    id: string,
    attended: boolean,
    arrivalTime?: string,
    departureTime?: string
  ): Promise<MeetingAttendee> {
    return this.updateAttendee(id, {
      attended,
      attendance_status: attended ? 'attended' : 'absent',
      arrival_time: arrivalTime,
      departure_time: departureTime,
    })
  },

  /**
   * Remove an attendee
   */
  async removeAttendee(id: string): Promise<void> {
    const { error } = await supabase
      .from('meeting_attendees')
      .delete()
      .eq('id', id)

    if (error) {throw error}
  },

  /**
   * Bulk add attendees from project users
   */
  async addProjectUsersAsAttendees(meetingId: string, projectId: string): Promise<MeetingAttendee[]> {
    const { data: projectUsers, error: fetchError } = await supabase
      .from('project_users')
      .select(`
        user_id,
        role,
        users:user_id(id, full_name, email, company_id)
      `)
      .eq('project_id', projectId)

    if (fetchError) {throw fetchError}
    if (!projectUsers || projectUsers.length === 0) {return []}

    const attendeesToAdd = projectUsers.map(pu => ({
      meeting_id: meetingId,
      user_id: pu.user_id,
      name: (pu.users as any)?.full_name || 'Unknown',
      email: (pu.users as any)?.email || null,
      role: pu.role || null,
      attendance_status: 'invited',
      is_required: false,
    }))

    const { data, error } = await supabase
      .from('meeting_attendees')
      .insert(attendeesToAdd)
      .select()

    if (error) {throw error}
    return (data || []) as MeetingAttendee[]
  },
}

// ============================================================================
// MEETING ATTACHMENTS API
// ============================================================================

export const meetingAttachmentsApi = {
  /**
   * Get attachments for a meeting
   */
  async getAttachments(meetingId: string): Promise<MeetingAttachment[]> {
    const { data, error } = await supabase
      .from('meeting_attachments')
      .select(`
        *,
        uploaded_by_user:users!meeting_attachments_uploaded_by_fkey(id, full_name, email)
      `)
      .eq('meeting_id', meetingId)
      .order('created_at', { ascending: false })

    if (error) {throw error}
    return (data || []) as MeetingAttachment[]
  },

  /**
   * Add an attachment
   */
  async addAttachment(dto: CreateMeetingAttachmentDTO): Promise<MeetingAttachment> {
    const { data: user } = await supabase.auth.getUser()

    const attachmentData = {
      meeting_id: dto.meeting_id,
      file_name: dto.file_name,
      file_url: dto.file_url,
      file_size: dto.file_size || null,
      file_type: dto.file_type || null,
      attachment_type: dto.attachment_type || 'document',
      description: dto.description || null,
      uploaded_by: user?.user?.id,
    }

    const { data, error } = await supabase
      .from('meeting_attachments')
      .insert(attachmentData)
      .select()
      .single()

    if (error) {throw error}
    return data as MeetingAttachment
  },

  /**
   * Delete an attachment
   */
  async deleteAttachment(id: string): Promise<void> {
    const { error } = await supabase
      .from('meeting_attachments')
      .delete()
      .eq('id', id)

    if (error) {throw error}
  },

  /**
   * Upload file and create attachment
   */
  async uploadAndAttach(
    meetingId: string,
    file: File,
    attachmentType: string = 'document',
    description?: string
  ): Promise<MeetingAttachment> {
    const { data: user } = await supabase.auth.getUser()
    if (!user?.user?.id) {throw new Error('Not authenticated')}

    // Upload to storage
    const fileName = `${Date.now()}-${file.name}`
    const filePath = `meetings/${meetingId}/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, file)

    if (uploadError) {throw uploadError}

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('documents')
      .getPublicUrl(filePath)

    // Create attachment record
    return this.addAttachment({
      meeting_id: meetingId,
      file_name: file.name,
      file_url: urlData.publicUrl,
      file_size: file.size,
      file_type: file.type,
      attachment_type: attachmentType,
      description,
    })
  },
}

// Combined export
export const meetingsApiService = {
  meetings: meetingsApi,
  notes: meetingNotesApi,
  actionItems: meetingActionItemsApi,
  attendees: meetingAttendeesApi,
  attachments: meetingAttachmentsApi,
}

export default meetingsApiService
