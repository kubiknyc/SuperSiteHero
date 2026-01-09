/**
 * Near-Miss Trending Analysis Tool
 * Analyze near-miss data to identify emerging risks before incidents occur
 */

import { createTool } from '../registry'
import { supabase } from '@/lib/supabase'

interface NearMissTrendInput {
  project_id?: string
  company_id: string
  lookback_days?: number
  spike_threshold?: number
}

interface TrendSummary {
  total_near_misses: number
  trend_direction: 'increasing' | 'decreasing' | 'stable'
  percent_change: number
  period_comparison: {
    current_period: number
    previous_period: number
  }
}

interface FrequencyAnalysis {
  daily_average: number
  weekly_pattern: Array<{ day: string; count: number }>
  hourly_pattern: Array<{ hour: number; count: number }>
}

interface EmergingRisk {
  category: string
  location?: string
  trend: 'increasing' | 'new' | 'recurring'
  count: number
  first_occurrence: string
  severity_potential: 'low' | 'medium' | 'high'
}

interface FrequencySpike {
  date: string
  count: number
  expected_count: number
  deviation_percent: number
  possible_causes: string[]
}

interface PredictiveInsight {
  prediction: string
  confidence: number
  supporting_data: string[]
  recommended_action: string
}

interface NearMissTrendOutput {
  trend_summary: TrendSummary
  frequency_analysis: FrequencyAnalysis
  emerging_risks: EmergingRisk[]
  spike_alerts: FrequencySpike[]
  predictive_insights: PredictiveInsight[]
}

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function determineTrendDirection(current: number, previous: number): 'increasing' | 'decreasing' | 'stable' {
  if (previous === 0) return current > 0 ? 'increasing' : 'stable'

  const changePercent = ((current - previous) / previous) * 100

  if (changePercent > 15) return 'increasing'
  if (changePercent < -15) return 'decreasing'
  return 'stable'
}

function calculatePercentChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return ((current - previous) / previous) * 100
}

function assessSeverityPotential(category: string, count: number): 'low' | 'medium' | 'high' {
  // Categories with high injury potential
  const highPotential = ['fall', 'struck_by', 'caught_in', 'electrical', 'crane', 'excavation']
  const mediumPotential = ['equipment', 'vehicle', 'chemical', 'fire']

  const lowerCategory = category.toLowerCase()

  if (highPotential.some(hp => lowerCategory.includes(hp))) {
    return count >= 3 ? 'high' : 'medium'
  }

  if (mediumPotential.some(mp => lowerCategory.includes(mp))) {
    return count >= 5 ? 'high' : 'medium'
  }

  return count >= 7 ? 'medium' : 'low'
}

function generatePossibleCauses(date: Date, count: number, averageCount: number): string[] {
  const causes: string[] = []
  const dayOfWeek = date.getDay()

  // Check if it's Monday (typically higher incident rates)
  if (dayOfWeek === 1) {
    causes.push('Monday effect - returning from weekend')
  }

  // Check if it's Friday (rushing to finish week)
  if (dayOfWeek === 5) {
    causes.push('End of week rushing')
  }

  // Significant deviation
  if (count > averageCount * 2) {
    causes.push('Possible new hazard introduced')
    causes.push('Check for schedule pressure or overtime')
  }

  if (causes.length === 0) {
    causes.push('Investigate specific conditions on this date')
    causes.push('Review work activities and weather conditions')
  }

  return causes
}

export const nearMissTrendsTool = createTool<NearMissTrendInput, NearMissTrendOutput>({
  name: 'near_miss_trends',
  displayName: 'Near-Miss Trend Analysis',
  description: 'Analyzes near-miss reports to identify emerging risks, frequency patterns, and trends before they result in actual incidents. Provides predictive insights and recommendations.',
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
      lookback_days: {
        type: 'number',
        description: 'Number of days to analyze (default: 90)'
      },
      spike_threshold: {
        type: 'number',
        description: 'Percentage above average to trigger spike alert (default: 50)'
      }
    },
    required: ['company_id']
  },
  requiresConfirmation: false,
  estimatedTokens: 1000,

  async execute(input, context) {
    const {
      project_id,
      company_id,
      lookback_days = 90,
      spike_threshold = 50
    } = input

    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - lookback_days)

    const midDate = new Date()
    midDate.setDate(midDate.getDate() - Math.floor(lookback_days / 2))

    // Build query for near-miss observations
    let query = supabase
      .from('safety_observations')
      .select('*')
      .eq('company_id', company_id)
      .eq('category', 'near_miss')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at', { ascending: true })

    if (project_id) {
      query = query.eq('project_id', project_id)
    }

    const { data: nearMisses } = await query

    const allNearMisses = nearMisses || []
    const totalCount = allNearMisses.length

    // Split into current and previous periods for comparison
    const currentPeriodNearMisses = allNearMisses.filter(nm =>
      new Date(nm.created_at) >= midDate
    )
    const previousPeriodNearMisses = allNearMisses.filter(nm =>
      new Date(nm.created_at) < midDate
    )

    const currentCount = currentPeriodNearMisses.length
    const previousCount = previousPeriodNearMisses.length

    // Calculate trend summary
    const trendSummary: TrendSummary = {
      total_near_misses: totalCount,
      trend_direction: determineTrendDirection(currentCount, previousCount),
      percent_change: calculatePercentChange(currentCount, previousCount),
      period_comparison: {
        current_period: currentCount,
        previous_period: previousCount
      }
    }

    // Frequency analysis
    const dailyAverage = totalCount / lookback_days

    // Weekly pattern
    const weeklyPattern: Array<{ day: string; count: number }> = DAYS_OF_WEEK.map((day, index) => ({
      day,
      count: allNearMisses.filter(nm => new Date(nm.created_at).getDay() === index).length
    }))

    // Hourly pattern (if time data available)
    const hourlyPattern: Array<{ hour: number; count: number }> = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      count: allNearMisses.filter(nm => new Date(nm.created_at).getHours() === hour).length
    }))

    const frequencyAnalysis: FrequencyAnalysis = {
      daily_average: dailyAverage,
      weekly_pattern: weeklyPattern,
      hourly_pattern: hourlyPattern.filter(h => h.count > 0) // Only show hours with data
    }

    // Identify emerging risks
    const categoryOccurrences = new Map<string, { count: number; firstDate: string; locations: Set<string> }>()

    for (const nm of allNearMisses) {
      const category = nm.observation_type || nm.category || 'General'
      const existing = categoryOccurrences.get(category)

      if (existing) {
        existing.count++
        if (nm.location) existing.locations.add(nm.location)
      } else {
        categoryOccurrences.set(category, {
          count: 1,
          firstDate: nm.created_at,
          locations: new Set(nm.location ? [nm.location] : [])
        })
      }
    }

    // Find categories that are increasing in the current period
    const emergingRisks: EmergingRisk[] = []

    for (const [category, data] of categoryOccurrences.entries()) {
      const currentPeriodCount = currentPeriodNearMisses.filter(nm =>
        (nm.observation_type || nm.category || 'General') === category
      ).length

      const previousPeriodCount = previousPeriodNearMisses.filter(nm =>
        (nm.observation_type || nm.category || 'General') === category
      ).length

      let trend: 'increasing' | 'new' | 'recurring'
      if (previousPeriodCount === 0 && currentPeriodCount > 0) {
        trend = 'new'
      } else if (currentPeriodCount > previousPeriodCount * 1.3) {
        trend = 'increasing'
      } else if (data.count >= 3) {
        trend = 'recurring'
      } else {
        continue // Not a notable risk
      }

      emergingRisks.push({
        category,
        location: data.locations.size === 1 ? Array.from(data.locations)[0] : undefined,
        trend,
        count: data.count,
        first_occurrence: data.firstDate,
        severity_potential: assessSeverityPotential(category, data.count)
      })
    }

    // Sort by severity potential and count
    emergingRisks.sort((a, b) => {
      const severityOrder = { high: 0, medium: 1, low: 2 }
      if (severityOrder[a.severity_potential] !== severityOrder[b.severity_potential]) {
        return severityOrder[a.severity_potential] - severityOrder[b.severity_potential]
      }
      return b.count - a.count
    })

    // Detect spikes
    const spikeAlerts: FrequencySpike[] = []
    const dailyCounts = new Map<string, number>()

    for (const nm of allNearMisses) {
      const dateKey = new Date(nm.created_at).toISOString().split('T')[0]
      dailyCounts.set(dateKey, (dailyCounts.get(dateKey) || 0) + 1)
    }

    for (const [dateStr, count] of dailyCounts.entries()) {
      const deviationPercent = ((count - dailyAverage) / dailyAverage) * 100

      if (deviationPercent > spike_threshold) {
        spikeAlerts.push({
          date: dateStr,
          count,
          expected_count: dailyAverage,
          deviation_percent: deviationPercent,
          possible_causes: generatePossibleCauses(new Date(dateStr), count, dailyAverage)
        })
      }
    }

    // Sort spikes by deviation
    spikeAlerts.sort((a, b) => b.deviation_percent - a.deviation_percent)

    // Generate predictive insights
    const predictiveInsights: PredictiveInsight[] = []

    if (trendSummary.trend_direction === 'increasing') {
      predictiveInsights.push({
        prediction: 'Near-miss frequency is trending upward, indicating increased risk exposure',
        confidence: 0.75,
        supporting_data: [
          `${trendSummary.percent_change.toFixed(0)}% increase compared to previous period`,
          `Current average: ${(currentCount / (lookback_days / 2)).toFixed(1)} per day`
        ],
        recommended_action: 'Conduct safety stand-down to address rising near-miss trend'
      })
    }

    const highRisks = emergingRisks.filter(r => r.severity_potential === 'high')
    if (highRisks.length > 0) {
      predictiveInsights.push({
        prediction: `${highRisks.length} high-severity risk category(ies) may result in recordable incident if not addressed`,
        confidence: 0.8,
        supporting_data: highRisks.map(r => `${r.category}: ${r.count} occurrences, ${r.trend}`),
        recommended_action: `Prioritize mitigation for: ${highRisks.map(r => r.category).join(', ')}`
      })
    }

    // Check for day-of-week patterns
    const peakDay = weeklyPattern.reduce((max, curr) => curr.count > max.count ? curr : max)
    const avgDayCount = weeklyPattern.reduce((sum, d) => sum + d.count, 0) / 7

    if (peakDay.count > avgDayCount * 1.5) {
      predictiveInsights.push({
        prediction: `${peakDay.day}s show significantly higher near-miss frequency`,
        confidence: 0.7,
        supporting_data: [
          `${peakDay.day}: ${peakDay.count} near-misses (${((peakDay.count / avgDayCount - 1) * 100).toFixed(0)}% above average)`,
          `Average per day: ${avgDayCount.toFixed(1)}`
        ],
        recommended_action: `Increase supervision and safety checks on ${peakDay.day}s`
      })
    }

    // Location concentration
    const locationCounts = new Map<string, number>()
    for (const nm of allNearMisses) {
      if (nm.location) {
        locationCounts.set(nm.location, (locationCounts.get(nm.location) || 0) + 1)
      }
    }

    const topLocation = Array.from(locationCounts.entries())
      .sort((a, b) => b[1] - a[1])[0]

    if (topLocation && topLocation[1] >= 5) {
      predictiveInsights.push({
        prediction: `Location "${topLocation[0]}" is a near-miss hotspot requiring intervention`,
        confidence: 0.85,
        supporting_data: [
          `${topLocation[1]} near-misses at this location`,
          `${((topLocation[1] / totalCount) * 100).toFixed(0)}% of all near-misses`
        ],
        recommended_action: 'Conduct Job Hazard Analysis and implement additional controls at this location'
      })
    }

    return {
      success: true,
      data: {
        trend_summary: trendSummary,
        frequency_analysis: frequencyAnalysis,
        emerging_risks: emergingRisks.slice(0, 8),
        spike_alerts: spikeAlerts.slice(0, 5),
        predictive_insights: predictiveInsights.slice(0, 5)
      },
      metadata: {
        executionTimeMs: 0
      }
    }
  },

  formatOutput(output) {
    const { trend_summary, emerging_risks, spike_alerts, predictive_insights } = output

    const trendIcons = {
      'increasing': 'trending-up',
      'decreasing': 'trending-down',
      'stable': 'minus'
    }

    const trendColors = {
      'increasing': 'warning' as const,
      'decreasing': 'success' as const,
      'stable': 'info' as const
    }

    const highRiskCount = emerging_risks.filter(r => r.severity_potential === 'high').length

    return {
      title: 'Near-Miss Trend Analysis',
      summary: `${trend_summary.total_near_misses} near-misses, ${trend_summary.trend_direction} trend, ${highRiskCount} high-risk categories`,
      icon: trendIcons[trend_summary.trend_direction],
      status: highRiskCount > 0 ? 'warning' : trendColors[trend_summary.trend_direction],
      details: [
        { label: 'Total Near-Misses', value: trend_summary.total_near_misses, type: 'text' },
        { label: 'Trend', value: trend_summary.trend_direction, type: 'badge' },
        { label: 'Change', value: `${trend_summary.percent_change >= 0 ? '+' : ''}${trend_summary.percent_change.toFixed(0)}%`, type: 'text' },
        { label: 'Emerging Risks', value: emerging_risks.length, type: 'text' },
        { label: 'Spikes Detected', value: spike_alerts.length, type: 'text' },
        { label: 'Insights', value: predictive_insights.length, type: 'text' },
      ],
      expandedContent: output
    }
  }
})
