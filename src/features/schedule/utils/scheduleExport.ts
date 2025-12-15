/**
 * Schedule Export Utilities
 *
 * Generates MS Project XML, Primavera P6 XER, and CSV exports.
 * Supports filtering by date range, milestones, and critical path.
 * Includes XML escaping for security (--safe flag).
 */

import { format, parseISO, differenceInDays } from 'date-fns'
import type {
  ScheduleActivity,
  ScheduleDependency,
  DependencyType,
  ActivityType,
} from '@/types/schedule-activities'

// =============================================
// Types
// =============================================

export interface ExportOptions {
  format: 'ms_project_xml' | 'primavera_xer' | 'csv'
  dateFrom?: string
  dateTo?: string
  filterType: 'all' | 'milestones' | 'critical_path'
  includeCompleted?: boolean
  includeDependencies?: boolean
  projectName?: string
  projectNumber?: string
}

export interface ExportResult {
  content: string
  filename: string
  mimeType: string
  activityCount: number
  dependencyCount: number
}

export interface ExportError {
  message: string
  details?: string
}

// Maximum activities to export (--safe flag)
export const MAX_EXPORT_ACTIVITIES = 10000

// =============================================
// XML Escaping (Security)
// =============================================

/**
 * Escape special XML characters to prevent injection attacks
 * This is critical for --safe mode
 */
export function escapeXml(text: string | null | undefined): string {
  if (text === null || text === undefined) {
    return ''
  }
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Sanitize a string for use in XML (remove invalid characters)
 */
export function sanitizeForXml(text: string | null | undefined): string {
  if (text === null || text === undefined) {
    return ''
  }
  // Remove control characters except tab, newline, carriage return
  return String(text).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
}

// =============================================
// MS Project XML Generation
// =============================================

/**
 * Convert internal dependency type to MS Project type code
 * MS Project: 0=FF, 1=FS, 2=SF, 3=SS
 */
export function convertDependencyTypeToMSP(type: DependencyType): number {
  switch (type) {
    case 'FF':
      return 0
    case 'FS':
      return 1
    case 'SF':
      return 2
    case 'SS':
      return 3
    default:
      return 1 // Default to FS
  }
}

/**
 * Convert MS Project type code to internal dependency type
 */
export function convertMSPToDependencyType(code: number): DependencyType {
  switch (code) {
    case 0:
      return 'FF'
    case 1:
      return 'FS'
    case 2:
      return 'SF'
    case 3:
      return 'SS'
    default:
      return 'FS'
  }
}

/**
 * Format duration in days to MS Project duration format (PT{hours}H0M0S)
 * MS Project uses 8 hours per day by default
 */
export function formatDurationForMSP(days: number | null | undefined): string {
  if (days === null || days === undefined || days === 0) {
    return 'PT0H0M0S'
  }
  const hours = Math.round(days * 8)
  return `PT${hours}H0M0S`
}

/**
 * Parse MS Project duration format back to days
 */
export function parseMSPDuration(duration: string): number {
  if (!duration) {
    return 0
  }

  // Handle PT{hours}H{minutes}M{seconds}S format
  const hoursMatch = duration.match(/PT(\d+)H/)
  if (hoursMatch) {
    return Math.ceil(parseInt(hoursMatch[1], 10) / 8)
  }

  // Handle P{days}D format
  const daysMatch = duration.match(/P(\d+)D/)
  if (daysMatch) {
    return parseInt(daysMatch[1], 10)
  }

  return 0
}

/**
 * Format a date for MS Project XML (ISO 8601 format with T00:00:00)
 */
export function formatDateForMSP(
  date: string | null | undefined
): string | null {
  if (!date) {
    return null
  }
  try {
    const parsed = parseISO(date)
    return format(parsed, "yyyy-MM-dd'T'HH:mm:ss")
  } catch {
    return null
  }
}

/**
 * Format a date from MS Project XML to ISO date
 */
export function parseMSPDate(dateStr: string | null | undefined): string | null {
  if (!dateStr) {
    return null
  }
  try {
    const parsed = parseISO(dateStr)
    return format(parsed, 'yyyy-MM-dd')
  } catch {
    return null
  }
}

/**
 * Generate XML header with proper declaration and namespace
 */
function generateXmlHeader(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Project xmlns="http://schemas.microsoft.com/project">`
}

/**
 * Generate XML footer
 */
function generateXmlFooter(): string {
  return `
</Project>`
}

/**
 * Generate project metadata section
 */
function generateProjectMetadata(
  projectName: string,
  projectNumber?: string,
  activityCount?: number
): string {
  const now = new Date()
  const dateStr = format(now, "yyyy-MM-dd'T'HH:mm:ss")

  return `
  <Name>${escapeXml(projectName)}</Name>
  <Title>${escapeXml(projectNumber ? `${projectNumber} - ${projectName}` : projectName)}</Title>
  <CreationDate>${dateStr}</CreationDate>
  <LastSaved>${dateStr}</LastSaved>
  <ScheduleFromStart>1</ScheduleFromStart>
  <StartDate>${dateStr}</StartDate>
  <CalendarUID>1</CalendarUID>
  <DefaultStartTime>08:00:00</DefaultStartTime>
  <DefaultFinishTime>17:00:00</DefaultFinishTime>
  <MinutesPerDay>480</MinutesPerDay>
  <MinutesPerWeek>2400</MinutesPerWeek>
  <DaysPerMonth>20</DaysPerMonth>
  <CurrencyCode>USD</CurrencyCode>
  <Author>JobSight Schedule Export</Author>`
}

/**
 * Generate calendar section for MS Project
 */
function generateCalendarsSection(): string {
  return `
  <Calendars>
    <Calendar>
      <UID>1</UID>
      <Name>Standard</Name>
      <IsBaseCalendar>1</IsBaseCalendar>
      <BaseCalendarUID>-1</BaseCalendarUID>
      <WeekDays>
        <WeekDay>
          <DayType>1</DayType>
          <DayWorking>0</DayWorking>
        </WeekDay>
        <WeekDay>
          <DayType>2</DayType>
          <DayWorking>1</DayWorking>
          <WorkingTimes>
            <WorkingTime>
              <FromTime>08:00:00</FromTime>
              <ToTime>12:00:00</ToTime>
            </WorkingTime>
            <WorkingTime>
              <FromTime>13:00:00</FromTime>
              <ToTime>17:00:00</ToTime>
            </WorkingTime>
          </WorkingTimes>
        </WeekDay>
        <WeekDay>
          <DayType>3</DayType>
          <DayWorking>1</DayWorking>
          <WorkingTimes>
            <WorkingTime>
              <FromTime>08:00:00</FromTime>
              <ToTime>12:00:00</ToTime>
            </WorkingTime>
            <WorkingTime>
              <FromTime>13:00:00</FromTime>
              <ToTime>17:00:00</ToTime>
            </WorkingTime>
          </WorkingTimes>
        </WeekDay>
        <WeekDay>
          <DayType>4</DayType>
          <DayWorking>1</DayWorking>
          <WorkingTimes>
            <WorkingTime>
              <FromTime>08:00:00</FromTime>
              <ToTime>12:00:00</ToTime>
            </WorkingTime>
            <WorkingTime>
              <FromTime>13:00:00</FromTime>
              <ToTime>17:00:00</ToTime>
            </WorkingTime>
          </WorkingTimes>
        </WeekDay>
        <WeekDay>
          <DayType>5</DayType>
          <DayWorking>1</DayWorking>
          <WorkingTimes>
            <WorkingTime>
              <FromTime>08:00:00</FromTime>
              <ToTime>12:00:00</ToTime>
            </WorkingTime>
            <WorkingTime>
              <FromTime>13:00:00</FromTime>
              <ToTime>17:00:00</ToTime>
            </WorkingTime>
          </WorkingTimes>
        </WeekDay>
        <WeekDay>
          <DayType>6</DayType>
          <DayWorking>1</DayWorking>
          <WorkingTimes>
            <WorkingTime>
              <FromTime>08:00:00</FromTime>
              <ToTime>12:00:00</ToTime>
            </WorkingTime>
            <WorkingTime>
              <FromTime>13:00:00</FromTime>
              <ToTime>17:00:00</ToTime>
            </WorkingTime>
          </WorkingTimes>
        </WeekDay>
        <WeekDay>
          <DayType>7</DayType>
          <DayWorking>0</DayWorking>
        </WeekDay>
      </WeekDays>
    </Calendar>
  </Calendars>`
}

/**
 * Generate a single task element for MS Project XML
 */
function generateTaskElement(
  activity: ScheduleActivity,
  uid: number,
  id: number,
  dependencies: ScheduleDependency[],
  uidMap: Map<string, number>
): string {
  const start = formatDateForMSP(activity.planned_start)
  const finish = formatDateForMSP(activity.planned_finish)
  const duration = formatDurationForMSP(activity.planned_duration)
  const percentComplete = Math.round(activity.percent_complete || 0)
  const isMilestone = activity.is_milestone ? 1 : 0
  const isCritical = activity.is_critical ? 1 : 0

  // Get predecessor links for this activity
  const predecessorLinks = dependencies
    .filter((d) => d.successor_id === activity.id)
    .map((d) => {
      const predUid = uidMap.get(d.predecessor_id)
      if (predUid === undefined) {
        return ''
      }

      const type = convertDependencyTypeToMSP(d.dependency_type)
      // Lag in MS Project is in tenths of minutes (1 day = 8 hours = 480 min = 4800 tenths)
      const lagTenthsOfMinutes = (d.lag_days || 0) * 8 * 60 * 10

      return `
      <PredecessorLink>
        <PredecessorUID>${predUid}</PredecessorUID>
        <Type>${type}</Type>
        <CrossProject>0</CrossProject>
        <LinkLag>${lagTenthsOfMinutes}</LinkLag>
        <LagFormat>7</LagFormat>
      </PredecessorLink>`
    })
    .filter((link) => link !== '')
    .join('')

  // Calculate actual dates if activity has started/finished
  let actualStart = ''
  let actualFinish = ''
  if (activity.actual_start) {
    const actStart = formatDateForMSP(activity.actual_start)
    if (actStart) {
      actualStart = `
      <ActualStart>${actStart}</ActualStart>`
    }
  }
  if (activity.actual_finish) {
    const actFinish = formatDateForMSP(activity.actual_finish)
    if (actFinish) {
      actualFinish = `
      <ActualFinish>${actFinish}</ActualFinish>`
    }
  }

  // Calculate remaining duration
  const remainingDuration = activity.remaining_duration !== null
    ? formatDurationForMSP(activity.remaining_duration)
    : formatDurationForMSP((activity.planned_duration || 0) * (1 - percentComplete / 100))

  return `
    <Task>
      <UID>${uid}</UID>
      <ID>${id}</ID>
      <Name>${escapeXml(sanitizeForXml(activity.name))}</Name>
      <Type>0</Type>
      <IsNull>0</IsNull>
      <CreateDate>${formatDateForMSP(activity.created_at) || format(new Date(), "yyyy-MM-dd'T'HH:mm:ss")}</CreateDate>
      <WBS>${escapeXml(activity.wbs_code || String(id))}</WBS>
      <OutlineNumber>${escapeXml(activity.wbs_code || String(id))}</OutlineNumber>
      <OutlineLevel>${activity.wbs_level || 1}</OutlineLevel>
      <Priority>500</Priority>
      ${start ? `<Start>${start}</Start>` : ''}
      ${finish ? `<Finish>${finish}</Finish>` : ''}
      <Duration>${duration}</Duration>
      <DurationFormat>7</DurationFormat>
      <Work>PT0H0M0S</Work>
      <ResumeValid>0</ResumeValid>
      <EffortDriven>0</EffortDriven>
      <Recurring>0</Recurring>
      <OverAllocated>0</OverAllocated>
      <Estimated>0</Estimated>
      <Milestone>${isMilestone}</Milestone>
      <Summary>0</Summary>
      <Critical>${isCritical}</Critical>
      <IsSubproject>0</IsSubproject>
      <IsSubprojectReadOnly>0</IsSubprojectReadOnly>
      <ExternalTask>0</ExternalTask>
      <PercentComplete>${percentComplete}</PercentComplete>
      <PercentWorkComplete>${percentComplete}</PercentWorkComplete>
      <RemainingDuration>${remainingDuration}</RemainingDuration>
      <ConstraintType>0</ConstraintType>
      <CalendarUID>1</CalendarUID>
      <LevelAssignments>1</LevelAssignments>
      <LevelingCanSplit>1</LevelingCanSplit>
      <IgnoreResourceCalendar>0</IgnoreResourceCalendar>
      ${activity.total_float !== null ? `<TotalSlack>${(activity.total_float || 0) * 8 * 60 * 10}</TotalSlack>` : ''}
      ${activity.free_float !== null ? `<FreeSlack>${(activity.free_float || 0) * 8 * 60 * 10}</FreeSlack>` : ''}${actualStart}${actualFinish}
      ${activity.notes ? `<Notes>${escapeXml(sanitizeForXml(activity.notes))}</Notes>` : ''}${predecessorLinks}
      ${activity.external_id ? `<ExtendedAttribute>
        <FieldID>188743731</FieldID>
        <Value>${escapeXml(activity.external_id)}</Value>
      </ExtendedAttribute>` : ''}
    </Task>`
}

/**
 * Filter activities based on export options
 */
export function filterActivitiesForExport(
  activities: ScheduleActivity[],
  options: ExportOptions
): ScheduleActivity[] {
  let filtered = [...activities]

  // Filter by date range
  if (options.dateFrom) {
    const fromDate = parseISO(options.dateFrom)
    filtered = filtered.filter((a) => {
      if (!a.planned_start && !a.planned_finish) {
        return false
      }
      const activityEnd = a.planned_finish ? parseISO(a.planned_finish) : null
      const activityStart = a.planned_start ? parseISO(a.planned_start) : null
      // Include if any part of activity overlaps with the range
      return (activityEnd && activityEnd >= fromDate) ||
        (activityStart && activityStart >= fromDate)
    })
  }

  if (options.dateTo) {
    const toDate = parseISO(options.dateTo)
    filtered = filtered.filter((a) => {
      if (!a.planned_start && !a.planned_finish) {
        return false
      }
      const activityStart = a.planned_start ? parseISO(a.planned_start) : null
      const activityEnd = a.planned_finish ? parseISO(a.planned_finish) : null
      // Include if any part of activity overlaps with the range
      return (activityStart && activityStart <= toDate) ||
        (activityEnd && activityEnd <= toDate)
    })
  }

  // Filter by type
  switch (options.filterType) {
    case 'milestones':
      filtered = filtered.filter((a) => a.is_milestone)
      break
    case 'critical_path':
      filtered = filtered.filter((a) => a.is_critical || a.is_on_critical_path)
      break
    case 'all':
    default:
      // No additional filtering
      break
  }

  // Filter completed activities if requested
  if (options.includeCompleted === false) {
    filtered = filtered.filter((a) => a.status !== 'completed')
  }

  return filtered
}

/**
 * Generate MS Project XML from schedule data
 * Main export function
 */
export function generateMSProjectXML(
  projectId: string,
  activities: ScheduleActivity[],
  dependencies: ScheduleDependency[],
  options: ExportOptions
): ExportResult {
  // Validate activity count (--safe flag)
  if (activities.length > MAX_EXPORT_ACTIVITIES) {
    throw new Error(
      `Export limit exceeded: Cannot export more than ${MAX_EXPORT_ACTIVITIES} activities. ` +
        `Current count: ${activities.length}. Please apply filters to reduce the data set.`
    )
  }

  // Filter activities
  const filteredActivities = filterActivitiesForExport(activities, options)

  // Create UID mapping for activities
  const uidMap = new Map<string, number>()
  filteredActivities.forEach((activity, index) => {
    // UID 0 is reserved for project summary
    uidMap.set(activity.id, index + 1)
  })

  // Filter dependencies to only include those between filtered activities
  const filteredDependencies = options.includeDependencies !== false
    ? dependencies.filter((d) => {
        return uidMap.has(d.predecessor_id) && uidMap.has(d.successor_id)
      })
    : []

  // Build XML content
  const xmlParts: string[] = []

  // Header
  xmlParts.push(generateXmlHeader())

  // Project metadata
  xmlParts.push(
    generateProjectMetadata(
      options.projectName || 'Exported Schedule',
      options.projectNumber,
      filteredActivities.length
    )
  )

  // Calendars
  xmlParts.push(generateCalendarsSection())

  // Tasks section
  xmlParts.push('\n  <Tasks>')

  // Project summary task (ID 0)
  const projectStart = filteredActivities.length > 0
    ? filteredActivities
        .filter((a) => a.planned_start)
        .sort((a, b) => (a.planned_start! < b.planned_start! ? -1 : 1))[0]?.planned_start
    : null
  const projectFinish = filteredActivities.length > 0
    ? filteredActivities
        .filter((a) => a.planned_finish)
        .sort((a, b) => (a.planned_finish! > b.planned_finish! ? -1 : 1))[0]?.planned_finish
    : null

  xmlParts.push(`
    <Task>
      <UID>0</UID>
      <ID>0</ID>
      <Name>${escapeXml(options.projectName || 'Project Summary')}</Name>
      <Type>1</Type>
      <IsNull>0</IsNull>
      <OutlineLevel>0</OutlineLevel>
      ${projectStart ? `<Start>${formatDateForMSP(projectStart)}</Start>` : ''}
      ${projectFinish ? `<Finish>${formatDateForMSP(projectFinish)}</Finish>` : ''}
      <Summary>1</Summary>
    </Task>`)

  // Individual tasks
  filteredActivities.forEach((activity, index) => {
    const uid = uidMap.get(activity.id)!
    xmlParts.push(
      generateTaskElement(activity, uid, index + 1, filteredDependencies, uidMap)
    )
  })

  xmlParts.push('\n  </Tasks>')

  // Footer
  xmlParts.push(generateXmlFooter())

  const content = xmlParts.join('')

  // Generate filename
  const dateStr = format(new Date(), 'yyyy-MM-dd')
  const safeName = (options.projectName || 'schedule')
    .replace(/[^a-zA-Z0-9]/g, '_')
    .substring(0, 50)
  const filename = `${safeName}_${dateStr}.xml`

  return {
    content,
    filename,
    mimeType: 'application/xml',
    activityCount: filteredActivities.length,
    dependencyCount: filteredDependencies.length,
  }
}

// =============================================
// Primavera P6 XER Export
// =============================================

/**
 * Convert internal dependency type to P6 format
 */
function convertDependencyTypeToP6(type: DependencyType): string {
  switch (type) {
    case 'FF':
      return 'PR_FF'
    case 'FS':
      return 'PR_FS'
    case 'SF':
      return 'PR_SF'
    case 'SS':
      return 'PR_SS'
    default:
      return 'PR_FS'
  }
}

/**
 * Convert activity type to P6 format
 */
function convertActivityTypeToP6(
  type: ActivityType,
  isMilestone: boolean
): string {
  if (isMilestone) {
    return 'TT_Mile'
  }
  switch (type) {
    case 'milestone':
      return 'TT_Mile'
    case 'wbs_summary':
    case 'summary':
      return 'TT_WBS'
    case 'level_of_effort':
      return 'TT_LOE'
    case 'hammock':
      return 'TT_Hammock'
    case 'task':
    default:
      return 'TT_Task'
  }
}

/**
 * Format date for P6 XER format
 */
function formatDateForP6(date: string | null | undefined): string {
  if (!date) {
    return ''
  }
  try {
    const parsed = parseISO(date)
    return format(parsed, 'yyyy-MM-dd HH:mm')
  } catch {
    return ''
  }
}

/**
 * Generate Primavera P6 XER export
 */
export function generatePrimaveraXER(
  projectId: string,
  activities: ScheduleActivity[],
  dependencies: ScheduleDependency[],
  options: ExportOptions
): ExportResult {
  // Validate activity count
  if (activities.length > MAX_EXPORT_ACTIVITIES) {
    throw new Error(
      `Export limit exceeded: Cannot export more than ${MAX_EXPORT_ACTIVITIES} activities.`
    )
  }

  // Filter activities
  const filteredActivities = filterActivitiesForExport(activities, options)

  // Create ID mapping
  const idMap = new Map<string, number>()
  filteredActivities.forEach((activity, index) => {
    idMap.set(activity.id, index + 1)
  })

  // Filter dependencies
  const filteredDependencies = options.includeDependencies !== false
    ? dependencies.filter((d) => idMap.has(d.predecessor_id) && idMap.has(d.successor_id))
    : []

  const lines: string[] = []

  // Header
  lines.push('ERMHDR\t20.12\t2024-01-01\tProject\tJobSight\tUSD')
  lines.push('')

  // Project table
  lines.push('%T\tPROJECT')
  lines.push('%F\tproj_id\tproj_short_name\tproj_name\tlast_recalc_date')
  lines.push(
    `%R\t${projectId}\t${escapeForXer(options.projectNumber || 'PROJ')}\t${escapeForXer(options.projectName || 'Project')}\t${formatDateForP6(new Date().toISOString())}`
  )
  lines.push('')

  // WBS table (simplified - single WBS entry)
  lines.push('%T\tPROJWBS')
  lines.push('%F\twbs_id\twbs_short_name\twbs_name\tproj_id')
  lines.push(`%R\t1\tWBS1\t${escapeForXer(options.projectName || 'Work Breakdown')}\t${projectId}`)
  lines.push('')

  // Task table
  lines.push('%T\tTASK')
  lines.push(
    '%F\ttask_id\ttask_code\ttask_name\ttask_type\ttarget_start_date\ttarget_end_date\ttarget_drtn_hr_cnt\tphys_complete_pct\twbs_id\ttask_comments'
  )
  filteredActivities.forEach((activity) => {
    const taskId = idMap.get(activity.id)!
    const taskType = convertActivityTypeToP6(activity.activity_type, activity.is_milestone)
    const duration = (activity.planned_duration || 0) * 8 // Convert days to hours
    lines.push(
      `%R\t${taskId}\t${escapeForXer(activity.activity_id)}\t${escapeForXer(activity.name)}\t${taskType}\t${formatDateForP6(activity.planned_start)}\t${formatDateForP6(activity.planned_finish)}\t${duration}\t${activity.percent_complete || 0}\t1\t${escapeForXer(activity.notes || '')}`
    )
  })
  lines.push('')

  // Task predecessor table
  if (filteredDependencies.length > 0) {
    lines.push('%T\tTASKPRED')
    lines.push('%F\ttask_pred_id\ttask_id\tpred_task_id\tpred_type\tlag_hr_cnt')
    filteredDependencies.forEach((dep, index) => {
      const taskId = idMap.get(dep.successor_id)!
      const predTaskId = idMap.get(dep.predecessor_id)!
      const predType = convertDependencyTypeToP6(dep.dependency_type)
      const lagHours = (dep.lag_days || 0) * 8
      lines.push(`%R\t${index + 1}\t${taskId}\t${predTaskId}\t${predType}\t${lagHours}`)
    })
    lines.push('')
  }

  // End
  lines.push('%E')

  const content = lines.join('\n')
  const dateStr = format(new Date(), 'yyyy-MM-dd')
  const safeName = (options.projectName || 'schedule')
    .replace(/[^a-zA-Z0-9]/g, '_')
    .substring(0, 50)
  const filename = `${safeName}_${dateStr}.xer`

  return {
    content,
    filename,
    mimeType: 'application/octet-stream',
    activityCount: filteredActivities.length,
    dependencyCount: filteredDependencies.length,
  }
}

/**
 * Escape special characters for XER format
 */
function escapeForXer(text: string | null | undefined): string {
  if (text === null || text === undefined) {
    return ''
  }
  // Replace tabs and newlines that would break the format
  return String(text)
    .replace(/\t/g, ' ')
    .replace(/\n/g, ' ')
    .replace(/\r/g, '')
}

// =============================================
// CSV Export
// =============================================

/**
 * Generate CSV export
 */
export function generateCSVExport(
  projectId: string,
  activities: ScheduleActivity[],
  dependencies: ScheduleDependency[],
  options: ExportOptions
): ExportResult {
  // Validate activity count
  if (activities.length > MAX_EXPORT_ACTIVITIES) {
    throw new Error(
      `Export limit exceeded: Cannot export more than ${MAX_EXPORT_ACTIVITIES} activities.`
    )
  }

  // Filter activities
  const filteredActivities = filterActivitiesForExport(activities, options)

  // Create predecessor string map
  const predecessorMap = new Map<string, string[]>()
  if (options.includeDependencies !== false) {
    dependencies.forEach((dep) => {
      const successor = filteredActivities.find((a) => a.id === dep.successor_id)
      const predecessor = filteredActivities.find((a) => a.id === dep.predecessor_id)
      if (successor && predecessor) {
        if (!predecessorMap.has(dep.successor_id)) {
          predecessorMap.set(dep.successor_id, [])
        }
        const predInfo = `${predecessor.activity_id}${dep.dependency_type}${dep.lag_days > 0 ? `+${dep.lag_days}d` : dep.lag_days < 0 ? `${dep.lag_days}d` : ''}`
        predecessorMap.get(dep.successor_id)!.push(predInfo)
      }
    })
  }

  const headers = [
    'ID',
    'Activity ID',
    'Name',
    'WBS Code',
    'Start',
    'Finish',
    'Duration (days)',
    'Percent Complete',
    'Is Milestone',
    'Is Critical',
    'Status',
    'Predecessors',
    'Notes',
  ]

  const rows: string[][] = [headers]

  filteredActivities.forEach((activity, index) => {
    const predecessors = predecessorMap.get(activity.id)?.join('; ') || ''
    rows.push([
      String(index + 1),
      escapeForCsv(activity.activity_id),
      escapeForCsv(activity.name),
      escapeForCsv(activity.wbs_code || ''),
      activity.planned_start || '',
      activity.planned_finish || '',
      String(activity.planned_duration || 0),
      String(activity.percent_complete || 0),
      activity.is_milestone ? 'Yes' : 'No',
      activity.is_critical ? 'Yes' : 'No',
      activity.status || 'not_started',
      predecessors,
      escapeForCsv(activity.notes || ''),
    ])
  })

  const content = rows.map((row) => row.join(',')).join('\n')
  const dateStr = format(new Date(), 'yyyy-MM-dd')
  const safeName = (options.projectName || 'schedule')
    .replace(/[^a-zA-Z0-9]/g, '_')
    .substring(0, 50)
  const filename = `${safeName}_${dateStr}.csv`

  return {
    content,
    filename,
    mimeType: 'text/csv',
    activityCount: filteredActivities.length,
    dependencyCount: options.includeDependencies !== false ? dependencies.length : 0,
  }
}

/**
 * Escape special characters for CSV
 */
function escapeForCsv(text: string | null | undefined): string {
  if (text === null || text === undefined) {
    return ''
  }
  const str = String(text)
  // If contains comma, newline, or quote, wrap in quotes and escape internal quotes
  if (str.includes(',') || str.includes('\n') || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

// =============================================
// Main Export Function
// =============================================

/**
 * Export schedule data based on format
 */
export function exportSchedule(
  projectId: string,
  activities: ScheduleActivity[],
  dependencies: ScheduleDependency[],
  options: ExportOptions
): ExportResult {
  switch (options.format) {
    case 'ms_project_xml':
      return generateMSProjectXML(projectId, activities, dependencies, options)
    case 'primavera_xer':
      return generatePrimaveraXER(projectId, activities, dependencies, options)
    case 'csv':
      return generateCSVExport(projectId, activities, dependencies, options)
    default:
      throw new Error(`Unsupported export format: ${options.format}`)
  }
}

/**
 * Trigger file download in browser
 */
export function downloadExport(result: ExportResult): void {
  const blob = new Blob([result.content], { type: result.mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = result.filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// =============================================
// Validation Functions
// =============================================

/**
 * Validate export options
 */
export function validateExportOptions(options: ExportOptions): ExportError | null {
  if (options.dateFrom && options.dateTo) {
    const from = parseISO(options.dateFrom)
    const to = parseISO(options.dateTo)
    if (from > to) {
      return {
        message: 'Invalid date range',
        details: 'Start date must be before end date',
      }
    }
  }

  return null
}

/**
 * Estimate export size for validation
 */
export function estimateExportSize(
  activityCount: number,
  format: ExportOptions['format']
): { bytes: number; formatted: string } {
  // Rough estimates per activity
  const bytesPerActivity = {
    ms_project_xml: 2000, // XML is verbose
    primavera_xer: 500,
    csv: 300,
  }

  const bytes = activityCount * bytesPerActivity[format]

  let formatted: string
  if (bytes < 1024) {
    formatted = `${bytes} B`
  } else if (bytes < 1024 * 1024) {
    formatted = `${(bytes / 1024).toFixed(1)} KB`
  } else {
    formatted = `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return { bytes, formatted }
}
