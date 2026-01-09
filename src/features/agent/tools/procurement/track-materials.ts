/**
 * Material Tracking Tool
 * Tracks material orders, deliveries, alerts on late deliveries, and forecasts material needs
 */

import { createTool } from '../registry'
import { supabase } from '@/lib/supabase'
import type { AgentContext } from '../../types'

interface TrackMaterialsInput {
  project_id: string
  status_filter?: string[]
  supplier_filter?: string[]
  days_lookahead?: number
  include_completed?: boolean
}

interface MaterialOrder {
  id: string
  material_name: string
  description: string
  quantity: number
  unit: string
  supplier: string
  order_date: string
  expected_delivery: string
  actual_delivery: string | null
  status: 'pending' | 'ordered' | 'in_transit' | 'delivered' | 'partial' | 'delayed' | 'cancelled'
  days_until_delivery: number | null
  days_late: number | null
  cost: number | null
  po_number: string | null
  tracking_number: string | null
  location_needed: string | null
  activity_dependency: string | null
  notes: string | null
}

interface SupplierSummary {
  supplier: string
  total_orders: number
  delivered: number
  pending: number
  delayed: number
  on_time_rate: number
  average_lead_time_days: number
}

interface DeliveryAlert {
  id: string
  material_name: string
  supplier: string
  expected_delivery: string
  days_late: number
  impact: string
  recommended_action: string
  contact_info: string | null
}

interface MaterialForecast {
  period: string
  expected_deliveries: number
  materials: string[]
  storage_needed: boolean
  coordination_required: string[]
}

interface TrackMaterialsOutput {
  summary: {
    total_orders: number
    pending: number
    ordered: number
    in_transit: number
    delivered: number
    delayed: number
    total_value: number
    on_time_delivery_rate: number
  }
  orders: MaterialOrder[]
  by_supplier: SupplierSummary[]
  late_deliveries: DeliveryAlert[]
  upcoming_deliveries: Array<{
    date: string
    orders: MaterialOrder[]
    staging_requirements: string[]
  }>
  forecast: MaterialForecast[]
  critical_items: Array<{
    material_name: string
    reason: string
    impact_if_delayed: string
    contingency: string
  }>
  storage_status: {
    items_on_site: number
    items_awaiting_installation: number
    storage_concerns: string[]
  }
  recommendations: string[]
}

export const trackMaterialsTool = createTool<TrackMaterialsInput, TrackMaterialsOutput>({
  name: 'track_materials',
  description: 'Tracks material orders and deliveries across a project. Alerts on late deliveries, forecasts upcoming material needs, and identifies critical path materials.',
  category: 'procurement',
  parameters: {
    type: 'object',
    properties: {
      project_id: {
        type: 'string',
        description: 'The project ID to track materials for'
      },
      status_filter: {
        type: 'array',
        items: { type: 'string' },
        description: 'Filter by order status (pending, ordered, in_transit, delivered, delayed)'
      },
      supplier_filter: {
        type: 'array',
        items: { type: 'string' },
        description: 'Filter by specific suppliers'
      },
      days_lookahead: {
        type: 'number',
        description: 'Days to look ahead for forecasting (default: 30)'
      },
      include_completed: {
        type: 'boolean',
        description: 'Include completed/delivered orders (default: true)'
      }
    },
    required: ['project_id']
  },

  async execute(input: TrackMaterialsInput, context: AgentContext): Promise<TrackMaterialsOutput> {
    const {
      project_id,
      status_filter,
      supplier_filter,
      days_lookahead = 30,
      include_completed = true
    } = input

    // Get material orders
    let query = supabase
      .from('material_orders')
      .select(`
        *,
        supplier:suppliers(id, name, contact_name, contact_phone, contact_email)
      `)
      .eq('project_id', project_id)
      .is('deleted_at', null)

    if (status_filter && status_filter.length > 0) {
      query = query.in('status', status_filter)
    }

    if (!include_completed) {
      query = query.not('status', 'eq', 'delivered')
    }

    const { data: orders } = await query.order('expected_delivery', { ascending: true })

    // Get schedule activities to understand dependencies
    const { data: activities } = await supabase
      .from('schedule_activities')
      .select('*')
      .eq('project_id', project_id)
      .is('deleted_at', null)

    const now = new Date()
    const lookaheadDate = new Date(now)
    lookaheadDate.setDate(lookaheadDate.getDate() + days_lookahead)

    // Process orders
    const processedOrders: MaterialOrder[] = []
    const supplierMap = new Map<string, SupplierSummary>()
    const lateDeliveries: DeliveryAlert[] = []
    const upcomingByDate = new Map<string, MaterialOrder[]>()

    let totalPending = 0
    let totalOrdered = 0
    let totalInTransit = 0
    let totalDelivered = 0
    let totalDelayed = 0
    let totalValue = 0
    let onTimeCount = 0
    let deliveredCount = 0

    for (const order of orders || []) {
      const expectedDelivery = order.expected_delivery ? new Date(order.expected_delivery) : null
      const actualDelivery = order.actual_delivery ? new Date(order.actual_delivery) : null

      let daysUntilDelivery: number | null = null
      let daysLate: number | null = null
      let status: MaterialOrder['status'] = order.status || 'pending'

      if (expectedDelivery) {
        if (actualDelivery) {
          // Already delivered - check if it was on time
          const deliveryDiff = Math.floor((actualDelivery.getTime() - expectedDelivery.getTime()) / (1000 * 60 * 60 * 24))
          daysLate = deliveryDiff > 0 ? deliveryDiff : null
          deliveredCount++
          if (deliveryDiff <= 0) onTimeCount++
        } else if (expectedDelivery < now && status !== 'delivered') {
          // Past due
          daysLate = Math.floor((now.getTime() - expectedDelivery.getTime()) / (1000 * 60 * 60 * 24))
          status = 'delayed'
        } else {
          // Future delivery
          daysUntilDelivery = Math.floor((expectedDelivery.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        }
      }

      const supplierName = order.supplier?.name || order.supplier_name || 'Unknown Supplier'

      const materialOrder: MaterialOrder = {
        id: order.id,
        material_name: order.material_name || order.description || 'Unknown Material',
        description: order.description || '',
        quantity: order.quantity || 0,
        unit: order.unit || 'EA',
        supplier: supplierName,
        order_date: order.order_date || '',
        expected_delivery: order.expected_delivery || '',
        actual_delivery: order.actual_delivery || null,
        status,
        days_until_delivery: daysUntilDelivery,
        days_late: daysLate,
        cost: order.total_cost || order.cost || null,
        po_number: order.po_number || null,
        tracking_number: order.tracking_number || null,
        location_needed: order.location || order.delivery_location || null,
        activity_dependency: order.activity_id || order.dependency || null,
        notes: order.notes || null
      }

      processedOrders.push(materialOrder)

      // Count by status
      switch (status) {
        case 'pending':
          totalPending++
          break
        case 'ordered':
          totalOrdered++
          break
        case 'in_transit':
          totalInTransit++
          break
        case 'delivered':
          totalDelivered++
          break
        case 'delayed':
          totalDelayed++
          break
      }

      if (materialOrder.cost) {
        totalValue += materialOrder.cost
      }

      // Track by supplier
      if (!supplierMap.has(supplierName)) {
        supplierMap.set(supplierName, {
          supplier: supplierName,
          total_orders: 0,
          delivered: 0,
          pending: 0,
          delayed: 0,
          on_time_rate: 0,
          average_lead_time_days: 0
        })
      }

      const supplierSummary = supplierMap.get(supplierName)!
      supplierSummary.total_orders++
      if (status === 'delivered') supplierSummary.delivered++
      else if (status === 'delayed') supplierSummary.delayed++
      else supplierSummary.pending++

      // Add late deliveries to alerts
      if (daysLate && daysLate > 0 && status !== 'delivered') {
        const impact = determineDeliveryImpact(materialOrder, activities || [])
        lateDeliveries.push({
          id: order.id,
          material_name: materialOrder.material_name,
          supplier: supplierName,
          expected_delivery: materialOrder.expected_delivery,
          days_late: daysLate,
          impact,
          recommended_action: getRecommendedAction(daysLate, impact),
          contact_info: order.supplier?.contact_phone || order.supplier?.contact_email || null
        })
      }

      // Group upcoming deliveries by date
      if (daysUntilDelivery !== null && daysUntilDelivery >= 0 && daysUntilDelivery <= days_lookahead) {
        const dateKey = materialOrder.expected_delivery.split('T')[0]
        if (!upcomingByDate.has(dateKey)) {
          upcomingByDate.set(dateKey, [])
        }
        upcomingByDate.get(dateKey)!.push(materialOrder)
      }
    }

    // Filter by supplier if specified
    let filteredOrders = processedOrders
    if (supplier_filter && supplier_filter.length > 0) {
      filteredOrders = processedOrders.filter(o => supplier_filter.includes(o.supplier))
    }

    // Calculate supplier on-time rates
    for (const [, summary] of supplierMap) {
      if (summary.delivered > 0) {
        // This is a simplification - in production you'd track actual on-time delivery
        summary.on_time_rate = Math.round(((summary.delivered - summary.delayed) / summary.delivered) * 100)
      }
    }

    const bySupplier = Array.from(supplierMap.values())
      .sort((a, b) => b.total_orders - a.total_orders)

    // Sort late deliveries by days late
    lateDeliveries.sort((a, b) => b.days_late - a.days_late)

    // Format upcoming deliveries
    const upcomingDeliveries: Array<{
      date: string
      orders: MaterialOrder[]
      staging_requirements: string[]
    }> = []

    const sortedDates = Array.from(upcomingByDate.keys()).sort()
    for (const date of sortedDates.slice(0, 14)) { // Next 2 weeks
      const dateOrders = upcomingByDate.get(date)!
      upcomingDeliveries.push({
        date,
        orders: dateOrders,
        staging_requirements: getStagingRequirements(dateOrders)
      })
    }

    // Generate forecast
    const forecast = generateMaterialForecast(processedOrders, now, days_lookahead)

    // Identify critical items
    const criticalItems = identifyCriticalItems(processedOrders, activities || [])

    // Storage status
    const itemsOnSite = processedOrders.filter(o => o.status === 'delivered' && !o.actual_delivery).length
    const storageConcerns = getStorageConcerns(processedOrders)

    // On-time delivery rate
    const onTimeRate = deliveredCount > 0 ? Math.round((onTimeCount / deliveredCount) * 100) : 100

    // Generate recommendations
    const recommendations = generateProcurementRecommendations(
      lateDeliveries,
      bySupplier,
      criticalItems,
      onTimeRate,
      totalDelayed
    )

    return {
      summary: {
        total_orders: processedOrders.length,
        pending: totalPending,
        ordered: totalOrdered,
        in_transit: totalInTransit,
        delivered: totalDelivered,
        delayed: totalDelayed,
        total_value: totalValue,
        on_time_delivery_rate: onTimeRate
      },
      orders: filteredOrders.slice(0, 50),
      by_supplier: bySupplier,
      late_deliveries: lateDeliveries.slice(0, 10),
      upcoming_deliveries: upcomingDeliveries,
      forecast,
      critical_items: criticalItems,
      storage_status: {
        items_on_site: itemsOnSite,
        items_awaiting_installation: itemsOnSite, // Simplified
        storage_concerns: storageConcerns
      },
      recommendations
    }
  }
})

function determineDeliveryImpact(order: MaterialOrder, activities: any[]): string {
  // Check if this material is on a critical path activity
  if (order.activity_dependency) {
    const activity = activities.find(a => a.id === order.activity_dependency)
    if (activity?.is_critical_path) {
      return 'Critical - Delays critical path activity'
    }
    if (activity) {
      return `Impacts activity: ${activity.name || activity.title}`
    }
  }

  // Assess based on material type
  const materialLower = order.material_name.toLowerCase()
  if (/hvac|mechanical|electrical|structural|steel/i.test(materialLower)) {
    return 'High - Long-lead item affecting multiple trades'
  }
  if (/window|door|roofing|waterproofing/i.test(materialLower)) {
    return 'Medium - Building envelope item'
  }

  return 'Low - Standard material'
}

function getRecommendedAction(daysLate: number, impact: string): string {
  if (daysLate > 14 || impact.startsWith('Critical')) {
    return 'Escalate immediately - Contact supplier management and evaluate alternatives'
  } else if (daysLate > 7) {
    return 'Contact supplier for expedited shipping and updated ETA'
  } else if (daysLate > 3) {
    return 'Request tracking update and confirm revised delivery date'
  }
  return 'Monitor closely and follow up with supplier'
}

function getStagingRequirements(orders: MaterialOrder[]): string[] {
  const requirements: string[] = []

  const totalQuantity = orders.reduce((sum, o) => sum + o.quantity, 0)
  if (totalQuantity > 100) {
    requirements.push('Large quantity expected - ensure adequate staging area')
  }

  const heavyItems = orders.filter(o =>
    /steel|concrete|stone|equipment/i.test(o.material_name)
  )
  if (heavyItems.length > 0) {
    requirements.push('Heavy materials - coordinate crane/forklift availability')
  }

  const weatherSensitive = orders.filter(o =>
    /drywall|insulation|wood|flooring/i.test(o.material_name)
  )
  if (weatherSensitive.length > 0) {
    requirements.push('Weather-sensitive materials - ensure covered storage')
  }

  return requirements
}

function generateMaterialForecast(
  orders: MaterialOrder[],
  startDate: Date,
  daysAhead: number
): MaterialForecast[] {
  const forecast: MaterialForecast[] = []

  // Group into weekly periods
  const weeks = Math.ceil(daysAhead / 7)

  for (let week = 0; week < weeks; week++) {
    const periodStart = new Date(startDate)
    periodStart.setDate(periodStart.getDate() + (week * 7))
    const periodEnd = new Date(periodStart)
    periodEnd.setDate(periodEnd.getDate() + 7)

    const periodOrders = orders.filter(o => {
      if (!o.expected_delivery || o.status === 'delivered') return false
      const deliveryDate = new Date(o.expected_delivery)
      return deliveryDate >= periodStart && deliveryDate < periodEnd
    })

    if (periodOrders.length > 0) {
      const materials = periodOrders.map(o => o.material_name)
      const hasLargeDeliveries = periodOrders.some(o => o.quantity > 50)
      const coordinationNeeded = getCoordinationNeeds(periodOrders)

      forecast.push({
        period: `Week ${week + 1} (${periodStart.toISOString().split('T')[0]})`,
        expected_deliveries: periodOrders.length,
        materials: [...new Set(materials)].slice(0, 5),
        storage_needed: hasLargeDeliveries,
        coordination_required: coordinationNeeded
      })
    }
  }

  return forecast.slice(0, 4)
}

function getCoordinationNeeds(orders: MaterialOrder[]): string[] {
  const needs: string[] = []

  const locations = [...new Set(orders.map(o => o.location_needed).filter(Boolean))]
  if (locations.length > 1) {
    needs.push('Multiple delivery locations - coordinate staging')
  }

  const suppliers = [...new Set(orders.map(o => o.supplier))]
  if (suppliers.length > 2) {
    needs.push('Multiple supplier deliveries - stagger delivery times')
  }

  const heavyEquipment = orders.filter(o =>
    /equipment|unit|system/i.test(o.material_name)
  )
  if (heavyEquipment.length > 0) {
    needs.push('Equipment delivery - coordinate rigging/setting')
  }

  return needs
}

function identifyCriticalItems(
  orders: MaterialOrder[],
  activities: any[]
): Array<{
  material_name: string
  reason: string
  impact_if_delayed: string
  contingency: string
}> {
  const criticalItems: Array<{
    material_name: string
    reason: string
    impact_if_delayed: string
    contingency: string
  }> = []

  // Long lead items
  const longLeadKeywords = ['hvac', 'elevator', 'generator', 'switchgear', 'transformer', 'chiller', 'boiler', 'ahu']
  for (const order of orders) {
    const nameLower = order.material_name.toLowerCase()

    for (const keyword of longLeadKeywords) {
      if (nameLower.includes(keyword) && order.status !== 'delivered') {
        criticalItems.push({
          material_name: order.material_name,
          reason: 'Long-lead equipment',
          impact_if_delayed: 'May delay MEP rough-in and subsequent trades',
          contingency: 'Expedite shipping, consider temporary equipment if available'
        })
        break
      }
    }
  }

  // Delayed items
  for (const order of orders) {
    if (order.days_late && order.days_late > 7) {
      criticalItems.push({
        material_name: order.material_name,
        reason: `Currently ${order.days_late} days late`,
        impact_if_delayed: 'Immediate schedule impact',
        contingency: 'Source alternative supplier or substitute material'
      })
    }
  }

  // Items needed soon with no tracking
  const soonThreshold = 7
  for (const order of orders) {
    if (order.days_until_delivery !== null &&
        order.days_until_delivery <= soonThreshold &&
        !order.tracking_number &&
        order.status !== 'delivered') {
      criticalItems.push({
        material_name: order.material_name,
        reason: `Needed in ${order.days_until_delivery} days, no tracking info`,
        impact_if_delayed: 'Schedule risk if not received on time',
        contingency: 'Confirm shipment status with supplier immediately'
      })
    }
  }

  return criticalItems.slice(0, 10)
}

function getStorageConcerns(orders: MaterialOrder[]): string[] {
  const concerns: string[] = []

  const deliveredNotInstalled = orders.filter(o => o.status === 'delivered')
  if (deliveredNotInstalled.length > 20) {
    concerns.push('Large number of items on site - review installation schedule')
  }

  const weatherSensitive = deliveredNotInstalled.filter(o =>
    /wood|drywall|insulation|flooring|carpet/i.test(o.material_name)
  )
  if (weatherSensitive.length > 0) {
    concerns.push('Weather-sensitive materials on site - verify protection')
  }

  const highValue = deliveredNotInstalled.filter(o => (o.cost || 0) > 10000)
  if (highValue.length > 0) {
    concerns.push('High-value items on site - verify security measures')
  }

  return concerns
}

function generateProcurementRecommendations(
  lateDeliveries: DeliveryAlert[],
  bySupplier: SupplierSummary[],
  criticalItems: Array<{ material_name: string; reason: string; impact_if_delayed: string; contingency: string }>,
  onTimeRate: number,
  totalDelayed: number
): string[] {
  const recommendations: string[] = []

  // Urgent late deliveries
  if (lateDeliveries.length > 0) {
    const criticalLate = lateDeliveries.filter(d => d.impact.startsWith('Critical'))
    if (criticalLate.length > 0) {
      recommendations.push(`URGENT: ${criticalLate.length} critical materials are late - escalate with suppliers immediately`)
    } else {
      recommendations.push(`${lateDeliveries.length} materials are past due - follow up with suppliers`)
    }
  }

  // Poor performing suppliers
  const poorSuppliers = bySupplier.filter(s => s.on_time_rate < 70 && s.total_orders >= 3)
  if (poorSuppliers.length > 0) {
    recommendations.push(`Supplier performance concern: ${poorSuppliers.map(s => s.supplier).join(', ')} - schedule vendor meetings`)
  }

  // Critical items
  if (criticalItems.length > 3) {
    recommendations.push(`${criticalItems.length} critical material items require attention - review procurement log daily`)
  }

  // Overall on-time rate
  if (onTimeRate < 80) {
    recommendations.push('On-time delivery rate below 80% - review procurement processes and lead times')
  }

  // General recommendations
  if (totalDelayed === 0 && onTimeRate >= 90) {
    recommendations.push('Procurement performance is strong - maintain current supplier relationships')
  }

  recommendations.push('Update material delivery log weekly and communicate changes to field team')

  return recommendations.slice(0, 6)
}
