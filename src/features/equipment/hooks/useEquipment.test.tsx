/**
 * Equipment Hooks Tests
 * Tests for equipment React Query hooks
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode } from 'react'

import {
  equipmentKeys,
  useEquipment,
  useEquipmentDetail,
  useEquipmentStatistics,
  useAvailableEquipment,
  useCreateEquipment,
  useUpdateEquipment,
  useUpdateEquipmentStatus,
  useDeleteEquipment,
  useEquipmentAssignments,
  useProjectEquipment,
  useAssignEquipment,
  useUpdateEquipmentAssignment,
  useReturnEquipment,
  useEquipmentLogs,
  useCreateEquipmentLog,
  useUpdateEquipmentLog,
  useDeleteEquipmentLog,
  useEquipmentMaintenance,
  useMaintenanceDetail,
  useUpcomingMaintenance,
  useScheduleMaintenance,
  useUpdateMaintenance,
  useCompleteMaintenance,
  useCancelMaintenance,
  useEquipmentInspections,
  useLatestInspection,
  useCreateEquipmentInspection,
} from './useEquipment'

// Mock functions
const mockGetEquipment = vi.fn()
const mockGetEquipmentById = vi.fn()
const mockGetEquipmentStatistics = vi.fn()
const mockGetAvailableEquipment = vi.fn()
const mockCreateEquipment = vi.fn()
const mockUpdateEquipment = vi.fn()
const mockUpdateEquipmentStatus = vi.fn()
const mockDeleteEquipment = vi.fn()
const mockGetAssignments = vi.fn()
const mockGetProjectEquipment = vi.fn()
const mockAssignEquipment = vi.fn()
const mockUpdateAssignment = vi.fn()
const mockReturnEquipment = vi.fn()
const mockGetLogs = vi.fn()
const mockCreateLog = vi.fn()
const mockUpdateLog = vi.fn()
const mockDeleteLog = vi.fn()
const mockGetMaintenance = vi.fn()
const mockGetMaintenanceById = vi.fn()
const mockGetUpcomingMaintenance = vi.fn()
const mockScheduleMaintenance = vi.fn()
const mockUpdateMaintenance = vi.fn()
const mockCompleteMaintenance = vi.fn()
const mockCancelMaintenance = vi.fn()
const mockGetInspections = vi.fn()
const mockGetLatestInspection = vi.fn()
const mockCreateInspection = vi.fn()
const mockToast = vi.fn()

// Mock the equipment API service
vi.mock('@/lib/api/services/equipment', () => ({
  equipmentApiService: {
    equipment: {
      getEquipment: (...args: unknown[]) => mockGetEquipment(...args),
      getEquipmentById: (...args: unknown[]) => mockGetEquipmentById(...args),
      getEquipmentStatistics: (...args: unknown[]) => mockGetEquipmentStatistics(...args),
      getAvailableEquipment: (...args: unknown[]) => mockGetAvailableEquipment(...args),
      createEquipment: (...args: unknown[]) => mockCreateEquipment(...args),
      updateEquipment: (...args: unknown[]) => mockUpdateEquipment(...args),
      updateEquipmentStatus: (...args: unknown[]) => mockUpdateEquipmentStatus(...args),
      deleteEquipment: (...args: unknown[]) => mockDeleteEquipment(...args),
    },
    assignments: {
      getAssignments: (...args: unknown[]) => mockGetAssignments(...args),
      getProjectEquipment: (...args: unknown[]) => mockGetProjectEquipment(...args),
      assignEquipment: (...args: unknown[]) => mockAssignEquipment(...args),
      updateAssignment: (...args: unknown[]) => mockUpdateAssignment(...args),
      returnEquipment: (...args: unknown[]) => mockReturnEquipment(...args),
    },
    logs: {
      getLogs: (...args: unknown[]) => mockGetLogs(...args),
      createLog: (...args: unknown[]) => mockCreateLog(...args),
      updateLog: (...args: unknown[]) => mockUpdateLog(...args),
      deleteLog: (...args: unknown[]) => mockDeleteLog(...args),
    },
    maintenance: {
      getMaintenance: (...args: unknown[]) => mockGetMaintenance(...args),
      getMaintenanceById: (...args: unknown[]) => mockGetMaintenanceById(...args),
      getUpcomingMaintenance: (...args: unknown[]) => mockGetUpcomingMaintenance(...args),
      scheduleMaintenance: (...args: unknown[]) => mockScheduleMaintenance(...args),
      updateMaintenance: (...args: unknown[]) => mockUpdateMaintenance(...args),
      completeMaintenance: (...args: unknown[]) => mockCompleteMaintenance(...args),
      cancelMaintenance: (...args: unknown[]) => mockCancelMaintenance(...args),
    },
    inspections: {
      getInspections: (...args: unknown[]) => mockGetInspections(...args),
      getLatestInspection: (...args: unknown[]) => mockGetLatestInspection(...args),
      createInspection: (...args: unknown[]) => mockCreateInspection(...args),
    },
  },
}))

// Mock useToast
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}))

// Test wrapper
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

// Mock data
const mockEquipmentData = {
  id: 'eq-1',
  company_id: 'company-1',
  equipment_number: 'EQ-001',
  name: 'CAT 320 Excavator',
  equipment_type: 'excavator',
  category: 'earthmoving',
  status: 'available',
  ownership_type: 'owned',
  current_hours: 1000,
  current_miles: 0,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
}

const mockAssignmentData = {
  id: 'assign-1',
  equipment_id: 'eq-1',
  project_id: 'project-1',
  assigned_date: '2024-01-15',
  expected_return_date: '2024-02-15',
  status: 'active',
  created_at: '2024-01-15T00:00:00Z',
  updated_at: '2024-01-15T00:00:00Z',
}

const mockLogData = {
  id: 'log-1',
  equipment_id: 'eq-1',
  project_id: 'project-1',
  log_date: '2024-01-20',
  hours_used: 8,
  miles_driven: 0,
  fuel_used: 50,
  created_at: '2024-01-20T00:00:00Z',
  updated_at: '2024-01-20T00:00:00Z',
}

const mockMaintenanceData = {
  id: 'maint-1',
  equipment_id: 'eq-1',
  maintenance_type: 'preventive',
  description: 'Oil change',
  scheduled_date: '2024-02-01',
  status: 'scheduled',
  created_at: '2024-01-15T00:00:00Z',
  updated_at: '2024-01-15T00:00:00Z',
}

const mockInspectionData = {
  id: 'insp-1',
  equipment_id: 'eq-1',
  inspection_type: 'daily',
  inspection_date: '2024-01-20',
  overall_status: 'pass',
  created_at: '2024-01-20T00:00:00Z',
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ============================================================================
// QUERY KEYS TESTS
// ============================================================================

describe('equipmentKeys', () => {
  it('should have all key as base', () => {
    expect(equipmentKeys.all).toEqual(['equipment'])
  })

  it('should generate equipment list key', () => {
    expect(equipmentKeys.equipment()).toEqual(['equipment', 'list'])
  })

  it('should generate equipment list with filters key', () => {
    const filters = { companyId: 'company-1', status: 'available' as const }
    expect(equipmentKeys.equipmentList(filters)).toEqual(['equipment', 'list', filters])
  })

  it('should generate equipment detail key', () => {
    expect(equipmentKeys.equipmentDetail('eq-1')).toEqual(['equipment', 'detail', 'eq-1'])
  })

  it('should generate equipment statistics key', () => {
    expect(equipmentKeys.equipmentStatistics('company-1')).toEqual([
      'equipment',
      'statistics',
      'company-1',
    ])
  })

  it('should generate available equipment key', () => {
    expect(equipmentKeys.availableEquipment('company-1')).toEqual([
      'equipment',
      'available',
      'company-1',
    ])
  })

  it('should generate assignments key', () => {
    expect(equipmentKeys.assignments('eq-1')).toEqual(['equipment', 'assignments', 'eq-1'])
  })

  it('should generate project equipment key', () => {
    expect(equipmentKeys.projectEquipment('project-1')).toEqual([
      'equipment',
      'project-equipment',
      'project-1',
    ])
  })

  it('should generate logs key', () => {
    expect(equipmentKeys.logs()).toEqual(['equipment', 'logs'])
  })

  it('should generate logs list with filters key', () => {
    const filters = { equipmentId: 'eq-1' }
    expect(equipmentKeys.logsList(filters)).toEqual(['equipment', 'logs', filters])
  })

  it('should generate maintenance key', () => {
    expect(equipmentKeys.maintenance()).toEqual(['equipment', 'maintenance'])
  })

  it('should generate maintenance list with filters key', () => {
    const filters = { equipmentId: 'eq-1' }
    expect(equipmentKeys.maintenanceList(filters)).toEqual(['equipment', 'maintenance', filters])
  })

  it('should generate maintenance detail key', () => {
    expect(equipmentKeys.maintenanceDetail('maint-1')).toEqual([
      'equipment',
      'maintenance',
      'detail',
      'maint-1',
    ])
  })

  it('should generate upcoming maintenance key', () => {
    expect(equipmentKeys.upcomingMaintenance('company-1')).toEqual([
      'equipment',
      'maintenance',
      'upcoming',
      'company-1',
    ])
  })

  it('should generate inspections key', () => {
    expect(equipmentKeys.inspections('eq-1')).toEqual(['equipment', 'inspections', 'eq-1'])
  })

  it('should generate latest inspection key', () => {
    expect(equipmentKeys.latestInspection('eq-1')).toEqual([
      'equipment',
      'latest-inspection',
      'eq-1',
    ])
  })
})

// ============================================================================
// EQUIPMENT QUERY HOOKS TESTS
// ============================================================================

describe('Equipment Query Hooks', () => {
  describe('useEquipment', () => {
    it('should fetch equipment list with filters', async () => {
      mockGetEquipment.mockResolvedValueOnce([mockEquipmentData])

      const filters = { companyId: 'company-1' }
      const { result } = renderHook(() => useEquipment(filters), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockGetEquipment).toHaveBeenCalledWith(filters)
      expect(result.current.data).toEqual([mockEquipmentData])
    })

    it('should not fetch when companyId is missing', () => {
      const filters = { companyId: '' }
      const { result } = renderHook(() => useEquipment(filters), {
        wrapper: createWrapper(),
      })

      expect(result.current.fetchStatus).toBe('idle')
    })
  })

  describe('useEquipmentDetail', () => {
    it('should fetch equipment details', async () => {
      mockGetEquipmentById.mockResolvedValueOnce(mockEquipmentData)

      const { result } = renderHook(() => useEquipmentDetail('eq-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockGetEquipmentById).toHaveBeenCalledWith('eq-1')
      expect(result.current.data).toEqual(mockEquipmentData)
    })

    it('should not fetch when id is undefined', () => {
      const { result } = renderHook(() => useEquipmentDetail(undefined), {
        wrapper: createWrapper(),
      })

      expect(result.current.fetchStatus).toBe('idle')
    })
  })

  describe('useEquipmentStatistics', () => {
    it('should fetch equipment statistics', async () => {
      const statsData = {
        total: 50,
        by_status: { available: 30, in_use: 15, maintenance: 3, out_of_service: 2 },
        utilization_rate: 0.75,
      }
      mockGetEquipmentStatistics.mockResolvedValueOnce(statsData)

      const { result } = renderHook(() => useEquipmentStatistics('company-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockGetEquipmentStatistics).toHaveBeenCalledWith('company-1')
      expect(result.current.data).toEqual(statsData)
    })
  })

  describe('useAvailableEquipment', () => {
    it('should fetch available equipment', async () => {
      mockGetAvailableEquipment.mockResolvedValueOnce([mockEquipmentData])

      const { result } = renderHook(() => useAvailableEquipment('company-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockGetAvailableEquipment).toHaveBeenCalledWith('company-1')
      expect(result.current.data).toEqual([mockEquipmentData])
    })
  })
})

// ============================================================================
// EQUIPMENT MUTATION HOOKS TESTS
// ============================================================================

describe('Equipment Mutation Hooks', () => {
  describe('useCreateEquipment', () => {
    it('should create equipment and show success toast', async () => {
      mockCreateEquipment.mockResolvedValueOnce(mockEquipmentData)

      const { result } = renderHook(() => useCreateEquipment(), {
        wrapper: createWrapper(),
      })

      const dto = {
        equipment_number: 'EQ-001',
        name: 'CAT 320 Excavator',
        equipment_type: 'excavator' as const,
      }

      result.current.mutate(dto)

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockCreateEquipment).toHaveBeenCalledWith(dto)
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Equipment created',
        })
      )
    })

    it('should show error toast on failure', async () => {
      mockCreateEquipment.mockRejectedValueOnce(new Error('Failed to create'))

      const { result } = renderHook(() => useCreateEquipment(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        equipment_number: 'EQ-001',
        name: 'Test',
        equipment_type: 'excavator' as const,
      })

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Error',
          variant: 'destructive',
        })
      )
    })
  })

  describe('useUpdateEquipment', () => {
    it('should update equipment and show success toast', async () => {
      mockUpdateEquipment.mockResolvedValueOnce(mockEquipmentData)

      const { result } = renderHook(() => useUpdateEquipment(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({ id: 'eq-1', dto: { name: 'Updated Excavator' } })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockUpdateEquipment).toHaveBeenCalledWith('eq-1', { name: 'Updated Excavator' })
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Equipment updated',
        })
      )
    })
  })

  describe('useUpdateEquipmentStatus', () => {
    it('should update equipment status', async () => {
      mockUpdateEquipmentStatus.mockResolvedValueOnce(mockEquipmentData)

      const { result } = renderHook(() => useUpdateEquipmentStatus(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({ id: 'eq-1', status: 'maintenance' })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockUpdateEquipmentStatus).toHaveBeenCalledWith('eq-1', 'maintenance')
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Status updated',
        })
      )
    })
  })

  describe('useDeleteEquipment', () => {
    it('should delete equipment and show success toast', async () => {
      mockDeleteEquipment.mockResolvedValueOnce(undefined)

      const { result } = renderHook(() => useDeleteEquipment(), {
        wrapper: createWrapper(),
      })

      result.current.mutate('eq-1')

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockDeleteEquipment).toHaveBeenCalledWith('eq-1')
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Equipment deleted',
        })
      )
    })
  })
})

// ============================================================================
// ASSIGNMENT HOOKS TESTS
// ============================================================================

describe('Assignment Hooks', () => {
  describe('useEquipmentAssignments', () => {
    it('should fetch equipment assignments', async () => {
      mockGetAssignments.mockResolvedValueOnce([mockAssignmentData])

      const { result } = renderHook(() => useEquipmentAssignments('eq-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockGetAssignments).toHaveBeenCalledWith('eq-1')
      expect(result.current.data).toEqual([mockAssignmentData])
    })
  })

  describe('useProjectEquipment', () => {
    it('should fetch project equipment', async () => {
      mockGetProjectEquipment.mockResolvedValueOnce([mockEquipmentData])

      const { result } = renderHook(() => useProjectEquipment('project-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockGetProjectEquipment).toHaveBeenCalledWith('project-1')
    })
  })

  describe('useAssignEquipment', () => {
    it('should assign equipment to project', async () => {
      mockAssignEquipment.mockResolvedValueOnce(mockAssignmentData)

      const { result } = renderHook(() => useAssignEquipment(), {
        wrapper: createWrapper(),
      })

      const dto = {
        equipment_id: 'eq-1',
        project_id: 'project-1',
        assigned_date: '2024-01-15',
      }

      result.current.mutate(dto)

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockAssignEquipment).toHaveBeenCalledWith(dto)
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Equipment assigned',
        })
      )
    })
  })

  describe('useUpdateEquipmentAssignment', () => {
    it('should update assignment', async () => {
      mockUpdateAssignment.mockResolvedValueOnce(mockAssignmentData)

      const { result } = renderHook(() => useUpdateEquipmentAssignment(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        id: 'assign-1',
        equipmentId: 'eq-1',
        dto: { expected_return_date: '2024-03-01' },
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockUpdateAssignment).toHaveBeenCalledWith('assign-1', {
        expected_return_date: '2024-03-01',
      })
    })
  })

  describe('useReturnEquipment', () => {
    it('should return equipment', async () => {
      mockReturnEquipment.mockResolvedValueOnce(mockAssignmentData)

      const { result } = renderHook(() => useReturnEquipment(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({ assignmentId: 'assign-1', actualReturnDate: '2024-02-10' })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockReturnEquipment).toHaveBeenCalledWith('assign-1', '2024-02-10')
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Equipment returned',
        })
      )
    })
  })
})

// ============================================================================
// LOG HOOKS TESTS
// ============================================================================

describe('Log Hooks', () => {
  describe('useEquipmentLogs', () => {
    it('should fetch equipment logs', async () => {
      mockGetLogs.mockResolvedValueOnce([mockLogData])

      const filters = { equipmentId: 'eq-1' }
      const { result } = renderHook(() => useEquipmentLogs(filters), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockGetLogs).toHaveBeenCalledWith(filters)
      expect(result.current.data).toEqual([mockLogData])
    })

    it('should not fetch when no filters', () => {
      const filters = {}
      const { result } = renderHook(() => useEquipmentLogs(filters), {
        wrapper: createWrapper(),
      })

      expect(result.current.fetchStatus).toBe('idle')
    })
  })

  describe('useCreateEquipmentLog', () => {
    it('should create equipment log', async () => {
      mockCreateLog.mockResolvedValueOnce(mockLogData)

      const { result } = renderHook(() => useCreateEquipmentLog(), {
        wrapper: createWrapper(),
      })

      const dto = {
        equipment_id: 'eq-1',
        log_date: '2024-01-20',
        hours_used: 8,
      }

      result.current.mutate(dto)

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockCreateLog).toHaveBeenCalledWith(dto)
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Log created',
        })
      )
    })
  })

  describe('useUpdateEquipmentLog', () => {
    it('should update equipment log', async () => {
      mockUpdateLog.mockResolvedValueOnce(mockLogData)

      const { result } = renderHook(() => useUpdateEquipmentLog(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({ id: 'log-1', dto: { hours_used: 10 } })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockUpdateLog).toHaveBeenCalledWith('log-1', { hours_used: 10 })
    })
  })

  describe('useDeleteEquipmentLog', () => {
    it('should delete equipment log', async () => {
      mockDeleteLog.mockResolvedValueOnce(undefined)

      const { result } = renderHook(() => useDeleteEquipmentLog(), {
        wrapper: createWrapper(),
      })

      result.current.mutate('log-1')

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockDeleteLog).toHaveBeenCalledWith('log-1')
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Log deleted',
        })
      )
    })
  })
})

// ============================================================================
// MAINTENANCE HOOKS TESTS
// ============================================================================

describe('Maintenance Hooks', () => {
  describe('useEquipmentMaintenance', () => {
    it('should fetch maintenance records', async () => {
      mockGetMaintenance.mockResolvedValueOnce([mockMaintenanceData])

      const filters = { equipmentId: 'eq-1' }
      const { result } = renderHook(() => useEquipmentMaintenance(filters), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockGetMaintenance).toHaveBeenCalledWith(filters)
      expect(result.current.data).toEqual([mockMaintenanceData])
    })
  })

  describe('useMaintenanceDetail', () => {
    it('should fetch maintenance details', async () => {
      mockGetMaintenanceById.mockResolvedValueOnce(mockMaintenanceData)

      const { result } = renderHook(() => useMaintenanceDetail('maint-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockGetMaintenanceById).toHaveBeenCalledWith('maint-1')
    })
  })

  describe('useUpcomingMaintenance', () => {
    it('should fetch upcoming maintenance', async () => {
      mockGetUpcomingMaintenance.mockResolvedValueOnce([mockMaintenanceData])

      const { result } = renderHook(() => useUpcomingMaintenance('company-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockGetUpcomingMaintenance).toHaveBeenCalledWith('company-1')
    })
  })

  describe('useScheduleMaintenance', () => {
    it('should schedule maintenance', async () => {
      mockScheduleMaintenance.mockResolvedValueOnce(mockMaintenanceData)

      const { result } = renderHook(() => useScheduleMaintenance(), {
        wrapper: createWrapper(),
      })

      const dto = {
        equipment_id: 'eq-1',
        maintenance_type: 'preventive' as const,
        description: 'Oil change',
        scheduled_date: '2024-02-01',
      }

      result.current.mutate(dto)

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockScheduleMaintenance).toHaveBeenCalledWith(dto)
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Maintenance scheduled',
        })
      )
    })
  })

  describe('useUpdateMaintenance', () => {
    it('should update maintenance', async () => {
      mockUpdateMaintenance.mockResolvedValueOnce(mockMaintenanceData)

      const { result } = renderHook(() => useUpdateMaintenance(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({ id: 'maint-1', dto: { description: 'Updated description' } })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockUpdateMaintenance).toHaveBeenCalledWith('maint-1', {
        description: 'Updated description',
      })
    })
  })

  describe('useCompleteMaintenance', () => {
    it('should complete maintenance with completion data', async () => {
      mockCompleteMaintenance.mockResolvedValueOnce({
        ...mockMaintenanceData,
        status: 'completed',
      })

      const { result } = renderHook(() => useCompleteMaintenance(), {
        wrapper: createWrapper(),
      })

      const completionData = {
        completed_date: '2024-02-01',
        work_performed: 'Oil changed, filter replaced',
        labor_cost: 200,
        parts_cost: 100,
        total_cost: 300,
      }

      result.current.mutate({ id: 'maint-1', completionData })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockCompleteMaintenance).toHaveBeenCalledWith('maint-1', completionData)
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Maintenance completed',
        })
      )
    })
  })

  describe('useCancelMaintenance', () => {
    it('should cancel maintenance', async () => {
      mockCancelMaintenance.mockResolvedValueOnce({
        ...mockMaintenanceData,
        status: 'cancelled',
      })

      const { result } = renderHook(() => useCancelMaintenance(), {
        wrapper: createWrapper(),
      })

      result.current.mutate('maint-1')

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockCancelMaintenance).toHaveBeenCalledWith('maint-1')
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Maintenance cancelled',
        })
      )
    })
  })
})

// ============================================================================
// INSPECTION HOOKS TESTS
// ============================================================================

describe('Inspection Hooks', () => {
  describe('useEquipmentInspections', () => {
    it('should fetch equipment inspections', async () => {
      mockGetInspections.mockResolvedValueOnce([mockInspectionData])

      const { result } = renderHook(() => useEquipmentInspections('eq-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockGetInspections).toHaveBeenCalledWith('eq-1')
      expect(result.current.data).toEqual([mockInspectionData])
    })

    it('should not fetch when equipmentId is undefined', () => {
      const { result } = renderHook(() => useEquipmentInspections(undefined), {
        wrapper: createWrapper(),
      })

      expect(result.current.fetchStatus).toBe('idle')
    })
  })

  describe('useLatestInspection', () => {
    it('should fetch latest inspection', async () => {
      mockGetLatestInspection.mockResolvedValueOnce(mockInspectionData)

      const { result } = renderHook(() => useLatestInspection('eq-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockGetLatestInspection).toHaveBeenCalledWith('eq-1')
    })
  })

  describe('useCreateEquipmentInspection', () => {
    it('should create equipment inspection', async () => {
      mockCreateInspection.mockResolvedValueOnce(mockInspectionData)

      const { result } = renderHook(() => useCreateEquipmentInspection(), {
        wrapper: createWrapper(),
      })

      const dto = {
        equipment_id: 'eq-1',
        inspection_type: 'daily' as const,
        inspection_date: '2024-01-20',
        overall_status: 'pass' as const,
        checklist_items: [
          { item: 'Oil level', status: 'pass' as const },
          { item: 'Tire pressure', status: 'pass' as const },
        ],
      }

      result.current.mutate(dto)

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockCreateInspection).toHaveBeenCalledWith(dto)
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Inspection recorded',
        })
      )
    })

    it('should show error toast on failure', async () => {
      mockCreateInspection.mockRejectedValueOnce(new Error('Inspection failed'))

      const { result } = renderHook(() => useCreateEquipmentInspection(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        equipment_id: 'eq-1',
        inspection_type: 'daily' as const,
        inspection_date: '2024-01-20',
        overall_status: 'pass' as const,
      })

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Error',
          variant: 'destructive',
        })
      )
    })
  })
})
