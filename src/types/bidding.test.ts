/**
 * Bidding Types Tests
 * Tests for bidding constants and utility functions
 */

import { describe, it, expect } from 'vitest'
import {
  // Constants
  BID_TYPES,
  BID_PACKAGE_STATUSES,
  INVITATION_RESPONSE_STATUSES,
  BID_SUBMISSION_STATUSES,
  CSI_DIVISIONS,
  // Utility functions
  getBidPackageStatusColor,
  getBidPackageStatusLabel,
  getBidSubmissionStatusColor,
  getBidSubmissionStatusLabel,
  getBidTypeLabel,
  getDivisionName,
  formatBidAmount,
  calculateBidSpread,
  getDaysUntilDue,
  isBidDueSoon,
  canEditBidPackage,
  canSubmitBid,
  // Types
  type BidType,
  type BidPackageStatus,
  type BidSubmissionStatus,
} from './bidding'

// ============================================================================
// CONSTANTS TESTS
// ============================================================================

describe('Bidding Constants', () => {
  describe('BID_TYPES', () => {
    it('should contain all bid types', () => {
      expect(BID_TYPES).toHaveLength(5)
    })

    it('should have value, label, and description for each type', () => {
      BID_TYPES.forEach((type) => {
        expect(type).toHaveProperty('value')
        expect(type).toHaveProperty('label')
        expect(type).toHaveProperty('description')
      })
    })

    it('should include common bid types', () => {
      const values = BID_TYPES.map((t) => t.value)
      expect(values).toContain('lump_sum')
      expect(values).toContain('unit_price')
      expect(values).toContain('cost_plus')
      expect(values).toContain('gmp')
      expect(values).toContain('time_and_material')
    })
  })

  describe('BID_PACKAGE_STATUSES', () => {
    it('should contain all package statuses', () => {
      expect(BID_PACKAGE_STATUSES).toHaveLength(8)
    })

    it('should have value, label, and color for each status', () => {
      BID_PACKAGE_STATUSES.forEach((status) => {
        expect(status).toHaveProperty('value')
        expect(status).toHaveProperty('label')
        expect(status).toHaveProperty('color')
      })
    })

    it('should include all workflow statuses', () => {
      const values = BID_PACKAGE_STATUSES.map((s) => s.value)
      expect(values).toContain('draft')
      expect(values).toContain('published')
      expect(values).toContain('questions_period')
      expect(values).toContain('bids_due')
      expect(values).toContain('under_review')
      expect(values).toContain('awarded')
      expect(values).toContain('cancelled')
    })

    it('should have appropriate colors', () => {
      const awarded = BID_PACKAGE_STATUSES.find((s) => s.value === 'awarded')
      expect(awarded?.color).toBe('green')

      const cancelled = BID_PACKAGE_STATUSES.find((s) => s.value === 'cancelled')
      expect(cancelled?.color).toBe('red')
    })
  })

  describe('INVITATION_RESPONSE_STATUSES', () => {
    it('should contain all response statuses', () => {
      expect(INVITATION_RESPONSE_STATUSES).toHaveLength(5)
    })

    it('should include accepted and declined', () => {
      const values = INVITATION_RESPONSE_STATUSES.map((s) => s.value)
      expect(values).toContain('pending')
      expect(values).toContain('accepted')
      expect(values).toContain('declined')
    })
  })

  describe('BID_SUBMISSION_STATUSES', () => {
    it('should contain all submission statuses', () => {
      expect(BID_SUBMISSION_STATUSES).toHaveLength(8)
    })

    it('should include evaluation workflow statuses', () => {
      const values = BID_SUBMISSION_STATUSES.map((s) => s.value)
      expect(values).toContain('received')
      expect(values).toContain('under_review')
      expect(values).toContain('qualified')
      expect(values).toContain('disqualified')
      expect(values).toContain('shortlisted')
      expect(values).toContain('awarded')
      expect(values).toContain('not_awarded')
    })
  })

  describe('CSI_DIVISIONS', () => {
    it('should contain CSI divisions', () => {
      expect(CSI_DIVISIONS.length).toBeGreaterThan(20)
    })

    it('should have code and name for each division', () => {
      CSI_DIVISIONS.forEach((div) => {
        expect(div).toHaveProperty('code')
        expect(div).toHaveProperty('name')
      })
    })

    it('should include common divisions', () => {
      const codes = CSI_DIVISIONS.map((d) => d.code)
      expect(codes).toContain('03') // Concrete
      expect(codes).toContain('23') // HVAC
      expect(codes).toContain('26') // Electrical
    })
  })
})

// ============================================================================
// UTILITY FUNCTIONS TESTS
// ============================================================================

describe('Bidding Utility Functions', () => {
  describe('getBidPackageStatusColor', () => {
    it('should return correct colors for statuses', () => {
      expect(getBidPackageStatusColor('draft')).toBe('gray')
      expect(getBidPackageStatusColor('published')).toBe('blue')
      expect(getBidPackageStatusColor('awarded')).toBe('green')
      expect(getBidPackageStatusColor('cancelled')).toBe('red')
    })

    it('should return gray for unknown status', () => {
      expect(getBidPackageStatusColor('unknown' as BidPackageStatus)).toBe('gray')
    })
  })

  describe('getBidPackageStatusLabel', () => {
    it('should return correct labels for statuses', () => {
      expect(getBidPackageStatusLabel('draft')).toBe('Draft')
      expect(getBidPackageStatusLabel('published')).toBe('Published')
      expect(getBidPackageStatusLabel('under_review')).toBe('Under Review')
      expect(getBidPackageStatusLabel('awarded')).toBe('Awarded')
    })

    it('should return the status value for unknown status', () => {
      expect(getBidPackageStatusLabel('unknown' as BidPackageStatus)).toBe('unknown')
    })
  })

  describe('getBidSubmissionStatusColor', () => {
    it('should return correct colors for submission statuses', () => {
      expect(getBidSubmissionStatusColor('received')).toBe('blue')
      expect(getBidSubmissionStatusColor('qualified')).toBe('green')
      expect(getBidSubmissionStatusColor('disqualified')).toBe('red')
      expect(getBidSubmissionStatusColor('awarded')).toBe('emerald')
    })

    it('should return gray for unknown status', () => {
      expect(getBidSubmissionStatusColor('unknown' as BidSubmissionStatus)).toBe('gray')
    })
  })

  describe('getBidSubmissionStatusLabel', () => {
    it('should return correct labels', () => {
      expect(getBidSubmissionStatusLabel('received')).toBe('Received')
      expect(getBidSubmissionStatusLabel('shortlisted')).toBe('Shortlisted')
      expect(getBidSubmissionStatusLabel('not_awarded')).toBe('Not Awarded')
    })
  })

  describe('getBidTypeLabel', () => {
    it('should return correct labels for bid types', () => {
      expect(getBidTypeLabel('lump_sum')).toBe('Lump Sum')
      expect(getBidTypeLabel('unit_price')).toBe('Unit Price')
      expect(getBidTypeLabel('cost_plus')).toBe('Cost Plus')
      expect(getBidTypeLabel('gmp')).toBe('GMP')
    })

    it('should return the type value for unknown type', () => {
      expect(getBidTypeLabel('unknown' as BidType)).toBe('unknown')
    })
  })

  describe('getDivisionName', () => {
    it('should return division names for codes', () => {
      expect(getDivisionName('03')).toBe('Concrete')
      expect(getDivisionName('23')).toBe('HVAC')
      expect(getDivisionName('26')).toBe('Electrical')
    })

    it('should return the code for unknown division', () => {
      expect(getDivisionName('99')).toBe('99')
    })
  })

  describe('formatBidAmount', () => {
    it('should format bid amounts as currency', () => {
      expect(formatBidAmount(50000)).toBe('$50,000')
      expect(formatBidAmount(1234567)).toBe('$1,234,567')
    })

    it('should return dash for null or undefined', () => {
      expect(formatBidAmount(null)).toBe('-')
      expect(formatBidAmount(undefined)).toBe('-')
    })

    it('should handle zero', () => {
      expect(formatBidAmount(0)).toBe('$0')
    })
  })

  describe('calculateBidSpread', () => {
    it('should calculate bid spread percentage', () => {
      expect(calculateBidSpread(100000, 150000)).toBe(50)
      expect(calculateBidSpread(200000, 220000)).toBe(10)
    })

    it('should return 0 when low bid is 0', () => {
      expect(calculateBidSpread(0, 100000)).toBe(0)
    })

    it('should return 0 when bids are equal', () => {
      expect(calculateBidSpread(100000, 100000)).toBe(0)
    })
  })

  describe('getDaysUntilDue', () => {
    it('should return positive days for future date', () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 10)
      const result = getDaysUntilDue(futureDate.toISOString().split('T')[0])
      expect(result).toBeGreaterThanOrEqual(9)
      expect(result).toBeLessThanOrEqual(11)
    })

    it('should return negative days for past date', () => {
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 5)
      const result = getDaysUntilDue(pastDate.toISOString().split('T')[0])
      expect(result).toBeLessThan(0)
    })
  })

  describe('isBidDueSoon', () => {
    it('should return true when within default threshold', () => {
      const soonDate = new Date()
      soonDate.setDate(soonDate.getDate() + 2)
      expect(isBidDueSoon(soonDate.toISOString().split('T')[0])).toBe(true)
    })

    it('should return false when beyond threshold', () => {
      const laterDate = new Date()
      laterDate.setDate(laterDate.getDate() + 10)
      expect(isBidDueSoon(laterDate.toISOString().split('T')[0])).toBe(false)
    })

    it('should use custom threshold', () => {
      const date = new Date()
      date.setDate(date.getDate() + 5)
      expect(isBidDueSoon(date.toISOString().split('T')[0], 7)).toBe(true)
      expect(isBidDueSoon(date.toISOString().split('T')[0], 3)).toBe(false)
    })
  })

  describe('canEditBidPackage', () => {
    it('should return true for draft and published', () => {
      expect(canEditBidPackage('draft')).toBe(true)
      expect(canEditBidPackage('published')).toBe(true)
    })

    it('should return false for other statuses', () => {
      expect(canEditBidPackage('under_review')).toBe(false)
      expect(canEditBidPackage('awarded')).toBe(false)
      expect(canEditBidPackage('cancelled')).toBe(false)
    })
  })

  describe('canSubmitBid', () => {
    it('should return true for open packages with future due date', () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 7)
      expect(canSubmitBid('published', futureDate.toISOString().split('T')[0])).toBe(true)
      expect(canSubmitBid('questions_period', futureDate.toISOString().split('T')[0])).toBe(true)
      expect(canSubmitBid('bids_due', futureDate.toISOString().split('T')[0])).toBe(true)
    })

    it('should return false for closed statuses', () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 7)
      expect(canSubmitBid('draft', futureDate.toISOString().split('T')[0])).toBe(false)
      expect(canSubmitBid('under_review', futureDate.toISOString().split('T')[0])).toBe(false)
      expect(canSubmitBid('awarded', futureDate.toISOString().split('T')[0])).toBe(false)
    })

    it('should return false for past due date', () => {
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 1)
      expect(canSubmitBid('published', pastDate.toISOString().split('T')[0])).toBe(false)
    })
  })
})

// ============================================================================
// TYPE STRUCTURE TESTS
// ============================================================================

describe('Bidding Type Structures', () => {
  it('should validate BidPackage structure', () => {
    const bidPackage = {
      id: 'pkg-1',
      project_id: 'project-1',
      company_id: 'company-1',
      package_number: 'BP-001',
      name: 'Electrical Package',
      bid_due_date: '2024-02-15',
      bid_due_time: '14:00',
      bid_type: 'lump_sum' as const,
      status: 'draft' as const,
      is_public: false,
      requires_prequalification: false,
      requires_bid_bond: true,
      bid_bond_percent: 5,
      requires_performance_bond: true,
      requires_payment_bond: true,
      requires_insurance_cert: true,
    }

    expect(bidPackage.bid_type).toBe('lump_sum')
    expect(bidPackage.status).toBe('draft')
    expect(bidPackage.requires_bid_bond).toBe(true)
  })

  it('should validate BidSubmission structure', () => {
    const submission = {
      id: 'sub-1',
      bid_package_id: 'pkg-1',
      bidder_company_name: 'ABC Electric',
      base_bid_amount: 150000,
      alternates_total: 10000,
      total_bid_amount: 160000,
      submitted_at: '2024-02-14T10:00:00Z',
      submission_method: 'portal' as const,
      is_late: false,
      bid_bond_included: true,
      status: 'received' as const,
      is_awarded: false,
    }

    expect(submission.status).toBe('received')
    expect(submission.base_bid_amount).toBe(150000)
  })
})
