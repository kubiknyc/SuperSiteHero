/**
 * Resource Conflict Detection Tool
 * Detect labor, equipment, and space conflicts with resolution options
 */

import { createTool } from '../registry'
import { supabase } from '@/lib/supabase'

interface DetectResourceConflictsInput {
  project_id: string
  look_ahead_days?: number
  resource_types?: ('labor' | 'equipment' | 'space' | 'material')[]
}

interface ConflictedActivity {
  activity_id: string
  activity_name: string
  resource_requirement: string
}

interface ResolutionOption {
  option: string
  feasibility: 'easy' | 'moderate' | 'difficult'
  cost_impact: string
  schedule_impact: string
}

interface ResourceConflict {
  conflict_id: string
  conflict_type: 'labor' | 'equipment' | 'space' | 'material'
  date: string
  description: string
  severity: 'low' | 'medium' | 'high'
  activities_affected: ConflictedActivity[]
  resolution_options: ResolutionOption[]
}

interface ResourceUtilization {
  resource_type: string
  resource_name: string
  utilization_by_day: Array<{
    date: string
    allocated: number
    available: number
    utilization_percent: number
  }>
}

interface DetectResourceConflictsOutput {
  conflicts: ResourceConflict[]
  resource_utilization: ResourceUtilization[]
  recommendations: string[]
  summary: {
    total_conflicts: number
    critical_conflicts: number
    resolution_actions_needed: number
  }
}

// Trade-to-resource mapping for labor estimation
const TRADE_RESOURCE_REQUIREMENTS: Record<string, { min_crew: number; typical_crew: number }> = {
  'Electrical': { min_crew: 2, typical_crew: 4 },
  'Plumbing': { min_crew: 2, typical_crew: 4 },
  'HVAC': { min_crew: 2, typical_crew: 4 },
  'Concrete': { min_crew: 4, typical_crew: 8 },
  'Framing': { min_crew: 4, typical_crew: 6 },
  'Drywall': { min_crew: 3, typical_crew: 6 },
  'Painting': { min_crew: 2, typical_crew: 4 },
  'Roofing': { min_crew: 4, typical_crew: 6 },
  'Steel': { min_crew: 4, typical_crew: 8 },
  'Fire Protection': { min_crew: 2, typical_crew: 4 },
  'General': { min_crew: 2, typical_crew: 4 },
}

// Equipment keywords for detection
const EQUIPMENT_KEYWORDS: Record<string, string[]> = {
  'Crane': ['crane', 'tower crane', 'mobile crane'],
  'Boom Lift': ['boom lift', 'man lift', 'jlg', 'genie'],
  'Scissor Lift': ['scissor lift', 'scissor'],
  'Forklift': ['forklift', 'telehandler', 'lull', 'reach'],
  'Excavator': ['excavator', 'backhoe', 'digger'],
  'Concrete Pump': ['concrete pump', 'pump truck'],
  'Scaffold': ['scaffold', 'scaffolding'],
}

function extractTrade(activityName: string): string {
  const lowerName = activityName.toLowerCase()
  const tradePatterns: Array<[RegExp, string]> = [
    [/electrical|electric/i, 'Electrical'],
    [/plumbing|plumb/i, 'Plumbing'],
    [/hvac|mechanical|duct/i, 'HVAC'],
    [/concrete|pour|slab/i, 'Concrete'],
    [/framing|stud/i, 'Framing'],
    [/drywall|sheetrock/i, 'Drywall'],
    [/painting|paint/i, 'Painting'],
    [/roofing|roof/i, 'Roofing'],
    [/steel|iron/i, 'Steel'],
    [/fire|sprinkler/i, 'Fire Protection'],
  ]

  for (const [pattern, trade] of tradePatterns) {
    if (pattern.test(lowerName)) return trade
  }
  return 'General'
}

function detectEquipmentNeeded(activityName: string): string[] {
  const lowerName = activityName.toLowerCase()
  const equipment: string[] = []

  for (const [equipType, keywords] of Object.entries(EQUIPMENT_KEYWORDS)) {
    if (keywords.some(kw => lowerName.includes(kw))) {
      equipment.push(equipType)
    }
  }

  // Infer equipment from activity type
  if (lowerName.includes('steel') || lowerName.includes('erection')) {
    equipment.push('Crane')
  }
  if (lowerName.includes('elevated') || lowerName.includes('high')) {
    equipment.push('Boom Lift')
  }
  if (lowerName.includes('ceiling') || lowerName.includes('overhead')) {
    equipment.push('Scissor Lift')
  }

  return Array.from(new Set(equipment))
}

function generateConflictId(): string {
  return `conflict-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

export const detectResourceConflictsTool = createTool<DetectResourceConflictsInput, DetectResourceConflictsOutput>({
  name: 'detect_resource_conflicts',
  displayName: 'Detect Resource Conflicts',
  description: 'Detects labor, equipment, space, and material conflicts across scheduled activities. Provides resolution options with feasibility ratings and impact assessments.',
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
      resource_types: {
        type: 'array',
        items: {
          type: 'string',
          enum: ['labor', 'equipment', 'space', 'material']
        },
        description: 'Types of resources to check (default: all)'
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
      resource_types = ['labor', 'equipment', 'space', 'material']
    } = input

    const today = new Date()
    const endDate = new Date(today)
    endDate.setDate(endDate.getDate() + look_ahead_days)

    // Get scheduled activities
    const { data: activities } = await supabase
      .from('schedule_activities')
      .select(`
        id,
        activity_id,
        name,
        planned_start,
        planned_finish,
        status,
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

    const conflicts: ResourceConflict[] = []
    const resourceUtilization: ResourceUtilization[] = []

    // Group activities by date
    const activitiesByDate = new Map<string, typeof activities>()

    for (const activity of activities || []) {
      const start = new Date(activity.planned_start)
      const end = new Date(activity.planned_finish)

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateKey = d.toISOString().split('T')[0]
        if (!activitiesByDate.has(dateKey)) {
          activitiesByDate.set(dateKey, [])
        }
        activitiesByDate.get(dateKey)!.push(activity)
      }
    }

    // Check for labor conflicts
    if (resource_types.includes('labor')) {
      const laborByTradeByDate = new Map<string, Map<string, any[]>>()

      for (const [date, dayActivities] of Array.from(activitiesByDate.entries())) {
        if (!laborByTradeByDate.has(date)) {
          laborByTradeByDate.set(date, new Map())
        }

        for (const activity of dayActivities || []) {
          const trade = activity.subcontractors?.trade || extractTrade(activity.name)
          const tradeMap = laborByTradeByDate.get(date)!

          if (!tradeMap.has(trade)) {
            tradeMap.set(trade, [])
          }
          tradeMap.get(trade)!.push(activity)
        }
      }

      // Detect conflicts (multiple activities same trade, limited crew)
      for (const [date, tradeMap] of Array.from(laborByTradeByDate.entries())) {
        for (const [trade, tradeActivities] of Array.from(tradeMap.entries())) {
          const requirement = TRADE_RESOURCE_REQUIREMENTS[trade] || TRADE_RESOURCE_REQUIREMENTS['General']

          if (tradeActivities.length > 1) {
            const totalCrewNeeded = tradeActivities.length * requirement.typical_crew
            const typicalAvailable = requirement.typical_crew * 1.5 // Assume 50% buffer

            if (totalCrewNeeded > typicalAvailable) {
              conflicts.push({
                conflict_id: generateConflictId(),
                conflict_type: 'labor',
                date,
                description: `${trade} trade overbooked: ${tradeActivities.length} activities require ~${totalCrewNeeded} workers`,
                severity: tradeActivities.length > 3 ? 'high' : 'medium',
                activities_affected: tradeActivities.map(a => ({
                  activity_id: a.activity_id || a.id,
                  activity_name: a.name,
                  resource_requirement: `${requirement.typical_crew} ${trade} workers`
                })),
                resolution_options: [
                  {
                    option: 'Request additional crew from subcontractor',
                    feasibility: 'moderate',
                    cost_impact: 'Potential overtime premium',
                    schedule_impact: 'None if crew available'
                  },
                  {
                    option: 'Stagger activity start times',
                    feasibility: 'easy',
                    cost_impact: 'None',
                    schedule_impact: 'Minor - activities may shift'
                  },
                  {
                    option: 'Resequence non-critical activities',
                    feasibility: 'moderate',
                    cost_impact: 'None',
                    schedule_impact: 'May affect float'
                  }
                ]
              })
            }
          }
        }
      }
    }

    // Check for equipment conflicts
    if (resource_types.includes('equipment')) {
      const equipmentByDate = new Map<string, Map<string, any[]>>()

      for (const [date, dayActivities] of Array.from(activitiesByDate.entries())) {
        if (!equipmentByDate.has(date)) {
          equipmentByDate.set(date, new Map())
        }

        for (const activity of dayActivities || []) {
          const equipment = detectEquipmentNeeded(activity.name)

          for (const equip of equipment) {
            const equipMap = equipmentByDate.get(date)!
            if (!equipMap.has(equip)) {
              equipMap.set(equip, [])
            }
            equipMap.get(equip)!.push(activity)
          }
        }
      }

      // Detect equipment conflicts
      for (const [date, equipMap] of Array.from(equipmentByDate.entries())) {
        for (const [equipment, equipActivities] of Array.from(equipMap.entries())) {
          if (equipActivities.length > 1) {
            // Assume only 1 of each major equipment available
            conflicts.push({
              conflict_id: generateConflictId(),
              conflict_type: 'equipment',
              date,
              description: `${equipment} required by ${equipActivities.length} activities simultaneously`,
              severity: equipment === 'Crane' ? 'high' : 'medium',
              activities_affected: equipActivities.map(a => ({
                activity_id: a.activity_id || a.id,
                activity_name: a.name,
                resource_requirement: equipment
              })),
              resolution_options: [
                {
                  option: 'Schedule equipment rotation',
                  feasibility: 'easy',
                  cost_impact: 'None',
                  schedule_impact: 'Activities must be staggered'
                },
                {
                  option: 'Rent additional equipment',
                  feasibility: 'moderate',
                  cost_impact: 'Rental cost + operator',
                  schedule_impact: 'None'
                },
                {
                  option: 'Prioritize critical path activity',
                  feasibility: 'easy',
                  cost_impact: 'None',
                  schedule_impact: 'Other activities delayed'
                }
              ]
            })
          }
        }
      }
    }

    // Check for space conflicts (activities in same area)
    if (resource_types.includes('space')) {
      // This would require location data which we'll approximate
      for (const [date, dayActivities] of Array.from(activitiesByDate.entries())) {
        if ((dayActivities?.length || 0) > 5) {
          // High activity density - potential space conflict
          conflicts.push({
            conflict_id: generateConflictId(),
            conflict_type: 'space',
            date,
            description: `${dayActivities?.length} activities scheduled - potential workspace congestion`,
            severity: (dayActivities?.length || 0) > 8 ? 'high' : 'low',
            activities_affected: (dayActivities || []).slice(0, 5).map(a => ({
              activity_id: a.activity_id || a.id,
              activity_name: a.name,
              resource_requirement: 'Workspace access'
            })),
            resolution_options: [
              {
                option: 'Coordinate work zones with foremen',
                feasibility: 'easy',
                cost_impact: 'None',
                schedule_impact: 'None'
              },
              {
                option: 'Stagger start times by area',
                feasibility: 'easy',
                cost_impact: 'None',
                schedule_impact: 'Minor'
              },
              {
                option: 'Add temporary barriers for separation',
                feasibility: 'moderate',
                cost_impact: 'Material cost',
                schedule_impact: 'None'
              }
            ]
          })
        }
      }
    }

    // Build resource utilization data
    const tradeUtilization: Record<string, { allocated: number; days: string[] }> = {}

    for (const [date, dayActivities] of Array.from(activitiesByDate.entries())) {
      for (const activity of dayActivities || []) {
        const trade = activity.subcontractors?.trade || extractTrade(activity.name)

        if (!tradeUtilization[trade]) {
          tradeUtilization[trade] = { allocated: 0, days: [] }
        }
        tradeUtilization[trade].allocated += TRADE_RESOURCE_REQUIREMENTS[trade]?.typical_crew || 4
        tradeUtilization[trade].days.push(date)
      }
    }

    for (const [trade, data] of Object.entries(tradeUtilization)) {
      const uniqueDays = Array.from(new Set(data.days))
      const avgAllocation = data.allocated / uniqueDays.length

      resourceUtilization.push({
        resource_type: 'labor',
        resource_name: trade,
        utilization_by_day: uniqueDays.slice(0, 7).map(date => ({
          date,
          allocated: Math.round(avgAllocation),
          available: TRADE_RESOURCE_REQUIREMENTS[trade]?.typical_crew * 2 || 8,
          utilization_percent: Math.round((avgAllocation / ((TRADE_RESOURCE_REQUIREMENTS[trade]?.typical_crew || 4) * 2)) * 100)
        }))
      })
    }

    // Generate recommendations
    const recommendations: string[] = []
    const criticalConflicts = conflicts.filter(c => c.severity === 'high')

    if (criticalConflicts.length > 0) {
      recommendations.push(`Address ${criticalConflicts.length} high-severity conflict(s) immediately`)
    }

    const laborConflicts = conflicts.filter(c => c.conflict_type === 'labor')
    if (laborConflicts.length > 0) {
      recommendations.push('Coordinate with subcontractors on crew availability for peak days')
    }

    const equipmentConflicts = conflicts.filter(c => c.conflict_type === 'equipment')
    if (equipmentConflicts.length > 0) {
      recommendations.push('Create equipment rotation schedule to optimize utilization')
    }

    if (conflicts.length === 0) {
      recommendations.push('No resource conflicts detected in the look-ahead period')
    }

    return {
      success: true,
      data: {
        conflicts,
        resource_utilization: resourceUtilization.slice(0, 10),
        recommendations,
        summary: {
          total_conflicts: conflicts.length,
          critical_conflicts: criticalConflicts.length,
          resolution_actions_needed: conflicts.reduce((sum, c) => sum + (c.severity === 'high' ? 1 : 0), 0)
        }
      },
      metadata: {
        executionTimeMs: 0
      }
    }
  },

  formatOutput(output) {
    const { conflicts, summary, recommendations } = output

    return {
      title: 'Resource Conflict Analysis',
      summary: `${summary.total_conflicts} conflicts found, ${summary.critical_conflicts} critical`,
      icon: summary.critical_conflicts > 0 ? 'alert-triangle' : 'check-circle',
      status: summary.critical_conflicts > 0 ? 'warning' : 'success',
      details: [
        { label: 'Total Conflicts', value: summary.total_conflicts, type: 'text' },
        { label: 'Critical', value: summary.critical_conflicts, type: 'badge' },
        { label: 'Labor Conflicts', value: conflicts.filter(c => c.conflict_type === 'labor').length, type: 'text' },
        { label: 'Equipment Conflicts', value: conflicts.filter(c => c.conflict_type === 'equipment').length, type: 'text' },
        { label: 'Actions Needed', value: summary.resolution_actions_needed, type: 'text' },
      ],
      expandedContent: output as unknown as Record<string, unknown>
    }
  }
})
