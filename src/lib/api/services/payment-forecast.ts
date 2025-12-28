/**
 * Payment Forecast API Service
 *
 * Comprehensive payment forecast and cash flow projection services:
 * - Upcoming payment schedules
 * - Calendar event generation
 * - Cash flow forecasting
 * - Historical payment pattern analysis
 */

import { supabase } from '@/lib/supabase'
import { ApiErrorClass } from '../errors'
import {
  addMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  format,
  parseISO,
  differenceInDays,
  eachDayOfInterval,
  eachWeekOfInterval,
} from 'date-fns'

import {
  isIncomingPayment,
  calculateDaysUntilDue,
  getPriorityFromDueDate,
  getPaymentTypeConfig,
  type PaymentForecastItem,
  type PaymentCalendarEvent,
  type PaymentForecastSummary,
  type CashFlowProjection,
  type PaymentPattern,
  type DailyPaymentTotals,
  type WeeklyPaymentSummary,
  type MonthlyCalendarData,
  type PaymentForecastFilters,
  type CashFlowForecastFilters,
  type PaymentForecastResponse,
  type CashFlowForecastResponse,
  type CalendarEventsResponse,
  type CreatePaymentForecastDTO,
  type UpdatePaymentForecastDTO,
  type PaymentType,
  type PaymentStatus,
  type PaymentPriority,
} from '@/types/payment-forecast'

// Database row type for payment forecasts
interface PaymentForecastRow {
  id: string
  project_id: string
  company_id: string
  payment_type: PaymentType
  reference_number: string | null
  description: string | null
  subcontractor_id: string | null
  vendor_id: string | null
  invoice_id: string | null
  pay_application_id: string | null
  amount: number | null
  retainage_amount: number | null
  total_amount: number | null
  due_date: string
  scheduled_payment_date: string | null
  actual_payment_date: string | null
  status: PaymentStatus
  priority: string | null
  payment_terms: string | null
  days_until_due: number | null
  notes: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
  subcontractors?: { id: string; name: string } | null
  vendors?: { id: string; name: string } | null
  projects?: { id: string; name: string; project_number: string } | null
}

// Using extended Database types for tables not yet in generated types
const db = supabase as any

// ============================================================================
// PAYMENT FORECAST CRUD
// ============================================================================

export const paymentForecastApi = {
  /**
   * Get upcoming payments with filters
   */
  async getUpcomingPayments(filters: PaymentForecastFilters): Promise<PaymentForecastResponse> {
    let query = db
      .from('payment_forecasts')
      .select(`
        *,
        projects:project_id (id, name, project_number),
        subcontractors:subcontractor_id (id, name),
        vendors:vendor_id (id, name)
      `)
      .gte('due_date', filters.startDate)
      .lte('due_date', filters.endDate)
      .is('deleted_at', null)
      .order('due_date', { ascending: true })

    if (filters.projectId) {
      query = query.eq('project_id', filters.projectId)
    }

    if (filters.companyId) {
      query = query.eq('company_id', filters.companyId)
    }

    if (filters.paymentTypes && filters.paymentTypes.length > 0) {
      query = query.in('payment_type', filters.paymentTypes)
    }

    if (filters.statuses && filters.statuses.length > 0) {
      query = query.in('status', filters.statuses)
    }

    if (filters.minAmount !== undefined) {
      query = query.gte('amount', filters.minAmount)
    }

    if (filters.maxAmount !== undefined) {
      query = query.lte('amount', filters.maxAmount)
    }

    if (filters.subcontractorId) {
      query = query.eq('subcontractor_id', filters.subcontractorId)
    }

    if (filters.vendorId) {
      query = query.eq('vendor_id', filters.vendorId)
    }

    const { data, error, count } = await query

    if (error) {
      throw new ApiErrorClass({ message: error.message, code: 'FETCH_ERROR' })
    }

    const payments = (data || []).map(transformPaymentRow)
    const summary = calculatePaymentSummary(payments, filters.startDate, filters.endDate)

    return {
      payments,
      summary,
      pagination: {
        page: 1,
        limit: payments.length,
        total: count || payments.length,
        totalPages: 1,
      },
    }
  },

  /**
   * Get payments for a specific month
   */
  async getPaymentsByMonth(
    projectId: string | undefined,
    year: number,
    month: number
  ): Promise<PaymentForecastItem[]> {
    const startDate = startOfMonth(new Date(year, month - 1))
    const endDate = endOfMonth(startDate)

    let query = db
      .from('payment_forecasts')
      .select(`
        *,
        projects:project_id (id, name, project_number),
        subcontractors:subcontractor_id (id, name),
        vendors:vendor_id (id, name)
      `)
      .gte('due_date', format(startDate, 'yyyy-MM-dd'))
      .lte('due_date', format(endDate, 'yyyy-MM-dd'))
      .is('deleted_at', null)
      .order('due_date', { ascending: true })

    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    const { data, error } = await query

    if (error) {
      throw new ApiErrorClass({ message: error.message, code: 'FETCH_ERROR' })
    }

    return (data || []).map(transformPaymentRow)
  },

  /**
   * Calculate cash flow forecast for upcoming months
   */
  async calculateCashFlowForecast(filters: CashFlowForecastFilters): Promise<CashFlowForecastResponse> {
    const months = filters.months || 6
    const startDate = startOfMonth(new Date())
    const endDate = endOfMonth(addMonths(startDate, months - 1))

    // Fetch all payments in the forecast period
    let query = db
      .from('payment_forecasts')
      .select('*')
      .gte('due_date', format(startDate, 'yyyy-MM-dd'))
      .lte('due_date', format(endDate, 'yyyy-MM-dd'))
      .is('deleted_at', null)

    if (filters.projectId) {
      query = query.eq('project_id', filters.projectId)
    }

    if (filters.companyId) {
      query = query.eq('company_id', filters.companyId)
    }

    const { data: payments, error } = await query

    if (error) {
      throw new ApiErrorClass({ message: error.message, code: 'FETCH_ERROR' })
    }

    // Generate monthly projections
    const projections: CashFlowProjection[] = []
    let cumulativeCashFlow = 0

    for (let i = 0; i < months; i++) {
      const monthStart = addMonths(startDate, i)
      const monthEnd = endOfMonth(monthStart)
      const monthKey = format(monthStart, 'yyyy-MM')
      const monthName = format(monthStart, 'MMMM yyyy')

      // Filter payments for this month
      const monthPayments = (payments || []).filter((p: PaymentForecastRow) => {
        const dueDate = parseISO(p.due_date)
        return dueDate >= monthStart && dueDate <= monthEnd
      })

      // Calculate totals by type
      let incoming = 0
      let outgoing = 0
      let ownerRequisitions = 0
      let subcontractorPayments = 0
      let vendorPayments = 0
      let retentionReleases = 0
      let otherPayments = 0
      let confirmedAmount = 0
      let estimatedAmount = 0

      monthPayments.forEach((p: PaymentForecastRow) => {
        const amount = p.amount || 0
        const isIncoming = isIncomingPayment(p.payment_type)

        if (isIncoming) {
          incoming += amount
        } else {
          outgoing += amount
        }

        // By type
        switch (p.payment_type) {
          case 'owner_requisition':
          case 'progress_billing':
            ownerRequisitions += amount
            break
          case 'subcontractor_pay_application':
            subcontractorPayments += amount
            break
          case 'vendor_payment':
          case 'invoice_payment':
            vendorPayments += amount
            break
          case 'retention_release':
            retentionReleases += amount
            break
          default:
            otherPayments += amount
        }

        // Confidence calculation
        if (p.status === 'approved' || p.status === 'completed' || p.status === 'processing') {
          confirmedAmount += amount
        } else {
          estimatedAmount += amount
        }
      })

      const netCashFlow = incoming - outgoing
      cumulativeCashFlow += netCashFlow

      projections.push({
        month: monthKey,
        month_name: monthName,
        projected_incoming: incoming,
        projected_outgoing: outgoing,
        net_cash_flow: netCashFlow,
        cumulative_cash_flow: cumulativeCashFlow,
        owner_requisitions: ownerRequisitions,
        subcontractor_payments: subcontractorPayments,
        vendor_payments: vendorPayments,
        retention_releases: retentionReleases,
        other_payments: otherPayments,
        confirmed_amount: confirmedAmount,
        estimated_amount: estimatedAmount,
        confidence_percent: confirmedAmount + estimatedAmount > 0
          ? Math.round((confirmedAmount / (confirmedAmount + estimatedAmount)) * 100)
          : 0,
      })
    }

    // Calculate historical patterns
    const patterns = await this.getPaymentPatterns(filters.projectId, filters.companyId)

    // Calculate totals
    const totalForecast = projections.reduce(
      (acc, p) => ({
        incoming: acc.incoming + p.projected_incoming,
        outgoing: acc.outgoing + p.projected_outgoing,
        net: acc.net + p.net_cash_flow,
      }),
      { incoming: 0, outgoing: 0, net: 0 }
    )

    return {
      projections,
      patterns,
      total_forecast: totalForecast,
    }
  },

  /**
   * Get payment calendar events for a date range
   */
  async getPaymentCalendarEvents(
    projectId: string | undefined,
    startDate: string,
    endDate: string
  ): Promise<CalendarEventsResponse> {
    let query = db
      .from('payment_forecasts')
      .select(`
        *,
        projects:project_id (id, name, project_number)
      `)
      .gte('due_date', startDate)
      .lte('due_date', endDate)
      .is('deleted_at', null)
      .order('due_date', { ascending: true })

    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    const { data, error } = await query

    if (error) {
      throw new ApiErrorClass({ message: error.message, code: 'FETCH_ERROR' })
    }

    const payments = (data || []).map(transformPaymentRow)
    const events = payments.map(paymentToCalendarEvent)

    // Generate monthly calendar data
    const start = parseISO(startDate)
    const monthlyData = generateMonthlyCalendarData(events, start.getFullYear(), start.getMonth() + 1)

    return {
      events,
      monthly_data: monthlyData,
    }
  },

  /**
   * Get historical payment patterns
   */
  async getPaymentPatterns(
    projectId: string | undefined,
    companyId: string | undefined
  ): Promise<PaymentPattern[]> {
    // Get completed payments from last 12 months
    const startDate = format(addMonths(new Date(), -12), 'yyyy-MM-dd')

    let query = db
      .from('payment_forecasts')
      .select('*')
      .gte('due_date', startDate)
      .eq('status', 'completed')
      .is('deleted_at', null)

    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    if (companyId) {
      query = query.eq('company_id', companyId)
    }

    const { data, error } = await query

    if (error) {
      throw new ApiErrorClass({ message: error.message, code: 'FETCH_ERROR' })
    }

    // Group by payment type and calculate patterns
    const typeGroups: Record<string, PaymentForecastRow[]> = {}
    ;(data || []).forEach((p: PaymentForecastRow) => {
      if (!typeGroups[p.payment_type]) {
        typeGroups[p.payment_type] = []
      }
      typeGroups[p.payment_type].push(p)
    })

    const patterns: PaymentPattern[] = Object.entries(typeGroups).map(([type, payments]) => {
      const totalPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0)
      const avgAmount = payments.length > 0 ? totalPaid / payments.length : 0

      // Calculate average days to payment
      const daysToPayment = payments
        .filter(p => p.actual_payment_date && p.due_date)
        .map(p => differenceInDays(parseISO(p.actual_payment_date!), parseISO(p.due_date)))

      const avgDays = daysToPayment.length > 0
        ? Math.round(daysToPayment.reduce((a, b) => a + b, 0) / daysToPayment.length)
        : 0

      // Calculate on-time percentage
      const onTimeCount = daysToPayment.filter(d => d <= 0).length
      const onTimePercent = daysToPayment.length > 0
        ? Math.round((onTimeCount / daysToPayment.length) * 100)
        : 100

      // Determine trend (simplified: compare first half to second half)
      const midpoint = Math.floor(payments.length / 2)
      const firstHalfAvg = payments.slice(0, midpoint).reduce((sum, p) => sum + (p.amount || 0), 0) / (midpoint || 1)
      const secondHalfAvg = payments.slice(midpoint).reduce((sum, p) => sum + (p.amount || 0), 0) / ((payments.length - midpoint) || 1)

      let trend: 'improving' | 'stable' | 'declining' = 'stable'
      if (secondHalfAvg > firstHalfAvg * 1.1) {
        trend = 'improving'
      } else if (secondHalfAvg < firstHalfAvg * 0.9) {
        trend = 'declining'
      }

      return {
        payment_type: type as PaymentType,
        average_days_to_payment: avgDays,
        on_time_percentage: onTimePercent,
        average_amount: avgAmount,
        total_paid: totalPaid,
        payment_count: payments.length,
        trend,
      }
    })

    return patterns
  },

  /**
   * Create a new payment forecast entry
   */
  async createPaymentForecast(dto: CreatePaymentForecastDTO): Promise<PaymentForecastItem> {
    const daysUntilDue = calculateDaysUntilDue(dto.due_date)

    const { data, error } = await db
      .from('payment_forecasts')
      .insert({
        project_id: dto.project_id,
        payment_type: dto.payment_type,
        description: dto.description,
        amount: dto.amount,
        retainage_amount: dto.retainage_amount || null,
        total_amount: dto.amount + (dto.retainage_amount || 0),
        due_date: dto.due_date,
        scheduled_payment_date: dto.scheduled_payment_date || null,
        subcontractor_id: dto.subcontractor_id || null,
        vendor_id: dto.vendor_id || null,
        payment_terms: dto.payment_terms || null,
        priority: dto.priority || getPriorityFromDueDate(daysUntilDue),
        status: 'scheduled',
        days_until_due: daysUntilDue,
        notes: dto.notes || null,
      })
      .select()
      .single()

    if (error) {
      throw new ApiErrorClass({ message: error.message, code: 'CREATE_ERROR' })
    }

    return transformPaymentRow(data)
  },

  /**
   * Update a payment forecast entry
   */
  async updatePaymentForecast(id: string, dto: UpdatePaymentForecastDTO): Promise<PaymentForecastItem> {
    const updateData: UpdatePaymentForecastDTO & { days_until_due?: number } = { ...dto }

    // Recalculate days until due if due_date changed
    if (dto.due_date) {
      updateData.days_until_due = calculateDaysUntilDue(dto.due_date)
    }

    const { data, error } = await db
      .from('payment_forecasts')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw new ApiErrorClass({ message: error.message, code: 'UPDATE_ERROR' })
    }

    return transformPaymentRow(data)
  },

  /**
   * Delete a payment forecast entry (soft delete)
   */
  async deletePaymentForecast(id: string): Promise<void> {
    const { error } = await db
      .from('payment_forecasts')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      throw new ApiErrorClass({ message: error.message, code: 'DELETE_ERROR' })
    }
  },

  /**
   * Mark a payment as completed
   */
  async markPaymentCompleted(id: string, paymentDate: string): Promise<PaymentForecastItem> {
    const { data, error } = await db
      .from('payment_forecasts')
      .update({
        status: 'completed',
        actual_payment_date: paymentDate,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw new ApiErrorClass({ message: error.message, code: 'UPDATE_ERROR' })
    }

    return transformPaymentRow(data)
  },

  /**
   * Get overdue payments
   */
  async getOverduePayments(projectId?: string): Promise<PaymentForecastItem[]> {
    const today = format(new Date(), 'yyyy-MM-dd')

    let query = db
      .from('payment_forecasts')
      .select(`
        *,
        projects:project_id (id, name, project_number)
      `)
      .lt('due_date', today)
      .not('status', 'in', '("completed","cancelled")')
      .is('deleted_at', null)
      .order('due_date', { ascending: true })

    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    const { data, error } = await query

    if (error) {
      throw new ApiErrorClass({ message: error.message, code: 'FETCH_ERROR' })
    }

    return (data || []).map(transformPaymentRow)
  },
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Transform database row to PaymentForecastItem
 */
function transformPaymentRow(row: PaymentForecastRow): PaymentForecastItem {
  return {
    id: row.id,
    project_id: row.project_id,
    company_id: row.company_id,
    payment_type: row.payment_type,
    reference_number: row.reference_number || '',
    description: row.description || '',
    subcontractor_id: row.subcontractor_id,
    subcontractor_name: row.subcontractors?.name || null,
    vendor_id: row.vendor_id,
    vendor_name: row.vendors?.name || null,
    invoice_id: row.invoice_id,
    pay_application_id: row.pay_application_id,
    amount: row.amount || 0,
    retainage_amount: row.retainage_amount,
    total_amount: row.total_amount || row.amount || 0,
    due_date: row.due_date,
    scheduled_payment_date: row.scheduled_payment_date,
    actual_payment_date: row.actual_payment_date,
    status: row.status || 'scheduled',
    priority: (row.priority as PaymentPriority) || 'medium',
    payment_terms: row.payment_terms,
    days_until_due: calculateDaysUntilDue(row.due_date),
    notes: row.notes,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

/**
 * Convert PaymentForecastItem to PaymentCalendarEvent
 */
function paymentToCalendarEvent(payment: PaymentForecastItem): PaymentCalendarEvent {
  const typeConfig = getPaymentTypeConfig(payment.payment_type)
  const isIncoming = isIncomingPayment(payment.payment_type)

  return {
    id: payment.id,
    title: payment.description || typeConfig.label,
    date: payment.due_date,
    amount: payment.amount,
    payment_type: payment.payment_type,
    status: payment.status,
    priority: payment.priority,
    project_id: payment.project_id,
    project_name: '', // Will be populated from joined data
    payee_name: payment.subcontractor_name || payment.vendor_name,
    is_incoming: isIncoming,
    details: payment,
  }
}

/**
 * Calculate payment summary from list of payments
 */
function calculatePaymentSummary(
  payments: PaymentForecastItem[],
  periodStart: string,
  periodEnd: string
): PaymentForecastSummary {
  let totalIncoming = 0
  let totalOutgoing = 0
  let overdueCount = 0
  let pendingApprovalCount = 0

  const byType: Record<string, { count: number; amount: number }> = {}
  const byStatus: Record<string, { count: number; amount: number }> = {}

  payments.forEach((p) => {
    const isIncoming = isIncomingPayment(p.payment_type)
    if (isIncoming) {
      totalIncoming += p.amount
    } else {
      totalOutgoing += p.amount
    }

    if (p.status === 'overdue' || (p.days_until_due < 0 && p.status !== 'completed')) {
      overdueCount++
    }

    if (p.status === 'pending_approval') {
      pendingApprovalCount++
    }

    // By type
    if (!byType[p.payment_type]) {
      byType[p.payment_type] = { count: 0, amount: 0 }
    }
    byType[p.payment_type].count++
    byType[p.payment_type].amount += p.amount

    // By status
    if (!byStatus[p.status]) {
      byStatus[p.status] = { count: 0, amount: 0 }
    }
    byStatus[p.status].count++
    byStatus[p.status].amount += p.amount
  })

  return {
    period_start: periodStart,
    period_end: periodEnd,
    total_payments_due: totalIncoming + totalOutgoing,
    total_incoming: totalIncoming,
    total_outgoing: totalOutgoing,
    net_cash_flow: totalIncoming - totalOutgoing,
    payment_count: payments.length,
    overdue_count: overdueCount,
    pending_approval_count: pendingApprovalCount,
    by_type: Object.entries(byType).map(([type, data]) => ({
      payment_type: type as PaymentType,
      label: getPaymentTypeConfig(type as PaymentType).label,
      count: data.count,
      amount: data.amount,
    })),
    by_status: Object.entries(byStatus).map(([status, data]) => ({
      status: status as PaymentStatus,
      label: status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      count: data.count,
      amount: data.amount,
    })),
  }
}

/**
 * Generate monthly calendar data structure
 */
function generateMonthlyCalendarData(
  events: PaymentCalendarEvent[],
  year: number,
  month: number
): MonthlyCalendarData {
  const monthStart = startOfMonth(new Date(year, month - 1))
  const monthEnd = endOfMonth(monthStart)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 })
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })

  // Generate weeks
  const weekStarts = eachWeekOfInterval(
    { start: calendarStart, end: calendarEnd },
    { weekStartsOn: 0 }
  )

  const weeks: WeeklyPaymentSummary[] = weekStarts.map((weekStart, index) => {
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 0 })
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd })

    const dailyTotals: DailyPaymentTotals[] = days.map((day) => {
      const dateStr = format(day, 'yyyy-MM-dd')
      const dayEvents = events.filter((e) => e.date === dateStr)

      let incoming = 0
      let outgoing = 0
      dayEvents.forEach((e) => {
        if (e.is_incoming) {
          incoming += e.amount
        } else {
          outgoing += e.amount
        }
      })

      return {
        date: dateStr,
        incoming,
        outgoing,
        net: incoming - outgoing,
        payment_count: dayEvents.length,
        events: dayEvents,
      }
    })

    const weekTotals = dailyTotals.reduce(
      (acc, day) => ({
        incoming: acc.incoming + day.incoming,
        outgoing: acc.outgoing + day.outgoing,
        net: acc.net + day.net,
        payment_count: acc.payment_count + day.payment_count,
      }),
      { incoming: 0, outgoing: 0, net: 0, payment_count: 0 }
    )

    return {
      week_start: format(weekStart, 'yyyy-MM-dd'),
      week_end: format(weekEnd, 'yyyy-MM-dd'),
      week_number: index + 1,
      incoming: weekTotals.incoming,
      outgoing: weekTotals.outgoing,
      net: weekTotals.net,
      payment_count: weekTotals.payment_count,
      days: dailyTotals,
    }
  })

  // Calculate month totals
  const monthTotals = weeks.reduce(
    (acc, week) => ({
      incoming: acc.incoming + week.incoming,
      outgoing: acc.outgoing + week.outgoing,
      net: acc.net + week.net,
      payment_count: acc.payment_count + week.payment_count,
    }),
    { incoming: 0, outgoing: 0, net: 0, payment_count: 0 }
  )

  return {
    year,
    month,
    month_name: format(monthStart, 'MMMM yyyy'),
    weeks,
    totals: monthTotals,
  }
}

export default paymentForecastApi
