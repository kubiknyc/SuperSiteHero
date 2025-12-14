/**
 * Closeout Types Tests
 * Tests for closeout document and warranty types, constants, and utility functions
 */

import { describe, it, expect } from 'vitest'
import {
  // Constants
  CLOSEOUT_DOCUMENT_TYPES,
  CLOSEOUT_STATUSES,
  WARRANTY_TYPES,
  WARRANTY_STATUSES,
  // Utility functions
  getCloseoutDocumentTypeLabel,
  getCloseoutDocumentCategory,
  getCloseoutStatusColor,
  getWarrantyStatusColor,
  isWarrantyExpiringSoon,
  getDaysUntilWarrantyExpiration,
  getCloseoutTrafficLight,
  groupDocumentsBySpecSection,
  groupDocumentsByCategory,
  // Types
  type CloseoutDocumentType,
  type CloseoutStatus,
  type WarrantyType,
  type WarrantyStatus,
  type CloseoutCategory,
  type Warranty,
  type CloseoutDocument,
} from './closeout'

// ============================================================================
// CONSTANTS TESTS
// ============================================================================

describe('Closeout Constants', () => {
  describe('CLOSEOUT_DOCUMENT_TYPES', () => {
    it('should contain all document types', () => {
      expect(CLOSEOUT_DOCUMENT_TYPES).toHaveLength(28)
    })

    it('should have value, label, and category for each type', () => {
      CLOSEOUT_DOCUMENT_TYPES.forEach((type) => {
        expect(type).toHaveProperty('value')
        expect(type).toHaveProperty('label')
        expect(type).toHaveProperty('category')
      })
    })

    it('should have unique values', () => {
      const values = CLOSEOUT_DOCUMENT_TYPES.map((t) => t.value)
      expect(new Set(values).size).toBe(values.length)
    })

    it('should include common closeout document types', () => {
      const values = CLOSEOUT_DOCUMENT_TYPES.map((t) => t.value)
      expect(values).toContain('om_manual')
      expect(values).toContain('warranty')
      expect(values).toContain('as_built')
      expect(values).toContain('final_lien_waiver')
      expect(values).toContain('certificate_occupancy')
    })

    it('should map types to correct categories', () => {
      const omManual = CLOSEOUT_DOCUMENT_TYPES.find((t) => t.value === 'om_manual')
      expect(omManual?.category).toBe('documentation')

      const warranty = CLOSEOUT_DOCUMENT_TYPES.find((t) => t.value === 'warranty')
      expect(warranty?.category).toBe('warranty')

      const trainingCert = CLOSEOUT_DOCUMENT_TYPES.find((t) => t.value === 'training_cert')
      expect(trainingCert?.category).toBe('training')

      const co = CLOSEOUT_DOCUMENT_TYPES.find((t) => t.value === 'certificate_occupancy')
      expect(co?.category).toBe('inspection')
    })
  })

  describe('CLOSEOUT_STATUSES', () => {
    it('should contain all status values', () => {
      expect(CLOSEOUT_STATUSES).toHaveLength(8)
    })

    it('should have value, label, and color for each status', () => {
      CLOSEOUT_STATUSES.forEach((status) => {
        expect(status).toHaveProperty('value')
        expect(status).toHaveProperty('label')
        expect(status).toHaveProperty('color')
      })
    })

    it('should include all status values', () => {
      const values = CLOSEOUT_STATUSES.map((s) => s.value)
      expect(values).toContain('not_required')
      expect(values).toContain('pending')
      expect(values).toContain('submitted')
      expect(values).toContain('under_review')
      expect(values).toContain('approved')
      expect(values).toContain('rejected')
      expect(values).toContain('waived')
      expect(values).toContain('na')
    })

    it('should have appropriate colors', () => {
      const approved = CLOSEOUT_STATUSES.find((s) => s.value === 'approved')
      expect(approved?.color).toBe('green')

      const rejected = CLOSEOUT_STATUSES.find((s) => s.value === 'rejected')
      expect(rejected?.color).toBe('red')

      const pending = CLOSEOUT_STATUSES.find((s) => s.value === 'pending')
      expect(pending?.color).toBe('gray')
    })
  })

  describe('WARRANTY_TYPES', () => {
    it('should contain all warranty types', () => {
      expect(WARRANTY_TYPES).toHaveLength(4)
    })

    it('should include warranty type values', () => {
      const values = WARRANTY_TYPES.map((w) => w.value)
      expect(values).toContain('manufacturer')
      expect(values).toContain('labor')
      expect(values).toContain('parts_labor')
      expect(values).toContain('extended')
    })
  })

  describe('WARRANTY_STATUSES', () => {
    it('should contain all warranty statuses', () => {
      expect(WARRANTY_STATUSES).toHaveLength(4)
    })

    it('should include all status values', () => {
      const values = WARRANTY_STATUSES.map((s) => s.value)
      expect(values).toContain('active')
      expect(values).toContain('expired')
      expect(values).toContain('claimed')
      expect(values).toContain('voided')
    })

    it('should have appropriate colors', () => {
      const active = WARRANTY_STATUSES.find((s) => s.value === 'active')
      expect(active?.color).toBe('green')

      const expired = WARRANTY_STATUSES.find((s) => s.value === 'expired')
      expect(expired?.color).toBe('gray')
    })
  })
})

// ============================================================================
// UTILITY FUNCTIONS TESTS
// ============================================================================

describe('Closeout Utility Functions', () => {
  describe('getCloseoutDocumentTypeLabel', () => {
    it('should return correct labels for known types', () => {
      expect(getCloseoutDocumentTypeLabel('om_manual')).toBe('O&M Manual')
      expect(getCloseoutDocumentTypeLabel('as_built')).toBe('As-Built Drawings')
      expect(getCloseoutDocumentTypeLabel('warranty')).toBe('Warranty')
      expect(getCloseoutDocumentTypeLabel('final_lien_waiver')).toBe('Final Lien Waiver')
    })

    it('should return the type value for unknown types', () => {
      expect(getCloseoutDocumentTypeLabel('unknown' as CloseoutDocumentType)).toBe('unknown')
    })
  })

  describe('getCloseoutDocumentCategory', () => {
    it('should return correct categories for known types', () => {
      expect(getCloseoutDocumentCategory('om_manual')).toBe('documentation')
      expect(getCloseoutDocumentCategory('warranty')).toBe('warranty')
      expect(getCloseoutDocumentCategory('training_cert')).toBe('training')
      expect(getCloseoutDocumentCategory('certificate_occupancy')).toBe('inspection')
      expect(getCloseoutDocumentCategory('final_lien_waiver')).toBe('administrative')
      expect(getCloseoutDocumentCategory('attic_stock')).toBe('turnover')
    })

    it('should return documentation for unknown types', () => {
      expect(getCloseoutDocumentCategory('unknown' as CloseoutDocumentType)).toBe('documentation')
    })
  })

  describe('getCloseoutStatusColor', () => {
    it('should return correct colors for statuses', () => {
      expect(getCloseoutStatusColor('approved')).toBe('green')
      expect(getCloseoutStatusColor('rejected')).toBe('red')
      expect(getCloseoutStatusColor('pending')).toBe('gray')
      expect(getCloseoutStatusColor('submitted')).toBe('blue')
      expect(getCloseoutStatusColor('under_review')).toBe('yellow')
      expect(getCloseoutStatusColor('waived')).toBe('purple')
    })

    it('should return gray for unknown status', () => {
      expect(getCloseoutStatusColor('unknown' as CloseoutStatus)).toBe('gray')
    })
  })

  describe('getWarrantyStatusColor', () => {
    it('should return correct colors for warranty statuses', () => {
      expect(getWarrantyStatusColor('active')).toBe('green')
      expect(getWarrantyStatusColor('expired')).toBe('gray')
      expect(getWarrantyStatusColor('claimed')).toBe('yellow')
      expect(getWarrantyStatusColor('voided')).toBe('red')
    })

    it('should return gray for unknown status', () => {
      expect(getWarrantyStatusColor('unknown' as WarrantyStatus)).toBe('gray')
    })
  })

  describe('isWarrantyExpiringSoon', () => {
    const baseWarranty: Warranty = {
      id: 'w-1',
      company_id: 'company-1',
      project_id: 'project-1',
      warranty_number: 'W-001',
      title: 'Roof Warranty',
      description: null,
      spec_section: null,
      subcontractor_id: null,
      manufacturer_name: 'ABC Roofing',
      manufacturer_contact: null,
      manufacturer_phone: null,
      manufacturer_email: null,
      warranty_type: 'manufacturer',
      coverage_description: null,
      start_date: '2024-01-01',
      end_date: '2025-01-01',
      duration_years: 1,
      document_url: null,
      closeout_document_id: null,
      status: 'active',
      notification_days: [90, 60, 30, 7],
      last_notification_sent: null,
      notes: null,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      deleted_at: null,
    }

    it('should return false for non-active warranty', () => {
      const expiredWarranty = { ...baseWarranty, status: 'expired' as const }
      expect(isWarrantyExpiringSoon(expiredWarranty)).toBe(false)
    })

    it('should return true when within default 90 day threshold', () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 45)
      const warranty = { ...baseWarranty, end_date: futureDate.toISOString() }
      expect(isWarrantyExpiringSoon(warranty)).toBe(true)
    })

    it('should return false when beyond threshold', () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 180)
      const warranty = { ...baseWarranty, end_date: futureDate.toISOString() }
      expect(isWarrantyExpiringSoon(warranty)).toBe(false)
    })

    it('should return false when already expired', () => {
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 10)
      const warranty = { ...baseWarranty, end_date: pastDate.toISOString() }
      expect(isWarrantyExpiringSoon(warranty)).toBe(false)
    })

    it('should use custom threshold', () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 20)
      const warranty = { ...baseWarranty, end_date: futureDate.toISOString() }
      expect(isWarrantyExpiringSoon(warranty, 30)).toBe(true)
      expect(isWarrantyExpiringSoon(warranty, 10)).toBe(false)
    })
  })

  describe('getDaysUntilWarrantyExpiration', () => {
    const baseWarranty: Warranty = {
      id: 'w-1',
      company_id: 'company-1',
      project_id: 'project-1',
      warranty_number: null,
      title: 'Test',
      description: null,
      spec_section: null,
      subcontractor_id: null,
      manufacturer_name: null,
      manufacturer_contact: null,
      manufacturer_phone: null,
      manufacturer_email: null,
      warranty_type: null,
      coverage_description: null,
      start_date: '2024-01-01',
      end_date: '2025-01-01',
      duration_years: null,
      document_url: null,
      closeout_document_id: null,
      status: 'active',
      notification_days: [],
      last_notification_sent: null,
      notes: null,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      deleted_at: null,
    }

    it('should return positive days for future date', () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 30)
      const warranty = { ...baseWarranty, end_date: futureDate.toISOString() }
      expect(getDaysUntilWarrantyExpiration(warranty)).toBe(30)
    })

    it('should return negative days for past date', () => {
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 15)
      const warranty = { ...baseWarranty, end_date: pastDate.toISOString() }
      expect(getDaysUntilWarrantyExpiration(warranty)).toBe(-15)
    })
  })

  describe('getCloseoutTrafficLight', () => {
    it('should return gray for zero total', () => {
      expect(getCloseoutTrafficLight(0, 0, 0, 0)).toBe('gray')
    })

    it('should return red when there are rejected items', () => {
      expect(getCloseoutTrafficLight(5, 3, 2, 10)).toBe('red')
    })

    it('should return green when all approved', () => {
      expect(getCloseoutTrafficLight(10, 0, 0, 10)).toBe('green')
    })

    it('should return yellow when some approved or pending', () => {
      expect(getCloseoutTrafficLight(5, 5, 0, 10)).toBe('yellow')
      expect(getCloseoutTrafficLight(0, 10, 0, 10)).toBe('yellow')
    })

    it('should return gray when no progress', () => {
      expect(getCloseoutTrafficLight(0, 0, 0, 10)).toBe('gray')
    })
  })

  describe('groupDocumentsBySpecSection', () => {
    const mockDocuments: CloseoutDocument[] = [
      {
        id: '1',
        company_id: 'c1',
        project_id: 'p1',
        document_type: 'om_manual',
        title: 'HVAC Manual',
        description: null,
        spec_section: '23 00 00',
        spec_section_title: 'HVAC',
        subcontractor_id: null,
        responsible_party: null,
        required: true,
        required_copies: 1,
        format_required: null,
        required_date: null,
        submitted_date: null,
        approved_date: null,
        status: 'pending',
        document_url: null,
        document_urls: [],
        reviewed_by: null,
        reviewed_at: null,
        review_notes: null,
        rejection_reason: null,
        notes: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        created_by: null,
        deleted_at: null,
      },
      {
        id: '2',
        company_id: 'c1',
        project_id: 'p1',
        document_type: 'as_built',
        title: 'Electrical As-Built',
        description: null,
        spec_section: '26 00 00',
        spec_section_title: 'Electrical',
        subcontractor_id: null,
        responsible_party: null,
        required: true,
        required_copies: 1,
        format_required: null,
        required_date: null,
        submitted_date: null,
        approved_date: null,
        status: 'pending',
        document_url: null,
        document_urls: [],
        reviewed_by: null,
        reviewed_at: null,
        review_notes: null,
        rejection_reason: null,
        notes: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        created_by: null,
        deleted_at: null,
      },
      {
        id: '3',
        company_id: 'c1',
        project_id: 'p1',
        document_type: 'warranty',
        title: 'Unassigned Warranty',
        description: null,
        spec_section: null,
        spec_section_title: null,
        subcontractor_id: null,
        responsible_party: null,
        required: true,
        required_copies: 1,
        format_required: null,
        required_date: null,
        submitted_date: null,
        approved_date: null,
        status: 'pending',
        document_url: null,
        document_urls: [],
        reviewed_by: null,
        reviewed_at: null,
        review_notes: null,
        rejection_reason: null,
        notes: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        created_by: null,
        deleted_at: null,
      },
    ]

    it('should group documents by spec section', () => {
      const grouped = groupDocumentsBySpecSection(mockDocuments)
      expect(Object.keys(grouped)).toHaveLength(3)
      expect(grouped['23 00 00']).toHaveLength(1)
      expect(grouped['26 00 00']).toHaveLength(1)
      expect(grouped['Unassigned']).toHaveLength(1)
    })

    it('should handle empty array', () => {
      const grouped = groupDocumentsBySpecSection([])
      expect(Object.keys(grouped)).toHaveLength(0)
    })
  })

  describe('groupDocumentsByCategory', () => {
    const mockDocuments: CloseoutDocument[] = [
      {
        id: '1',
        company_id: 'c1',
        project_id: 'p1',
        document_type: 'om_manual',
        title: 'Manual',
        description: null,
        spec_section: null,
        spec_section_title: null,
        subcontractor_id: null,
        responsible_party: null,
        required: true,
        required_copies: 1,
        format_required: null,
        required_date: null,
        submitted_date: null,
        approved_date: null,
        status: 'pending',
        document_url: null,
        document_urls: [],
        reviewed_by: null,
        reviewed_at: null,
        review_notes: null,
        rejection_reason: null,
        notes: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        created_by: null,
        deleted_at: null,
      },
      {
        id: '2',
        company_id: 'c1',
        project_id: 'p1',
        document_type: 'warranty',
        title: 'Warranty',
        description: null,
        spec_section: null,
        spec_section_title: null,
        subcontractor_id: null,
        responsible_party: null,
        required: true,
        required_copies: 1,
        format_required: null,
        required_date: null,
        submitted_date: null,
        approved_date: null,
        status: 'pending',
        document_url: null,
        document_urls: [],
        reviewed_by: null,
        reviewed_at: null,
        review_notes: null,
        rejection_reason: null,
        notes: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        created_by: null,
        deleted_at: null,
      },
      {
        id: '3',
        company_id: 'c1',
        project_id: 'p1',
        document_type: 'training_cert',
        title: 'Training',
        description: null,
        spec_section: null,
        spec_section_title: null,
        subcontractor_id: null,
        responsible_party: null,
        required: true,
        required_copies: 1,
        format_required: null,
        required_date: null,
        submitted_date: null,
        approved_date: null,
        status: 'pending',
        document_url: null,
        document_urls: [],
        reviewed_by: null,
        reviewed_at: null,
        review_notes: null,
        rejection_reason: null,
        notes: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        created_by: null,
        deleted_at: null,
      },
    ]

    it('should group documents by category', () => {
      const grouped = groupDocumentsByCategory(mockDocuments)
      expect(grouped['documentation']).toHaveLength(1)
      expect(grouped['warranty']).toHaveLength(1)
      expect(grouped['training']).toHaveLength(1)
    })
  })
})

// ============================================================================
// TYPE STRUCTURE TESTS
// ============================================================================

describe('Closeout Type Structures', () => {
  it('should have all properties on CloseoutDocument interface', () => {
    const doc: CloseoutDocument = {
      id: 'doc-1',
      company_id: 'company-1',
      project_id: 'project-1',
      document_type: 'om_manual',
      title: 'HVAC O&M Manual',
      description: 'Complete HVAC operation and maintenance manual',
      spec_section: '23 00 00',
      spec_section_title: 'HVAC',
      subcontractor_id: 'sub-1',
      responsible_party: 'HVAC Contractor',
      required: true,
      required_copies: 3,
      format_required: 'PDF and printed',
      required_date: '2024-12-31',
      submitted_date: '2024-12-15',
      approved_date: '2024-12-20',
      status: 'approved',
      document_url: 'https://storage.example.com/docs/hvac-manual.pdf',
      document_urls: ['url1', 'url2'],
      reviewed_by: 'reviewer-1',
      reviewed_at: '2024-12-20T00:00:00Z',
      review_notes: 'Looks good',
      rejection_reason: null,
      notes: 'Includes all system diagrams',
      created_at: '2024-12-01T00:00:00Z',
      updated_at: '2024-12-20T00:00:00Z',
      created_by: 'user-1',
      deleted_at: null,
    }

    expect(doc.document_type).toBe('om_manual')
    expect(doc.status).toBe('approved')
    expect(doc.required).toBe(true)
  })

  it('should have all properties on Warranty interface', () => {
    const warranty: Warranty = {
      id: 'w-1',
      company_id: 'company-1',
      project_id: 'project-1',
      warranty_number: 'W-2024-001',
      title: 'Roof Warranty',
      description: '20-year manufacturer warranty on roofing system',
      spec_section: '07 50 00',
      subcontractor_id: 'sub-1',
      manufacturer_name: 'ABC Roofing Co',
      manufacturer_contact: 'John Doe',
      manufacturer_phone: '555-1234',
      manufacturer_email: 'john@abcroofing.com',
      warranty_type: 'manufacturer',
      coverage_description: 'Full material and workmanship',
      start_date: '2024-01-01',
      end_date: '2044-01-01',
      duration_years: 20,
      document_url: 'https://storage.example.com/warranties/roof.pdf',
      closeout_document_id: 'closeout-1',
      status: 'active',
      notification_days: [90, 60, 30, 7],
      last_notification_sent: null,
      notes: 'Extended warranty purchased',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      deleted_at: null,
    }

    expect(warranty.warranty_type).toBe('manufacturer')
    expect(warranty.status).toBe('active')
    expect(warranty.notification_days).toHaveLength(4)
  })
})
