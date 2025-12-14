// File: /src/features/permits/hooks/usePermits.test.tsx
// Tests for permits hooks

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { PermitStatus, PermitType } from '@/types/permits'

// Mock permitsApi
const mockGetPermits = vi.fn()
const mockGetPermitById = vi.fn()
const mockGetProjectPermits = vi.fn()
const mockGetExpiringPermits = vi.fn()
const mockGetExpiredPermits = vi.fn()
const mockGetCriticalPermits = vi.fn()
const mockGetPermitsRequiringInspections = vi.fn()
const mockGetPermitStatistics = vi.fn()
const mockGetPermitsByStatus = vi.fn()
const mockGetPermitsByType = vi.fn()
const mockGetPermitsNeedingRenewalReminder = vi.fn()
const mockCreatePermit = vi.fn()
const mockUpdatePermit = vi.fn()
const mockUpdatePermitStatus = vi.fn()
const mockDeletePermit = vi.fn()
const mockMarkRenewalReminderSent = vi.fn()

vi.mock('@/lib/api/services/permits', () => ({
  permitsApi: {
    getPermits: (...args: unknown[]) => mockGetPermits(...args),
    getPermitById: (...args: unknown[]) => mockGetPermitById(...args),
    getProjectPermits: (...args: unknown[]) => mockGetProjectPermits(...args),
    getExpiringPermits: (...args: unknown[]) => mockGetExpiringPermits(...args),
    getExpiredPermits: (...args: unknown[]) => mockGetExpiredPermits(...args),
    getCriticalPermits: (...args: unknown[]) => mockGetCriticalPermits(...args),
    getPermitsRequiringInspections: (...args: unknown[]) => mockGetPermitsRequiringInspections(...args),
    getPermitStatistics: (...args: unknown[]) => mockGetPermitStatistics(...args),
    getPermitsByStatus: (...args: unknown[]) => mockGetPermitsByStatus(...args),
    getPermitsByType: (...args: unknown[]) => mockGetPermitsByType(...args),
    getPermitsNeedingRenewalReminder: (...args: unknown[]) => mockGetPermitsNeedingRenewalReminder(...args),
    createPermit: (...args: unknown[]) => mockCreatePermit(...args),
    updatePermit: (...args: unknown[]) => mockUpdatePermit(...args),
    updatePermitStatus: (...args: unknown[]) => mockUpdatePermitStatus(...args),
    deletePermit: (...args: unknown[]) => mockDeletePermit(...args),
    markRenewalReminderSent: (...args: unknown[]) => mockMarkRenewalReminderSent(...args),
  },
}))

import {
  permitKeys,
  usePermits,
  usePermit,
  useProjectPermits,
  useExpiringPermits,
  useExpiredPermits,
  useCriticalPermits,
  usePermitsRequiringInspections,
  usePermitStatistics,
  usePermitsByStatus,
  usePermitsByType,
  usePermitsNeedingRenewalReminder,
  useCreatePermit,
  useUpdatePermit,
  useUpdatePermitStatus,
  useDeletePermit,
  useMarkRenewalReminderSent,
} from './usePermits'

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

// Mock permit data
const mockPermit = {
  id: 'permit-1',
  project_id: 'project-123',
  permit_name: 'Building Permit',
  permit_number: 'BP-2024-001',
  permit_type: PermitType.BUILDING,
  status: PermitStatus.ACTIVE,
  permit_document_url: null,
  application_date: '2024-01-15',
  issue_date: '2024-02-01',
  expiration_date: '2025-02-01',
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
}

const mockStats = {
  total: 25,
  by_status: { active: 15, expired: 5, pending: 5 },
  by_type: { building: 10, electrical: 8, plumbing: 7 },
  expiring_soon: 3,
  expired: 5,
  critical_permits: 8,
}

describe('usePermits hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('permitKeys', () => {
    it('should generate correct all key', () => {
      expect(permitKeys.all).toEqual(['permits'])
    })

    it('should generate correct lists key', () => {
      expect(permitKeys.lists()).toEqual(['permits', 'list'])
    })

    it('should generate correct list key with filters', () => {
      const filters = { project_id: 'proj-1', status: PermitStatus.ACTIVE }
      expect(permitKeys.list(filters)).toEqual(['permits', 'list', filters])
    })

    it('should generate correct details key', () => {
      expect(permitKeys.details()).toEqual(['permits', 'detail'])
    })

    it('should generate correct detail key', () => {
      expect(permitKeys.detail('permit-1')).toEqual(['permits', 'detail', 'permit-1'])
    })

    it('should generate correct project key', () => {
      expect(permitKeys.project('project-123')).toEqual(['permits', 'project', 'project-123'])
    })

    it('should generate correct expiring key', () => {
      expect(permitKeys.expiring('project-123', 30)).toEqual(['permits', 'expiring', 'project-123', 30])
    })

    it('should generate correct expired key', () => {
      expect(permitKeys.expired('project-123')).toEqual(['permits', 'expired', 'project-123'])
    })

    it('should generate correct critical key', () => {
      expect(permitKeys.critical('project-123')).toEqual(['permits', 'critical', 'project-123'])
    })

    it('should generate correct requiresInspections key', () => {
      expect(permitKeys.requiresInspections('project-123')).toEqual([
        'permits',
        'requires-inspections',
        'project-123',
      ])
    })

    it('should generate correct statistics key', () => {
      expect(permitKeys.statistics('project-123')).toEqual(['permits', 'statistics', 'project-123'])
    })

    it('should generate correct byStatus key', () => {
      expect(permitKeys.byStatus('project-123', 'active')).toEqual([
        'permits',
        'by-status',
        'project-123',
        'active',
      ])
    })

    it('should generate correct byType key', () => {
      expect(permitKeys.byType('project-123', 'building')).toEqual([
        'permits',
        'by-type',
        'project-123',
        'building',
      ])
    })

    it('should generate correct needingReminder key', () => {
      expect(permitKeys.needingReminder()).toEqual(['permits', 'needing-reminder'])
    })
  })

  describe('usePermits hook', () => {
    it('should fetch permits with no filters', async () => {
      mockGetPermits.mockResolvedValue([mockPermit])

      const { result } = renderHook(() => usePermits(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toHaveLength(1)
      expect(mockGetPermits).toHaveBeenCalledWith({})
    })

    it('should fetch permits with filters', async () => {
      mockGetPermits.mockResolvedValue([mockPermit])

      const filters = { project_id: 'project-123', status: PermitStatus.ACTIVE }
      const { result } = renderHook(() => usePermits(filters), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockGetPermits).toHaveBeenCalledWith(filters)
    })
  })

  describe('usePermit hook', () => {
    it('should fetch a single permit', async () => {
      mockGetPermitById.mockResolvedValue(mockPermit)

      const { result } = renderHook(() => usePermit('permit-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data?.id).toBe('permit-1')
      expect(mockGetPermitById).toHaveBeenCalledWith('permit-1')
    })

    it('should be disabled when id is undefined', () => {
      const { result } = renderHook(() => usePermit(undefined), {
        wrapper: createWrapper(),
      })

      expect(result.current.fetchStatus).toBe('idle')
    })
  })

  describe('useProjectPermits hook', () => {
    it('should fetch permits for a project', async () => {
      mockGetProjectPermits.mockResolvedValue([mockPermit])

      const { result } = renderHook(() => useProjectPermits('project-123'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toHaveLength(1)
      expect(mockGetProjectPermits).toHaveBeenCalledWith('project-123')
    })

    it('should be disabled when projectId is undefined', () => {
      const { result } = renderHook(() => useProjectPermits(undefined), {
        wrapper: createWrapper(),
      })

      expect(result.current.fetchStatus).toBe('idle')
    })
  })

  describe('useExpiringPermits hook', () => {
    it('should fetch expiring permits', async () => {
      mockGetExpiringPermits.mockResolvedValue([mockPermit])

      const { result } = renderHook(() => useExpiringPermits('project-123', 30), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toHaveLength(1)
      expect(mockGetExpiringPermits).toHaveBeenCalledWith('project-123', 30)
    })

    it('should use default withinDays of 30', async () => {
      mockGetExpiringPermits.mockResolvedValue([mockPermit])

      const { result } = renderHook(() => useExpiringPermits('project-123'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockGetExpiringPermits).toHaveBeenCalledWith('project-123', 30)
    })
  })

  describe('useExpiredPermits hook', () => {
    it('should fetch expired permits', async () => {
      mockGetExpiredPermits.mockResolvedValue([mockPermit])

      const { result } = renderHook(() => useExpiredPermits('project-123'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toHaveLength(1)
      expect(mockGetExpiredPermits).toHaveBeenCalledWith('project-123')
    })

    it('should fetch all expired permits when no projectId', async () => {
      mockGetExpiredPermits.mockResolvedValue([mockPermit])

      const { result } = renderHook(() => useExpiredPermits(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockGetExpiredPermits).toHaveBeenCalledWith(undefined)
    })
  })

  describe('useCriticalPermits hook', () => {
    it('should fetch critical permits', async () => {
      mockGetCriticalPermits.mockResolvedValue([mockPermit])

      const { result } = renderHook(() => useCriticalPermits('project-123'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toHaveLength(1)
      expect(mockGetCriticalPermits).toHaveBeenCalledWith('project-123')
    })

    it('should be disabled when projectId is undefined', () => {
      const { result } = renderHook(() => useCriticalPermits(undefined), {
        wrapper: createWrapper(),
      })

      expect(result.current.fetchStatus).toBe('idle')
    })
  })

  describe('usePermitsRequiringInspections hook', () => {
    it('should fetch permits requiring inspections', async () => {
      mockGetPermitsRequiringInspections.mockResolvedValue([mockPermit])

      const { result } = renderHook(() => usePermitsRequiringInspections('project-123'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toHaveLength(1)
      expect(mockGetPermitsRequiringInspections).toHaveBeenCalledWith('project-123')
    })

    it('should be disabled when projectId is undefined', () => {
      const { result } = renderHook(() => usePermitsRequiringInspections(undefined), {
        wrapper: createWrapper(),
      })

      expect(result.current.fetchStatus).toBe('idle')
    })
  })

  describe('usePermitStatistics hook', () => {
    it('should fetch permit statistics', async () => {
      mockGetPermitStatistics.mockResolvedValue(mockStats)

      const { result } = renderHook(() => usePermitStatistics('project-123'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data?.total).toBe(25)
      expect(result.current.data?.critical_permits).toBe(8)
    })

    it('should be disabled when projectId is undefined', () => {
      const { result } = renderHook(() => usePermitStatistics(undefined), {
        wrapper: createWrapper(),
      })

      expect(result.current.fetchStatus).toBe('idle')
    })
  })

  describe('usePermitsByStatus hook', () => {
    it('should fetch permits by status', async () => {
      mockGetPermitsByStatus.mockResolvedValue([mockPermit])

      const { result } = renderHook(() => usePermitsByStatus('project-123', PermitStatus.ACTIVE), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toHaveLength(1)
      expect(mockGetPermitsByStatus).toHaveBeenCalledWith('project-123', PermitStatus.ACTIVE)
    })

    it('should be disabled when projectId is undefined', () => {
      const { result } = renderHook(() => usePermitsByStatus(undefined, PermitStatus.ACTIVE), {
        wrapper: createWrapper(),
      })

      expect(result.current.fetchStatus).toBe('idle')
    })
  })

  describe('usePermitsByType hook', () => {
    it('should fetch permits by type', async () => {
      mockGetPermitsByType.mockResolvedValue([mockPermit])

      const { result } = renderHook(() => usePermitsByType('project-123', PermitType.BUILDING), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toHaveLength(1)
      expect(mockGetPermitsByType).toHaveBeenCalledWith('project-123', PermitType.BUILDING)
    })

    it('should be disabled when projectId is undefined', () => {
      const { result } = renderHook(() => usePermitsByType(undefined, PermitType.BUILDING), {
        wrapper: createWrapper(),
      })

      expect(result.current.fetchStatus).toBe('idle')
    })
  })

  describe('usePermitsNeedingRenewalReminder hook', () => {
    it('should fetch permits needing renewal reminder', async () => {
      mockGetPermitsNeedingRenewalReminder.mockResolvedValue([mockPermit])

      const { result } = renderHook(() => usePermitsNeedingRenewalReminder(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toHaveLength(1)
      expect(mockGetPermitsNeedingRenewalReminder).toHaveBeenCalled()
    })
  })

  describe('useCreatePermit hook', () => {
    it('should create a permit', async () => {
      mockCreatePermit.mockResolvedValue(mockPermit)

      const { result } = renderHook(() => useCreatePermit(), {
        wrapper: createWrapper(),
      })

      const newPermit = {
        project_id: 'project-123',
        permit_name: 'Building Permit',
        permit_type: PermitType.BUILDING,
      }

      await result.current.mutateAsync(newPermit)

      expect(mockCreatePermit).toHaveBeenCalledWith(newPermit)
    })
  })

  describe('useUpdatePermit hook', () => {
    it('should update a permit', async () => {
      mockUpdatePermit.mockResolvedValue({ ...mockPermit, permit_name: 'Updated Permit' })

      const { result } = renderHook(() => useUpdatePermit(), {
        wrapper: createWrapper(),
      })

      await result.current.mutateAsync({
        id: 'permit-1',
        permit_name: 'Updated Permit',
      })

      expect(mockUpdatePermit).toHaveBeenCalledWith('permit-1', {
        permit_name: 'Updated Permit',
      })
    })
  })

  describe('useUpdatePermitStatus hook', () => {
    it('should update permit status', async () => {
      mockUpdatePermitStatus.mockResolvedValue({ ...mockPermit, status: PermitStatus.EXPIRED })

      const { result } = renderHook(() => useUpdatePermitStatus(), {
        wrapper: createWrapper(),
      })

      await result.current.mutateAsync({
        id: 'permit-1',
        status: PermitStatus.EXPIRED,
      })

      expect(mockUpdatePermitStatus).toHaveBeenCalledWith('permit-1', PermitStatus.EXPIRED)
    })
  })

  describe('useDeletePermit hook', () => {
    it('should delete a permit', async () => {
      mockDeletePermit.mockResolvedValue(undefined)

      const { result } = renderHook(() => useDeletePermit(), {
        wrapper: createWrapper(),
      })

      await result.current.mutateAsync('permit-1')

      expect(mockDeletePermit).toHaveBeenCalledWith('permit-1')
    })
  })

  describe('useMarkRenewalReminderSent hook', () => {
    it('should mark renewal reminder as sent', async () => {
      mockMarkRenewalReminderSent.mockResolvedValue({ ...mockPermit, renewal_reminder_sent: true })

      const { result } = renderHook(() => useMarkRenewalReminderSent(), {
        wrapper: createWrapper(),
      })

      await result.current.mutateAsync('permit-1')

      expect(mockMarkRenewalReminderSent).toHaveBeenCalledWith('permit-1')
    })
  })
})
