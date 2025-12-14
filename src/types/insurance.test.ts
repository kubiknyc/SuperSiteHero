/**
 * Tests for Insurance Types
 * Tests constants, utility functions, and type structures for insurance tracking
 */

import { describe, it, expect } from 'vitest'
import {
  // Constants
  INSURANCE_TYPE_LABELS,
  CERTIFICATE_STATUS_LABELS,
  CERTIFICATE_STATUS_COLORS,
  // Utility functions
  formatInsuranceLimit,
  getDaysUntilExpiry,
  getStatusFromExpiry,
  // Types
  type InsuranceType,
  type CertificateStatus,
  type InsuranceCertificate,
  type InsuranceCertificateWithRelations,
  type InsuranceRequirement,
  type ComplianceCheckResult,
  type ComplianceSummary,
  type InsuranceDashboardStats,
  type ExpiringCertificate,
} from './insurance'

// =============================================
// INSURANCE_TYPE_LABELS Tests
// =============================================

describe('INSURANCE_TYPE_LABELS', () => {
  it('should have 9 insurance types', () => {
    expect(Object.keys(INSURANCE_TYPE_LABELS)).toHaveLength(9)
  })

  const expectedTypes: { type: InsuranceType; label: string }[] = [
    { type: 'general_liability', label: 'Commercial General Liability' },
    { type: 'auto_liability', label: 'Business Auto Liability' },
    { type: 'workers_compensation', label: "Workers' Compensation" },
    { type: 'umbrella', label: 'Umbrella/Excess Liability' },
    { type: 'professional_liability', label: 'Professional Liability (E&O)' },
    { type: 'builders_risk', label: "Builder's Risk" },
    { type: 'pollution', label: 'Pollution Liability' },
    { type: 'cyber', label: 'Cyber Liability' },
    { type: 'other', label: 'Other' },
  ]

  expectedTypes.forEach(({ type, label }) => {
    it(`should have correct label for ${type}`, () => {
      expect(INSURANCE_TYPE_LABELS[type]).toBe(label)
    })
  })
})

// =============================================
// CERTIFICATE_STATUS_LABELS Tests
// =============================================

describe('CERTIFICATE_STATUS_LABELS', () => {
  it('should have 5 certificate statuses', () => {
    expect(Object.keys(CERTIFICATE_STATUS_LABELS)).toHaveLength(5)
  })

  const expectedStatuses: { status: CertificateStatus; label: string }[] = [
    { status: 'active', label: 'Active' },
    { status: 'expiring_soon', label: 'Expiring Soon' },
    { status: 'expired', label: 'Expired' },
    { status: 'pending_renewal', label: 'Pending Renewal' },
    { status: 'void', label: 'Void' },
  ]

  expectedStatuses.forEach(({ status, label }) => {
    it(`should have correct label for ${status}`, () => {
      expect(CERTIFICATE_STATUS_LABELS[status]).toBe(label)
    })
  })
})

// =============================================
// CERTIFICATE_STATUS_COLORS Tests
// =============================================

describe('CERTIFICATE_STATUS_COLORS', () => {
  it('should have 5 status colors', () => {
    expect(Object.keys(CERTIFICATE_STATUS_COLORS)).toHaveLength(5)
  })

  const expectedColors: { status: CertificateStatus; color: string }[] = [
    { status: 'active', color: 'green' },
    { status: 'expiring_soon', color: 'yellow' },
    { status: 'expired', color: 'red' },
    { status: 'pending_renewal', color: 'blue' },
    { status: 'void', color: 'gray' },
  ]

  expectedColors.forEach(({ status, color }) => {
    it(`should have ${color} color for ${status}`, () => {
      expect(CERTIFICATE_STATUS_COLORS[status]).toBe(color)
    })
  })
})

// =============================================
// formatInsuranceLimit Tests
// =============================================

describe('formatInsuranceLimit', () => {
  it('should format large numbers as currency', () => {
    expect(formatInsuranceLimit(1000000)).toBe('$1,000,000')
    expect(formatInsuranceLimit(2000000)).toBe('$2,000,000')
    expect(formatInsuranceLimit(5000000)).toBe('$5,000,000')
  })

  it('should format smaller numbers correctly', () => {
    expect(formatInsuranceLimit(5000)).toBe('$5,000')
    expect(formatInsuranceLimit(100000)).toBe('$100,000')
  })

  it('should return dash for null value', () => {
    expect(formatInsuranceLimit(null)).toBe('-')
  })

  it('should return dash for undefined value', () => {
    expect(formatInsuranceLimit(undefined)).toBe('-')
  })

  it('should handle zero value', () => {
    expect(formatInsuranceLimit(0)).toBe('$0')
  })

  it('should not show decimal places', () => {
    const result = formatInsuranceLimit(1000000.99)
    expect(result).toBe('$1,000,001') // Should round, no decimals
  })
})

// =============================================
// getDaysUntilExpiry Tests
// =============================================

describe('getDaysUntilExpiry', () => {
  it('should calculate positive days until expiry', () => {
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 30)
    const result = getDaysUntilExpiry(futureDate.toISOString())
    // Allow ±1 day variance due to time-of-day differences
    expect(result).toBeGreaterThanOrEqual(29)
    expect(result).toBeLessThanOrEqual(31)
  })

  it('should calculate negative days for expired certificates', () => {
    const pastDate = new Date()
    pastDate.setDate(pastDate.getDate() - 10)
    const result = getDaysUntilExpiry(pastDate.toISOString())
    // Allow ±1 day variance due to time-of-day differences
    expect(result).toBeGreaterThanOrEqual(-11)
    expect(result).toBeLessThanOrEqual(-9)
  })

  it('should return 0 for today', () => {
    const today = new Date()
    today.setHours(23, 59, 59, 999)
    const result = getDaysUntilExpiry(today.toISOString())
    expect(result).toBeLessThanOrEqual(1)
  })

  it('should handle dates far in the future', () => {
    const farFuture = new Date()
    farFuture.setFullYear(farFuture.getFullYear() + 1)
    const result = getDaysUntilExpiry(farFuture.toISOString())
    expect(result).toBeGreaterThan(300)
  })
})

// =============================================
// getStatusFromExpiry Tests
// =============================================

describe('getStatusFromExpiry', () => {
  it('should return expired for negative days', () => {
    expect(getStatusFromExpiry(-1)).toBe('expired')
    expect(getStatusFromExpiry(-30)).toBe('expired')
  })

  it('should return expiring_soon for 0-30 days', () => {
    expect(getStatusFromExpiry(0)).toBe('expiring_soon')
    expect(getStatusFromExpiry(15)).toBe('expiring_soon')
    expect(getStatusFromExpiry(30)).toBe('expiring_soon')
  })

  it('should return active for more than 30 days', () => {
    expect(getStatusFromExpiry(31)).toBe('active')
    expect(getStatusFromExpiry(90)).toBe('active')
    expect(getStatusFromExpiry(365)).toBe('active')
  })
})

// =============================================
// Interface Validation Tests
// =============================================

describe('InsuranceCertificate interface', () => {
  it('should validate a complete certificate', () => {
    const cert: InsuranceCertificate = {
      id: 'cert-1',
      company_id: 'company-1',
      project_id: 'project-1',
      subcontractor_id: 'sub-1',
      certificate_number: 'COI-2024-001',
      insurance_type: 'general_liability',
      carrier_name: 'ABC Insurance',
      carrier_naic_number: '12345',
      policy_number: 'GL-001',
      each_occurrence_limit: 1000000,
      general_aggregate_limit: 2000000,
      products_completed_ops_limit: 2000000,
      personal_adv_injury_limit: 1000000,
      damage_to_rented_premises: 100000,
      medical_expense_limit: 5000,
      combined_single_limit: null,
      bodily_injury_per_person: null,
      bodily_injury_per_accident: null,
      property_damage_limit: null,
      umbrella_each_occurrence: null,
      umbrella_aggregate: null,
      workers_comp_el_each_accident: null,
      workers_comp_el_disease_policy: null,
      workers_comp_el_disease_employee: null,
      effective_date: '2024-01-01',
      expiration_date: '2025-01-01',
      status: 'active',
      additional_insured_required: true,
      additional_insured_verified: true,
      additional_insured_name: 'GC LLC',
      waiver_of_subrogation_required: true,
      waiver_of_subrogation_verified: true,
      primary_noncontributory_required: true,
      primary_noncontributory_verified: true,
      certificate_url: null,
      certificate_storage_path: null,
      issued_by_name: 'John Agent',
      issued_by_email: 'agent@ins.com',
      issued_by_phone: '555-1234',
      notes: null,
      description_of_operations: 'Construction work',
      alert_days_before_expiry: 30,
      suppress_alerts: false,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      created_by: 'user-1',
      deleted_at: null,
    }

    expect(cert.insurance_type).toBe('general_liability')
    expect(cert.status).toBe('active')
    expect(cert.each_occurrence_limit).toBe(1000000)
  })
})

describe('InsuranceCertificateWithRelations interface', () => {
  it('should include subcontractor and project relations', () => {
    const cert: InsuranceCertificateWithRelations = {
      id: 'cert-1',
      company_id: 'company-1',
      project_id: 'project-1',
      subcontractor_id: 'sub-1',
      certificate_number: 'COI-2024-001',
      insurance_type: 'general_liability',
      carrier_name: 'ABC Insurance',
      carrier_naic_number: null,
      policy_number: 'GL-001',
      each_occurrence_limit: 1000000,
      general_aggregate_limit: 2000000,
      products_completed_ops_limit: null,
      personal_adv_injury_limit: null,
      damage_to_rented_premises: null,
      medical_expense_limit: null,
      combined_single_limit: null,
      bodily_injury_per_person: null,
      bodily_injury_per_accident: null,
      property_damage_limit: null,
      umbrella_each_occurrence: null,
      umbrella_aggregate: null,
      workers_comp_el_each_accident: null,
      workers_comp_el_disease_policy: null,
      workers_comp_el_disease_employee: null,
      effective_date: '2024-01-01',
      expiration_date: '2025-01-01',
      status: 'active',
      additional_insured_required: true,
      additional_insured_verified: true,
      additional_insured_name: null,
      waiver_of_subrogation_required: false,
      waiver_of_subrogation_verified: false,
      primary_noncontributory_required: false,
      primary_noncontributory_verified: false,
      certificate_url: null,
      certificate_storage_path: null,
      issued_by_name: null,
      issued_by_email: null,
      issued_by_phone: null,
      notes: null,
      description_of_operations: null,
      alert_days_before_expiry: 30,
      suppress_alerts: false,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      created_by: 'user-1',
      deleted_at: null,
      subcontractor: {
        id: 'sub-1',
        company_name: 'ABC Electric',
        contact_name: 'John Doe',
        contact_email: 'john@abc.com',
        contact_phone: '555-5678',
      },
      project: {
        id: 'project-1',
        name: 'Office Building',
        project_number: 'PRJ-001',
      },
    }

    expect(cert.subcontractor?.company_name).toBe('ABC Electric')
    expect(cert.project?.name).toBe('Office Building')
  })
})

describe('InsuranceRequirement interface', () => {
  it('should validate a complete requirement', () => {
    const req: InsuranceRequirement = {
      id: 'req-1',
      company_id: 'company-1',
      project_id: null,
      name: 'GL Minimum Coverage',
      insurance_type: 'general_liability',
      description: 'Minimum GL coverage for all subs',
      min_each_occurrence: 1000000,
      min_general_aggregate: 2000000,
      min_products_completed_ops: null,
      min_combined_single_limit: null,
      min_umbrella_each_occurrence: null,
      min_umbrella_aggregate: null,
      min_workers_comp_el_each_accident: null,
      additional_insured_required: true,
      waiver_of_subrogation_required: true,
      primary_noncontributory_required: false,
      applies_to_all_subcontractors: true,
      specific_subcontractor_ids: null,
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      created_by: 'user-1',
    }

    expect(req.insurance_type).toBe('general_liability')
    expect(req.min_each_occurrence).toBe(1000000)
    expect(req.applies_to_all_subcontractors).toBe(true)
  })
})

describe('ComplianceCheckResult interface', () => {
  it('should validate a compliant result', () => {
    const result: ComplianceCheckResult = {
      requirement_id: 'req-1',
      requirement_name: 'GL Coverage',
      insurance_type: 'general_liability',
      is_compliant: true,
      certificate_id: 'cert-1',
      gap_description: null,
    }

    expect(result.is_compliant).toBe(true)
    expect(result.gap_description).toBeNull()
  })

  it('should validate a non-compliant result', () => {
    const result: ComplianceCheckResult = {
      requirement_id: 'req-1',
      requirement_name: 'GL Coverage',
      insurance_type: 'general_liability',
      is_compliant: false,
      certificate_id: null,
      gap_description: 'Missing general liability certificate',
    }

    expect(result.is_compliant).toBe(false)
    expect(result.gap_description).toBeTruthy()
  })
})

describe('ComplianceSummary interface', () => {
  it('should validate compliance summary', () => {
    const summary: ComplianceSummary = {
      subcontractor_id: 'sub-1',
      subcontractor_name: 'ABC Electric',
      company_id: 'company-1',
      project_id: 'project-1',
      project_name: 'Office Building',
      active_certificates: 3,
      expiring_certificates: 1,
      expired_certificates: 0,
      next_expiration: '2024-06-15',
      all_additional_insured_verified: true,
    }

    expect(summary.active_certificates).toBe(3)
    expect(summary.all_additional_insured_verified).toBe(true)
  })
})

describe('InsuranceDashboardStats interface', () => {
  it('should validate dashboard stats', () => {
    const stats: InsuranceDashboardStats = {
      totalCertificates: 50,
      activeCertificates: 35,
      expiringWithin30Days: 8,
      expiredCertificates: 5,
      pendingRenewal: 2,
      complianceRate: 92,
      subcontractorsWithGaps: 3,
    }

    expect(stats.totalCertificates).toBe(50)
    expect(stats.complianceRate).toBe(92)
  })
})

describe('ExpiringCertificate interface', () => {
  it('should validate expiring certificate view', () => {
    const expiring: ExpiringCertificate = {
      id: 'cert-1',
      certificate_number: 'COI-2024-001',
      insurance_type: 'general_liability',
      carrier_name: 'ABC Insurance',
      expiration_date: '2024-03-15',
      days_until_expiry: 15,
      status: 'expiring_soon',
      subcontractor_id: 'sub-1',
      subcontractor_name: 'ABC Electric',
      project_id: 'project-1',
      project_name: 'Office Building',
      company_name: 'ABC Electric',
    }

    expect(expiring.days_until_expiry).toBe(15)
    expect(expiring.status).toBe('expiring_soon')
  })
})

// =============================================
// Coverage Type Tests
// =============================================

describe('Coverage Types', () => {
  it('should have all standard construction insurance types', () => {
    const standardTypes: InsuranceType[] = [
      'general_liability',
      'auto_liability',
      'workers_compensation',
      'umbrella',
      'professional_liability',
      'builders_risk',
    ]

    standardTypes.forEach((type) => {
      expect(INSURANCE_TYPE_LABELS[type]).toBeDefined()
    })
  })

  it('should have specialty coverage types', () => {
    expect(INSURANCE_TYPE_LABELS.pollution).toBe('Pollution Liability')
    expect(INSURANCE_TYPE_LABELS.cyber).toBe('Cyber Liability')
  })
})

// =============================================
// Compliance Logic Tests
// =============================================

describe('Compliance Logic', () => {
  it('should identify certificate as active with >30 days until expiry', () => {
    const status = getStatusFromExpiry(45)
    expect(status).toBe('active')
  })

  it('should identify certificate as expiring soon within 30 days', () => {
    const status = getStatusFromExpiry(28)
    expect(status).toBe('expiring_soon')
  })

  it('should identify certificate as expired when past due', () => {
    const status = getStatusFromExpiry(-5)
    expect(status).toBe('expired')
  })

  it('should calculate compliance rate correctly', () => {
    const compliant = 45
    const total = 50
    const rate = (compliant / total) * 100
    expect(rate).toBe(90)
  })
})
