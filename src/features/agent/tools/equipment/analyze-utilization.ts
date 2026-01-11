/**
 * Equipment Utilization Analysis Tool
 * Analyzes equipment utilization rates, identifies underutilized equipment,
 * compares rental vs ownership costs, and recommends optimization strategies
 */

import { createTool } from '../registry'
import { supabase } from '@/lib/supabase'

interface AnalyzeEquipmentUtilizationInput {
  project_id: string
  date_range?: {
    start_date: string
    end_date: string
  }
}

interface EquipmentUtilizationItem {
  equipment_id: string
  equipment_name: string
  equipment_type: string
  serial_number: string | null
  ownership_type: 'owned' | 'rented' | 'leased'
  total_available_hours: number
  total_used_hours: number
  utilization_rate: number
  idle_hours: number
  idle_cost: number
  days_on_site: number
  average_daily_usage: number
  status: 'underutilized' | 'optimal' | 'overutilized'
  maintenance_hours: number
  downtime_hours: number
  operator_count: number
  last_used_date: string | null
}

interface CostAnalysisItem {
  equipment_id: string
  equipment_name: string
  ownership_type: 'owned' | 'rented' | 'leased'
  rental_rate_daily: number | null
  rental_rate_monthly: number | null
  ownership_cost_daily: number | null
  actual_cost: number
  cost_per_hour_used: number
  cost_if_rented: number
  cost_if_owned: number
  potential_savings: number
  recommendation: 'keep_current' | 'switch_to_rental' | 'switch_to_ownership' | 'consider_removal'
  break_even_utilization: number
}

interface UtilizationByType {
  equipment_type: string
  total_units: number
  average_utilization: number
  total_hours_used: number
  total_hours_available: number
  underutilized_count: number
  overutilized_count: number
}

interface OptimizationRecommendation {
  priority: 'critical' | 'high' | 'medium' | 'low'
  category: 'remove_equipment' | 'consolidate' | 'schedule_optimization' | 'rental_conversion' | 'purchase_consideration' | 'maintenance'
  equipment_ids: string[]
  equipment_names: string[]
  description: string
  potential_monthly_savings: number
  implementation_effort: 'low' | 'medium' | 'high'
  action_items: string[]
}

interface AnalyzeEquipmentUtilizationOutput {
  utilization_summary: {
    total_equipment: number
    total_available_hours: number
    total_used_hours: number
    overall_utilization_rate: number
    underutilized_count: number
    optimal_count: number
    overutilized_count: number
    total_idle_cost: number
    average_daily_utilization: number
  }
  by_equipment: EquipmentUtilizationItem[]
  cost_analysis: {
    total_equipment_cost: number
    rental_costs: number
    ownership_costs: number
    maintenance_costs: number
    potential_total_savings: number
    items: CostAnalysisItem[]
  }
  by_type: UtilizationByType[]
  recommendations: OptimizationRecommendation[]
}

export const analyzeEquipmentUtilizationTool = createTool<AnalyzeEquipmentUtilizationInput, AnalyzeEquipmentUtilizationOutput>({
  name: 'analyze_equipment_utilization',
  displayName: 'Analyze Equipment Utilization',
  description: 'Analyzes equipment utilization rates by calculating usage hours vs available hours, identifies underutilized equipment, compares rental vs ownership costs, and provides optimization recommendations to reduce equipment costs.',
  category: 'action',
  parameters: {
    type: 'object',
    properties: {
      project_id: {
        type: 'string',
        description: 'The project ID to analyze equipment utilization for'
      },
      date_range: {
        type: 'object',
        properties: {
          start_date: {
            type: 'string',
            description: 'Start date for analysis period (ISO format)'
          },
          end_date: {
            type: 'string',
            description: 'End date for analysis period (ISO format)'
          }
        },
        description: 'Optional date range for analysis. Defaults to last 30 days if not specified.'
      }
    },
    required: ['project_id']
  },
  requiresConfirmation: false,
  estimatedTokens: 800,

  async execute(input, context) {
    const { project_id, date_range } = input
    const startTime = Date.now()

    // Set default date range to last 30 days if not specified
    const now = new Date()
    const defaultStartDate = new Date(now)
    defaultStartDate.setDate(defaultStartDate.getDate() - 30)

    const startDate = date_range?.start_date || defaultStartDate.toISOString().split('T')[0]
    const endDate = date_range?.end_date || now.toISOString().split('T')[0]

    // Calculate days in analysis period
    const analysisStartDate = new Date(startDate)
    const analysisEndDate = new Date(endDate)
    const analysisDays = Math.max(1, Math.ceil((analysisEndDate.getTime() - analysisStartDate.getTime()) / (1000 * 60 * 60 * 24)))

    // Get project data
    const { data: project } = await supabase
      .from('projects')
      .select('id, name, start_date, end_date')
      .eq('id', project_id)
      .single()

    if (!project) {
      return {
        success: false,
        error: 'Project not found',
        errorCode: 'PROJECT_NOT_FOUND'
      }
    }

    // Get equipment assigned to the project
    const { data: equipment } = await supabase
      .from('equipment')
      .select('*')
      .eq('project_id', project_id)
      .is('deleted_at', null)

    // Get equipment usage/log data
    const { data: usageLogs } = await supabase
      .from('equipment_logs')
      .select('*')
      .eq('project_id', project_id)
      .gte('log_date', startDate)
      .lte('log_date', endDate)
      .is('deleted_at', null)

    // Get daily reports that may contain equipment usage
    const { data: dailyReports } = await supabase
      .from('daily_reports')
      .select(`
        *,
        equipment_entries:daily_report_equipment(*)
      `)
      .eq('project_id', project_id)
      .gte('report_date', startDate)
      .lte('report_date', endDate)
      .is('deleted_at', null)

    // Process equipment data
    const equipmentMap = new Map<string, {
      equipment: any
      totalHoursUsed: number
      daysOnSite: Set<string>
      maintenanceHours: number
      downtimeHours: number
      operators: Set<string>
      lastUsedDate: string | null
      dailyUsage: number[]
    }>()

    // Initialize equipment map
    for (const equip of equipment || []) {
      equipmentMap.set(equip.id, {
        equipment: equip,
        totalHoursUsed: 0,
        daysOnSite: new Set(),
        maintenanceHours: 0,
        downtimeHours: 0,
        operators: new Set(),
        lastUsedDate: null,
        dailyUsage: []
      })
    }

    // Process usage logs
    for (const log of usageLogs || []) {
      const equipmentId = log.equipment_id
      if (!equipmentMap.has(equipmentId)) {continue}

      const data = equipmentMap.get(equipmentId)!
      const hours = log.hours_used || log.hours || log.usage_hours || 0

      data.totalHoursUsed += hours
      data.daysOnSite.add(log.log_date)
      data.dailyUsage.push(hours)

      if (log.operator_id) {
        data.operators.add(log.operator_id)
      }

      if (log.maintenance_hours) {
        data.maintenanceHours += log.maintenance_hours
      }

      if (log.downtime_hours || log.status === 'down') {
        data.downtimeHours += log.downtime_hours || 8 // Assume full day if marked as down
      }

      if (!data.lastUsedDate || log.log_date > data.lastUsedDate) {
        data.lastUsedDate = log.log_date
      }
    }

    // Process daily report equipment entries
    for (const report of dailyReports || []) {
      for (const entry of report.equipment_entries || []) {
        const equipmentId = entry.equipment_id
        if (!equipmentMap.has(equipmentId)) {continue}

        const data = equipmentMap.get(equipmentId)!
        const hours = entry.hours_used || entry.hours || 0

        // Only add if not already counted in usage logs for this date
        if (!data.daysOnSite.has(report.report_date)) {
          data.totalHoursUsed += hours
          data.daysOnSite.add(report.report_date)
          data.dailyUsage.push(hours)
        }

        if (entry.operator_name) {
          data.operators.add(entry.operator_name)
        }

        if (!data.lastUsedDate || report.report_date > data.lastUsedDate) {
          data.lastUsedDate = report.report_date
        }
      }
    }

    // Calculate utilization metrics
    const byEquipment: EquipmentUtilizationItem[] = []
    const costAnalysisItems: CostAnalysisItem[] = []
    const typeMap = new Map<string, UtilizationByType>()

    let totalAvailableHours = 0
    let totalUsedHours = 0
    let underutilizedCount = 0
    let optimalCount = 0
    let overutilizedCount = 0
    let totalIdleCost = 0
    let totalEquipmentCost = 0
    let totalRentalCosts = 0
    let totalOwnershipCosts = 0
    let totalMaintenanceCosts = 0
    let totalPotentialSavings = 0

    // Standard working hours per day
    const HOURS_PER_DAY = 8

    for (const [equipmentId, data] of equipmentMap) {
      const equip = data.equipment
      const ownershipType = (equip.ownership_type || equip.rental_status || 'owned') as 'owned' | 'rented' | 'leased'

      // Calculate available hours (8 hours per day for analysis period)
      const totalAvailable = analysisDays * HOURS_PER_DAY
      const hoursUsed = data.totalHoursUsed
      const idleHours = Math.max(0, totalAvailable - hoursUsed - data.maintenanceHours - data.downtimeHours)

      // Calculate utilization rate
      const utilizationRate = totalAvailable > 0 ? (hoursUsed / totalAvailable) * 100 : 0

      // Determine status based on utilization thresholds
      let status: 'underutilized' | 'optimal' | 'overutilized'
      if (utilizationRate < 40) {
        status = 'underutilized'
        underutilizedCount++
      } else if (utilizationRate > 85) {
        status = 'overutilized'
        overutilizedCount++
      } else {
        status = 'optimal'
        optimalCount++
      }

      // Calculate costs
      const dailyRate = equip.daily_rate || equip.rental_rate_daily || 0
      const monthlyRate = equip.monthly_rate || equip.rental_rate_monthly || dailyRate * 26
      const ownershipDailyCost = equip.ownership_cost_daily || equip.depreciation_daily || dailyRate * 0.6

      let actualCost = 0
      if (ownershipType === 'rented') {
        actualCost = data.daysOnSite.size * dailyRate
        totalRentalCosts += actualCost
      } else {
        actualCost = data.daysOnSite.size * ownershipDailyCost
        totalOwnershipCosts += actualCost
      }

      const maintenanceCost = data.maintenanceHours * (equip.maintenance_rate || 50)
      totalMaintenanceCosts += maintenanceCost

      // Calculate idle cost
      const idleCost = ownershipType === 'rented'
        ? (idleHours / HOURS_PER_DAY) * dailyRate
        : (idleHours / HOURS_PER_DAY) * ownershipDailyCost * 0.5 // Ownership still has some cost when idle

      totalIdleCost += idleCost

      // Cost comparison for rental vs ownership
      const costIfRented = analysisDays * dailyRate
      const costIfOwned = analysisDays * ownershipDailyCost + maintenanceCost

      let costRecommendation: CostAnalysisItem['recommendation'] = 'keep_current'
      let potentialSavings = 0

      if (ownershipType === 'rented' && utilizationRate >= 60 && costIfOwned < costIfRented * 0.8) {
        costRecommendation = 'switch_to_ownership'
        potentialSavings = costIfRented - costIfOwned
      } else if (ownershipType === 'owned' && utilizationRate < 30 && costIfRented < costIfOwned) {
        costRecommendation = 'switch_to_rental'
        potentialSavings = costIfOwned - costIfRented
      } else if (utilizationRate < 20) {
        costRecommendation = 'consider_removal'
        potentialSavings = actualCost * 0.8
      }

      totalPotentialSavings += potentialSavings
      totalEquipmentCost += actualCost

      // Calculate break-even utilization
      const breakEvenUtilization = dailyRate > 0 && ownershipDailyCost > 0
        ? (ownershipDailyCost / dailyRate) * 100
        : 50

      totalAvailableHours += totalAvailable
      totalUsedHours += hoursUsed

      const avgDailyUsage = data.dailyUsage.length > 0
        ? data.dailyUsage.reduce((a, b) => a + b, 0) / data.dailyUsage.length
        : 0

      byEquipment.push({
        equipment_id: equipmentId,
        equipment_name: equip.name || equip.description || 'Unknown Equipment',
        equipment_type: equip.type || equip.equipment_type || equip.category || 'General',
        serial_number: equip.serial_number || null,
        ownership_type: ownershipType,
        total_available_hours: totalAvailable,
        total_used_hours: hoursUsed,
        utilization_rate: Math.round(utilizationRate * 10) / 10,
        idle_hours: idleHours,
        idle_cost: Math.round(idleCost * 100) / 100,
        days_on_site: data.daysOnSite.size,
        average_daily_usage: Math.round(avgDailyUsage * 10) / 10,
        status,
        maintenance_hours: data.maintenanceHours,
        downtime_hours: data.downtimeHours,
        operator_count: data.operators.size,
        last_used_date: data.lastUsedDate
      })

      costAnalysisItems.push({
        equipment_id: equipmentId,
        equipment_name: equip.name || equip.description || 'Unknown Equipment',
        ownership_type: ownershipType,
        rental_rate_daily: dailyRate || null,
        rental_rate_monthly: monthlyRate || null,
        ownership_cost_daily: ownershipDailyCost || null,
        actual_cost: Math.round(actualCost * 100) / 100,
        cost_per_hour_used: hoursUsed > 0 ? Math.round((actualCost / hoursUsed) * 100) / 100 : 0,
        cost_if_rented: Math.round(costIfRented * 100) / 100,
        cost_if_owned: Math.round(costIfOwned * 100) / 100,
        potential_savings: Math.round(potentialSavings * 100) / 100,
        recommendation: costRecommendation,
        break_even_utilization: Math.round(breakEvenUtilization * 10) / 10
      })

      // Track by type
      const equipType = equip.type || equip.equipment_type || equip.category || 'General'
      if (!typeMap.has(equipType)) {
        typeMap.set(equipType, {
          equipment_type: equipType,
          total_units: 0,
          average_utilization: 0,
          total_hours_used: 0,
          total_hours_available: 0,
          underutilized_count: 0,
          overutilized_count: 0
        })
      }

      const typeData = typeMap.get(equipType)!
      typeData.total_units++
      typeData.total_hours_used += hoursUsed
      typeData.total_hours_available += totalAvailable
      if (status === 'underutilized') {typeData.underutilized_count++}
      if (status === 'overutilized') {typeData.overutilized_count++}
    }

    // Calculate average utilization for each type
    const byType: UtilizationByType[] = []
    for (const [, typeData] of typeMap) {
      typeData.average_utilization = typeData.total_hours_available > 0
        ? Math.round((typeData.total_hours_used / typeData.total_hours_available) * 1000) / 10
        : 0
      byType.push(typeData)
    }

    // Sort equipment by utilization rate (lowest first for easier identification of underutilized)
    byEquipment.sort((a, b) => a.utilization_rate - b.utilization_rate)

    // Generate optimization recommendations
    const recommendations = generateOptimizationRecommendations(
      byEquipment,
      costAnalysisItems,
      byType,
      analysisDays
    )

    // Calculate overall utilization
    const overallUtilization = totalAvailableHours > 0
      ? Math.round((totalUsedHours / totalAvailableHours) * 1000) / 10
      : 0

    const avgDailyUtilization = analysisDays > 0 && byEquipment.length > 0
      ? Math.round((totalUsedHours / analysisDays / byEquipment.length) * 10) / 10
      : 0

    const output: AnalyzeEquipmentUtilizationOutput = {
      utilization_summary: {
        total_equipment: byEquipment.length,
        total_available_hours: totalAvailableHours,
        total_used_hours: totalUsedHours,
        overall_utilization_rate: overallUtilization,
        underutilized_count: underutilizedCount,
        optimal_count: optimalCount,
        overutilized_count: overutilizedCount,
        total_idle_cost: Math.round(totalIdleCost * 100) / 100,
        average_daily_utilization: avgDailyUtilization
      },
      by_equipment: byEquipment,
      cost_analysis: {
        total_equipment_cost: Math.round(totalEquipmentCost * 100) / 100,
        rental_costs: Math.round(totalRentalCosts * 100) / 100,
        ownership_costs: Math.round(totalOwnershipCosts * 100) / 100,
        maintenance_costs: Math.round(totalMaintenanceCosts * 100) / 100,
        potential_total_savings: Math.round(totalPotentialSavings * 100) / 100,
        items: costAnalysisItems
      },
      by_type: byType,
      recommendations
    }

    return {
      success: true,
      data: output,
      metadata: {
        executionTimeMs: Date.now() - startTime
      }
    }
  },

  formatOutput(output) {
    const { utilization_summary, recommendations, cost_analysis } = output

    const criticalRecs = recommendations.filter(r => r.priority === 'critical').length
    const highRecs = recommendations.filter(r => r.priority === 'high').length

    const status = criticalRecs > 0 ? 'error' :
      highRecs > 0 || utilization_summary.underutilized_count > utilization_summary.total_equipment * 0.3 ? 'warning' : 'success'

    const savingsText = cost_analysis.potential_total_savings > 0
      ? ` - $${cost_analysis.potential_total_savings.toLocaleString()} potential savings`
      : ''

    return {
      title: 'Equipment Utilization Analysis',
      summary: `${utilization_summary.total_equipment} equipment: ${utilization_summary.overall_utilization_rate}% utilization, ${utilization_summary.underutilized_count} underutilized${savingsText}`,
      icon: 'truck',
      status,
      details: [
        { label: 'Total Equipment', value: utilization_summary.total_equipment.toString(), type: 'text' },
        { label: 'Overall Utilization', value: `${utilization_summary.overall_utilization_rate}%`, type: 'badge' },
        { label: 'Underutilized', value: utilization_summary.underutilized_count.toString(), type: utilization_summary.underutilized_count > 0 ? 'badge' : 'text' },
        { label: 'Optimal', value: utilization_summary.optimal_count.toString(), type: 'text' },
        { label: 'Overutilized', value: utilization_summary.overutilized_count.toString(), type: utilization_summary.overutilized_count > 0 ? 'badge' : 'text' },
        { label: 'Total Idle Cost', value: `$${utilization_summary.total_idle_cost.toLocaleString()}`, type: 'text' },
        { label: 'Total Equipment Cost', value: `$${cost_analysis.total_equipment_cost.toLocaleString()}`, type: 'text' },
        { label: 'Potential Savings', value: `$${cost_analysis.potential_total_savings.toLocaleString()}`, type: cost_analysis.potential_total_savings > 0 ? 'badge' : 'text' },
        { label: 'Recommendations', value: `${criticalRecs} critical, ${highRecs} high priority`, type: 'badge' }
      ],
      expandedContent: output as unknown as Record<string, unknown>
    }
  }
})

// ============================================================================
// Helper Functions
// ============================================================================

function generateOptimizationRecommendations(
  byEquipment: EquipmentUtilizationItem[],
  costAnalysis: CostAnalysisItem[],
  byType: UtilizationByType[],
  analysisDays: number
): OptimizationRecommendation[] {
  const recommendations: OptimizationRecommendation[] = []

  // Identify severely underutilized equipment for removal
  const severelyUnderutilized = byEquipment.filter(e => e.utilization_rate < 15 && e.days_on_site >= 5)
  if (severelyUnderutilized.length > 0) {
    const totalSavings = costAnalysis
      .filter(c => severelyUnderutilized.some(e => e.equipment_id === c.equipment_id))
      .reduce((sum, c) => sum + c.actual_cost, 0)

    recommendations.push({
      priority: 'critical',
      category: 'remove_equipment',
      equipment_ids: severelyUnderutilized.map(e => e.equipment_id),
      equipment_names: severelyUnderutilized.map(e => e.equipment_name),
      description: `${severelyUnderutilized.length} equipment item(s) have less than 15% utilization and should be considered for removal from the project`,
      potential_monthly_savings: Math.round((totalSavings / analysisDays) * 30 * 0.9),
      implementation_effort: 'low',
      action_items: [
        'Review equipment usage logs to confirm low utilization',
        'Coordinate with project schedule to identify if equipment will be needed later',
        'Arrange for return of rental equipment or reassignment of owned equipment',
        'Update equipment allocation records'
      ]
    })
  }

  // Equipment recommended for ownership conversion
  const convertToOwnership = costAnalysis.filter(c => c.recommendation === 'switch_to_ownership')
  if (convertToOwnership.length > 0) {
    const totalSavings = convertToOwnership.reduce((sum, c) => sum + c.potential_savings, 0)

    recommendations.push({
      priority: 'high',
      category: 'purchase_consideration',
      equipment_ids: convertToOwnership.map(c => c.equipment_id),
      equipment_names: convertToOwnership.map(c => c.equipment_name),
      description: `${convertToOwnership.length} rented equipment item(s) have high utilization and would be more cost-effective to purchase`,
      potential_monthly_savings: Math.round((totalSavings / analysisDays) * 30),
      implementation_effort: 'high',
      action_items: [
        'Evaluate long-term project needs for this equipment type',
        'Request purchase quotes and compare with current rental costs',
        'Consider financing options if purchasing',
        'Factor in maintenance and storage costs for owned equipment'
      ]
    })
  }

  // Equipment recommended for rental conversion
  const convertToRental = costAnalysis.filter(c => c.recommendation === 'switch_to_rental')
  if (convertToRental.length > 0) {
    const totalSavings = convertToRental.reduce((sum, c) => sum + c.potential_savings, 0)

    recommendations.push({
      priority: 'medium',
      category: 'rental_conversion',
      equipment_ids: convertToRental.map(c => c.equipment_id),
      equipment_names: convertToRental.map(c => c.equipment_name),
      description: `${convertToRental.length} owned equipment item(s) have low utilization and would be more cost-effective to rent on-demand`,
      potential_monthly_savings: Math.round((totalSavings / analysisDays) * 30),
      implementation_effort: 'medium',
      action_items: [
        'Identify rental vendors with suitable equipment',
        'Negotiate rental rates based on project duration',
        'Consider selling underutilized owned equipment',
        'Update equipment fleet management strategy'
      ]
    })
  }

  // Consolidation opportunities for same-type equipment
  for (const typeData of byType) {
    if (typeData.underutilized_count >= 2 && typeData.total_units >= 3) {
      const underutilizedOfType = byEquipment.filter(
        e => e.equipment_type === typeData.equipment_type && e.status === 'underutilized'
      )

      const totalTypeIdleCost = underutilizedOfType.reduce((sum, e) => sum + e.idle_cost, 0)

      recommendations.push({
        priority: 'medium',
        category: 'consolidate',
        equipment_ids: underutilizedOfType.map(e => e.equipment_id),
        equipment_names: underutilizedOfType.map(e => e.equipment_name),
        description: `${typeData.underutilized_count} of ${typeData.total_units} ${typeData.equipment_type} units are underutilized - consider consolidating`,
        potential_monthly_savings: Math.round((totalTypeIdleCost / analysisDays) * 30 * 0.5),
        implementation_effort: 'medium',
        action_items: [
          `Review scheduling to maximize usage of fewer ${typeData.equipment_type} units`,
          'Coordinate between work crews to share equipment',
          'Return or reassign excess equipment',
          'Monitor utilization after consolidation'
        ]
      })
    }
  }

  // Overutilized equipment - schedule optimization
  const overutilized = byEquipment.filter(e => e.status === 'overutilized')
  if (overutilized.length > 0) {
    recommendations.push({
      priority: 'high',
      category: 'schedule_optimization',
      equipment_ids: overutilized.map(e => e.equipment_id),
      equipment_names: overutilized.map(e => e.equipment_name),
      description: `${overutilized.length} equipment item(s) are overutilized (>85%) which may lead to accelerated wear and breakdowns`,
      potential_monthly_savings: 0,
      implementation_effort: 'medium',
      action_items: [
        'Review work schedules to balance equipment usage',
        'Consider adding additional equipment of this type',
        'Schedule preventive maintenance to avoid breakdowns',
        'Monitor operator fatigue and safety'
      ]
    })
  }

  // Equipment with high maintenance/downtime
  const highDowntime = byEquipment.filter(e => e.downtime_hours > e.total_available_hours * 0.15)
  if (highDowntime.length > 0) {
    recommendations.push({
      priority: 'medium',
      category: 'maintenance',
      equipment_ids: highDowntime.map(e => e.equipment_id),
      equipment_names: highDowntime.map(e => e.equipment_name),
      description: `${highDowntime.length} equipment item(s) have excessive downtime (>15%) - review maintenance programs`,
      potential_monthly_savings: 0,
      implementation_effort: 'medium',
      action_items: [
        'Review maintenance logs to identify recurring issues',
        'Evaluate equipment age and condition for replacement',
        'Improve preventive maintenance scheduling',
        'Consider backup equipment for critical operations'
      ]
    })
  }

  // General optimization if no specific issues
  if (recommendations.length === 0) {
    const avgUtilization = byEquipment.length > 0
      ? byEquipment.reduce((sum, e) => sum + e.utilization_rate, 0) / byEquipment.length
      : 0

    if (avgUtilization >= 50 && avgUtilization <= 75) {
      recommendations.push({
        priority: 'low',
        category: 'schedule_optimization',
        equipment_ids: [],
        equipment_names: [],
        description: 'Equipment utilization is within optimal range - maintain current practices',
        potential_monthly_savings: 0,
        implementation_effort: 'low',
        action_items: [
          'Continue monitoring utilization rates weekly',
          'Maintain preventive maintenance schedules',
          'Review equipment needs before major phase changes'
        ]
      })
    }
  }

  // Sort by priority
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
  recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])

  return recommendations.slice(0, 8)
}
