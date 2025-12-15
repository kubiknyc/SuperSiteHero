/**
 * Action Item Pipeline Types
 *
 * Types for cross-meeting action item tracking, pipeline automation,
 * and integration with tasks, RFIs, and constraints.
 */

// ============================================================================
// Enums and Constants
// ============================================================================

export type ActionItemStatus = 'open' | 'in_progress' | 'completed' | 'deferred'

export type ActionItemPriority = 'low' | 'normal' | 'high' | 'critical'

export type ActionItemCategory =
  | 'design'
  | 'schedule'
  | 'cost'
  | 'safety'
  | 'quality'
  | 'procurement'
  | 'coordination'
  | 'documentation'
  | 'other'

export type ActionItemResolutionType =
  | 'completed'
  | 'converted_to_task'
  | 'converted_to_rfi'
  | 'resolved_by_change_order'
  | 'deferred'
  | 'cancelled'
  | 'delegated'

export type UrgencyStatus =
  | 'completed'
  | 'no_date'
  | 'overdue'
  | 'due_today'
  | 'due_soon'
  | 'on_track'

export const ACTION_ITEM_STATUSES: { value: ActionItemStatus; label: string; color: string }[] = [
  { value: 'open', label: 'Open', color: 'gray' },
  { value: 'in_progress', label: 'In Progress', color: 'blue' },
  { value: 'completed', label: 'Completed', color: 'green' },
  { value: 'deferred', label: 'Deferred', color: 'yellow' },
]

export const ACTION_ITEM_PRIORITIES: { value: ActionItemPriority; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: 'gray' },
  { value: 'normal', label: 'Normal', color: 'blue' },
  { value: 'high', label: 'High', color: 'orange' },
  { value: 'critical', label: 'Critical', color: 'red' },
]

export const ACTION_ITEM_CATEGORIES: { value: ActionItemCategory; label: string; icon: string }[] = [
  { value: 'design', label: 'Design', icon: 'PenTool' },
  { value: 'schedule', label: 'Schedule', icon: 'Calendar' },
  { value: 'cost', label: 'Cost', icon: 'DollarSign' },
  { value: 'safety', label: 'Safety', icon: 'Shield' },
  { value: 'quality', label: 'Quality', icon: 'CheckCircle' },
  { value: 'procurement', label: 'Procurement', icon: 'Package' },
  { value: 'coordination', label: 'Coordination', icon: 'Users' },
  { value: 'documentation', label: 'Documentation', icon: 'FileText' },
  { value: 'other', label: 'Other', icon: 'MoreHorizontal' },
]

export const URGENCY_STATUSES: { value: UrgencyStatus; label: string; color: string }[] = [
  { value: 'overdue', label: 'Overdue', color: 'red' },
  { value: 'due_today', label: 'Due Today', color: 'orange' },
  { value: 'due_soon', label: 'Due Soon', color: 'yellow' },
  { value: 'on_track', label: 'On Track', color: 'green' },
  { value: 'no_date', label: 'No Date', color: 'gray' },
  { value: 'completed', label: 'Completed', color: 'green' },
]

// ============================================================================
// Core Types
// ============================================================================

/**
 * Action item from meeting_action_items table
 */
export interface ActionItem {
  id: string
  meeting_id: string
  project_id: string
  title: string
  description: string | null
  assigned_to: string | null
  assigned_company: string | null
  due_date: string | null
  status: ActionItemStatus
  priority: ActionItemPriority | null
  category: ActionItemCategory | null

  // Linked entities
  task_id: string | null
  related_rfi_id: string | null
  constraint_id: string | null
  related_change_order_id: string | null
  related_submittal_id: string | null

  // Carryover tracking
  carried_from_meeting_id: string | null
  carried_to_meeting_id: string | null
  carryover_count: number

  // Escalation
  escalation_level: number
  escalated_at: string | null
  escalated_to: string | null

  // Resolution
  resolution_type: ActionItemResolutionType | null
  resolution_notes: string | null
  resolved_at: string | null
  resolved_by: string | null

  // Timestamps
  created_at: string
  updated_at: string
  created_by: string | null
}

/**
 * Action item with meeting context (from view)
 */
export interface ActionItemWithContext extends ActionItem {
  // Meeting context
  meeting_type: string
  meeting_date: string
  meeting_number: number | null
  meeting_title: string

  // Computed fields
  urgency_status: UrgencyStatus
  days_until_due: number | null
}

/**
 * Action item summary by project
 */
export interface ActionItemProjectSummary {
  project_id: string
  total_items: number
  open_items: number
  in_progress_items: number
  completed_items: number
  overdue_items: number
  escalated_items: number
  chronic_items: number
  completion_rate: number
}

/**
 * Action items by assignee
 */
export interface ActionItemsByAssignee {
  project_id: string
  assignee: string
  assigned_company: string | null
  total_items: number
  open_items: number
  overdue_items: number
  nearest_due_date: string | null
}

// ============================================================================
// DTO Types
// ============================================================================

/**
 * Create action item DTO
 */
export interface CreateActionItemDTO {
  meeting_id: string
  project_id: string
  title: string
  description?: string
  assigned_to?: string
  assigned_company?: string
  due_date?: string
  priority?: ActionItemPriority
  category?: ActionItemCategory
  related_rfi_id?: string
  constraint_id?: string
  related_change_order_id?: string
}

/**
 * Update action item DTO
 */
export interface UpdateActionItemDTO {
  title?: string
  description?: string
  assigned_to?: string
  assigned_company?: string
  due_date?: string
  status?: ActionItemStatus
  priority?: ActionItemPriority
  category?: ActionItemCategory
  related_rfi_id?: string | null
  constraint_id?: string | null
  related_change_order_id?: string | null
}

/**
 * Resolve action item DTO
 */
export interface ResolveActionItemDTO {
  resolution_type: ActionItemResolutionType
  resolution_notes?: string
}

/**
 * Link action item DTO
 */
export interface LinkActionItemDTO {
  type: 'task' | 'rfi' | 'constraint' | 'change_order'
  entity_id: string
}

/**
 * Carryover action items DTO
 */
export interface CarryoverActionItemsDTO {
  source_meeting_id: string
  target_meeting_id: string
  action_item_ids?: string[]
}

/**
 * Action item filters
 */
export interface ActionItemFilters {
  project_id?: string
  meeting_id?: string
  status?: ActionItemStatus | ActionItemStatus[]
  priority?: ActionItemPriority | ActionItemPriority[]
  category?: ActionItemCategory | ActionItemCategory[]
  assigned_to?: string
  assigned_company?: string
  urgency_status?: UrgencyStatus | UrgencyStatus[]
  has_task?: boolean
  has_rfi?: boolean
  has_constraint?: boolean
  overdue_only?: boolean
  escalated_only?: boolean
  search?: string
  limit?: number
  offset?: number
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get status config
 */
export function getActionItemStatusConfig(status: ActionItemStatus) {
  return ACTION_ITEM_STATUSES.find(s => s.value === status) || ACTION_ITEM_STATUSES[0]
}

/**
 * Get priority config
 */
export function getActionItemPriorityConfig(priority: ActionItemPriority) {
  return ACTION_ITEM_PRIORITIES.find(p => p.value === priority) || ACTION_ITEM_PRIORITIES[1]
}

/**
 * Get category config
 */
export function getActionItemCategoryConfig(category: ActionItemCategory) {
  return ACTION_ITEM_CATEGORIES.find(c => c.value === category) || ACTION_ITEM_CATEGORIES[8]
}

/**
 * Get urgency config
 */
export function getUrgencyStatusConfig(urgency: UrgencyStatus) {
  return URGENCY_STATUSES.find(u => u.value === urgency) || URGENCY_STATUSES[4]
}

/**
 * Calculate urgency from due date
 */
export function calculateUrgency(dueDate: string | null, status: ActionItemStatus): UrgencyStatus {
  if (status === 'completed') {return 'completed'}
  if (!dueDate) {return 'no_date'}

  const due = new Date(dueDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  due.setHours(0, 0, 0, 0)

  const diffDays = Math.floor((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays < 0) {return 'overdue'}
  if (diffDays === 0) {return 'due_today'}
  if (diffDays <= 3) {return 'due_soon'}
  return 'on_track'
}

/**
 * Check if action item is overdue
 */
export function isActionItemOverdue(item: ActionItem): boolean {
  if (item.status === 'completed') {return false}
  if (!item.due_date) {return false}
  return new Date(item.due_date) < new Date()
}

/**
 * Check if action item is escalated
 */
export function isActionItemEscalated(item: ActionItem): boolean {
  return item.escalation_level > 0
}

/**
 * Check if action item is chronic (carried over multiple times)
 */
export function isActionItemChronic(item: ActionItem): boolean {
  return item.carryover_count >= 3
}
