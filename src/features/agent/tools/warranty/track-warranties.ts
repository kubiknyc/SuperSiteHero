/**
 * Warranty Tracker Tool
 * Tracks equipment and material warranties, alerts on expiring warranties
 */

import { createTool } from '../registry'
import { supabase } from '@/lib/supabase'
import type { AgentContext } from '../../types'

interface TrackWarrantiesInput {
  project_id: string
  include_expired?: boolean
  expiring_within_days?: number
  category_filter?: string[]
}

interface WarrantyItem {
  id: string
  item_name: string
  manufacturer: string
  category: string
  start_date: string
  end_date: string
  duration_years: number
  status: 'active' | 'expiring_soon' | 'expired' | 'pending'
  days_remaining: number | null
  coverage_type: string
  subcontractor: string | null
  document_id: string | null
  contact_info: {
    company: string | null
    phone: string | null
    email: string | null
  }
  notes: string | null
}

interface WarrantyCategory {
  category: string
  total: number
  active: number
  expiring_soon: number
  expired: number
  pending: number
}

interface ExpiringWarranty {
  id: string
  item_name: string
  category: string
  end_date: string
  days_remaining: number
  manufacturer: string
  action_required: string
}

interface TrackWarrantiesOutput {
  summary: {
    total_warranties: number
    active: number
    expiring_soon: number
    expired: number
    pending_documentation: number
    earliest_expiration: string | null
    next_expiration_item: string | null
  }
  warranties: WarrantyItem[]
  by_category: WarrantyCategory[]
  expiring_alerts: ExpiringWarranty[]
  expired_warranties: WarrantyItem[]
  pending_documentation: Array<{
    item_name: string
    category: string
    subcontractor: string | null
    days_since_substantial_completion: number
  }>
  warranty_value_summary: {
    total_items_under_warranty: number
    estimated_replacement_value: string
    categories_covered: string[]
  }
  recommendations: string[]
  report: string
}

export const trackWarrantiesTool = createTool<TrackWarrantiesInput, TrackWarrantiesOutput>({
  name: 'track_warranties',
  description: 'Tracks equipment and material warranties across a project. Alerts on expiring warranties, identifies missing warranty documentation, and generates warranty status reports.',
  category: 'warranty',
  parameters: {
    type: 'object',
    properties: {
      project_id: {
        type: 'string',
        description: 'The project ID to track warranties for'
      },
      include_expired: {
        type: 'boolean',
        description: 'Include expired warranties in results (default: true)'
      },
      expiring_within_days: {
        type: 'number',
        description: 'Alert threshold for expiring warranties in days (default: 90)'
      },
      category_filter: {
        type: 'array',
        items: { type: 'string' },
        description: 'Filter by categories (e.g., roofing, hvac, electrical)'
      }
    },
    required: ['project_id']
  },

  async execute(input: TrackWarrantiesInput, context: AgentContext): Promise<TrackWarrantiesOutput> {
    const {
      project_id,
      include_expired = true,
      expiring_within_days = 90,
      category_filter
    } = input

    // Get project info
    const { data: project } = await supabase
      .from('projects')
      .select('*, substantial_completion_date')
      .eq('id', project_id)
      .single()

    // Get warranties
    let query = supabase
      .from('warranties')
      .select(`
        *,
        subcontractor:subcontractors(id, company_name, contact_email, contact_phone)
      `)
      .eq('project_id', project_id)
      .is('deleted_at', null)

    if (category_filter && category_filter.length > 0) {
      query = query.in('category', category_filter)
    }

    const { data: warranties } = await query.order('end_date', { ascending: true })

    const now = new Date()
    const expiringThreshold = new Date(now)
    expiringThreshold.setDate(expiringThreshold.getDate() + expiring_within_days)

    // Process warranties
    const processedWarranties: WarrantyItem[] = []
    const expiringAlerts: ExpiringWarranty[] = []
    const expiredWarranties: WarrantyItem[] = []
    const pendingDocumentation: Array<{
      item_name: string
      category: string
      subcontractor: string | null
      days_since_substantial_completion: number
    }> = []

    const categoryMap = new Map<string, WarrantyCategory>()

    let earliestExpiration: string | null = null
    let nextExpirationItem: string | null = null
    let activeCount = 0
    let expiringSoonCount = 0
    let expiredCount = 0
    let pendingCount = 0

    for (const warranty of warranties || []) {
      const startDate = warranty.start_date ? new Date(warranty.start_date) : null
      const endDate = warranty.end_date ? new Date(warranty.end_date) : null

      let status: 'active' | 'expiring_soon' | 'expired' | 'pending' = 'pending'
      let daysRemaining: number | null = null

      if (!endDate || !startDate) {
        status = 'pending'
        pendingCount++
      } else if (endDate < now) {
        status = 'expired'
        expiredCount++
        daysRemaining = Math.floor((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      } else if (endDate <= expiringThreshold) {
        status = 'expiring_soon'
        expiringSoonCount++
        daysRemaining = Math.floor((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      } else {
        status = 'active'
        activeCount++
        daysRemaining = Math.floor((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      }

      // Track earliest expiration for active warranties
      if (status === 'active' || status === 'expiring_soon') {
        if (!earliestExpiration || (endDate && warranty.end_date < earliestExpiration)) {
          earliestExpiration = warranty.end_date
          nextExpirationItem = warranty.item_name || warranty.equipment_name || 'Unknown Item'
        }
      }

      // Calculate duration
      const durationYears = startDate && endDate
        ? Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 365) * 10) / 10
        : 0

      const category = warranty.category || 'General'

      const warrantyItem: WarrantyItem = {
        id: warranty.id,
        item_name: warranty.item_name || warranty.equipment_name || 'Unknown',
        manufacturer: warranty.manufacturer || 'Unknown',
        category,
        start_date: warranty.start_date || '',
        end_date: warranty.end_date || '',
        duration_years: durationYears,
        status,
        days_remaining: daysRemaining,
        coverage_type: warranty.coverage_type || 'Standard',
        subcontractor: warranty.subcontractor?.company_name || null,
        document_id: warranty.document_id || null,
        contact_info: {
          company: warranty.manufacturer_contact || warranty.subcontractor?.company_name || null,
          phone: warranty.manufacturer_phone || warranty.subcontractor?.contact_phone || null,
          email: warranty.manufacturer_email || warranty.subcontractor?.contact_email || null
        },
        notes: warranty.notes || null
      }

      // Track by category
      if (!categoryMap.has(category)) {
        categoryMap.set(category, {
          category,
          total: 0,
          active: 0,
          expiring_soon: 0,
          expired: 0,
          pending: 0
        })
      }

      const catSummary = categoryMap.get(category)!
      catSummary.total++
      if (status === 'active') {catSummary.active++}
      else if (status === 'expiring_soon') {catSummary.expiring_soon++}
      else if (status === 'expired') {catSummary.expired++}
      else {catSummary.pending++}

      // Add to appropriate lists
      if (status === 'expired') {
        if (include_expired) {
          expiredWarranties.push(warrantyItem)
        }
      } else if (status === 'expiring_soon') {
        expiringAlerts.push({
          id: warranty.id,
          item_name: warrantyItem.item_name,
          category: warrantyItem.category,
          end_date: warrantyItem.end_date,
          days_remaining: daysRemaining || 0,
          manufacturer: warrantyItem.manufacturer,
          action_required: getActionRequired(warrantyItem, daysRemaining || 0)
        })
      } else if (status === 'pending') {
        const daysSinceSubstantial = project?.substantial_completion_date
          ? Math.floor((now.getTime() - new Date(project.substantial_completion_date).getTime()) / (1000 * 60 * 60 * 24))
          : 0

        pendingDocumentation.push({
          item_name: warrantyItem.item_name,
          category: warrantyItem.category,
          subcontractor: warrantyItem.subcontractor,
          days_since_substantial_completion: daysSinceSubstantial
        })
      }

      if (include_expired || status !== 'expired') {
        processedWarranties.push(warrantyItem)
      }
    }

    // Sort expiring alerts by days remaining
    expiringAlerts.sort((a, b) => a.days_remaining - b.days_remaining)

    // Generate category array
    const byCategory = Array.from(categoryMap.values())

    // Calculate warranty value summary
    const categoriesCovered = byCategory.filter(c => c.active > 0).map(c => c.category)
    const activeItems = processedWarranties.filter(w => w.status === 'active' || w.status === 'expiring_soon').length

    // Generate recommendations
    const recommendations = generateWarrantyRecommendations(
      expiringAlerts,
      pendingDocumentation,
      expiredWarranties,
      byCategory
    )

    // Generate report
    const report = generateWarrantyReport(
      project?.name || 'Project',
      processedWarranties,
      expiringAlerts,
      byCategory
    )

    return {
      summary: {
        total_warranties: warranties?.length || 0,
        active: activeCount,
        expiring_soon: expiringSoonCount,
        expired: expiredCount,
        pending_documentation: pendingCount,
        earliest_expiration: earliestExpiration,
        next_expiration_item: nextExpirationItem
      },
      warranties: processedWarranties,
      by_category: byCategory,
      expiring_alerts: expiringAlerts.slice(0, 10),
      expired_warranties: expiredWarranties.slice(0, 10),
      pending_documentation: pendingDocumentation.slice(0, 10),
      warranty_value_summary: {
        total_items_under_warranty: activeItems,
        estimated_replacement_value: 'See individual warranties for values',
        categories_covered: categoriesCovered
      },
      recommendations,
      report
    }
  }
})

function getActionRequired(warranty: WarrantyItem, daysRemaining: number): string {
  if (daysRemaining <= 7) {
    return 'URGENT: Schedule final inspection before warranty expires'
  } else if (daysRemaining <= 30) {
    return 'Schedule warranty walk-through and document any deficiencies'
  } else if (daysRemaining <= 60) {
    return 'Review equipment performance and prepare warranty claim list'
  } else {
    return 'Monitor equipment and schedule upcoming warranty inspection'
  }
}

function generateWarrantyRecommendations(
  expiringAlerts: ExpiringWarranty[],
  pendingDocumentation: Array<{ item_name: string; category: string; subcontractor: string | null; days_since_substantial_completion: number }>,
  expiredWarranties: WarrantyItem[],
  byCategory: WarrantyCategory[]
): string[] {
  const recommendations: string[] = []

  // Urgent expiring warranties
  const urgentExpiring = expiringAlerts.filter(a => a.days_remaining <= 30)
  if (urgentExpiring.length > 0) {
    recommendations.push(`URGENT: ${urgentExpiring.length} warranties expire within 30 days - schedule final inspections immediately`)
  }

  // Expiring soon
  if (expiringAlerts.length > 0 && urgentExpiring.length === 0) {
    recommendations.push(`${expiringAlerts.length} warranties expiring within alert threshold - plan warranty walk-throughs`)
  }

  // Pending documentation
  if (pendingDocumentation.length > 0) {
    const overdueCount = pendingDocumentation.filter(p => p.days_since_substantial_completion > 30).length
    if (overdueCount > 0) {
      recommendations.push(`${overdueCount} warranty documents are overdue - follow up with subcontractors`)
    }
  }

  // Recently expired
  const recentlyExpired = expiredWarranties.filter(w => {
    const daysExpired = Math.abs(w.days_remaining || 0)
    return daysExpired <= 30
  })
  if (recentlyExpired.length > 0) {
    recommendations.push(`${recentlyExpired.length} warranties recently expired - consider extended warranty options`)
  }

  // Category gaps
  const categoriesWithPending = byCategory.filter(c => c.pending > 0)
  if (categoriesWithPending.length > 0) {
    recommendations.push(`Missing warranty documentation in: ${categoriesWithPending.map(c => c.category).join(', ')}`)
  }

  // General maintenance
  if (recommendations.length === 0) {
    recommendations.push('All warranties are current - maintain regular inspection schedule')
  }

  // Standard recommendation
  recommendations.push('Create warranty expiration calendar and set reminders 60 days before expiration')

  return recommendations.slice(0, 6)
}

function generateWarrantyReport(
  projectName: string,
  warranties: WarrantyItem[],
  expiringAlerts: ExpiringWarranty[],
  byCategory: WarrantyCategory[]
): string {
  const lines: string[] = []
  const separator = '============================================================'
  const subSeparator = '----------------------------------------'

  lines.push(separator)
  lines.push('WARRANTY STATUS REPORT')
  lines.push(separator)
  lines.push('')
  lines.push(`Project: ${projectName}`)
  lines.push(`Report Date: ${new Date().toISOString().split('T')[0]}`)
  lines.push(`Total Warranties: ${warranties.length}`)
  lines.push('')

  // Summary by status
  const active = warranties.filter(w => w.status === 'active').length
  const expiringSoon = warranties.filter(w => w.status === 'expiring_soon').length
  const expired = warranties.filter(w => w.status === 'expired').length
  const pending = warranties.filter(w => w.status === 'pending').length

  lines.push(subSeparator)
  lines.push('STATUS SUMMARY')
  lines.push(subSeparator)
  lines.push(`  Active:        ${active}`)
  lines.push(`  Expiring Soon: ${expiringSoon}`)
  lines.push(`  Expired:       ${expired}`)
  lines.push(`  Pending Docs:  ${pending}`)
  lines.push('')

  // By category
  lines.push(subSeparator)
  lines.push('BY CATEGORY')
  lines.push(subSeparator)
  for (const cat of byCategory) {
    lines.push(`  ${cat.category}: ${cat.total} total (${cat.active} active, ${cat.expiring_soon} expiring)`)
  }
  lines.push('')

  // Expiring alerts
  if (expiringAlerts.length > 0) {
    lines.push(subSeparator)
    lines.push('EXPIRING WARRANTIES - ACTION REQUIRED')
    lines.push(subSeparator)
    for (const alert of expiringAlerts.slice(0, 5)) {
      lines.push(`  ${alert.item_name}`)
      lines.push(`    Expires: ${alert.end_date} (${alert.days_remaining} days)`)
      lines.push(`    Action: ${alert.action_required}`)
      lines.push('')
    }
  }

  lines.push(separator)
  lines.push('END OF REPORT')
  lines.push(separator)

  return lines.join('\n')
}
