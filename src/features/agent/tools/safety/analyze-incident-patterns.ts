/**
 * Incident Pattern Analysis Tool
 * Analyze safety incidents to identify patterns, hotspots, and root causes
 */

import { createTool } from '../registry'
import { supabase } from '@/lib/supabase'

interface AnalyzeIncidentPatternsInput {
  project_id?: string
  company_id: string
  date_range_days?: number
  include_near_misses?: boolean
}

interface PatternItem {
  pattern_type: 'location' | 'time' | 'trade' | 'category' | 'root_cause'
  description: string
  frequency: number
  severity_distribution: Record<string, number>
  contributing_factors: string[]
}

interface Hotspot {
  location: string
  incident_count: number
  risk_score: number
  primary_hazards: string[]
}

interface ParetoItem {
  category: string
  count: number
  percentage: number
  cumulative_percentage: number
}

interface Recommendation {
  priority: 'high' | 'medium' | 'low'
  category: string
  title: string
  description: string
  suggested_actions: string[]
}

interface AnalyzeIncidentPatternsOutput {
  summary: {
    total_incidents: number
    total_near_misses: number
    trir: number
    dart_rate: number
    trend_direction: 'improving' | 'stable' | 'declining'
  }
  patterns: PatternItem[]
  hotspots: Hotspot[]
  root_cause_pareto: ParetoItem[]
  recommendations: Recommendation[]
}

// Standard work hours for rate calculations
const STANDARD_HOURS_PER_WORKER_PER_YEAR = 2000

function calculateTRIR(recordableIncidents: number, hoursWorked: number): number {
  if (hoursWorked === 0) return 0
  return (recordableIncidents * 200000) / hoursWorked
}

function calculateDARTRate(dartIncidents: number, hoursWorked: number): number {
  if (hoursWorked === 0) return 0
  return (dartIncidents * 200000) / hoursWorked
}

export const analyzeIncidentPatternsTool = createTool<AnalyzeIncidentPatternsInput, AnalyzeIncidentPatternsOutput>({
  name: 'analyze_incident_patterns',
  displayName: 'Analyze Incident Patterns',
  description: 'Analyzes safety incidents and near-misses to identify patterns, hotspots, and root causes. Calculates TRIR and DART rates and provides actionable recommendations.',
  category: 'action',
  parameters: {
    type: 'object',
    properties: {
      project_id: {
        type: 'string',
        description: 'Project ID (optional - company-wide if not provided)'
      },
      company_id: {
        type: 'string',
        description: 'Company ID for the analysis'
      },
      date_range_days: {
        type: 'number',
        description: 'Number of days to analyze (default: 365)'
      },
      include_near_misses: {
        type: 'boolean',
        description: 'Include near-misses in analysis (default: true)'
      }
    },
    required: ['company_id']
  },
  requiresConfirmation: false,
  estimatedTokens: 1200,

  async execute(input, context) {
    const {
      project_id,
      company_id,
      date_range_days = 365,
      include_near_misses = true
    } = input

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - date_range_days)
    const startDateStr = startDate.toISOString().split('T')[0]

    // Build query for incidents
    let incidentQuery = supabase
      .from('safety_incidents')
      .select('*')
      .eq('company_id', company_id)
      .gte('incident_date', startDateStr)

    if (project_id) {
      incidentQuery = incidentQuery.eq('project_id', project_id)
    }

    const { data: incidents } = await incidentQuery

    // Build query for observations (including near-misses)
    let observationQuery = supabase
      .from('safety_observations')
      .select('*')
      .eq('company_id', company_id)
      .gte('created_at', startDateStr)

    if (project_id) {
      observationQuery = observationQuery.eq('project_id', project_id)
    }

    if (include_near_misses) {
      observationQuery = observationQuery.eq('category', 'near_miss')
    }

    const { data: observations } = await observationQuery

    // Get hours worked (estimate from daily reports if available)
    let hoursWorked = 0
    let dailyReportsQuery = supabase
      .from('daily_reports')
      .select('total_hours')
      .gte('report_date', startDateStr)

    if (project_id) {
      dailyReportsQuery = dailyReportsQuery.eq('project_id', project_id)
    }

    const { data: dailyReports } = await dailyReportsQuery

    if (dailyReports) {
      hoursWorked = dailyReports.reduce((sum, r) => sum + (r.total_hours || 0), 0)
    }

    // If no hours data, estimate based on 6 months typical project
    if (hoursWorked === 0) {
      hoursWorked = 50000 // Default estimate
    }

    // Calculate metrics
    const totalIncidents = incidents?.length || 0
    const nearMisses = observations?.filter(o => o.category === 'near_miss').length || 0

    const recordableIncidents = incidents?.filter(i =>
      i.severity === 'recordable' || i.severity === 'lost_time' || i.severity === 'fatality'
    ).length || 0

    const dartIncidents = incidents?.filter(i =>
      i.severity === 'lost_time' || i.days_away_from_work > 0
    ).length || 0

    const trir = calculateTRIR(recordableIncidents, hoursWorked)
    const dartRate = calculateDARTRate(dartIncidents, hoursWorked)

    // Analyze patterns
    const patterns: PatternItem[] = []

    // Location patterns
    const locationCounts = new Map<string, { count: number; severities: string[] }>()
    for (const incident of incidents || []) {
      const location = incident.location || 'Unknown'
      const existing = locationCounts.get(location) || { count: 0, severities: [] }
      existing.count++
      existing.severities.push(incident.severity)
      locationCounts.set(location, existing)
    }

    const topLocations = Array.from(locationCounts.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 3)

    if (topLocations.length > 0 && topLocations[0][1].count > 1) {
      patterns.push({
        pattern_type: 'location',
        description: `Most incidents occur at: ${topLocations.map(([loc]) => loc).join(', ')}`,
        frequency: topLocations[0][1].count,
        severity_distribution: countSeverities(topLocations[0][1].severities),
        contributing_factors: ['Frequent work activity', 'High-risk operations', 'Multiple trades working']
      })
    }

    // Category patterns
    const categoryCounts = new Map<string, number>()
    for (const incident of incidents || []) {
      const category = incident.incident_type || 'Other'
      categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1)
    }

    const topCategories = Array.from(categoryCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)

    if (topCategories.length > 0) {
      patterns.push({
        pattern_type: 'category',
        description: `Most common incident types: ${topCategories.map(([cat, count]) => `${cat} (${count})`).join(', ')}`,
        frequency: topCategories[0][1],
        severity_distribution: {},
        contributing_factors: getCategoryFactors(topCategories[0][0])
      })
    }

    // Time patterns (day of week)
    const dayOfWeekCounts = new Map<string, number>()
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    for (const incident of incidents || []) {
      if (incident.incident_date) {
        const day = days[new Date(incident.incident_date).getDay()]
        dayOfWeekCounts.set(day, (dayOfWeekCounts.get(day) || 0) + 1)
      }
    }

    const peakDay = Array.from(dayOfWeekCounts.entries())
      .sort((a, b) => b[1] - a[1])[0]

    if (peakDay && peakDay[1] > 1) {
      patterns.push({
        pattern_type: 'time',
        description: `Peak incident day: ${peakDay[0]} with ${peakDay[1]} incidents`,
        frequency: peakDay[1],
        severity_distribution: {},
        contributing_factors: ['Start of week fatigue', 'End of week rushing', 'Weather patterns']
      })
    }

    // Build hotspots
    const hotspots: Hotspot[] = Array.from(locationCounts.entries())
      .filter(([_, data]) => data.count >= 2)
      .map(([location, data]) => ({
        location,
        incident_count: data.count,
        risk_score: calculateRiskScore(data.severities),
        primary_hazards: identifyHazards(location)
      }))
      .sort((a, b) => b.risk_score - a.risk_score)
      .slice(0, 5)

    // Build Pareto chart data for root causes
    const rootCauseCounts = new Map<string, number>()
    for (const incident of incidents || []) {
      const rootCause = incident.root_cause || 'Undetermined'
      rootCauseCounts.set(rootCause, (rootCauseCounts.get(rootCause) || 0) + 1)
    }

    const sortedRootCauses = Array.from(rootCauseCounts.entries())
      .sort((a, b) => b[1] - a[1])

    let cumulative = 0
    const totalRootCauses = sortedRootCauses.reduce((sum, [_, count]) => sum + count, 0)

    const rootCausePareto: ParetoItem[] = sortedRootCauses.map(([category, count]) => {
      const percentage = totalRootCauses > 0 ? (count / totalRootCauses) * 100 : 0
      cumulative += percentage
      return {
        category,
        count,
        percentage,
        cumulative_percentage: cumulative
      }
    })

    // Determine trend
    const recentIncidents = incidents?.filter(i => {
      const incidentDate = new Date(i.incident_date)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      return incidentDate >= thirtyDaysAgo
    }).length || 0

    const olderIncidents = incidents?.filter(i => {
      const incidentDate = new Date(i.incident_date)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const sixtyDaysAgo = new Date()
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)
      return incidentDate >= sixtyDaysAgo && incidentDate < thirtyDaysAgo
    }).length || 0

    let trendDirection: 'improving' | 'stable' | 'declining'
    if (recentIncidents < olderIncidents * 0.8) {
      trendDirection = 'improving'
    } else if (recentIncidents > olderIncidents * 1.2) {
      trendDirection = 'declining'
    } else {
      trendDirection = 'stable'
    }

    // Generate recommendations
    const recommendations: Recommendation[] = []

    if (trir > 3.0) {
      recommendations.push({
        priority: 'high',
        category: 'Overall Safety',
        title: 'TRIR Exceeds Industry Average',
        description: `Current TRIR of ${trir.toFixed(2)} is above the construction industry average of 3.0`,
        suggested_actions: [
          'Conduct safety stand-down with all personnel',
          'Review and strengthen safety protocols',
          'Increase safety observation frequency',
          'Consider third-party safety audit',
        ]
      })
    }

    if (hotspots.length > 0) {
      recommendations.push({
        priority: 'high',
        category: 'Hotspot Mitigation',
        title: `Address Safety Hotspots`,
        description: `${hotspots.length} location(s) identified with recurring incidents`,
        suggested_actions: [
          `Focus safety resources on: ${hotspots.slice(0, 2).map(h => h.location).join(', ')}`,
          'Conduct Job Hazard Analysis for high-risk locations',
          'Increase supervisor presence in hotspot areas',
          'Install additional safety signage and barriers',
        ]
      })
    }

    if (rootCausePareto.length > 0 && rootCausePareto[0].cumulative_percentage > 50) {
      recommendations.push({
        priority: 'medium',
        category: 'Root Cause Focus',
        title: 'Target Top Root Causes',
        description: `${rootCausePareto[0].category} accounts for ${rootCausePareto[0].percentage.toFixed(0)}% of incidents`,
        suggested_actions: [
          `Develop targeted training for ${rootCausePareto[0].category}`,
          'Update relevant procedures and controls',
          'Track leading indicators for this category',
        ]
      })
    }

    if (nearMisses > totalIncidents * 2) {
      recommendations.push({
        priority: 'low',
        category: 'Positive Trend',
        title: 'Good Near-Miss Reporting Culture',
        description: `Near-miss reports (${nearMisses}) significantly exceed incidents (${totalIncidents})`,
        suggested_actions: [
          'Continue encouraging near-miss reporting',
          'Analyze near-misses for preventive opportunities',
          'Recognize workers for reporting near-misses',
        ]
      })
    }

    return {
      success: true,
      data: {
        summary: {
          total_incidents: totalIncidents,
          total_near_misses: nearMisses,
          trir,
          dart_rate: dartRate,
          trend_direction: trendDirection
        },
        patterns,
        hotspots,
        root_cause_pareto: rootCausePareto.slice(0, 8),
        recommendations
      },
      metadata: {
        executionTimeMs: 0
      }
    }
  },

  formatOutput(output) {
    const { summary, patterns, hotspots, recommendations } = output

    const trendIcons = {
      'improving': 'trending-down',
      'stable': 'minus',
      'declining': 'trending-up'
    }

    const trendColors = {
      'improving': 'success' as const,
      'stable': 'info' as const,
      'declining': 'error' as const
    }

    return {
      title: 'Incident Pattern Analysis',
      summary: `${summary.total_incidents} incidents, TRIR: ${summary.trir.toFixed(2)}, Trend: ${summary.trend_direction}`,
      icon: trendIcons[summary.trend_direction],
      status: trendColors[summary.trend_direction],
      details: [
        { label: 'Total Incidents', value: summary.total_incidents, type: 'text' },
        { label: 'Near Misses', value: summary.total_near_misses, type: 'text' },
        { label: 'TRIR', value: summary.trir.toFixed(2), type: 'badge' },
        { label: 'DART Rate', value: summary.dart_rate.toFixed(2), type: 'text' },
        { label: 'Trend', value: summary.trend_direction, type: 'badge' },
        { label: 'Hotspots', value: hotspots.length, type: 'text' },
        { label: 'Patterns Found', value: patterns.length, type: 'text' },
      ],
      expandedContent: output
    }
  }
})

function countSeverities(severities: string[]): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const sev of severities) {
    counts[sev] = (counts[sev] || 0) + 1
  }
  return counts
}

function calculateRiskScore(severities: string[]): number {
  const weights: Record<string, number> = {
    'fatality': 100,
    'lost_time': 50,
    'recordable': 30,
    'first_aid': 10,
    'near_miss': 5,
  }

  return severities.reduce((score, sev) => score + (weights[sev] || 5), 0)
}

function identifyHazards(location: string): string[] {
  const lowerLocation = location.toLowerCase()

  const hazardMap: Record<string, string[]> = {
    'roof': ['Falls from height', 'Slips and trips', 'Heat stress'],
    'excavation': ['Cave-in', 'Struck by equipment', 'Utility strikes'],
    'electrical': ['Electrocution', 'Arc flash', 'Burns'],
    'basement': ['Poor ventilation', 'Slips on wet surfaces', 'Limited egress'],
    'scaffold': ['Falls', 'Falling objects', 'Scaffold collapse'],
    'ladder': ['Falls', 'Overreaching', 'Improper setup'],
  }

  for (const [keyword, hazards] of Object.entries(hazardMap)) {
    if (lowerLocation.includes(keyword)) {
      return hazards
    }
  }

  return ['General construction hazards', 'Multiple trades interaction', 'Material handling']
}

function getCategoryFactors(category: string): string[] {
  const factorMap: Record<string, string[]> = {
    'fall': ['Unprotected edges', 'Improper ladder use', 'Inadequate fall protection'],
    'struck_by': ['Moving equipment', 'Falling objects', 'Material handling'],
    'caught_in': ['Rotating equipment', 'Trenching hazards', 'Pinch points'],
    'electrical': ['Live circuits', 'Improper lockout/tagout', 'Damaged equipment'],
    'other': ['Multiple contributing factors', 'Environmental conditions', 'Human factors'],
  }

  return factorMap[category.toLowerCase()] || ['Multiple contributing factors', 'Requires investigation']
}
