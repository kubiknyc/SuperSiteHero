// File: /src/features/notices/types/index.ts
// Types, enums, and constants for Notices feature

import type { Database } from '@/types/database'

// =============================================
// Database Types
// =============================================

export type Notice = Database['public']['Tables']['notices']['Row']
export type NoticeInsert = Database['public']['Tables']['notices']['Insert']
export type NoticeUpdate = Database['public']['Tables']['notices']['Update']

// =============================================
// Notice Type Constants
// =============================================

export const NOTICE_TYPES = [
  { value: 'claim', label: 'Claim Notice' },
  { value: 'delay', label: 'Delay Notice' },
  { value: 'change_directive', label: 'Change Directive' },
  { value: 'cure', label: 'Notice to Cure' },
  { value: 'completion', label: 'Notice of Completion' },
  { value: 'termination', label: 'Termination Notice' },
  { value: 'insurance', label: 'Insurance Notice' },
  { value: 'payment', label: 'Payment Notice' },
  { value: 'deficiency', label: 'Deficiency Notice' },
  { value: 'stop_work', label: 'Stop Work Notice' },
  { value: 'general', label: 'General Correspondence' },
] as const

export type NoticeType = typeof NOTICE_TYPES[number]['value']

// =============================================
// Notice Status Constants
// =============================================

export const NOTICE_STATUSES = [
  { value: 'draft', label: 'Draft', color: 'bg-muted text-foreground' },
  { value: 'sent', label: 'Sent', color: 'bg-info-light text-blue-800' },
  { value: 'received', label: 'Received', color: 'bg-indigo-100 text-indigo-800' },
  { value: 'acknowledged', label: 'Acknowledged', color: 'bg-purple-100 text-purple-800' },
  { value: 'pending_response', label: 'Pending Response', color: 'bg-warning-light text-yellow-800' },
  { value: 'responded', label: 'Responded', color: 'bg-success-light text-green-800' },
  { value: 'closed', label: 'Closed', color: 'bg-muted text-secondary' },
] as const

export type NoticeStatus = typeof NOTICE_STATUSES[number]['value']

// =============================================
// Response Status Constants
// =============================================

export const RESPONSE_STATUSES = [
  { value: 'pending', label: 'Pending', color: 'bg-warning-light text-yellow-800' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-info-light text-blue-800' },
  { value: 'submitted', label: 'Submitted', color: 'bg-indigo-100 text-indigo-800' },
  { value: 'accepted', label: 'Accepted', color: 'bg-success-light text-green-800' },
  { value: 'rejected', label: 'Rejected', color: 'bg-error-light text-red-800' },
] as const

export type ResponseStatus = typeof RESPONSE_STATUSES[number]['value']

// =============================================
// Direction Constants
// =============================================

export const NOTICE_DIRECTIONS = [
  { value: 'incoming', label: 'Received' },
  { value: 'outgoing', label: 'Sent' },
] as const

export type NoticeDirection = typeof NOTICE_DIRECTIONS[number]['value']

// =============================================
// Input Types
// =============================================

export interface NoticeFilters {
  status?: NoticeStatus
  notice_type?: NoticeType
  direction?: NoticeDirection
  is_critical?: boolean
  response_required?: boolean
  search?: string
}

export interface NoticeCreateInput {
  project_id: string
  notice_type: string
  subject: string
  direction: string
  description?: string | null
  from_party?: string | null
  to_party?: string | null
  notice_date: string
  received_date?: string | null
  response_due_date?: string | null
  response_required?: boolean
  is_critical?: boolean
  reference_number?: string | null
  document_url?: string | null
  notes?: string | null
  status?: string
}

export interface NoticeUpdateInput {
  subject?: string
  description?: string | null
  notice_type?: string
  direction?: string
  from_party?: string | null
  to_party?: string | null
  notice_date?: string
  received_date?: string | null
  response_due_date?: string | null
  response_required?: boolean
  is_critical?: boolean
  status?: string
  reference_number?: string | null
  document_url?: string | null
  notes?: string | null
}

export interface NoticeResponseInput {
  response_date: string
  response_status: string
  response_document_url?: string | null
}

// =============================================
// Helper Functions
// =============================================

/**
 * Get the label for a notice type value
 */
export function getNoticeTypeLabel(type: string): string {
  const found = NOTICE_TYPES.find((t) => t.value === type)
  return found?.label || type
}

/**
 * Get the label and color for a notice status value
 */
export function getNoticeStatusInfo(status: string): { label: string; color: string } {
  const found = NOTICE_STATUSES.find((s) => s.value === status)
  return found || { label: status, color: 'bg-muted text-foreground' }
}

/**
 * Get the label and color for a response status value
 */
export function getResponseStatusInfo(status: string): { label: string; color: string } {
  const found = RESPONSE_STATUSES.find((s) => s.value === status)
  return found || { label: status, color: 'bg-muted text-foreground' }
}

/**
 * Check if a notice response is overdue
 */
export function isResponseOverdue(notice: Notice): boolean {
  if (!notice.response_required || notice.response_date) {
    return false
  }
  if (!notice.response_due_date) {
    return false
  }
  const dueDate = new Date(notice.response_due_date)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  dueDate.setHours(0, 0, 0, 0)
  return dueDate < today
}

/**
 * Calculate days until response is due (negative if overdue)
 */
export function getDaysUntilDue(notice: Notice): number | null {
  if (!notice.response_required || notice.response_date || !notice.response_due_date) {
    return null
  }
  const dueDate = new Date(notice.response_due_date)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  dueDate.setHours(0, 0, 0, 0)
  const diffTime = dueDate.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}
