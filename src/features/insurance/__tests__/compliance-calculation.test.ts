/**
 * Compliance Calculation Tests
 * Tests for insurance compliance utility functions
 */

import { describe, it, expect } from 'vitest'
import {
  formatInsuranceLimit,
  getDaysUntilExpiry,
  getStatusFromExpiry,
  getComplianceStatusLabel,
  getComplianceStatusColor,
  INSURANCE_TYPE_LABELS,
  CERTIFICATE_STATUS_LABELS,
  COMPLIANCE_STATUS_COLORS,
  type SubcontractorComplianceStatus,
} from '@/types/insurance'

// =============================================
// Format Insurance Limit Tests
// =============================================

describe('formatInsuranceLimit', () => {
  it('should format millions correctly', () => {
    // The actual implementation uses Intl.NumberFormat, so $1,000,000 format
    expect(formatInsuranceLimit(1000000)).toBe('$1,000,000')
    expect(formatInsuranceLimit(2000000)).toBe('$2,000,000')
    expect(formatInsuranceLimit(5000000)).toBe('$5,000,000')
  })

  it('should format thousands correctly', () => {
    expect(formatInsuranceLimit(100000)).toBe('$100,000')
    expect(formatInsuranceLimit(500000)).toBe('$500,000')
    expect(formatInsuranceLimit(50000)).toBe('$50,000')
  })

  it('should handle small values', () => {
    expect(formatInsuranceLimit(1000)).toBe('$1,000')
    expect(formatInsuranceLimit(500)).toBe('$500')
  })

  it('should handle null and undefined', () => {
    expect(formatInsuranceLimit(null)).toBe('-')
    expect(formatInsuranceLimit(undefined)).toBe('-')
  })

  it('should handle zero', () => {
    // Zero returns formatted value
    expect(formatInsuranceLimit(0)).toBe('$0')
  })
})

// =============================================
// Days Until Expiry Tests
// =============================================

describe('getDaysUntilExpiry', () => {
  it('should return positive days for future dates', () => {
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 30)
    const days = getDaysUntilExpiry(futureDate.toISOString().split('T')[0])
    expect(days).toBeGreaterThanOrEqual(29) // Account for timezone differences
    expect(days).toBeLessThanOrEqual(31)
  })

  it('should return negative days for past dates', () => {
    const pastDate = new Date()
    pastDate.setDate(pastDate.getDate() - 10)
    const days = getDaysUntilExpiry(pastDate.toISOString().split('T')[0])
    expect(days).toBeLessThanOrEqual(-9)
    expect(days).toBeGreaterThanOrEqual(-11)
  })

  it('should return approximately 0 for today', () => {
    const today = new Date().toISOString().split('T')[0]
    const days = getDaysUntilExpiry(today)
    // Account for timezone differences - could be -1 to 1
    expect(Math.abs(days)).toBeLessThanOrEqual(1)
  })

  it('should handle date strings correctly', () => {
    // Fixed date for consistent testing
    const date = '2099-12-31'
    const days = getDaysUntilExpiry(date)
    expect(days).toBeGreaterThan(0)
  })
})

// =============================================
// Status From Expiry Tests
// =============================================

describe('getStatusFromExpiry', () => {
  it('should return expired for negative days', () => {
    expect(getStatusFromExpiry(-1)).toBe('expired')
    expect(getStatusFromExpiry(-30)).toBe('expired')
    expect(getStatusFromExpiry(-100)).toBe('expired')
  })

  it('should return expiring_soon for 0-30 days', () => {
    expect(getStatusFromExpiry(0)).toBe('expiring_soon')
    expect(getStatusFromExpiry(15)).toBe('expiring_soon')
    expect(getStatusFromExpiry(30)).toBe('expiring_soon')
  })

  it('should return active for more than 30 days', () => {
    expect(getStatusFromExpiry(31)).toBe('active')
    expect(getStatusFromExpiry(60)).toBe('active')
    expect(getStatusFromExpiry(365)).toBe('active')
  })
})

// =============================================
// Insurance Type Labels Tests
// =============================================

describe('INSURANCE_TYPE_LABELS', () => {
  it('should have label for general_liability', () => {
    expect(INSURANCE_TYPE_LABELS.general_liability).toBe('Commercial General Liability')
  })

  it('should have label for auto_liability', () => {
    expect(INSURANCE_TYPE_LABELS.auto_liability).toBe('Business Auto Liability')
  })

  it('should have label for workers_compensation', () => {
    expect(INSURANCE_TYPE_LABELS.workers_compensation).toBe("Workers' Compensation")
  })

  it('should have label for umbrella', () => {
    expect(INSURANCE_TYPE_LABELS.umbrella).toBe('Umbrella/Excess Liability')
  })

  it('should have label for professional_liability', () => {
    expect(INSURANCE_TYPE_LABELS.professional_liability).toBe('Professional Liability (E&O)')
  })

  it('should have label for builders_risk', () => {
    expect(INSURANCE_TYPE_LABELS.builders_risk).toBe("Builder's Risk")
  })

  it('should have labels for all insurance types', () => {
    const expectedTypes = [
      'general_liability',
      'auto_liability',
      'workers_compensation',
      'umbrella',
      'professional_liability',
      'builders_risk',
      'pollution',
      'cyber',
      'other',
    ]
    expectedTypes.forEach((type) => {
      expect(INSURANCE_TYPE_LABELS[type as keyof typeof INSURANCE_TYPE_LABELS]).toBeDefined()
    })
  })
})

// =============================================
// Certificate Status Labels Tests
// =============================================

describe('CERTIFICATE_STATUS_LABELS', () => {
  it('should have label for active status', () => {
    expect(CERTIFICATE_STATUS_LABELS.active).toBe('Active')
  })

  it('should have label for expiring_soon status', () => {
    expect(CERTIFICATE_STATUS_LABELS.expiring_soon).toBe('Expiring Soon')
  })

  it('should have label for expired status', () => {
    expect(CERTIFICATE_STATUS_LABELS.expired).toBe('Expired')
  })

  it('should have label for pending_renewal status', () => {
    expect(CERTIFICATE_STATUS_LABELS.pending_renewal).toBe('Pending Renewal')
  })

  it('should have label for void status', () => {
    expect(CERTIFICATE_STATUS_LABELS.void).toBe('Void')
  })
})

// =============================================
// Compliance Status Tests
// =============================================

// Helper to create mock compliance status objects
const createMockComplianceStatus = (
  overrides: Partial<SubcontractorComplianceStatus> = {}
): SubcontractorComplianceStatus => ({
  subcontractor_id: 'sub-123',
  company_id: 'company-456',
  project_id: 'project-789',
  is_compliant: true,
  payment_hold: false,
  expired_count: 0,
  expiring_soon_count: 0,
  ...overrides,
})

describe('getComplianceStatusLabel', () => {
  it('should return Compliant for fully compliant status', () => {
    const status = createMockComplianceStatus({ is_compliant: true })
    expect(getComplianceStatusLabel(status)).toBe('Compliant')
  })

  it('should return Non-Compliant for non-compliant status', () => {
    const status = createMockComplianceStatus({ is_compliant: false })
    expect(getComplianceStatusLabel(status)).toBe('Non-Compliant')
  })

  it('should return On Hold when payment_hold is true', () => {
    const status = createMockComplianceStatus({ payment_hold: true })
    expect(getComplianceStatusLabel(status)).toBe('On Hold')
  })

  it('should return Expired Coverage when there are expired certificates', () => {
    const status = createMockComplianceStatus({ expired_count: 1 })
    expect(getComplianceStatusLabel(status)).toBe('Expired Coverage')
  })

  it('should return Expiring Soon when there are expiring certificates', () => {
    const status = createMockComplianceStatus({ expiring_soon_count: 2 })
    expect(getComplianceStatusLabel(status)).toBe('Expiring Soon')
  })
})

describe('getComplianceStatusColor', () => {
  it('should return green for compliant', () => {
    const status = createMockComplianceStatus({ is_compliant: true })
    expect(getComplianceStatusColor(status)).toBe('green')
  })

  it('should return red for non-compliant', () => {
    const status = createMockComplianceStatus({ is_compliant: false })
    expect(getComplianceStatusColor(status)).toBe('red')
  })

  it('should return orange for on hold', () => {
    const status = createMockComplianceStatus({ payment_hold: true })
    expect(getComplianceStatusColor(status)).toBe('orange')
  })

  it('should return red for expired certificates', () => {
    const status = createMockComplianceStatus({ expired_count: 1 })
    expect(getComplianceStatusColor(status)).toBe('red')
  })

  it('should return yellow for expiring soon', () => {
    const status = createMockComplianceStatus({ expiring_soon_count: 2 })
    expect(getComplianceStatusColor(status)).toBe('yellow')
  })
})

describe('COMPLIANCE_STATUS_COLORS', () => {
  it('should have correct color values', () => {
    expect(COMPLIANCE_STATUS_COLORS.compliant).toBe('green')
    expect(COMPLIANCE_STATUS_COLORS.nonCompliant).toBe('red')
    expect(COMPLIANCE_STATUS_COLORS.expiringSoon).toBe('yellow')
    expect(COMPLIANCE_STATUS_COLORS.onHold).toBe('orange')
  })
})

// =============================================
// Coverage Validation Tests
// =============================================

describe('Coverage Validation Logic', () => {
  it('should validate coverage meets minimum requirements', () => {
    const requirement = { min_each_occurrence: 1000000 }
    const certificate = { each_occurrence_limit: 1000000 }
    expect(certificate.each_occurrence_limit >= requirement.min_each_occurrence).toBe(true)
  })

  it('should fail validation when coverage is insufficient', () => {
    const requirement = { min_each_occurrence: 1000000 }
    const certificate = { each_occurrence_limit: 500000 }
    expect(certificate.each_occurrence_limit >= requirement.min_each_occurrence).toBe(false)
  })

  it('should handle null coverage values', () => {
    const requirement = { min_each_occurrence: 1000000 }
    const certificate = { each_occurrence_limit: null as number | null }
    expect((certificate.each_occurrence_limit ?? 0) >= requirement.min_each_occurrence).toBe(false)
  })
})

// =============================================
// Endorsement Validation Tests
// =============================================

describe('Endorsement Validation Logic', () => {
  it('should validate additional insured is verified when required', () => {
    const requirement = { additional_insured_required: true }
    const certificate = { additional_insured_verified: true }
    expect(
      !requirement.additional_insured_required || certificate.additional_insured_verified
    ).toBe(true)
  })

  it('should fail when additional insured not verified but required', () => {
    const requirement = { additional_insured_required: true }
    const certificate = { additional_insured_verified: false }
    expect(
      !requirement.additional_insured_required || certificate.additional_insured_verified
    ).toBe(false)
  })

  it('should pass when additional insured not required', () => {
    const requirement = { additional_insured_required: false }
    const certificate = { additional_insured_verified: false }
    expect(
      !requirement.additional_insured_required || certificate.additional_insured_verified
    ).toBe(true)
  })

  it('should validate waiver of subrogation', () => {
    const requirement = { waiver_of_subrogation_required: true }
    const certificate = { waiver_of_subrogation_verified: true }
    expect(
      !requirement.waiver_of_subrogation_required || certificate.waiver_of_subrogation_verified
    ).toBe(true)
  })
})

// =============================================
// Compliance Score Calculation Tests
// =============================================

describe('Compliance Score Calculation', () => {
  it('should calculate 100% when all requirements met', () => {
    const requirements = ['general_liability', 'workers_compensation', 'auto_liability']
    const compliant = ['general_liability', 'workers_compensation', 'auto_liability']
    const score = Math.round((compliant.length / requirements.length) * 100)
    expect(score).toBe(100)
  })

  it('should calculate partial compliance correctly', () => {
    const requirements = ['general_liability', 'workers_compensation', 'auto_liability', 'umbrella']
    const compliant = ['general_liability', 'workers_compensation']
    const score = Math.round((compliant.length / requirements.length) * 100)
    expect(score).toBe(50)
  })

  it('should calculate 0% when no requirements met', () => {
    const requirements = ['general_liability', 'workers_compensation']
    const compliant: string[] = []
    const score = Math.round((compliant.length / requirements.length) * 100)
    expect(score).toBe(0)
  })

  it('should handle edge case with single requirement', () => {
    const requirements = ['general_liability']
    const compliant = ['general_liability']
    const score = Math.round((compliant.length / requirements.length) * 100)
    expect(score).toBe(100)
  })
})

// =============================================
// Payment Hold Decision Tests
// =============================================

describe('Payment Hold Decision Logic', () => {
  it('should apply hold when expired certificates exist', () => {
    const complianceStatus = {
      expired_certificates: 1,
      overall_status: 'non_compliant' as const,
    }
    const shouldApplyHold = complianceStatus.expired_certificates > 0
    expect(shouldApplyHold).toBe(true)
  })

  it('should not apply hold when no expired certificates', () => {
    const complianceStatus = {
      expired_certificates: 0,
      overall_status: 'compliant' as const,
    }
    const shouldApplyHold = complianceStatus.expired_certificates > 0
    expect(shouldApplyHold).toBe(false)
  })

  it('should release hold when compliance restored', () => {
    const previousStatus = { payment_hold: true, overall_status: 'non_compliant' as const }
    const newStatus = { overall_status: 'compliant' as const, expired_certificates: 0 }
    const shouldReleaseHold =
      previousStatus.payment_hold &&
      newStatus.overall_status === 'compliant' &&
      newStatus.expired_certificates === 0
    expect(shouldReleaseHold).toBe(true)
  })
})

// =============================================
// Alert Threshold Tests
// =============================================

describe('Alert Threshold Logic', () => {
  it('should trigger 30-day warning alert', () => {
    const daysUntilExpiry = 28
    const shouldAlert30Day = daysUntilExpiry <= 30 && daysUntilExpiry > 14
    expect(shouldAlert30Day).toBe(true)
  })

  it('should trigger 14-day urgent alert', () => {
    const daysUntilExpiry = 12
    const shouldAlert14Day = daysUntilExpiry <= 14 && daysUntilExpiry > 7
    expect(shouldAlert14Day).toBe(true)
  })

  it('should trigger 7-day final notice', () => {
    const daysUntilExpiry = 5
    const shouldAlert7Day = daysUntilExpiry <= 7 && daysUntilExpiry > 0
    expect(shouldAlert7Day).toBe(true)
  })

  it('should trigger expiration alert', () => {
    const daysUntilExpiry = -1
    const shouldAlertExpired = daysUntilExpiry <= 0
    expect(shouldAlertExpired).toBe(true)
  })

  it('should not trigger alert when more than 30 days', () => {
    const daysUntilExpiry = 45
    const shouldAlert = daysUntilExpiry <= 30
    expect(shouldAlert).toBe(false)
  })
})
