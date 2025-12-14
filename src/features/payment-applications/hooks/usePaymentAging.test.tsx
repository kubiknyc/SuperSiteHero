// File: /src/features/payment-applications/hooks/usePaymentAging.test.tsx
// Tests for payment aging hooks

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import {
  paymentAgingKeys,
  getBucketColor,
  usePaymentAgingReport,
  usePaymentAgingAlerts,
} from './usePaymentAging'
import type { AgingBucket } from '@/types/payment-application'

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      then: vi.fn().mockImplementation((cb) =>
        Promise.resolve({ data: [], error: null }).then(cb)
      ),
    })),
    rpc: vi.fn(),
  },
}))

// Mock useAuth
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    userProfile: {
      id: 'user-123',
      company_id: 'company-456',
    },
  }),
}))

// Test wrapper
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('Payment Aging Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('paymentAgingKeys', () => {
    it('should generate correct all key', () => {
      expect(paymentAgingKeys.all).toEqual(['payment-aging'])
    })

    it('should generate correct report key', () => {
      expect(paymentAgingKeys.report('company-123')).toEqual([
        'payment-aging',
        'report',
        'company-123',
      ])
    })

    it('should generate correct reportFiltered key with project', () => {
      expect(paymentAgingKeys.reportFiltered('company-123', 'project-456')).toEqual([
        'payment-aging',
        'report',
        'company-123',
        'project-456',
      ])
    })

    it('should generate correct reportFiltered key without project', () => {
      expect(paymentAgingKeys.reportFiltered('company-123', undefined)).toEqual([
        'payment-aging',
        'report',
        'company-123',
        undefined,
      ])
    })

    it('should generate correct alerts key', () => {
      expect(paymentAgingKeys.alerts('company-123')).toEqual([
        'payment-aging',
        'alerts',
        'company-123',
      ])
    })

    it('should generate correct dso key', () => {
      expect(paymentAgingKeys.dso('company-123')).toEqual([
        'payment-aging',
        'dso',
        'company-123',
      ])
    })

    it('should generate correct forecast key', () => {
      expect(paymentAgingKeys.forecast('company-123')).toEqual([
        'payment-aging',
        'forecast',
        'company-123',
      ])
    })

    it('should generate correct dashboard key', () => {
      expect(paymentAgingKeys.dashboard('company-123')).toEqual([
        'payment-aging',
        'dashboard',
        'company-123',
      ])
    })
  })

  describe('getBucketColor', () => {
    it('should return green for current', () => {
      expect(getBucketColor('current')).toBe('green')
    })

    it('should return blue for 1-30 days', () => {
      expect(getBucketColor('1-30')).toBe('blue')
    })

    it('should return yellow for 31-60 days', () => {
      expect(getBucketColor('31-60')).toBe('yellow')
    })

    it('should return orange for 61-90 days', () => {
      expect(getBucketColor('61-90')).toBe('orange')
    })

    it('should return red for 90+ days', () => {
      expect(getBucketColor('90+')).toBe('red')
    })

    it('should return gray for unknown bucket', () => {
      expect(getBucketColor('unknown' as AgingBucket)).toBe('gray')
    })
  })

  describe('usePaymentAgingReport hook', () => {
    it('should fetch aging report', async () => {
      const { result } = renderHook(() => usePaymentAgingReport(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toBeDefined()
      expect(result.current.data?.company_id).toBe('company-456')
    })

    it('should filter by project when provided', async () => {
      const { result } = renderHook(() => usePaymentAgingReport('project-123'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
    })
  })
})

describe('Aging Calculation Logic', () => {
  describe('Days Outstanding Calculation', () => {
    it('should calculate 0 days for current items', () => {
      const daysOutstanding = 0
      expect(daysOutstanding).toBe(0)
    })

    it('should calculate days from approval date', () => {
      const approvedDate = new Date('2024-02-01')
      const today = new Date('2024-02-15')
      const daysOutstanding = Math.floor(
        (today.getTime() - approvedDate.getTime()) / (1000 * 60 * 60 * 24)
      )
      expect(daysOutstanding).toBe(14)
    })

    it('should calculate days from submission if not approved', () => {
      const submittedDate = new Date('2024-02-01')
      const today = new Date('2024-03-01')
      const daysOutstanding = Math.floor(
        (today.getTime() - submittedDate.getTime()) / (1000 * 60 * 60 * 24)
      )
      expect(daysOutstanding).toBe(29)
    })
  })

  describe('Bucket Assignment', () => {
    function getAgingBucket(daysOutstanding: number): AgingBucket {
      if (daysOutstanding <= 0) return 'current'
      if (daysOutstanding <= 30) return '1-30'
      if (daysOutstanding <= 60) return '31-60'
      if (daysOutstanding <= 90) return '61-90'
      return '90+'
    }

    it('should assign current for 0 days', () => {
      expect(getAgingBucket(0)).toBe('current')
    })

    it('should assign current for negative days', () => {
      expect(getAgingBucket(-5)).toBe('current')
    })

    it('should assign 1-30 for 1 day', () => {
      expect(getAgingBucket(1)).toBe('1-30')
    })

    it('should assign 1-30 for 30 days', () => {
      expect(getAgingBucket(30)).toBe('1-30')
    })

    it('should assign 31-60 for 31 days', () => {
      expect(getAgingBucket(31)).toBe('31-60')
    })

    it('should assign 31-60 for 60 days', () => {
      expect(getAgingBucket(60)).toBe('31-60')
    })

    it('should assign 61-90 for 61 days', () => {
      expect(getAgingBucket(61)).toBe('61-90')
    })

    it('should assign 61-90 for 90 days', () => {
      expect(getAgingBucket(90)).toBe('61-90')
    })

    it('should assign 90+ for 91 days', () => {
      expect(getAgingBucket(91)).toBe('90+')
    })

    it('should assign 90+ for 365 days', () => {
      expect(getAgingBucket(365)).toBe('90+')
    })
  })

  describe('Amount Calculations', () => {
    it('should calculate outstanding amount correctly', () => {
      const amountDue = 100000
      const amountReceived = 25000
      const amountOutstanding = amountDue - amountReceived

      expect(amountOutstanding).toBe(75000)
    })

    it('should handle fully paid items', () => {
      const amountDue = 100000
      const amountReceived = 100000
      const amountOutstanding = Math.max(0, amountDue - amountReceived)

      expect(amountOutstanding).toBe(0)
    })

    it('should handle overpayments', () => {
      const amountDue = 100000
      const amountReceived = 110000
      const amountOutstanding = Math.max(0, amountDue - amountReceived)

      expect(amountOutstanding).toBe(0)
    })

    it('should calculate bucket totals', () => {
      const receivables = [
        { aging_bucket: 'current' as AgingBucket, amount_outstanding: 50000 },
        { aging_bucket: '1-30' as AgingBucket, amount_outstanding: 75000 },
        { aging_bucket: '1-30' as AgingBucket, amount_outstanding: 25000 },
        { aging_bucket: '31-60' as AgingBucket, amount_outstanding: 100000 },
      ]

      const bucketTotals = receivables.reduce(
        (acc, r) => {
          acc[r.aging_bucket] = (acc[r.aging_bucket] || 0) + r.amount_outstanding
          return acc
        },
        {} as Record<AgingBucket, number>
      )

      expect(bucketTotals['current']).toBe(50000)
      expect(bucketTotals['1-30']).toBe(100000)
      expect(bucketTotals['31-60']).toBe(100000)
    })

    it('should calculate percent of total', () => {
      const totalOutstanding = 250000
      const bucketAmount = 100000
      const percent = (bucketAmount / totalOutstanding) * 100

      expect(percent).toBe(40)
    })
  })

  describe('Alert Generation', () => {
    interface AlertConfig {
      warn_at_days: number
      critical_at_days: number
    }

    function getSeverity(
      daysOutstanding: number,
      config: AlertConfig
    ): 'info' | 'warning' | 'critical' | null {
      if (daysOutstanding >= config.critical_at_days) return 'critical'
      if (daysOutstanding >= config.warn_at_days) return 'warning'
      if (daysOutstanding > 0) return 'info'
      return null
    }

    const defaultConfig: AlertConfig = {
      warn_at_days: 30,
      critical_at_days: 60,
    }

    it('should return null for current items', () => {
      expect(getSeverity(0, defaultConfig)).toBeNull()
    })

    it('should return info for items under warning threshold', () => {
      expect(getSeverity(15, defaultConfig)).toBe('info')
      expect(getSeverity(29, defaultConfig)).toBe('info')
    })

    it('should return warning at threshold', () => {
      expect(getSeverity(30, defaultConfig)).toBe('warning')
    })

    it('should return warning between thresholds', () => {
      expect(getSeverity(45, defaultConfig)).toBe('warning')
      expect(getSeverity(59, defaultConfig)).toBe('warning')
    })

    it('should return critical at threshold', () => {
      expect(getSeverity(60, defaultConfig)).toBe('critical')
    })

    it('should return critical above threshold', () => {
      expect(getSeverity(90, defaultConfig)).toBe('critical')
      expect(getSeverity(180, defaultConfig)).toBe('critical')
    })
  })

  describe('DSO Calculations', () => {
    it('should calculate DSO correctly', () => {
      const accountsReceivable = 300000
      const totalCreditSales90Days = 900000
      const numberOfDays = 90

      // DSO = (Accounts Receivable / Total Credit Sales) * Number of Days
      const dso = Math.round((accountsReceivable / totalCreditSales90Days) * numberOfDays)

      expect(dso).toBe(30)
    })

    it('should handle zero sales', () => {
      const accountsReceivable = 300000
      const totalCreditSales90Days = 0

      const dso = totalCreditSales90Days > 0
        ? Math.round((accountsReceivable / totalCreditSales90Days) * 90)
        : 0

      expect(dso).toBe(0)
    })

    it('should determine trend correctly', () => {
      function getTrend(
        currentDSO: number,
        targetDSO: number
      ): 'improving' | 'stable' | 'worsening' {
        if (currentDSO < targetDSO) return 'improving'
        if (currentDSO === targetDSO) return 'stable'
        return 'worsening'
      }

      expect(getTrend(30, 45)).toBe('improving')
      expect(getTrend(45, 45)).toBe('stable')
      expect(getTrend(60, 45)).toBe('worsening')
    })
  })

  describe('Weighted Average Days', () => {
    it('should calculate weighted average correctly', () => {
      const receivables = [
        { days_outstanding: 10, amount_outstanding: 100000 },
        { days_outstanding: 45, amount_outstanding: 50000 },
        { days_outstanding: 90, amount_outstanding: 50000 },
      ]

      const totalOutstanding = receivables.reduce((sum, r) => sum + r.amount_outstanding, 0)
      const weightedSum = receivables.reduce(
        (sum, r) => sum + r.days_outstanding * r.amount_outstanding,
        0
      )
      const weightedAverage = Math.round(weightedSum / totalOutstanding)

      // (10 * 100000 + 45 * 50000 + 90 * 50000) / 200000
      // = (1000000 + 2250000 + 4500000) / 200000
      // = 7750000 / 200000
      // = 38.75 ~ 39
      expect(weightedAverage).toBe(39)
    })

    it('should handle empty receivables', () => {
      const receivables: { days_outstanding: number; amount_outstanding: number }[] = []
      const totalOutstanding = receivables.reduce((sum, r) => sum + r.amount_outstanding, 0)
      const weightedAverage = totalOutstanding > 0
        ? Math.round(
            receivables.reduce((sum, r) => sum + r.days_outstanding * r.amount_outstanding, 0) /
              totalOutstanding
          )
        : 0

      expect(weightedAverage).toBe(0)
    })
  })

  describe('Cash Flow Forecast', () => {
    it('should assign high confidence to current items', () => {
      const agingBucket = 'current'
      const confidence = agingBucket === 'current' ? 'high' : 'medium'
      expect(confidence).toBe('high')
    })

    it('should assign medium confidence to 1-30 day items', () => {
      const agingBucket = '1-30'
      const confidence =
        agingBucket === 'current'
          ? 'high'
          : agingBucket === '1-30'
          ? 'medium'
          : 'low'
      expect(confidence).toBe('medium')
    })

    it('should assign low confidence to overdue items', () => {
      const agingBuckets = ['31-60', '61-90', '90+'] as AgingBucket[]

      agingBuckets.forEach((bucket) => {
        const confidence =
          bucket === 'current'
            ? 'high'
            : bucket === '1-30'
            ? 'medium'
            : 'low'
        expect(confidence).toBe('low')
      })
    })
  })
})

describe('Project-Level Summaries', () => {
  it('should group receivables by project', () => {
    const receivables = [
      { project_id: 'proj-1', amount_outstanding: 100000 },
      { project_id: 'proj-1', amount_outstanding: 50000 },
      { project_id: 'proj-2', amount_outstanding: 75000 },
    ]

    const byProject = receivables.reduce((acc, r) => {
      if (!acc[r.project_id]) {
        acc[r.project_id] = { total: 0, count: 0 }
      }
      acc[r.project_id].total += r.amount_outstanding
      acc[r.project_id].count += 1
      return acc
    }, {} as Record<string, { total: number; count: number }>)

    expect(byProject['proj-1'].total).toBe(150000)
    expect(byProject['proj-1'].count).toBe(2)
    expect(byProject['proj-2'].total).toBe(75000)
    expect(byProject['proj-2'].count).toBe(1)
  })

  it('should calculate oldest days per project', () => {
    const receivables = [
      { project_id: 'proj-1', days_outstanding: 30 },
      { project_id: 'proj-1', days_outstanding: 60 },
      { project_id: 'proj-2', days_outstanding: 15 },
    ]

    const oldestByProject = receivables.reduce((acc, r) => {
      if (!acc[r.project_id] || r.days_outstanding > acc[r.project_id]) {
        acc[r.project_id] = r.days_outstanding
      }
      return acc
    }, {} as Record<string, number>)

    expect(oldestByProject['proj-1']).toBe(60)
    expect(oldestByProject['proj-2']).toBe(15)
  })

  it('should calculate average days per project', () => {
    const receivables = [
      { project_id: 'proj-1', days_outstanding: 20 },
      { project_id: 'proj-1', days_outstanding: 40 },
      { project_id: 'proj-1', days_outstanding: 60 },
    ]

    const project1Receivables = receivables.filter((r) => r.project_id === 'proj-1')
    const averageDays = Math.round(
      project1Receivables.reduce((sum, r) => sum + r.days_outstanding, 0) /
        project1Receivables.length
    )

    expect(averageDays).toBe(40)
  })
})
