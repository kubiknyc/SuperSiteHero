/**
 * MS Project XML Import Parser
 *
 * Parses Microsoft Project XML export format and converts to ScheduleItem format.
 * Supports both .xml exports and .mpp files that have been exported to XML.
 */

import { format, parseISO, differenceInDays } from 'date-fns'
import type { CreateScheduleItemDTO, DependencyType, CreateDependencyDTO } from '@/types/schedule'

export interface MSProjectTask {
  UID: string
  ID: string
  Name: string
  WBS?: string
  Start: string
  Finish: string
  Duration?: string
  PercentComplete: number
  Milestone: boolean
  Summary: boolean
  PredecessorLink?: MSProjectPredecessor[]
  Notes?: string
  OutlineLevel?: number
}

export interface MSProjectPredecessor {
  PredecessorUID: string
  Type: number // 0=FF, 1=FS, 2=SF, 3=SS
  LinkLag?: number
}

export interface ParsedSchedule {
  tasks: Omit<CreateScheduleItemDTO, 'project_id'>[]
  dependencies: { predecessorIndex: number; successorIndex: number; type: DependencyType; lag: number }[]
  errors: string[]
  warnings: string[]
}

/**
 * Convert MS Project dependency type number to our type
 */
function convertDependencyType(msType: number): DependencyType {
  switch (msType) {
    case 0:
      return 'FF' // Finish-to-Finish
    case 1:
      return 'FS' // Finish-to-Start (default)
    case 2:
      return 'SF' // Start-to-Finish
    case 3:
      return 'SS' // Start-to-Start
    default:
      return 'FS'
  }
}

/**
 * Parse MS Project duration string (e.g., "PT8H0M0S" or "P5D")
 */
function parseMSProjectDuration(duration: string | undefined): number {
  if (!duration) {return 1}

  // Format: PT{hours}H{minutes}M{seconds}S or P{days}D
  const daysMatch = duration.match(/P(\d+)D/)
  if (daysMatch) {
    return parseInt(daysMatch[1], 10)
  }

  const hoursMatch = duration.match(/PT(\d+)H/)
  if (hoursMatch) {
    const hours = parseInt(hoursMatch[1], 10)
    return Math.ceil(hours / 8) // Assume 8-hour work day
  }

  return 1
}

/**
 * Parse MS Project date string
 */
function parseMSProjectDate(dateStr: string): string {
  try {
    // MS Project dates can be in various formats
    // Common: "2024-01-15T08:00:00"
    const date = parseISO(dateStr)
    return format(date, 'yyyy-MM-dd')
  } catch {
    // Try alternative parsing
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) {
      return format(new Date(), 'yyyy-MM-dd')
    }
    return format(date, 'yyyy-MM-dd')
  }
}

/**
 * Parse XML string to DOM document
 */
function parseXMLString(xmlString: string): Document {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xmlString, 'text/xml')

  // Check for parsing errors
  const parseError = doc.querySelector('parsererror')
  if (parseError) {
    throw new Error(`XML parsing error: ${parseError.textContent}`)
  }

  return doc
}

/**
 * Extract text content from an element
 */
function getElementText(parent: Element, tagName: string): string | undefined {
  const element = parent.querySelector(tagName)
  return element?.textContent || undefined
}

/**
 * Extract boolean from element
 */
function getElementBool(parent: Element, tagName: string): boolean {
  const text = getElementText(parent, tagName)
  return text === '1' || text?.toLowerCase() === 'true'
}

/**
 * Extract number from element
 */
function getElementNumber(parent: Element, tagName: string): number {
  const text = getElementText(parent, tagName)
  return text ? parseInt(text, 10) : 0
}

/**
 * Parse MS Project XML and extract tasks
 */
export function parseMSProjectXML(xmlContent: string): ParsedSchedule {
  const errors: string[] = []
  const warnings: string[] = []
  const tasks: Omit<CreateScheduleItemDTO, 'project_id'>[] = []
  const dependencies: { predecessorIndex: number; successorIndex: number; type: DependencyType; lag: number }[] = []

  try {
    const doc = parseXMLString(xmlContent)

    // Find all Task elements
    const taskElements = doc.querySelectorAll('Task')

    if (taskElements.length === 0) {
      errors.push('No tasks found in the XML file')
      return { tasks, dependencies, errors, warnings }
    }

    // Map UID to index for dependency resolution
    const uidToIndex = new Map<string, number>()
    const taskData: MSProjectTask[] = []

    // First pass: extract task data
    taskElements.forEach((taskEl, index) => {
      const uid = getElementText(taskEl, 'UID')
      const id = getElementText(taskEl, 'ID')
      const name = getElementText(taskEl, 'Name')

      // Skip summary task (ID 0) which is typically the project itself
      if (id === '0' || !name) {
        return
      }

      const task: MSProjectTask = {
        UID: uid || String(index),
        ID: id || String(index),
        Name: name,
        WBS: getElementText(taskEl, 'WBS'),
        Start: getElementText(taskEl, 'Start') || '',
        Finish: getElementText(taskEl, 'Finish') || '',
        Duration: getElementText(taskEl, 'Duration'),
        PercentComplete: getElementNumber(taskEl, 'PercentComplete'),
        Milestone: getElementBool(taskEl, 'Milestone'),
        Summary: getElementBool(taskEl, 'Summary'),
        Notes: getElementText(taskEl, 'Notes'),
        OutlineLevel: getElementNumber(taskEl, 'OutlineLevel'),
        PredecessorLink: [],
      }

      // Parse predecessor links
      const predecessorElements = taskEl.querySelectorAll('PredecessorLink')
      predecessorElements.forEach((predEl) => {
        const predecessorUID = getElementText(predEl, 'PredecessorUID')
        const type = getElementNumber(predEl, 'Type')
        const lagText = getElementText(predEl, 'LinkLag')
        const lag = lagText ? parseInt(lagText, 10) / (8 * 60 * 10) : 0 // Convert from tenths of minutes

        if (predecessorUID) {
          task.PredecessorLink!.push({
            PredecessorUID: predecessorUID,
            Type: type,
            LinkLag: Math.round(lag),
          })
        }
      })

      uidToIndex.set(task.UID, taskData.length)
      taskData.push(task)
    })

    // Second pass: convert to our format and resolve dependencies
    taskData.forEach((msTask, index) => {
      // Skip summary tasks (they're just groupings)
      if (msTask.Summary) {
        warnings.push(`Skipped summary task: ${msTask.Name}`)
        return
      }

      // Validate dates
      if (!msTask.Start || !msTask.Finish) {
        errors.push(`Task "${msTask.Name}" has missing dates`)
        return
      }

      const startDate = parseMSProjectDate(msTask.Start)
      const finishDate = parseMSProjectDate(msTask.Finish)
      const duration = parseMSProjectDuration(msTask.Duration) ||
        Math.max(1, differenceInDays(parseISO(finishDate), parseISO(startDate)))

      const task: Omit<CreateScheduleItemDTO, 'project_id'> = {
        task_name: msTask.Name,
        start_date: startDate,
        finish_date: finishDate,
        duration_days: duration,
        percent_complete: msTask.PercentComplete,
        is_milestone: msTask.Milestone,
        wbs: msTask.WBS,
        notes: msTask.Notes,
      }

      const currentIndex = tasks.length
      tasks.push(task)

      // Store the new index mapping for dependencies
      uidToIndex.set(msTask.UID, currentIndex)

      // Process dependencies
      msTask.PredecessorLink?.forEach((pred) => {
        const predecessorIndex = uidToIndex.get(pred.PredecessorUID)
        if (predecessorIndex !== undefined) {
          dependencies.push({
            predecessorIndex,
            successorIndex: currentIndex,
            type: convertDependencyType(pred.Type),
            lag: pred.LinkLag || 0,
          })
        } else {
          warnings.push(
            `Dependency from unknown predecessor (UID: ${pred.PredecessorUID}) for task "${msTask.Name}"`
          )
        }
      })
    })

    if (tasks.length === 0) {
      errors.push('No valid tasks could be imported')
    }

    return { tasks, dependencies, errors, warnings }
  } catch (_error) {
    errors.push(`Failed to parse XML: ${_error instanceof Error ? _error.message : 'Unknown error'}`)
    return { tasks, dependencies, errors, warnings }
  }
}

/**
 * Validate imported schedule
 */
export function validateImportedSchedule(parsed: ParsedSchedule): {
  isValid: boolean
  errors: string[]
  warnings: string[]
} {
  const errors = [...parsed.errors]
  const warnings = [...parsed.warnings]

  // Check for duplicate task names
  const nameCount = new Map<string, number>()
  parsed.tasks.forEach((task) => {
    const count = nameCount.get(task.task_name) || 0
    nameCount.set(task.task_name, count + 1)
  })

  nameCount.forEach((count, name) => {
    if (count > 1) {
      warnings.push(`Duplicate task name found: "${name}" (${count} occurrences)`)
    }
  })

  // Validate dates
  parsed.tasks.forEach((task) => {
    const start = parseISO(task.start_date)
    const finish = parseISO(task.finish_date)

    if (start > finish && !task.is_milestone) {
      errors.push(`Task "${task.task_name}" has start date after finish date`)
    }
  })

  // Check for circular dependencies (basic check)
  // A more thorough check happens on the database side

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Read file and parse MS Project XML
 */
export async function importFromFile(file: File): Promise<ParsedSchedule> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (event) => {
      try {
        const content = event.target?.result as string
        const parsed = parseMSProjectXML(content)
        const validation = validateImportedSchedule(parsed)

        resolve({
          ...parsed,
          errors: [...parsed.errors, ...validation.errors],
          warnings: [...parsed.warnings, ...validation.warnings],
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
 * Generate sample MS Project XML for testing
 */
export function generateSampleXML(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Project xmlns="http://schemas.microsoft.com/project">
  <Tasks>
    <Task>
      <UID>0</UID>
      <ID>0</ID>
      <Name>Project Summary</Name>
      <Summary>1</Summary>
    </Task>
    <Task>
      <UID>1</UID>
      <ID>1</ID>
      <Name>Design Phase</Name>
      <WBS>1</WBS>
      <Start>2025-01-01T08:00:00</Start>
      <Finish>2025-01-14T17:00:00</Finish>
      <Duration>P10D</Duration>
      <PercentComplete>100</PercentComplete>
      <Milestone>0</Milestone>
      <Summary>0</Summary>
    </Task>
    <Task>
      <UID>2</UID>
      <ID>2</ID>
      <Name>Design Complete</Name>
      <WBS>1.1</WBS>
      <Start>2025-01-14T17:00:00</Start>
      <Finish>2025-01-14T17:00:00</Finish>
      <Duration>P0D</Duration>
      <PercentComplete>100</PercentComplete>
      <Milestone>1</Milestone>
      <Summary>0</Summary>
      <PredecessorLink>
        <PredecessorUID>1</PredecessorUID>
        <Type>1</Type>
      </PredecessorLink>
    </Task>
    <Task>
      <UID>3</UID>
      <ID>3</ID>
      <Name>Development Phase</Name>
      <WBS>2</WBS>
      <Start>2025-01-15T08:00:00</Start>
      <Finish>2025-02-14T17:00:00</Finish>
      <Duration>P22D</Duration>
      <PercentComplete>50</PercentComplete>
      <Milestone>0</Milestone>
      <Summary>0</Summary>
      <PredecessorLink>
        <PredecessorUID>2</PredecessorUID>
        <Type>1</Type>
      </PredecessorLink>
    </Task>
  </Tasks>
</Project>`
}
