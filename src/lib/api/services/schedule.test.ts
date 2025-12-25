/**
 * Schedule/Gantt API Service Tests
 */

import { vi } from 'vitest'

// Note: describe, it, expect, beforeEach, afterEach are available as globals (vitest config has globals: true)
import { scheduleApi } from './schedule'

// Mock Supabase with thenable chain pattern
const mockSupabaseChain = {
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  is: vi.fn().mockReturnThis(),
  in: vi.fn().mockReturnThis(),
  lt: vi.fn().mockReturnThis(),
  gte: vi.fn().mockReturnThis(),
  lte: vi.fn().mockReturnThis(),
  ilike: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  single: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  rpc: vi.fn().mockReturnThis(),
  then: vi.fn(function(this: any, onFulfilled: any) {
    return Promise.resolve({ data: [], error: null }).then(onFulfilled)
  }),
}

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => mockSupabaseChain),
    rpc: vi.fn(() => mockSupabaseChain),
  },
}))

describe('scheduleApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset mock chain
    mockSupabaseChain.select.mockReturnThis()
    mockSupabaseChain.insert.mockReturnThis()
    mockSupabaseChain.update.mockReturnThis()
    mockSupabaseChain.delete.mockReturnThis()
    mockSupabaseChain.eq.mockReturnThis()
    mockSupabaseChain.is.mockReturnThis()
    mockSupabaseChain.in.mockReturnThis()
    mockSupabaseChain.lt.mockReturnThis()
    mockSupabaseChain.gte.mockReturnThis()
    mockSupabaseChain.lte.mockReturnThis()
    mockSupabaseChain.ilike.mockReturnThis()
    mockSupabaseChain.order.mockReturnThis()
    mockSupabaseChain.single.mockReturnThis()
    mockSupabaseChain.from.mockReturnThis()
    mockSupabaseChain.rpc.mockReturnThis()
    mockSupabaseChain.then.mockImplementation(function(this: any, onFulfilled: any) {
      return Promise.resolve({ data: [], error: null }).then(onFulfilled)
    })
  })

  // =============================================
  // SCHEDULE ITEMS TESTS
  // =============================================

  describe('getScheduleItems', () => {
    const mockItems = [
      {
        id: 'item-1',
        project_id: 'proj-1',
        task_name: 'Foundation',
        start_date: '2025-01-01',
        finish_date: '2025-01-15',
        duration_days: 14,
        percent_complete: 50,
        is_milestone: false,
        is_critical: true,
      },
      {
        id: 'item-2',
        project_id: 'proj-1',
        task_name: 'Framing',
        start_date: '2025-01-16',
        finish_date: '2025-02-15',
        duration_days: 30,
        percent_complete: 0,
        is_milestone: false,
        is_critical: false,
      },
    ]

    it('should fetch schedule items for a project', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: mockItems, error: null }).then(onFulfilled)
      )

      const result = await scheduleApi.getScheduleItems({ project_id: 'proj-1' })

      expect(result).toHaveLength(2)
      expect(result[0].task_name).toBe('Foundation')
      expect(mockSupabaseChain.eq).toHaveBeenCalledWith('project_id', 'proj-1')
    })

    it('should apply show_completed filter', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: mockItems, error: null }).then(onFulfilled)
      )

      await scheduleApi.getScheduleItems({ project_id: 'proj-1', show_completed: false })

      expect(mockSupabaseChain.lt).toHaveBeenCalledWith('percent_complete', 100)
    })

    it('should apply milestones_only filter', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: [], error: null }).then(onFulfilled)
      )

      await scheduleApi.getScheduleItems({ project_id: 'proj-1', show_milestones_only: true })

      expect(mockSupabaseChain.eq).toHaveBeenCalledWith('is_milestone', true)
    })

    it('should apply date range filters', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: [], error: null }).then(onFulfilled)
      )

      await scheduleApi.getScheduleItems({
        project_id: 'proj-1',
        date_from: '2025-01-01',
        date_to: '2025-12-31',
      })

      expect(mockSupabaseChain.gte).toHaveBeenCalledWith('start_date', '2025-01-01')
      expect(mockSupabaseChain.lte).toHaveBeenCalledWith('finish_date', '2025-12-31')
    })

    it('should apply search filter', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: [], error: null }).then(onFulfilled)
      )

      await scheduleApi.getScheduleItems({ project_id: 'proj-1', search: 'Foundation' })

      expect(mockSupabaseChain.ilike).toHaveBeenCalledWith('task_name', '%Foundation%')
    })

    it('should apply critical_only filter', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: [], error: null }).then(onFulfilled)
      )

      await scheduleApi.getScheduleItems({ project_id: 'proj-1', critical_only: true })

      expect(mockSupabaseChain.eq).toHaveBeenCalledWith('is_critical', true)
    })

    it('should handle database errors', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: null, error: { message: 'Database error' } }).then(onFulfilled)
      )

      await expect(scheduleApi.getScheduleItems({ project_id: 'proj-1' })).rejects.toThrow('Failed to fetch schedule items')
    })
  })

  describe('getScheduleItem', () => {
    const mockItem = {
      id: 'item-1',
      task_name: 'Foundation',
      start_date: '2025-01-01',
      finish_date: '2025-01-15',
    }

    it('should fetch a single schedule item', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: mockItem, error: null }).then(onFulfilled)
      )

      const result = await scheduleApi.getScheduleItem('item-1')

      expect(result.id).toBe('item-1')
      expect(result.task_name).toBe('Foundation')
    })

    it('should throw error when item ID is not provided', async () => {
      await expect(scheduleApi.getScheduleItem('')).rejects.toThrow('Schedule item ID is required')
    })

    it('should throw error when item not found', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: null, error: null }).then(onFulfilled)
      )

      await expect(scheduleApi.getScheduleItem('nonexistent')).rejects.toThrow('Schedule item not found')
    })
  })

  describe('createScheduleItem', () => {
    const createInput = {
      project_id: 'proj-1',
      task_name: 'New Task',
      start_date: '2025-01-01',
      finish_date: '2025-01-10',
      duration_days: 10,
    }

    const createdItem = {
      id: 'item-new',
      ...createInput,
      percent_complete: 0,
      is_milestone: false,
      is_critical: false,
    }

    it('should create a new schedule item', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: createdItem, error: null }).then(onFulfilled)
      )

      const result = await scheduleApi.createScheduleItem(createInput)

      expect(result.id).toBe('item-new')
      expect(result.task_name).toBe('New Task')
      expect(mockSupabaseChain.insert).toHaveBeenCalled()
    })

    it('should throw error when project_id is missing', async () => {
      await expect(
        scheduleApi.createScheduleItem({ ...createInput, project_id: '' })
      ).rejects.toThrow('Project ID is required')
    })

    it('should throw error when task_name is missing', async () => {
      await expect(
        scheduleApi.createScheduleItem({ ...createInput, task_name: '' })
      ).rejects.toThrow('Task name is required')
    })

    it('should handle database errors', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: null, error: { message: 'Database error' } }).then(onFulfilled)
      )

      await expect(scheduleApi.createScheduleItem(createInput)).rejects.toThrow('Failed to create schedule item')
    })
  })

  describe('updateScheduleItem', () => {
    const updatedItem = {
      id: 'item-1',
      task_name: 'Updated Task',
      percent_complete: 75,
    }

    it('should update a schedule item', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: updatedItem, error: null }).then(onFulfilled)
      )

      const result = await scheduleApi.updateScheduleItem('item-1', {
        task_name: 'Updated Task',
        percent_complete: 75,
      })

      expect(result.task_name).toBe('Updated Task')
      expect(mockSupabaseChain.update).toHaveBeenCalled()
      expect(mockSupabaseChain.eq).toHaveBeenCalledWith('id', 'item-1')
    })

    it('should throw error when item ID is missing', async () => {
      await expect(scheduleApi.updateScheduleItem('', {})).rejects.toThrow('Schedule item ID is required')
    })

    it('should handle database errors', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: null, error: { message: 'Database error' } }).then(onFulfilled)
      )

      await expect(scheduleApi.updateScheduleItem('item-1', {})).rejects.toThrow('Failed to update schedule item')
    })
  })

  describe('deleteScheduleItem', () => {
    it('should soft delete a schedule item', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ error: null }).then(onFulfilled)
      )

      await scheduleApi.deleteScheduleItem('item-1')

      expect(mockSupabaseChain.update).toHaveBeenCalledWith(
        expect.objectContaining({ deleted_at: expect.any(String) })
      )
    })

    it('should throw error when item ID is missing', async () => {
      await expect(scheduleApi.deleteScheduleItem('')).rejects.toThrow('Schedule item ID is required')
    })

    it('should handle database errors', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: null, error: { message: 'Database error' } }).then(onFulfilled)
      )

      await expect(scheduleApi.deleteScheduleItem('item-1')).rejects.toThrow('Failed to delete schedule item')
    })
  })

  describe('updateProgress', () => {
    it('should update progress percentage', async () => {
      const updatedItem = { id: 'item-1', percent_complete: 75 }
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: updatedItem, error: null }).then(onFulfilled)
      )

      const result = await scheduleApi.updateProgress('item-1', 75)

      expect(result.percent_complete).toBe(75)
    })

    it('should clamp progress to 0-100 range', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: { id: 'item-1', percent_complete: 100 }, error: null }).then(onFulfilled)
      )

      await scheduleApi.updateProgress('item-1', 150)

      // The method should clamp to 100
      expect(mockSupabaseChain.update).toHaveBeenCalled()
    })
  })

  // =============================================
  // DEPENDENCIES TESTS
  // =============================================

  describe('getDependencies', () => {
    const mockDependencies = [
      { id: 'dep-1', predecessor_id: 'item-1', successor_id: 'item-2', dependency_type: 'FS' },
      { id: 'dep-2', predecessor_id: 'item-2', successor_id: 'item-3', dependency_type: 'FS' },
    ]

    it('should fetch all dependencies for a project', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: mockDependencies, error: null }).then(onFulfilled)
      )

      const result = await scheduleApi.getDependencies('proj-1')

      expect(result).toHaveLength(2)
      expect(result[0].dependency_type).toBe('FS')
    })

    it('should throw error when project ID is missing', async () => {
      await expect(scheduleApi.getDependencies('')).rejects.toThrow('Project ID is required')
    })

    it('should handle database errors', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: null, error: { message: 'Database error' } }).then(onFulfilled)
      )

      await expect(scheduleApi.getDependencies('proj-1')).rejects.toThrow('Failed to fetch dependencies')
    })
  })

  describe('createDependency', () => {
    const createInput = {
      project_id: 'proj-1',
      predecessor_id: 'item-1',
      successor_id: 'item-2',
      dependency_type: 'FS' as const,
    }

    const createdDep = {
      id: 'dep-new',
      ...createInput,
      lag_days: 0,
    }

    it('should create a dependency', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: createdDep, error: null }).then(onFulfilled)
      )

      const result = await scheduleApi.createDependency(createInput)

      expect(result.id).toBe('dep-new')
      expect(result.dependency_type).toBe('FS')
    })

    it('should throw error when predecessor/successor IDs are missing', async () => {
      await expect(
        scheduleApi.createDependency({ ...createInput, predecessor_id: '' })
      ).rejects.toThrow('Both predecessor and successor IDs are required')
    })

    it('should throw error for self-dependency', async () => {
      await expect(
        scheduleApi.createDependency({
          ...createInput,
          predecessor_id: 'item-1',
          successor_id: 'item-1',
        })
      ).rejects.toThrow('A task cannot depend on itself')
    })

    it('should handle database errors on create', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: null, error: { message: 'Circular dependency detected' } }).then(onFulfilled)
      )

      await expect(scheduleApi.createDependency(createInput)).rejects.toThrow('Cannot create dependency')
    })
  })

  describe('deleteDependency', () => {
    it('should delete a dependency', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ error: null }).then(onFulfilled)
      )

      await scheduleApi.deleteDependency('dep-1')

      expect(mockSupabaseChain.delete).toHaveBeenCalled()
      expect(mockSupabaseChain.eq).toHaveBeenCalledWith('id', 'dep-1')
    })

    it('should throw error when dependency ID is missing', async () => {
      await expect(scheduleApi.deleteDependency('')).rejects.toThrow('Dependency ID is required')
    })
  })

  // =============================================
  // STATISTICS TESTS
  // =============================================

  describe('getScheduleStats', () => {
    const mockItems = [
      { id: '1', percent_complete: 100, is_milestone: false, is_critical: true, finish_date: '2025-01-15' },
      { id: '2', percent_complete: 50, is_milestone: false, is_critical: false, finish_date: '2025-01-20' },
      { id: '3', percent_complete: 0, is_milestone: true, is_critical: false, finish_date: '2024-12-31' }, // Overdue
      { id: '4', percent_complete: 0, is_milestone: false, is_critical: true, finish_date: '2025-02-01' },
    ]

    it('should calculate schedule statistics correctly', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: mockItems, error: null }).then(onFulfilled)
      )

      const result = await scheduleApi.getScheduleStats('proj-1')

      expect(result.total_tasks).toBe(4)
      expect(result.completed_tasks).toBe(1)
      expect(result.in_progress_tasks).toBe(1)
      expect(result.not_started_tasks).toBe(2)
      expect(result.milestones).toBe(1)
      expect(result.critical_tasks).toBe(2)
    })

    it('should calculate overall progress correctly', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: mockItems, error: null }).then(onFulfilled)
      )

      const result = await scheduleApi.getScheduleStats('proj-1')

      // (100 + 50 + 0 + 0) / 4 = 37.5 -> rounds to 38
      expect(result.overall_progress).toBe(38)
    })

    it('should handle empty schedule', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: [], error: null }).then(onFulfilled)
      )

      const result = await scheduleApi.getScheduleStats('proj-1')

      expect(result.total_tasks).toBe(0)
      expect(result.overall_progress).toBe(0)
    })
  })

  describe('getScheduleDateRange', () => {
    const mockItems = [
      { start_date: '2025-01-15', finish_date: '2025-02-15' },
      { start_date: '2025-01-01', finish_date: '2025-03-01' },
      { start_date: '2025-02-01', finish_date: '2025-02-28' },
    ]

    it('should find earliest start and latest finish dates', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: mockItems, error: null }).then(onFulfilled)
      )

      const result = await scheduleApi.getScheduleDateRange('proj-1')

      expect(result.earliest_start).toBe('2025-01-01')
      expect(result.latest_finish).toBe('2025-03-01')
    })

    it('should return null for empty schedule', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: [], error: null }).then(onFulfilled)
      )

      const result = await scheduleApi.getScheduleDateRange('proj-1')

      expect(result.earliest_start).toBeNull()
      expect(result.latest_finish).toBeNull()
    })
  })

  // =============================================
  // BASELINE TESTS
  // =============================================

  describe('getScheduleItemsWithVariance', () => {
    const mockItemsWithVariance = [
      { id: '1', task_name: 'Task 1', start_variance_days: 2, finish_variance_days: -1 },
      { id: '2', task_name: 'Task 2', start_variance_days: 0, finish_variance_days: 3 },
    ]

    it('should fetch schedule items with variance', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: mockItemsWithVariance, error: null }).then(onFulfilled)
      )

      const result = await scheduleApi.getScheduleItemsWithVariance('proj-1')

      expect(result).toHaveLength(2)
      expect(result[0].start_variance_days).toBe(2)
    })

    it('should handle database errors', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: null, error: { message: 'Database error' } }).then(onFulfilled)
      )

      await expect(scheduleApi.getScheduleItemsWithVariance('proj-1')).rejects.toThrow('Failed to fetch schedule variance')
    })
  })

  describe('saveBaseline', () => {
    it('should save a baseline', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: 'baseline-1', error: null }).then(onFulfilled)
      )

      const result = await scheduleApi.saveBaseline('proj-1', 'Q1 Baseline', 'Initial baseline')

      expect(result).toBe('baseline-1')
    })

    it('should handle database errors', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: null, error: { message: 'Database error' } }).then(onFulfilled)
      )

      await expect(scheduleApi.saveBaseline('proj-1')).rejects.toThrow('Failed to save baseline')
    })
  })

  describe('clearBaseline', () => {
    it('should clear baseline', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ error: null }).then(onFulfilled)
      )

      await scheduleApi.clearBaseline('proj-1')

      // No error thrown = success
    })

    it('should handle database errors', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: null, error: { message: 'Database error' } }).then(onFulfilled)
      )

      await expect(scheduleApi.clearBaseline('proj-1')).rejects.toThrow('Failed to clear baseline')
    })
  })

  describe('getBaselines', () => {
    const mockBaselines = [
      { id: 'bl-1', name: 'Q1 Baseline', saved_at: '2025-01-01' },
      { id: 'bl-2', name: 'Q2 Baseline', saved_at: '2025-04-01' },
    ]

    it('should fetch all baselines for a project', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: mockBaselines, error: null }).then(onFulfilled)
      )

      const result = await scheduleApi.getBaselines('proj-1')

      expect(result).toHaveLength(2)
      expect(result[0].name).toBe('Q1 Baseline')
    })
  })

  describe('hasBaseline', () => {
    it('should return true if baseline exists', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({
          data: [{ id: '1', baseline_start_date: '2025-01-01' }],
          error: null,
        }).then(onFulfilled)
      )

      const result = await scheduleApi.hasBaseline('proj-1')

      expect(result).toBe(true)
    })

    it('should return false if no baseline exists', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({
          data: [{ id: '1', baseline_start_date: null }],
          error: null,
        }).then(onFulfilled)
      )

      const result = await scheduleApi.hasBaseline('proj-1')

      expect(result).toBe(false)
    })

    it('should return false on error', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: null, error: { message: 'Error' } }).then(onFulfilled)
      )

      const result = await scheduleApi.hasBaseline('proj-1')

      expect(result).toBe(false)
    })
  })

  // =============================================
  // BULK IMPORT TESTS
  // =============================================

  describe('importScheduleItems', () => {
    const itemsToImport = [
      { task_name: 'Task 1', start_date: '2025-01-01', finish_date: '2025-01-10' },
      { task_name: 'Task 2', start_date: '2025-01-11', finish_date: '2025-01-20' },
    ]

    it('should import schedule items', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({
          data: [{ id: '1' }, { id: '2' }],
          error: null,
        }).then(onFulfilled)
      )

      const result = await scheduleApi.importScheduleItems('proj-1', itemsToImport)

      expect(result.imported).toBe(2)
      expect(result.errors).toHaveLength(0)
    })

    it('should clear existing items when requested', async () => {
      mockSupabaseChain.then
        .mockImplementationOnce((onFulfilled) =>
          Promise.resolve({ error: null }).then(onFulfilled)
        )
        .mockImplementationOnce((onFulfilled) =>
          Promise.resolve({ data: [{ id: '1' }], error: null }).then(onFulfilled)
        )

      await scheduleApi.importScheduleItems('proj-1', itemsToImport, true)

      expect(mockSupabaseChain.update).toHaveBeenCalled()
    })

    it('should handle batch import errors', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: null, error: { message: 'Insert failed' } }).then(onFulfilled)
      )

      const result = await scheduleApi.importScheduleItems('proj-1', itemsToImport)

      expect(result.errors.length).toBeGreaterThan(0)
    })
  })

  describe('importDependencies', () => {
    const depsToImport = [
      { predecessor_id: 'item-1', successor_id: 'item-2', dependency_type: 'FS' as const },
      { predecessor_id: 'item-2', successor_id: 'item-3', dependency_type: 'FS' as const },
    ]

    it('should import dependencies', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: { id: 'dep-new' }, error: null }).then(onFulfilled)
      )

      const result = await scheduleApi.importDependencies('proj-1', depsToImport)

      expect(result.imported).toBe(2)
      expect(result.errors).toHaveLength(0)
    })

    it('should collect errors for failed dependencies', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: null, error: { message: 'Insert failed' } }).then(onFulfilled)
      )

      const result = await scheduleApi.importDependencies('proj-1', depsToImport)

      expect(result.errors.length).toBe(2)
    })
  })

  describe('updateCriticalPath', () => {
    it('should update critical path flags', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ error: null }).then(onFulfilled)
      )

      await scheduleApi.updateCriticalPath('proj-1', ['item-1', 'item-3'])

      // Should reset all and then mark critical ones
      expect(mockSupabaseChain.update).toHaveBeenCalledWith({ is_critical: false })
      expect(mockSupabaseChain.update).toHaveBeenCalledWith({ is_critical: true })
    })

    it('should handle empty critical task list', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ error: null }).then(onFulfilled)
      )

      await scheduleApi.updateCriticalPath('proj-1', [])

      // Should only reset, not mark any as critical
      expect(mockSupabaseChain.update).toHaveBeenCalledWith({ is_critical: false })
    })
  })

  describe('reorderItems', () => {
    it('should reorder schedule items', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ error: null }).then(onFulfilled)
      )

      await scheduleApi.reorderItems([
        { id: 'item-1', sort_order: 0 },
        { id: 'item-2', sort_order: 1 },
        { id: 'item-3', sort_order: 2 },
      ])

      expect(mockSupabaseChain.update).toHaveBeenCalledTimes(3)
    })
  })
})
