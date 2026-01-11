/**
 * Quality Deficiency Analysis Tool
 * Analyzes quality deficiencies by trade, identifies patterns, and recommends corrective actions
 */

import { createTool } from '../registry'
import { supabase } from '@/lib/supabase'
import type { AgentContext } from '../../types'

interface AnalyzeDeficienciesInput {
  project_id: string
  date_range_start?: string
  date_range_end?: string
  trade_filter?: string[]
  severity_filter?: string[]
  include_resolved?: boolean
}

interface DeficiencyItem {
  id: string
  description: string
  location: string
  trade: string
  severity: 'minor' | 'moderate' | 'major' | 'critical'
  status: 'open' | 'in_progress' | 'resolved' | 'verified'
  identified_date: string
  resolved_date: string | null
  days_open: number
  root_cause: string | null
  corrective_action: string | null
  inspector: string | null
  csi_section: string | null
}

interface TradeSummary {
  trade: string
  total_deficiencies: number
  open: number
  resolved: number
  critical_count: number
  major_count: number
  average_days_to_resolve: number
  deficiency_rate: number // per 1000 sq ft or unit
  trend: 'improving' | 'stable' | 'declining'
}

interface PatternAnalysis {
  pattern: string
  occurrences: number
  affected_trades: string[]
  locations: string[]
  severity_distribution: Record<string, number>
  recommended_action: string
  root_cause_category: string
}

interface CorrectiveAction {
  action: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  target_trades: string[]
  estimated_impact: string
  implementation_steps: string[]
  preventive_measures: string[]
}

interface AnalyzeDeficienciesOutput {
  summary: {
    total_deficiencies: number
    open: number
    in_progress: number
    resolved: number
    verified: number
    critical_open: number
    average_days_to_resolve: number
    deficiency_rate_trend: 'improving' | 'stable' | 'declining'
  }
  deficiencies: DeficiencyItem[]
  by_trade: TradeSummary[]
  by_severity: Record<string, { count: number; open: number; resolved: number }>
  by_location: Record<string, { count: number; trades: string[] }>
  patterns: PatternAnalysis[]
  corrective_actions: CorrectiveAction[]
  trending_issues: Array<{
    issue: string
    frequency: number
    first_occurrence: string
    trend: 'increasing' | 'stable' | 'decreasing'
  }>
  quality_score: {
    overall: number
    by_trade: Record<string, number>
    trend: 'improving' | 'stable' | 'declining'
  }
  recommendations: string[]
}

export const analyzeDeficienciesTool = createTool<AnalyzeDeficienciesInput, AnalyzeDeficienciesOutput>({
  name: 'analyze_quality_deficiencies',
  description: 'Analyzes quality deficiencies by trade, identifies patterns and trends, and recommends corrective actions. Helps improve quality control and reduce rework.',
  category: 'quality',
  parameters: {
    type: 'object',
    properties: {
      project_id: {
        type: 'string',
        description: 'The project ID to analyze deficiencies for'
      },
      date_range_start: {
        type: 'string',
        description: 'Start date for analysis (ISO format)'
      },
      date_range_end: {
        type: 'string',
        description: 'End date for analysis (ISO format)'
      },
      trade_filter: {
        type: 'array',
        items: { type: 'string' },
        description: 'Filter by specific trades'
      },
      severity_filter: {
        type: 'array',
        items: { type: 'string' },
        description: 'Filter by severity (minor, moderate, major, critical)'
      },
      include_resolved: {
        type: 'boolean',
        description: 'Include resolved deficiencies (default: true)'
      }
    },
    required: ['project_id']
  },

  async execute(input: AnalyzeDeficienciesInput, context: AgentContext): Promise<AnalyzeDeficienciesOutput> {
    const {
      project_id,
      date_range_start,
      date_range_end,
      trade_filter,
      severity_filter,
      include_resolved = true
    } = input

    // Build query for quality deficiencies
    let query = supabase
      .from('quality_deficiencies')
      .select('*')
      .eq('project_id', project_id)
      .is('deleted_at', null)

    if (date_range_start) {
      query = query.gte('identified_date', date_range_start)
    }

    if (date_range_end) {
      query = query.lte('identified_date', date_range_end)
    }

    if (trade_filter && trade_filter.length > 0) {
      query = query.in('trade', trade_filter)
    }

    if (severity_filter && severity_filter.length > 0) {
      query = query.in('severity', severity_filter)
    }

    if (!include_resolved) {
      query = query.not('status', 'in', '("resolved","verified")')
    }

    const { data: deficiencies } = await query.order('identified_date', { ascending: false })

    // Also get punch list items as they often represent quality issues
    const { data: punchItems } = await supabase
      .from('punch_items')
      .select('*')
      .eq('project_id', project_id)
      .is('deleted_at', null)

    const now = new Date()

    // Process deficiencies
    const processedDeficiencies: DeficiencyItem[] = []
    const tradeMap = new Map<string, TradeSummary>()
    const locationMap = new Map<string, { count: number; trades: Set<string> }>()
    const severityMap: Record<string, { count: number; open: number; resolved: number }> = {
      minor: { count: 0, open: 0, resolved: 0 },
      moderate: { count: 0, open: 0, resolved: 0 },
      major: { count: 0, open: 0, resolved: 0 },
      critical: { count: 0, open: 0, resolved: 0 }
    }

    let totalOpen = 0
    let totalInProgress = 0
    let totalResolved = 0
    let totalVerified = 0
    let criticalOpen = 0
    let totalDaysToResolve = 0
    let resolvedCount = 0

    // Process deficiency records
    for (const def of deficiencies || []) {
      const identifiedDate = new Date(def.identified_date)
      const resolvedDate = def.resolved_date ? new Date(def.resolved_date) : null

      const daysOpen = resolvedDate
        ? Math.floor((resolvedDate.getTime() - identifiedDate.getTime()) / (1000 * 60 * 60 * 24))
        : Math.floor((now.getTime() - identifiedDate.getTime()) / (1000 * 60 * 60 * 24))

      const severity = normalizeSeverity(def.severity)
      const trade = def.trade || 'General'
      const location = def.location || 'Unspecified'
      const status = def.status || 'open'

      const item: DeficiencyItem = {
        id: def.id,
        description: def.description || '',
        location,
        trade,
        severity,
        status: status as 'open' | 'in_progress' | 'resolved' | 'verified',
        identified_date: def.identified_date,
        resolved_date: def.resolved_date || null,
        days_open: daysOpen,
        root_cause: def.root_cause || null,
        corrective_action: def.corrective_action || null,
        inspector: def.inspector || def.identified_by || null,
        csi_section: def.csi_section || null
      }

      processedDeficiencies.push(item)

      // Count by status
      switch (status) {
        case 'open':
          totalOpen++
          if (severity === 'critical') {criticalOpen++}
          break
        case 'in_progress':
          totalInProgress++
          break
        case 'resolved':
          totalResolved++
          totalDaysToResolve += daysOpen
          resolvedCount++
          break
        case 'verified':
          totalVerified++
          totalDaysToResolve += daysOpen
          resolvedCount++
          break
      }

      // Track by severity
      if (severityMap[severity]) {
        severityMap[severity].count++
        if (status === 'resolved' || status === 'verified') {
          severityMap[severity].resolved++
        } else {
          severityMap[severity].open++
        }
      }

      // Track by trade
      if (!tradeMap.has(trade)) {
        tradeMap.set(trade, {
          trade,
          total_deficiencies: 0,
          open: 0,
          resolved: 0,
          critical_count: 0,
          major_count: 0,
          average_days_to_resolve: 0,
          deficiency_rate: 0,
          trend: 'stable'
        })
      }

      const tradeSummary = tradeMap.get(trade)!
      tradeSummary.total_deficiencies++
      if (status === 'resolved' || status === 'verified') {
        tradeSummary.resolved++
      } else {
        tradeSummary.open++
      }
      if (severity === 'critical') {tradeSummary.critical_count++}
      if (severity === 'major') {tradeSummary.major_count++}

      // Track by location
      if (!locationMap.has(location)) {
        locationMap.set(location, { count: 0, trades: new Set() })
      }
      const locData = locationMap.get(location)!
      locData.count++
      locData.trades.add(trade)
    }

    // Include punch items as quality deficiencies
    for (const punch of punchItems || []) {
      if (punch.type === 'quality' || punch.category === 'quality') {
        const trade = punch.trade || punch.responsible_trade || 'General'
        if (!tradeMap.has(trade)) {
          tradeMap.set(trade, {
            trade,
            total_deficiencies: 0,
            open: 0,
            resolved: 0,
            critical_count: 0,
            major_count: 0,
            average_days_to_resolve: 0,
            deficiency_rate: 0,
            trend: 'stable'
          })
        }
        const tradeSummary = tradeMap.get(trade)!
        tradeSummary.total_deficiencies++
        if (punch.status === 'completed' || punch.status === 'closed') {
          tradeSummary.resolved++
        } else {
          tradeSummary.open++
        }
      }
    }

    // Calculate trade averages and trends
    for (const [, summary] of tradeMap) {
      // Calculate average days to resolve
      const tradeDeficiencies = processedDeficiencies.filter(d => d.trade === summary.trade && d.resolved_date)
      if (tradeDeficiencies.length > 0) {
        const totalDays = tradeDeficiencies.reduce((sum, d) => sum + d.days_open, 0)
        summary.average_days_to_resolve = Math.round(totalDays / tradeDeficiencies.length)
      }

      // Determine trend based on recent vs older deficiencies
      summary.trend = calculateTradeTrend(processedDeficiencies.filter(d => d.trade === summary.trade))
    }

    const byTrade = Array.from(tradeMap.values())
      .sort((a, b) => b.total_deficiencies - a.total_deficiencies)

    const byLocation: Record<string, { count: number; trades: string[] }> = {}
    for (const [loc, data] of locationMap) {
      byLocation[loc] = { count: data.count, trades: Array.from(data.trades) }
    }

    // Identify patterns
    const patterns = identifyPatterns(processedDeficiencies)

    // Generate corrective actions
    const correctiveActions = generateCorrectiveActions(patterns, byTrade)

    // Identify trending issues
    const trendingIssues = identifyTrendingIssues(processedDeficiencies)

    // Calculate quality scores
    const qualityScore = calculateQualityScores(processedDeficiencies, byTrade)

    // Calculate averages
    const averageDaysToResolve = resolvedCount > 0
      ? Math.round(totalDaysToResolve / resolvedCount)
      : 0

    // Determine overall trend
    const deficiencyRateTrend = calculateOverallTrend(processedDeficiencies)

    // Generate recommendations
    const recommendations = generateRecommendations(
      patterns,
      byTrade,
      criticalOpen,
      averageDaysToResolve,
      qualityScore
    )

    return {
      summary: {
        total_deficiencies: processedDeficiencies.length,
        open: totalOpen,
        in_progress: totalInProgress,
        resolved: totalResolved,
        verified: totalVerified,
        critical_open: criticalOpen,
        average_days_to_resolve: averageDaysToResolve,
        deficiency_rate_trend: deficiencyRateTrend
      },
      deficiencies: processedDeficiencies.slice(0, 50),
      by_trade: byTrade,
      by_severity: severityMap,
      by_location: byLocation,
      patterns,
      corrective_actions: correctiveActions,
      trending_issues: trendingIssues,
      quality_score: qualityScore,
      recommendations
    }
  }
})

function normalizeSeverity(severity: string | null): 'minor' | 'moderate' | 'major' | 'critical' {
  const sev = (severity || '').toLowerCase()
  if (/critical|severe|safety/i.test(sev)) {return 'critical'}
  if (/major|high|significant/i.test(sev)) {return 'major'}
  if (/moderate|medium/i.test(sev)) {return 'moderate'}
  return 'minor'
}

function calculateTradeTrend(deficiencies: DeficiencyItem[]): 'improving' | 'stable' | 'declining' {
  if (deficiencies.length < 5) {return 'stable'}

  const now = new Date()
  const thirtyDaysAgo = new Date(now)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const sixtyDaysAgo = new Date(now)
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)

  const recent = deficiencies.filter(d => new Date(d.identified_date) >= thirtyDaysAgo).length
  const older = deficiencies.filter(d => {
    const date = new Date(d.identified_date)
    return date >= sixtyDaysAgo && date < thirtyDaysAgo
  }).length

  if (older === 0) {return 'stable'}

  const changeRate = (recent - older) / older
  if (changeRate < -0.2) {return 'improving'}
  if (changeRate > 0.2) {return 'declining'}
  return 'stable'
}

function calculateOverallTrend(deficiencies: DeficiencyItem[]): 'improving' | 'stable' | 'declining' {
  return calculateTradeTrend(deficiencies)
}

function identifyPatterns(deficiencies: DeficiencyItem[]): PatternAnalysis[] {
  const patterns: PatternAnalysis[] = []
  const descriptionClusters = new Map<string, DeficiencyItem[]>()

  // Cluster deficiencies by keywords
  const keywords = [
    'leak', 'crack', 'alignment', 'finish', 'gap', 'stain', 'damage',
    'incomplete', 'missing', 'incorrect', 'tolerance', 'installation'
  ]

  for (const keyword of keywords) {
    const matches = deficiencies.filter(d =>
      d.description.toLowerCase().includes(keyword)
    )

    if (matches.length >= 3) {
      const trades = [...new Set(matches.map(m => m.trade))]
      const locations = [...new Set(matches.map(m => m.location))]
      const severityDist: Record<string, number> = {}

      for (const match of matches) {
        severityDist[match.severity] = (severityDist[match.severity] || 0) + 1
      }

      patterns.push({
        pattern: `${keyword.charAt(0).toUpperCase() + keyword.slice(1)} issues`,
        occurrences: matches.length,
        affected_trades: trades,
        locations: locations.slice(0, 5),
        severity_distribution: severityDist,
        recommended_action: getPatternAction(keyword),
        root_cause_category: getRootCauseCategory(keyword)
      })
    }
  }

  // Sort by occurrences
  patterns.sort((a, b) => b.occurrences - a.occurrences)

  return patterns.slice(0, 8)
}

function getPatternAction(keyword: string): string {
  const actions: Record<string, string> = {
    leak: 'Implement enhanced waterproofing inspections and testing protocols',
    crack: 'Review structural/material specifications and curing procedures',
    alignment: 'Increase layout verification checkpoints',
    finish: 'Conduct finish quality training for applicable trades',
    gap: 'Review installation tolerances and inspection criteria',
    stain: 'Implement material protection protocols',
    damage: 'Enhance material handling and protection procedures',
    incomplete: 'Strengthen punch list and completion verification processes',
    missing: 'Improve installation checklist compliance',
    incorrect: 'Increase submittal review and installation verification',
    tolerance: 'Review tolerance specifications and measurement methods',
    installation: 'Conduct installation procedure training'
  }

  return actions[keyword] || 'Review quality control procedures'
}

function getRootCauseCategory(keyword: string): string {
  const categories: Record<string, string> = {
    leak: 'Workmanship',
    crack: 'Materials/Design',
    alignment: 'Workmanship',
    finish: 'Workmanship',
    gap: 'Workmanship',
    stain: 'Protection',
    damage: 'Protection',
    incomplete: 'Process',
    missing: 'Process',
    incorrect: 'Communication',
    tolerance: 'Workmanship',
    installation: 'Workmanship'
  }

  return categories[keyword] || 'General'
}

function generateCorrectiveActions(
  patterns: PatternAnalysis[],
  byTrade: TradeSummary[]
): CorrectiveAction[] {
  const actions: CorrectiveAction[] = []

  // Actions based on patterns
  for (const pattern of patterns.slice(0, 3)) {
    const hasCritical = pattern.severity_distribution['critical'] > 0
    const hasMajor = pattern.severity_distribution['major'] > 0

    actions.push({
      action: pattern.recommended_action,
      priority: hasCritical ? 'critical' : hasMajor ? 'high' : 'medium',
      target_trades: pattern.affected_trades,
      estimated_impact: `Reduce ${pattern.pattern.toLowerCase()} by 50%+`,
      implementation_steps: [
        'Identify root causes through detailed analysis',
        'Develop corrective procedure documentation',
        'Conduct training with affected trades',
        'Implement enhanced inspection checkpoints',
        'Monitor and verify improvement'
      ],
      preventive_measures: [
        'Pre-work quality briefings',
        'Enhanced mock-up/first-work inspections',
        'Real-time quality monitoring',
        'Trade accountability tracking'
      ]
    })
  }

  // Actions based on trade performance
  const poorPerformingTrades = byTrade.filter(t => t.critical_count > 2 || t.open > 10)
  for (const trade of poorPerformingTrades.slice(0, 2)) {
    actions.push({
      action: `Quality improvement program for ${trade.trade}`,
      priority: trade.critical_count > 2 ? 'high' : 'medium',
      target_trades: [trade.trade],
      estimated_impact: 'Reduce deficiency rate by 30%+',
      implementation_steps: [
        `Schedule quality meeting with ${trade.trade} supervision`,
        'Review recurring issues and root causes',
        'Develop trade-specific quality checklist',
        'Implement daily quality verification'
      ],
      preventive_measures: [
        'First-work inspections before proceeding',
        'Daily quality walks with trade foreman',
        'Photo documentation requirements'
      ]
    })
  }

  return actions.slice(0, 5)
}

function identifyTrendingIssues(deficiencies: DeficiencyItem[]): Array<{
  issue: string
  frequency: number
  first_occurrence: string
  trend: 'increasing' | 'stable' | 'decreasing'
}> {
  const issueGroups = new Map<string, DeficiencyItem[]>()

  // Group by similar descriptions
  for (const def of deficiencies) {
    const key = def.description.substring(0, 50).toLowerCase()
    if (!issueGroups.has(key)) {
      issueGroups.set(key, [])
    }
    issueGroups.get(key)!.push(def)
  }

  const trending: Array<{
    issue: string
    frequency: number
    first_occurrence: string
    trend: 'increasing' | 'stable' | 'decreasing'
  }> = []

  for (const [, items] of issueGroups) {
    if (items.length >= 3) {
      items.sort((a, b) => new Date(a.identified_date).getTime() - new Date(b.identified_date).getTime())

      trending.push({
        issue: items[0].description.substring(0, 100),
        frequency: items.length,
        first_occurrence: items[0].identified_date,
        trend: calculateTradeTrend(items) === 'improving' ? 'decreasing' :
               calculateTradeTrend(items) === 'declining' ? 'increasing' : 'stable'
      })
    }
  }

  return trending
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 5)
}

function calculateQualityScores(
  deficiencies: DeficiencyItem[],
  byTrade: TradeSummary[]
): {
  overall: number
  by_trade: Record<string, number>
  trend: 'improving' | 'stable' | 'declining'
} {
  // Calculate overall score (100 = perfect, 0 = terrible)
  // Factors: resolution rate, severity distribution, days to resolve

  const total = deficiencies.length
  if (total === 0) {
    return {
      overall: 100,
      by_trade: {},
      trend: 'stable'
    }
  }

  const resolved = deficiencies.filter(d => d.status === 'resolved' || d.status === 'verified').length
  const resolutionRate = resolved / total

  const criticalCount = deficiencies.filter(d => d.severity === 'critical').length
  const majorCount = deficiencies.filter(d => d.severity === 'major').length
  const severityPenalty = (criticalCount * 10 + majorCount * 5) / total

  const avgDays = deficiencies.reduce((sum, d) => sum + d.days_open, 0) / total
  const daysPenalty = Math.min(avgDays / 30, 1) * 20

  const overall = Math.max(0, Math.min(100, Math.round(
    100 * resolutionRate - severityPenalty - daysPenalty
  )))

  // Calculate by trade
  const byTradeScores: Record<string, number> = {}
  for (const trade of byTrade) {
    const tradeTotal = trade.total_deficiencies
    if (tradeTotal === 0) {
      byTradeScores[trade.trade] = 100
      continue
    }

    const tradeResRate = trade.resolved / tradeTotal
    const tradeSeverityPenalty = (trade.critical_count * 10 + trade.major_count * 5) / tradeTotal

    byTradeScores[trade.trade] = Math.max(0, Math.min(100, Math.round(
      100 * tradeResRate - tradeSeverityPenalty
    )))
  }

  // Determine trend
  const trend = calculateOverallTrend(deficiencies)

  return {
    overall,
    by_trade: byTradeScores,
    trend
  }
}

function generateRecommendations(
  patterns: PatternAnalysis[],
  byTrade: TradeSummary[],
  criticalOpen: number,
  averageDaysToResolve: number,
  qualityScore: { overall: number; by_trade: Record<string, number>; trend: string }
): string[] {
  const recommendations: string[] = []

  // Critical issues
  if (criticalOpen > 0) {
    recommendations.push(`URGENT: ${criticalOpen} critical deficiencies require immediate attention`)
  }

  // Resolution time
  if (averageDaysToResolve > 14) {
    recommendations.push(`Average resolution time (${averageDaysToResolve} days) exceeds target - implement expedited resolution process`)
  }

  // Poor performing trades
  const poorTrades = byTrade.filter(t => (qualityScore.by_trade[t.trade] || 100) < 60)
  if (poorTrades.length > 0) {
    recommendations.push(`Quality improvement focus needed for: ${poorTrades.map(t => t.trade).join(', ')}`)
  }

  // Pattern-based recommendations
  if (patterns.length > 0) {
    const topPattern = patterns[0]
    recommendations.push(`Most common issue: ${topPattern.pattern} (${topPattern.occurrences} occurrences) - ${topPattern.recommended_action}`)
  }

  // Trend-based recommendations
  if (qualityScore.trend === 'declining') {
    recommendations.push('Quality trend is declining - schedule quality improvement meeting with all trades')
  } else if (qualityScore.trend === 'improving') {
    recommendations.push('Quality trend is improving - continue current quality control measures')
  }

  // General best practices
  if (qualityScore.overall < 70) {
    recommendations.push('Consider implementing daily quality walks and first-work inspections')
  }

  if (recommendations.length === 0) {
    recommendations.push('Quality metrics are within acceptable ranges - maintain current oversight')
  }

  return recommendations.slice(0, 8)
}
