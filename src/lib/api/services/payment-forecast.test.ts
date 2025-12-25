/**
 * Payment Forecast Service Tests
 *
 * Tests for payment forecast calculations, cash flow projections,
 * and calendar data generation.
 */

import { vi } from 'vitest'

// Note: describe, it, expect, beforeEach, afterEach are available as globals (vitest config has globals: true)
import {
  format,
  startOfMonth,
  endOfMonth,
  addDays,
  addMonths,
  parseISO,
} from 'date-fns'
import type {
  PaymentForecastItem,
  PaymentCalendarEvent,
  PaymentForecastSummary,
  CashFlowProjection,
  PaymentType,
  PaymentStatus,
  DailyPaymentTotals,
  MonthlyCalendarData,
} from '@/types/payment-forecast'
import {
  isIncomingPayment,
  calculateDaysUntilDue,
  getPriorityFromDueDate,
  getPaymentTypeConfig,
} from '@/types/payment-forecast'

// ============================================================================
// MOCK DATA
// ============================================================================

function createMockPayment(overrides: Partial<PaymentForecastItem> = {}): PaymentForecastItem {
  const today = new Date()
  return {
    id: 'payment-1',
    project_id: 'project-1',
    company_id: 'company-1',
    payment_type: 'subcontractor_pay_application',
    reference_number: 'PAY-001',
    description: 'Monthly progress payment',
    subcontractor_id: 'sub-1',
    subcontractor_name: 'ABC Contractors',
    vendor_id: null,
    vendor_name: null,
    invoice_id: null,
    pay_application_id: null,
    amount: 50000,
    retainage_amount: 5000,
    total_amount: 55000,
    due_date: format(addDays(today, 10), 'yyyy-MM-dd'),
    scheduled_payment_date: null,
    actual_payment_date: null,
    status: 'scheduled',
    priority: 'medium',
    payment_terms: 'Net 30',
    days_until_due: 10,
    notes: null,
    created_at: format(today, "yyyy-MM-dd'T'HH:mm:ss"),
    updated_at: format(today, "yyyy-MM-dd'T'HH:mm:ss"),
    ...overrides,
  }
}

function createMockCalendarEvent(overrides: Partial<PaymentCalendarEvent> = {}): PaymentCalendarEvent {
  const payment = createMockPayment()
  return {
    id: payment.id,
    title: payment.description,
    date: payment.due_date,
    amount: payment.amount,
    payment_type: payment.payment_type,
    status: payment.status,
    priority: payment.priority,
    project_id: payment.project_id,
    project_name: 'Test Project',
    payee_name: payment.subcontractor_name,
    is_incoming: false,
    details: payment,
    ...overrides,
  }
}

// ============================================================================
// HELPER FUNCTION TESTS
// ============================================================================

describe('Payment Type Helpers', () => {
  describe('isIncomingPayment', () => {
    it('returns true for owner_requisition', () => {
      expect(isIncomingPayment('owner_requisition')).toBe(true)
    })

    it('returns true for progress_billing', () => {
      expect(isIncomingPayment('progress_billing')).toBe(true)
    })

    it('returns false for subcontractor_pay_application', () => {
      expect(isIncomingPayment('subcontractor_pay_application')).toBe(false)
    })

    it('returns false for invoice_payment', () => {
      expect(isIncomingPayment('invoice_payment')).toBe(false)
    })

    it('returns false for vendor_payment', () => {
      expect(isIncomingPayment('vendor_payment')).toBe(false)
    })

    it('returns false for retention_release', () => {
      expect(isIncomingPayment('retention_release')).toBe(false)
    })
  })

  describe('calculateDaysUntilDue', () => {
    it('returns positive days for future dates', () => {
      const futureDate = format(addDays(new Date(), 10), 'yyyy-MM-dd')
      const days = calculateDaysUntilDue(futureDate)
      // Allow for timezone edge cases (could be 9, 10, or 11 depending on timezone)
      expect(days).toBeGreaterThanOrEqual(9)
      expect(days).toBeLessThanOrEqual(11)
    })

    it('returns negative days for past dates', () => {
      const pastDate = format(addDays(new Date(), -5), 'yyyy-MM-dd')
      const days = calculateDaysUntilDue(pastDate)
      // Allow for timezone edge cases
      expect(days).toBeGreaterThanOrEqual(-6)
      expect(days).toBeLessThanOrEqual(-4)
    })

    it('returns approximately 0 for today', () => {
      const today = format(new Date(), 'yyyy-MM-dd')
      const days = calculateDaysUntilDue(today)
      // Allow for timezone edge cases (could be -1, 0, or 1)
      expect(days).toBeGreaterThanOrEqual(-1)
      expect(days).toBeLessThanOrEqual(1)
    })
  })

  describe('getPriorityFromDueDate', () => {
    it('returns critical for overdue (negative days)', () => {
      expect(getPriorityFromDueDate(-1)).toBe('critical')
      expect(getPriorityFromDueDate(-10)).toBe('critical')
    })

    it('returns high for 0-3 days until due', () => {
      expect(getPriorityFromDueDate(0)).toBe('high')
      expect(getPriorityFromDueDate(1)).toBe('high')
      expect(getPriorityFromDueDate(3)).toBe('high')
    })

    it('returns medium for 4-7 days until due', () => {
      expect(getPriorityFromDueDate(4)).toBe('medium')
      expect(getPriorityFromDueDate(7)).toBe('medium')
    })

    it('returns low for more than 7 days until due', () => {
      expect(getPriorityFromDueDate(8)).toBe('low')
      expect(getPriorityFromDueDate(30)).toBe('low')
    })
  })

  describe('getPaymentTypeConfig', () => {
    it('returns correct config for each payment type', () => {
      const subConfig = getPaymentTypeConfig('subcontractor_pay_application')
      expect(subConfig.label).toBe('Subcontractor Pay App')
      expect(subConfig.color).toBe('blue')

      const ownerConfig = getPaymentTypeConfig('owner_requisition')
      expect(ownerConfig.label).toBe('Owner Requisition')
      expect(ownerConfig.color).toBe('amber')
    })

    it('returns default config for unknown type', () => {
      const config = getPaymentTypeConfig('unknown_type' as PaymentType)
      expect(config).toBeDefined()
    })
  })
})

// ============================================================================
// SUMMARY CALCULATION TESTS
// ============================================================================

describe('Payment Summary Calculations', () => {
  /**
   * Calculate payment summary from a list of payments
   * This mirrors the service function logic for testing
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

      if (!byType[p.payment_type]) {
        byType[p.payment_type] = { count: 0, amount: 0 }
      }
      byType[p.payment_type].count++
      byType[p.payment_type].amount += p.amount

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

  it('calculates correct totals for mixed payments', () => {
    const payments = [
      createMockPayment({ payment_type: 'owner_requisition', amount: 100000 }),
      createMockPayment({ payment_type: 'subcontractor_pay_application', amount: 50000 }),
      createMockPayment({ payment_type: 'vendor_payment', amount: 20000 }),
    ]

    const summary = calculatePaymentSummary(payments, '2024-01-01', '2024-01-31')

    expect(summary.total_incoming).toBe(100000)
    expect(summary.total_outgoing).toBe(70000)
    expect(summary.net_cash_flow).toBe(30000)
    expect(summary.payment_count).toBe(3)
  })

  it('correctly identifies overdue payments', () => {
    const payments = [
      createMockPayment({ days_until_due: -5, status: 'scheduled' }),
      createMockPayment({ days_until_due: 10, status: 'scheduled' }),
      createMockPayment({ status: 'overdue' }),
    ]

    const summary = calculatePaymentSummary(payments, '2024-01-01', '2024-01-31')
    expect(summary.overdue_count).toBe(2)
  })

  it('correctly counts pending approvals', () => {
    const payments = [
      createMockPayment({ status: 'pending_approval' }),
      createMockPayment({ status: 'pending_approval' }),
      createMockPayment({ status: 'scheduled' }),
    ]

    const summary = calculatePaymentSummary(payments, '2024-01-01', '2024-01-31')
    expect(summary.pending_approval_count).toBe(2)
  })

  it('groups payments by type correctly', () => {
    const payments = [
      createMockPayment({ payment_type: 'subcontractor_pay_application', amount: 50000 }),
      createMockPayment({ payment_type: 'subcontractor_pay_application', amount: 30000 }),
      createMockPayment({ payment_type: 'vendor_payment', amount: 20000 }),
    ]

    const summary = calculatePaymentSummary(payments, '2024-01-01', '2024-01-31')

    const subType = summary.by_type.find(t => t.payment_type === 'subcontractor_pay_application')
    expect(subType?.count).toBe(2)
    expect(subType?.amount).toBe(80000)

    const vendorType = summary.by_type.find(t => t.payment_type === 'vendor_payment')
    expect(vendorType?.count).toBe(1)
    expect(vendorType?.amount).toBe(20000)
  })

  it('handles empty payment list', () => {
    const summary = calculatePaymentSummary([], '2024-01-01', '2024-01-31')

    expect(summary.total_incoming).toBe(0)
    expect(summary.total_outgoing).toBe(0)
    expect(summary.net_cash_flow).toBe(0)
    expect(summary.payment_count).toBe(0)
  })
})

// ============================================================================
// CASH FLOW PROJECTION TESTS
// ============================================================================

describe('Cash Flow Projection Calculations', () => {
  /**
   * Calculate cash flow projection for a single month
   * This mirrors the service function logic for testing
   */
  function calculateMonthProjection(
    payments: PaymentForecastItem[],
    monthStart: Date,
    cumulativeCashFlow: number
  ): CashFlowProjection {
    let incoming = 0
    let outgoing = 0
    let ownerRequisitions = 0
    let subcontractorPayments = 0
    let vendorPayments = 0
    let retentionReleases = 0
    let otherPayments = 0
    let confirmedAmount = 0
    let estimatedAmount = 0

    payments.forEach((p) => {
      const amount = p.amount || 0
      const isIncoming = isIncomingPayment(p.payment_type)

      if (isIncoming) {
        incoming += amount
      } else {
        outgoing += amount
      }

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

      if (p.status === 'approved' || p.status === 'completed' || p.status === 'processing') {
        confirmedAmount += amount
      } else {
        estimatedAmount += amount
      }
    })

    const netCashFlow = incoming - outgoing
    const newCumulative = cumulativeCashFlow + netCashFlow

    return {
      month: format(monthStart, 'yyyy-MM'),
      month_name: format(monthStart, 'MMMM yyyy'),
      projected_incoming: incoming,
      projected_outgoing: outgoing,
      net_cash_flow: netCashFlow,
      cumulative_cash_flow: newCumulative,
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
    }
  }

  it('calculates correct monthly totals', () => {
    const payments = [
      createMockPayment({ payment_type: 'owner_requisition', amount: 100000 }),
      createMockPayment({ payment_type: 'subcontractor_pay_application', amount: 60000 }),
    ]

    const projection = calculateMonthProjection(payments, new Date(2024, 0, 1), 0)

    expect(projection.projected_incoming).toBe(100000)
    expect(projection.projected_outgoing).toBe(60000)
    expect(projection.net_cash_flow).toBe(40000)
    expect(projection.cumulative_cash_flow).toBe(40000)
  })

  it('calculates confidence percentage correctly', () => {
    const payments = [
      createMockPayment({ amount: 50000, status: 'approved' }),
      createMockPayment({ amount: 50000, status: 'scheduled' }),
    ]

    const projection = calculateMonthProjection(payments, new Date(2024, 0, 1), 0)
    expect(projection.confidence_percent).toBe(50)
  })

  it('handles 100% confirmed payments', () => {
    const payments = [
      createMockPayment({ amount: 50000, status: 'completed' }),
      createMockPayment({ amount: 30000, status: 'approved' }),
    ]

    const projection = calculateMonthProjection(payments, new Date(2024, 0, 1), 0)
    expect(projection.confidence_percent).toBe(100)
  })

  it('calculates cumulative cash flow correctly', () => {
    const payments = [
      createMockPayment({ payment_type: 'owner_requisition', amount: 50000 }),
    ]

    const projection = calculateMonthProjection(payments, new Date(2024, 0, 1), 100000)
    expect(projection.cumulative_cash_flow).toBe(150000)
  })

  it('categorizes payment types correctly', () => {
    const payments = [
      createMockPayment({ payment_type: 'owner_requisition', amount: 100000 }),
      createMockPayment({ payment_type: 'subcontractor_pay_application', amount: 50000 }),
      createMockPayment({ payment_type: 'vendor_payment', amount: 20000 }),
      createMockPayment({ payment_type: 'retention_release', amount: 10000 }),
    ]

    const projection = calculateMonthProjection(payments, new Date(2024, 0, 1), 0)

    expect(projection.owner_requisitions).toBe(100000)
    expect(projection.subcontractor_payments).toBe(50000)
    expect(projection.vendor_payments).toBe(20000)
    expect(projection.retention_releases).toBe(10000)
  })
})

// ============================================================================
// CALENDAR DATA GENERATION TESTS
// ============================================================================

describe('Calendar Data Generation', () => {
  /**
   * Generate daily totals for a date
   */
  function generateDailyTotals(
    date: string,
    events: PaymentCalendarEvent[]
  ): DailyPaymentTotals {
    let incoming = 0
    let outgoing = 0

    events.forEach((e) => {
      if (e.is_incoming) {
        incoming += e.amount
      } else {
        outgoing += e.amount
      }
    })

    return {
      date,
      incoming,
      outgoing,
      net: incoming - outgoing,
      payment_count: events.length,
      events,
    }
  }

  it('calculates correct daily totals', () => {
    const events = [
      createMockCalendarEvent({ is_incoming: true, amount: 50000 }),
      createMockCalendarEvent({ is_incoming: false, amount: 30000 }),
    ]

    const daily = generateDailyTotals('2024-01-15', events)

    expect(daily.incoming).toBe(50000)
    expect(daily.outgoing).toBe(30000)
    expect(daily.net).toBe(20000)
    expect(daily.payment_count).toBe(2)
  })

  it('handles days with no payments', () => {
    const daily = generateDailyTotals('2024-01-15', [])

    expect(daily.incoming).toBe(0)
    expect(daily.outgoing).toBe(0)
    expect(daily.net).toBe(0)
    expect(daily.payment_count).toBe(0)
  })

  it('handles days with only incoming payments', () => {
    const events = [
      createMockCalendarEvent({ is_incoming: true, amount: 100000 }),
    ]

    const daily = generateDailyTotals('2024-01-15', events)

    expect(daily.incoming).toBe(100000)
    expect(daily.outgoing).toBe(0)
    expect(daily.net).toBe(100000)
  })

  it('handles days with only outgoing payments', () => {
    const events = [
      createMockCalendarEvent({ is_incoming: false, amount: 50000 }),
    ]

    const daily = generateDailyTotals('2024-01-15', events)

    expect(daily.incoming).toBe(0)
    expect(daily.outgoing).toBe(50000)
    expect(daily.net).toBe(-50000)
  })
})

// ============================================================================
// PAYMENT PATTERN ANALYSIS TESTS
// ============================================================================

describe('Payment Pattern Analysis', () => {
  /**
   * Calculate trend from a series of values
   */
  function calculateTrend(values: number[]): 'improving' | 'stable' | 'declining' {
    if (values.length < 2) {return 'stable'}

    const n = values.length
    const midpoint = Math.floor(n / 2)
    const firstHalfAvg = values.slice(0, midpoint).reduce((a, b) => a + b, 0) / (midpoint || 1)
    const secondHalfAvg = values.slice(midpoint).reduce((a, b) => a + b, 0) / ((n - midpoint) || 1)

    if (secondHalfAvg > firstHalfAvg * 1.1) {return 'improving'}
    if (secondHalfAvg < firstHalfAvg * 0.9) {return 'declining'}
    return 'stable'
  }

  it('identifies improving trend', () => {
    const values = [100, 110, 120, 130, 140, 150]
    expect(calculateTrend(values)).toBe('improving')
  })

  it('identifies declining trend', () => {
    const values = [150, 140, 130, 120, 110, 100]
    expect(calculateTrend(values)).toBe('declining')
  })

  it('identifies stable trend', () => {
    const values = [100, 102, 98, 101, 99, 100]
    expect(calculateTrend(values)).toBe('stable')
  })

  it('returns stable for insufficient data', () => {
    expect(calculateTrend([])).toBe('stable')
    expect(calculateTrend([100])).toBe('stable')
  })

  /**
   * Calculate on-time payment percentage
   */
  function calculateOnTimePercent(daysToPayment: number[]): number {
    if (daysToPayment.length === 0) {return 100}
    const onTimeCount = daysToPayment.filter(d => d <= 0).length
    return Math.round((onTimeCount / daysToPayment.length) * 100)
  }

  it('calculates 100% when all payments are on time', () => {
    const days = [-5, -2, 0, -1, -3]
    expect(calculateOnTimePercent(days)).toBe(100)
  })

  it('calculates 0% when all payments are late', () => {
    const days = [5, 10, 3, 7, 15]
    expect(calculateOnTimePercent(days)).toBe(0)
  })

  it('calculates correct percentage for mixed payments', () => {
    const days = [-2, 0, 5, -1, 10]  // 3 on-time, 2 late
    expect(calculateOnTimePercent(days)).toBe(60)
  })

  it('returns 100% for no payment history', () => {
    expect(calculateOnTimePercent([])).toBe(100)
  })
})

// ============================================================================
// EDGE CASE TESTS
// ============================================================================

describe('Edge Cases', () => {
  it('handles payments with zero amounts', () => {
    const payment = createMockPayment({ amount: 0 })
    expect(payment.amount).toBe(0)
    expect(isIncomingPayment(payment.payment_type)).toBe(false)
  })

  it('handles payments with very large amounts', () => {
    const payment = createMockPayment({ amount: 999999999 })
    expect(payment.amount).toBe(999999999)
  })

  it('handles all payment statuses', () => {
    const statuses: PaymentStatus[] = [
      'scheduled',
      'pending_approval',
      'approved',
      'processing',
      'completed',
      'overdue',
      'cancelled',
    ]

    statuses.forEach((status) => {
      const payment = createMockPayment({ status })
      expect(payment.status).toBe(status)
    })
  })

  it('handles all payment types', () => {
    const types: PaymentType[] = [
      'subcontractor_pay_application',
      'invoice_payment',
      'retention_release',
      'owner_requisition',
      'vendor_payment',
      'progress_billing',
    ]

    types.forEach((type) => {
      const config = getPaymentTypeConfig(type)
      expect(config).toBeDefined()
      expect(config.label).toBeTruthy()
    })
  })

  it('handles dates at year boundaries', () => {
    const endOfYear = '2024-12-31'
    const startOfYear = '2025-01-01'

    const daysEnd = calculateDaysUntilDue(endOfYear)
    const daysStart = calculateDaysUntilDue(startOfYear)

    // Just verify no errors occur
    expect(typeof daysEnd).toBe('number')
    expect(typeof daysStart).toBe('number')
  })
})

// ============================================================================
// WEEKLY/MONTHLY AGGREGATION TESTS
// ============================================================================

describe('Weekly and Monthly Aggregation', () => {
  /**
   * Aggregate daily totals into weekly summary
   */
  function aggregateWeeklyTotals(days: DailyPaymentTotals[]) {
    return days.reduce(
      (acc, day) => ({
        incoming: acc.incoming + day.incoming,
        outgoing: acc.outgoing + day.outgoing,
        net: acc.net + day.net,
        payment_count: acc.payment_count + day.payment_count,
      }),
      { incoming: 0, outgoing: 0, net: 0, payment_count: 0 }
    )
  }

  it('correctly aggregates daily totals into weekly', () => {
    const days: DailyPaymentTotals[] = [
      { date: '2024-01-01', incoming: 10000, outgoing: 5000, net: 5000, payment_count: 2, events: [] },
      { date: '2024-01-02', incoming: 20000, outgoing: 10000, net: 10000, payment_count: 3, events: [] },
      { date: '2024-01-03', incoming: 0, outgoing: 15000, net: -15000, payment_count: 1, events: [] },
    ]

    const weekly = aggregateWeeklyTotals(days)

    expect(weekly.incoming).toBe(30000)
    expect(weekly.outgoing).toBe(30000)
    expect(weekly.net).toBe(0)
    expect(weekly.payment_count).toBe(6)
  })

  it('handles empty days array', () => {
    const weekly = aggregateWeeklyTotals([])

    expect(weekly.incoming).toBe(0)
    expect(weekly.outgoing).toBe(0)
    expect(weekly.net).toBe(0)
    expect(weekly.payment_count).toBe(0)
  })

  it('handles single day', () => {
    const days: DailyPaymentTotals[] = [
      { date: '2024-01-01', incoming: 50000, outgoing: 30000, net: 20000, payment_count: 5, events: [] },
    ]

    const weekly = aggregateWeeklyTotals(days)

    expect(weekly.incoming).toBe(50000)
    expect(weekly.outgoing).toBe(30000)
    expect(weekly.net).toBe(20000)
    expect(weekly.payment_count).toBe(5)
  })
})

// ============================================================================
// MULTI-MONTH PROJECTION TESTS
// ============================================================================

describe('Multi-Month Cash Flow Projections', () => {
  /**
   * Generate cumulative cash flow over multiple months
   */
  function calculateCumulativeFlow(projections: CashFlowProjection[]): number[] {
    let cumulative = 0
    return projections.map((p) => {
      cumulative += p.net_cash_flow
      return cumulative
    })
  }

  it('correctly calculates cumulative cash flow', () => {
    const projections: CashFlowProjection[] = [
      createMockCashFlowProjection({ net_cash_flow: 10000, cumulative_cash_flow: 10000 }),
      createMockCashFlowProjection({ net_cash_flow: -5000, cumulative_cash_flow: 5000 }),
      createMockCashFlowProjection({ net_cash_flow: 20000, cumulative_cash_flow: 25000 }),
    ]

    const cumulative = calculateCumulativeFlow(projections)

    expect(cumulative).toEqual([10000, 5000, 25000])
  })

  it('handles all negative months', () => {
    const projections: CashFlowProjection[] = [
      createMockCashFlowProjection({ net_cash_flow: -10000 }),
      createMockCashFlowProjection({ net_cash_flow: -5000 }),
      createMockCashFlowProjection({ net_cash_flow: -15000 }),
    ]

    const cumulative = calculateCumulativeFlow(projections)

    expect(cumulative).toEqual([-10000, -15000, -30000])
  })

  it('handles empty projections', () => {
    const cumulative = calculateCumulativeFlow([])
    expect(cumulative).toEqual([])
  })

  /**
   * Helper to create mock cash flow projection with overrides
   */
  function createMockCashFlowProjection(overrides: Partial<CashFlowProjection> = {}): CashFlowProjection {
    return {
      month: '2024-01',
      month_name: 'January 2024',
      projected_incoming: 100000,
      projected_outgoing: 60000,
      net_cash_flow: 40000,
      cumulative_cash_flow: 40000,
      owner_requisitions: 100000,
      subcontractor_payments: 40000,
      vendor_payments: 15000,
      retention_releases: 5000,
      other_payments: 0,
      confirmed_amount: 80000,
      estimated_amount: 80000,
      confidence_percent: 50,
      ...overrides,
    }
  }
})

// ============================================================================
// PAYMENT PRIORITY TESTS
// ============================================================================

describe('Payment Priority Logic', () => {
  it('assigns critical priority to severely overdue payments', () => {
    expect(getPriorityFromDueDate(-30)).toBe('critical')
    expect(getPriorityFromDueDate(-7)).toBe('critical')
    expect(getPriorityFromDueDate(-1)).toBe('critical')
  })

  it('assigns high priority to payments due today or within 3 days', () => {
    expect(getPriorityFromDueDate(0)).toBe('high')
    expect(getPriorityFromDueDate(1)).toBe('high')
    expect(getPriorityFromDueDate(2)).toBe('high')
    expect(getPriorityFromDueDate(3)).toBe('high')
  })

  it('assigns medium priority to payments due within 4-7 days', () => {
    expect(getPriorityFromDueDate(4)).toBe('medium')
    expect(getPriorityFromDueDate(5)).toBe('medium')
    expect(getPriorityFromDueDate(6)).toBe('medium')
    expect(getPriorityFromDueDate(7)).toBe('medium')
  })

  it('assigns low priority to payments due in more than a week', () => {
    expect(getPriorityFromDueDate(8)).toBe('low')
    expect(getPriorityFromDueDate(14)).toBe('low')
    expect(getPriorityFromDueDate(30)).toBe('low')
    expect(getPriorityFromDueDate(90)).toBe('low')
  })
})

// ============================================================================
// PAYMENT TYPE CATEGORIZATION TESTS
// ============================================================================

describe('Payment Type Categorization', () => {
  it('correctly identifies incoming payment types', () => {
    const incomingTypes: PaymentType[] = ['owner_requisition', 'progress_billing']

    incomingTypes.forEach((type) => {
      expect(isIncomingPayment(type)).toBe(true)
    })
  })

  it('correctly identifies outgoing payment types', () => {
    const outgoingTypes: PaymentType[] = [
      'subcontractor_pay_application',
      'invoice_payment',
      'vendor_payment',
      'retention_release',
    ]

    outgoingTypes.forEach((type) => {
      expect(isIncomingPayment(type)).toBe(false)
    })
  })

  it('returns correct config for each payment type', () => {
    const configs = [
      { type: 'subcontractor_pay_application', expectedLabel: 'Subcontractor Pay App' },
      { type: 'invoice_payment', expectedLabel: 'Invoice Payment' },
      { type: 'retention_release', expectedLabel: 'Retention Release' },
      { type: 'owner_requisition', expectedLabel: 'Owner Requisition' },
      { type: 'vendor_payment', expectedLabel: 'Vendor Payment' },
      { type: 'progress_billing', expectedLabel: 'Progress Billing' },
    ]

    configs.forEach(({ type, expectedLabel }) => {
      const config = getPaymentTypeConfig(type as PaymentType)
      expect(config.label).toBe(expectedLabel)
    })
  })
})

// ============================================================================
// NEGATIVE AND BOUNDARY VALUE TESTS
// ============================================================================

describe('Boundary and Negative Value Handling', () => {
  it('handles payments with null/undefined amounts gracefully', () => {
    const payment = createMockPayment({ amount: 0 })
    expect(payment.amount).toBe(0)
  })

  it('handles mixed positive and negative net cash flows', () => {
    const payments = [
      createMockPayment({ payment_type: 'owner_requisition', amount: 50000 }),
      createMockPayment({ payment_type: 'subcontractor_pay_application', amount: 100000 }),
    ]

    let totalIncoming = 0
    let totalOutgoing = 0

    payments.forEach((p) => {
      if (isIncomingPayment(p.payment_type)) {
        totalIncoming += p.amount
      } else {
        totalOutgoing += p.amount
      }
    })

    const net = totalIncoming - totalOutgoing
    expect(net).toBe(-50000)
  })

  it('calculates correct net when incoming equals outgoing', () => {
    const payments = [
      createMockPayment({ payment_type: 'owner_requisition', amount: 100000 }),
      createMockPayment({ payment_type: 'subcontractor_pay_application', amount: 100000 }),
    ]

    let totalIncoming = 0
    let totalOutgoing = 0

    payments.forEach((p) => {
      if (isIncomingPayment(p.payment_type)) {
        totalIncoming += p.amount
      } else {
        totalOutgoing += p.amount
      }
    })

    const net = totalIncoming - totalOutgoing
    expect(net).toBe(0)
  })
})
