/**
 * Predict Approval Timeline Tool
 * Predicts how long an approval will take based on historical data and current conditions
 */

import { createTool } from '../registry'
import { supabase } from '@/lib/supabase'

interface PredictApprovalTimelineInput {
  project_id: string
  item_type: 'change_order' | 'invoice' | 'submittal' | 'rfi' | 'payment_application' | 'purchase_order'
  item_id?: string
  assigned_to?: string
  value?: number
}

interface TimelineBreakdown {
  stage: string
  estimated_hours: number
  confidence: number
  factors: string[]
}

interface HistoricalComparison {
  similar_items_count: number
  avg_completion_hours: number
  min_hours: number
  max_hours: number
  on_time_percentage: number
}

interface RiskFactor {
  factor: string
  impact: 'speeds_up' | 'delays' | 'neutral'
  impact_hours: number
  description: string
}

interface PredictApprovalTimelineOutput {
  item_type: string
  predicted_hours: number
  predicted_completion: string
  confidence_level: 'high' | 'medium' | 'low'
  confidence_percentage: number
  timeline_breakdown: TimelineBreakdown[]
  historical_comparison: HistoricalComparison
  risk_factors: RiskFactor[]
  recommendations: string[]
}

// Average times by item type (hours)
const BASE_APPROVAL_TIMES: Record<string, number> = {
  change_order: 72,
  invoice: 48,
  submittal: 120,
  rfi: 96,
  payment_application: 72,
  purchase_order: 48,
}

// Day of week factors (0 = Sunday)
const DAY_FACTORS: Record<number, number> = {
  0: 1.5, // Sunday - slow
  1: 0.9, // Monday - fast
  2: 0.85, // Tuesday - fastest
  3: 0.9, // Wednesday
  4: 1.0, // Thursday
  5: 1.1, // Friday - slower
  6: 1.4, // Saturday - slow
}

export const predictApprovalTimelineTool = createTool<PredictApprovalTimelineInput, PredictApprovalTimelineOutput>({
  name: 'predict_approval_timeline',
  displayName: 'Predict Approval Timeline',
  description: 'Predicts how long an approval will take based on item type, assignee history, current workload, and historical patterns.',
  category: 'action',
  parameters: {
    type: 'object',
    properties: {
      project_id: {
        type: 'string',
        description: 'The project ID'
      },
      item_type: {
        type: 'string',
        enum: ['change_order', 'invoice', 'submittal', 'rfi', 'payment_application', 'purchase_order'],
        description: 'Type of item'
      },
      item_id: {
        type: 'string',
        description: 'Optional: specific item ID for more accurate prediction'
      },
      assigned_to: {
        type: 'string',
        description: 'Optional: user ID of the approver'
      },
      value: {
        type: 'number',
        description: 'Optional: monetary value of the item'
      }
    },
    required: ['project_id', 'item_type']
  },
  requiresConfirmation: false,
  estimatedTokens: 600,

  async execute(input, context) {
    const { project_id, item_type, item_id, assigned_to, value } = input

    // Get historical approval data for this item type
    const { data: historicalItems } = await supabase
      .from('workflow_items')
      .select('created_at, completed_at, assigned_to, status, item_type')
      .eq('project_id', project_id)
      .eq('item_type', item_type)
      .eq('status', 'completed')
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(50)

    // Calculate historical statistics
    const completionTimes: number[] = []
    for (const item of historicalItems || []) {
      if (item.created_at && item.completed_at) {
        const hours = (new Date(item.completed_at).getTime() - new Date(item.created_at).getTime()) / (1000 * 60 * 60)
        if (hours > 0 && hours < 720) { // Exclude outliers (> 30 days)
          completionTimes.push(hours)
        }
      }
    }

    const avgHours = completionTimes.length > 0
      ? completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length
      : BASE_APPROVAL_TIMES[item_type] || 72

    const minHours = completionTimes.length > 0 ? Math.min(...completionTimes) : avgHours * 0.5
    const maxHours = completionTimes.length > 0 ? Math.max(...completionTimes) : avgHours * 2

    // Calculate on-time percentage (assume 48h SLA for most items)
    const slaHours = item_type === 'submittal' ? 120 : 48
    const onTimeCount = completionTimes.filter(t => t <= slaHours).length
    const onTimePercentage = completionTimes.length > 0
      ? Math.round((onTimeCount / completionTimes.length) * 100)
      : 75

    // Get assignee-specific data if provided
    let assigneeMultiplier = 1.0
    if (assigned_to) {
      const { data: assigneeHistory } = await supabase
        .from('workflow_items')
        .select('created_at, completed_at')
        .eq('assigned_to', assigned_to)
        .eq('status', 'completed')
        .not('completed_at', 'is', null)
        .limit(20)

      if (assigneeHistory && assigneeHistory.length > 0) {
        const assigneeTimes: number[] = []
        for (const item of assigneeHistory) {
          if (item.created_at && item.completed_at) {
            const hours = (new Date(item.completed_at).getTime() - new Date(item.created_at).getTime()) / (1000 * 60 * 60)
            if (hours > 0 && hours < 720) {
              assigneeTimes.push(hours)
            }
          }
        }
        if (assigneeTimes.length > 0) {
          const assigneeAvg = assigneeTimes.reduce((a, b) => a + b, 0) / assigneeTimes.length
          assigneeMultiplier = assigneeAvg / avgHours
        }
      }

      // Check current workload
      const { count: pendingCount } = await supabase
        .from('workflow_items')
        .select('*', { count: 'exact', head: true })
        .eq('assigned_to', assigned_to)
        .eq('status', 'pending')

      if (pendingCount && pendingCount > 10) {
        assigneeMultiplier *= 1.3 // 30% slower if heavily loaded
      }
    }

    // Apply day of week factor
    const today = new Date()
    const dayFactor = DAY_FACTORS[today.getDay()]

    // Apply value-based adjustment
    let valueFactor = 1.0
    if (value) {
      if (value > 100000) valueFactor = 1.5 // Large values take longer
      else if (value > 50000) valueFactor = 1.25
      else if (value > 25000) valueFactor = 1.1
    }

    // Calculate final prediction
    const baseHours = avgHours || BASE_APPROVAL_TIMES[item_type]
    const predictedHours = Math.round(baseHours * assigneeMultiplier * dayFactor * valueFactor)

    // Build risk factors
    const riskFactors: RiskFactor[] = []

    if (dayFactor > 1.2) {
      riskFactors.push({
        factor: 'Weekend/Friday submission',
        impact: 'delays',
        impact_hours: Math.round(baseHours * (dayFactor - 1)),
        description: 'Items submitted late in week typically take longer'
      })
    }

    if (assigneeMultiplier > 1.2) {
      riskFactors.push({
        factor: 'High approver workload',
        impact: 'delays',
        impact_hours: Math.round(baseHours * (assigneeMultiplier - 1)),
        description: 'Assigned approver has many pending items'
      })
    } else if (assigneeMultiplier < 0.8) {
      riskFactors.push({
        factor: 'Fast approver',
        impact: 'speeds_up',
        impact_hours: Math.round(baseHours * (1 - assigneeMultiplier)),
        description: 'Assigned approver has quick response history'
      })
    }

    if (valueFactor > 1.2) {
      riskFactors.push({
        factor: 'High-value item',
        impact: 'delays',
        impact_hours: Math.round(baseHours * (valueFactor - 1)),
        description: 'Higher value items require more scrutiny'
      })
    }

    // Build timeline breakdown
    const timelineBreakdown: TimelineBreakdown[] = [
      {
        stage: 'Initial Review',
        estimated_hours: Math.round(predictedHours * 0.3),
        confidence: 0.8,
        factors: ['Approver availability', 'Queue position']
      },
      {
        stage: 'Detailed Analysis',
        estimated_hours: Math.round(predictedHours * 0.4),
        confidence: 0.7,
        factors: ['Item complexity', 'Supporting documentation']
      },
      {
        stage: 'Decision & Action',
        estimated_hours: Math.round(predictedHours * 0.3),
        confidence: 0.85,
        factors: ['Approval authority', 'Follow-up requirements']
      }
    ]

    // Calculate confidence
    let confidence = 0.7
    if (completionTimes.length > 20) confidence += 0.15
    if (assigned_to) confidence += 0.1
    if (completionTimes.length < 5) confidence -= 0.2

    const confidenceLevel: 'high' | 'medium' | 'low' =
      confidence >= 0.8 ? 'high' : confidence >= 0.6 ? 'medium' : 'low'

    // Generate recommendations
    const recommendations: string[] = []

    if (dayFactor > 1.2) {
      recommendations.push('Consider submitting earlier in the week for faster processing')
    }
    if (assigneeMultiplier > 1.2) {
      recommendations.push('Consider escalating or assigning to alternate approver')
    }
    if (onTimePercentage < 70) {
      recommendations.push('This item type has historically had delays - monitor closely')
    }
    if (valueFactor > 1.2) {
      recommendations.push('High-value items may benefit from pre-approval discussion')
    }

    const predictedCompletion = new Date()
    predictedCompletion.setHours(predictedCompletion.getHours() + predictedHours)

    return {
      success: true,
      data: {
        item_type,
        predicted_hours: predictedHours,
        predicted_completion: predictedCompletion.toISOString(),
        confidence_level: confidenceLevel,
        confidence_percentage: Math.round(confidence * 100),
        timeline_breakdown: timelineBreakdown,
        historical_comparison: {
          similar_items_count: completionTimes.length,
          avg_completion_hours: Math.round(avgHours),
          min_hours: Math.round(minHours),
          max_hours: Math.round(maxHours),
          on_time_percentage: onTimePercentage
        },
        risk_factors: riskFactors,
        recommendations
      },
      metadata: {
        executionTimeMs: 0
      }
    }
  },

  formatOutput(output) {
    const { predicted_hours, confidence_level, risk_factors, historical_comparison } = output

    const delayRisks = risk_factors.filter(r => r.impact === 'delays').length

    return {
      title: 'Timeline Prediction',
      summary: `Est. ${predicted_hours}h (${confidence_level} confidence)`,
      icon: 'clock',
      status: delayRisks > 1 ? 'warning' : 'success',
      details: [
        { label: 'Predicted Time', value: `${predicted_hours} hours`, type: 'text' },
        { label: 'Confidence', value: confidence_level, type: 'badge' },
        { label: 'Historical Avg', value: `${historical_comparison.avg_completion_hours}h`, type: 'text' },
        { label: 'On-Time Rate', value: `${historical_comparison.on_time_percentage}%`, type: 'text' },
        { label: 'Risk Factors', value: delayRisks, type: 'text' }
      ],
      expandedContent: output as unknown as Record<string, unknown>
    }
  }
})
