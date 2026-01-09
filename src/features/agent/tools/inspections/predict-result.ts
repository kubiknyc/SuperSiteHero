/**
 * Inspection Result Prediction Tool
 * Predict inspection outcome based on current status and historical patterns
 */

import { createTool } from '../registry'
import { supabase } from '@/lib/supabase'

interface PredictInspectionResultInput {
  project_id: string
  inspection_id?: string
  inspection_type: string
  scheduled_date: string
}

interface RiskFactor {
  factor: string
  severity: 'low' | 'medium' | 'high'
  mitigation: string
  related_activity?: string
}

interface HistoricalComparison {
  similar_inspections_count: number
  pass_rate: number
  common_issues: string[]
}

interface PredictInspectionResultOutput {
  prediction: {
    outcome: 'pass' | 'conditional_pass' | 'fail'
    confidence: number
    risk_level: 'low' | 'medium' | 'high'
  }
  risk_factors: RiskFactor[]
  historical_comparison: HistoricalComparison
  readiness_score: number
  recommendations: string[]
}

// Prerequisite inspection mappings
const INSPECTION_PREREQUISITES: Record<string, string[]> = {
  'framing': ['foundation'],
  'rough_electrical': ['framing'],
  'rough_plumbing': ['framing'],
  'rough_hvac': ['framing'],
  'insulation': ['rough_electrical', 'rough_plumbing', 'rough_hvac'],
  'drywall': ['insulation'],
  'final_electrical': ['drywall'],
  'final_plumbing': ['drywall'],
  'final': ['final_electrical', 'final_plumbing', 'fire_marshal']
}

export const predictInspectionResultTool = createTool<PredictInspectionResultInput, PredictInspectionResultOutput>({
  name: 'predict_inspection_result',
  displayName: 'Predict Inspection Result',
  description: 'Predicts the likely outcome of an upcoming inspection based on project status, prerequisite completion, and historical patterns. Helps identify risks before the inspection.',
  category: 'action',
  parameters: {
    type: 'object',
    properties: {
      project_id: {
        type: 'string',
        description: 'The project ID'
      },
      inspection_id: {
        type: 'string',
        description: 'Existing inspection ID (optional)'
      },
      inspection_type: {
        type: 'string',
        description: 'Type of inspection'
      },
      scheduled_date: {
        type: 'string',
        description: 'Scheduled date for the inspection (ISO format)'
      }
    },
    required: ['project_id', 'inspection_type', 'scheduled_date']
  },
  requiresConfirmation: false,
  estimatedTokens: 800,

  async execute(input, context) {
    const { project_id, inspection_id, inspection_type, scheduled_date } = input

    const riskFactors: RiskFactor[] = []
    let readinessScore = 100

    // Normalize inspection type
    const normalizedType = inspection_type.toLowerCase().replace(/\s+/g, '_')

    // Check prerequisite inspections
    const prerequisites = INSPECTION_PREREQUISITES[normalizedType] || []
    if (prerequisites.length > 0) {
      const { data: prereqInspections } = await supabase
        .from('inspections')
        .select('inspection_type, result, status')
        .eq('project_id', project_id)
        .in('inspection_type', prerequisites)

      for (const prereq of prerequisites) {
        const prereqInsp = prereqInspections?.find(i =>
          i.inspection_type.toLowerCase().replace(/\s+/g, '_') === prereq
        )

        if (!prereqInsp) {
          riskFactors.push({
            factor: `Prerequisite inspection "${prereq}" not found`,
            severity: 'high',
            mitigation: `Schedule and complete ${prereq} inspection first`
          })
          readinessScore -= 25
        } else if (prereqInsp.result !== 'pass') {
          riskFactors.push({
            factor: `Prerequisite "${prereq}" not passed (status: ${prereqInsp.result || prereqInsp.status})`,
            severity: 'high',
            mitigation: `Resolve ${prereq} inspection issues before proceeding`
          })
          readinessScore -= 20
        }
      }
    }

    // Check related schedule activities
    const { data: activities } = await supabase
      .from('schedule_activities')
      .select('name, status, percent_complete')
      .eq('project_id', project_id)
      .ilike('name', `%${inspection_type.replace(/_/g, ' ')}%`)
      .limit(10)

    if (activities && activities.length > 0) {
      const incompleteActivities = activities.filter(a =>
        a.status !== 'completed' && (a.percent_complete || 0) < 100
      )

      for (const activity of incompleteActivities) {
        riskFactors.push({
          factor: `Related activity "${activity.name}" not complete (${activity.percent_complete || 0}%)`,
          severity: (activity.percent_complete || 0) < 50 ? 'high' : 'medium',
          mitigation: 'Complete activity before inspection',
          related_activity: activity.name
        })
        readinessScore -= 10
      }
    }

    // Check for recent daily report issues
    const { data: recentReports } = await supabase
      .from('daily_reports')
      .select('issues, report_date')
      .eq('project_id', project_id)
      .gte('report_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('report_date', { ascending: false })
      .limit(7)

    if (recentReports) {
      for (const report of recentReports) {
        if (report.issues) {
          const issues = typeof report.issues === 'string'
            ? report.issues
            : JSON.stringify(report.issues)

          if (issues.toLowerCase().includes(inspection_type.replace(/_/g, ' ').toLowerCase())) {
            riskFactors.push({
              factor: `Open issue related to ${inspection_type} from ${report.report_date}`,
              severity: 'medium',
              mitigation: 'Review and resolve reported issues'
            })
            readinessScore -= 5
          }
        }
      }
    }

    // Get historical inspection data
    const { data: historicalInspections } = await supabase
      .from('inspections')
      .select('result, failure_reason, notes')
      .eq('project_id', project_id)
      .eq('inspection_type', inspection_type)
      .not('result', 'is', null)

    // Also get company-wide history for this type
    const { data: companyHistory } = await supabase
      .from('inspections')
      .select('result, failure_reason')
      .eq('inspection_type', inspection_type)
      .not('result', 'is', null)
      .limit(100)

    // Calculate pass rate
    const totalHistorical = companyHistory?.length || 0
    const passedHistorical = companyHistory?.filter(i => i.result === 'pass').length || 0
    const passRate = totalHistorical > 0 ? (passedHistorical / totalHistorical) * 100 : 75 // Default to 75% if no history

    // Extract common issues
    const failureReasons = companyHistory
      ?.filter(i => i.result === 'fail' && i.failure_reason)
      .map(i => i.failure_reason) || []

    const issueCount = new Map<string, number>()
    for (const reason of failureReasons) {
      const normalized = reason.toLowerCase()
      issueCount.set(normalized, (issueCount.get(normalized) || 0) + 1)
    }

    const commonIssues = Array.from(issueCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([issue]) => issue)

    // Adjust readiness based on pass rate
    if (passRate < 70) {
      riskFactors.push({
        factor: `Historical pass rate for ${inspection_type} is ${passRate.toFixed(0)}%`,
        severity: 'medium',
        mitigation: 'Review common failure points and double-check all items'
      })
      readinessScore -= 10
    }

    // Calculate final prediction
    readinessScore = Math.max(0, Math.min(100, readinessScore))

    let predictedOutcome: 'pass' | 'conditional_pass' | 'fail'
    let confidence: number
    let riskLevel: 'low' | 'medium' | 'high'

    if (readinessScore >= 80) {
      predictedOutcome = 'pass'
      confidence = Math.min(0.95, readinessScore / 100)
      riskLevel = 'low'
    } else if (readinessScore >= 60) {
      predictedOutcome = 'conditional_pass'
      confidence = 0.6 + (readinessScore - 60) / 100
      riskLevel = 'medium'
    } else {
      predictedOutcome = 'fail'
      confidence = 0.7 + (60 - readinessScore) / 200
      riskLevel = 'high'
    }

    // Generate recommendations
    const recommendations: string[] = []

    if (riskFactors.filter(r => r.severity === 'high').length > 0) {
      recommendations.push('Address high-severity risk factors before scheduling inspection')
    }

    if (riskFactors.length > 3) {
      recommendations.push('Consider postponing inspection until more items are resolved')
    }

    if (commonIssues.length > 0) {
      recommendations.push(`Pay special attention to common issues: ${commonIssues.slice(0, 2).join(', ')}`)
    }

    if (readinessScore >= 80) {
      recommendations.push('Project appears ready for inspection - proceed as scheduled')
    }

    if (recommendations.length === 0) {
      recommendations.push('Complete standard pre-inspection checklist')
    }

    return {
      success: true,
      data: {
        prediction: {
          outcome: predictedOutcome,
          confidence,
          risk_level: riskLevel
        },
        risk_factors: riskFactors,
        historical_comparison: {
          similar_inspections_count: totalHistorical,
          pass_rate: passRate,
          common_issues: commonIssues
        },
        readiness_score: readinessScore,
        recommendations
      },
      metadata: {
        executionTimeMs: 0
      }
    }
  },

  formatOutput(output) {
    const { prediction, risk_factors, readiness_score } = output

    const statusMap = {
      'pass': 'success' as const,
      'conditional_pass': 'warning' as const,
      'fail': 'error' as const
    }

    return {
      title: `Predicted: ${prediction.outcome.replace('_', ' ').toUpperCase()}`,
      summary: `${readiness_score}% ready, ${risk_factors.length} risk factors`,
      icon: prediction.outcome === 'pass' ? 'check-circle' : prediction.outcome === 'fail' ? 'x-circle' : 'alert-circle',
      status: statusMap[prediction.outcome],
      details: [
        { label: 'Predicted Outcome', value: prediction.outcome.replace('_', ' '), type: 'badge' },
        { label: 'Confidence', value: `${Math.round(prediction.confidence * 100)}%`, type: 'text' },
        { label: 'Readiness Score', value: `${readiness_score}%`, type: 'text' },
        { label: 'Risk Level', value: prediction.risk_level, type: 'badge' },
        { label: 'Risk Factors', value: risk_factors.length, type: 'text' }
      ],
      expandedContent: output
    }
  }
})
