// File: /src/types/payment-application.test.ts
// Tests for payment application types and constants

import { describe, it, expect } from 'vitest'
import {
  PAYMENT_APPLICATION_STATUSES,
  RETAINAGE_OPTIONS,
  AGING_BUCKETS,
  DEFAULT_AGING_ALERT_CONFIG,
  type PaymentApplicationStatus,
  type AgingBucket,
  type PaymentApplication,
  type ScheduleOfValuesItem,
  type CreatePaymentApplicationDTO,
  type PaymentApplicationFilters,
  type ProjectPaymentSummary,
  type AgingReceivable,
  type AgingBucketSummary,
  type PaymentAgingReport,
  type DSOMetrics,
  type CashFlowForecastItem,
} from './payment-application'

describe('Payment Application Types', () => {
  describe('PAYMENT_APPLICATION_STATUSES', () => {
    it('should have all expected statuses', () => {
      const values = PAYMENT_APPLICATION_STATUSES.map((s) => s.value)
      expect(values).toContain('draft')
      expect(values).toContain('submitted')
      expect(values).toContain('under_review')
      expect(values).toContain('approved')
      expect(values).toContain('rejected')
      expect(values).toContain('paid')
      expect(values).toContain('void')
    })

    it('should have exactly 7 statuses', () => {
      expect(PAYMENT_APPLICATION_STATUSES).toHaveLength(7)
    })

    it('should have labels for all statuses', () => {
      PAYMENT_APPLICATION_STATUSES.forEach((status) => {
        expect(status.label).toBeDefined()
        expect(status.label.length).toBeGreaterThan(0)
      })
    })

    it('should have colors for all statuses', () => {
      PAYMENT_APPLICATION_STATUSES.forEach((status) => {
        expect(status.color).toBeDefined()
      })
    })

    it('should have descriptions for all statuses', () => {
      PAYMENT_APPLICATION_STATUSES.forEach((status) => {
        expect(status.description).toBeDefined()
        expect(status.description.length).toBeGreaterThan(0)
      })
    })

    it('should have appropriate colors for status severity', () => {
      const draft = PAYMENT_APPLICATION_STATUSES.find((s) => s.value === 'draft')
      expect(draft?.color).toBe('gray')

      const submitted = PAYMENT_APPLICATION_STATUSES.find((s) => s.value === 'submitted')
      expect(submitted?.color).toBe('blue')

      const approved = PAYMENT_APPLICATION_STATUSES.find((s) => s.value === 'approved')
      expect(approved?.color).toBe('green')

      const rejected = PAYMENT_APPLICATION_STATUSES.find((s) => s.value === 'rejected')
      expect(rejected?.color).toBe('red')

      const paid = PAYMENT_APPLICATION_STATUSES.find((s) => s.value === 'paid')
      expect(paid?.color).toBe('emerald')
    })
  })

  describe('RETAINAGE_OPTIONS', () => {
    it('should have common retainage percentages', () => {
      const values = RETAINAGE_OPTIONS.map((r) => r.value)
      expect(values).toContain(0)
      expect(values).toContain(5)
      expect(values).toContain(10)
      expect(values).toContain(15)
    })

    it('should have labels for all options', () => {
      RETAINAGE_OPTIONS.forEach((option) => {
        expect(option.label).toBeDefined()
        expect(option.label).toContain('%')
      })
    })

    it('should have exactly 4 options', () => {
      expect(RETAINAGE_OPTIONS).toHaveLength(4)
    })

    it('should have 10% retainage as standard', () => {
      const tenPercent = RETAINAGE_OPTIONS.find((r) => r.value === 10)
      expect(tenPercent).toBeDefined()
      expect(tenPercent?.label).toBe('10%')
    })
  })

  describe('AGING_BUCKETS', () => {
    it('should have all expected aging periods', () => {
      const keys = AGING_BUCKETS.map((b) => b.key)
      expect(keys).toContain('current')
      expect(keys).toContain('1-30')
      expect(keys).toContain('31-60')
      expect(keys).toContain('61-90')
      expect(keys).toContain('90+')
    })

    it('should have exactly 5 buckets', () => {
      expect(AGING_BUCKETS).toHaveLength(5)
    })

    it('should have correct day ranges', () => {
      const current = AGING_BUCKETS.find((b) => b.key === 'current')
      expect(current?.minDays).toBe(0)
      expect(current?.maxDays).toBe(0)

      const days1to30 = AGING_BUCKETS.find((b) => b.key === '1-30')
      expect(days1to30?.minDays).toBe(1)
      expect(days1to30?.maxDays).toBe(30)

      const days31to60 = AGING_BUCKETS.find((b) => b.key === '31-60')
      expect(days31to60?.minDays).toBe(31)
      expect(days31to60?.maxDays).toBe(60)

      const days61to90 = AGING_BUCKETS.find((b) => b.key === '61-90')
      expect(days61to90?.minDays).toBe(61)
      expect(days61to90?.maxDays).toBe(90)

      const over90 = AGING_BUCKETS.find((b) => b.key === '90+')
      expect(over90?.minDays).toBe(91)
      expect(over90?.maxDays).toBeNull()
    })

    it('should have severity-appropriate colors', () => {
      const current = AGING_BUCKETS.find((b) => b.key === 'current')
      expect(current?.color).toBe('green')

      const over90 = AGING_BUCKETS.find((b) => b.key === '90+')
      expect(over90?.color).toBe('red')
    })

    it('should have labels for all buckets', () => {
      AGING_BUCKETS.forEach((bucket) => {
        expect(bucket.label).toBeDefined()
        expect(bucket.label.length).toBeGreaterThan(0)
      })
    })
  })

  describe('DEFAULT_AGING_ALERT_CONFIG', () => {
    it('should have warning threshold', () => {
      expect(DEFAULT_AGING_ALERT_CONFIG.warn_at_days).toBe(30)
    })

    it('should have critical threshold', () => {
      expect(DEFAULT_AGING_ALERT_CONFIG.critical_at_days).toBe(60)
    })

    it('should have auto-escalate threshold', () => {
      expect(DEFAULT_AGING_ALERT_CONFIG.auto_escalate_at_days).toBe(90)
    })

    it('should have escalation role', () => {
      expect(DEFAULT_AGING_ALERT_CONFIG.escalate_to_role).toBe('project_manager')
    })

    it('should have thresholds in ascending order', () => {
      expect(DEFAULT_AGING_ALERT_CONFIG.warn_at_days).toBeLessThan(
        DEFAULT_AGING_ALERT_CONFIG.critical_at_days
      )
      expect(DEFAULT_AGING_ALERT_CONFIG.critical_at_days).toBeLessThan(
        DEFAULT_AGING_ALERT_CONFIG.auto_escalate_at_days
      )
    })
  })

  describe('PaymentApplicationStatus type', () => {
    it('should accept valid statuses', () => {
      const statuses: PaymentApplicationStatus[] = [
        'draft',
        'submitted',
        'under_review',
        'approved',
        'rejected',
        'paid',
        'void',
      ]
      expect(statuses).toHaveLength(7)
    })
  })

  describe('AgingBucket type', () => {
    it('should accept valid aging buckets', () => {
      const buckets: AgingBucket[] = ['current', '1-30', '31-60', '61-90', '90+']
      expect(buckets).toHaveLength(5)
    })
  })

  describe('PaymentApplication interface', () => {
    it('should have all G702 required fields', () => {
      const app: PaymentApplication = {
        id: 'app-1',
        project_id: 'project-1',
        company_id: 'company-1',
        application_number: 1,
        period_to: '2024-03-31',
        original_contract_sum: 1000000,
        net_change_orders: 50000,
        contract_sum_to_date: 1050000,
        total_completed_previous: 400000,
        total_completed_this_period: 100000,
        total_materials_stored: 25000,
        total_completed_and_stored: 525000,
        retainage_percent: 10,
        retainage_from_completed: 50000,
        retainage_from_stored: 2500,
        total_retainage: 52500,
        retainage_release: 0,
        total_earned_less_retainage: 472500,
        less_previous_certificates: 360000,
        current_payment_due: 112500,
        balance_to_finish: 577500,
        percent_complete: 50,
        status: 'draft',
        submitted_at: null,
        submitted_by: null,
        reviewed_at: null,
        reviewed_by: null,
        approved_at: null,
        approved_by: null,
        paid_at: null,
        payment_received_amount: null,
        payment_reference: null,
        contractor_signature_url: null,
        contractor_signature_date: null,
        architect_signature_url: null,
        architect_signature_date: null,
        owner_signature_url: null,
        owner_signature_date: null,
        notes: null,
        rejection_reason: null,
        created_at: '2024-03-01T00:00:00Z',
        updated_at: '2024-03-01T00:00:00Z',
        created_by: 'user-1',
        deleted_at: null,
      }

      expect(app.original_contract_sum).toBe(1000000)
      expect(app.net_change_orders).toBe(50000)
      expect(app.contract_sum_to_date).toBe(1050000)
      expect(app.current_payment_due).toBe(112500)
    })
  })

  describe('ScheduleOfValuesItem interface', () => {
    it('should have all G703 line item fields', () => {
      const item: ScheduleOfValuesItem = {
        id: 'sov-1',
        payment_application_id: 'app-1',
        item_number: '1',
        description: 'General Conditions',
        cost_code_id: 'cost-1',
        cost_code: '01 00 00',
        scheduled_value: 100000,
        change_order_adjustments: 5000,
        total_scheduled_value: 105000,
        work_completed_previous: 40000,
        work_completed_this_period: 10000,
        materials_stored: 5000,
        total_completed_stored: 55000,
        percent_complete: 52.38,
        balance_to_finish: 50000,
        retainage_percent: 10,
        retainage_amount: 5500,
        sort_order: 1,
        notes: null,
        created_at: '2024-03-01T00:00:00Z',
        updated_at: '2024-03-01T00:00:00Z',
      }

      expect(item.scheduled_value).toBe(100000)
      expect(item.total_scheduled_value).toBe(105000)
      expect(item.total_completed_stored).toBe(55000)
    })
  })

  describe('CreatePaymentApplicationDTO interface', () => {
    it('should require minimum fields', () => {
      const dto: CreatePaymentApplicationDTO = {
        project_id: 'project-1',
        period_to: '2024-03-31',
        original_contract_sum: 1000000,
      }

      expect(dto.project_id).toBe('project-1')
      expect(dto.period_to).toBe('2024-03-31')
      expect(dto.original_contract_sum).toBe(1000000)
    })

    it('should allow optional fields', () => {
      const dto: CreatePaymentApplicationDTO = {
        project_id: 'project-1',
        period_to: '2024-03-31',
        original_contract_sum: 1000000,
        net_change_orders: 50000,
        retainage_percent: 10,
        notes: 'Initial application',
      }

      expect(dto.net_change_orders).toBe(50000)
      expect(dto.retainage_percent).toBe(10)
    })
  })

  describe('PaymentApplicationFilters interface', () => {
    it('should support all filter options', () => {
      const filters: PaymentApplicationFilters = {
        projectId: 'project-1',
        status: 'approved',
        dateFrom: '2024-01-01',
        dateTo: '2024-12-31',
      }

      expect(filters.projectId).toBe('project-1')
      expect(filters.status).toBe('approved')
    })
  })

  describe('ProjectPaymentSummary interface', () => {
    it('should have all expected summary fields', () => {
      const summary: ProjectPaymentSummary = {
        total_applications: 10,
        total_billed: 500000,
        total_received: 400000,
        total_outstanding: 100000,
        total_retainage_held: 50000,
        last_application_date: '2024-03-15',
        last_payment_date: '2024-03-01',
        percent_billed: 50,
      }

      expect(summary.total_billed).toBe(500000)
      expect(summary.total_outstanding).toBe(100000)
      expect(summary.percent_billed).toBe(50)
    })
  })

  describe('AgingReceivable interface', () => {
    it('should have all expected fields', () => {
      const receivable: AgingReceivable = {
        id: 'app-1',
        project_id: 'project-1',
        project_name: 'Test Project',
        project_number: 'P-001',
        application_number: 3,
        display_number: 'App #3',
        period_to: '2024-03-31',
        submitted_at: '2024-04-01',
        approved_at: '2024-04-05',
        status: 'approved',
        amount_due: 100000,
        amount_received: 0,
        amount_outstanding: 100000,
        retainage_held: 10000,
        days_outstanding: 45,
        aging_bucket: '31-60',
      }

      expect(receivable.days_outstanding).toBe(45)
      expect(receivable.aging_bucket).toBe('31-60')
      expect(receivable.amount_outstanding).toBe(100000)
    })
  })

  describe('AgingBucketSummary interface', () => {
    it('should have all expected fields', () => {
      const summary: AgingBucketSummary = {
        bucket: '31-60',
        label: '31-60 Days',
        count: 5,
        amount: 250000,
        percent: 25,
      }

      expect(summary.bucket).toBe('31-60')
      expect(summary.count).toBe(5)
      expect(summary.percent).toBe(25)
    })
  })

  describe('DSOMetrics interface', () => {
    it('should have all expected fields', () => {
      const metrics: DSOMetrics = {
        current_dso: 42,
        target_dso: 45,
        trend: 'improving',
        trend_change_days: -3,
        historical: [
          { period: '2024-01', dso: 48 },
          { period: '2024-02', dso: 45 },
          { period: '2024-03', dso: 42 },
        ],
      }

      expect(metrics.current_dso).toBe(42)
      expect(metrics.trend).toBe('improving')
      expect(metrics.historical).toHaveLength(3)
    })

    it('should accept all trend values', () => {
      const improvingMetrics: DSOMetrics = {
        current_dso: 40,
        target_dso: 45,
        trend: 'improving',
        trend_change_days: -5,
        historical: [],
      }

      const stableMetrics: DSOMetrics = {
        current_dso: 45,
        target_dso: 45,
        trend: 'stable',
        trend_change_days: 0,
        historical: [],
      }

      const worseningMetrics: DSOMetrics = {
        current_dso: 55,
        target_dso: 45,
        trend: 'worsening',
        trend_change_days: 10,
        historical: [],
      }

      expect(improvingMetrics.trend).toBe('improving')
      expect(stableMetrics.trend).toBe('stable')
      expect(worseningMetrics.trend).toBe('worsening')
    })
  })

  describe('CashFlowForecastItem interface', () => {
    it('should have all expected fields', () => {
      const forecast: CashFlowForecastItem = {
        date: '2024-04-15',
        expected_receipts: 150000,
        confidence: 'high',
        source_applications: ['app-1', 'app-2'],
      }

      expect(forecast.expected_receipts).toBe(150000)
      expect(forecast.confidence).toBe('high')
      expect(forecast.source_applications).toHaveLength(2)
    })

    it('should accept all confidence levels', () => {
      const highConfidence: CashFlowForecastItem = {
        date: '2024-04-15',
        expected_receipts: 100000,
        confidence: 'high',
        source_applications: [],
      }

      const mediumConfidence: CashFlowForecastItem = {
        date: '2024-04-30',
        expected_receipts: 75000,
        confidence: 'medium',
        source_applications: [],
      }

      const lowConfidence: CashFlowForecastItem = {
        date: '2024-05-15',
        expected_receipts: 50000,
        confidence: 'low',
        source_applications: [],
      }

      expect(highConfidence.confidence).toBe('high')
      expect(mediumConfidence.confidence).toBe('medium')
      expect(lowConfidence.confidence).toBe('low')
    })
  })

  describe('G702 Calculation Validation', () => {
    it('should validate contract sum calculation', () => {
      const originalContractSum = 1000000
      const netChangeOrders = 75000
      const contractSumToDate = originalContractSum + netChangeOrders

      expect(contractSumToDate).toBe(1075000)
    })

    it('should validate total completed and stored calculation', () => {
      const completedPrevious = 400000
      const completedThisPeriod = 100000
      const materialsStored = 25000
      const totalCompletedAndStored = completedPrevious + completedThisPeriod + materialsStored

      expect(totalCompletedAndStored).toBe(525000)
    })

    it('should validate retainage calculation', () => {
      const totalCompleted = 500000
      const materialsStored = 25000
      const retainagePercent = 10

      const retainageFromCompleted = totalCompleted * (retainagePercent / 100)
      const retainageFromStored = materialsStored * (retainagePercent / 100)
      const totalRetainage = retainageFromCompleted + retainageFromStored

      expect(retainageFromCompleted).toBe(50000)
      expect(retainageFromStored).toBe(2500)
      expect(totalRetainage).toBe(52500)
    })

    it('should validate current payment due calculation (G702 Line 8)', () => {
      const totalCompletedAndStored = 525000
      const totalRetainage = 52500
      const totalEarnedLessRetainage = totalCompletedAndStored - totalRetainage
      const lessPreviousCertificates = 360000
      const currentPaymentDue = totalEarnedLessRetainage - lessPreviousCertificates

      expect(totalEarnedLessRetainage).toBe(472500)
      expect(currentPaymentDue).toBe(112500)
    })

    it('should validate balance to finish calculation (G702 Line 9)', () => {
      const contractSumToDate = 1075000
      const totalEarnedLessRetainage = 472500
      const balanceToFinish = contractSumToDate - totalEarnedLessRetainage

      expect(balanceToFinish).toBe(602500)
    })

    it('should validate percent complete calculation', () => {
      const totalCompletedAndStored = 525000
      const contractSumToDate = 1050000
      const percentComplete = (totalCompletedAndStored / contractSumToDate) * 100

      expect(percentComplete).toBe(50)
    })
  })
})
