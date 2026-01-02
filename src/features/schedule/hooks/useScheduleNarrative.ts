/**
 * Schedule Narrative Hook
 *
 * Generates auto-generated schedule narrative text based on
 * schedule analysis, critical path changes, delays, and variances.
 */

import { useMemo } from 'react'
import {
  format,
  parseISO,
  differenceInDays,
  isAfter,
  isBefore,
  addDays,
} from 'date-fns'
import type {
  ScheduleActivity,
  ScheduleDependency,
  ScheduleBaseline,
  ScheduleStats,
} from '@/types/schedule-activities'

// =============================================
// Types
// =============================================

export interface NarrativeSection {
  title: string
  content: string
  items?: string[]
  severity?: 'info' | 'success' | 'warning' | 'error'
}

export interface DelayedActivity {
  activity: ScheduleActivity
  delayDays: number
  reason: string
  impact: 'critical' | 'high' | 'medium' | 'low'
}

export interface CriticalPathChange {
  type: 'added' | 'removed' | 'extended' | 'shortened'
  activityId: string
  activityName: string
  description: string
}

export interface ScheduleNarrative {
  generatedAt: string
  projectName: string
  dataDate: string
  reportPeriod: string

  // Summary
  executiveSummary: string
  overallStatus: 'on_track' | 'at_risk' | 'behind' | 'ahead'
  healthScore: number // 0-100

  // Sections
  sections: NarrativeSection[]

  // Details
  criticalPathActivities: ScheduleActivity[]
  criticalPathChanges: CriticalPathChange[]
  delayedActivities: DelayedActivity[]
  upcomingMilestones: ScheduleActivity[]
  completedActivities: ScheduleActivity[]

  // Metrics
  metrics: {
    totalActivities: number
    completedCount: number
    inProgressCount: number
    notStartedCount: number
    overdueCount: number
    criticalCount: number
    percentComplete: number
    scheduleVarianceDays: number
    projectedCompletionDate: string | null
    baselineCompletionDate: string | null
  }
}

export interface NarrativeOptions {
  projectName?: string
  dataDate?: Date
  reportPeriodStart?: Date
  reportPeriodEnd?: Date
  includeCompletedActivities?: boolean
  includeCriticalPath?: boolean
  includeVarianceAnalysis?: boolean
  includeUpcomingWork?: boolean
  lookAheadDays?: number
}

// =============================================
// Helper Functions
// =============================================

function getActivityStatus(activity: ScheduleActivity): 'completed' | 'in_progress' | 'not_started' | 'overdue' {
  if (activity.status === 'completed' || activity.percent_complete >= 100) {
    return 'completed'
  }
  if (activity.actual_start) {
    return 'in_progress'
  }
  if (activity.planned_start && isBefore(parseISO(activity.planned_start), new Date()) && !activity.actual_start) {
    return 'overdue'
  }
  return 'not_started'
}

function calculateVariance(activity: ScheduleActivity): number {
  if (!activity.baseline_finish || !activity.planned_finish) return 0

  try {
    const baseline = parseISO(activity.baseline_finish)
    const planned = parseISO(activity.planned_finish)
    return differenceInDays(planned, baseline)
  } catch {
    return 0
  }
}

function getDelayReason(activity: ScheduleActivity): string {
  // In a real system, this would come from delay analysis or user input
  if (activity.notes) {
    return activity.notes.substring(0, 100)
  }

  if (activity.status === 'on_hold') {
    return 'Activity is on hold'
  }

  if (!activity.actual_start && activity.planned_start) {
    return 'Late start - activity did not begin as scheduled'
  }

  if (activity.actual_duration && activity.planned_duration) {
    if (activity.actual_duration > activity.planned_duration) {
      return 'Duration exceeded original estimate'
    }
  }

  return 'Schedule variance from baseline'
}

function getImpactLevel(
  activity: ScheduleActivity,
  delayDays: number
): 'critical' | 'high' | 'medium' | 'low' {
  if (activity.is_critical || activity.is_on_critical_path) {
    return 'critical'
  }
  if (delayDays > 14) {
    return 'high'
  }
  if (delayDays > 7) {
    return 'medium'
  }
  return 'low'
}

function formatDuration(days: number): string {
  if (days === 1) return '1 day'
  if (days < 7) return `${days} days`
  const weeks = Math.floor(days / 7)
  const remainingDays = days % 7
  if (remainingDays === 0) {
    return weeks === 1 ? '1 week' : `${weeks} weeks`
  }
  return `${weeks} week${weeks !== 1 ? 's' : ''} and ${remainingDays} day${remainingDays !== 1 ? 's' : ''}`
}

// =============================================
// Hook
// =============================================

export function useScheduleNarrative(
  activities: ScheduleActivity[],
  dependencies: ScheduleDependency[],
  baseline?: ScheduleBaseline | null,
  stats?: ScheduleStats | null,
  options: NarrativeOptions = {}
): ScheduleNarrative {
  const {
    projectName = 'Project Schedule',
    dataDate = new Date(),
    reportPeriodStart,
    reportPeriodEnd,
    includeCompletedActivities = true,
    includeCriticalPath = true,
    includeVarianceAnalysis = true,
    includeUpcomingWork = true,
    lookAheadDays = 14,
  } = options

  return useMemo(() => {
    const now = new Date()
    const dataDateStr = format(dataDate, 'yyyy-MM-dd')
    const lookAheadEnd = addDays(now, lookAheadDays)

    // Categorize activities
    const completed = activities.filter((a) => getActivityStatus(a) === 'completed')
    const inProgress = activities.filter((a) => getActivityStatus(a) === 'in_progress')
    const notStarted = activities.filter((a) => getActivityStatus(a) === 'not_started')
    const overdue = activities.filter((a) => getActivityStatus(a) === 'overdue')
    const critical = activities.filter((a) => a.is_critical || a.is_on_critical_path)

    // Find delayed activities
    const delayedActivities: DelayedActivity[] = activities
      .filter((a) => {
        const variance = calculateVariance(a)
        return variance > 0
      })
      .map((a) => {
        const delayDays = calculateVariance(a)
        return {
          activity: a,
          delayDays,
          reason: getDelayReason(a),
          impact: getImpactLevel(a, delayDays),
        }
      })
      .sort((a, b) => {
        // Sort by impact, then by delay days
        const impactOrder = { critical: 0, high: 1, medium: 2, low: 3 }
        const impactDiff = impactOrder[a.impact] - impactOrder[b.impact]
        if (impactDiff !== 0) return impactDiff
        return b.delayDays - a.delayDays
      })

    // Find upcoming milestones
    const upcomingMilestones = activities
      .filter((a) => {
        if (!a.is_milestone) return false
        if (!a.planned_finish) return false
        const finish = parseISO(a.planned_finish)
        return isAfter(finish, now) && isBefore(finish, lookAheadEnd)
      })
      .sort((a, b) => {
        const aDate = parseISO(a.planned_finish!)
        const bDate = parseISO(b.planned_finish!)
        return aDate.getTime() - bDate.getTime()
      })

    // Calculate metrics
    const totalActivities = activities.length
    const percentComplete = stats?.overall_progress ??
      (totalActivities > 0 ? (completed.length / totalActivities) * 100 : 0)

    const projectEndDate = activities
      .filter((a) => a.planned_finish)
      .map((a) => a.planned_finish!)
      .sort()
      .pop() || null

    const baselineEndDate = baseline?.planned_finish || stats?.baseline_finish || null

    const scheduleVarianceDays = projectEndDate && baselineEndDate
      ? differenceInDays(parseISO(projectEndDate), parseISO(baselineEndDate))
      : (stats?.variance_days || 0)

    // Determine overall status
    let overallStatus: ScheduleNarrative['overallStatus'] = 'on_track'
    if (scheduleVarianceDays > 14 || overdue.length > critical.length * 0.5) {
      overallStatus = 'behind'
    } else if (scheduleVarianceDays > 0 || overdue.length > 0) {
      overallStatus = 'at_risk'
    } else if (scheduleVarianceDays < 0) {
      overallStatus = 'ahead'
    }

    // Calculate health score
    let healthScore = 100
    healthScore -= overdue.length * 5
    healthScore -= delayedActivities.filter((d) => d.impact === 'critical').length * 10
    healthScore -= Math.abs(scheduleVarianceDays)
    healthScore = Math.max(0, Math.min(100, healthScore))

    // Generate sections
    const sections: NarrativeSection[] = []

    // Executive Summary Section
    const executiveSummary = generateExecutiveSummary(
      overallStatus,
      percentComplete,
      scheduleVarianceDays,
      overdue.length,
      critical.length,
      upcomingMilestones
    )

    // Progress Section
    sections.push({
      title: 'Progress Summary',
      severity: overallStatus === 'on_track' ? 'success' : overallStatus === 'behind' ? 'error' : 'warning',
      content: `The project is currently ${percentComplete.toFixed(1)}% complete with ${completed.length} of ${totalActivities} activities finished.`,
      items: [
        `${inProgress.length} activities are currently in progress`,
        `${notStarted.length} activities have not yet started`,
        overdue.length > 0 ? `${overdue.length} activities are overdue` : 'No activities are currently overdue',
      ],
    })

    // Critical Path Section
    if (includeCriticalPath && critical.length > 0) {
      sections.push({
        title: 'Critical Path Status',
        severity: delayedActivities.some((d) => d.impact === 'critical') ? 'warning' : 'info',
        content: `The critical path consists of ${critical.length} activities. ${
          delayedActivities.filter((d) => d.impact === 'critical').length
        } critical activities are currently delayed.`,
        items: critical.slice(0, 5).map((a) => {
          const variance = calculateVariance(a)
          const status = getActivityStatus(a)
          return `${a.name}: ${status === 'completed' ? 'Complete' : status === 'in_progress' ? 'In Progress' : 'Not Started'}${
            variance > 0 ? ` (${variance}d behind baseline)` : ''
          }`
        }),
      })
    }

    // Delays Section
    if (includeVarianceAnalysis && delayedActivities.length > 0) {
      sections.push({
        title: 'Delayed Activities',
        severity: 'warning',
        content: `${delayedActivities.length} activities are currently behind schedule, with a combined delay impact of ${
          delayedActivities.reduce((sum, d) => sum + d.delayDays, 0)
        } days.`,
        items: delayedActivities.slice(0, 5).map(
          (d) => `${d.activity.name}: ${d.delayDays} days behind - ${d.reason}`
        ),
      })
    }

    // Variance Analysis Section
    if (includeVarianceAnalysis && baselineEndDate) {
      const varianceText = scheduleVarianceDays === 0
        ? 'on schedule with the baseline'
        : scheduleVarianceDays > 0
          ? `${formatDuration(scheduleVarianceDays)} behind the baseline`
          : `${formatDuration(Math.abs(scheduleVarianceDays))} ahead of the baseline`

      sections.push({
        title: 'Schedule Variance',
        severity: scheduleVarianceDays > 7 ? 'error' : scheduleVarianceDays > 0 ? 'warning' : 'success',
        content: `The project is currently ${varianceText}. The baseline completion date was ${format(parseISO(baselineEndDate), 'MMMM d, yyyy')}${
          projectEndDate ? `, and the current projected completion is ${format(parseISO(projectEndDate), 'MMMM d, yyyy')}` : ''
        }.`,
      })
    }

    // Upcoming Work Section
    if (includeUpcomingWork) {
      const upcomingActivities = activities.filter((a) => {
        if (!a.planned_start) return false
        const start = parseISO(a.planned_start)
        return isAfter(start, now) && isBefore(start, lookAheadEnd) && getActivityStatus(a) === 'not_started'
      })

      sections.push({
        title: `${lookAheadDays}-Day Look Ahead`,
        severity: 'info',
        content: `${upcomingActivities.length} activities are scheduled to start in the next ${lookAheadDays} days${
          upcomingMilestones.length > 0 ? `, including ${upcomingMilestones.length} milestone(s)` : ''
        }.`,
        items: [
          ...upcomingMilestones.slice(0, 3).map(
            (m) => `MILESTONE: ${m.name} - ${format(parseISO(m.planned_finish!), 'MMM d, yyyy')}`
          ),
          ...upcomingActivities.slice(0, 5).map(
            (a) => `${a.name} - Starting ${format(parseISO(a.planned_start!), 'MMM d')}`
          ),
        ],
      })
    }

    // Completed Activities Section
    if (includeCompletedActivities && completed.length > 0) {
      const recentlyCompleted = completed
        .filter((a) => a.actual_finish)
        .sort((a, b) => {
          const aDate = parseISO(a.actual_finish!)
          const bDate = parseISO(b.actual_finish!)
          return bDate.getTime() - aDate.getTime()
        })
        .slice(0, 5)

      if (recentlyCompleted.length > 0) {
        sections.push({
          title: 'Recently Completed',
          severity: 'success',
          content: `${completed.length} activities have been completed to date.`,
          items: recentlyCompleted.map(
            (a) => `${a.name} - Completed ${format(parseISO(a.actual_finish!), 'MMM d, yyyy')}`
          ),
        })
      }
    }

    // Build report period string
    const reportPeriod = reportPeriodStart && reportPeriodEnd
      ? `${format(reportPeriodStart, 'MMM d')} - ${format(reportPeriodEnd, 'MMM d, yyyy')}`
      : `As of ${format(dataDate, 'MMMM d, yyyy')}`

    return {
      generatedAt: format(now, "yyyy-MM-dd'T'HH:mm:ss"),
      projectName,
      dataDate: dataDateStr,
      reportPeriod,
      executiveSummary,
      overallStatus,
      healthScore,
      sections,
      criticalPathActivities: critical,
      criticalPathChanges: [], // Would require comparing to previous analysis
      delayedActivities,
      upcomingMilestones,
      completedActivities: completed,
      metrics: {
        totalActivities,
        completedCount: completed.length,
        inProgressCount: inProgress.length,
        notStartedCount: notStarted.length,
        overdueCount: overdue.length,
        criticalCount: critical.length,
        percentComplete: Math.round(percentComplete * 10) / 10,
        scheduleVarianceDays,
        projectedCompletionDate: projectEndDate,
        baselineCompletionDate: baselineEndDate,
      },
    }
  }, [
    activities,
    dependencies,
    baseline,
    stats,
    projectName,
    dataDate,
    reportPeriodStart,
    reportPeriodEnd,
    includeCompletedActivities,
    includeCriticalPath,
    includeVarianceAnalysis,
    includeUpcomingWork,
    lookAheadDays,
  ])
}

function generateExecutiveSummary(
  status: ScheduleNarrative['overallStatus'],
  percentComplete: number,
  varianceDays: number,
  overdueCount: number,
  criticalCount: number,
  upcomingMilestones: ScheduleActivity[]
): string {
  const statusText = {
    on_track: 'on track',
    at_risk: 'at risk',
    behind: 'behind schedule',
    ahead: 'ahead of schedule',
  }

  let summary = `The project is currently ${statusText[status]} at ${percentComplete.toFixed(1)}% complete. `

  if (varianceDays !== 0) {
    summary += varianceDays > 0
      ? `The schedule shows a ${varianceDays}-day delay from baseline. `
      : `The project is ${Math.abs(varianceDays)} days ahead of the baseline schedule. `
  }

  if (overdueCount > 0) {
    summary += `${overdueCount} activit${overdueCount === 1 ? 'y is' : 'ies are'} currently overdue and require attention. `
  }

  if (upcomingMilestones.length > 0) {
    const nextMilestone = upcomingMilestones[0]
    summary += `The next milestone, "${nextMilestone.name}", is scheduled for ${format(parseISO(nextMilestone.planned_finish!), 'MMMM d, yyyy')}.`
  }

  return summary
}

export default useScheduleNarrative
