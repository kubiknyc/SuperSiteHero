/**
 * Look-Ahead Planning Types
 * Types for 3-week rolling schedule and PPC tracking
 */

/**
 * Activity status options
 */
export type LookAheadActivityStatus =
  | 'planned'
  | 'in_progress'
  | 'completed'
  | 'delayed'
  | 'blocked'
  | 'cancelled'

/**
 * Constraint type options
 */
export type ConstraintType =
  | 'rfi_pending'
  | 'submittal_pending'
  | 'material_delivery'
  | 'predecessor_activity'
  | 'inspection_required'
  | 'permit_required'
  | 'weather_dependent'
  | 'resource_availability'
  | 'owner_decision'
  | 'design_clarification'
  | 'other'

/**
 * Constraint status options
 */
export type ConstraintStatus = 'open' | 'resolved' | 'waived' | 'escalated'

/**
 * Common construction trades
 */
export const CONSTRUCTION_TRADES = [
  'Concrete',
  'Structural Steel',
  'Carpentry',
  'Electrical',
  'Plumbing',
  'HVAC',
  'Fire Protection',
  'Roofing',
  'Drywall',
  'Painting',
  'Flooring',
  'Glazing',
  'Masonry',
  'Landscaping',
  'Site Work',
  'Demolition',
  'Elevator',
  'Low Voltage',
  'Security',
  'Other',
] as const

export type ConstructionTrade = (typeof CONSTRUCTION_TRADES)[number]

/**
 * Activity status configuration
 */
export const ACTIVITY_STATUS_CONFIG: Record<
  LookAheadActivityStatus,
  {
    label: string
    color: string
    bgColor: string
    borderColor: string
    icon: string
  }
> = {
  planned: {
    label: 'Planned',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
    borderColor: 'border-blue-300',
    icon: 'calendar',
  },
  in_progress: {
    label: 'In Progress',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-100',
    borderColor: 'border-yellow-300',
    icon: 'loader',
  },
  completed: {
    label: 'Completed',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
    borderColor: 'border-green-300',
    icon: 'check-circle',
  },
  delayed: {
    label: 'Delayed',
    color: 'text-orange-700',
    bgColor: 'bg-orange-100',
    borderColor: 'border-orange-300',
    icon: 'clock',
  },
  blocked: {
    label: 'Blocked',
    color: 'text-red-700',
    bgColor: 'bg-red-100',
    borderColor: 'border-red-300',
    icon: 'alert-triangle',
  },
  cancelled: {
    label: 'Cancelled',
    color: 'text-gray-500',
    bgColor: 'bg-gray-100',
    borderColor: 'border-gray-300',
    icon: 'x-circle',
  },
}

/**
 * Constraint type configuration
 */
export const CONSTRAINT_TYPE_CONFIG: Record<
  ConstraintType,
  {
    label: string
    description: string
    icon: string
    linkedEntity?: 'rfi' | 'submittal' | 'activity'
  }
> = {
  rfi_pending: {
    label: 'RFI Pending',
    description: 'Waiting for RFI response',
    icon: 'file-question',
    linkedEntity: 'rfi',
  },
  submittal_pending: {
    label: 'Submittal Pending',
    description: 'Waiting for submittal approval',
    icon: 'file-check',
    linkedEntity: 'submittal',
  },
  material_delivery: {
    label: 'Material Delivery',
    description: 'Waiting for materials to arrive',
    icon: 'truck',
  },
  predecessor_activity: {
    label: 'Predecessor Activity',
    description: 'Depends on another activity completing',
    icon: 'git-branch',
    linkedEntity: 'activity',
  },
  inspection_required: {
    label: 'Inspection Required',
    description: 'Needs inspection before proceeding',
    icon: 'clipboard-check',
  },
  permit_required: {
    label: 'Permit Required',
    description: 'Waiting for permit approval',
    icon: 'file-badge',
  },
  weather_dependent: {
    label: 'Weather Dependent',
    description: 'Weather-sensitive work',
    icon: 'cloud-sun',
  },
  resource_availability: {
    label: 'Resource Availability',
    description: 'Labor or equipment constraint',
    icon: 'users',
  },
  owner_decision: {
    label: 'Owner Decision',
    description: 'Waiting for owner direction',
    icon: 'user-check',
  },
  design_clarification: {
    label: 'Design Clarification',
    description: 'Needs design input',
    icon: 'pen-tool',
  },
  other: {
    label: 'Other',
    description: 'Other constraint',
    icon: 'alert-circle',
  },
}

/**
 * Look-ahead activity from database
 */
export interface LookAheadActivity {
  id: string
  project_id: string
  company_id: string
  activity_name: string
  description: string | null
  location: string | null
  trade: string | null
  subcontractor_id: string | null
  planned_start_date: string
  planned_end_date: string
  actual_start_date: string | null
  actual_end_date: string | null
  duration_days: number
  status: LookAheadActivityStatus
  percent_complete: number
  week_number: number | null
  week_start_date: string | null
  estimated_labor_hours: number | null
  estimated_crew_size: number | null
  schedule_item_id: string | null
  priority: number
  sort_order: number
  notes: string | null
  created_by: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

/**
 * Activity with joined data
 */
export interface LookAheadActivityWithDetails extends LookAheadActivity {
  subcontractor_name?: string | null
  project_name?: string
  total_constraints?: number
  open_constraints?: number
  constraints?: LookAheadConstraint[]
}

/**
 * Look-ahead constraint from database
 */
export interface LookAheadConstraint {
  id: string
  activity_id: string
  project_id: string
  company_id: string
  constraint_type: ConstraintType
  description: string
  status: ConstraintStatus
  rfi_id: string | null
  submittal_id: string | null
  predecessor_activity_id: string | null
  expected_resolution_date: string | null
  actual_resolution_date: string | null
  assigned_to: string | null
  responsible_party: string | null
  impact_description: string | null
  delay_days: number
  resolution_notes: string | null
  resolved_by: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

/**
 * Constraint with linked entity details
 */
export interface LookAheadConstraintWithDetails extends LookAheadConstraint {
  rfi_number?: string
  rfi_subject?: string
  submittal_number?: string
  submittal_title?: string
  predecessor_activity_name?: string
  assigned_to_name?: string
}

/**
 * Look-ahead snapshot from database
 */
export interface LookAheadSnapshot {
  id: string
  project_id: string
  company_id: string
  week_start_date: string
  week_end_date: string
  snapshot_date: string
  planned_activities: number
  completed_activities: number
  delayed_activities: number
  blocked_activities: number
  cancelled_activities: number
  ppc_percentage: number
  total_constraints: number
  resolved_constraints: number
  open_constraints: number
  variance_reasons: VarianceReason[]
  notes: string | null
  created_by: string | null
  created_at: string
}

/**
 * Variance reason for PPC analysis
 */
export interface VarianceReason {
  category: string
  description: string
  activities_affected: number
}

/**
 * Look-ahead template from database
 */
export interface LookAheadTemplate {
  id: string
  company_id: string
  template_name: string
  trade: string | null
  description: string | null
  default_duration_days: number
  default_crew_size: number | null
  default_labor_hours: number | null
  typical_constraints: ConstraintType[]
  is_active: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

/**
 * Week range for 3-week view
 */
export interface WeekRange {
  weekNumber: number
  weekStart: Date
  weekEnd: Date
  weekLabel: string
  isCurrentWeek: boolean
}

/**
 * Weekly activities grouped by week
 */
export interface WeeklyActivities {
  week1: LookAheadActivityWithDetails[]
  week2: LookAheadActivityWithDetails[]
  week3: LookAheadActivityWithDetails[]
}

/**
 * DTO for creating an activity
 */
export interface CreateLookAheadActivityDTO {
  project_id: string
  activity_name: string
  description?: string
  location?: string
  trade?: string
  subcontractor_id?: string
  planned_start_date: string
  planned_end_date: string
  status?: LookAheadActivityStatus
  percent_complete?: number
  week_number?: number
  week_start_date?: string
  estimated_labor_hours?: number
  estimated_crew_size?: number
  schedule_item_id?: string
  priority?: number
  sort_order?: number
  notes?: string
}

/**
 * DTO for updating an activity
 */
export interface UpdateLookAheadActivityDTO {
  activity_name?: string
  description?: string
  location?: string
  trade?: string
  subcontractor_id?: string
  planned_start_date?: string
  planned_end_date?: string
  actual_start_date?: string
  actual_end_date?: string
  status?: LookAheadActivityStatus
  percent_complete?: number
  week_number?: number
  week_start_date?: string
  estimated_labor_hours?: number
  estimated_crew_size?: number
  schedule_item_id?: string
  priority?: number
  sort_order?: number
  notes?: string
}

/**
 * DTO for creating a constraint
 */
export interface CreateLookAheadConstraintDTO {
  activity_id: string
  constraint_type: ConstraintType
  description: string
  rfi_id?: string
  submittal_id?: string
  predecessor_activity_id?: string
  expected_resolution_date?: string
  assigned_to?: string
  responsible_party?: string
  impact_description?: string
  delay_days?: number
}

/**
 * DTO for updating a constraint
 */
export interface UpdateLookAheadConstraintDTO {
  constraint_type?: ConstraintType
  description?: string
  status?: ConstraintStatus
  rfi_id?: string
  submittal_id?: string
  predecessor_activity_id?: string
  expected_resolution_date?: string
  actual_resolution_date?: string
  assigned_to?: string
  responsible_party?: string
  impact_description?: string
  delay_days?: number
  resolution_notes?: string
}

/**
 * DTO for creating a snapshot
 */
export interface CreateLookAheadSnapshotDTO {
  project_id: string
  week_start_date: string
  notes?: string
  variance_reasons?: VarianceReason[]
}

/**
 * PPC metrics for dashboard
 */
export interface PPCMetrics {
  currentWeekPPC: number
  previousWeekPPC: number
  ppcChange: number
  trend: 'up' | 'down' | 'stable'
  averagePPC: number
  totalPlanned: number
  totalCompleted: number
  totalDelayed: number
  totalBlocked: number
}

/**
 * Activity filters
 */
export interface LookAheadActivityFilters {
  trades?: string[]
  statuses?: LookAheadActivityStatus[]
  subcontractorIds?: string[]
  hasConstraints?: boolean
  search?: string
}

/**
 * Drag and drop result
 */
export interface ActivityDragResult {
  activityId: string
  sourceWeek: number
  destinationWeek: number
  newWeekStartDate: string
}

// =============================================
// Utility Functions
// =============================================

/**
 * Get status configuration
 */
export function getActivityStatusConfig(status: LookAheadActivityStatus) {
  return ACTIVITY_STATUS_CONFIG[status] || ACTIVITY_STATUS_CONFIG.planned
}

/**
 * Get constraint type configuration
 */
export function getConstraintTypeConfig(type: ConstraintType) {
  return CONSTRAINT_TYPE_CONFIG[type] || CONSTRAINT_TYPE_CONFIG.other
}

/**
 * Calculate week ranges for 3-week look-ahead
 */
export function calculateWeekRanges(startDate: Date = new Date()): WeekRange[] {
  const weeks: WeekRange[] = []

  // Find the Monday of the current week
  const day = startDate.getDay()
  const diff = day === 0 ? -6 : 1 - day // Adjust to Monday
  const monday = new Date(startDate)
  monday.setDate(startDate.getDate() + diff)
  monday.setHours(0, 0, 0, 0)

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (let i = 0; i < 3; i++) {
    const weekStart = new Date(monday)
    weekStart.setDate(monday.getDate() + i * 7)

    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)

    const isCurrentWeek = today >= weekStart && today <= weekEnd

    weeks.push({
      weekNumber: i + 1,
      weekStart,
      weekEnd,
      weekLabel: formatWeekLabel(weekStart, weekEnd),
      isCurrentWeek,
    })
  }

  return weeks
}

/**
 * Format week label
 */
export function formatWeekLabel(start: Date, end: Date): string {
  const startMonth = start.toLocaleDateString('en-US', { month: 'short' })
  const startDay = start.getDate()
  const endMonth = end.toLocaleDateString('en-US', { month: 'short' })
  const endDay = end.getDate()

  if (startMonth === endMonth) {
    return `${startMonth} ${startDay} - ${endDay}`
  }
  return `${startMonth} ${startDay} - ${endMonth} ${endDay}`
}

/**
 * Get week number for a date
 */
export function getWeekNumberForDate(date: Date, baseDate: Date = new Date()): number | null {
  const weeks = calculateWeekRanges(baseDate)

  for (const week of weeks) {
    if (date >= week.weekStart && date <= week.weekEnd) {
      return week.weekNumber
    }
  }

  return null
}

/**
 * Format PPC percentage
 */
export function formatPPC(ppc: number | null | undefined): string {
  if (ppc == null) return '--'
  return `${ppc.toFixed(0)}%`
}

/**
 * Get PPC status color based on percentage
 */
export function getPPCStatusColor(ppc: number): {
  color: string
  bgColor: string
  label: string
} {
  if (ppc >= 80) {
    return { color: 'text-green-700', bgColor: 'bg-green-100', label: 'Good' }
  }
  if (ppc >= 60) {
    return { color: 'text-yellow-700', bgColor: 'bg-yellow-100', label: 'Fair' }
  }
  if (ppc >= 40) {
    return { color: 'text-orange-700', bgColor: 'bg-orange-100', label: 'Poor' }
  }
  return { color: 'text-red-700', bgColor: 'bg-red-100', label: 'Critical' }
}

/**
 * Calculate activity duration in days
 */
export function calculateDurationDays(startDate: string, endDate: string): number {
  const start = new Date(startDate)
  const end = new Date(endDate)
  const diffTime = Math.abs(end.getTime() - start.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
  return diffDays
}

/**
 * Check if activity is overdue
 */
export function isActivityOverdue(activity: LookAheadActivity): boolean {
  if (activity.status === 'completed' || activity.status === 'cancelled') {
    return false
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const plannedEnd = new Date(activity.planned_end_date)

  return plannedEnd < today
}

/**
 * Get days until activity starts
 */
export function getDaysUntilStart(activity: LookAheadActivity): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const start = new Date(activity.planned_start_date)

  const diffTime = start.getTime() - today.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

/**
 * Sort activities by priority and date
 */
export function sortActivities(activities: LookAheadActivityWithDetails[]): LookAheadActivityWithDetails[] {
  return [...activities].sort((a, b) => {
    // First by priority (higher first)
    if (a.priority !== b.priority) {
      return b.priority - a.priority
    }
    // Then by start date
    return new Date(a.planned_start_date).getTime() - new Date(b.planned_start_date).getTime()
  })
}

/**
 * Group activities by trade
 */
export function groupActivitiesByTrade(
  activities: LookAheadActivityWithDetails[]
): Record<string, LookAheadActivityWithDetails[]> {
  return activities.reduce(
    (acc, activity) => {
      const trade = activity.trade || 'Unassigned'
      if (!acc[trade]) {
        acc[trade] = []
      }
      acc[trade].push(activity)
      return acc
    },
    {} as Record<string, LookAheadActivityWithDetails[]>
  )
}

/**
 * Filter activities
 */
export function filterActivities(
  activities: LookAheadActivityWithDetails[],
  filters: LookAheadActivityFilters
): LookAheadActivityWithDetails[] {
  return activities.filter((activity) => {
    // Trade filter
    if (filters.trades?.length && activity.trade && !filters.trades.includes(activity.trade)) {
      return false
    }

    // Status filter
    if (filters.statuses?.length && !filters.statuses.includes(activity.status)) {
      return false
    }

    // Subcontractor filter
    if (
      filters.subcontractorIds?.length &&
      activity.subcontractor_id &&
      !filters.subcontractorIds.includes(activity.subcontractor_id)
    ) {
      return false
    }

    // Has constraints filter
    if (filters.hasConstraints !== undefined) {
      const hasConstraints = (activity.open_constraints || 0) > 0
      if (filters.hasConstraints !== hasConstraints) {
        return false
      }
    }

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      const matchesName = activity.activity_name.toLowerCase().includes(searchLower)
      const matchesLocation = activity.location?.toLowerCase().includes(searchLower)
      const matchesTrade = activity.trade?.toLowerCase().includes(searchLower)
      const matchesSubcontractor = activity.subcontractor_name?.toLowerCase().includes(searchLower)

      if (!matchesName && !matchesLocation && !matchesTrade && !matchesSubcontractor) {
        return false
      }
    }

    return true
  })
}
