/**
 * Look-Ahead Planning API Service
 * CRUD operations for 3-week rolling schedule
 */

import { supabase } from '@/lib/supabase'
import type {
  LookAheadActivity,
  LookAheadActivityWithDetails,
  LookAheadConstraint,
  LookAheadConstraintWithDetails,
  LookAheadSnapshot,
  LookAheadTemplate,
  CreateLookAheadActivityDTO,
  UpdateLookAheadActivityDTO,
  CreateLookAheadConstraintDTO,
  UpdateLookAheadConstraintDTO,
  CreateLookAheadSnapshotDTO,
  LookAheadActivityFilters,
  PPCMetrics,
  WeekRange,
  VarianceReason,
} from '@/types/look-ahead'
import { calculateWeekRanges } from '@/types/look-ahead'

// =============================================
// Activities
// =============================================

/**
 * Get all activities for a project
 */
export async function getLookAheadActivities(
  projectId: string,
  filters?: LookAheadActivityFilters
): Promise<LookAheadActivityWithDetails[]> {
  let query = supabase
    .from('look_ahead_activities')
    .select(`
      *,
      subcontractors (
        id,
        name
      )
    `)
    .eq('project_id', projectId)
    .is('deleted_at', null)
    .order('priority', { ascending: false })
    .order('planned_start_date', { ascending: true })

  // Apply filters
  if (filters?.trades?.length) {
    query = query.in('trade', filters.trades)
  }

  if (filters?.statuses?.length) {
    query = query.in('status', filters.statuses)
  }

  if (filters?.subcontractorIds?.length) {
    query = query.in('subcontractor_id', filters.subcontractorIds)
  }

  if (filters?.search) {
    query = query.or(`activity_name.ilike.%${filters.search}%,location.ilike.%${filters.search}%`)
  }

  const { data, error } = await query

  if (error) throw error

  // Get constraint counts
  const activityIds = (data || []).map((a) => a.id)
  const { data: constraints } = await supabase
    .from('look_ahead_constraints')
    .select('activity_id, status')
    .in('activity_id', activityIds)

  const constraintCounts = (constraints || []).reduce(
    (acc, c) => {
      if (!acc[c.activity_id]) {
        acc[c.activity_id] = { total: 0, open: 0 }
      }
      acc[c.activity_id].total++
      if (c.status === 'open') {
        acc[c.activity_id].open++
      }
      return acc
    },
    {} as Record<string, { total: number; open: number }>
  )

  return (data || []).map((activity) => ({
    ...activity,
    subcontractor_name: activity.subcontractors?.name,
    total_constraints: constraintCounts[activity.id]?.total || 0,
    open_constraints: constraintCounts[activity.id]?.open || 0,
  }))
}

/**
 * Get activities for a specific week
 */
export async function getActivitiesForWeek(
  projectId: string,
  weekStartDate: string
): Promise<LookAheadActivityWithDetails[]> {
  const { data, error } = await supabase
    .from('look_ahead_activities')
    .select(`
      *,
      subcontractors (
        id,
        name
      )
    `)
    .eq('project_id', projectId)
    .eq('week_start_date', weekStartDate)
    .is('deleted_at', null)
    .order('priority', { ascending: false })
    .order('planned_start_date', { ascending: true })

  if (error) throw error

  // Get constraint counts
  const activityIds = (data || []).map((a) => a.id)
  const { data: constraints } = await supabase
    .from('look_ahead_constraints')
    .select('activity_id, status')
    .in('activity_id', activityIds)

  const constraintCounts = (constraints || []).reduce(
    (acc, c) => {
      if (!acc[c.activity_id]) {
        acc[c.activity_id] = { total: 0, open: 0 }
      }
      acc[c.activity_id].total++
      if (c.status === 'open') {
        acc[c.activity_id].open++
      }
      return acc
    },
    {} as Record<string, { total: number; open: number }>
  )

  return (data || []).map((activity) => ({
    ...activity,
    subcontractor_name: activity.subcontractors?.name,
    total_constraints: constraintCounts[activity.id]?.total || 0,
    open_constraints: constraintCounts[activity.id]?.open || 0,
  }))
}

/**
 * Get activities grouped by week for 3-week view
 */
export async function getActivitiesByWeek(
  projectId: string,
  baseDate: Date = new Date()
): Promise<{
  weeks: WeekRange[]
  activities: Record<number, LookAheadActivityWithDetails[]>
}> {
  const weeks = calculateWeekRanges(baseDate)

  const weekStartDates = weeks.map((w) => w.weekStart.toISOString().split('T')[0])

  const { data, error } = await supabase
    .from('look_ahead_activities')
    .select(`
      *,
      subcontractors (
        id,
        name
      )
    `)
    .eq('project_id', projectId)
    .in('week_start_date', weekStartDates)
    .is('deleted_at', null)
    .order('priority', { ascending: false })
    .order('planned_start_date', { ascending: true })

  if (error) throw error

  // Get constraint counts
  const activityIds = (data || []).map((a) => a.id)
  let constraintCounts: Record<string, { total: number; open: number }> = {}

  if (activityIds.length > 0) {
    const { data: constraints } = await supabase
      .from('look_ahead_constraints')
      .select('activity_id, status')
      .in('activity_id', activityIds)

    constraintCounts = (constraints || []).reduce(
      (acc, c) => {
        if (!acc[c.activity_id]) {
          acc[c.activity_id] = { total: 0, open: 0 }
        }
        acc[c.activity_id].total++
        if (c.status === 'open') {
          acc[c.activity_id].open++
        }
        return acc
      },
      {} as Record<string, { total: number; open: number }>
    )
  }

  // Group by week
  const activities: Record<number, LookAheadActivityWithDetails[]> = {
    1: [],
    2: [],
    3: [],
  }

  for (const activity of data || []) {
    const weekNumber = activity.week_number || 1
    if (weekNumber >= 1 && weekNumber <= 3) {
      activities[weekNumber].push({
        ...activity,
        subcontractor_name: activity.subcontractors?.name,
        total_constraints: constraintCounts[activity.id]?.total || 0,
        open_constraints: constraintCounts[activity.id]?.open || 0,
      })
    }
  }

  return { weeks, activities }
}

/**
 * Get a single activity by ID
 */
export async function getLookAheadActivity(
  activityId: string
): Promise<LookAheadActivityWithDetails | null> {
  const { data, error } = await supabase
    .from('look_ahead_activities')
    .select(`
      *,
      subcontractors (
        id,
        name
      )
    `)
    .eq('id', activityId)
    .is('deleted_at', null)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }

  // Get constraints
  const { data: constraints } = await supabase
    .from('look_ahead_constraints')
    .select('*')
    .eq('activity_id', activityId)

  return {
    ...data,
    subcontractor_name: data.subcontractors?.name,
    total_constraints: constraints?.length || 0,
    open_constraints: constraints?.filter((c) => c.status === 'open').length || 0,
    constraints: constraints || [],
  }
}

/**
 * Create a new activity
 */
export async function createLookAheadActivity(
  dto: CreateLookAheadActivityDTO,
  companyId: string,
  userId: string
): Promise<LookAheadActivity> {
  // Calculate week info
  const startDate = new Date(dto.planned_start_date)
  const weeks = calculateWeekRanges()
  let weekNumber = 1
  let weekStartDate = weeks[0].weekStart.toISOString().split('T')[0]

  for (const week of weeks) {
    if (startDate >= week.weekStart && startDate <= week.weekEnd) {
      weekNumber = week.weekNumber
      weekStartDate = week.weekStart.toISOString().split('T')[0]
      break
    }
  }

  const { data, error } = await supabase
    .from('look_ahead_activities')
    .insert({
      ...dto,
      company_id: companyId,
      week_number: dto.week_number || weekNumber,
      week_start_date: dto.week_start_date || weekStartDate,
      created_by: userId,
      updated_by: userId,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Update an activity
 */
export async function updateLookAheadActivity(
  activityId: string,
  dto: UpdateLookAheadActivityDTO,
  userId: string
): Promise<LookAheadActivity> {
  // Recalculate week info if dates changed
  let weekInfo = {}
  if (dto.planned_start_date) {
    const startDate = new Date(dto.planned_start_date)
    const weeks = calculateWeekRanges()

    for (const week of weeks) {
      if (startDate >= week.weekStart && startDate <= week.weekEnd) {
        weekInfo = {
          week_number: week.weekNumber,
          week_start_date: week.weekStart.toISOString().split('T')[0],
        }
        break
      }
    }
  }

  const { data, error } = await supabase
    .from('look_ahead_activities')
    .update({
      ...dto,
      ...weekInfo,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', activityId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Move activity to a different week
 */
export async function moveActivityToWeek(
  activityId: string,
  weekNumber: number,
  weekStartDate: string,
  userId: string
): Promise<LookAheadActivity> {
  const { data, error } = await supabase
    .from('look_ahead_activities')
    .update({
      week_number: weekNumber,
      week_start_date: weekStartDate,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', activityId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Update activity status
 */
export async function updateActivityStatus(
  activityId: string,
  status: LookAheadActivity['status'],
  percentComplete?: number,
  userId?: string
): Promise<LookAheadActivity> {
  const updates: Partial<LookAheadActivity> = {
    status,
    updated_at: new Date().toISOString(),
  }

  if (percentComplete !== undefined) {
    updates.percent_complete = percentComplete
  }

  if (userId) {
    updates.updated_by = userId
  }

  // Set actual dates based on status
  if (status === 'in_progress') {
    updates.actual_start_date = new Date().toISOString().split('T')[0]
  } else if (status === 'completed') {
    updates.actual_end_date = new Date().toISOString().split('T')[0]
    updates.percent_complete = 100
  }

  const { data, error } = await supabase
    .from('look_ahead_activities')
    .update(updates)
    .eq('id', activityId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Delete (soft delete) an activity
 */
export async function deleteLookAheadActivity(activityId: string): Promise<void> {
  const { error } = await supabase
    .from('look_ahead_activities')
    .update({
      deleted_at: new Date().toISOString(),
      status: 'cancelled',
    })
    .eq('id', activityId)

  if (error) throw error
}

// =============================================
// Constraints
// =============================================

/**
 * Get constraints for an activity
 */
export async function getActivityConstraints(
  activityId: string
): Promise<LookAheadConstraintWithDetails[]> {
  const { data, error } = await supabase
    .from('look_ahead_constraints')
    .select(`
      *,
      rfis (
        id,
        rfi_number,
        subject
      ),
      submittals (
        id,
        submittal_number,
        title
      ),
      predecessor:look_ahead_activities!predecessor_activity_id (
        id,
        activity_name
      ),
      assigned:users!assigned_to (
        id,
        full_name
      )
    `)
    .eq('activity_id', activityId)
    .order('created_at', { ascending: false })

  if (error) throw error

  return (data || []).map((constraint) => ({
    ...constraint,
    rfi_number: constraint.rfis?.rfi_number,
    rfi_subject: constraint.rfis?.subject,
    submittal_number: constraint.submittals?.submittal_number,
    submittal_title: constraint.submittals?.title,
    predecessor_activity_name: constraint.predecessor?.activity_name,
    assigned_to_name: constraint.assigned?.full_name,
  }))
}

/**
 * Get all open constraints for a project
 */
export async function getProjectOpenConstraints(
  projectId: string
): Promise<LookAheadConstraintWithDetails[]> {
  const { data, error } = await supabase
    .from('look_ahead_constraints')
    .select(`
      *,
      activity:look_ahead_activities (
        id,
        activity_name,
        trade,
        week_number
      ),
      rfis (
        id,
        rfi_number,
        subject
      ),
      submittals (
        id,
        submittal_number,
        title
      )
    `)
    .eq('project_id', projectId)
    .eq('status', 'open')
    .order('expected_resolution_date', { ascending: true })

  if (error) throw error

  return (data || []).map((constraint) => ({
    ...constraint,
    rfi_number: constraint.rfis?.rfi_number,
    rfi_subject: constraint.rfis?.subject,
    submittal_number: constraint.submittals?.submittal_number,
    submittal_title: constraint.submittals?.title,
  }))
}

/**
 * Create a constraint
 */
export async function createLookAheadConstraint(
  dto: CreateLookAheadConstraintDTO,
  projectId: string,
  companyId: string,
  userId: string
): Promise<LookAheadConstraint> {
  const { data, error } = await supabase
    .from('look_ahead_constraints')
    .insert({
      ...dto,
      project_id: projectId,
      company_id: companyId,
      created_by: userId,
    })
    .select()
    .single()

  if (error) throw error

  // Update activity status if it has open constraints
  await supabase
    .from('look_ahead_activities')
    .update({
      status: 'blocked',
      updated_at: new Date().toISOString(),
    })
    .eq('id', dto.activity_id)
    .in('status', ['planned', 'in_progress'])

  return data
}

/**
 * Update a constraint
 */
export async function updateLookAheadConstraint(
  constraintId: string,
  dto: UpdateLookAheadConstraintDTO,
  userId?: string
): Promise<LookAheadConstraint> {
  const updates: Partial<LookAheadConstraint> = {
    ...dto,
    updated_at: new Date().toISOString(),
  }

  if (dto.status === 'resolved' || dto.status === 'waived') {
    updates.actual_resolution_date = new Date().toISOString().split('T')[0]
    if (userId) {
      updates.resolved_by = userId
    }
  }

  const { data, error } = await supabase
    .from('look_ahead_constraints')
    .update(updates)
    .eq('id', constraintId)
    .select()
    .single()

  if (error) throw error

  // Check if activity should be unblocked
  if (dto.status === 'resolved' || dto.status === 'waived') {
    const { data: activity } = await supabase
      .from('look_ahead_constraints')
      .select('activity_id')
      .eq('id', constraintId)
      .single()

    if (activity) {
      const { data: openConstraints } = await supabase
        .from('look_ahead_constraints')
        .select('id')
        .eq('activity_id', activity.activity_id)
        .eq('status', 'open')

      if (!openConstraints?.length) {
        await supabase
          .from('look_ahead_activities')
          .update({
            status: 'planned',
            updated_at: new Date().toISOString(),
          })
          .eq('id', activity.activity_id)
          .eq('status', 'blocked')
      }
    }
  }

  return data
}

/**
 * Delete a constraint
 */
export async function deleteLookAheadConstraint(constraintId: string): Promise<void> {
  // Get activity ID first
  const { data: constraint } = await supabase
    .from('look_ahead_constraints')
    .select('activity_id')
    .eq('id', constraintId)
    .single()

  const { error } = await supabase.from('look_ahead_constraints').delete().eq('id', constraintId)

  if (error) throw error

  // Check if activity should be unblocked
  if (constraint) {
    const { data: openConstraints } = await supabase
      .from('look_ahead_constraints')
      .select('id')
      .eq('activity_id', constraint.activity_id)
      .eq('status', 'open')

    if (!openConstraints?.length) {
      await supabase
        .from('look_ahead_activities')
        .update({
          status: 'planned',
          updated_at: new Date().toISOString(),
        })
        .eq('id', constraint.activity_id)
        .eq('status', 'blocked')
    }
  }
}

// =============================================
// Snapshots & PPC
// =============================================

/**
 * Get snapshots for a project
 */
export async function getLookAheadSnapshots(
  projectId: string,
  limit?: number
): Promise<LookAheadSnapshot[]> {
  let query = supabase
    .from('look_ahead_snapshots')
    .select('*')
    .eq('project_id', projectId)
    .order('week_start_date', { ascending: false })

  if (limit) {
    query = query.limit(limit)
  }

  const { data, error } = await query

  if (error) throw error
  return data || []
}

/**
 * Create a weekly snapshot
 */
export async function createLookAheadSnapshot(
  dto: CreateLookAheadSnapshotDTO,
  companyId: string,
  userId: string
): Promise<LookAheadSnapshot> {
  const weekEnd = new Date(dto.week_start_date)
  weekEnd.setDate(weekEnd.getDate() + 6)

  // Get activity counts
  const { data: activities } = await supabase
    .from('look_ahead_activities')
    .select('status')
    .eq('project_id', dto.project_id)
    .eq('week_start_date', dto.week_start_date)
    .is('deleted_at', null)

  const counts = {
    planned: 0,
    completed: 0,
    delayed: 0,
    blocked: 0,
    cancelled: 0,
  }

  for (const activity of activities || []) {
    if (activity.status !== 'cancelled') {
      counts.planned++
    }
    if (activity.status === 'completed') counts.completed++
    if (activity.status === 'delayed') counts.delayed++
    if (activity.status === 'blocked') counts.blocked++
    if (activity.status === 'cancelled') counts.cancelled++
  }

  // Get constraint counts
  const activityIds = (activities || []).map(() => null) // We need actual IDs
  const { data: activityData } = await supabase
    .from('look_ahead_activities')
    .select('id')
    .eq('project_id', dto.project_id)
    .eq('week_start_date', dto.week_start_date)
    .is('deleted_at', null)

  const { data: constraints } = await supabase
    .from('look_ahead_constraints')
    .select('status')
    .in(
      'activity_id',
      (activityData || []).map((a) => a.id)
    )

  const constraintCounts = {
    total: constraints?.length || 0,
    resolved: constraints?.filter((c) => c.status === 'resolved' || c.status === 'waived').length || 0,
    open: constraints?.filter((c) => c.status === 'open').length || 0,
  }

  const { data, error } = await supabase
    .from('look_ahead_snapshots')
    .upsert(
      {
        project_id: dto.project_id,
        company_id: companyId,
        week_start_date: dto.week_start_date,
        week_end_date: weekEnd.toISOString().split('T')[0],
        planned_activities: counts.planned,
        completed_activities: counts.completed,
        delayed_activities: counts.delayed,
        blocked_activities: counts.blocked,
        cancelled_activities: counts.cancelled,
        total_constraints: constraintCounts.total,
        resolved_constraints: constraintCounts.resolved,
        open_constraints: constraintCounts.open,
        variance_reasons: dto.variance_reasons || [],
        notes: dto.notes,
        created_by: userId,
        snapshot_date: new Date().toISOString(),
      },
      {
        onConflict: 'project_id,week_start_date',
      }
    )
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Get PPC metrics for a project
 */
export async function getPPCMetrics(projectId: string): Promise<PPCMetrics> {
  const { data: snapshots } = await supabase
    .from('look_ahead_snapshots')
    .select('*')
    .eq('project_id', projectId)
    .order('week_start_date', { ascending: false })
    .limit(10)

  const currentWeek = snapshots?.[0]
  const previousWeek = snapshots?.[1]

  const currentPPC = currentWeek?.ppc_percentage || 0
  const previousPPC = previousWeek?.ppc_percentage || 0
  const ppcChange = currentPPC - previousPPC

  // Calculate averages
  const totalPPCs = snapshots?.map((s) => s.ppc_percentage || 0) || []
  const averagePPC =
    totalPPCs.length > 0 ? totalPPCs.reduce((a, b) => a + b, 0) / totalPPCs.length : 0

  // Calculate totals from current week
  const totalPlanned = currentWeek?.planned_activities || 0
  const totalCompleted = currentWeek?.completed_activities || 0
  const totalDelayed = currentWeek?.delayed_activities || 0
  const totalBlocked = currentWeek?.blocked_activities || 0

  return {
    currentWeekPPC: currentPPC,
    previousWeekPPC: previousPPC,
    ppcChange,
    trend: ppcChange > 0 ? 'up' : ppcChange < 0 ? 'down' : 'stable',
    averagePPC,
    totalPlanned,
    totalCompleted,
    totalDelayed,
    totalBlocked,
  }
}

// =============================================
// Templates
// =============================================

/**
 * Get templates for a company
 */
export async function getLookAheadTemplates(
  companyId: string,
  trade?: string
): Promise<LookAheadTemplate[]> {
  let query = supabase
    .from('look_ahead_templates')
    .select('*')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .order('trade', { ascending: true })
    .order('template_name', { ascending: true })

  if (trade) {
    query = query.eq('trade', trade)
  }

  const { data, error } = await query

  if (error) throw error
  return data || []
}

/**
 * Create activity from template
 */
export async function createActivityFromTemplate(
  templateId: string,
  projectId: string,
  companyId: string,
  userId: string,
  overrides?: Partial<CreateLookAheadActivityDTO>
): Promise<LookAheadActivity> {
  const { data: template, error: templateError } = await supabase
    .from('look_ahead_templates')
    .select('*')
    .eq('id', templateId)
    .single()

  if (templateError) throw templateError

  const today = new Date()
  const startDate = overrides?.planned_start_date || today.toISOString().split('T')[0]
  const endDate =
    overrides?.planned_end_date ||
    new Date(today.getTime() + (template.default_duration_days - 1) * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0]

  return createLookAheadActivity(
    {
      project_id: projectId,
      activity_name: overrides?.activity_name || template.template_name,
      description: overrides?.description || template.description,
      trade: overrides?.trade || template.trade,
      planned_start_date: startDate,
      planned_end_date: endDate,
      estimated_labor_hours: template.default_labor_hours,
      estimated_crew_size: template.default_crew_size,
      ...overrides,
    },
    companyId,
    userId
  )
}

// =============================================
// Dashboard Stats
// =============================================

/**
 * Get look-ahead dashboard stats for a project
 */
export async function getLookAheadDashboardStats(projectId: string): Promise<{
  totalActivities: number
  activitiesByStatus: Record<string, number>
  activitiesByTrade: Record<string, number>
  openConstraints: number
  ppcMetrics: PPCMetrics
  upcomingDeadlines: LookAheadActivityWithDetails[]
}> {
  // Get all activities
  const { data: activities } = await supabase
    .from('look_ahead_activities')
    .select('*')
    .eq('project_id', projectId)
    .is('deleted_at', null)

  // Count by status
  const activitiesByStatus: Record<string, number> = {}
  const activitiesByTrade: Record<string, number> = {}

  for (const activity of activities || []) {
    activitiesByStatus[activity.status] = (activitiesByStatus[activity.status] || 0) + 1
    if (activity.trade) {
      activitiesByTrade[activity.trade] = (activitiesByTrade[activity.trade] || 0) + 1
    }
  }

  // Get open constraints
  const { count: openConstraints } = await supabase
    .from('look_ahead_constraints')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', projectId)
    .eq('status', 'open')

  // Get PPC metrics
  const ppcMetrics = await getPPCMetrics(projectId)

  // Get upcoming deadlines (next 7 days)
  const today = new Date()
  const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)

  const { data: upcomingActivities } = await supabase
    .from('look_ahead_activities')
    .select(`
      *,
      subcontractors (
        id,
        name
      )
    `)
    .eq('project_id', projectId)
    .is('deleted_at', null)
    .in('status', ['planned', 'in_progress', 'blocked'])
    .gte('planned_end_date', today.toISOString().split('T')[0])
    .lte('planned_end_date', nextWeek.toISOString().split('T')[0])
    .order('planned_end_date', { ascending: true })
    .limit(10)

  return {
    totalActivities: activities?.length || 0,
    activitiesByStatus,
    activitiesByTrade,
    openConstraints: openConstraints || 0,
    ppcMetrics,
    upcomingDeadlines: (upcomingActivities || []).map((a) => ({
      ...a,
      subcontractor_name: a.subcontractors?.name,
    })),
  }
}
