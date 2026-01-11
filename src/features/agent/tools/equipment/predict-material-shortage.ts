/**
 * Predict Material Shortage Tool
 * Predicts material shortages by comparing scheduled work vs material on hand,
 * tracking lead times, identifying potential stockouts, and recommending reorder points
 */

import { createTool } from '../registry'
import { supabase } from '@/lib/supabase'

interface PredictMaterialShortageInput {
  project_id: string
  look_ahead_weeks?: number
}

interface ScheduledMaterialNeed {
  activity_id: string
  activity_name: string
  scheduled_start: string
  scheduled_end: string
  material_id: string
  material_name: string
  quantity_needed: number
  unit: string
  priority: 'critical' | 'high' | 'medium' | 'low'
}

interface MaterialInventory {
  material_id: string
  material_name: string
  quantity_on_hand: number
  quantity_reserved: number
  quantity_available: number
  quantity_on_order: number
  unit: string
  unit_cost: number | null
  supplier: string | null
  lead_time_days: number
  reorder_point: number | null
  last_restock_date: string | null
}

interface ShortageRisk {
  material_id: string
  material_name: string
  quantity_needed: number
  quantity_available: number
  shortage_amount: number
  risk_level: 'critical' | 'high' | 'medium' | 'low'
  first_impact_date: string
  affected_activities: string[]
  estimated_delay_days: number
  supplier: string | null
  lead_time_days: number
  order_deadline: string
}

interface ReorderRecommendation {
  material_id: string
  material_name: string
  current_quantity: number
  recommended_order_quantity: number
  reorder_point: number
  unit: string
  supplier: string | null
  estimated_cost: number | null
  lead_time_days: number
  urgency: 'immediate' | 'this_week' | 'next_week' | 'standard'
  reason: string
}

interface LeadTimeAnalysis {
  supplier: string
  material_category: string
  average_lead_time_days: number
  min_lead_time_days: number
  max_lead_time_days: number
  reliability_score: number
  recent_trend: 'improving' | 'stable' | 'worsening'
  notes: string | null
}

interface CriticalItem {
  material_id: string
  material_name: string
  reason: string
  days_until_stockout: number | null
  action_required: string
  contact_info: string | null
}

interface PredictMaterialShortageOutput {
  shortage_risks: ShortageRisk[]
  reorder_recommendations: ReorderRecommendation[]
  critical_items: CriticalItem[]
  lead_time_analysis: LeadTimeAnalysis[]
  summary: {
    total_materials_tracked: number
    materials_at_risk: number
    critical_shortages: number
    high_risk_shortages: number
    total_shortage_value: number
    activities_at_risk: number
    estimated_delay_days: number
  }
  upcoming_needs: Array<{
    week: string
    week_start: string
    week_end: string
    materials_needed: number
    materials_covered: number
    materials_at_risk: number
    top_needs: Array<{
      material_name: string
      quantity_needed: number
      quantity_available: number
      status: 'covered' | 'partial' | 'shortage'
    }>
  }>
  recommendations: string[]
}

export const predictMaterialShortageTool = createTool<PredictMaterialShortageInput, PredictMaterialShortageOutput>({
  name: 'predict_material_shortage',
  displayName: 'Predict Material Shortage',
  description: 'Predicts material shortages by comparing scheduled work vs material on hand, tracking lead times for materials, identifying potential stockouts, and recommending reorder points. Use when planning procurement or checking material availability.',
  category: 'action',
  parameters: {
    type: 'object',
    properties: {
      project_id: {
        type: 'string',
        description: 'The project ID to analyze'
      },
      look_ahead_weeks: {
        type: 'number',
        description: 'Number of weeks to look ahead for material needs (default: 4)'
      }
    },
    required: ['project_id']
  },
  requiresConfirmation: false,
  estimatedTokens: 900,

  async execute(input, context) {
    const {
      project_id,
      look_ahead_weeks = 4
    } = input

    const startTime = Date.now()

    // Get project data
    const { data: project } = await supabase
      .from('projects')
      .select('*')
      .eq('id', project_id)
      .single()

    if (!project) {
      return {
        success: false,
        error: 'Project not found',
        errorCode: 'PROJECT_NOT_FOUND'
      }
    }

    const now = new Date()
    const lookAheadEnd = new Date(now)
    lookAheadEnd.setDate(lookAheadEnd.getDate() + (look_ahead_weeks * 7))

    // Get schedule activities with material requirements
    const { data: activities } = await supabase
      .from('schedule_activities')
      .select('*')
      .eq('project_id', project_id)
      .is('deleted_at', null)
      .gte('planned_start', now.toISOString())
      .lte('planned_start', lookAheadEnd.toISOString())
      .order('planned_start', { ascending: true })

    // Get material inventory
    const { data: inventory } = await supabase
      .from('material_inventory')
      .select(`
        *,
        supplier:suppliers(id, name, contact_name, contact_phone, contact_email, average_lead_time_days)
      `)
      .eq('project_id', project_id)
      .is('deleted_at', null)

    // Get material requirements/BOM
    const { data: materialRequirements } = await supabase
      .from('material_requirements')
      .select('*')
      .eq('project_id', project_id)
      .is('deleted_at', null)

    // Get pending material orders
    const { data: pendingOrders } = await supabase
      .from('material_orders')
      .select('*')
      .eq('project_id', project_id)
      .in('status', ['pending', 'ordered', 'in_transit'])
      .is('deleted_at', null)

    // Get historical lead time data
    const { data: deliveryHistory } = await supabase
      .from('material_orders')
      .select('*')
      .eq('project_id', project_id)
      .eq('status', 'delivered')
      .is('deleted_at', null)
      .order('actual_delivery', { ascending: false })
      .limit(100)

    // Build inventory map
    const inventoryMap = new Map<string, MaterialInventory>()
    for (const item of inventory || []) {
      const quantityOnOrder = (pendingOrders || [])
        .filter(o => o.material_id === item.id || o.material_name === item.name)
        .reduce((sum, o) => sum + (o.quantity || 0), 0)

      inventoryMap.set(item.id, {
        material_id: item.id,
        material_name: item.name || item.material_name || 'Unknown Material',
        quantity_on_hand: item.quantity_on_hand || item.quantity || 0,
        quantity_reserved: item.quantity_reserved || 0,
        quantity_available: (item.quantity_on_hand || item.quantity || 0) - (item.quantity_reserved || 0),
        quantity_on_order: quantityOnOrder,
        unit: item.unit || 'EA',
        unit_cost: item.unit_cost || item.cost || null,
        supplier: item.supplier?.name || item.supplier_name || null,
        lead_time_days: item.supplier?.average_lead_time_days || item.lead_time_days || 14,
        reorder_point: item.reorder_point || null,
        last_restock_date: item.last_restock_date || null
      })
    }

    // Build scheduled material needs from activities
    const scheduledNeeds: ScheduledMaterialNeed[] = []
    for (const activity of activities || []) {
      // Get material requirements for this activity
      const activityMaterials = (materialRequirements || []).filter(
        req => req.activity_id === activity.id
      )

      for (const req of activityMaterials) {
        const priority = activity.is_critical_path ? 'critical' :
          activity.priority === 'high' ? 'high' :
          activity.priority === 'medium' ? 'medium' : 'low'

        scheduledNeeds.push({
          activity_id: activity.id,
          activity_name: activity.name || activity.title || 'Unnamed Activity',
          scheduled_start: activity.planned_start,
          scheduled_end: activity.planned_end,
          material_id: req.material_id,
          material_name: req.material_name || 'Unknown Material',
          quantity_needed: req.quantity || 0,
          unit: req.unit || 'EA',
          priority
        })
      }
    }

    // Aggregate needs by material
    const materialNeedsMap = new Map<string, {
      total_needed: number
      affected_activities: string[]
      first_need_date: string
      priority: 'critical' | 'high' | 'medium' | 'low'
    }>()

    for (const need of scheduledNeeds) {
      const key = need.material_id || need.material_name
      const existing = materialNeedsMap.get(key)

      if (existing) {
        existing.total_needed += need.quantity_needed
        if (!existing.affected_activities.includes(need.activity_name)) {
          existing.affected_activities.push(need.activity_name)
        }
        if (new Date(need.scheduled_start) < new Date(existing.first_need_date)) {
          existing.first_need_date = need.scheduled_start
        }
        // Escalate priority if any activity is higher
        if (need.priority === 'critical') existing.priority = 'critical'
        else if (need.priority === 'high' && existing.priority !== 'critical') existing.priority = 'high'
      } else {
        materialNeedsMap.set(key, {
          total_needed: need.quantity_needed,
          affected_activities: [need.activity_name],
          first_need_date: need.scheduled_start,
          priority: need.priority
        })
      }
    }

    // Identify shortage risks
    const shortageRisks: ShortageRisk[] = []
    for (const [materialKey, needs] of materialNeedsMap) {
      const inv = inventoryMap.get(materialKey)
      const quantityAvailable = inv ? inv.quantity_available + inv.quantity_on_order : 0
      const shortageAmount = needs.total_needed - quantityAvailable

      if (shortageAmount > 0) {
        const leadTimeDays = inv?.lead_time_days || 14
        const firstNeedDate = new Date(needs.first_need_date)
        const orderDeadline = new Date(firstNeedDate)
        orderDeadline.setDate(orderDeadline.getDate() - leadTimeDays)

        const daysUntilNeeded = Math.floor((firstNeedDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        const estimatedDelay = Math.max(0, leadTimeDays - daysUntilNeeded + 3) // Add 3 days buffer

        const riskLevel = needs.priority === 'critical' ? 'critical' :
          daysUntilNeeded <= 7 ? 'high' :
          daysUntilNeeded <= 14 ? 'medium' : 'low'

        shortageRisks.push({
          material_id: materialKey,
          material_name: inv?.material_name || materialKey,
          quantity_needed: needs.total_needed,
          quantity_available: quantityAvailable,
          shortage_amount: shortageAmount,
          risk_level: riskLevel,
          first_impact_date: needs.first_need_date,
          affected_activities: needs.affected_activities,
          estimated_delay_days: estimatedDelay,
          supplier: inv?.supplier || null,
          lead_time_days: leadTimeDays,
          order_deadline: orderDeadline.toISOString().split('T')[0]
        })
      }
    }

    // Sort by risk level
    const riskOrder = { critical: 0, high: 1, medium: 2, low: 3 }
    shortageRisks.sort((a, b) => riskOrder[a.risk_level] - riskOrder[b.risk_level])

    // Generate reorder recommendations
    const reorderRecommendations: ReorderRecommendation[] = []
    for (const inv of inventoryMap.values()) {
      const needs = materialNeedsMap.get(inv.material_id)
      const totalNeeded = needs?.total_needed || 0
      const effectiveReorderPoint = inv.reorder_point || Math.ceil(totalNeeded * 0.25)

      // Check if below reorder point or will be soon
      const projectedAvailable = inv.quantity_available + inv.quantity_on_order - totalNeeded
      const needsReorder = inv.quantity_available <= effectiveReorderPoint ||
        projectedAvailable < effectiveReorderPoint

      if (needsReorder) {
        const orderQuantity = Math.max(
          totalNeeded - inv.quantity_available - inv.quantity_on_order + effectiveReorderPoint,
          effectiveReorderPoint * 2 // Minimum order of 2x reorder point
        )

        let urgency: ReorderRecommendation['urgency'] = 'standard'
        let reason = 'Below reorder point'

        if (projectedAvailable < 0) {
          urgency = 'immediate'
          reason = 'Will run out of stock based on scheduled work'
        } else if (inv.quantity_available <= effectiveReorderPoint * 0.5) {
          urgency = 'this_week'
          reason = 'Stock critically low'
        } else if (inv.quantity_available <= effectiveReorderPoint) {
          urgency = 'next_week'
          reason = 'At or below reorder point'
        }

        reorderRecommendations.push({
          material_id: inv.material_id,
          material_name: inv.material_name,
          current_quantity: inv.quantity_available,
          recommended_order_quantity: Math.ceil(orderQuantity),
          reorder_point: effectiveReorderPoint,
          unit: inv.unit,
          supplier: inv.supplier,
          estimated_cost: inv.unit_cost ? Math.ceil(orderQuantity) * inv.unit_cost : null,
          lead_time_days: inv.lead_time_days,
          urgency,
          reason
        })
      }
    }

    // Sort by urgency
    const urgencyOrder = { immediate: 0, this_week: 1, next_week: 2, standard: 3 }
    reorderRecommendations.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency])

    // Identify critical items
    const criticalItems: CriticalItem[] = []
    for (const risk of shortageRisks.slice(0, 10)) {
      if (risk.risk_level === 'critical' || risk.risk_level === 'high') {
        const daysUntilStockout = Math.floor(
          (new Date(risk.first_impact_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        )

        const orderDeadlinePassed = new Date(risk.order_deadline) < now
        let actionRequired = `Order ${risk.shortage_amount} ${risk.material_name} immediately`
        if (orderDeadlinePassed) {
          actionRequired = `URGENT: Order deadline passed. Expedite order for ${risk.shortage_amount} units`
        }

        criticalItems.push({
          material_id: risk.material_id,
          material_name: risk.material_name,
          reason: `Shortage of ${risk.shortage_amount} units affecting ${risk.affected_activities.length} activities`,
          days_until_stockout: daysUntilStockout,
          action_required: actionRequired,
          contact_info: risk.supplier ? `Contact ${risk.supplier}` : null
        })
      }
    }

    // Analyze lead times by supplier
    const leadTimeBySupplier = new Map<string, {
      deliveries: number[]
      materials: Set<string>
    }>()

    for (const delivery of deliveryHistory || []) {
      if (delivery.expected_delivery && delivery.actual_delivery) {
        const supplierName = delivery.supplier_name || 'Unknown'
        if (!leadTimeBySupplier.has(supplierName)) {
          leadTimeBySupplier.set(supplierName, { deliveries: [], materials: new Set() })
        }

        const expected = new Date(delivery.expected_delivery)
        const actual = new Date(delivery.actual_delivery)
        const orderDate = delivery.order_date ? new Date(delivery.order_date) : expected
        const leadTime = Math.floor((actual.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24))

        if (leadTime > 0 && leadTime < 365) {
          leadTimeBySupplier.get(supplierName)!.deliveries.push(leadTime)
          leadTimeBySupplier.get(supplierName)!.materials.add(delivery.material_name || 'Unknown')
        }
      }
    }

    const leadTimeAnalysis: LeadTimeAnalysis[] = []
    for (const [supplier, data] of leadTimeBySupplier) {
      if (data.deliveries.length >= 2) {
        const sorted = [...data.deliveries].sort((a, b) => a - b)
        const avg = Math.round(data.deliveries.reduce((a, b) => a + b, 0) / data.deliveries.length)
        const min = sorted[0]
        const max = sorted[sorted.length - 1]

        // Calculate reliability (% within expected)
        const onTimeDeliveries = data.deliveries.filter(d => d <= avg * 1.1).length
        const reliability = Math.round((onTimeDeliveries / data.deliveries.length) * 100)

        // Analyze trend (compare first half to second half)
        const mid = Math.floor(data.deliveries.length / 2)
        const firstHalfAvg = data.deliveries.slice(0, mid).reduce((a, b) => a + b, 0) / mid
        const secondHalfAvg = data.deliveries.slice(mid).reduce((a, b) => a + b, 0) / (data.deliveries.length - mid)
        const trend = secondHalfAvg < firstHalfAvg * 0.9 ? 'improving' :
          secondHalfAvg > firstHalfAvg * 1.1 ? 'worsening' : 'stable'

        leadTimeAnalysis.push({
          supplier,
          material_category: Array.from(data.materials).slice(0, 3).join(', '),
          average_lead_time_days: avg,
          min_lead_time_days: min,
          max_lead_time_days: max,
          reliability_score: reliability,
          recent_trend: trend,
          notes: reliability < 70 ? 'Consider backup supplier' :
            trend === 'worsening' ? 'Monitor closely' : null
        })
      }
    }

    leadTimeAnalysis.sort((a, b) => b.reliability_score - a.reliability_score)

    // Generate weekly breakdown of upcoming needs
    const upcomingNeeds: PredictMaterialShortageOutput['upcoming_needs'] = []
    for (let week = 0; week < look_ahead_weeks; week++) {
      const weekStart = new Date(now)
      weekStart.setDate(weekStart.getDate() + (week * 7))
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 6)

      const weekNeeds = scheduledNeeds.filter(need => {
        const needDate = new Date(need.scheduled_start)
        return needDate >= weekStart && needDate <= weekEnd
      })

      const materialsByWeek = new Map<string, {
        material_name: string
        quantity_needed: number
        quantity_available: number
      }>()

      for (const need of weekNeeds) {
        const key = need.material_id || need.material_name
        const inv = inventoryMap.get(key)
        const existing = materialsByWeek.get(key)

        if (existing) {
          existing.quantity_needed += need.quantity_needed
        } else {
          materialsByWeek.set(key, {
            material_name: need.material_name,
            quantity_needed: need.quantity_needed,
            quantity_available: inv ? inv.quantity_available + inv.quantity_on_order : 0
          })
        }
      }

      const topNeeds = Array.from(materialsByWeek.values())
        .map(m => ({
          ...m,
          status: m.quantity_available >= m.quantity_needed ? 'covered' as const :
            m.quantity_available > 0 ? 'partial' as const : 'shortage' as const
        }))
        .sort((a, b) => {
          const statusOrder = { shortage: 0, partial: 1, covered: 2 }
          return statusOrder[a.status] - statusOrder[b.status]
        })
        .slice(0, 5)

      upcomingNeeds.push({
        week: `Week ${week + 1}`,
        week_start: weekStart.toISOString().split('T')[0],
        week_end: weekEnd.toISOString().split('T')[0],
        materials_needed: materialsByWeek.size,
        materials_covered: topNeeds.filter(m => m.status === 'covered').length,
        materials_at_risk: topNeeds.filter(m => m.status !== 'covered').length,
        top_needs: topNeeds
      })
    }

    // Calculate summary
    const criticalShortages = shortageRisks.filter(r => r.risk_level === 'critical').length
    const highRiskShortages = shortageRisks.filter(r => r.risk_level === 'high').length
    const totalShortageValue = shortageRisks.reduce((sum, risk) => {
      const inv = inventoryMap.get(risk.material_id)
      return sum + (inv?.unit_cost ? risk.shortage_amount * inv.unit_cost : 0)
    }, 0)

    const affectedActivitiesSet = new Set<string>()
    for (const risk of shortageRisks) {
      risk.affected_activities.forEach(a => affectedActivitiesSet.add(a))
    }

    const maxDelay = shortageRisks.length > 0
      ? Math.max(...shortageRisks.map(r => r.estimated_delay_days))
      : 0

    // Generate recommendations
    const recommendations = generateRecommendations(
      shortageRisks,
      reorderRecommendations,
      criticalItems,
      leadTimeAnalysis,
      inventoryMap.size
    )

    const output: PredictMaterialShortageOutput = {
      shortage_risks: shortageRisks.slice(0, 15),
      reorder_recommendations: reorderRecommendations.slice(0, 15),
      critical_items: criticalItems.slice(0, 10),
      lead_time_analysis: leadTimeAnalysis.slice(0, 10),
      summary: {
        total_materials_tracked: inventoryMap.size,
        materials_at_risk: shortageRisks.length,
        critical_shortages: criticalShortages,
        high_risk_shortages: highRiskShortages,
        total_shortage_value: Math.round(totalShortageValue),
        activities_at_risk: affectedActivitiesSet.size,
        estimated_delay_days: maxDelay
      },
      upcoming_needs: upcomingNeeds,
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
    const { summary, shortage_risks, critical_items, reorder_recommendations } = output

    const status = summary.critical_shortages > 0 ? 'error' :
      summary.high_risk_shortages > 0 ? 'warning' : 'success'

    const immediateOrders = reorder_recommendations.filter(r => r.urgency === 'immediate').length
    const shortageValue = formatCurrency(summary.total_shortage_value)

    return {
      title: 'Material Shortage Prediction',
      summary: `${summary.materials_at_risk} materials at risk, ${summary.critical_shortages} critical. Est. ${summary.estimated_delay_days} day delay.`,
      icon: 'package',
      status,
      details: [
        { label: 'Materials Tracked', value: summary.total_materials_tracked.toString(), type: 'text' },
        { label: 'Materials at Risk', value: summary.materials_at_risk.toString(), type: 'badge' },
        { label: 'Critical Shortages', value: summary.critical_shortages.toString(), type: 'badge' },
        { label: 'High Risk', value: summary.high_risk_shortages.toString(), type: 'badge' },
        { label: 'Shortage Value', value: shortageValue, type: 'text' },
        { label: 'Activities Affected', value: summary.activities_at_risk.toString(), type: 'text' },
        { label: 'Est. Delay', value: `${summary.estimated_delay_days} days`, type: 'text' },
        { label: 'Immediate Orders', value: immediateOrders.toString(), type: 'badge' }
      ],
      expandedContent: output as unknown as Record<string, unknown>
    }
  }
})

// ============================================================================
// Helper Functions
// ============================================================================

function generateRecommendations(
  shortageRisks: ShortageRisk[],
  reorderRecs: ReorderRecommendation[],
  criticalItems: CriticalItem[],
  leadTimeAnalysis: LeadTimeAnalysis[],
  totalMaterials: number
): string[] {
  const recommendations: string[] = []

  // Critical items
  if (criticalItems.length > 0) {
    recommendations.push(
      `URGENT: ${criticalItems.length} critical material shortage(s) require immediate action`
    )
  }

  // Immediate orders needed
  const immediateOrders = reorderRecs.filter(r => r.urgency === 'immediate')
  if (immediateOrders.length > 0) {
    const materials = immediateOrders.slice(0, 3).map(r => r.material_name).join(', ')
    recommendations.push(
      `Place immediate orders for: ${materials}${immediateOrders.length > 3 ? ` (+${immediateOrders.length - 3} more)` : ''}`
    )
  }

  // Order deadlines
  const passedDeadlines = shortageRisks.filter(r => new Date(r.order_deadline) < new Date())
  if (passedDeadlines.length > 0) {
    recommendations.push(
      `${passedDeadlines.length} material(s) past order deadline - expedite procurement`
    )
  }

  // Supplier reliability
  const unreliableSuppliers = leadTimeAnalysis.filter(l => l.reliability_score < 70)
  if (unreliableSuppliers.length > 0) {
    recommendations.push(
      `Consider backup suppliers for: ${unreliableSuppliers.map(s => s.supplier).join(', ')}`
    )
  }

  // Lead time trends
  const worseningSuppliers = leadTimeAnalysis.filter(l => l.recent_trend === 'worsening')
  if (worseningSuppliers.length > 0) {
    recommendations.push(
      `Monitor lead times for ${worseningSuppliers.map(s => s.supplier).join(', ')} - showing delays`
    )
  }

  // This week orders
  const thisWeekOrders = reorderRecs.filter(r => r.urgency === 'this_week')
  if (thisWeekOrders.length > 0) {
    recommendations.push(
      `Plan to order ${thisWeekOrders.length} material(s) this week to avoid shortages`
    )
  }

  // Reorder points
  const missingReorderPoints = reorderRecs.filter(r => r.reorder_point === 0).length
  if (missingReorderPoints > 5) {
    recommendations.push(
      'Set up reorder points for materials to enable proactive procurement'
    )
  }

  // Positive status
  if (shortageRisks.length === 0 && criticalItems.length === 0) {
    recommendations.push(
      'Material inventory is healthy - no immediate shortages predicted'
    )
  }

  // General best practices
  if (recommendations.length < 4) {
    recommendations.push('Review material requirements weekly against schedule updates')
    recommendations.push('Maintain safety stock for long-lead items')
  }

  return recommendations.slice(0, 8)
}

function formatCurrency(amount: number): string {
  const absAmount = Math.abs(amount)
  const formatted = absAmount >= 1000000
    ? `$${(absAmount / 1000000).toFixed(1)}M`
    : absAmount >= 1000
    ? `$${(absAmount / 1000).toFixed(0)}K`
    : `$${absAmount.toFixed(0)}`

  return amount < 0 ? `-${formatted}` : formatted
}
