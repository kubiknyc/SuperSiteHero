import { vi } from 'vitest'

// Note: describe, it, expect, beforeEach, afterEach are available as globals (vitest config has globals: true)
import { apiClient } from '../../client'
import { inspectionsApi } from '../inspections'

vi.mock('../../client', () => ({
  apiClient: {
    select: vi.fn(),
    selectOne: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}))

describe('Inspections API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getProjectInspections', () => {
    it('should fetch inspections for a project', async () => {
      const mockInspections = [
        { id: '1', inspection_name: 'Safety Inspection', status: 'scheduled' },
        { id: '2', inspection_name: 'Final Inspection', status: 'completed' },
      ]

      vi.mocked(apiClient.select).mockResolvedValue(mockInspections)

      const result = await inspectionsApi.getProjectInspections('proj1')

      expect(result).toHaveLength(2)
      expect(apiClient.select).toHaveBeenCalledWith('inspections', expect.objectContaining({
        filters: expect.arrayContaining([
          { column: 'project_id', operator: 'eq', value: 'proj1' },
        ]),
      }))
    })

    it('should throw error when project_id missing', async () => {
      await expect(
        inspectionsApi.getProjectInspections('')
      ).rejects.toThrow('Project ID is required')
    })

    it('should apply status filter', async () => {
      vi.mocked(apiClient.select).mockResolvedValue([])

      await inspectionsApi.getProjectInspections('proj1', { status: 'scheduled' })

      expect(apiClient.select).toHaveBeenCalledWith('inspections', expect.objectContaining({
        filters: expect.arrayContaining([
          { column: 'status', operator: 'eq', value: 'scheduled' },
        ]),
      }))
    })

    it('should apply date range filter', async () => {
      vi.mocked(apiClient.select).mockResolvedValue([])

      await inspectionsApi.getProjectInspections('proj1', {
        dateRange: {
          start: '2024-12-01',
          end: '2024-12-31',
        },
      })

      expect(apiClient.select).toHaveBeenCalledWith('inspections', expect.objectContaining({
        filters: expect.arrayContaining([
          { column: 'scheduled_date', operator: 'gte', value: '2024-12-01' },
          { column: 'scheduled_date', operator: 'lte', value: '2024-12-31' },
        ]),
      }))
    })
  })

  describe('getInspection', () => {
    it('should fetch single inspection with relations', async () => {
      const mockInspection = {
        id: '1',
        inspection_name: 'Safety Inspection',
        project: { id: 'proj1', name: 'Project A' },
      }

      vi.mocked(apiClient.selectOne).mockResolvedValue(mockInspection)

      const result = await inspectionsApi.getInspection('1')

      expect(result.inspection_name).toBe('Safety Inspection')
      expect(result.project).toBeDefined()
    })

    it('should throw error when ID missing', async () => {
      await expect(
        inspectionsApi.getInspection('')
      ).rejects.toThrow('Inspection ID is required')
    })
  })

  describe('createInspection', () => {
    it('should create new inspection', async () => {
      const newInspection = {
        project_id: 'proj1',
        inspection_name: 'Plumbing Inspection',
        inspection_type: 'plumbing',
      }

      vi.mocked(apiClient.insert).mockResolvedValue({
        id: 'insp1',
        ...newInspection,
        status: 'pending',
      })

      const result = await inspectionsApi.createInspection(newInspection)

      expect(result.id).toBe('insp1')
      expect(result.status).toBe('pending')
    })

    it('should set status to scheduled when date provided', async () => {
      const newInspection = {
        project_id: 'proj1',
        inspection_name: 'Electrical Inspection',
        inspection_type: 'electrical',
        scheduled_date: '2024-12-25',
      }

      vi.mocked(apiClient.insert).mockResolvedValue({
        id: 'insp2',
        ...newInspection,
        status: 'scheduled',
      })

      const result = await inspectionsApi.createInspection(newInspection)

      expect(result.status).toBe('scheduled')
    })

    it('should validate required fields', async () => {
      await expect(
        inspectionsApi.createInspection({ project_id: '' } as any)
      ).rejects.toThrow('Project ID is required')
    })
  })

  describe('updateInspection', () => {
    it('should update inspection', async () => {
      vi.mocked(apiClient.update).mockResolvedValue({
        id: '1',
        status: 'completed',
      })

      const result = await inspectionsApi.updateInspection('1', { status: 'completed' })

      expect(result.status).toBe('completed')
    })
  })

  describe('deleteInspection', () => {
    it('should soft delete inspection', async () => {
      vi.mocked(apiClient.update).mockResolvedValue(undefined)

      await inspectionsApi.deleteInspection('1')

      expect(apiClient.update).toHaveBeenCalledWith('inspections', '1', {
        deleted_at: expect.any(String),
      })
    })
  })

  describe('recordResult', () => {
    it('should record pass result', async () => {
      vi.mocked(apiClient.update).mockResolvedValue({
        id: '1',
        result: 'pass',
        status: 'completed',
      })

      const result = await inspectionsApi.recordResult({
        id: '1',
        result: 'pass',
        result_date: '2024-12-19',
        inspector_notes: 'All checks passed',
      })

      expect(result.result).toBe('pass')
      expect(result.status).toBe('completed')
    })

    it('should record fail result', async () => {
      vi.mocked(apiClient.update).mockResolvedValue({
        id: '1',
        result: 'fail',
        status: 'failed',
      })

      const result = await inspectionsApi.recordResult({
        id: '1',
        result: 'fail',
        result_date: '2024-12-19',
        inspector_notes: 'Issues found',
      })

      expect(result.status).toBe('failed')
    })

    it('should validate required fields for recording result', async () => {
      await expect(
        inspectionsApi.recordResult({ id: '', result: 'pass', result_date: '2024-12-19' })
      ).rejects.toThrow('required')
    })
  })

  describe('scheduleReinspection', () => {
    it('should schedule reinspection', async () => {
      vi.mocked(apiClient.update).mockResolvedValue({
        id: '1',
        status: 'scheduled',
        scheduled_date: '2024-12-25',
        result: null,
      })

      const result = await inspectionsApi.scheduleReinspection('1', '2024-12-25')

      expect(result.status).toBe('scheduled')
      expect(result.result).toBeNull()
    })
  })

  describe('getInspectionStats', () => {
    it('should calculate inspection statistics', async () => {
      const mockInspections = [
        { id: '1', status: 'scheduled', result: null, scheduled_date: '2024-12-20' },
        { id: '2', status: 'completed', result: 'pass', scheduled_date: null },
        { id: '3', status: 'completed', result: 'fail', scheduled_date: null },
        { id: '4', status: 'scheduled', result: null, scheduled_date: '2024-12-10' },
      ]

      vi.mocked(apiClient.select).mockResolvedValue(mockInspections)

      const result = await inspectionsApi.getInspectionStats('proj1')

      expect(result.total_inspections).toBe(4)
      expect(result.scheduled_count).toBe(2)
      expect(result.completed_count).toBe(2)
      expect(result.passed_count).toBe(1)
      expect(result.failed_count).toBe(1)
      expect(result.overdue_count).toBeGreaterThan(0)
    })
  })

  describe('getUpcomingInspections', () => {
    it('should fetch upcoming inspections', async () => {
      vi.mocked(apiClient.select).mockResolvedValue([
        { id: '1', inspection_name: 'Upcoming Inspection' },
      ])

      const result = await inspectionsApi.getUpcomingInspections('proj1')

      expect(result).toBeDefined()
      expect(apiClient.select).toHaveBeenCalledWith('inspections', expect.objectContaining({
        filters: expect.arrayContaining([
          expect.objectContaining({ column: 'project_id', value: 'proj1' }),
        ]),
      }))
    })
  })

  describe('cancelInspection', () => {
    it('should cancel inspection', async () => {
      vi.mocked(apiClient.update).mockResolvedValue({
        id: '1',
        status: 'cancelled',
      })

      const result = await inspectionsApi.cancelInspection('1')

      expect(result.status).toBe('cancelled')
    })
  })
})
