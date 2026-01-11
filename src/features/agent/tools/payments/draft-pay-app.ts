/**
 * Draft Payment Application Tool
 * Drafts payment applications by calculating work completed, billable amounts, retention, and previous billings
 */

import { createTool } from '../registry'
import { supabase } from '@/lib/supabase'

interface DraftPayAppInput {
  project_id: string
  billing_period_end: string
  include_stored_materials?: boolean
}

interface PayAppLineItem {
  item_number: string
  description: string
  scheduled_value: number
  work_completed_previous: number
  work_completed_this_period: number
  materials_stored: number
  total_completed_and_stored: number
  percent_complete: number
  balance_to_finish: number
  retainage: number
}

interface PayAppTotals {
  total_scheduled_value: number
  total_work_completed_previous: number
  total_work_completed_this_period: number
  total_materials_stored: number
  total_completed_and_stored: number
  total_percent_complete: number
  total_balance_to_finish: number
  total_retainage_held: number
}

interface DraftPayAppOutput {
  pay_app_draft: {
    project_id: string
    project_name: string
    billing_period_end: string
    application_number: number
    line_items: PayAppLineItem[]
    totals: PayAppTotals
    retention: {
      retention_rate: number
      retention_held_previous: number
      retention_held_this_period: number
      total_retention_held: number
    }
    previous_billed: {
      total_previous_applications: number
      total_previous_billed: number
      total_previous_received: number
      outstanding_balance: number
    }
    current_due: {
      gross_amount_due: number
      less_retention: number
      net_amount_due: number
      less_previous_payments: number
      current_payment_due: number
    }
    change_orders_included: Array<{
      co_number: string
      description: string
      amount: number
      status: string
    }>
    notes: string[]
    warnings: string[]
  }
}

// Helper to format currency
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

// Calculate percent complete
function calculatePercentComplete(completed: number, scheduled: number): number {
  if (scheduled === 0) return 0
  return Math.round((completed / scheduled) * 1000) / 10
}

export const draftPayAppTool = createTool<DraftPayAppInput, DraftPayAppOutput>({
  name: 'draft_pay_app',
  displayName: 'Draft Payment Application',
  description: 'Drafts payment applications by calculating work completed to date from schedule and daily reports, determining billable amounts based on contract values, tracking retention and previous billings, and generating properly formatted pay app line items.',
  category: 'action',
  parameters: {
    type: 'object',
    properties: {
      project_id: {
        type: 'string',
        description: 'The project ID to generate pay app for'
      },
      billing_period_end: {
        type: 'string',
        description: 'End date of the billing period (ISO format: YYYY-MM-DD)'
      },
      include_stored_materials: {
        type: 'boolean',
        description: 'Include stored materials not yet installed (default: true)'
      }
    },
    required: ['project_id', 'billing_period_end']
  },
  requiresConfirmation: false,
  estimatedTokens: 1200,

  async execute(input) {
    const { project_id, billing_period_end, include_stored_materials = true } = input

    // Get project details
    const { data: project } = await supabase
      .from('projects')
      .select('*, name, contract_value, retention_rate, start_date')
      .eq('id', project_id)
      .single()

    if (!project) {
      throw new Error(`Project not found: ${project_id}`)
    }

    const retentionRate = project.retention_rate ?? 0.10 // Default 10% retention

    // Get previous payment applications
    const { data: previousPayApps } = await supabase
      .from('payment_applications')
      .select('*')
      .eq('project_id', project_id)
      .order('application_number', { ascending: false })

    const lastPayApp = previousPayApps?.[0]
    const applicationNumber = (lastPayApp?.application_number || 0) + 1

    // Calculate previous totals
    const totalPreviousBilled = previousPayApps?.reduce(
      (sum, app) => sum + (app.gross_amount_due || 0),
      0
    ) || 0
    const totalPreviousReceived = previousPayApps?.reduce(
      (sum, app) => sum + (app.amount_received || 0),
      0
    ) || 0
    const previousRetention = previousPayApps?.reduce(
      (sum, app) => sum + (app.retention_held || 0),
      0
    ) || 0

    // Get schedule of values (SOV) / budget items
    const { data: sovItems } = await supabase
      .from('budget_items')
      .select('*')
      .eq('project_id', project_id)
      .is('deleted_at', null)
      .order('sort_order', { ascending: true })

    // Get daily reports for work completed calculations
    const { data: dailyReports } = await supabase
      .from('daily_reports')
      .select('*, work_performed, labor_entries, equipment_entries')
      .eq('project_id', project_id)
      .lte('report_date', billing_period_end)
      .is('deleted_at', null)

    // Get schedule activities for progress tracking
    const { data: scheduleActivities } = await supabase
      .from('schedule_activities')
      .select('*')
      .eq('project_id', project_id)
      .is('deleted_at', null)

    // Get approved change orders
    const { data: changeOrders } = await supabase
      .from('change_orders')
      .select('*')
      .eq('project_id', project_id)
      .eq('status', 'approved')
      .is('deleted_at', null)

    // Get stored materials if requested
    let storedMaterials: Array<{ budget_item_id: string; amount: number }> = []
    if (include_stored_materials) {
      const { data: materials } = await supabase
        .from('stored_materials')
        .select('*')
        .eq('project_id', project_id)
        .eq('status', 'stored')
        .lte('delivery_date', billing_period_end)

      storedMaterials = materials || []
    }

    // Build line items from SOV
    const lineItems: PayAppLineItem[] = []
    const notes: string[] = []
    const warnings: string[] = []

    let itemCounter = 1

    for (const sovItem of sovItems || []) {
      const scheduledValue = sovItem.budgeted_amount || 0

      // Get previous billing for this line item from last pay app
      const previousBilling = lastPayApp?.line_items?.find(
        (li: { budget_item_id?: string }) => li.budget_item_id === sovItem.id
      )
      const workCompletedPrevious = previousBilling?.total_completed_and_stored || 0

      // Calculate work completed this period from schedule activities and daily reports
      let workCompletedThisPeriod = 0

      // Check schedule activities linked to this budget item
      const relatedActivities = scheduleActivities?.filter(
        (activity) => activity.budget_item_id === sovItem.id || activity.cost_code === sovItem.cost_code
      ) || []

      for (const activity of relatedActivities) {
        const percentComplete = activity.percent_complete || 0
        const activityValue = scheduledValue * (percentComplete / 100)
        const previousActivityValue = workCompletedPrevious

        if (activityValue > previousActivityValue) {
          workCompletedThisPeriod += activityValue - previousActivityValue
        }
      }

      // If no activities linked, estimate from actual costs vs budget
      if (relatedActivities.length === 0 && sovItem.actual_amount) {
        const actualProgress = sovItem.actual_amount
        if (actualProgress > workCompletedPrevious) {
          workCompletedThisPeriod = actualProgress - workCompletedPrevious
        }
      }

      // Calculate materials stored for this item
      const materialsForItem = storedMaterials
        .filter((m) => m.budget_item_id === sovItem.id)
        .reduce((sum, m) => sum + (m.amount || 0), 0)

      const totalCompletedAndStored = workCompletedPrevious + workCompletedThisPeriod + materialsForItem
      const percentComplete = calculatePercentComplete(totalCompletedAndStored, scheduledValue)
      const balanceToFinish = scheduledValue - totalCompletedAndStored
      const retainage = totalCompletedAndStored * retentionRate

      // Add warnings for potential issues
      if (percentComplete > 100) {
        warnings.push(`Item ${itemCounter}: ${sovItem.name || sovItem.description} exceeds 100% (${percentComplete}%)`)
      }
      if (balanceToFinish < 0) {
        warnings.push(`Item ${itemCounter}: ${sovItem.name || sovItem.description} has overbilled by ${formatCurrency(Math.abs(balanceToFinish))}`)
      }

      lineItems.push({
        item_number: String(itemCounter).padStart(3, '0'),
        description: sovItem.name || sovItem.description || `Line Item ${itemCounter}`,
        scheduled_value: scheduledValue,
        work_completed_previous: workCompletedPrevious,
        work_completed_this_period: Math.max(0, workCompletedThisPeriod),
        materials_stored: materialsForItem,
        total_completed_and_stored: Math.min(totalCompletedAndStored, scheduledValue),
        percent_complete: Math.min(percentComplete, 100),
        balance_to_finish: Math.max(balanceToFinish, 0),
        retainage
      })

      itemCounter++
    }

    // Add approved change orders as line items
    const changeOrderItems: Array<{
      co_number: string
      description: string
      amount: number
      status: string
    }> = []

    for (const co of changeOrders || []) {
      const coNumber = co.number || co.id.substring(0, 8)
      const previousCOBilling = lastPayApp?.change_order_items?.find(
        (item: { change_order_id?: string }) => item.change_order_id === co.id
      )
      const workCompletedPrevious = previousCOBilling?.total_completed || 0

      // Assume COs are 100% billable if approved and work completed
      const coAmount = co.amount || 0
      const workThisPeriod = coAmount - workCompletedPrevious

      if (coAmount > 0) {
        lineItems.push({
          item_number: `CO-${coNumber}`,
          description: `Change Order #${coNumber}: ${co.title || co.description || 'Change Order'}`,
          scheduled_value: coAmount,
          work_completed_previous: workCompletedPrevious,
          work_completed_this_period: Math.max(0, workThisPeriod),
          materials_stored: 0,
          total_completed_and_stored: coAmount,
          percent_complete: 100,
          balance_to_finish: 0,
          retainage: coAmount * retentionRate
        })

        changeOrderItems.push({
          co_number: coNumber,
          description: co.title || co.description || 'Change Order',
          amount: coAmount,
          status: 'approved'
        })
      }
    }

    // Calculate totals
    const totals: PayAppTotals = {
      total_scheduled_value: lineItems.reduce((sum, item) => sum + item.scheduled_value, 0),
      total_work_completed_previous: lineItems.reduce((sum, item) => sum + item.work_completed_previous, 0),
      total_work_completed_this_period: lineItems.reduce((sum, item) => sum + item.work_completed_this_period, 0),
      total_materials_stored: lineItems.reduce((sum, item) => sum + item.materials_stored, 0),
      total_completed_and_stored: lineItems.reduce((sum, item) => sum + item.total_completed_and_stored, 0),
      total_percent_complete: 0,
      total_balance_to_finish: lineItems.reduce((sum, item) => sum + item.balance_to_finish, 0),
      total_retainage_held: lineItems.reduce((sum, item) => sum + item.retainage, 0)
    }

    totals.total_percent_complete = calculatePercentComplete(
      totals.total_completed_and_stored,
      totals.total_scheduled_value
    )

    // Calculate retention
    const retentionThisPeriod = totals.total_work_completed_this_period * retentionRate
    const totalRetentionHeld = totals.total_retainage_held

    // Calculate current due
    const grossAmountDue = totals.total_completed_and_stored
    const lessRetention = totalRetentionHeld
    const netAmountDue = grossAmountDue - lessRetention
    const lessPreviousPayments = totalPreviousReceived
    const currentPaymentDue = netAmountDue - lessPreviousPayments

    // Add notes
    notes.push(`Application #${applicationNumber} for billing period ending ${billing_period_end}`)
    notes.push(`Retention rate: ${(retentionRate * 100).toFixed(1)}%`)
    if (changeOrderItems.length > 0) {
      notes.push(`Includes ${changeOrderItems.length} approved change order(s) totaling ${formatCurrency(changeOrderItems.reduce((sum, co) => sum + co.amount, 0))}`)
    }
    if (storedMaterials.length > 0) {
      notes.push(`Includes ${storedMaterials.length} stored material item(s)`)
    }

    return {
      success: true,
      data: {
        pay_app_draft: {
          project_id,
          project_name: project.name || 'Unknown Project',
          billing_period_end,
          application_number: applicationNumber,
          line_items: lineItems,
          totals,
          retention: {
            retention_rate: retentionRate,
            retention_held_previous: previousRetention,
            retention_held_this_period: retentionThisPeriod,
            total_retention_held: totalRetentionHeld
          },
          previous_billed: {
            total_previous_applications: previousPayApps?.length || 0,
            total_previous_billed: totalPreviousBilled,
            total_previous_received: totalPreviousReceived,
            outstanding_balance: totalPreviousBilled - totalPreviousReceived
          },
          current_due: {
            gross_amount_due: grossAmountDue,
            less_retention: lessRetention,
            net_amount_due: netAmountDue,
            less_previous_payments: lessPreviousPayments,
            current_payment_due: currentPaymentDue
          },
          change_orders_included: changeOrderItems,
          notes,
          warnings
        }
      },
      metadata: {
        executionTimeMs: 0
      }
    }
  },

  formatOutput(output) {
    const { pay_app_draft } = output

    const statusType = pay_app_draft.warnings.length > 0 ? 'warning' : 'success'
    const warningText = pay_app_draft.warnings.length > 0
      ? ` (${pay_app_draft.warnings.length} warning(s))`
      : ''

    return {
      title: 'Payment Application Draft Generated',
      summary: `App #${pay_app_draft.application_number}: ${formatCurrency(pay_app_draft.current_due.current_payment_due)} due${warningText}`,
      icon: 'file-invoice-dollar',
      status: statusType,
      details: [
        { label: 'Application #', value: pay_app_draft.application_number, type: 'text' },
        { label: 'Period End', value: pay_app_draft.billing_period_end, type: 'date' },
        { label: 'Line Items', value: pay_app_draft.line_items.length, type: 'text' },
        { label: 'Total Scheduled Value', value: formatCurrency(pay_app_draft.totals.total_scheduled_value), type: 'text' },
        { label: '% Complete', value: `${pay_app_draft.totals.total_percent_complete}%`, type: 'badge' },
        { label: 'Work This Period', value: formatCurrency(pay_app_draft.totals.total_work_completed_this_period), type: 'text' },
        { label: 'Gross Amount Due', value: formatCurrency(pay_app_draft.current_due.gross_amount_due), type: 'text' },
        { label: 'Less Retention', value: formatCurrency(pay_app_draft.current_due.less_retention), type: 'text' },
        { label: 'Current Payment Due', value: formatCurrency(pay_app_draft.current_due.current_payment_due), type: 'currency' },
        { label: 'Change Orders', value: pay_app_draft.change_orders_included.length, type: 'text' }
      ],
      expandedContent: output as unknown as Record<string, unknown>
    }
  }
})
