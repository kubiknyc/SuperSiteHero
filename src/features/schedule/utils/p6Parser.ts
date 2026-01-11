/**
 * Primavera P6 Parser Utility
 *
 * Comprehensive parsers for Primavera P6 XER and XML export formats.
 * Extracts activities, WBS, calendars, resources, and dependencies.
 */

import { format, parseISO, differenceInDays } from 'date-fns'
import type {
  ActivityType,
  DependencyType,
  ResourceType,
} from '@/types/schedule-activities'

// =============================================
// Types
// =============================================

export interface P6Activity {
  task_id: string
  task_code: string
  task_name: string
  wbs_id: string
  wbs_code?: string
  wbs_name?: string
  task_type: string
  duration_type?: string
  target_start_date: string
  target_end_date: string
  early_start_date?: string
  early_end_date?: string
  late_start_date?: string
  late_end_date?: string
  actual_start_date?: string
  actual_end_date?: string
  target_drtn_hr_cnt: number
  remain_drtn_hr_cnt?: number
  phys_complete_pct: number
  total_float_hr_cnt?: number
  free_float_hr_cnt?: number
  is_critical?: boolean
  calendar_id?: string
  rsrc_id?: string
  task_comments?: string
}

export interface P6WBS {
  wbs_id: string
  parent_wbs_id?: string
  wbs_short_name: string
  wbs_name: string
  seq_num?: number
}

export interface P6Calendar {
  clndr_id: string
  clndr_name: string
  clndr_type?: string
  day_hr_cnt?: number
  week_hr_cnt?: number
  default_flag?: boolean
  // Work days configuration
  work_days?: {
    sunday: number
    monday: number
    tuesday: number
    wednesday: number
    thursday: number
    friday: number
    saturday: number
  }
}

export interface P6CalendarException {
  clndr_id: string
  exception_date: string
  exception_name?: string
  is_working: boolean
  work_hours?: number
}

export interface P6Resource {
  rsrc_id: string
  rsrc_short_name: string
  rsrc_name: string
  rsrc_type: string
  parent_rsrc_id?: string
  max_qty_per_hr?: number
  cost_per_qty?: number
  ot_cost_per_qty?: number
  clndr_id?: string
}

export interface P6ResourceAssignment {
  task_id: string
  rsrc_id: string
  target_qty?: number
  target_lag_drtn_hr_cnt?: number
  target_work_qty?: number
  act_work_qty?: number
  remain_work_qty?: number
  target_cost?: number
  act_cost?: number
  remain_cost?: number
}

export interface P6Predecessor {
  task_id: string
  pred_task_id: string
  pred_type: string
  lag_hr_cnt: number
}

export interface P6ProjectInfo {
  proj_id: string
  proj_short_name: string
  proj_name?: string
  last_recalc_date?: string
  plan_start_date?: string
  plan_end_date?: string
  scd_end_date?: string
  sum_data_date?: string
}

export interface ParsedP6Data {
  project: P6ProjectInfo | null
  activities: P6Activity[]
  wbs: P6WBS[]
  calendars: P6Calendar[]
  calendarExceptions: P6CalendarException[]
  resources: P6Resource[]
  resourceAssignments: P6ResourceAssignment[]
  predecessors: P6Predecessor[]
  errors: string[]
  warnings: string[]
}

// =============================================
// XER Record Parsing
// =============================================

interface XERRecord {
  [key: string]: string
}

interface XERTable {
  fields: string[]
  records: XERRecord[]
}

function parseXERLine(line: string, fields: string[]): XERRecord | null {
  if (!line.startsWith('%R')) {return null}
  const values = line.substring(2).split('\t')
  const record: XERRecord = {}
  fields.forEach((field, index) => {
    record[field] = values[index]?.trim() || ''
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

function parseXERNumber(numStr: string, defaultValue = 0): number {
  if (!numStr) {return defaultValue}
  const parsed = parseFloat(numStr)
  return isNaN(parsed) ? defaultValue : parsed
}

// =============================================
// XER Parser
// =============================================

export function parseXER(xerContent: string): ParsedP6Data {
  const errors: string[] = []
  const warnings: string[] = []
  const result: ParsedP6Data = {
    project: null,
    activities: [],
    wbs: [],
    calendars: [],
    calendarExceptions: [],
    resources: [],
    resourceAssignments: [],
    predecessors: [],
    errors: [],
    warnings: [],
  }

  try {
    const lines = xerContent.split('\n').map((l) => l.trim())

    // Tables and their fields
    const tables = new Map<string, XERTable>()
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
        currentFields = line.substring(2).split('\t').map((f) => f.trim())
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

    // Parse PROJECT table
    const projectTable = tables.get('PROJECT')
    if (projectTable && projectTable.records.length > 0) {
      const proj = projectTable.records[0]
      result.project = {
        proj_id: proj['proj_id'] || '',
        proj_short_name: proj['proj_short_name'] || '',
        proj_name: proj['proj_name'],
        last_recalc_date: parseXERDate(proj['last_recalc_date']),
        plan_start_date: parseXERDate(proj['plan_start_date']),
        plan_end_date: parseXERDate(proj['plan_end_date']),
        scd_end_date: parseXERDate(proj['scd_end_date']),
        sum_data_date: parseXERDate(proj['sum_data_date']),
      }
    }

    // Parse PROJWBS table
    const wbsTable = tables.get('PROJWBS')
    if (wbsTable) {
      wbsTable.records.forEach((wbs) => {
        result.wbs.push({
          wbs_id: wbs['wbs_id'] || '',
          parent_wbs_id: wbs['parent_wbs_id'] || undefined,
          wbs_short_name: wbs['wbs_short_name'] || '',
          wbs_name: wbs['wbs_name'] || '',
          seq_num: parseXERNumber(wbs['seq_num']),
        })
      })
    }

    // Create WBS lookup map
    const wbsMap = new Map<string, P6WBS>()
    result.wbs.forEach((wbs) => wbsMap.set(wbs.wbs_id, wbs))

    // Parse CALENDAR table
    const calendarTable = tables.get('CALENDAR')
    if (calendarTable) {
      calendarTable.records.forEach((cal) => {
        result.calendars.push({
          clndr_id: cal['clndr_id'] || '',
          clndr_name: cal['clndr_name'] || '',
          clndr_type: cal['clndr_type'],
          day_hr_cnt: parseXERNumber(cal['day_hr_cnt'], 8),
          week_hr_cnt: parseXERNumber(cal['week_hr_cnt'], 40),
          default_flag: cal['default_flag'] === 'Y',
        })
      })
    }

    // Parse EXCEPTIONN table (note: P6 uses EXCEPTIONN)
    const exceptionTable = tables.get('EXCEPTIONN') || tables.get('EXCEPTION')
    if (exceptionTable) {
      exceptionTable.records.forEach((exc) => {
        result.calendarExceptions.push({
          clndr_id: exc['clndr_id'] || '',
          exception_date: parseXERDate(exc['exception_date']),
          exception_name: exc['exception_name'],
          is_working: exc['exception_type'] === '1',
          work_hours: parseXERNumber(exc['exception_hr_cnt'], 0),
        })
      })
    }

    // Parse RSRC table (Resources)
    const rsrcTable = tables.get('RSRC')
    if (rsrcTable) {
      rsrcTable.records.forEach((rsrc) => {
        result.resources.push({
          rsrc_id: rsrc['rsrc_id'] || '',
          rsrc_short_name: rsrc['rsrc_short_name'] || '',
          rsrc_name: rsrc['rsrc_name'] || '',
          rsrc_type: rsrc['rsrc_type'] || 'RT_Labor',
          parent_rsrc_id: rsrc['parent_rsrc_id'] || undefined,
          max_qty_per_hr: parseXERNumber(rsrc['max_qty_per_hr'], 1),
          cost_per_qty: parseXERNumber(rsrc['cost_qty_per_hr']),
          ot_cost_per_qty: parseXERNumber(rsrc['ot_cost_qty_per_hr']),
          clndr_id: rsrc['clndr_id'] || undefined,
        })
      })
    }

    // Parse TASKRSRC table (Resource Assignments)
    const taskRsrcTable = tables.get('TASKRSRC')
    if (taskRsrcTable) {
      taskRsrcTable.records.forEach((tr) => {
        result.resourceAssignments.push({
          task_id: tr['task_id'] || '',
          rsrc_id: tr['rsrc_id'] || '',
          target_qty: parseXERNumber(tr['target_qty']),
          target_lag_drtn_hr_cnt: parseXERNumber(tr['target_lag_drtn_hr_cnt']),
          target_work_qty: parseXERNumber(tr['target_work_qty']),
          act_work_qty: parseXERNumber(tr['act_work_qty']),
          remain_work_qty: parseXERNumber(tr['remain_work_qty']),
          target_cost: parseXERNumber(tr['target_cost']),
          act_cost: parseXERNumber(tr['act_cost']),
          remain_cost: parseXERNumber(tr['remain_cost']),
        })
      })
    }

    // Parse TASKPRED table (Predecessors)
    const taskPredTable = tables.get('TASKPRED')
    if (taskPredTable) {
      taskPredTable.records.forEach((pred) => {
        result.predecessors.push({
          task_id: pred['task_id'] || '',
          pred_task_id: pred['pred_task_id'] || '',
          pred_type: pred['pred_type'] || 'PR_FS',
          lag_hr_cnt: parseXERNumber(pred['lag_hr_cnt'], 0),
        })
      })
    }

    // Parse TASK table (Activities)
    const taskTable = tables.get('TASK')
    if (!taskTable || taskTable.records.length === 0) {
      errors.push('No tasks found in XER file')
    } else {
      taskTable.records.forEach((task) => {
        const taskType = task['task_type'] || ''
        const wbsId = task['wbs_id'] || ''
        const wbs = wbsMap.get(wbsId)

        // Skip WBS summary tasks (they're handled separately)
        if (taskType === 'TT_WBS') {
          warnings.push(`Skipped WBS summary: ${task['task_name']}`)
          return
        }

        const targetStart = parseXERDate(task['target_start_date'] || task['early_start_date'])
        const targetEnd = parseXERDate(task['target_end_date'] || task['early_end_date'])

        if (!targetStart && !targetEnd && taskType !== 'TT_Mile') {
          errors.push(`Task "${task['task_name']}" has missing dates`)
          return
        }

        result.activities.push({
          task_id: task['task_id'] || '',
          task_code: task['task_code'] || '',
          task_name: task['task_name'] || '',
          wbs_id: wbsId,
          wbs_code: wbs?.wbs_short_name,
          wbs_name: wbs?.wbs_name,
          task_type: taskType,
          duration_type: task['duration_type'],
          target_start_date: targetStart || targetEnd,
          target_end_date: targetEnd || targetStart,
          early_start_date: parseXERDate(task['early_start_date']),
          early_end_date: parseXERDate(task['early_end_date']),
          late_start_date: parseXERDate(task['late_start_date']),
          late_end_date: parseXERDate(task['late_end_date']),
          actual_start_date: parseXERDate(task['act_start_date']),
          actual_end_date: parseXERDate(task['act_end_date']),
          target_drtn_hr_cnt: parseXERNumber(task['target_drtn_hr_cnt'], 8),
          remain_drtn_hr_cnt: parseXERNumber(task['remain_drtn_hr_cnt']),
          phys_complete_pct: parseXERNumber(task['phys_complete_pct'], 0),
          total_float_hr_cnt: parseXERNumber(task['total_float_hr_cnt']),
          free_float_hr_cnt: parseXERNumber(task['free_float_hr_cnt']),
          is_critical: parseXERNumber(task['total_float_hr_cnt']) <= 0,
          calendar_id: task['clndr_id'] || undefined,
          rsrc_id: task['rsrc_id'] || undefined,
          task_comments: task['task_comments'] || undefined,
        })
      })
    }

    if (result.activities.length === 0) {
      errors.push('No valid tasks could be parsed from XER file')
    }

    result.errors = errors
    result.warnings = warnings
    return result
  } catch (error) {
    errors.push(`Failed to parse XER: ${error instanceof Error ? error.message : 'Unknown error'}`)
    result.errors = errors
    return result
  }
}

// =============================================
// P6 XML Parser
// =============================================

function getElementText(parent: Element, tagName: string): string | undefined {
  const element = parent.querySelector(tagName)
  return element?.textContent?.trim() || undefined
}

function getElementNumber(parent: Element, tagName: string, defaultValue = 0): number {
  const text = getElementText(parent, tagName)
  if (!text) {return defaultValue}
  const parsed = parseFloat(text)
  return isNaN(parsed) ? defaultValue : parsed
}

function getElementBool(parent: Element, tagName: string): boolean {
  const text = getElementText(parent, tagName)
  return text === '1' || text?.toLowerCase() === 'true' || text === 'Y'
}

function parseP6XMLDate(dateStr: string | undefined): string {
  if (!dateStr) {return ''}
  try {
    // P6 XML date format: "2024-01-15T08:00:00" or just "2024-01-15"
    const datePart = dateStr.split('T')[0]
    return datePart
  } catch {
    return ''
  }
}

export function parseP6XML(xmlContent: string): ParsedP6Data {
  const errors: string[] = []
  const warnings: string[] = []
  const result: ParsedP6Data = {
    project: null,
    activities: [],
    wbs: [],
    calendars: [],
    calendarExceptions: [],
    resources: [],
    resourceAssignments: [],
    predecessors: [],
    errors: [],
    warnings: [],
  }

  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(xmlContent, 'text/xml')

    const parseError = doc.querySelector('parsererror')
    if (parseError) {
      errors.push(`XML parsing error: ${parseError.textContent}`)
      result.errors = errors
      return result
    }

    // Determine XML format (P6 PMXML or regular P6 XML)
    const isPMXML = doc.querySelector('APIBusinessObjects') !== null
    const projectRoot = isPMXML
      ? doc.querySelector('Project')
      : doc.querySelector('Projects > Project') || doc.querySelector('Project')

    if (!projectRoot) {
      errors.push('No Project element found in XML')
      result.errors = errors
      return result
    }

    // Parse Project Info
    result.project = {
      proj_id: getElementText(projectRoot, 'ObjectId') || getElementText(projectRoot, 'Id') || '',
      proj_short_name: getElementText(projectRoot, 'Id') || getElementText(projectRoot, 'Name') || '',
      proj_name: getElementText(projectRoot, 'Name'),
      last_recalc_date: parseP6XMLDate(getElementText(projectRoot, 'DataDate')),
      plan_start_date: parseP6XMLDate(getElementText(projectRoot, 'PlannedStartDate') || getElementText(projectRoot, 'StartDate')),
      plan_end_date: parseP6XMLDate(getElementText(projectRoot, 'MustFinishByDate') || getElementText(projectRoot, 'FinishDate')),
    }

    // Parse WBS
    const wbsElements = doc.querySelectorAll('WBS')
    wbsElements.forEach((wbsEl) => {
      result.wbs.push({
        wbs_id: getElementText(wbsEl, 'ObjectId') || getElementText(wbsEl, 'WBSObjectId') || '',
        parent_wbs_id: getElementText(wbsEl, 'ParentObjectId') || undefined,
        wbs_short_name: getElementText(wbsEl, 'Code') || '',
        wbs_name: getElementText(wbsEl, 'Name') || '',
        seq_num: getElementNumber(wbsEl, 'SequenceNumber'),
      })
    })

    // Create WBS lookup map
    const wbsMap = new Map<string, P6WBS>()
    result.wbs.forEach((wbs) => wbsMap.set(wbs.wbs_id, wbs))

    // Parse Calendars
    const calendarElements = doc.querySelectorAll('Calendar')
    calendarElements.forEach((calEl) => {
      result.calendars.push({
        clndr_id: getElementText(calEl, 'ObjectId') || '',
        clndr_name: getElementText(calEl, 'Name') || '',
        clndr_type: getElementText(calEl, 'Type'),
        day_hr_cnt: getElementNumber(calEl, 'HoursPerDay', 8),
        week_hr_cnt: getElementNumber(calEl, 'HoursPerWeek', 40),
        default_flag: getElementBool(calEl, 'IsDefault'),
      })
    })

    // Parse Resources
    const resourceElements = doc.querySelectorAll('Resource')
    resourceElements.forEach((rsrcEl) => {
      result.resources.push({
        rsrc_id: getElementText(rsrcEl, 'ObjectId') || '',
        rsrc_short_name: getElementText(rsrcEl, 'Id') || '',
        rsrc_name: getElementText(rsrcEl, 'Name') || '',
        rsrc_type: getElementText(rsrcEl, 'ResourceType') || 'RT_Labor',
        parent_rsrc_id: getElementText(rsrcEl, 'ParentObjectId'),
        max_qty_per_hr: getElementNumber(rsrcEl, 'MaxUnitsPerTime', 1),
        cost_per_qty: getElementNumber(rsrcEl, 'PricePerUnit'),
        clndr_id: getElementText(rsrcEl, 'CalendarObjectId'),
      })
    })

    // Parse Activities
    const activityElements = doc.querySelectorAll('Activity')
    if (activityElements.length === 0) {
      errors.push('No activities found in XML')
    } else {
      activityElements.forEach((actEl) => {
        const actType = getElementText(actEl, 'Type') || 'TaskDependent'
        const wbsId = getElementText(actEl, 'WBSObjectId') || ''
        const wbs = wbsMap.get(wbsId)

        // Skip WBS summary type
        if (actType === 'WBS Summary') {
          warnings.push(`Skipped WBS summary: ${getElementText(actEl, 'Name')}`)
          return
        }

        const startDate = parseP6XMLDate(
          getElementText(actEl, 'PlannedStartDate') ||
          getElementText(actEl, 'StartDate') ||
          getElementText(actEl, 'EarlyStartDate')
        )
        const finishDate = parseP6XMLDate(
          getElementText(actEl, 'PlannedFinishDate') ||
          getElementText(actEl, 'FinishDate') ||
          getElementText(actEl, 'EarlyFinishDate')
        )

        if (!startDate && !finishDate && actType !== 'StartMilestone' && actType !== 'FinishMilestone') {
          errors.push(`Activity "${getElementText(actEl, 'Name')}" has missing dates`)
          return
        }

        const isMilestone = actType === 'StartMilestone' || actType === 'FinishMilestone'
        const durationHours = getElementNumber(actEl, 'PlannedDuration') ||
          getElementNumber(actEl, 'AtCompletionDuration', isMilestone ? 0 : 8)

        result.activities.push({
          task_id: getElementText(actEl, 'ObjectId') || '',
          task_code: getElementText(actEl, 'Id') || '',
          task_name: getElementText(actEl, 'Name') || '',
          wbs_id: wbsId,
          wbs_code: wbs?.wbs_short_name,
          wbs_name: wbs?.wbs_name,
          task_type: actType,
          duration_type: getElementText(actEl, 'DurationType'),
          target_start_date: startDate || finishDate,
          target_end_date: finishDate || startDate,
          early_start_date: parseP6XMLDate(getElementText(actEl, 'EarlyStartDate')),
          early_end_date: parseP6XMLDate(getElementText(actEl, 'EarlyFinishDate')),
          late_start_date: parseP6XMLDate(getElementText(actEl, 'LateStartDate')),
          late_end_date: parseP6XMLDate(getElementText(actEl, 'LateFinishDate')),
          actual_start_date: parseP6XMLDate(getElementText(actEl, 'ActualStartDate')),
          actual_end_date: parseP6XMLDate(getElementText(actEl, 'ActualFinishDate')),
          target_drtn_hr_cnt: durationHours,
          remain_drtn_hr_cnt: getElementNumber(actEl, 'RemainingDuration'),
          phys_complete_pct: getElementNumber(actEl, 'PhysicalPercentComplete') ||
            getElementNumber(actEl, 'PercentComplete', 0),
          total_float_hr_cnt: getElementNumber(actEl, 'TotalFloat'),
          free_float_hr_cnt: getElementNumber(actEl, 'FreeFloat'),
          is_critical: getElementBool(actEl, 'IsCritical') || getElementNumber(actEl, 'TotalFloat') <= 0,
          calendar_id: getElementText(actEl, 'CalendarObjectId'),
          task_comments: getElementText(actEl, 'NotebookTopics') || undefined,
        })
      })
    }

    // Parse Relationships (Dependencies)
    const relationshipElements = doc.querySelectorAll('Relationship')
    relationshipElements.forEach((relEl) => {
      result.predecessors.push({
        task_id: getElementText(relEl, 'SuccessorActivityObjectId') || '',
        pred_task_id: getElementText(relEl, 'PredecessorActivityObjectId') || '',
        pred_type: convertP6XMLRelationType(getElementText(relEl, 'Type') || 'FinishToStart'),
        lag_hr_cnt: getElementNumber(relEl, 'Lag', 0) * 8, // Convert days to hours
      })
    })

    // Parse Resource Assignments
    const assignmentElements = doc.querySelectorAll('ResourceAssignment')
    assignmentElements.forEach((assignEl) => {
      result.resourceAssignments.push({
        task_id: getElementText(assignEl, 'ActivityObjectId') || '',
        rsrc_id: getElementText(assignEl, 'ResourceObjectId') || '',
        target_qty: getElementNumber(assignEl, 'PlannedUnitsPerTime'),
        target_work_qty: getElementNumber(assignEl, 'PlannedUnits'),
        act_work_qty: getElementNumber(assignEl, 'ActualUnits'),
        remain_work_qty: getElementNumber(assignEl, 'RemainingUnits'),
        target_cost: getElementNumber(assignEl, 'PlannedCost'),
        act_cost: getElementNumber(assignEl, 'ActualCost'),
        remain_cost: getElementNumber(assignEl, 'RemainingCost'),
      })
    })

    if (result.activities.length === 0) {
      errors.push('No valid activities could be parsed from XML')
    }

    result.errors = errors
    result.warnings = warnings
    return result
  } catch (error) {
    errors.push(`Failed to parse P6 XML: ${error instanceof Error ? error.message : 'Unknown error'}`)
    result.errors = errors
    return result
  }
}

function convertP6XMLRelationType(type: string): string {
  switch (type) {
    case 'FinishToStart':
      return 'PR_FS'
    case 'FinishToFinish':
      return 'PR_FF'
    case 'StartToStart':
      return 'PR_SS'
    case 'StartToFinish':
      return 'PR_SF'
    default:
      return 'PR_FS'
  }
}

// =============================================
// Conversion Helpers
// =============================================

export function convertP6ActivityType(p6Type: string): ActivityType {
  switch (p6Type) {
    case 'TT_Task':
    case 'TaskDependent':
    case 'ResourceDependent':
      return 'task'
    case 'TT_Mile':
    case 'StartMilestone':
    case 'FinishMilestone':
      return 'milestone'
    case 'TT_WBS':
    case 'WBS Summary':
      return 'wbs_summary'
    case 'TT_LOE':
    case 'LevelOfEffort':
      return 'level_of_effort'
    case 'TT_Hammock':
      return 'hammock'
    default:
      return 'task'
  }
}

export function convertP6DependencyType(p6Type: string): DependencyType {
  switch (p6Type) {
    case 'PR_FF':
      return 'FF'
    case 'PR_FS':
      return 'FS'
    case 'PR_SF':
      return 'SF'
    case 'PR_SS':
      return 'SS'
    default:
      return 'FS'
  }
}

export function convertP6ResourceType(p6Type: string): ResourceType {
  switch (p6Type) {
    case 'RT_Labor':
      return 'labor'
    case 'RT_Equip':
      return 'equipment'
    case 'RT_Mat':
      return 'material'
    default:
      return 'labor'
  }
}

// =============================================
// File Detection & Unified Parser
// =============================================

export function detectP6FileFormat(content: string): 'xer' | 'xml' | 'unknown' {
  const trimmed = content.trim()

  if (trimmed.includes('%T\t') || trimmed.includes('%F\t') || trimmed.startsWith('ERMHDR')) {
    return 'xer'
  }

  if (trimmed.startsWith('<?xml') || trimmed.startsWith('<') && trimmed.includes('</')) {
    return 'xml'
  }

  return 'unknown'
}

export async function parseP6File(file: File): Promise<ParsedP6Data> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (event) => {
      try {
        const content = event.target?.result as string
        const fileName = file.name.toLowerCase()

        let format: 'xer' | 'xml' | 'unknown'

        if (fileName.endsWith('.xer')) {
          format = 'xer'
        } else if (fileName.endsWith('.xml')) {
          format = 'xml'
        } else {
          format = detectP6FileFormat(content)
        }

        if (format === 'xer') {
          resolve(parseXER(content))
        } else if (format === 'xml') {
          resolve(parseP6XML(content))
        } else {
          reject(new Error('Unable to detect P6 file format. Please use .xer or .xml files.'))
        }
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

// =============================================
// Validation
// =============================================

export function validateP6Data(data: ParsedP6Data): { isValid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [...data.errors]
  const warnings: string[] = [...data.warnings]

  // Check for duplicate activity IDs
  const activityIds = new Set<string>()
  data.activities.forEach((activity) => {
    if (activityIds.has(activity.task_id)) {
      warnings.push(`Duplicate activity ID: ${activity.task_code || activity.task_id}`)
    }
    activityIds.add(activity.task_id)
  })

  // Check for orphaned predecessors
  data.predecessors.forEach((pred) => {
    if (!activityIds.has(pred.task_id)) {
      warnings.push(`Predecessor references unknown task: ${pred.task_id}`)
    }
    if (!activityIds.has(pred.pred_task_id)) {
      warnings.push(`Predecessor references unknown predecessor: ${pred.pred_task_id}`)
    }
  })

  // Check for date inconsistencies
  data.activities.forEach((activity) => {
    if (activity.target_start_date && activity.target_end_date) {
      try {
        const start = parseISO(activity.target_start_date)
        const end = parseISO(activity.target_end_date)
        if (start > end && activity.task_type !== 'TT_Mile') {
          errors.push(`Activity "${activity.task_name}" has start date after end date`)
        }
      } catch {
        // Date parsing error already handled
      }
    }
  })

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  }
}

// =============================================
// Summary Statistics
// =============================================

export function getP6ImportSummary(data: ParsedP6Data) {
  const activities = data.activities
  const milestones = activities.filter((a) =>
    a.task_type === 'TT_Mile' ||
    a.task_type === 'StartMilestone' ||
    a.task_type === 'FinishMilestone'
  )

  const starts = activities
    .filter((a) => a.target_start_date)
    .map((a) => a.target_start_date)
    .sort()

  const ends = activities
    .filter((a) => a.target_end_date)
    .map((a) => a.target_end_date)
    .sort()

  return {
    projectName: data.project?.proj_name || data.project?.proj_short_name || 'Unknown Project',
    dataDate: data.project?.last_recalc_date || null,
    totalActivities: activities.length,
    milestones: milestones.length,
    wbsElements: data.wbs.length,
    calendars: data.calendars.length,
    resources: data.resources.length,
    resourceAssignments: data.resourceAssignments.length,
    predecessors: data.predecessors.length,
    criticalActivities: activities.filter((a) => a.is_critical).length,
    dateRange: {
      start: starts[0] || null,
      end: ends[ends.length - 1] || null,
    },
  }
}
