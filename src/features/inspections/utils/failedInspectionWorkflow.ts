/**
 * Failed Inspection Workflow Utilities
 *
 * Functions for handling failed inspections:
 * - Creating tasks from corrective actions
 * - Creating punch items from failure reasons
 * - Scheduling reinspections
 */

import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/utils/logger'
import type { Inspection } from '../types'

export interface CreateTaskFromInspectionInput {
  projectId: string
  inspectionId: string
  title: string
  description: string
  dueDate?: string
  assigneeId?: string
  createdBy: string
}

export interface CreatePunchItemFromInspectionInput {
  projectId: string
  inspectionId: string
  description: string
  location?: string
  assigneeId?: string
  createdBy: string
}

/**
 * Create a task from a failed inspection corrective action
 */
export async function createTaskFromInspection(
  input: CreateTaskFromInspectionInput
): Promise<{ id: string } | null> {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        project_id: input.projectId,
        title: input.title,
        description: `${input.description}\n\n---\nCreated from failed inspection`,
        status: 'not_started',
        priority: 'high',
        due_date: input.dueDate,
        assigned_to: input.assigneeId,
        created_by: input.createdBy,
        // Reference to inspection for traceability
        // Note: You may need to add an inspection_id column to tasks table
      })
      .select('id')
      .single()

    if (error) {
      logger.error('Failed to create task from inspection:', error)
      return null
    }

    return data
  } catch (_error) {
    logger.error('Error creating task from inspection:', _error)
    return null
  }
}

/**
 * Create a punch item from a failed inspection issue
 */
export async function createPunchItemFromInspection(
  input: CreatePunchItemFromInspectionInput
): Promise<{ id: string } | null> {
  try {
    const { data, error } = await supabase
      .from('punch_items')
      .insert({
        project_id: input.projectId,
        title: `Inspection Issue: ${input.description.substring(0, 100)}`,
        description: input.description,
        trade: 'General', // Default trade for inspection-generated items
        location_notes: input.location || 'See inspection for details',
        status: 'open',
        priority: 'high',
        assigned_to: input.assigneeId,
        created_by: input.createdBy,
        // Reference to inspection for traceability
        // Note: You may need to add an inspection_id column to punch_items table
      })
      .select('id')
      .single()

    if (error) {
      logger.error('Failed to create punch item from inspection:', error)
      return null
    }

    return data
  } catch (_error) {
    logger.error('Error creating punch item from inspection:', _error)
    return null
  }
}

/**
 * Parse corrective actions text into individual items
 * Handles various formats: numbered lists, bullet points, line breaks
 */
export function parseCorrectiveActions(text: string): string[] {
  if (!text) {return []}

  // Split by common list delimiters
  const lines = text
    .split(/[\n\r]+/) // Split by newlines
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      // Remove leading numbers, bullets, dashes
      return line
        .replace(/^[\d]+[.)]\s*/, '') // "1. " or "1) "
        .replace(/^[-•*]\s*/, '') // "- ", "• ", "* "
        .trim()
    })
    .filter((line) => line.length > 0)

  return lines
}

/**
 * Create tasks and punch items from a failed inspection
 */
export async function processFailedInspection(
  inspection: Inspection,
  options: {
    createTasks: boolean
    createPunchItems: boolean
    createdBy: string
    assigneeId?: string
  }
): Promise<{
  tasksCreated: number
  punchItemsCreated: number
  errors: string[]
}> {
  const result = {
    tasksCreated: 0,
    punchItemsCreated: 0,
    errors: [] as string[],
  }

  // Parse corrective actions
  const correctiveActions = parseCorrectiveActions(
    inspection.corrective_actions_required || ''
  )

  // Parse failure reasons for punch items
  const failureReasons = parseCorrectiveActions(
    inspection.failure_reasons || ''
  )

  // Create tasks from corrective actions
  if (options.createTasks && correctiveActions.length > 0) {
    for (const action of correctiveActions) {
      const taskResult = await createTaskFromInspection({
        projectId: inspection.project_id,
        inspectionId: inspection.id,
        title: `Corrective Action: ${action.substring(0, 100)}`,
        description: action,
        dueDate: inspection.reinspection_scheduled_date || undefined,
        assigneeId: options.assigneeId,
        createdBy: options.createdBy,
      })

      if (taskResult) {
        result.tasksCreated++
      } else {
        result.errors.push(`Failed to create task: ${action.substring(0, 50)}...`)
      }
    }
  }

  // Create punch items from failure reasons
  if (options.createPunchItems && failureReasons.length > 0) {
    for (const reason of failureReasons) {
      const punchResult = await createPunchItemFromInspection({
        projectId: inspection.project_id,
        inspectionId: inspection.id,
        description: `Inspection Failure: ${reason}`,
        assigneeId: options.assigneeId,
        createdBy: options.createdBy,
      })

      if (punchResult) {
        result.punchItemsCreated++
      } else {
        result.errors.push(
          `Failed to create punch item: ${reason.substring(0, 50)}...`
        )
      }
    }
  }

  return result
}

/**
 * Check if inspection is overdue
 */
export function isInspectionOverdue(inspection: Inspection): boolean {
  if (!inspection.scheduled_date || inspection.status !== 'scheduled') {
    return false
  }

  const scheduledDate = new Date(inspection.scheduled_date)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return scheduledDate < today
}

/**
 * Get days until inspection
 * Returns negative number if overdue
 */
export function getDaysUntilInspection(inspection: Inspection): number | null {
  if (!inspection.scheduled_date) {
    return null
  }

  const scheduledDate = new Date(inspection.scheduled_date)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  scheduledDate.setHours(0, 0, 0, 0)

  const diffTime = scheduledDate.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  return diffDays
}

/**
 * Check if inspection reminder should be sent
 */
export function shouldSendReminder(inspection: Inspection): boolean {
  if (!inspection.scheduled_date || !inspection.reminder_days_before) {
    return false
  }

  if (inspection.reminder_sent) {
    return false
  }

  if (inspection.status !== 'scheduled') {
    return false
  }

  const daysUntil = getDaysUntilInspection(inspection)
  if (daysUntil === null) {
    return false
  }

  return daysUntil <= inspection.reminder_days_before && daysUntil >= 0
}
