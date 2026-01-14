/**
 * Action Item Pipeline API Service
 *
 * Cross-meeting action item queries, pipeline automation,
 * and integration with tasks, RFIs, and constraints.
 */

import { supabase } from '@/lib/supabase'
import { fromExtended } from '@/lib/supabase-typed'
import type {
  ActionItem,
  ActionItemWithContext,
  ActionItemProjectSummary,
  ActionItemsByAssignee,
  ActionItemFilters,
  CreateActionItemDTO,
  UpdateActionItemDTO,
  ResolveActionItemDTO,
  LinkActionItemDTO,
  CarryoverActionItemsDTO,
  ActionItemStatus,
} from '@/types/action-items'

// ============================================================================
// Action Item CRUD
// ============================================================================

/**
 * Get action items with context (cross-meeting)
 */
export async function getActionItems(
  filters: ActionItemFilters
): Promise<ActionItemWithContext[]> {
  let query = supabase
    fromExtended('action_items_with_context')
    .select('*')
    .order('due_date', { ascending: true, nullsFirst: false })

  // Apply filters
  if (filters.project_id) {
    query = query.eq('project_id', filters.project_id)
  }

  if (filters.meeting_id) {
    query = query.eq('meeting_id', filters.meeting_id)
  }

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

  if (filters.category) {
    if (Array.isArray(filters.category)) {
      query = query.in('category', filters.category)
    } else {
      query = query.eq('category', filters.category)
    }
  }

  if (filters.assigned_to) {
    query = query.ilike('assigned_to', `%${filters.assigned_to}%`)
  }

  if (filters.assigned_company) {
    query = query.ilike('assigned_company', `%${filters.assigned_company}%`)
  }

  if (filters.urgency_status) {
    if (Array.isArray(filters.urgency_status)) {
      query = query.in('urgency_status', filters.urgency_status)
    } else {
      query = query.eq('urgency_status', filters.urgency_status)
    }
  }

  if (filters.has_task !== undefined) {
    if (filters.has_task) {
      query = query.not('task_id', 'is', null)
    } else {
      query = query.is('task_id', null)
    }
  }

  if (filters.has_rfi !== undefined) {
    if (filters.has_rfi) {
      query = query.not('related_rfi_id', 'is', null)
    } else {
      query = query.is('related_rfi_id', null)
    }
  }

  if (filters.has_constraint !== undefined) {
    if (filters.has_constraint) {
      query = query.not('constraint_id', 'is', null)
    } else {
      query = query.is('constraint_id', null)
    }
  }

  if (filters.overdue_only) {
    query = query.eq('urgency_status', 'overdue')
  }

  if (filters.escalated_only) {
    query = query.gt('escalation_level', 0)
  }

  if (filters.search) {
    query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
  }

  if (filters.limit) {
    query = query.limit(filters.limit)
  }

  if (filters.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to get action items: ${error.message}`)
  }

  return (data || []) as unknown as ActionItemWithContext[]
}

/**
 * Get single action item by ID
 */
export async function getActionItem(id: string): Promise<ActionItemWithContext | null> {
  const { data, error } = await supabase
    fromExtended('action_items_with_context')
    .select('*')
    .eq('id', id)
    .single()

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to get action item: ${error.message}`)
  }

  return data as unknown as ActionItemWithContext | null
}

/**
 * Create action item
 */
export async function createActionItem(dto: CreateActionItemDTO): Promise<ActionItem> {
  const { data, error } = await supabase
    .from('meeting_action_items')
    .insert({
      meeting_id: dto.meeting_id,
      project_id: dto.project_id,
      title: dto.title,
      description: dto.description || null,
      assigned_to: dto.assigned_to || null,
      assigned_company: dto.assigned_company || null,
      due_date: dto.due_date || null,
      priority: dto.priority || 'normal',
      category: dto.category || null,
      status: 'open',
      related_rfi_id: dto.related_rfi_id || null,
      constraint_id: dto.constraint_id || null,
      related_change_order_id: dto.related_change_order_id || null,
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create action item: ${error.message}`)
  }

  return data as ActionItem
}

/**
 * Update action item
 */
export async function updateActionItem(
  id: string,
  dto: UpdateActionItemDTO
): Promise<ActionItem> {
  const { data, error } = await supabase
    .from('meeting_action_items')
    .update({
      ...dto,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update action item: ${error.message}`)
  }

  return data as ActionItem
}

/**
 * Delete action item
 */
export async function deleteActionItem(id: string): Promise<void> {
  const { error } = await supabase
    .from('meeting_action_items')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(`Failed to delete action item: ${error.message}`)
  }
}

// ============================================================================
// Status & Resolution
// ============================================================================

/**
 * Update action item status
 */
export async function updateActionItemStatus(
  id: string,
  status: ActionItemStatus
): Promise<ActionItem> {
  const updates: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  }

  // Auto-set resolution if completing
  if (status === 'completed') {
    updates.resolution_type = 'completed'
    updates.resolved_at = new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('meeting_action_items')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update status: ${error.message}`)
  }

  return data as ActionItem
}

/**
 * Resolve action item with details
 */
export async function resolveActionItem(
  id: string,
  dto: ResolveActionItemDTO
): Promise<ActionItem> {
  const { data, error } = await supabase
    .from('meeting_action_items')
    .update({
      status: dto.resolution_type === 'deferred' ? 'deferred' : 'completed',
      resolution_type: dto.resolution_type,
      resolution_notes: dto.resolution_notes || null,
      resolved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to resolve action item: ${error.message}`)
  }

  return data as ActionItem
}

// ============================================================================
// Linking & Pipeline
// ============================================================================

/**
 * Link action item to another entity
 */
export async function linkActionItem(
  id: string,
  dto: LinkActionItemDTO
): Promise<ActionItem> {
  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  switch (dto.type) {
    case 'task':
      updates.task_id = dto.entity_id
      break
    case 'rfi':
      updates.related_rfi_id = dto.entity_id
      break
    case 'constraint':
      updates.constraint_id = dto.entity_id
      break
    case 'change_order':
      updates.related_change_order_id = dto.entity_id
      break
  }

  const { data, error } = await supabase
    .from('meeting_action_items')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to link action item: ${error.message}`)
  }

  return data as ActionItem
}

/**
 * Unlink action item from an entity
 */
export async function unlinkActionItem(
  id: string,
  linkType: 'task' | 'rfi' | 'constraint' | 'change_order'
): Promise<ActionItem> {
  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  switch (linkType) {
    case 'task':
      updates.task_id = null
      break
    case 'rfi':
      updates.related_rfi_id = null
      break
    case 'constraint':
      updates.constraint_id = null
      break
    case 'change_order':
      updates.related_change_order_id = null
      break
  }

  const { data, error } = await supabase
    .from('meeting_action_items')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to unlink action item: ${error.message}`)
  }

  return data as ActionItem
}

/**
 * Convert action item to task
 */
export async function convertToTask(
  actionItemId: string,
  userId?: string
): Promise<string> {
  const { data, error } = await supabase
    .rpc('convert_action_item_to_task', {
      p_action_item_id: actionItemId,
      p_created_by: userId || null,
    })

  if (error) {
    throw new Error(`Failed to convert to task: ${error.message}`)
  }

  return data as string
}

/**
 * Carry over action items to new meeting
 */
export async function carryoverActionItems(
  dto: CarryoverActionItemsDTO
): Promise<number> {
  const { data, error } = await supabase
    .rpc('carryover_action_items', {
      p_source_meeting_id: dto.source_meeting_id,
      p_target_meeting_id: dto.target_meeting_id,
      p_action_item_ids: dto.action_item_ids || null,
    })

  if (error) {
    throw new Error(`Failed to carry over action items: ${error.message}`)
  }

  return data as number
}

// ============================================================================
// Statistics & Reporting
// ============================================================================

/**
 * Get project action item summary
 */
export async function getProjectSummary(
  projectId: string
): Promise<ActionItemProjectSummary | null> {
  const { data, error } = await supabase
    fromExtended('action_item_summary_by_project')
    .select('*')
    .eq('project_id', projectId)
    .single()

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to get project summary: ${error.message}`)
  }

  return data as unknown as ActionItemProjectSummary | null
}

/**
 * Get action items grouped by assignee
 */
export async function getItemsByAssignee(
  projectId: string
): Promise<ActionItemsByAssignee[]> {
  const { data, error } = await supabase
    fromExtended('action_items_by_assignee')
    .select('*')
    .eq('project_id', projectId)
    .order('open_items', { ascending: false })

  if (error) {
    throw new Error(`Failed to get items by assignee: ${error.message}`)
  }

  return (data || []) as unknown as ActionItemsByAssignee[]
}

/**
 * Get overdue action items
 */
export async function getOverdueItems(
  projectId?: string,
  limit = 50
): Promise<ActionItemWithContext[]> {
  let query = supabase
    fromExtended('action_items_with_context')
    .select('*')
    .eq('urgency_status', 'overdue')
    .order('due_date', { ascending: true })
    .limit(limit)

  if (projectId) {
    query = query.eq('project_id', projectId)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to get overdue items: ${error.message}`)
  }

  return (data || []) as unknown as ActionItemWithContext[]
}

/**
 * Get action items due soon (within 3 days)
 */
export async function getItemsDueSoon(
  projectId?: string,
  limit = 50
): Promise<ActionItemWithContext[]> {
  let query = supabase
    fromExtended('action_items_with_context')
    .select('*')
    .in('urgency_status', ['due_today', 'due_soon'])
    .order('due_date', { ascending: true })
    .limit(limit)

  if (projectId) {
    query = query.eq('project_id', projectId)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to get items due soon: ${error.message}`)
  }

  return (data || []) as unknown as ActionItemWithContext[]
}

/**
 * Get escalated action items
 */
export async function getEscalatedItems(
  projectId?: string,
  limit = 50
): Promise<ActionItemWithContext[]> {
  let query = supabase
    fromExtended('action_items_with_context')
    .select('*')
    .gt('escalation_level', 0)
    .neq('status', 'completed')
    .order('escalation_level', { ascending: false })
    .order('due_date', { ascending: true })
    .limit(limit)

  if (projectId) {
    query = query.eq('project_id', projectId)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to get escalated items: ${error.message}`)
  }

  return (data || []) as unknown as ActionItemWithContext[]
}

/**
 * Get action item counts by status
 */
export async function getStatusCounts(
  projectId: string
): Promise<Record<ActionItemStatus, number>> {
  const { data, error } = await supabase
    .from('meeting_action_items')
    .select('status')
    .eq('project_id', projectId)

  if (error) {
    throw new Error(`Failed to get status counts: ${error.message}`)
  }

  const counts: Record<ActionItemStatus, number> = {
    open: 0,
    in_progress: 0,
    completed: 0,
    deferred: 0,
  }

  for (const item of data || []) {
    const status = item.status as ActionItemStatus
    counts[status] = (counts[status] || 0) + 1
  }

  return counts
}

// ============================================================================
// Escalation System
// ============================================================================

export interface EscalationConfig {
  /** Days overdue before escalation level 1 */
  level1Days: number
  /** Days overdue before escalation level 2 */
  level2Days: number
  /** Days overdue before escalation level 3 */
  level3Days: number
  /** Send email notifications */
  sendEmail: boolean
  /** Send in-app notifications */
  sendInApp: boolean
}

export const DEFAULT_ESCALATION_CONFIG: EscalationConfig = {
  level1Days: 3,
  level2Days: 7,
  level3Days: 14,
  sendEmail: true,
  sendInApp: true,
}

export interface EscalationResult {
  actionItemId: string
  title: string
  previousLevel: number
  newLevel: number
  assignee: string | null
  escalatedTo: string | null
  success: boolean
  error?: string
}

export interface EscalationBatchResult {
  processed: number
  escalated: number
  failed: number
  results: EscalationResult[]
}

/**
 * Get action items that need escalation
 */
export async function getItemsNeedingEscalation(
  config: EscalationConfig = DEFAULT_ESCALATION_CONFIG
): Promise<ActionItemWithContext[]> {
  const today = new Date()
  const level1Date = new Date(today)
  level1Date.setDate(today.getDate() - config.level1Days)

  const { data, error } = await supabase
    fromExtended('action_items_with_context')
    .select('*')
    .eq('status', 'open')
    .or('status.eq.in_progress')
    .lt('due_date', level1Date.toISOString().split('T')[0])
    .order('due_date', { ascending: true })

  if (error) {
    throw new Error(`Failed to get items needing escalation: ${error.message}`)
  }

  // Filter to items that need a higher escalation level
  return (data || []).filter((item: any) => {
    const dueDate = new Date(item.due_date)
    const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
    const currentLevel = item.escalation_level || 0

    if (daysOverdue >= config.level3Days && currentLevel < 3) {return true}
    if (daysOverdue >= config.level2Days && currentLevel < 2) {return true}
    if (daysOverdue >= config.level1Days && currentLevel < 1) {return true}

    return false
  }) as unknown as ActionItemWithContext[]
}

/**
 * Calculate the appropriate escalation level based on days overdue
 */
export function calculateEscalationLevel(
  daysOverdue: number,
  config: EscalationConfig = DEFAULT_ESCALATION_CONFIG
): number {
  if (daysOverdue >= config.level3Days) {return 3}
  if (daysOverdue >= config.level2Days) {return 2}
  if (daysOverdue >= config.level1Days) {return 1}
  return 0
}

/**
 * Escalate a single action item
 */
export async function escalateActionItem(
  id: string,
  _escalatedBy: string,
  escalatedTo?: string,
  _reason?: string
): Promise<ActionItem> {
  // Get current item
  const item = await getActionItem(id)
  if (!item) {
    throw new Error('Action item not found')
  }

  const newLevel = (item.escalation_level || 0) + 1

  const { data, error } = await supabase
    .from('meeting_action_items')
    .update({
      escalation_level: newLevel,
      escalated_at: new Date().toISOString(),
      escalated_to: escalatedTo || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to escalate action item: ${error.message}`)
  }

  return data as ActionItem
}

/**
 * Process all pending escalations
 */
export async function processEscalations(
  config: EscalationConfig = DEFAULT_ESCALATION_CONFIG
): Promise<EscalationBatchResult> {
  const result: EscalationBatchResult = {
    processed: 0,
    escalated: 0,
    failed: 0,
    results: [],
  }

  try {
    const itemsNeedingEscalation = await getItemsNeedingEscalation(config)
    result.processed = itemsNeedingEscalation.length

    const today = new Date()

    for (const item of itemsNeedingEscalation) {
      try {
        const dueDate = new Date(item.due_date!)
        const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
        const newLevel = calculateEscalationLevel(daysOverdue, config)
        const previousLevel = item.escalation_level || 0

        if (newLevel > previousLevel) {
          await escalateActionItem(item.id, 'system')

          result.escalated++
          result.results.push({
            actionItemId: item.id,
            title: item.title,
            previousLevel,
            newLevel,
            assignee: item.assigned_to,
            escalatedTo: null,
            success: true,
          })
        }
      } catch (err) {
        result.failed++
        result.results.push({
          actionItemId: item.id,
          title: item.title,
          previousLevel: item.escalation_level || 0,
          newLevel: item.escalation_level || 0,
          assignee: item.assigned_to,
          escalatedTo: null,
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        })
      }
    }
  } catch (err) {
    throw new Error(`Failed to process escalations: ${err instanceof Error ? err.message : 'Unknown error'}`)
  }

  return result
}

/**
 * Get escalation statistics
 */
export async function getEscalationStats(projectId?: string): Promise<{
  level0: number
  level1: number
  level2: number
  level3: number
  totalEscalated: number
  avgDaysOverdue: number
}> {
  let query = supabase
    fromExtended('action_items_with_context')
    .select('escalation_level, due_date')
    .in('status', ['open', 'in_progress'])

  if (projectId) {
    query = query.eq('project_id', projectId)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to get escalation stats: ${error.message}`)
  }

  const stats = {
    level0: 0,
    level1: 0,
    level2: 0,
    level3: 0,
    totalEscalated: 0,
    avgDaysOverdue: 0,
  }

  const today = new Date()
  let totalOverdueDays = 0
  let overdueCount = 0

  for (const item of data || []) {
    const level = item.escalation_level || 0
    switch (level) {
      case 0:
        stats.level0++
        break
      case 1:
        stats.level1++
        stats.totalEscalated++
        break
      case 2:
        stats.level2++
        stats.totalEscalated++
        break
      case 3:
        stats.level3++
        stats.totalEscalated++
        break
      default:
        if (level > 3) {
          stats.level3++
          stats.totalEscalated++
        }
    }

    if (item.due_date) {
      const dueDate = new Date(item.due_date)
      if (dueDate < today) {
        const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
        totalOverdueDays += daysOverdue
        overdueCount++
      }
    }
  }

  stats.avgDaysOverdue = overdueCount > 0 ? Math.round(totalOverdueDays / overdueCount) : 0

  return stats
}

// ============================================================================
// Export API
// ============================================================================

export const actionItemsApi = {
  // CRUD
  getActionItems,
  getActionItem,
  createActionItem,
  updateActionItem,
  deleteActionItem,

  // Status & Resolution
  updateActionItemStatus,
  resolveActionItem,

  // Linking & Pipeline
  linkActionItem,
  unlinkActionItem,
  convertToTask,
  carryoverActionItems,

  // Statistics & Reporting
  getProjectSummary,
  getItemsByAssignee,
  getOverdueItems,
  getItemsDueSoon,
  getEscalatedItems,
  getStatusCounts,

  // Escalation System
  getItemsNeedingEscalation,
  calculateEscalationLevel,
  escalateActionItem,
  processEscalations,
  getEscalationStats,
}

export default actionItemsApi
