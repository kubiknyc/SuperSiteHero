/**
 * Proactive Risk Identification Tool
 * Proactively identify schedule risks before they cause delays
 */

import { createTool } from '../registry'
import { supabase } from '@/lib/supabase'
import { getWeatherForProject } from '@/features/daily-reports/services/weatherApiService'

interface IdentifyScheduleRisksInput {
  project_id: string
  look_ahead_days?: number
  include_weather_risks?: boolean
  include_resource_risks?: boolean
}

interface RiskItem {
  activity_id: string
  activity_name: string
  risk_type: 'predecessor_delay' | 'resource_conflict' | 'weather' | 'inspection' | 'submittal' | 'procurement'
  risk_level: 'low' | 'medium' | 'high' | 'critical'
  probability: number
  impact_days: number
  description: string
  mitigation_options: string[]
}

interface ResourceConflict {
  resource_type: string
  conflicting_activities: string[]
  conflict_date: string
  resolution_options: string[]
}

interface WeatherRisk {
  date: string
  activity: string
  weather_threat: string
  contingency: string
}

interface PendingDependency {
  blocked_activity: string
  waiting_on: string
  days_until_needed: number
  status: string
}

interface IdentifyScheduleRisksOutput {
  high_risk_items: RiskItem[]
  resource_conflicts: ResourceConflict[]
  weather_risks: WeatherRisk[]
  pending_dependencies: PendingDependency[]
  risk_score: number
  recommendations: string[]
}

// Weather-sensitive activities
const WEATHER_SENSITIVE = ['concrete', 'roofing', 'painting', 'masonry', 'excavation', 'paving', 'waterproofing', 'landscape']

function isWeatherSensitive(activityName: string): boolean {
  const lowerName = activityName.toLowerCase()
  return WEATHER_SENSITIVE.some(kw => lowerName.includes(kw))
}

function calculateRiskLevel(probability: number, impactDays: number): 'low' | 'medium' | 'high' | 'critical' {
  const riskScore = probability * impactDays

  if (riskScore >= 15 || impactDays >= 10) return 'critical'
  if (riskScore >= 8 || impactDays >= 5) return 'high'
  if (riskScore >= 3 || impactDays >= 2) return 'medium'
  return 'low'
}

export const identifyScheduleRisksTool = createTool<IdentifyScheduleRisksInput, IdentifyScheduleRisksOutput>({
  name: 'identify_schedule_risks',
  displayName: 'Identify Schedule Risks',
  description: 'Proactively identifies schedule risks including predecessor delays, resource conflicts, weather impacts, and pending dependencies. Provides risk levels and mitigation options.',
  category: 'action',
  parameters: {
    type: 'object',
    properties: {
      project_id: {
        type: 'string',
        description: 'The project ID'
      },
      look_ahead_days: {
        type: 'number',
        description: 'Number of days to look ahead (default: 14)'
      },
      include_weather_risks: {
        type: 'boolean',
        description: 'Include weather-related risks (default: true)'
      },
      include_resource_risks: {
        type: 'boolean',
        description: 'Include resource conflict risks (default: true)'
      }
    },
    required: ['project_id']
  },
  requiresConfirmation: false,
  estimatedTokens: 1000,

  async execute(input, context) {
    const {
      project_id,
      look_ahead_days = 14,
      include_weather_risks = true,
      include_resource_risks = true
    } = input

    const today = new Date()
    const endDate = new Date(today)
    endDate.setDate(endDate.getDate() + look_ahead_days)

    const highRiskItems: RiskItem[] = []
    const resourceConflicts: ResourceConflict[] = []
    const weatherRisks: WeatherRisk[] = []
    const pendingDependencies: PendingDependency[] = []

    // Get scheduled activities in look-ahead period
    const { data: activities } = await supabase
      .from('schedule_activities')
      .select(`
        id,
        activity_id,
        name,
        planned_start,
        planned_finish,
        status,
        percent_complete,
        is_critical,
        subcontractor_id,
        subcontractors (
          company_name,
          trade
        )
      `)
      .eq('project_id', project_id)
      .lte('planned_start', endDate.toISOString().split('T')[0])
      .gte('planned_finish', today.toISOString().split('T')[0])
      .neq('status', 'completed')
      .order('planned_start', { ascending: true })

    // Get dependencies
    const { data: dependencies } = await supabase
      .from('schedule_dependencies')
      .select(`
        id,
        predecessor_id,
        successor_id,
        dependency_type,
        lag_value
      `)
      .eq('project_id', project_id)

    // Build dependency map
    const dependencyMap = new Map<string, string[]>()
    for (const dep of dependencies || []) {
      const existing = dependencyMap.get(dep.successor_id) || []
      existing.push(dep.predecessor_id)
      dependencyMap.set(dep.successor_id, existing)
    }

    // Check predecessor delays
    for (const activity of activities || []) {
      const predecessors = dependencyMap.get(activity.id) || []

      for (const predId of predecessors) {
        const predecessor = activities?.find(a => a.id === predId)

        if (predecessor) {
          // Check if predecessor is behind schedule
          if (predecessor.status !== 'completed') {
            const predEndDate = new Date(predecessor.planned_finish)
            const actStartDate = new Date(activity.planned_start)

            if (predEndDate >= actStartDate) {
              // Predecessor hasn't finished and activity should start
              const daysLate = Math.ceil((today.getTime() - predEndDate.getTime()) / (1000 * 60 * 60 * 24))

              if (daysLate > 0 || (predecessor.percent_complete || 0) < 80) {
                const probability = predecessor.percent_complete ? (100 - predecessor.percent_complete) / 100 : 0.7
                const impactDays = Math.max(1, Math.ceil((predEndDate.getTime() - actStartDate.getTime()) / (1000 * 60 * 60 * 24)) + daysLate)

                highRiskItems.push({
                  activity_id: activity.activity_id || activity.id,
                  activity_name: activity.name,
                  risk_type: 'predecessor_delay',
                  risk_level: calculateRiskLevel(probability, impactDays),
                  probability,
                  impact_days: impactDays,
                  description: `Predecessor "${predecessor.name}" is ${predecessor.percent_complete || 0}% complete but blocks this activity`,
                  mitigation_options: [
                    'Add resources to predecessor activity',
                    'Evaluate parallel work opportunities',
                    'Resequence non-critical activities',
                    'Consider overtime or weekend work'
                  ]
                })

                pendingDependencies.push({
                  blocked_activity: activity.name,
                  waiting_on: predecessor.name,
                  days_until_needed: Math.max(0, Math.ceil((actStartDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))),
                  status: `${predecessor.percent_complete || 0}% complete`
                })
              }
            }
          }
        }
      }
    }

    // Check for pending submittals and RFIs
    const { data: submittals } = await supabase
      .from('submittals')
      .select('id, title, status, required_date')
      .eq('project_id', project_id)
      .in('status', ['pending', 'submitted', 'under_review'])
      .lte('required_date', endDate.toISOString().split('T')[0])

    for (const submittal of submittals || []) {
      const requiredDate = new Date(submittal.required_date)
      const daysUntilNeeded = Math.ceil((requiredDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

      if (daysUntilNeeded <= 7) {
        highRiskItems.push({
          activity_id: submittal.id,
          activity_name: submittal.title,
          risk_type: 'submittal',
          risk_level: daysUntilNeeded <= 3 ? 'critical' : 'high',
          probability: 0.6,
          impact_days: daysUntilNeeded + 7, // Typical re-review time
          description: `Submittal "${submittal.title}" required in ${daysUntilNeeded} days, status: ${submittal.status}`,
          mitigation_options: [
            'Expedite submittal review',
            'Contact reviewer for status',
            'Prepare work-around plan',
            'Identify substitute materials'
          ]
        })
      }
    }

    // Check for pending RFIs
    const { data: rfis } = await supabase
      .from('rfis')
      .select('id, subject, status, required_date')
      .eq('project_id', project_id)
      .in('status', ['open', 'pending', 'submitted'])
      .lte('required_date', endDate.toISOString().split('T')[0])

    for (const rfi of rfis || []) {
      if (rfi.required_date) {
        const requiredDate = new Date(rfi.required_date)
        const daysUntilNeeded = Math.ceil((requiredDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

        if (daysUntilNeeded <= 7) {
          highRiskItems.push({
            activity_id: rfi.id,
            activity_name: rfi.subject,
            risk_type: 'submittal', // Using submittal type for RFIs too
            risk_level: daysUntilNeeded <= 3 ? 'critical' : 'high',
            probability: 0.5,
            impact_days: daysUntilNeeded + 5,
            description: `RFI "${rfi.subject}" required in ${daysUntilNeeded} days, status: ${rfi.status}`,
            mitigation_options: [
              'Escalate RFI to design team',
              'Request expedited response',
              'Identify work that can proceed',
              'Consider design-build options'
            ]
          })
        }
      }
    }

    // Weather risks
    if (include_weather_risks) {
      const weather = await getWeatherForProject(project_id)

      if (weather) {
        const conditions = weather.conditions.toLowerCase()
        const isInclement = conditions.includes('rain') || conditions.includes('storm') ||
          conditions.includes('snow') || weather.windSpeed > 25 ||
          weather.temperature < 35 || weather.temperature > 95

        if (isInclement) {
          const weatherSensitiveActivities = (activities || []).filter(a => isWeatherSensitive(a.name))

          for (const activity of weatherSensitiveActivities) {
            let threat = ''
            let contingency = ''

            if (conditions.includes('rain') || conditions.includes('storm')) {
              threat = 'Precipitation'
              contingency = 'Cover work area, shift to interior work'
            } else if (weather.temperature < 35) {
              threat = 'Cold temperature'
              contingency = 'Use cold weather procedures, heating blankets'
            } else if (weather.temperature > 95) {
              threat = 'Extreme heat'
              contingency = 'Schedule early morning work, additional breaks'
            } else if (weather.windSpeed > 25) {
              threat = 'High winds'
              contingency = 'Suspend elevated work, secure materials'
            }

            weatherRisks.push({
              date: today.toISOString().split('T')[0],
              activity: activity.name,
              weather_threat: threat,
              contingency
            })

            highRiskItems.push({
              activity_id: activity.activity_id || activity.id,
              activity_name: activity.name,
              risk_type: 'weather',
              risk_level: conditions.includes('storm') ? 'critical' : 'medium',
              probability: 0.8,
              impact_days: 1,
              description: `${threat} may impact ${activity.name}`,
              mitigation_options: [
                contingency,
                'Monitor forecast for work windows',
                'Prepare backup activities'
              ]
            })
          }
        }
      }
    }

    // Resource conflicts
    if (include_resource_risks) {
      // Group activities by trade and date
      const tradeByDate = new Map<string, Map<string, string[]>>()

      for (const activity of activities || []) {
        const trade = activity.subcontractors?.trade || 'General'
        const date = activity.planned_start

        if (!tradeByDate.has(date)) {
          tradeByDate.set(date, new Map())
        }

        const dateMap = tradeByDate.get(date)!
        const existing = dateMap.get(trade) || []
        existing.push(activity.name)
        dateMap.set(trade, existing)
      }

      // Find conflicts (multiple activities same trade same day)
      for (const [date, tradeMap] of tradeByDate.entries()) {
        for (const [trade, activityNames] of tradeMap.entries()) {
          if (activityNames.length > 1) {
            resourceConflicts.push({
              resource_type: trade,
              conflicting_activities: activityNames,
              conflict_date: date,
              resolution_options: [
                'Stagger start times',
                'Request additional crew',
                'Prioritize critical path activity',
                'Resequence if float available'
              ]
            })
          }
        }
      }
    }

    // Check for pending inspections
    const { data: inspections } = await supabase
      .from('inspections')
      .select('id, inspection_type, scheduled_date, status')
      .eq('project_id', project_id)
      .in('status', ['scheduled', 'pending'])
      .lte('scheduled_date', endDate.toISOString().split('T')[0])

    for (const inspection of inspections || []) {
      const inspectionDate = new Date(inspection.scheduled_date)
      const daysUntil = Math.ceil((inspectionDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

      if (daysUntil <= 3) {
        highRiskItems.push({
          activity_id: inspection.id,
          activity_name: inspection.inspection_type,
          risk_type: 'inspection',
          risk_level: daysUntil <= 1 ? 'high' : 'medium',
          probability: 0.3, // Probability of failure
          impact_days: 3, // Typical re-inspection delay
          description: `${inspection.inspection_type} inspection in ${daysUntil} days`,
          mitigation_options: [
            'Complete pre-inspection checklist',
            'Verify all prerequisites complete',
            'Have documentation ready',
            'Ensure area is accessible'
          ]
        })
      }
    }

    // Calculate overall risk score
    const criticalCount = highRiskItems.filter(r => r.risk_level === 'critical').length
    const highCount = highRiskItems.filter(r => r.risk_level === 'high').length
    const mediumCount = highRiskItems.filter(r => r.risk_level === 'medium').length

    const riskScore = Math.min(100, criticalCount * 25 + highCount * 15 + mediumCount * 5 + resourceConflicts.length * 5)

    // Generate recommendations
    const recommendations: string[] = []

    if (criticalCount > 0) {
      recommendations.push(`Address ${criticalCount} critical risk(s) immediately to prevent schedule slippage`)
    }

    if (pendingDependencies.length > 0) {
      recommendations.push(`Accelerate ${pendingDependencies.length} predecessor activities blocking upcoming work`)
    }

    if (resourceConflicts.length > 0) {
      recommendations.push(`Resolve ${resourceConflicts.length} resource conflict(s) to avoid productivity loss`)
    }

    if (weatherRisks.length > 0) {
      recommendations.push(`Prepare contingencies for ${weatherRisks.length} weather-sensitive activities`)
    }

    if (recommendations.length === 0) {
      recommendations.push('Schedule risk level is acceptable - continue monitoring')
    }

    // Sort risks by level
    highRiskItems.sort((a, b) => {
      const levelOrder = { critical: 0, high: 1, medium: 2, low: 3 }
      return levelOrder[a.risk_level] - levelOrder[b.risk_level]
    })

    return {
      success: true,
      data: {
        high_risk_items: highRiskItems,
        resource_conflicts: resourceConflicts,
        weather_risks: weatherRisks,
        pending_dependencies: pendingDependencies,
        risk_score: riskScore,
        recommendations
      },
      metadata: {
        executionTimeMs: 0
      }
    }
  },

  formatOutput(output) {
    const { high_risk_items, resource_conflicts, risk_score, recommendations } = output

    const criticalCount = high_risk_items.filter(r => r.risk_level === 'critical').length
    const highCount = high_risk_items.filter(r => r.risk_level === 'high').length

    return {
      title: 'Schedule Risk Analysis',
      summary: `Risk Score: ${risk_score}/100 - ${criticalCount} critical, ${highCount} high risks`,
      icon: risk_score > 50 ? 'alert-triangle' : risk_score > 25 ? 'alert-circle' : 'check-circle',
      status: risk_score > 50 ? 'error' : risk_score > 25 ? 'warning' : 'success',
      details: [
        { label: 'Risk Score', value: `${risk_score}/100`, type: 'badge' },
        { label: 'Critical Risks', value: criticalCount, type: 'text' },
        { label: 'High Risks', value: highCount, type: 'text' },
        { label: 'Resource Conflicts', value: resource_conflicts.length, type: 'text' },
        { label: 'Recommendations', value: recommendations.length, type: 'text' },
      ],
      expandedContent: output
    }
  }
})
