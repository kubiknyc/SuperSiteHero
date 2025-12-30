/**
 * Schedule Import Utilities
 *
 * Parsers for MS Project XML and Primavera P6 XER formats.
 * Maps imported data to CreateScheduleActivityDTO format.
 */

import { format, parseISO, differenceInDays } from 'date-fns'
import type {
  CreateScheduleActivityDTO,
  DependencyType,
  ActivityType,
} from '@/types/schedule-activities'

// =============================================
// Types
// =============================================

export interface ImportedActivity {
  activity_id: string
  name: string
  description?: string
  wbs_code?: string
  planned_start: string
  planned_finish: string
  planned_duration: number
  percent_complete: number
  is_milestone: boolean
  activity_type: ActivityType
  notes?: string
  external_id?: string
  predecessors: {
    external_id: string
    type: DependencyType
    lag_days: number
  }[]
}

export interface ParsedScheduleData {
  activities: ImportedActivity[]
  errors: string[]
  warnings: string[]
  sourceSystem: 'ms_project' | 'primavera_p6'
  projectName?: string
  dataDate?: string
}

// =============================================
// MS Project XML Parser
// =============================================

function getElementText(parent: Element, tagName: string): string | undefined {
  const element = parent.querySelector(tagName)
  return element?.textContent || undefined
}

function getElementBool(parent: Element, tagName: string): boolean {
  const text = getElementText(parent, tagName)
  return text === '1' || text?.toLowerCase() === 'true'
}

function getElementNumber(parent: Element, tagName: string): number {
  const text = getElementText(parent, tagName)
  return text ? parseInt(text, 10) : 0
}

function parseMSProjectDate(dateStr: string): string {
  try {
    const date = parseISO(dateStr)
    return format(date, 'yyyy-MM-dd')
  } catch {
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) {
      return format(new Date(), 'yyyy-MM-dd')
    }
    return format(date, 'yyyy-MM-dd')
  }
}

function parseMSProjectDuration(duration: string | undefined): number {
  if (!duration) {return 1}
  const daysMatch = duration.match(/P(\d+)D/)
  if (daysMatch) {return parseInt(daysMatch[1], 10)}
  const hoursMatch = duration.match(/PT(\d+)H/)
  if (hoursMatch) {return Math.ceil(parseInt(hoursMatch[1], 10) / 8)}
  return 1
}

function convertMSProjectDependencyType(msType: number): DependencyType {
  switch (msType) {
    case 0: return 'FF'
    case 1: return 'FS'
    case 2: return 'SF'
    case 3: return 'SS'
    default: return 'FS'
  }
}

export function parseMSProjectXML(xmlContent: string): ParsedScheduleData {
  const errors: string[] = []
  const warnings: string[] = []
  const activities: ImportedActivity[] = []

  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(xmlContent, 'text/xml')

    const parseError = doc.querySelector('parsererror')
    if (parseError) {
      errors.push(`XML parsing error: ${parseError.textContent}`)
      return { activities, errors, warnings, sourceSystem: 'ms_project' }
    }

    // Get project name
    const projectName = getElementText(doc.documentElement, 'Name') ||
      getElementText(doc.documentElement, 'Title')

    const taskElements = doc.querySelectorAll('Task')
    if (taskElements.length === 0) {
      errors.push('No tasks found in the XML file')
      return { activities, errors, warnings, sourceSystem: 'ms_project', projectName }
    }

    // Map UID to activity for dependency resolution
    const uidMap = new Map<string, { index: number; name: string }>()

    taskElements.forEach((taskEl, index) => {
      const uid = getElementText(taskEl, 'UID')
      const id = getElementText(taskEl, 'ID')
      const name = getElementText(taskEl, 'Name')

      // Skip project summary (ID 0)
      if (id === '0' || !name) {return}

      // Skip summary tasks
      if (getElementBool(taskEl, 'Summary')) {
        warnings.push(`Skipped summary task: ${name}`)
        return
      }

      const start = getElementText(taskEl, 'Start')
      const finish = getElementText(taskEl, 'Finish')

      if (!start || !finish) {
        errors.push(`Task "${name}" has missing dates`)
        return
      }

      const startDate = parseMSProjectDate(start)
      const finishDate = parseMSProjectDate(finish)
      const duration = parseMSProjectDuration(getElementText(taskEl, 'Duration')) ||
        Math.max(1, differenceInDays(parseISO(finishDate), parseISO(startDate)) + 1)

      const isMilestone = getElementBool(taskEl, 'Milestone')

      // Parse predecessors
      const predecessors: ImportedActivity['predecessors'] = []
      const predecessorElements = taskEl.querySelectorAll('PredecessorLink')
      predecessorElements.forEach((predEl) => {
        const predecessorUID = getElementText(predEl, 'PredecessorUID')
        const type = getElementNumber(predEl, 'Type')
        const lagText = getElementText(predEl, 'LinkLag')
        const lag = lagText ? Math.round(parseInt(lagText, 10) / (8 * 60 * 10)) : 0

        if (predecessorUID) {
          predecessors.push({
            external_id: predecessorUID,
            type: convertMSProjectDependencyType(type),
            lag_days: lag,
          })
        }
      })

      const activity: ImportedActivity = {
        activity_id: `MSP-${id || uid || String(index)}`,
        name,
        description: getElementText(taskEl, 'Notes'),
        wbs_code: getElementText(taskEl, 'WBS'),
        planned_start: startDate,
        planned_finish: finishDate,
        planned_duration: isMilestone ? 0 : duration,
        percent_complete: getElementNumber(taskEl, 'PercentComplete'),
        is_milestone: isMilestone,
        activity_type: isMilestone ? 'milestone' : 'task',
        notes: getElementText(taskEl, 'Notes'),
        external_id: uid,
        predecessors,
      }

      uidMap.set(uid || String(index), { index: activities.length, name })
      activities.push(activity)
    })

    if (activities.length === 0) {
      errors.push('No valid tasks could be imported')
    }

    return { activities, errors, warnings, sourceSystem: 'ms_project', projectName }
  } catch (error) {
    errors.push(`Failed to parse MS Project XML: ${error instanceof Error ? error.message : 'Unknown error'}`)
    return { activities, errors, warnings, sourceSystem: 'ms_project' }
  }
}

// =============================================
// Primavera P6 XER Parser
// =============================================

interface XERRecord {
  [key: string]: string
}

function parseXERLine(line: string, fields: string[]): XERRecord | null {
  if (!line.startsWith('%R')) {return null}
  const values = line.substring(2).split('\t')
  const record: XERRecord = {}
  fields.forEach((field, index) => {
    record[field] = values[index] || ''
  })
  return record
}

function parseXERDate(dateStr: string): string {
  if (!dateStr) {return ''}
  try {
    // P6 date format: "2024-01-15 08:00" or "2024-01-15"
    const datePart = dateStr.split(' ')[0]
    return datePart
  } catch {
    return ''
  }
}

function convertP6DependencyType(p6Type: string): DependencyType {
  switch (p6Type) {
    case 'PR_FF': return 'FF'
    case 'PR_FS': return 'FS'
    case 'PR_SF': return 'SF'
    case 'PR_SS': return 'SS'
    default: return 'FS'
  }
}

function convertP6ActivityType(p6Type: string): ActivityType {
  switch (p6Type) {
    case 'TT_Task': return 'task'
    case 'TT_Mile': return 'milestone'
    case 'TT_WBS': return 'wbs_summary'
    case 'TT_LOE': return 'level_of_effort'
    case 'TT_Hammock': return 'hammock'
    default: return 'task'
  }
}

export function parsePrimaveraXER(xerContent: string): ParsedScheduleData {
  const errors: string[] = []
  const warnings: string[] = []
  const activities: ImportedActivity[] = []
  let projectName: string | undefined
  let dataDate: string | undefined

  try {
    const lines = xerContent.split('\n').map(l => l.trim())

    // Tables and their fields
    const tables: Map<string, { fields: string[]; records: XERRecord[] }> = new Map()
    let currentTable: string | null = null
    let currentFields: string[] = []

    // Parse XER format
    for (const line of lines) {
      if (line.startsWith('%T')) {
        // Table definition
        currentTable = line.substring(2).trim()
        tables.set(currentTable, { fields: [], records: [] })
      } else if (line.startsWith('%F') && currentTable) {
        // Field definitions
        currentFields = line.substring(2).split('\t')
        const table = tables.get(currentTable)
        if (table) {table.fields = currentFields}
      } else if (line.startsWith('%R') && currentTable) {
        // Record
        const table = tables.get(currentTable)
        if (table) {
          const record = parseXERLine(line, table.fields)
          if (record) {table.records.push(record)}
        }
      }
    }

    // Get project info
    const projects = tables.get('PROJECT')
    if (projects && projects.records.length > 0) {
      const proj = projects.records[0]
      projectName = proj['proj_short_name'] || proj['proj_name']
      dataDate = parseXERDate(proj['last_recalc_date'])
    }

    // Get WBS mapping
    const wbsMap = new Map<string, string>()
    const wbsTable = tables.get('PROJWBS')
    if (wbsTable) {
      wbsTable.records.forEach((wbs) => {
        wbsMap.set(wbs['wbs_id'], wbs['wbs_short_name'] || wbs['wbs_name'])
      })
    }

    // Get tasks (TASK table)
    const taskTable = tables.get('TASK')
    if (!taskTable || taskTable.records.length === 0) {
      errors.push('No tasks found in XER file')
      return { activities, errors, warnings, sourceSystem: 'primavera_p6', projectName, dataDate }
    }

    // Get relationships (TASKPRED table)
    const predTable = tables.get('TASKPRED')
    const predecessorsByTask = new Map<string, ImportedActivity['predecessors']>()

    if (predTable) {
      predTable.records.forEach((pred) => {
        const taskId = pred['task_id']
        const predTaskId = pred['pred_task_id']
        const predType = pred['pred_type']
        const lagDays = parseInt(pred['lag_hr_cnt'] || '0', 10) / 8 // Convert hours to days

        if (!predecessorsByTask.has(taskId)) {
          predecessorsByTask.set(taskId, [])
        }
        predecessorsByTask.get(taskId)!.push({
          external_id: predTaskId,
          type: convertP6DependencyType(predType),
          lag_days: Math.round(lagDays),
        })
      })
    }

    // Map task_id to index for later
    const taskIdMap = new Map<string, number>()

    // Process tasks
    taskTable.records.forEach((task, _index) => {
      const taskId = task['task_id']
      const taskCode = task['task_code']
      const taskName = task['task_name']
      const taskType = task['task_type']

      // Skip LOE and WBS summary tasks if desired
      if (taskType === 'TT_WBS') {
        warnings.push(`Skipped WBS summary: ${taskName}`)
        return
      }

      const plannedStart = parseXERDate(task['target_start_date'] || task['early_start_date'])
      const plannedFinish = parseXERDate(task['target_end_date'] || task['early_end_date'])

      if (!plannedStart || !plannedFinish) {
        if (taskType !== 'TT_Mile') {
          errors.push(`Task "${taskName}" has missing dates`)
          return
        }
      }

      const isMilestone = taskType === 'TT_Mile'
      const duration = parseInt(task['target_drtn_hr_cnt'] || '0', 10) / 8 // Convert hours to days

      const activity: ImportedActivity = {
        activity_id: taskCode || `P6-${taskId}`,
        name: taskName,
        description: task['task_comments'] || undefined,
        wbs_code: wbsMap.get(task['wbs_id']) || undefined,
        planned_start: plannedStart || plannedFinish,
        planned_finish: plannedFinish || plannedStart,
        planned_duration: isMilestone ? 0 : Math.max(1, Math.round(duration)),
        percent_complete: parseFloat(task['phys_complete_pct'] || '0'),
        is_milestone: isMilestone,
        activity_type: convertP6ActivityType(taskType),
        notes: task['task_comments'] || undefined,
        external_id: taskId,
        predecessors: predecessorsByTask.get(taskId) || [],
      }

      taskIdMap.set(taskId, activities.length)
      activities.push(activity)
    })

    if (activities.length === 0) {
      errors.push('No valid tasks could be imported')
    }

    return { activities, errors, warnings, sourceSystem: 'primavera_p6', projectName, dataDate }
  } catch (error) {
    errors.push(`Failed to parse P6 XER: ${error instanceof Error ? error.message : 'Unknown error'}`)
    return { activities, errors, warnings, sourceSystem: 'primavera_p6' }
  }
}

// =============================================
// Common Functions
// =============================================

/**
 * Detect file format and parse accordingly
 */
export async function parseScheduleFile(file: File): Promise<ParsedScheduleData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (event) => {
      try {
        const content = event.target?.result as string
        const fileName = file.name.toLowerCase()

        let result: ParsedScheduleData

        if (fileName.endsWith('.xml')) {
          result = parseMSProjectXML(content)
        } else if (fileName.endsWith('.xer')) {
          result = parsePrimaveraXER(content)
        } else {
          // Try to detect format from content
          if (content.trim().startsWith('<?xml') || content.includes('<Project')) {
            result = parseMSProjectXML(content)
          } else if (content.includes('%T\t') || content.includes('%F\t')) {
            result = parsePrimaveraXER(content)
          } else {
            reject(new Error('Unsupported file format. Please use MS Project XML (.xml) or Primavera P6 XER (.xer)'))
            return
          }
        }

        // Validate
        const validation = validateParsedSchedule(result)
        resolve({
          ...result,
          errors: [...result.errors, ...validation.errors],
          warnings: [...result.warnings, ...validation.warnings],
        })
      } catch (error) {
        reject(error)
      }
    }

    reader.onerror = () => {
      reject(new Error('Failed to read file'))
    }

    reader.readAsText(file)
  })
}

/**
 * Validate parsed schedule data
 */
export function validateParsedSchedule(parsed: ParsedScheduleData): {
  isValid: boolean
  errors: string[]
  warnings: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []

  // Check for duplicate activity IDs
  const idCount = new Map<string, number>()
  parsed.activities.forEach((activity) => {
    const count = idCount.get(activity.activity_id) || 0
    idCount.set(activity.activity_id, count + 1)
  })

  idCount.forEach((count, id) => {
    if (count > 1) {
      warnings.push(`Duplicate activity ID: "${id}" (${count} occurrences)`)
    }
  })

  // Validate dates
  parsed.activities.forEach((activity) => {
    if (activity.planned_start && activity.planned_finish) {
      const start = parseISO(activity.planned_start)
      const finish = parseISO(activity.planned_finish)
      if (start > finish && !activity.is_milestone) {
        errors.push(`Activity "${activity.name}" has start date after finish date`)
      }
    }
  })

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Convert imported activities to CreateScheduleActivityDTO format
 */
export function convertToActivityDTOs(
  activities: ImportedActivity[],
  _projectId: string,
  _companyId: string
): Omit<CreateScheduleActivityDTO, 'project_id' | 'company_id'>[] {
  return activities.map((activity, index) => ({
    activity_id: activity.activity_id,
    name: activity.name,
    description: activity.description,
    wbs_code: activity.wbs_code,
    planned_start: activity.planned_start,
    planned_finish: activity.planned_finish,
    planned_duration: activity.planned_duration,
    activity_type: activity.activity_type,
    is_milestone: activity.is_milestone,
    sort_order: index,
  }))
}

/**
 * Get summary statistics from parsed data
 */
export function getImportSummary(parsed: ParsedScheduleData): {
  totalActivities: number
  milestones: number
  tasksWithDates: number
  tasksWithPredecessors: number
  dateRange: { start: string | null; end: string | null }
} {
  const activities = parsed.activities

  const starts = activities
    .filter((a) => a.planned_start)
    .map((a) => a.planned_start)
    .sort()

  const ends = activities
    .filter((a) => a.planned_finish)
    .map((a) => a.planned_finish)
    .sort()

  return {
    totalActivities: activities.length,
    milestones: activities.filter((a) => a.is_milestone).length,
    tasksWithDates: activities.filter((a) => a.planned_start && a.planned_finish).length,
    tasksWithPredecessors: activities.filter((a) => a.predecessors.length > 0).length,
    dateRange: {
      start: starts[0] || null,
      end: ends[ends.length - 1] || null,
    },
  }
}
