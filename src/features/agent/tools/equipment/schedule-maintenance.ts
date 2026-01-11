/**
 * Schedule Maintenance Tool
 * Schedules equipment maintenance by tracking maintenance schedules,
 * calculating next service dates based on hours/mileage,
 * generating maintenance reminders, and estimating maintenance costs
 */

import { createTool } from '../registry'
import { supabase } from '@/lib/supabase'

// ============================================================================
// Input/Output Types
// ============================================================================

interface ScheduleMaintenanceInput {
  project_id: string
  equipment_id?: string
}

interface MaintenanceScheduleItem {
  id: string
  equipment_id: string
  equipment_name: string
  equipment_type: string
  maintenance_type: string
  description: string
  frequency: string
  frequency_hours: number | null
  frequency_miles: number | null
  frequency_days: number | null
  last_service_date: string | null
  last_service_hours: number | null
  last_service_miles: number | null
  next_service_date: string | null
  next_service_hours: number | null
  next_service_miles: number | null
  status: 'current' | 'due_soon' | 'overdue' | 'unknown'
  estimated_cost: number | null
  service_provider: string | null
  notes: string | null
}

interface UpcomingMaintenance {
  id: string
  equipment_name: string
  equipment_type: string
  maintenance_type: string
  due_date: string | null
  due_hours: number | null
  due_miles: number | null
  days_until_due: number | null
  hours_until_due: number | null
  miles_until_due: number | null
  urgency: 'critical' | 'high' | 'medium' | 'low'
  estimated_cost: number | null
  recommended_action: string
}

interface OverdueItem {
  id: string
  equipment_name: string
  equipment_type: string
  maintenance_type: string
  overdue_by_days: number | null
  overdue_by_hours: number | null
  overdue_by_miles: number | null
  last_service_date: string | null
  estimated_cost: number | null
  risk_level: 'critical' | 'high' | 'medium' | 'low'
  recommended_action: string
}

interface MaintenanceReminder {
  equipment_id: string
  equipment_name: string
  maintenance_type: string
  reminder_type: 'scheduled' | 'hours_based' | 'mileage_based'
  message: string
  due_date: string | null
  priority: 'critical' | 'high' | 'medium' | 'low'
}

interface CostEstimate {
  category: string
  item_count: number
  estimated_total: number
  upcoming_30_days: number
  upcoming_60_days: number
  upcoming_90_days: number
}

interface ScheduleMaintenanceOutput {
  summary: {
    total_equipment: number
    total_maintenance_items: number
    current: number
    due_soon: number
    overdue: number
    unknown_status: number
    total_estimated_cost_30_days: number
    total_estimated_cost_90_days: number
  }
  maintenance_schedule: MaintenanceScheduleItem[]
  upcoming_maintenance: UpcomingMaintenance[]
  overdue_items: OverdueItem[]
  reminders: MaintenanceReminder[]
  estimated_costs: CostEstimate[]
  by_equipment_type: Record<string, { total: number; current: number; due_soon: number; overdue: number }>
  recommendations: string[]
}

// ============================================================================
// Tool Definition
// ============================================================================

export const scheduleMaintenanceTool = createTool<ScheduleMaintenanceInput, ScheduleMaintenanceOutput>({
  name: 'schedule_maintenance',
  displayName: 'Schedule Equipment Maintenance',
  description: 'Schedules equipment maintenance by tracking maintenance schedules, calculating next service dates based on hours/mileage, generating maintenance reminders, and estimating maintenance costs for project equipment.',
  category: 'action',
  parameters: {
    type: 'object',
    properties: {
      project_id: {
        type: 'string',
        description: 'The project ID to track equipment maintenance for'
      },
      equipment_id: {
        type: 'string',
        description: 'Optional specific equipment ID to get maintenance details for'
      }
    },
    required: ['project_id']
  },
  requiresConfirmation: false,
  estimatedTokens: 800,

  async execute(input, context) {
    const { project_id, equipment_id } = input
    const startTime = Date.now()

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

    // Build equipment query
    let equipmentQuery = supabase
      .from('equipment')
      .select('*')
      .eq('project_id', project_id)
      .is('deleted_at', null)

    if (equipment_id) {
      equipmentQuery = equipmentQuery.eq('id', equipment_id)
    }

    const { data: equipment } = await equipmentQuery.order('name', { ascending: true })

    // Get maintenance records
    const equipmentIds = (equipment || []).map(e => e.id)

    let maintenanceRecords: any[] = []
    if (equipmentIds.length > 0) {
      const { data: records } = await supabase
        .from('equipment_maintenance')
        .select('*')
        .in('equipment_id', equipmentIds)
        .is('deleted_at', null)
        .order('scheduled_date', { ascending: true })

      maintenanceRecords = records || []
    }

    // Get maintenance history for each equipment
    let maintenanceHistory: any[] = []
    if (equipmentIds.length > 0) {
      const { data: history } = await supabase
        .from('equipment_maintenance_history')
        .select('*')
        .in('equipment_id', equipmentIds)
        .is('deleted_at', null)
        .order('service_date', { ascending: false })

      maintenanceHistory = history || []
    }

    const now = new Date()
    const thirtyDaysFromNow = new Date(now)
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)
    const sixtyDaysFromNow = new Date(now)
    sixtyDaysFromNow.setDate(sixtyDaysFromNow.getDate() + 60)
    const ninetyDaysFromNow = new Date(now)
    ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90)

    // Process maintenance schedules
    const maintenanceSchedule: MaintenanceScheduleItem[] = []
    const upcomingMaintenance: UpcomingMaintenance[] = []
    const overdueItems: OverdueItem[] = []
    const reminders: MaintenanceReminder[] = []
    const byEquipmentType: Record<string, { total: number; current: number; due_soon: number; overdue: number }> = {}

    let currentCount = 0
    let dueSoonCount = 0
    let overdueCount = 0
    let unknownCount = 0
    let totalCost30Days = 0
    let totalCost60Days = 0
    let totalCost90Days = 0

    const costByCategory: Record<string, CostEstimate> = {}

    for (const equip of equipment || []) {
      const equipType = equip.equipment_type || equip.type || 'General'

      if (!byEquipmentType[equipType]) {
        byEquipmentType[equipType] = { total: 0, current: 0, due_soon: 0, overdue: 0 }
      }
      byEquipmentType[equipType].total++

      // Get maintenance records for this equipment
      const equipMaintenance = maintenanceRecords.filter(m => m.equipment_id === equip.id)
      const equipHistory = maintenanceHistory.filter(h => h.equipment_id === equip.id)

      // If no maintenance records, create default based on equipment type
      const maintenanceItems = equipMaintenance.length > 0
        ? equipMaintenance
        : generateDefaultMaintenanceSchedule(equip)

      for (const maint of maintenanceItems) {
        // Find last service for this maintenance type
        const lastService = equipHistory.find(h =>
          h.maintenance_type === maint.maintenance_type ||
          h.service_type === maint.maintenance_type
        )

        // Calculate next service date/hours/miles
        const serviceCalculation = calculateNextService(
          maint,
          lastService,
          equip.current_hours || equip.hours_reading,
          equip.current_miles || equip.odometer_reading,
          now
        )

        // Determine status
        const { status, daysUntilDue, hoursUntilDue, milesUntilDue } = determineMaintenanceStatus(
          serviceCalculation,
          now
        )

        // Update counts
        if (status === 'current') {
          currentCount++
          byEquipmentType[equipType].current++
        } else if (status === 'due_soon') {
          dueSoonCount++
          byEquipmentType[equipType].due_soon++
        } else if (status === 'overdue') {
          overdueCount++
          byEquipmentType[equipType].overdue++
        } else {
          unknownCount++
        }

        const estimatedCost = maint.estimated_cost || maint.cost_estimate || getDefaultMaintenanceCost(maint.maintenance_type, equipType)

        // Track costs
        if (!costByCategory[equipType]) {
          costByCategory[equipType] = {
            category: equipType,
            item_count: 0,
            estimated_total: 0,
            upcoming_30_days: 0,
            upcoming_60_days: 0,
            upcoming_90_days: 0
          }
        }
        costByCategory[equipType].item_count++
        costByCategory[equipType].estimated_total += estimatedCost || 0

        // Calculate cost timelines
        if (daysUntilDue !== null) {
          if (daysUntilDue <= 30) {
            totalCost30Days += estimatedCost || 0
            costByCategory[equipType].upcoming_30_days += estimatedCost || 0
          }
          if (daysUntilDue <= 60) {
            totalCost60Days += estimatedCost || 0
            costByCategory[equipType].upcoming_60_days += estimatedCost || 0
          }
          if (daysUntilDue <= 90) {
            totalCost90Days += estimatedCost || 0
            costByCategory[equipType].upcoming_90_days += estimatedCost || 0
          }
        }

        // Create schedule item
        const scheduleItem: MaintenanceScheduleItem = {
          id: maint.id || `${equip.id}-${maint.maintenance_type}`,
          equipment_id: equip.id,
          equipment_name: equip.name || equip.equipment_name || 'Unknown Equipment',
          equipment_type: equipType,
          maintenance_type: maint.maintenance_type || maint.service_type || 'General Service',
          description: maint.description || getMaintenanceDescription(maint.maintenance_type),
          frequency: maint.frequency || getFrequencyDescription(maint),
          frequency_hours: maint.frequency_hours || maint.interval_hours || null,
          frequency_miles: maint.frequency_miles || maint.interval_miles || null,
          frequency_days: maint.frequency_days || maint.interval_days || null,
          last_service_date: lastService?.service_date || lastService?.completed_date || null,
          last_service_hours: lastService?.hours_at_service || lastService?.hour_reading || null,
          last_service_miles: lastService?.miles_at_service || lastService?.odometer_reading || null,
          next_service_date: serviceCalculation.nextServiceDate,
          next_service_hours: serviceCalculation.nextServiceHours,
          next_service_miles: serviceCalculation.nextServiceMiles,
          status,
          estimated_cost: estimatedCost,
          service_provider: maint.service_provider || maint.vendor || equip.preferred_vendor || null,
          notes: maint.notes || null
        }

        maintenanceSchedule.push(scheduleItem)

        // Add to upcoming maintenance if due within 90 days
        if (status === 'due_soon' || (daysUntilDue !== null && daysUntilDue <= 90 && daysUntilDue >= 0)) {
          const urgency = getMaintenanceUrgency(daysUntilDue, hoursUntilDue, milesUntilDue)
          upcomingMaintenance.push({
            id: scheduleItem.id,
            equipment_name: scheduleItem.equipment_name,
            equipment_type: scheduleItem.equipment_type,
            maintenance_type: scheduleItem.maintenance_type,
            due_date: scheduleItem.next_service_date,
            due_hours: scheduleItem.next_service_hours,
            due_miles: scheduleItem.next_service_miles,
            days_until_due: daysUntilDue,
            hours_until_due: hoursUntilDue,
            miles_until_due: milesUntilDue,
            urgency,
            estimated_cost: estimatedCost,
            recommended_action: getRecommendedMaintenanceAction(urgency, scheduleItem.maintenance_type)
          })
        }

        // Add to overdue items
        if (status === 'overdue') {
          const overdueItem: OverdueItem = {
            id: scheduleItem.id,
            equipment_name: scheduleItem.equipment_name,
            equipment_type: scheduleItem.equipment_type,
            maintenance_type: scheduleItem.maintenance_type,
            overdue_by_days: daysUntilDue !== null ? Math.abs(daysUntilDue) : null,
            overdue_by_hours: hoursUntilDue !== null && hoursUntilDue < 0 ? Math.abs(hoursUntilDue) : null,
            overdue_by_miles: milesUntilDue !== null && milesUntilDue < 0 ? Math.abs(milesUntilDue) : null,
            last_service_date: scheduleItem.last_service_date,
            estimated_cost: estimatedCost,
            risk_level: getOverdueRiskLevel(daysUntilDue, hoursUntilDue, milesUntilDue),
            recommended_action: getOverdueRecommendedAction(scheduleItem.maintenance_type, scheduleItem.equipment_type)
          }
          overdueItems.push(overdueItem)
        }

        // Generate reminders
        const reminder = generateMaintenanceReminder(scheduleItem, status, daysUntilDue, hoursUntilDue, milesUntilDue)
        if (reminder) {
          reminders.push(reminder)
        }
      }
    }

    // Sort results
    upcomingMaintenance.sort((a, b) => {
      if (a.days_until_due === null && b.days_until_due === null) {return 0}
      if (a.days_until_due === null) {return 1}
      if (b.days_until_due === null) {return -1}
      return a.days_until_due - b.days_until_due
    })

    overdueItems.sort((a, b) => {
      const aRisk = { critical: 0, high: 1, medium: 2, low: 3 }
      const bRisk = { critical: 0, high: 1, medium: 2, low: 3 }
      return aRisk[a.risk_level] - bRisk[b.risk_level]
    })

    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
    reminders.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])

    // Generate cost estimates array
    const estimatedCosts = Object.values(costByCategory)

    // Generate recommendations
    const recommendations = generateMaintenanceRecommendations(
      overdueCount,
      dueSoonCount,
      overdueItems,
      upcomingMaintenance,
      equipment?.length || 0
    )

    const output: ScheduleMaintenanceOutput = {
      summary: {
        total_equipment: equipment?.length || 0,
        total_maintenance_items: maintenanceSchedule.length,
        current: currentCount,
        due_soon: dueSoonCount,
        overdue: overdueCount,
        unknown_status: unknownCount,
        total_estimated_cost_30_days: Math.round(totalCost30Days),
        total_estimated_cost_90_days: Math.round(totalCost90Days)
      },
      maintenance_schedule: maintenanceSchedule,
      upcoming_maintenance: upcomingMaintenance.slice(0, 15),
      overdue_items: overdueItems.slice(0, 10),
      reminders: reminders.slice(0, 10),
      estimated_costs: estimatedCosts,
      by_equipment_type: byEquipmentType,
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
    const { summary, overdue_items, upcoming_maintenance } = output

    const status = summary.overdue > 0 ? 'error' :
      summary.due_soon > 0 ? 'warning' : 'success'

    return {
      title: 'Equipment Maintenance Schedule',
      summary: `${summary.total_equipment} equipment: ${summary.current} current, ${summary.due_soon} due soon, ${summary.overdue} overdue`,
      icon: 'wrench',
      status,
      details: [
        { label: 'Total Equipment', value: summary.total_equipment.toString(), type: 'text' },
        { label: 'Maintenance Items', value: summary.total_maintenance_items.toString(), type: 'text' },
        { label: 'Current', value: summary.current.toString(), type: 'badge' },
        { label: 'Due Soon', value: summary.due_soon.toString(), type: summary.due_soon > 0 ? 'badge' : 'text' },
        { label: 'Overdue', value: summary.overdue.toString(), type: summary.overdue > 0 ? 'badge' : 'text' },
        { label: 'Est. Cost (30 days)', value: `$${summary.total_estimated_cost_30_days.toLocaleString()}`, type: 'text' },
        { label: 'Est. Cost (90 days)', value: `$${summary.total_estimated_cost_90_days.toLocaleString()}`, type: 'text' },
        { label: 'Next Due', value: upcoming_maintenance.length > 0 ? `${upcoming_maintenance[0].equipment_name} - ${upcoming_maintenance[0].maintenance_type}` : 'None scheduled', type: 'text' }
      ],
      expandedContent: output as unknown as Record<string, unknown>
    }
  }
})

// ============================================================================
// Helper Functions
// ============================================================================

interface ServiceCalculation {
  nextServiceDate: string | null
  nextServiceHours: number | null
  nextServiceMiles: number | null
}

function calculateNextService(
  maintenance: any,
  lastService: any,
  currentHours: number | null,
  currentMiles: number | null,
  now: Date
): ServiceCalculation {
  const result: ServiceCalculation = {
    nextServiceDate: null,
    nextServiceHours: null,
    nextServiceMiles: null
  }

  // Calculate by days/date
  const frequencyDays = maintenance.frequency_days || maintenance.interval_days
  if (frequencyDays && lastService?.service_date) {
    const lastDate = new Date(lastService.service_date)
    const nextDate = new Date(lastDate)
    nextDate.setDate(nextDate.getDate() + frequencyDays)
    result.nextServiceDate = nextDate.toISOString().split('T')[0]
  } else if (frequencyDays) {
    // If no last service, assume starting from now
    const nextDate = new Date(now)
    nextDate.setDate(nextDate.getDate() + frequencyDays)
    result.nextServiceDate = nextDate.toISOString().split('T')[0]
  } else if (maintenance.scheduled_date) {
    result.nextServiceDate = maintenance.scheduled_date
  }

  // Calculate by hours
  const frequencyHours = maintenance.frequency_hours || maintenance.interval_hours
  if (frequencyHours) {
    const lastHours = lastService?.hours_at_service || lastService?.hour_reading || 0
    result.nextServiceHours = lastHours + frequencyHours
  }

  // Calculate by miles
  const frequencyMiles = maintenance.frequency_miles || maintenance.interval_miles
  if (frequencyMiles) {
    const lastMiles = lastService?.miles_at_service || lastService?.odometer_reading || 0
    result.nextServiceMiles = lastMiles + frequencyMiles
  }

  return result
}

function determineMaintenanceStatus(
  calculation: ServiceCalculation,
  now: Date
): { status: MaintenanceScheduleItem['status']; daysUntilDue: number | null; hoursUntilDue: number | null; milesUntilDue: number | null } {
  let status: MaintenanceScheduleItem['status'] = 'unknown'
  let daysUntilDue: number | null = null
  let hoursUntilDue: number | null = null
  let milesUntilDue: number | null = null

  // Check date-based status
  if (calculation.nextServiceDate) {
    const nextDate = new Date(calculation.nextServiceDate)
    const diffMs = nextDate.getTime() - now.getTime()
    daysUntilDue = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (daysUntilDue < 0) {
      status = 'overdue'
    } else if (daysUntilDue <= 14) {
      status = 'due_soon'
    } else {
      status = 'current'
    }
  }

  // Hours-based status would need current equipment hours
  if (calculation.nextServiceHours !== null) {
    hoursUntilDue = calculation.nextServiceHours // This should be compared with current hours
  }

  // Miles-based status would need current equipment miles
  if (calculation.nextServiceMiles !== null) {
    milesUntilDue = calculation.nextServiceMiles // This should be compared with current miles
  }

  return { status, daysUntilDue, hoursUntilDue, milesUntilDue }
}

function generateDefaultMaintenanceSchedule(equipment: any): any[] {
  const equipType = (equipment.equipment_type || equipment.type || '').toLowerCase()
  const defaultSchedules: any[] = []

  // Common maintenance items based on equipment type
  if (equipType.includes('excavator') || equipType.includes('loader') || equipType.includes('dozer')) {
    defaultSchedules.push(
      { maintenance_type: 'Engine Oil Change', frequency_hours: 250, estimated_cost: 350 },
      { maintenance_type: 'Hydraulic Filter', frequency_hours: 500, estimated_cost: 200 },
      { maintenance_type: 'Air Filter', frequency_hours: 250, estimated_cost: 100 },
      { maintenance_type: 'Track Inspection', frequency_hours: 500, estimated_cost: 500 },
      { maintenance_type: 'Greasing', frequency_hours: 50, estimated_cost: 50 }
    )
  } else if (equipType.includes('truck') || equipType.includes('vehicle')) {
    defaultSchedules.push(
      { maintenance_type: 'Engine Oil Change', frequency_miles: 5000, estimated_cost: 150 },
      { maintenance_type: 'Tire Rotation', frequency_miles: 7500, estimated_cost: 50 },
      { maintenance_type: 'Brake Inspection', frequency_miles: 15000, estimated_cost: 200 },
      { maintenance_type: 'Transmission Service', frequency_miles: 30000, estimated_cost: 400 }
    )
  } else if (equipType.includes('crane') || equipType.includes('lift')) {
    defaultSchedules.push(
      { maintenance_type: 'Wire Rope Inspection', frequency_days: 30, estimated_cost: 300 },
      { maintenance_type: 'Hydraulic System Check', frequency_days: 90, estimated_cost: 250 },
      { maintenance_type: 'Load Test', frequency_days: 365, estimated_cost: 1500 },
      { maintenance_type: 'Lubrication', frequency_days: 7, estimated_cost: 75 }
    )
  } else if (equipType.includes('generator') || equipType.includes('compressor')) {
    defaultSchedules.push(
      { maintenance_type: 'Oil Change', frequency_hours: 100, estimated_cost: 150 },
      { maintenance_type: 'Filter Replacement', frequency_hours: 200, estimated_cost: 100 },
      { maintenance_type: 'Belt Inspection', frequency_hours: 500, estimated_cost: 75 },
      { maintenance_type: 'Full Service', frequency_hours: 1000, estimated_cost: 500 }
    )
  } else {
    // Generic maintenance schedule
    defaultSchedules.push(
      { maintenance_type: 'General Inspection', frequency_days: 30, estimated_cost: 100 },
      { maintenance_type: 'Preventive Maintenance', frequency_days: 90, estimated_cost: 250 },
      { maintenance_type: 'Annual Service', frequency_days: 365, estimated_cost: 750 }
    )
  }

  return defaultSchedules
}

function getMaintenanceDescription(maintenanceType: string): string {
  const descriptions: Record<string, string> = {
    'Engine Oil Change': 'Replace engine oil and filter to maintain proper lubrication',
    'Hydraulic Filter': 'Replace hydraulic system filters to ensure clean fluid flow',
    'Air Filter': 'Replace air filter to maintain engine performance',
    'Track Inspection': 'Inspect track tension, wear, and alignment',
    'Greasing': 'Lubricate all grease points and pivot points',
    'Tire Rotation': 'Rotate tires to ensure even wear',
    'Brake Inspection': 'Inspect brake pads, rotors, and fluid levels',
    'Transmission Service': 'Service transmission fluid and filter',
    'Wire Rope Inspection': 'Inspect wire ropes for wear, damage, and proper reeving',
    'Hydraulic System Check': 'Check hydraulic fluid levels, hoses, and connections',
    'Load Test': 'Perform certified load test to verify capacity',
    'Lubrication': 'Apply lubrication to all moving parts and bearings',
    'Filter Replacement': 'Replace oil and air filters',
    'Belt Inspection': 'Inspect belts for wear and proper tension',
    'Full Service': 'Complete service including all filters, fluids, and inspection',
    'General Inspection': 'Visual inspection and operational check',
    'Preventive Maintenance': 'Scheduled preventive maintenance service',
    'Annual Service': 'Comprehensive annual maintenance service'
  }

  return descriptions[maintenanceType] || `Scheduled ${maintenanceType.toLowerCase()} service`
}

function getFrequencyDescription(maintenance: any): string {
  const parts: string[] = []

  if (maintenance.frequency_hours || maintenance.interval_hours) {
    parts.push(`Every ${maintenance.frequency_hours || maintenance.interval_hours} hours`)
  }
  if (maintenance.frequency_miles || maintenance.interval_miles) {
    parts.push(`Every ${(maintenance.frequency_miles || maintenance.interval_miles).toLocaleString()} miles`)
  }
  if (maintenance.frequency_days || maintenance.interval_days) {
    const days = maintenance.frequency_days || maintenance.interval_days
    if (days === 7) {parts.push('Weekly')}
    else if (days === 14) {parts.push('Bi-weekly')}
    else if (days === 30) {parts.push('Monthly')}
    else if (days === 90) {parts.push('Quarterly')}
    else if (days === 180) {parts.push('Semi-annually')}
    else if (days === 365) {parts.push('Annually')}
    else {parts.push(`Every ${days} days`)}
  }

  return parts.length > 0 ? parts.join(' or ') : 'As needed'
}

function getDefaultMaintenanceCost(maintenanceType: string, equipmentType: string): number {
  const baseCosts: Record<string, number> = {
    'Engine Oil Change': 200,
    'Hydraulic Filter': 150,
    'Air Filter': 75,
    'Track Inspection': 400,
    'Greasing': 50,
    'Tire Rotation': 50,
    'Brake Inspection': 150,
    'Transmission Service': 350,
    'Wire Rope Inspection': 250,
    'Hydraulic System Check': 200,
    'Load Test': 1200,
    'Lubrication': 75,
    'Filter Replacement': 100,
    'Belt Inspection': 75,
    'Full Service': 450,
    'General Inspection': 100,
    'Preventive Maintenance': 200,
    'Annual Service': 600
  }

  return baseCosts[maintenanceType] || 150
}

function getMaintenanceUrgency(
  daysUntilDue: number | null,
  hoursUntilDue: number | null,
  milesUntilDue: number | null
): 'critical' | 'high' | 'medium' | 'low' {
  if (daysUntilDue !== null) {
    if (daysUntilDue <= 0) {return 'critical'}
    if (daysUntilDue <= 7) {return 'high'}
    if (daysUntilDue <= 30) {return 'medium'}
    return 'low'
  }
  return 'medium'
}

function getRecommendedMaintenanceAction(urgency: string, maintenanceType: string): string {
  switch (urgency) {
    case 'critical':
      return `URGENT: Schedule ${maintenanceType} immediately to prevent equipment damage or failure`
    case 'high':
      return `Schedule ${maintenanceType} this week - maintenance is due soon`
    case 'medium':
      return `Plan for ${maintenanceType} within the next 2-4 weeks`
    case 'low':
      return `${maintenanceType} scheduled - monitor and plan accordingly`
    default:
      return `Review ${maintenanceType} requirements and schedule as needed`
  }
}

function getOverdueRiskLevel(
  daysOverdue: number | null,
  hoursOverdue: number | null,
  milesOverdue: number | null
): 'critical' | 'high' | 'medium' | 'low' {
  if (daysOverdue !== null) {
    const overdue = Math.abs(daysOverdue)
    if (overdue >= 30) {return 'critical'}
    if (overdue >= 14) {return 'high'}
    if (overdue >= 7) {return 'medium'}
    return 'low'
  }
  return 'medium'
}

function getOverdueRecommendedAction(maintenanceType: string, equipmentType: string): string {
  return `OVERDUE: Complete ${maintenanceType} for ${equipmentType} immediately. Continued operation may void warranty or cause equipment damage.`
}

function generateMaintenanceReminder(
  schedule: MaintenanceScheduleItem,
  status: string,
  daysUntilDue: number | null,
  hoursUntilDue: number | null,
  milesUntilDue: number | null
): MaintenanceReminder | null {
  if (status === 'current' && daysUntilDue !== null && daysUntilDue > 30) {
    return null // No reminder needed for items far in the future
  }

  let reminderType: MaintenanceReminder['reminder_type'] = 'scheduled'
  let message = ''
  let priority: MaintenanceReminder['priority'] = 'medium'

  if (status === 'overdue') {
    priority = 'critical'
    message = `OVERDUE: ${schedule.maintenance_type} for ${schedule.equipment_name} is overdue and requires immediate attention`
    if (daysUntilDue !== null) {
      message += ` (${Math.abs(daysUntilDue)} days overdue)`
    }
  } else if (status === 'due_soon') {
    priority = daysUntilDue !== null && daysUntilDue <= 7 ? 'high' : 'medium'
    message = `${schedule.maintenance_type} for ${schedule.equipment_name} is due soon`
    if (daysUntilDue !== null) {
      message += ` (in ${daysUntilDue} days)`
    }
  } else if (hoursUntilDue !== null && hoursUntilDue <= 50) {
    reminderType = 'hours_based'
    priority = hoursUntilDue <= 10 ? 'high' : 'medium'
    message = `${schedule.maintenance_type} for ${schedule.equipment_name} due in approximately ${hoursUntilDue} operating hours`
  } else if (milesUntilDue !== null && milesUntilDue <= 500) {
    reminderType = 'mileage_based'
    priority = milesUntilDue <= 100 ? 'high' : 'medium'
    message = `${schedule.maintenance_type} for ${schedule.equipment_name} due in approximately ${milesUntilDue} miles`
  } else {
    return null
  }

  return {
    equipment_id: schedule.equipment_id,
    equipment_name: schedule.equipment_name,
    maintenance_type: schedule.maintenance_type,
    reminder_type: reminderType,
    message,
    due_date: schedule.next_service_date,
    priority
  }
}

function generateMaintenanceRecommendations(
  overdueCount: number,
  dueSoonCount: number,
  overdueItems: OverdueItem[],
  upcomingMaintenance: UpcomingMaintenance[],
  totalEquipment: number
): string[] {
  const recommendations: string[] = []

  // Critical overdue items
  if (overdueCount > 0) {
    const criticalOverdue = overdueItems.filter(i => i.risk_level === 'critical')
    if (criticalOverdue.length > 0) {
      recommendations.push(
        `CRITICAL: ${criticalOverdue.length} maintenance item(s) severely overdue - schedule immediately to prevent equipment failure`
      )
    } else {
      recommendations.push(
        `${overdueCount} maintenance item(s) overdue - schedule service as soon as possible`
      )
    }
  }

  // Due soon items
  if (dueSoonCount > 3) {
    recommendations.push(
      `${dueSoonCount} maintenance items due soon - consider batch scheduling with service providers for efficiency`
    )
  } else if (dueSoonCount > 0) {
    recommendations.push(
      `${dueSoonCount} maintenance item(s) due within 14 days - plan service appointments`
    )
  }

  // Equipment-specific recommendations
  const uniqueOverdueEquipment = new Set(overdueItems.map(i => i.equipment_name))
  if (uniqueOverdueEquipment.size > 0) {
    recommendations.push(
      `${uniqueOverdueEquipment.size} piece(s) of equipment have overdue maintenance - prioritize based on usage and risk`
    )
  }

  // Cost planning
  const criticalUpcoming = upcomingMaintenance.filter(u => u.urgency === 'critical' || u.urgency === 'high')
  if (criticalUpcoming.length > 0) {
    const totalCost = criticalUpcoming.reduce((sum, u) => sum + (u.estimated_cost || 0), 0)
    if (totalCost > 0) {
      recommendations.push(
        `Estimated $${totalCost.toLocaleString()} in urgent/high priority maintenance costs - ensure budget allocation`
      )
    }
  }

  // General best practices
  if (recommendations.length < 3) {
    recommendations.push('Maintain detailed service records for all equipment maintenance')
    recommendations.push('Track operating hours and mileage regularly for accurate maintenance scheduling')
  }

  // Positive status
  if (overdueCount === 0 && dueSoonCount === 0) {
    recommendations.push('All equipment maintenance is current - continue regular monitoring')
  }

  recommendations.push('Consider preventive maintenance contracts for critical equipment to reduce downtime')

  return recommendations.slice(0, 6)
}
