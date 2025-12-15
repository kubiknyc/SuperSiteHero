/**
 * Milestone Notification Preferences Types
 *
 * Type definitions for client milestone notification preferences.
 * Separate from the main notification-preferences.ts to handle
 * client-specific milestone events.
 */

// ============================================================================
// Event Types
// ============================================================================

export type MilestoneEventType =
  // Project Milestones
  | 'project.started'
  | 'project.milestone_completed'
  | 'project.phase_transition'
  | 'project.completed'
  // Schedule Events
  | 'schedule.update'
  | 'schedule.delay'
  | 'schedule.critical_path_change'
  // Financial Events
  | 'financial.payment_application_submitted'
  | 'financial.payment_application_approved'
  | 'financial.invoice_ready'
  | 'financial.budget_change'
  // Quality Events
  | 'quality.inspection_scheduled'
  | 'quality.inspection_completed'
  | 'quality.punch_list_created'
  | 'quality.punch_list_completed'
  // Documents
  | 'document.uploaded'
  | 'document.approval_required'
  | 'document.submittal_status_change'
  // Communication
  | 'communication.rfi_response'
  | 'communication.change_order_submitted'
  | 'communication.meeting_scheduled'

export type EventCategory =
  | 'project_milestones'
  | 'schedule'
  | 'financial'
  | 'quality'
  | 'documents'
  | 'communication'

export type NotificationChannel = 'email' | 'in_app' | 'sms' | 'push'

// ============================================================================
// Preference Models
// ============================================================================

export interface MilestoneNotificationPreference {
  id: string
  user_id: string
  project_id: string | null // null = all projects
  event_type: MilestoneEventType
  email_enabled: boolean
  in_app_enabled: boolean
  sms_enabled: boolean
  push_enabled: boolean
  created_at: string
  updated_at: string
}

export interface CreateMilestoneNotificationPreferenceDTO {
  user_id: string
  project_id?: string | null
  event_type: MilestoneEventType
  email_enabled?: boolean
  in_app_enabled?: boolean
  sms_enabled?: boolean
  push_enabled?: boolean
}

export interface UpdateMilestoneNotificationPreferenceDTO {
  email_enabled?: boolean
  in_app_enabled?: boolean
  sms_enabled?: boolean
  push_enabled?: boolean
}

export interface BulkUpdateMilestonePreferencesDTO {
  user_id: string
  project_id?: string | null
  preferences: Array<{
    event_type: MilestoneEventType
    email_enabled?: boolean
    in_app_enabled?: boolean
    sms_enabled?: boolean
    push_enabled?: boolean
  }>
}

// ============================================================================
// UI Models
// ============================================================================

export interface EventTypeMetadata {
  type: MilestoneEventType
  label: string
  description: string
  category: EventCategory
  availableChannels: NotificationChannel[]
}

export interface GroupedMilestonePreferences {
  category: EventCategory
  label: string
  description: string
  events: Array<{
    metadata: EventTypeMetadata
    preference: MilestoneNotificationPreference | null
  }>
}

export interface ChannelAvailability {
  email: boolean
  in_app: boolean
  sms: boolean
  push: boolean
}

// ============================================================================
// Default Preferences
// ============================================================================

export const DEFAULT_MILESTONE_PREFERENCES: Record<MilestoneEventType, Omit<MilestoneNotificationPreference, 'id' | 'user_id' | 'project_id' | 'event_type' | 'created_at' | 'updated_at'>> = {
  // Project Milestones - High priority, both channels
  'project.started': { email_enabled: true, in_app_enabled: true, sms_enabled: false, push_enabled: false },
  'project.milestone_completed': { email_enabled: true, in_app_enabled: true, sms_enabled: false, push_enabled: false },
  'project.phase_transition': { email_enabled: true, in_app_enabled: true, sms_enabled: false, push_enabled: false },
  'project.completed': { email_enabled: true, in_app_enabled: true, sms_enabled: false, push_enabled: false },

  // Schedule Events - Medium priority, in-app default
  'schedule.update': { email_enabled: false, in_app_enabled: true, sms_enabled: false, push_enabled: false },
  'schedule.delay': { email_enabled: true, in_app_enabled: true, sms_enabled: false, push_enabled: false },
  'schedule.critical_path_change': { email_enabled: true, in_app_enabled: true, sms_enabled: false, push_enabled: false },

  // Financial Events - High priority, both channels
  'financial.payment_application_submitted': { email_enabled: true, in_app_enabled: true, sms_enabled: false, push_enabled: false },
  'financial.payment_application_approved': { email_enabled: true, in_app_enabled: true, sms_enabled: false, push_enabled: false },
  'financial.invoice_ready': { email_enabled: true, in_app_enabled: true, sms_enabled: false, push_enabled: false },
  'financial.budget_change': { email_enabled: true, in_app_enabled: true, sms_enabled: false, push_enabled: false },

  // Quality Events - Medium priority, in-app default
  'quality.inspection_scheduled': { email_enabled: true, in_app_enabled: true, sms_enabled: false, push_enabled: false },
  'quality.inspection_completed': { email_enabled: false, in_app_enabled: true, sms_enabled: false, push_enabled: false },
  'quality.punch_list_created': { email_enabled: false, in_app_enabled: true, sms_enabled: false, push_enabled: false },
  'quality.punch_list_completed': { email_enabled: true, in_app_enabled: true, sms_enabled: false, push_enabled: false },

  // Documents - Low priority, in-app only
  'document.uploaded': { email_enabled: false, in_app_enabled: true, sms_enabled: false, push_enabled: false },
  'document.approval_required': { email_enabled: true, in_app_enabled: true, sms_enabled: false, push_enabled: false },
  'document.submittal_status_change': { email_enabled: false, in_app_enabled: true, sms_enabled: false, push_enabled: false },

  // Communication - Medium priority
  'communication.rfi_response': { email_enabled: true, in_app_enabled: true, sms_enabled: false, push_enabled: false },
  'communication.change_order_submitted': { email_enabled: true, in_app_enabled: true, sms_enabled: false, push_enabled: false },
  'communication.meeting_scheduled': { email_enabled: true, in_app_enabled: true, sms_enabled: false, push_enabled: false },
}

// ============================================================================
// Event Metadata
// ============================================================================

export const MILESTONE_EVENT_METADATA: Record<MilestoneEventType, EventTypeMetadata> = {
  // Project Milestones
  'project.started': {
    type: 'project.started',
    label: 'Project Started',
    description: 'Notification when a project begins',
    category: 'project_milestones',
    availableChannels: ['email', 'in_app', 'sms', 'push'],
  },
  'project.milestone_completed': {
    type: 'project.milestone_completed',
    label: 'Milestone Completed',
    description: 'Notification when a project milestone is completed',
    category: 'project_milestones',
    availableChannels: ['email', 'in_app', 'sms', 'push'],
  },
  'project.phase_transition': {
    type: 'project.phase_transition',
    label: 'Phase Transition',
    description: 'Notification when project moves to a new phase',
    category: 'project_milestones',
    availableChannels: ['email', 'in_app', 'sms', 'push'],
  },
  'project.completed': {
    type: 'project.completed',
    label: 'Project Completed',
    description: 'Notification when a project is completed',
    category: 'project_milestones',
    availableChannels: ['email', 'in_app', 'sms', 'push'],
  },

  // Schedule Events
  'schedule.update': {
    type: 'schedule.update',
    label: 'Schedule Updated',
    description: 'Notification when the project schedule is updated',
    category: 'schedule',
    availableChannels: ['email', 'in_app'],
  },
  'schedule.delay': {
    type: 'schedule.delay',
    label: 'Schedule Delay',
    description: 'Notification when a delay is identified',
    category: 'schedule',
    availableChannels: ['email', 'in_app', 'sms', 'push'],
  },
  'schedule.critical_path_change': {
    type: 'schedule.critical_path_change',
    label: 'Critical Path Changed',
    description: 'Notification when critical path changes',
    category: 'schedule',
    availableChannels: ['email', 'in_app', 'push'],
  },

  // Financial Events
  'financial.payment_application_submitted': {
    type: 'financial.payment_application_submitted',
    label: 'Payment Application Submitted',
    description: 'Notification when a payment application is submitted',
    category: 'financial',
    availableChannels: ['email', 'in_app'],
  },
  'financial.payment_application_approved': {
    type: 'financial.payment_application_approved',
    label: 'Payment Application Approved',
    description: 'Notification when a payment application is approved',
    category: 'financial',
    availableChannels: ['email', 'in_app', 'sms'],
  },
  'financial.invoice_ready': {
    type: 'financial.invoice_ready',
    label: 'Invoice Ready',
    description: 'Notification when an invoice is ready for review',
    category: 'financial',
    availableChannels: ['email', 'in_app'],
  },
  'financial.budget_change': {
    type: 'financial.budget_change',
    label: 'Budget Changed',
    description: 'Notification when project budget changes',
    category: 'financial',
    availableChannels: ['email', 'in_app', 'push'],
  },

  // Quality Events
  'quality.inspection_scheduled': {
    type: 'quality.inspection_scheduled',
    label: 'Inspection Scheduled',
    description: 'Notification when an inspection is scheduled',
    category: 'quality',
    availableChannels: ['email', 'in_app', 'sms'],
  },
  'quality.inspection_completed': {
    type: 'quality.inspection_completed',
    label: 'Inspection Completed',
    description: 'Notification when an inspection is completed',
    category: 'quality',
    availableChannels: ['email', 'in_app'],
  },
  'quality.punch_list_created': {
    type: 'quality.punch_list_created',
    label: 'Punch List Created',
    description: 'Notification when a new punch list is created',
    category: 'quality',
    availableChannels: ['email', 'in_app'],
  },
  'quality.punch_list_completed': {
    type: 'quality.punch_list_completed',
    label: 'Punch List Completed',
    description: 'Notification when all punch list items are completed',
    category: 'quality',
    availableChannels: ['email', 'in_app', 'push'],
  },

  // Documents
  'document.uploaded': {
    type: 'document.uploaded',
    label: 'Document Uploaded',
    description: 'Notification when new documents are uploaded',
    category: 'documents',
    availableChannels: ['email', 'in_app'],
  },
  'document.approval_required': {
    type: 'document.approval_required',
    label: 'Document Approval Required',
    description: 'Notification when a document needs approval',
    category: 'documents',
    availableChannels: ['email', 'in_app', 'push'],
  },
  'document.submittal_status_change': {
    type: 'document.submittal_status_change',
    label: 'Submittal Status Changed',
    description: 'Notification when a submittal status changes',
    category: 'documents',
    availableChannels: ['email', 'in_app'],
  },

  // Communication
  'communication.rfi_response': {
    type: 'communication.rfi_response',
    label: 'RFI Response Received',
    description: 'Notification when an RFI receives a response',
    category: 'communication',
    availableChannels: ['email', 'in_app', 'push'],
  },
  'communication.change_order_submitted': {
    type: 'communication.change_order_submitted',
    label: 'Change Order Submitted',
    description: 'Notification when a change order is submitted',
    category: 'communication',
    availableChannels: ['email', 'in_app'],
  },
  'communication.meeting_scheduled': {
    type: 'communication.meeting_scheduled',
    label: 'Meeting Scheduled',
    description: 'Notification when a meeting is scheduled',
    category: 'communication',
    availableChannels: ['email', 'in_app', 'sms'],
  },
}

// ============================================================================
// Category Metadata
// ============================================================================

export const CATEGORY_METADATA: Record<EventCategory, { label: string; description: string }> = {
  project_milestones: {
    label: 'Project Milestones',
    description: 'Major project events and milestones',
  },
  schedule: {
    label: 'Schedule Events',
    description: 'Project schedule updates and changes',
  },
  financial: {
    label: 'Financial Events',
    description: 'Payment applications, invoices, and budget changes',
  },
  quality: {
    label: 'Quality Events',
    description: 'Inspections, punch lists, and quality control',
  },
  documents: {
    label: 'Documents',
    description: 'Document uploads, approvals, and submittals',
  },
  communication: {
    label: 'Communication',
    description: 'RFIs, change orders, and meetings',
  },
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get all event types for a category
 */
export function getEventTypesByCategory(category: EventCategory): MilestoneEventType[] {
  return Object.values(MILESTONE_EVENT_METADATA)
    .filter((metadata) => metadata.category === category)
    .map((metadata) => metadata.type)
}

/**
 * Check if a channel is available for an event type
 */
export function isChannelAvailable(
  eventType: MilestoneEventType,
  channel: NotificationChannel
): boolean {
  const metadata = MILESTONE_EVENT_METADATA[eventType]
  return metadata.availableChannels.includes(channel)
}

/**
 * Get default preference for an event type
 */
export function getDefaultPreference(
  userId: string,
  eventType: MilestoneEventType,
  projectId?: string | null
): CreateMilestoneNotificationPreferenceDTO {
  const defaults = DEFAULT_MILESTONE_PREFERENCES[eventType]
  return {
    user_id: userId,
    project_id: projectId,
    event_type: eventType,
    ...defaults,
  }
}
