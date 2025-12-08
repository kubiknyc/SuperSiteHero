/**
 * Meeting Minutes Types
 * Types for the meeting minutes module
 * Aligned with migration 081_meeting_minutes.sql
 */

// =============================================
// Enums and Constants
// =============================================

/**
 * Meeting type options
 */
export type MeetingType =
  | 'oac'               // Owner/Architect/Contractor
  | 'subcontractor'     // Subcontractor coordination
  | 'safety'            // Safety meeting
  | 'progress'          // Progress meeting
  | 'preconstruction'   // Preconstruction meeting
  | 'kickoff'           // Project kickoff
  | 'closeout'          // Closeout meeting
  | 'weekly'            // Weekly coordination
  | 'schedule'          // Schedule review
  | 'budget'            // Budget review
  | 'quality'           // Quality control
  | 'design'            // Design coordination
  | 'other'             // Other meeting type

/**
 * Meeting status options
 */
export type MeetingStatus =
  | 'scheduled'           // Meeting scheduled
  | 'in_progress'         // Meeting in progress
  | 'completed'           // Meeting completed, minutes pending
  | 'minutes_draft'       // Minutes drafted
  | 'minutes_distributed' // Minutes distributed
  | 'cancelled'           // Meeting cancelled

/**
 * Action item status options
 */
export type ActionItemStatus =
  | 'open'              // Action item open
  | 'in_progress'       // Being worked on
  | 'completed'         // Completed
  | 'deferred'          // Deferred to future meeting
  | 'cancelled'         // Cancelled

/**
 * Attendance status options
 */
export type AttendanceStatus =
  | 'invited'
  | 'confirmed'
  | 'attended'
  | 'absent'
  | 'excused'

/**
 * RSVP response options
 */
export type RSVPResponse = 'yes' | 'no' | 'maybe' | 'pending'

/**
 * Attachment type options
 */
export type MeetingAttachmentType =
  | 'agenda'
  | 'minutes'
  | 'presentation'
  | 'handout'
  | 'photo'
  | 'general'

/**
 * Priority options
 */
export type ActionItemPriority = 'low' | 'normal' | 'high' | 'critical'

/**
 * Meeting type configuration
 */
export const MEETING_TYPES: { value: MeetingType; label: string; description: string }[] = [
  { value: 'oac', label: 'OAC Meeting', description: 'Owner/Architect/Contractor meeting' },
  { value: 'subcontractor', label: 'Subcontractor Meeting', description: 'Subcontractor coordination meeting' },
  { value: 'safety', label: 'Safety Meeting', description: 'Safety coordination meeting' },
  { value: 'progress', label: 'Progress Meeting', description: 'Project progress meeting' },
  { value: 'preconstruction', label: 'Preconstruction', description: 'Preconstruction meeting' },
  { value: 'kickoff', label: 'Kickoff Meeting', description: 'Project kickoff meeting' },
  { value: 'closeout', label: 'Closeout Meeting', description: 'Project closeout meeting' },
  { value: 'weekly', label: 'Weekly Coordination', description: 'Weekly coordination meeting' },
  { value: 'schedule', label: 'Schedule Review', description: 'Schedule review meeting' },
  { value: 'budget', label: 'Budget Review', description: 'Budget review meeting' },
  { value: 'quality', label: 'Quality Control', description: 'Quality control meeting' },
  { value: 'design', label: 'Design Coordination', description: 'Design coordination meeting' },
  { value: 'other', label: 'Other', description: 'Other meeting type' },
]

/**
 * Meeting status configuration
 */
export const MEETING_STATUSES: { value: MeetingStatus; label: string; color: string }[] = [
  { value: 'scheduled', label: 'Scheduled', color: 'blue' },
  { value: 'in_progress', label: 'In Progress', color: 'yellow' },
  { value: 'completed', label: 'Completed', color: 'cyan' },
  { value: 'minutes_draft', label: 'Minutes Draft', color: 'purple' },
  { value: 'minutes_distributed', label: 'Minutes Distributed', color: 'green' },
  { value: 'cancelled', label: 'Cancelled', color: 'gray' },
]

/**
 * Action item status configuration
 */
export const ACTION_ITEM_STATUSES: { value: ActionItemStatus; label: string; color: string }[] = [
  { value: 'open', label: 'Open', color: 'blue' },
  { value: 'in_progress', label: 'In Progress', color: 'yellow' },
  { value: 'completed', label: 'Completed', color: 'green' },
  { value: 'deferred', label: 'Deferred', color: 'gray' },
  { value: 'cancelled', label: 'Cancelled', color: 'slate' },
]

/**
 * Priority configuration
 */
export const ACTION_ITEM_PRIORITIES: { value: ActionItemPriority; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: 'green' },
  { value: 'normal', label: 'Normal', color: 'blue' },
  { value: 'high', label: 'High', color: 'orange' },
  { value: 'critical', label: 'Critical', color: 'red' },
]

// =============================================
// Core Types (Database Schema)
// =============================================

/**
 * Meeting record
 */
export interface Meeting {
  id: string
  company_id: string
  project_id: string
  meeting_number: number | null
  meeting_type: MeetingType
  title: string
  description: string | null
  meeting_date: string
  start_time: string | null
  end_time: string | null
  duration_minutes: number | null
  location: string | null
  location_type: 'in_person' | 'virtual' | 'hybrid'
  virtual_link: string | null
  organizer_id: string | null
  status: MeetingStatus
  agenda: string | null
  notes: string | null
  decisions: string | null
  minutes_document_url: string | null
  minutes_pdf_url: string | null
  minutes_distributed_at: string | null
  previous_meeting_id: string | null
  created_at: string
  updated_at: string
  created_by: string | null
  deleted_at: string | null
}

/**
 * Meeting attendee record
 */
export interface MeetingAttendee {
  id: string
  meeting_id: string
  user_id: string | null
  attendee_name: string
  attendee_email: string | null
  attendee_company: string | null
  attendee_role: string | null
  attendance_status: AttendanceStatus
  rsvp_response: RSVPResponse | null
  rsvp_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

/**
 * Meeting action item record
 */
export interface MeetingActionItem {
  id: string
  meeting_id: string
  company_id: string
  project_id: string
  item_number: number | null
  description: string
  priority: ActionItemPriority
  assigned_to_user_id: string | null
  assigned_to_name: string | null
  assigned_to_company: string | null
  due_date: string | null
  completed_date: string | null
  status: ActionItemStatus
  related_rfi_id: string | null
  related_submittal_id: string | null
  related_change_order_id: string | null
  carried_from_meeting_id: string | null
  carried_to_meeting_id: string | null
  notes: string | null
  completion_notes: string | null
  created_at: string
  updated_at: string
  created_by: string | null
  deleted_at: string | null
}

/**
 * Meeting attachment record
 */
export interface MeetingAttachment {
  id: string
  meeting_id: string
  file_name: string
  file_url: string
  file_type: string | null
  file_size: number | null
  attachment_type: MeetingAttachmentType
  uploaded_by: string | null
  created_at: string
}

/**
 * Meeting agenda item record
 */
export interface MeetingAgendaItem {
  id: string
  meeting_id: string
  item_number: number
  title: string
  description: string | null
  duration_minutes: number | null
  presenter_name: string | null
  presenter_id: string | null
  sort_order: number
  discussion_notes: string | null
  created_at: string
  updated_at: string
}

// =============================================
// Extended Types with Relations
// =============================================

/**
 * Meeting with all related data
 */
export interface MeetingWithDetails extends Meeting {
  project?: {
    id: string
    name: string
    number: string | null
  }
  organizer?: {
    id: string
    full_name: string
    email: string
  }
  attendees?: MeetingAttendeeWithUser[]
  action_items?: MeetingActionItemWithDetails[]
  attachments?: MeetingAttachment[]
  agenda_items?: MeetingAgendaItem[]
  previous_meeting?: Meeting | null
  attendee_count?: number
  confirmed_count?: number
  open_action_items_count?: number
}

/**
 * Attendee with user info
 */
export interface MeetingAttendeeWithUser extends MeetingAttendee {
  user?: {
    id: string
    full_name: string
    email: string
    avatar_url: string | null
  }
}

/**
 * Action item with related entity details
 */
export interface MeetingActionItemWithDetails extends MeetingActionItem {
  assigned_to_user?: {
    id: string
    full_name: string
    email: string
  }
  related_rfi?: {
    id: string
    rfi_number: number
    subject: string
  }
  related_submittal?: {
    id: string
    submittal_number: string
    title: string
  }
}

// =============================================
// DTO Types (Data Transfer Objects)
// =============================================

/**
 * Create meeting input
 */
export interface CreateMeetingDTO {
  project_id: string
  meeting_type: MeetingType
  title: string
  description?: string
  meeting_date: string
  start_time?: string
  end_time?: string
  location?: string
  location_type?: 'in_person' | 'virtual' | 'hybrid'
  virtual_link?: string
  agenda?: string
}

/**
 * Update meeting input
 */
export interface UpdateMeetingDTO {
  meeting_type?: MeetingType
  title?: string
  description?: string
  meeting_date?: string
  start_time?: string
  end_time?: string
  location?: string
  location_type?: 'in_person' | 'virtual' | 'hybrid'
  virtual_link?: string
  status?: MeetingStatus
  agenda?: string
  notes?: string
  decisions?: string
}

/**
 * Create attendee input
 */
export interface CreateMeetingAttendeeDTO {
  meeting_id: string
  user_id?: string
  attendee_name: string
  attendee_email?: string
  attendee_company?: string
  attendee_role?: string
}

/**
 * Create action item input
 */
export interface CreateMeetingActionItemDTO {
  meeting_id: string
  description: string
  priority?: ActionItemPriority
  assigned_to_user_id?: string
  assigned_to_name?: string
  assigned_to_company?: string
  due_date?: string
  notes?: string
}

/**
 * Update action item input
 */
export interface UpdateMeetingActionItemDTO {
  description?: string
  priority?: ActionItemPriority
  assigned_to_user_id?: string
  assigned_to_name?: string
  due_date?: string
  status?: ActionItemStatus
  notes?: string
  completion_notes?: string
}

/**
 * Create agenda item input
 */
export interface CreateMeetingAgendaItemDTO {
  meeting_id: string
  title: string
  description?: string
  duration_minutes?: number
  presenter_name?: string
  presenter_id?: string
  sort_order?: number
}

// =============================================
// Filter Types
// =============================================

export interface MeetingFilters {
  projectId: string
  meetingType?: MeetingType | MeetingType[]
  status?: MeetingStatus | MeetingStatus[]
  dateFrom?: string
  dateTo?: string
  organizerId?: string
  search?: string
}

export interface ActionItemFilters {
  projectId: string
  meetingId?: string
  status?: ActionItemStatus | ActionItemStatus[]
  assignedTo?: string
  priority?: ActionItemPriority | ActionItemPriority[]
  dueDateFrom?: string
  dueDateTo?: string
  isOverdue?: boolean
  search?: string
}

// =============================================
// Statistics Types
// =============================================

export interface MeetingStatistics {
  total_meetings: number
  by_type: Record<MeetingType, number>
  by_status: Record<MeetingStatus, number>
  upcoming_count: number
  this_month_count: number
  total_action_items: number
  open_action_items: number
  overdue_action_items: number
}

// =============================================
// Utility Functions
// =============================================

/**
 * Get meeting type label
 */
export function getMeetingTypeLabel(type: MeetingType): string {
  const config = MEETING_TYPES.find((t) => t.value === type)
  return config?.label || type
}

/**
 * Get meeting status color
 */
export function getMeetingStatusColor(status: MeetingStatus): string {
  const config = MEETING_STATUSES.find((s) => s.value === status)
  return config?.color || 'gray'
}

/**
 * Get action item status color
 */
export function getActionItemStatusColor(status: ActionItemStatus): string {
  const config = ACTION_ITEM_STATUSES.find((s) => s.value === status)
  return config?.color || 'gray'
}

/**
 * Get action item priority color
 */
export function getActionItemPriorityColor(priority: ActionItemPriority): string {
  const config = ACTION_ITEM_PRIORITIES.find((p) => p.value === priority)
  return config?.color || 'gray'
}

/**
 * Check if meeting is upcoming
 */
export function isUpcomingMeeting(meeting: Meeting): boolean {
  const meetingDate = new Date(meeting.meeting_date)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return meetingDate >= today && meeting.status === 'scheduled'
}

/**
 * Check if action item is overdue
 */
export function isActionItemOverdue(item: MeetingActionItem): boolean {
  if (!item.due_date) return false
  if (['completed', 'cancelled', 'deferred'].includes(item.status)) return false

  const dueDate = new Date(item.due_date)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return dueDate < today
}

/**
 * Format meeting title with number
 */
export function formatMeetingTitle(meeting: Meeting): string {
  if (meeting.meeting_number) {
    return `${getMeetingTypeLabel(meeting.meeting_type)} #${meeting.meeting_number}: ${meeting.title}`
  }
  return meeting.title
}

/**
 * Format meeting time range
 */
export function formatMeetingTimeRange(meeting: Meeting): string {
  if (!meeting.start_time) return ''

  const start = meeting.start_time.slice(0, 5) // HH:MM
  if (!meeting.end_time) return start

  const end = meeting.end_time.slice(0, 5)
  return `${start} - ${end}`
}
