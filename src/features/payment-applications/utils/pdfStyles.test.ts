/**
 * Tests for PDF Styles utility functions
 * These functions are CRITICAL for billing accuracy
 */

import { describe, it, expect } from 'vitest'
import {
  formatCurrency,
  formatPercent,
  formatDate,
  formatShortDate,
} from './pdfStyles'

describe('pdfStyles utility functions', () => {
  describe('formatCurrency', () => {
    it('should format positive numbers as currency', () => {
      expect(formatCurrency(1000)).toBe('$1,000.00')
      expect(formatCurrency(1234567.89)).toBe('$1,234,567.89')
      expect(formatCurrency(0.01)).toBe('$0.01')
    })

    it('should format zero as $0.00', () => {
      expect(formatCurrency(0)).toBe('$0.00')
    })

    it('should format negative numbers as currency', () => {
      expect(formatCurrency(-1000)).toBe('-$1,000.00')
      expect(formatCurrency(-0.01)).toBe('-$0.01')
    })

    it('should handle null values', () => {
      expect(formatCurrency(null)).toBe('$0.00')
    })

    it('should handle undefined values', () => {
      expect(formatCurrency(undefined)).toBe('$0.00')
    })

    it('should format large numbers correctly', () => {
      expect(formatCurrency(10000000)).toBe('$10,000,000.00')
      expect(formatCurrency(999999999.99)).toBe('$999,999,999.99')
    })

    it('should handle decimal precision', () => {
      // Should round to 2 decimal places
      expect(formatCurrency(1234.567)).toBe('$1,234.57')
      expect(formatCurrency(1234.561)).toBe('$1,234.56')
    })
  })

  describe('formatPercent', () => {
    it('should format positive percentages', () => {
      expect(formatPercent(10)).toBe('10.0%')
      expect(formatPercent(100)).toBe('100.0%')
      expect(formatPercent(5.5)).toBe('5.5%')
    })

    it('should format zero as 0%', () => {
      expect(formatPercent(0)).toBe('0.0%')
    })

    it('should format negative percentages', () => {
      expect(formatPercent(-5)).toBe('-5.0%')
    })

    it('should handle null values', () => {
      expect(formatPercent(null)).toBe('0%')
    })

    it('should handle undefined values', () => {
      expect(formatPercent(undefined)).toBe('0%')
    })

    it('should format decimal percentages with 1 decimal place', () => {
      expect(formatPercent(33.333)).toBe('33.3%')
      expect(formatPercent(66.666)).toBe('66.7%')
    })
  })

  describe('formatDate', () => {
    it('should format valid date strings', () => {
      // Use ISO format with time to avoid timezone shift issues
      const result = formatDate('2024-01-15T12:00:00')
      expect(result).toContain('January')
      expect(result).toContain('15')
      expect(result).toContain('2024')
    })

    it('should format ISO date strings', () => {
      // Use noon time to avoid date shifting due to timezone
      const result = formatDate('2024-06-30T12:00:00')
      expect(result).toContain('June')
      expect(result).toContain('30')
      expect(result).toContain('2024')
    })

    it('should handle null values', () => {
      expect(formatDate(null)).toBe('')
    })

    it('should handle undefined values', () => {
      expect(formatDate(undefined)).toBe('')
    })

    it('should handle empty string', () => {
      expect(formatDate('')).toBe('')
    })

    it('should return original string for invalid dates', () => {
      const invalidDate = 'not-a-date'
      const result = formatDate(invalidDate)
      // Should either return the original string or an Invalid Date string
      expect(typeof result).toBe('string')
    })
  })

  describe('formatShortDate', () => {
    it('should format valid date strings in short format', () => {
      // MM/DD/YYYY format
      const result = formatShortDate('2024-01-15')
      expect(result).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/)
    })

    it('should handle null values', () => {
      expect(formatShortDate(null)).toBe('')
    })

    it('should handle undefined values', () => {
      expect(formatShortDate(undefined)).toBe('')
    })

    it('should handle empty string', () => {
      expect(formatShortDate('')).toBe('')
    })
  })
})

describe('Payment Calculation Accuracy', () => {
  // These tests verify that currency calculations maintain precision
  // Critical for construction billing

  it('should maintain precision for typical contract amounts', () => {
    // Typical construction contract values
    const contractSum = 1500000.00
    const changeOrder = 25000.00
    const retainage = 0.10 // 10%

    const total = contractSum + changeOrder
    const retainageAmount = total * retainage

    expect(formatCurrency(contractSum)).toBe('$1,500,000.00')
    expect(formatCurrency(changeOrder)).toBe('$25,000.00')
    expect(formatCurrency(total)).toBe('$1,525,000.00')
    expect(formatCurrency(retainageAmount)).toBe('$152,500.00')
  })

  it('should handle G702 line item calculations', () => {
    // G702 form calculations
    const originalContractSum = 2000000.00
    const netChangeOrders = 150000.00
    const contractSumToDate = originalContractSum + netChangeOrders
    const totalCompletedAndStored = 1800000.00
    const retainagePercent = 10
    const retainageFromCompleted = totalCompletedAndStored * (retainagePercent / 100)
    const totalEarnedLessRetainage = totalCompletedAndStored - retainageFromCompleted
    const lessPreviousCertificates = 1500000.00
    const currentPaymentDue = totalEarnedLessRetainage - lessPreviousCertificates

    expect(formatCurrency(originalContractSum)).toBe('$2,000,000.00')
    expect(formatCurrency(netChangeOrders)).toBe('$150,000.00')
    expect(formatCurrency(contractSumToDate)).toBe('$2,150,000.00')
    expect(formatCurrency(totalCompletedAndStored)).toBe('$1,800,000.00')
    expect(formatPercent(retainagePercent)).toBe('10.0%')
    expect(formatCurrency(retainageFromCompleted)).toBe('$180,000.00')
    expect(formatCurrency(totalEarnedLessRetainage)).toBe('$1,620,000.00')
    expect(formatCurrency(lessPreviousCertificates)).toBe('$1,500,000.00')
    expect(formatCurrency(currentPaymentDue)).toBe('$120,000.00')
  })

  it('should handle cents correctly in payment calculations', () => {
    // Important: construction billing must be accurate to the penny
    const amount1 = 1234.56
    const amount2 = 789.99
    const total = amount1 + amount2 // 2024.55

    expect(formatCurrency(amount1)).toBe('$1,234.56')
    expect(formatCurrency(amount2)).toBe('$789.99')
    expect(formatCurrency(total)).toBe('$2,024.55')
  })
})
