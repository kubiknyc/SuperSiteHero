/**
 * Submittal Tracker Tool
 * Tracks and analyzes submittal status across a project
 */

import { createTool } from '../registry'
import { supabase } from '@/lib/supabase'
import type { AgentContext } from '../../types'

interface TrackSubmittalsInput {
  project_id: string
  filter_status?: 'pending' | 'submitted' | 'approved' | 'rejected' | 'all'
  spec_section?: string
  subcontractor_id?: string
  days_overdue_threshold?: number
}

interface SubmittalItem {
  id: string
  number: string
  title: string
  spec_section: string
  subcontractor: string
  status: string
  submitted_date: string | null
  required_date: string | null
  days_until_due: number | null
  days_overdue: number | null
  review_cycles: number
  current_reviewer: string | null
}

interface TrackSubmittalsOutput {
  summary: {
    total: number
    pending: number
    submitted: number
    under_review: number
    approved: number
    rejected: number
    overdue: number
    due_this_week: number
  }
  overdue_submittals: SubmittalItem[]
  upcoming_due: SubmittalItem[]
  recently_approved: SubmittalItem[]
  by_spec_section: Record<string, { total: number; approved: number; pending: number }>
  by_subcontractor: Record<string, { total: number; approved: number; pending: number; overdue: number }>
  bottlenecks: Array<{
    type: string
    description: string
    affected_count: number
    recommendation: string
  }>
  recommendations: string[]
}

export const trackSubmittalsTool = createTool<TrackSubmittalsInput, TrackSubmittalsOutput>({
  name: 'track_submittals',
  description: 'Tracks submittal status across a project, identifies overdue items, bottlenecks, and provides recommendations for improving submittal workflow.',
  category: 'submittals',
  parameters: {
    type: 'object',
    properties: {
      project_id: {
        type: 'string',
        description: 'The project ID to track submittals for'
      },
      filter_status: {
        type: 'string',
        enum: ['pending', 'submitted', 'approved', 'rejected', 'all'],
        description: 'Filter by status (default: all)'
      },
      spec_section: {
        type: 'string',
        description: 'Filter by CSI spec section (e.g., "03 30 00")'
      },
      subcontractor_id: {
        type: 'string',
        description: 'Filter by specific subcontractor'
      },
      days_overdue_threshold: {
        type: 'number',
        description: 'Days overdue to flag as critical (default: 7)'
      }
    },
    required: ['project_id']
  },

  async execute(input: TrackSubmittalsInput, context: AgentContext): Promise<TrackSubmittalsOutput> {
    const {
      project_id,
      filter_status = 'all',
      spec_section,
      subcontractor_id,
      days_overdue_threshold = 7
    } = input

    // Build query
    let query = supabase
      .from('submittals')
      .select(`
        *,
        subcontractor:subcontractors(id, company_name),
        reviews:submittal_reviews(id, reviewer_id, status, reviewed_at)
      `)
      .eq('project_id', project_id)
      .is('deleted_at', null)

    if (filter_status !== 'all') {
      query = query.eq('status', filter_status)
    }

    if (spec_section) {
      query = query.ilike('spec_section', `${spec_section}%`)
    }

    if (subcontractor_id) {
      query = query.eq('subcontractor_id', subcontractor_id)
    }

    const { data: submittals } = await query.order('required_date', { ascending: true })

    const now = new Date()
    const weekFromNow = new Date(now)
    weekFromNow.setDate(weekFromNow.getDate() + 7)

    // Process submittals
    const processedSubmittals: SubmittalItem[] = []
    const overdueSubmittals: SubmittalItem[] = []
    const upcomingDue: SubmittalItem[] = []
    const recentlyApproved: SubmittalItem[] = []

    const bySpecSection: Record<string, { total: number; approved: number; pending: number }> = {}
    const bySubcontractor: Record<string, { total: number; approved: number; pending: number; overdue: number }> = {}

    let pending = 0
    let submitted = 0
    let underReview = 0
    let approved = 0
    let rejected = 0
    let overdue = 0
    let dueThisWeek = 0

    for (const submittal of submittals || []) {
      const requiredDate = submittal.required_date ? new Date(submittal.required_date) : null
      const submittedDate = submittal.submitted_date ? new Date(submittal.submitted_date) : null

      let daysUntilDue: number | null = null
      let daysOverdue: number | null = null

      if (requiredDate) {
        const diffMs = requiredDate.getTime() - now.getTime()
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

        if (diffDays < 0 && submittal.status !== 'approved') {
          daysOverdue = Math.abs(diffDays)
          overdue++
        } else if (diffDays >= 0) {
          daysUntilDue = diffDays
          if (diffDays <= 7) {
            dueThisWeek++
          }
        }
      }

      // Count by status
      switch (submittal.status) {
        case 'pending':
        case 'not_submitted':
          pending++
          break
        case 'submitted':
          submitted++
          break
        case 'under_review':
        case 'in_review':
          underReview++
          break
        case 'approved':
          approved++
          break
        case 'rejected':
        case 'revise_resubmit':
          rejected++
          break
      }

      const subcontractorName = submittal.subcontractor?.company_name || 'Unknown'
      const specSec = submittal.spec_section || 'Unassigned'

      // Track by spec section
      if (!bySpecSection[specSec]) {
        bySpecSection[specSec] = { total: 0, approved: 0, pending: 0 }
      }
      bySpecSection[specSec].total++
      if (submittal.status === 'approved') bySpecSection[specSec].approved++
      if (['pending', 'not_submitted'].includes(submittal.status)) bySpecSection[specSec].pending++

      // Track by subcontractor
      if (!bySubcontractor[subcontractorName]) {
        bySubcontractor[subcontractorName] = { total: 0, approved: 0, pending: 0, overdue: 0 }
      }
      bySubcontractor[subcontractorName].total++
      if (submittal.status === 'approved') bySubcontractor[subcontractorName].approved++
      if (['pending', 'not_submitted'].includes(submittal.status)) bySubcontractor[subcontractorName].pending++
      if (daysOverdue) bySubcontractor[subcontractorName].overdue++

      const item: SubmittalItem = {
        id: submittal.id,
        number: submittal.submittal_number || submittal.number || '',
        title: submittal.title || submittal.description || '',
        spec_section: specSec,
        subcontractor: subcontractorName,
        status: submittal.status,
        submitted_date: submittal.submitted_date,
        required_date: submittal.required_date,
        days_until_due: daysUntilDue,
        days_overdue: daysOverdue,
        review_cycles: submittal.reviews?.length || 0,
        current_reviewer: submittal.current_reviewer || null
      }

      processedSubmittals.push(item)

      // Categorize
      if (daysOverdue && daysOverdue >= days_overdue_threshold) {
        overdueSubmittals.push(item)
      }

      if (daysUntilDue !== null && daysUntilDue <= 14 && daysUntilDue >= 0) {
        upcomingDue.push(item)
      }

      if (submittal.status === 'approved' && submittal.approved_date) {
        const approvedDate = new Date(submittal.approved_date)
        const daysSinceApproval = Math.floor((now.getTime() - approvedDate.getTime()) / (1000 * 60 * 60 * 24))
        if (daysSinceApproval <= 7) {
          recentlyApproved.push(item)
        }
      }
    }

    // Identify bottlenecks
    const bottlenecks = identifyBottlenecks(
      processedSubmittals,
      bySubcontractor,
      overdueSubmittals,
      underReview
    )

    // Generate recommendations
    const recommendations = generateRecommendations(
      overdue,
      pending,
      underReview,
      bottlenecks,
      bySubcontractor
    )

    return {
      summary: {
        total: processedSubmittals.length,
        pending,
        submitted,
        under_review: underReview,
        approved,
        rejected,
        overdue,
        due_this_week: dueThisWeek
      },
      overdue_submittals: overdueSubmittals.slice(0, 10),
      upcoming_due: upcomingDue.slice(0, 10),
      recently_approved: recentlyApproved.slice(0, 5),
      by_spec_section: bySpecSection,
      by_subcontractor: bySubcontractor,
      bottlenecks,
      recommendations
    }
  }
})

function identifyBottlenecks(
  submittals: SubmittalItem[],
  bySubcontractor: Record<string, { total: number; approved: number; pending: number; overdue: number }>,
  overdueSubmittals: SubmittalItem[],
  underReview: number
): Array<{
  type: string
  description: string
  affected_count: number
  recommendation: string
}> {
  const bottlenecks: Array<{
    type: string
    description: string
    affected_count: number
    recommendation: string
  }> = []

  // Check for review backlog
  if (underReview > 10) {
    bottlenecks.push({
      type: 'Review Backlog',
      description: `${underReview} submittals awaiting review`,
      affected_count: underReview,
      recommendation: 'Schedule dedicated review sessions or delegate to additional reviewers'
    })
  }

  // Check for subcontractor issues
  for (const [subName, stats] of Object.entries(bySubcontractor)) {
    if (stats.overdue >= 3) {
      bottlenecks.push({
        type: 'Subcontractor Delays',
        description: `${subName} has ${stats.overdue} overdue submittals`,
        affected_count: stats.overdue,
        recommendation: `Contact ${subName} to expedite outstanding submittals`
      })
    }
  }

  // Check for long-cycle reviews
  const multiCycleSubmittals = submittals.filter(s => s.review_cycles >= 3)
  if (multiCycleSubmittals.length >= 3) {
    bottlenecks.push({
      type: 'Multiple Review Cycles',
      description: `${multiCycleSubmittals.length} submittals with 3+ review cycles`,
      affected_count: multiCycleSubmittals.length,
      recommendation: 'Review submittal requirements with trades to reduce resubmittals'
    })
  }

  // Check for critical overdue
  const criticalOverdue = overdueSubmittals.filter(s => (s.days_overdue || 0) > 14)
  if (criticalOverdue.length > 0) {
    bottlenecks.push({
      type: 'Critical Overdue',
      description: `${criticalOverdue.length} submittals overdue by more than 2 weeks`,
      affected_count: criticalOverdue.length,
      recommendation: 'Immediate follow-up required - may impact schedule'
    })
  }

  return bottlenecks.slice(0, 5)
}

function generateRecommendations(
  overdue: number,
  pending: number,
  underReview: number,
  bottlenecks: Array<{ type: string; description: string; affected_count: number; recommendation: string }>,
  bySubcontractor: Record<string, { total: number; approved: number; pending: number; overdue: number }>
): string[] {
  const recommendations: string[] = []

  if (overdue > 5) {
    recommendations.push('URGENT: Schedule submittal recovery meeting to address overdue items')
  }

  if (underReview > pending) {
    recommendations.push('Review queue is larger than pending - prioritize completing reviews')
  }

  if (pending > 20) {
    recommendations.push('Large pending queue - send reminder to subcontractors about upcoming submittals')
  }

  // Find best performing subcontractor
  let bestSub = { name: '', rate: 0 }
  let worstSub = { name: '', rate: 1 }

  for (const [name, stats] of Object.entries(bySubcontractor)) {
    if (stats.total >= 3) {
      const rate = stats.approved / stats.total
      if (rate > bestSub.rate) {
        bestSub = { name, rate }
      }
      if (rate < worstSub.rate) {
        worstSub = { name, rate }
      }
    }
  }

  if (worstSub.rate < 0.3 && worstSub.name) {
    recommendations.push(`${worstSub.name} has low approval rate - schedule pre-submission coordination meeting`)
  }

  if (bottlenecks.length === 0 && overdue === 0) {
    recommendations.push('Submittal workflow is healthy - maintain current tracking cadence')
  }

  recommendations.push('Generate weekly submittal status report for OAC meetings')

  return recommendations.slice(0, 5)
}
