/**
 * Look-Ahead Sync Service
 * Synchronizes progress from Daily Reports to Look-Ahead Activities
 */

import { supabase } from '@/lib/supabase'
import type { LookAheadActivity, LookAheadActivityStatus } from '@/types/look-ahead'
import type { ProgressEntry } from '@/types/daily-reports-v2'
import { logger } from '../../utils/logger';


const supabaseUntyped = supabase as any

/**
 * Progress summary for an activity across multiple daily reports
 */
export interface ActivityProgressSummary {
  activity_id: string
  activity_name: string
  look_ahead_activity?: LookAheadActivity
  progress_entries: ProgressEntry[]
  total_entries: number
  first_report_date: string | null
  last_report_date: string | null
  cumulative_percentage: number
  total_hours_logged: number
  variance_reasons: string[]
  suggested_status: LookAheadActivityStatus
  needs_sync: boolean
}

/**
 * Sync result for a single activity
 */
export interface SyncResult {
  activity_id: string
  activity_name: string
  success: boolean
  error?: string
  updates_applied: {
    percent_complete?: number
    status?: LookAheadActivityStatus
    actual_start_date?: string
    actual_end_date?: string
  }
}

/**
 * Batch sync result
 */
export interface BatchSyncResult {
  total: number
  synced: number
  failed: number
  skipped: number
  results: SyncResult[]
}

/**
 * Get progress entries from daily reports that are linked to look-ahead activities
 */
export async function getLinkedProgressEntries(
  projectId: string,
  dateFrom?: string,
  dateTo?: string
): Promise<ProgressEntry[]> {
  let query = supabaseUntyped
    .from('daily_report_progress_entries')
    .select(`
      *,
      daily_report:daily_reports_v2!inner(
        id,
        project_id,
        report_date,
        status
      )
    `)
    .eq('daily_report.project_id', projectId)
    .not('activity_id', 'is', null)
    .order('daily_report.report_date', { ascending: true })

  if (dateFrom) {
    query = query.gte('daily_report.report_date', dateFrom)
  }
  if (dateTo) {
    query = query.lte('daily_report.report_date', dateTo)
  }

  const { data, error } = await query

  if (error) {
    logger.error('Error fetching linked progress entries:', error)
    throw error
  }

  return data || []
}

/**
 * Get all progress entries grouped by activity for a project
 */
export async function getProgressByActivity(
  projectId: string,
  dateFrom?: string,
  dateTo?: string
): Promise<Map<string, ProgressEntry[]>> {
  const entries = await getLinkedProgressEntries(projectId, dateFrom, dateTo)

  const grouped = new Map<string, ProgressEntry[]>()

  for (const entry of entries) {
    if (!entry.activity_id) {continue}

    const existing = grouped.get(entry.activity_id) || []
    existing.push(entry)
    grouped.set(entry.activity_id, existing)
  }

  return grouped
}

/**
 * Calculate progress summary for activities with linked daily report entries
 */
export async function calculateProgressSummaries(
  projectId: string,
  dateFrom?: string,
  dateTo?: string
): Promise<ActivityProgressSummary[]> {
  // Get all linked progress entries
  const progressByActivity = await getProgressByActivity(projectId, dateFrom, dateTo)

  if (progressByActivity.size === 0) {
    return []
  }

  // Get look-ahead activities for these IDs
  const activityIds = Array.from(progressByActivity.keys())

  const { data: activities, error } = await supabaseUntyped
    .from('look_ahead_activities')
    .select('*')
    .in('id', activityIds)
    .is('deleted_at', null)

  if (error) {
    logger.error('Error fetching look-ahead activities:', error)
    throw error
  }

  const activityMap = new Map<string, LookAheadActivity>(
    (activities || []).map((a: LookAheadActivity) => [a.id, a])
  )

  // Calculate summaries
  const summaries: ActivityProgressSummary[] = []

  for (const [activityId, entries] of progressByActivity) {
    const lookAheadActivity = activityMap.get(activityId)

    // Sort entries by date
    const sortedEntries = entries.sort((a, b) => {
      const dateA = (a as any).daily_report?.report_date || ''
      const dateB = (b as any).daily_report?.report_date || ''
      return dateA.localeCompare(dateB)
    })

    // Get the most recent cumulative percentage
    const latestEntry = sortedEntries[sortedEntries.length - 1]
    const cumulativePercentage = latestEntry?.cumulative_percentage ||
      sortedEntries.reduce((sum, e) => sum + (e.actual_percentage_today || 0), 0)

    // Get date range
    const firstDate = (sortedEntries[0] as any)?.daily_report?.report_date || null
    const lastDate = (sortedEntries[sortedEntries.length - 1] as any)?.daily_report?.report_date || null

    // Collect variance reasons
    const varianceReasons = sortedEntries
      .filter(e => e.variance_reason)
      .map(e => e.variance_reason!)

    // Determine suggested status
    let suggestedStatus: LookAheadActivityStatus = 'planned'
    if (cumulativePercentage >= 100) {
      suggestedStatus = 'completed'
    } else if (cumulativePercentage > 0) {
      suggestedStatus = 'in_progress'
    }

    // Check if sync is needed
    const needsSync = lookAheadActivity ? (
      Math.abs(lookAheadActivity.percent_complete - cumulativePercentage) > 1 ||
      (suggestedStatus !== lookAheadActivity.status &&
       lookAheadActivity.status !== 'blocked' &&
       lookAheadActivity.status !== 'cancelled')
    ) : false

    summaries.push({
      activity_id: activityId,
      activity_name: lookAheadActivity?.activity_name || latestEntry?.activity_name || 'Unknown Activity',
      look_ahead_activity: lookAheadActivity,
      progress_entries: sortedEntries,
      total_entries: sortedEntries.length,
      first_report_date: firstDate,
      last_report_date: lastDate,
      cumulative_percentage: Math.min(cumulativePercentage, 100),
      total_hours_logged: 0, // Would need workforce data to calculate
      variance_reasons: varianceReasons,
      suggested_status: suggestedStatus,
      needs_sync: needsSync,
    })
  }

  return summaries.sort((a, b) => {
    // Sort by needs_sync first, then by name
    if (a.needs_sync !== b.needs_sync) {return a.needs_sync ? -1 : 1}
    return a.activity_name.localeCompare(b.activity_name)
  })
}

/**
 * Sync a single look-ahead activity from daily report progress
 */
export async function syncActivityFromProgress(
  activityId: string,
  summary: ActivityProgressSummary,
  userId?: string
): Promise<SyncResult> {
  const result: SyncResult = {
    activity_id: activityId,
    activity_name: summary.activity_name,
    success: false,
    updates_applied: {},
  }

  if (!summary.look_ahead_activity) {
    result.error = 'Look-ahead activity not found'
    return result
  }

  const activity = summary.look_ahead_activity
  const updates: Partial<LookAheadActivity> = {
    updated_at: new Date().toISOString(),
  }

  if (userId) {
    updates.updated_by = userId
  }

  // Update percent complete if different
  if (Math.abs(activity.percent_complete - summary.cumulative_percentage) > 1) {
    updates.percent_complete = summary.cumulative_percentage
    result.updates_applied.percent_complete = summary.cumulative_percentage
  }

  // Update status if appropriate
  if (summary.suggested_status !== activity.status &&
      activity.status !== 'blocked' &&
      activity.status !== 'cancelled') {
    updates.status = summary.suggested_status
    result.updates_applied.status = summary.suggested_status

    // Set actual dates based on status
    if (summary.suggested_status === 'in_progress' && !activity.actual_start_date) {
      updates.actual_start_date = summary.first_report_date || new Date().toISOString().split('T')[0]
      result.updates_applied.actual_start_date = updates.actual_start_date
    }

    if (summary.suggested_status === 'completed') {
      updates.actual_end_date = summary.last_report_date || new Date().toISOString().split('T')[0]
      result.updates_applied.actual_end_date = updates.actual_end_date

      // Also update make_ready_status to 'did_do' for Last Planner tracking
      updates.make_ready_status = 'did_do'
    }
  }

  // Only update if there are changes
  if (Object.keys(result.updates_applied).length === 0) {
    result.success = true
    return result
  }

  try {
    const { error } = await supabaseUntyped
      .from('look_ahead_activities')
      .update(updates)
      .eq('id', activityId)

    if (error) {throw error}

    result.success = true
  } catch (error: any) {
    result.error = error.message || 'Failed to update activity'
  }

  return result
}

/**
 * Batch sync all activities from daily report progress
 */
export async function syncAllActivitiesFromProgress(
  projectId: string,
  dateFrom?: string,
  dateTo?: string,
  userId?: string,
  onlyNeedsSync: boolean = true
): Promise<BatchSyncResult> {
  const summaries = await calculateProgressSummaries(projectId, dateFrom, dateTo)

  const result: BatchSyncResult = {
    total: summaries.length,
    synced: 0,
    failed: 0,
    skipped: 0,
    results: [],
  }

  for (const summary of summaries) {
    if (onlyNeedsSync && !summary.needs_sync) {
      result.skipped++
      continue
    }

    const syncResult = await syncActivityFromProgress(summary.activity_id, summary, userId)
    result.results.push(syncResult)

    if (syncResult.success) {
      if (Object.keys(syncResult.updates_applied).length > 0) {
        result.synced++
      } else {
        result.skipped++
      }
    } else {
      result.failed++
    }
  }

  return result
}

/**
 * Link a daily report progress entry to a look-ahead activity
 */
export async function linkProgressToActivity(
  progressEntryId: string,
  activityId: string
): Promise<void> {
  const { error } = await supabaseUntyped
    .from('daily_report_progress_entries')
    .update({
      activity_id: activityId,
      updated_at: new Date().toISOString()
    })
    .eq('id', progressEntryId)

  if (error) {
    logger.error('Error linking progress to activity:', error)
    throw error
  }
}

/**
 * Unlink a daily report progress entry from look-ahead activity
 */
export async function unlinkProgressFromActivity(
  progressEntryId: string
): Promise<void> {
  const { error } = await supabaseUntyped
    .from('daily_report_progress_entries')
    .update({
      activity_id: null,
      updated_at: new Date().toISOString()
    })
    .eq('id', progressEntryId)

  if (error) {
    logger.error('Error unlinking progress from activity:', error)
    throw error
  }
}

/**
 * Auto-link progress entries to activities by matching criteria
 * Matches by: exact activity name, or cost code, or work area + trade
 */
export async function autoLinkProgressEntries(
  projectId: string,
  dateFrom?: string,
  dateTo?: string
): Promise<{ linked: number; unmatched: number }> {
  // Get unlinked progress entries
  let query = supabaseUntyped
    .from('daily_report_progress_entries')
    .select(`
      *,
      daily_report:daily_reports_v2!inner(
        id,
        project_id,
        report_date
      )
    `)
    .eq('daily_report.project_id', projectId)
    .is('activity_id', null)

  if (dateFrom) {
    query = query.gte('daily_report.report_date', dateFrom)
  }
  if (dateTo) {
    query = query.lte('daily_report.report_date', dateTo)
  }

  const { data: unlinkedEntries, error: entriesError } = await query

  if (entriesError) {
    logger.error('Error fetching unlinked entries:', entriesError)
    throw entriesError
  }

  if (!unlinkedEntries || unlinkedEntries.length === 0) {
    return { linked: 0, unmatched: 0 }
  }

  // Get all look-ahead activities for the project
  const { data: activities, error: activitiesError } = await supabaseUntyped
    .from('look_ahead_activities')
    .select('id, activity_name, trade, location')
    .eq('project_id', projectId)
    .is('deleted_at', null)

  if (activitiesError) {
    logger.error('Error fetching activities:', activitiesError)
    throw activitiesError
  }

  if (!activities || activities.length === 0) {
    return { linked: 0, unmatched: unlinkedEntries.length }
  }

  // Build lookup maps
  const activityByName = new Map<string, string>()
  const activityByLocation = new Map<string, string>()

  for (const activity of activities) {
    // Normalize name for matching
    const normalizedName = activity.activity_name.toLowerCase().trim()
    activityByName.set(normalizedName, activity.id)

    // Also index by location + trade combination
    if (activity.location && activity.trade) {
      const key = `${activity.location.toLowerCase()}_${activity.trade.toLowerCase()}`
      activityByLocation.set(key, activity.id)
    }
  }

  let linked = 0
  let unmatched = 0

  for (const entry of unlinkedEntries) {
    let matchedActivityId: string | null = null

    // Try exact name match first
    const normalizedEntryName = entry.activity_name?.toLowerCase().trim() || ''
    if (activityByName.has(normalizedEntryName)) {
      matchedActivityId = activityByName.get(normalizedEntryName)!
    }

    // Try location + trade match
    if (!matchedActivityId && entry.work_area) {
      // This is a simplified match - could be enhanced with fuzzy matching
      const key = `${entry.work_area.toLowerCase()}_${entry.cost_code?.toLowerCase() || ''}`
      if (activityByLocation.has(key)) {
        matchedActivityId = activityByLocation.get(key)!
      }
    }

    if (matchedActivityId) {
      try {
        await linkProgressToActivity(entry.id, matchedActivityId)
        linked++
      } catch {
        unmatched++
      }
    } else {
      unmatched++
    }
  }

  return { linked, unmatched }
}

/**
 * Get sync status summary for a project
 */
export async function getSyncStatus(projectId: string): Promise<{
  total_activities: number
  activities_with_progress: number
  activities_needing_sync: number
  last_sync_date: string | null
}> {
  const summaries = await calculateProgressSummaries(projectId)

  const { count: totalActivities } = await supabaseUntyped
    .from('look_ahead_activities')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', projectId)
    .is('deleted_at', null)

  return {
    total_activities: totalActivities || 0,
    activities_with_progress: summaries.length,
    activities_needing_sync: summaries.filter(s => s.needs_sync).length,
    last_sync_date: null, // Could track this in a separate table
  }
}

export const lookAheadSyncApi = {
  getLinkedProgressEntries,
  getProgressByActivity,
  calculateProgressSummaries,
  syncActivityFromProgress,
  syncAllActivitiesFromProgress,
  linkProgressToActivity,
  unlinkProgressFromActivity,
  autoLinkProgressEntries,
  getSyncStatus,
}
