// File: /src/types/permits.test.ts
// Tests for permits types and utility functions

import { describe, it, expect } from 'vitest'
import {
  PermitStatus,
  PermitType,
  getPermitStatusLabel,
  getPermitStatusColor,
  getPermitTypeLabel,
  isPermitExpiringSoon,
  isPermitExpired,
  getDaysUntilExpiration,
  isCriticalPermit,
  getNextPermitStatusOptions,
  type Permit,
  type CreatePermitDTO,
  type UpdatePermitDTO,
  type PermitFilters,
  type PermitStatistics,
} from './permits'

// Mock permit for testing
const createMockPermit = (overrides: Partial<Permit> = {}): Permit => ({
  id: 'permit-1',
  project_id: 'project-123',
  permit_name: 'Building Permit',
  permit_number: 'BP-2024-001',
  permit_type: PermitType.BUILDING,
  status: PermitStatus.ACTIVE,
  permit_document_url: null,
  application_date: '2024-01-15',
  issue_date: '2024-02-01',
  expiration_date: null,
  renewal_date: null,
  renewal_reminder_days_before: 30,
  renewal_reminder_sent: false,
  issuing_agency: 'City Building Department',
  agency_contact: 'John Smith',
  agency_phone: '555-123-4567',
  work_cannot_proceed_without: true,
  requires_inspections: true,
  notes: 'General building permit',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  created_by: 'user-123',
  deleted_at: null,
  ...overrides,
})

describe('Permits Types', () => {
  describe('PermitStatus enum', () => {
    it('should have all expected status values', () => {
      expect(PermitStatus.PENDING).toBe('pending')
      expect(PermitStatus.APPLIED).toBe('applied')
      expect(PermitStatus.UNDER_REVIEW).toBe('under_review')
      expect(PermitStatus.APPROVED).toBe('approved')
      expect(PermitStatus.ISSUED).toBe('issued')
      expect(PermitStatus.ACTIVE).toBe('active')
      expect(PermitStatus.EXPIRED).toBe('expired')
      expect(PermitStatus.RENEWED).toBe('renewed')
      expect(PermitStatus.REVOKED).toBe('revoked')
      expect(PermitStatus.CLOSED).toBe('closed')
    })

    it('should have exactly 10 status values', () => {
      const statuses = Object.values(PermitStatus)
      expect(statuses).toHaveLength(10)
    })
  })

  describe('PermitType enum', () => {
    it('should have all expected type values', () => {
      expect(PermitType.BUILDING).toBe('building')
      expect(PermitType.DEMOLITION).toBe('demolition')
      expect(PermitType.ELECTRICAL).toBe('electrical')
      expect(PermitType.PLUMBING).toBe('plumbing')
      expect(PermitType.MECHANICAL).toBe('mechanical')
      expect(PermitType.FIRE).toBe('fire')
      expect(PermitType.GRADING).toBe('grading')
      expect(PermitType.EXCAVATION).toBe('excavation')
      expect(PermitType.ENCROACHMENT).toBe('encroachment')
      expect(PermitType.SIGNAGE).toBe('signage')
      expect(PermitType.ENVIRONMENTAL).toBe('environmental')
      expect(PermitType.STORMWATER).toBe('stormwater')
      expect(PermitType.TEMPORARY).toBe('temporary')
      expect(PermitType.OCCUPANCY).toBe('occupancy')
      expect(PermitType.OTHER).toBe('other')
    })

    it('should have exactly 15 type values', () => {
      const types = Object.values(PermitType)
      expect(types).toHaveLength(15)
    })
  })

  describe('getPermitStatusLabel', () => {
    it('should return correct labels for all statuses', () => {
      expect(getPermitStatusLabel(PermitStatus.PENDING)).toBe('Pending')
      expect(getPermitStatusLabel(PermitStatus.APPLIED)).toBe('Applied')
      expect(getPermitStatusLabel(PermitStatus.UNDER_REVIEW)).toBe('Under Review')
      expect(getPermitStatusLabel(PermitStatus.APPROVED)).toBe('Approved')
      expect(getPermitStatusLabel(PermitStatus.ISSUED)).toBe('Issued')
      expect(getPermitStatusLabel(PermitStatus.ACTIVE)).toBe('Active')
      expect(getPermitStatusLabel(PermitStatus.EXPIRED)).toBe('Expired')
      expect(getPermitStatusLabel(PermitStatus.RENEWED)).toBe('Renewed')
      expect(getPermitStatusLabel(PermitStatus.REVOKED)).toBe('Revoked')
      expect(getPermitStatusLabel(PermitStatus.CLOSED)).toBe('Closed')
    })

    it('should handle null status', () => {
      expect(getPermitStatusLabel(null)).toBe('Unknown')
    })

    it('should return original value for unknown status', () => {
      expect(getPermitStatusLabel('custom_status')).toBe('custom_status')
    })
  })

  describe('getPermitStatusColor', () => {
    it('should return correct colors for all statuses', () => {
      expect(getPermitStatusColor(PermitStatus.PENDING)).toBe('bg-gray-100 text-gray-800')
      expect(getPermitStatusColor(PermitStatus.APPLIED)).toBe('bg-blue-100 text-blue-800')
      expect(getPermitStatusColor(PermitStatus.UNDER_REVIEW)).toBe('bg-yellow-100 text-yellow-800')
      expect(getPermitStatusColor(PermitStatus.APPROVED)).toBe('bg-green-100 text-green-800')
      expect(getPermitStatusColor(PermitStatus.ISSUED)).toBe('bg-green-100 text-green-800')
      expect(getPermitStatusColor(PermitStatus.ACTIVE)).toBe('bg-green-100 text-green-800')
      expect(getPermitStatusColor(PermitStatus.EXPIRED)).toBe('bg-red-100 text-red-800')
      expect(getPermitStatusColor(PermitStatus.RENEWED)).toBe('bg-purple-100 text-purple-800')
      expect(getPermitStatusColor(PermitStatus.REVOKED)).toBe('bg-red-100 text-red-800')
      expect(getPermitStatusColor(PermitStatus.CLOSED)).toBe('bg-gray-100 text-gray-500')
    })

    it('should return default color for null status', () => {
      expect(getPermitStatusColor(null)).toBe('bg-gray-100 text-gray-800')
    })

    it('should return default color for unknown status', () => {
      expect(getPermitStatusColor('unknown')).toBe('bg-gray-100 text-gray-800')
    })
  })

  describe('getPermitTypeLabel', () => {
    it('should return correct labels for all types', () => {
      expect(getPermitTypeLabel(PermitType.BUILDING)).toBe('Building')
      expect(getPermitTypeLabel(PermitType.DEMOLITION)).toBe('Demolition')
      expect(getPermitTypeLabel(PermitType.ELECTRICAL)).toBe('Electrical')
      expect(getPermitTypeLabel(PermitType.PLUMBING)).toBe('Plumbing')
      expect(getPermitTypeLabel(PermitType.MECHANICAL)).toBe('Mechanical')
      expect(getPermitTypeLabel(PermitType.FIRE)).toBe('Fire')
      expect(getPermitTypeLabel(PermitType.GRADING)).toBe('Grading')
      expect(getPermitTypeLabel(PermitType.EXCAVATION)).toBe('Excavation')
      expect(getPermitTypeLabel(PermitType.ENCROACHMENT)).toBe('Encroachment')
      expect(getPermitTypeLabel(PermitType.SIGNAGE)).toBe('Signage')
      expect(getPermitTypeLabel(PermitType.ENVIRONMENTAL)).toBe('Environmental')
      expect(getPermitTypeLabel(PermitType.STORMWATER)).toBe('Stormwater')
      expect(getPermitTypeLabel(PermitType.TEMPORARY)).toBe('Temporary')
      expect(getPermitTypeLabel(PermitType.OCCUPANCY)).toBe('Certificate of Occupancy')
      expect(getPermitTypeLabel(PermitType.OTHER)).toBe('Other')
    })

    it('should return original value for unknown type', () => {
      expect(getPermitTypeLabel('custom_type')).toBe('custom_type')
    })
  })

  describe('isPermitExpiringSoon', () => {
    it('should return true when permit expires within default 30 days', () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 15) // 15 days from now
      const permit = createMockPermit({ expiration_date: futureDate.toISOString() })
      expect(isPermitExpiringSoon(permit)).toBe(true)
    })

    it('should return false when permit expires beyond 30 days', () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 60) // 60 days from now
      const permit = createMockPermit({ expiration_date: futureDate.toISOString() })
      expect(isPermitExpiringSoon(permit)).toBe(false)
    })

    it('should return false when permit is already expired', () => {
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 10) // 10 days ago
      const permit = createMockPermit({ expiration_date: pastDate.toISOString() })
      expect(isPermitExpiringSoon(permit)).toBe(false)
    })

    it('should return false when no expiration date', () => {
      const permit = createMockPermit({ expiration_date: null })
      expect(isPermitExpiringSoon(permit)).toBe(false)
    })

    it('should use custom withinDays parameter', () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 45) // 45 days from now
      const permit = createMockPermit({ expiration_date: futureDate.toISOString() })
      expect(isPermitExpiringSoon(permit, 30)).toBe(false)
      expect(isPermitExpiringSoon(permit, 60)).toBe(true)
    })
  })

  describe('isPermitExpired', () => {
    it('should return true when permit is expired', () => {
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 10) // 10 days ago
      const permit = createMockPermit({ expiration_date: pastDate.toISOString() })
      expect(isPermitExpired(permit)).toBe(true)
    })

    it('should return false when permit is not expired', () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 30) // 30 days from now
      const permit = createMockPermit({ expiration_date: futureDate.toISOString() })
      expect(isPermitExpired(permit)).toBe(false)
    })

    it('should return false when no expiration date', () => {
      const permit = createMockPermit({ expiration_date: null })
      expect(isPermitExpired(permit)).toBe(false)
    })
  })

  describe('getDaysUntilExpiration', () => {
    it('should return positive days for future expiration', () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 30)
      const permit = createMockPermit({ expiration_date: futureDate.toISOString() })
      const days = getDaysUntilExpiration(permit)
      expect(days).toBeGreaterThanOrEqual(29) // Allow for day boundary
      expect(days).toBeLessThanOrEqual(31)
    })

    it('should return negative days for past expiration', () => {
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 10)
      const permit = createMockPermit({ expiration_date: pastDate.toISOString() })
      const days = getDaysUntilExpiration(permit)
      expect(days).toBeLessThanOrEqual(-9)
      expect(days).toBeGreaterThanOrEqual(-11)
    })

    it('should return null when no expiration date', () => {
      const permit = createMockPermit({ expiration_date: null })
      expect(getDaysUntilExpiration(permit)).toBeNull()
    })
  })

  describe('isCriticalPermit', () => {
    it('should return true when work_cannot_proceed_without is true', () => {
      const permit = createMockPermit({ work_cannot_proceed_without: true })
      expect(isCriticalPermit(permit)).toBe(true)
    })

    it('should return false when work_cannot_proceed_without is false', () => {
      const permit = createMockPermit({ work_cannot_proceed_without: false })
      expect(isCriticalPermit(permit)).toBe(false)
    })

    it('should return false when work_cannot_proceed_without is null', () => {
      const permit = createMockPermit({ work_cannot_proceed_without: null })
      expect(isCriticalPermit(permit)).toBe(false)
    })
  })

  describe('getNextPermitStatusOptions', () => {
    it('should return APPLIED for PENDING', () => {
      const options = getNextPermitStatusOptions(PermitStatus.PENDING)
      expect(options).toEqual([PermitStatus.APPLIED])
    })

    it('should return UNDER_REVIEW and APPROVED for APPLIED', () => {
      const options = getNextPermitStatusOptions(PermitStatus.APPLIED)
      expect(options).toEqual([PermitStatus.UNDER_REVIEW, PermitStatus.APPROVED])
    })

    it('should return APPROVED and PENDING for UNDER_REVIEW', () => {
      const options = getNextPermitStatusOptions(PermitStatus.UNDER_REVIEW)
      expect(options).toEqual([PermitStatus.APPROVED, PermitStatus.PENDING])
    })

    it('should return ISSUED for APPROVED', () => {
      const options = getNextPermitStatusOptions(PermitStatus.APPROVED)
      expect(options).toEqual([PermitStatus.ISSUED])
    })

    it('should return ACTIVE for ISSUED', () => {
      const options = getNextPermitStatusOptions(PermitStatus.ISSUED)
      expect(options).toEqual([PermitStatus.ACTIVE])
    })

    it('should return EXPIRED, RENEWED, REVOKED, CLOSED for ACTIVE', () => {
      const options = getNextPermitStatusOptions(PermitStatus.ACTIVE)
      expect(options).toEqual([
        PermitStatus.EXPIRED,
        PermitStatus.RENEWED,
        PermitStatus.REVOKED,
        PermitStatus.CLOSED,
      ])
    })

    it('should return RENEWED and CLOSED for EXPIRED', () => {
      const options = getNextPermitStatusOptions(PermitStatus.EXPIRED)
      expect(options).toEqual([PermitStatus.RENEWED, PermitStatus.CLOSED])
    })

    it('should return ACTIVE for RENEWED', () => {
      const options = getNextPermitStatusOptions(PermitStatus.RENEWED)
      expect(options).toEqual([PermitStatus.ACTIVE])
    })

    it('should return CLOSED for REVOKED', () => {
      const options = getNextPermitStatusOptions(PermitStatus.REVOKED)
      expect(options).toEqual([PermitStatus.CLOSED])
    })

    it('should return empty array for CLOSED', () => {
      const options = getNextPermitStatusOptions(PermitStatus.CLOSED)
      expect(options).toEqual([])
    })

    it('should return PENDING for null status', () => {
      const options = getNextPermitStatusOptions(null)
      expect(options).toEqual([PermitStatus.PENDING])
    })

    it('should return PENDING for unknown status', () => {
      const options = getNextPermitStatusOptions('unknown_status')
      expect(options).toEqual([PermitStatus.PENDING])
    })
  })

  describe('Permit interface', () => {
    it('should have all required fields', () => {
      const permit = createMockPermit()
      expect(permit.id).toBeDefined()
      expect(permit.project_id).toBeDefined()
      expect(permit.permit_name).toBeDefined()
      expect(permit.permit_type).toBeDefined()
    })

    it('should allow optional relationship fields', () => {
      const permitWithRelations = createMockPermit({
        project: { id: 'proj-1', name: 'Test Project', project_number: 'P-001' },
        created_by_user: { id: 'user-1', full_name: 'John Doe', email: 'john@example.com' },
      })
      expect(permitWithRelations.project?.name).toBe('Test Project')
      expect(permitWithRelations.created_by_user?.full_name).toBe('John Doe')
    })
  })

  describe('CreatePermitDTO interface', () => {
    it('should require project_id, permit_name, and permit_type', () => {
      const dto: CreatePermitDTO = {
        project_id: 'project-123',
        permit_name: 'Building Permit',
        permit_type: PermitType.BUILDING,
      }
      expect(dto.project_id).toBe('project-123')
      expect(dto.permit_name).toBe('Building Permit')
      expect(dto.permit_type).toBe(PermitType.BUILDING)
    })

    it('should allow optional fields', () => {
      const dto: CreatePermitDTO = {
        project_id: 'project-123',
        permit_name: 'Building Permit',
        permit_type: PermitType.BUILDING,
        permit_number: 'BP-001',
        status: PermitStatus.PENDING,
        issuing_agency: 'City Building Dept',
        work_cannot_proceed_without: true,
        requires_inspections: true,
      }
      expect(dto.permit_number).toBe('BP-001')
      expect(dto.issuing_agency).toBe('City Building Dept')
    })
  })

  describe('UpdatePermitDTO interface', () => {
    it('should allow partial updates', () => {
      const dto: UpdatePermitDTO = {
        status: PermitStatus.APPROVED,
        notes: 'Updated notes',
      }
      expect(dto.status).toBe(PermitStatus.APPROVED)
      expect(dto.notes).toBe('Updated notes')
    })
  })

  describe('PermitFilters interface', () => {
    it('should support all filter options', () => {
      const filters: PermitFilters = {
        project_id: 'project-123',
        status: PermitStatus.ACTIVE,
        permit_type: PermitType.BUILDING,
        issuing_agency: 'City Building Dept',
        requires_inspections: true,
        work_cannot_proceed_without: true,
        expiring_before: '2024-12-31',
        expiring_within_days: 30,
        search: 'building',
      }
      expect(filters.project_id).toBe('project-123')
      expect(filters.status).toBe(PermitStatus.ACTIVE)
      expect(filters.expiring_within_days).toBe(30)
    })
  })

  describe('PermitStatistics interface', () => {
    it('should have all expected fields', () => {
      const stats: PermitStatistics = {
        total: 50,
        by_status: { active: 30, expired: 10, pending: 10 },
        by_type: { building: 20, electrical: 15, plumbing: 15 },
        expiring_soon: 5,
        expired: 10,
        critical_permits: 8,
      }
      expect(stats.total).toBe(50)
      expect(stats.by_status.active).toBe(30)
      expect(stats.expiring_soon).toBe(5)
      expect(stats.critical_permits).toBe(8)
    })
  })
})
