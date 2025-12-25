/**
 * Meetings Types
 * Enhanced meeting management with notes, action items, attendees, and attachments
 */

// =============================================================================
// ENUMS
// =============================================================================

export enum MeetingType {
  OAC_MEETING = 'oac_meeting',
  PROGRESS_MEETING = 'progress_meeting',
  COORDINATION_MEETING = 'coordination_meeting',
  SCHEDULE_REVIEW = 'schedule_review',
  TOOLBOX_TALK = 'toolbox_talk',
  SAFETY_MEETING = 'safety_meeting',
  KICKOFF_MEETING = 'kickoff_meeting',
  PRECONSTRUCTION = 'preconstruction',
  PRE_INSTALLATION = 'pre_installation',
  CLOSEOUT_MEETING = 'closeout_meeting',
  SUBSTANTIAL_COMPLETION = 'substantial_completion',
  COMMISSIONING = 'commissioning',
  OWNER_MEETING = 'owner_meeting',
  SUBCONTRACTOR_MEETING = 'subcontractor_meeting',
  DESIGN_REVIEW = 'design_review',
  SUBMITTAL_REVIEW = 'submittal_review',
  QUALITY_MEETING = 'quality_meeting',
  BUDGET_REVIEW = 'budget_review',
  OTHER = 'other',
}

export enum MeetingStatus {
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  POSTPONED = 'postponed',
}

export enum ActionItemStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum ActionItemPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum AttendanceStatus {
  INVITED = 'invited',
  CONFIRMED = 'confirmed',
  DECLINED = 'declined',
  ATTENDED = 'attended',
  ABSENT = 'absent',
}

export enum NoteType {
  GENERAL = 'general',
  DECISION = 'decision',
  DISCUSSION = 'discussion',
  AGENDA_ITEM = 'agenda_item',
}

export enum AttachmentType {
  AGENDA = 'agenda',
  MINUTES = 'minutes',
  DOCUMENT = 'document',
  PRESENTATION = 'presentation',
}

// =============================================================================
// CORE TYPES
// =============================================================================

export interface Meeting {
  id: string;
  project_id: string;

  // Basic info
  title: string;
  description: string | null;
  meeting_type: MeetingType | string;
  status: MeetingStatus | string;

  // Location
  location: string | null;
  location_type: 'on_site' | 'off_site' | 'virtual' | 'hybrid' | null;
  virtual_meeting_link: string | null;

  // Timing
  meeting_date: string;
  start_time: string | null;
  end_time: string | null;
  duration_minutes: number | null;

  // Minutes
  minutes_text: string | null;
  minutes_published: boolean;
  minutes_published_at: string | null;
  minutes_published_by: string | null;

  // Template and recurring
  template_id: string | null;
  is_recurring: boolean;
  recurrence_rule: string | null;
  parent_meeting_id: string | null;

  // Legacy JSON fields (for backwards compatibility)
  attendees: unknown | null;
  action_items: unknown | null;

  // Metadata
  created_at: string | null;
  updated_at: string | null;
  created_by: string | null;
  deleted_at: string | null;

  // Relationships (populated via joins)
  project?: { id: string; name: string; project_number: string } | null;
  created_by_user?: { id: string; full_name: string; email: string } | null;
}

export interface MeetingNote {
  id: string;
  meeting_id: string;

  // Content
  section_title: string | null;
  content: string;
  note_order: number;
  note_type: NoteType | string;

  // Metadata
  created_at: string | null;
  updated_at: string | null;
  created_by: string | null;

  // Relationships
  created_by_user?: { id: string; full_name: string; email: string } | null;
}

export interface MeetingActionItem {
  id: string;
  meeting_id: string;

  // Details
  description: string;
  status: ActionItemStatus | string;
  priority: ActionItemPriority | string;

  // Assignment
  assignee_id: string | null;
  assignee_name: string | null;
  assignee_company: string | null;

  // Dates
  due_date: string | null;
  completed_date: string | null;

  // Link to task
  task_id: string | null;

  // Ordering
  item_order: number;

  // Notes
  notes: string | null;

  // Metadata
  created_at: string | null;
  updated_at: string | null;
  created_by: string | null;

  // Relationships
  assignee?: { id: string; full_name: string; email: string } | null;
  task?: { id: string; title: string; status: string } | null;
}

export interface MeetingAttendee {
  id: string;
  meeting_id: string;

  // Attendee info
  user_id: string | null;
  name: string;
  email: string | null;
  company: string | null;
  role: string | null;

  // Attendance tracking
  attendance_status: AttendanceStatus | string;
  response_date: string | null;
  attended: boolean | null;
  arrival_time: string | null;
  departure_time: string | null;

  // Flags
  is_required: boolean;

  // Notes
  notes: string | null;

  // Metadata
  created_at: string | null;
  updated_at: string | null;

  // Relationships
  user?: { id: string; full_name: string; email: string } | null;
}

export interface MeetingAttachment {
  id: string;
  meeting_id: string;

  // File info
  file_name: string;
  file_url: string;
  file_size: number | null;
  file_type: string | null;

  // Type
  attachment_type: AttachmentType | string;

  // Description
  description: string | null;

  // Metadata
  created_at: string | null;
  uploaded_by: string | null;

  // Relationships
  uploaded_by_user?: { id: string; full_name: string; email: string } | null;
}

export interface MeetingTemplate {
  id: string;
  company_id: string;

  // Template info
  name: string;
  description: string | null;
  meeting_type: MeetingType | string | null;

  // Defaults
  default_duration: number;
  default_location: string | null;

  // Template content
  agenda_template: string | null;
  notes_template: unknown | null;
  default_action_items: unknown | null;

  // Active
  is_active: boolean;

  // Metadata
  created_at: string | null;
  updated_at: string | null;
  created_by: string | null;
}

// =============================================================================
// EXTENDED TYPES
// =============================================================================

export interface MeetingWithDetails extends Meeting {
  notes: MeetingNote[];
  actionItems: MeetingActionItem[];
  attendeesList: MeetingAttendee[];
  attachments: MeetingAttachment[];
}

// =============================================================================
// DTOs
// =============================================================================

export interface CreateMeetingDTO {
  project_id: string;
  title: string;
  description?: string;
  meeting_type: MeetingType | string;
  status?: MeetingStatus | string;
  location?: string;
  location_type?: 'on_site' | 'off_site' | 'virtual' | 'hybrid';
  virtual_meeting_link?: string;
  meeting_date: string;
  start_time?: string;
  end_time?: string;
  duration_minutes?: number;
  template_id?: string;
  is_recurring?: boolean;
  recurrence_rule?: string;
}

export interface UpdateMeetingDTO {
  title?: string;
  description?: string;
  meeting_type?: MeetingType | string;
  status?: MeetingStatus | string;
  location?: string;
  location_type?: 'on_site' | 'off_site' | 'virtual' | 'hybrid';
  virtual_meeting_link?: string;
  meeting_date?: string;
  start_time?: string;
  end_time?: string;
  duration_minutes?: number;
  minutes_text?: string;
  minutes_published?: boolean;
}

export interface CreateMeetingNoteDTO {
  meeting_id: string;
  section_title?: string;
  content: string;
  note_order?: number;
  note_type?: NoteType | string;
}

export interface UpdateMeetingNoteDTO {
  section_title?: string;
  content?: string;
  note_order?: number;
  note_type?: NoteType | string;
}

export interface CreateMeetingActionItemDTO {
  meeting_id: string;
  description: string;
  status?: ActionItemStatus | string;
  priority?: ActionItemPriority | string;
  assignee_id?: string;
  assignee_name?: string;
  assignee_company?: string;
  due_date?: string;
  item_order?: number;
  notes?: string;
}

export interface UpdateMeetingActionItemDTO {
  description?: string;
  status?: ActionItemStatus | string;
  priority?: ActionItemPriority | string;
  assignee_id?: string;
  assignee_name?: string;
  assignee_company?: string;
  due_date?: string;
  completed_date?: string;
  task_id?: string;
  item_order?: number;
  notes?: string;
}

export interface CreateMeetingAttendeeDTO {
  meeting_id: string;
  user_id?: string;
  name: string;
  email?: string;
  company?: string;
  role?: string;
  attendance_status?: AttendanceStatus | string;
  is_required?: boolean;
  notes?: string;
}

export interface UpdateMeetingAttendeeDTO {
  name?: string;
  email?: string;
  company?: string;
  role?: string;
  attendance_status?: AttendanceStatus | string;
  attended?: boolean;
  arrival_time?: string;
  departure_time?: string;
  is_required?: boolean;
  notes?: string;
}

export interface CreateMeetingAttachmentDTO {
  meeting_id: string;
  file_name: string;
  file_url: string;
  file_size?: number;
  file_type?: string;
  attachment_type?: AttachmentType | string;
  description?: string;
}

// =============================================================================
// FILTER TYPES
// =============================================================================

export interface MeetingFilters {
  project_id?: string;
  meeting_type?: MeetingType | string;
  status?: MeetingStatus | string;
  date_from?: string;
  date_to?: string;
  search?: string;
}

export interface ActionItemFilters {
  meeting_id?: string;
  assignee_id?: string;
  status?: ActionItemStatus | string;
  priority?: ActionItemPriority | string;
  due_before?: string;
  overdue?: boolean;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get display label for meeting type
 */
export function getMeetingTypeLabel(type: MeetingType | string): string {
  const labels: Record<string, string> = {
    [MeetingType.OAC_MEETING]: 'OAC Meeting',
    [MeetingType.PROGRESS_MEETING]: 'Progress Meeting',
    [MeetingType.COORDINATION_MEETING]: 'Coordination Meeting',
    [MeetingType.SCHEDULE_REVIEW]: 'Schedule Review',
    [MeetingType.TOOLBOX_TALK]: 'Toolbox Talk',
    [MeetingType.SAFETY_MEETING]: 'Safety Meeting',
    [MeetingType.KICKOFF_MEETING]: 'Kickoff Meeting',
    [MeetingType.PRECONSTRUCTION]: 'Pre-Construction',
    [MeetingType.PRE_INSTALLATION]: 'Pre-Installation',
    [MeetingType.CLOSEOUT_MEETING]: 'Closeout Meeting',
    [MeetingType.SUBSTANTIAL_COMPLETION]: 'Substantial Completion',
    [MeetingType.COMMISSIONING]: 'Commissioning',
    [MeetingType.OWNER_MEETING]: 'Owner Meeting',
    [MeetingType.SUBCONTRACTOR_MEETING]: 'Subcontractor Meeting',
    [MeetingType.DESIGN_REVIEW]: 'Design Review',
    [MeetingType.SUBMITTAL_REVIEW]: 'Submittal Review',
    [MeetingType.QUALITY_MEETING]: 'Quality Control',
    [MeetingType.BUDGET_REVIEW]: 'Budget Review',
    [MeetingType.OTHER]: 'Other',
  };
  return labels[type] || type;
}

/**
 * Get display label for meeting status
 */
export function getMeetingStatusLabel(status: MeetingStatus | string): string {
  const labels: Record<string, string> = {
    [MeetingStatus.SCHEDULED]: 'Scheduled',
    [MeetingStatus.IN_PROGRESS]: 'In Progress',
    [MeetingStatus.COMPLETED]: 'Completed',
    [MeetingStatus.CANCELLED]: 'Cancelled',
    [MeetingStatus.POSTPONED]: 'Postponed',
  };
  return labels[status] || status;
}

/**
 * Get color class for meeting status badge
 */
export function getMeetingStatusColor(status: MeetingStatus | string): string {
  const colors: Record<string, string> = {
    [MeetingStatus.SCHEDULED]: 'bg-info-light text-blue-800',
    [MeetingStatus.IN_PROGRESS]: 'bg-warning-light text-yellow-800',
    [MeetingStatus.COMPLETED]: 'bg-success-light text-green-800',
    [MeetingStatus.CANCELLED]: 'bg-error-light text-red-800',
    [MeetingStatus.POSTPONED]: 'bg-muted text-foreground',
  };
  return colors[status] || 'bg-muted text-foreground';
}

/**
 * Get display label for action item status
 */
export function getActionItemStatusLabel(status: ActionItemStatus | string): string {
  const labels: Record<string, string> = {
    [ActionItemStatus.PENDING]: 'Pending',
    [ActionItemStatus.IN_PROGRESS]: 'In Progress',
    [ActionItemStatus.COMPLETED]: 'Completed',
    [ActionItemStatus.CANCELLED]: 'Cancelled',
  };
  return labels[status] || status;
}

/**
 * Get color class for action item status badge
 */
export function getActionItemStatusColor(status: ActionItemStatus | string): string {
  const colors: Record<string, string> = {
    [ActionItemStatus.PENDING]: 'bg-muted text-foreground',
    [ActionItemStatus.IN_PROGRESS]: 'bg-info-light text-blue-800',
    [ActionItemStatus.COMPLETED]: 'bg-success-light text-green-800',
    [ActionItemStatus.CANCELLED]: 'bg-error-light text-red-800',
  };
  return colors[status] || 'bg-muted text-foreground';
}

/**
 * Get display label for action item priority
 */
export function getActionItemPriorityLabel(priority: ActionItemPriority | string): string {
  const labels: Record<string, string> = {
    [ActionItemPriority.LOW]: 'Low',
    [ActionItemPriority.MEDIUM]: 'Medium',
    [ActionItemPriority.HIGH]: 'High',
    [ActionItemPriority.URGENT]: 'Urgent',
  };
  return labels[priority] || priority;
}

/**
 * Get color class for action item priority badge
 */
export function getActionItemPriorityColor(priority: ActionItemPriority | string): string {
  const colors: Record<string, string> = {
    [ActionItemPriority.LOW]: 'bg-success-light text-green-800',
    [ActionItemPriority.MEDIUM]: 'bg-warning-light text-yellow-800',
    [ActionItemPriority.HIGH]: 'bg-orange-100 text-orange-800',
    [ActionItemPriority.URGENT]: 'bg-error-light text-red-800',
  };
  return colors[priority] || 'bg-muted text-foreground';
}

/**
 * Get display label for attendance status
 */
export function getAttendanceStatusLabel(status: AttendanceStatus | string): string {
  const labels: Record<string, string> = {
    [AttendanceStatus.INVITED]: 'Invited',
    [AttendanceStatus.CONFIRMED]: 'Confirmed',
    [AttendanceStatus.DECLINED]: 'Declined',
    [AttendanceStatus.ATTENDED]: 'Attended',
    [AttendanceStatus.ABSENT]: 'Absent',
  };
  return labels[status] || status;
}

/**
 * Check if action item is overdue
 */
export function isActionItemOverdue(actionItem: MeetingActionItem): boolean {
  if (!actionItem.due_date) {return false;}
  if (actionItem.status === ActionItemStatus.COMPLETED || actionItem.status === ActionItemStatus.CANCELLED) {
    return false;
  }
  return new Date(actionItem.due_date) < new Date();
}

/**
 * Calculate days until action item due date
 */
export function getDaysUntilDue(actionItem: MeetingActionItem): number | null {
  if (!actionItem.due_date) {return null;}
  const dueDate = new Date(actionItem.due_date);
  const now = new Date();
  return Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}
