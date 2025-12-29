/**
 * Action Items API Service Tests
 *
 * Comprehensive tests for action item pipeline including CRUD operations,
 * filtering, linking, status management, escalation system, and reporting.
 */

import { vi } from 'vitest'

// Note: describe, it, expect, beforeEach, afterEach are available as globals (vitest config has globals: true)

// Mock Supabase - use vi.hoisted to make these available to vi.mock
const {
  mockFrom,
  mockSelect,
  mockInsert,
  mockUpdate,
  mockDelete,
  mockEq,
  mockIn,
  mockIs,
  mockNot,
  mockGt,
  mockLt,
  mockLte,
  mockNeq,
  mockIlike,
  mockOr,
  mockOrder,
  mockLimit,
  mockRange,
  mockSingle,
  mockRpc,
} = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockSelect: vi.fn(),
  mockInsert: vi.fn(),
  mockUpdate: vi.fn(),
  mockDelete: vi.fn(),
  mockEq: vi.fn(),
  mockIn: vi.fn(),
  mockIs: vi.fn(),
  mockNot: vi.fn(),
  mockGt: vi.fn(),
  mockLt: vi.fn(),
  mockLte: vi.fn(),
  mockNeq: vi.fn(),
  mockIlike: vi.fn(),
  mockOr: vi.fn(),
  mockOrder: vi.fn(),
  mockLimit: vi.fn(),
  mockRange: vi.fn(),
  mockSingle: vi.fn(),
  mockRpc: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({
  supabaseUntyped: {
    from: mockFrom,
    rpc: mockRpc,
  },
}))

import * as actionItemsApi from './action-items'

describe('actionItemsApi - CRUD Operations', () => {
  // Shared mutable state for query results - tests update this to control resolved values
  let queryResolvedValue = { data: [] as any[], error: null as any }

  // Helper function for tests to set query result
  const setQueryResult = (result: { data: any; error: any }) => {
    queryResolvedValue = result
  }

  beforeEach(() => {
    vi.clearAllMocks()

    // Reset default query result
    queryResolvedValue = { data: [], error: null }

    // Create a chainable object that all methods will return
    // This object is also thenable so it can be awaited
    const createChainable = () => {
      const chainable: any = {
        eq: mockEq,
        in: mockIn,
        is: mockIs,
        not: mockNot,
        gt: mockGt,
        lt: mockLt,
        lte: mockLte,
        neq: mockNeq,
        ilike: mockIlike,
        or: mockOr,
        order: mockOrder,
        limit: mockLimit,
        range: mockRange,
        single: mockSingle,
        select: mockSelect,
        nullsFirst: vi.fn(() => createChainable()),
      }
      // Make the object thenable (Promise-like) - reads current queryResolvedValue
      chainable.then = (resolve: (value: any) => any, reject?: (reason: any) => any) => {
        return Promise.resolve(queryResolvedValue).then(resolve, reject)
      }
      chainable.catch = (reject: (reason: any) => any) => {
        return Promise.resolve(queryResolvedValue).catch(reject)
      }
      return chainable
    }

    // Setup default chainable mock behavior
    mockFrom.mockReturnValue({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete,
    })

    // All chainable methods return a fresh chainable
    mockSelect.mockImplementation(() => createChainable())
    mockEq.mockImplementation(() => createChainable())
    mockIn.mockImplementation(() => createChainable())
    mockIs.mockImplementation(() => createChainable())
    mockNot.mockImplementation(() => createChainable())
    mockGt.mockImplementation(() => createChainable())
    mockLt.mockImplementation(() => createChainable())
    mockLte.mockImplementation(() => createChainable())
    mockNeq.mockImplementation(() => createChainable())
    mockIlike.mockImplementation(() => createChainable())
    mockOr.mockImplementation(() => createChainable())
    mockOrder.mockImplementation(() => createChainable())
    mockLimit.mockImplementation(() => createChainable())
    mockRange.mockImplementation(() => createChainable())
    mockSingle.mockImplementation(() => createChainable())

    mockInsert.mockReturnValue({
      select: mockSelect,
    })

    mockUpdate.mockReturnValue({
      eq: mockEq,
    })

    mockDelete.mockReturnValue({
      eq: mockEq,
    })

    // Expose setQueryResult globally for tests to use
    ;(globalThis as any).setQueryResult = setQueryResult
  })

  describe('getActionItems', () => {
    it('should get action items with default ordering', async () => {
      const mockItems = [
        { id: '1', title: 'Task 1', due_date: '2025-01-20', urgency_status: 'due_soon' },
        { id: '2', title: 'Task 2', due_date: '2025-01-25', urgency_status: 'normal' },
      ]

      setQueryResult({ data: mockItems, error: null })

      const result = await actionItemsApi.getActionItems({})

      expect(mockFrom).toHaveBeenCalledWith('action_items_with_context')
      expect(mockOrder).toHaveBeenCalledWith('due_date', { ascending: true, nullsFirst: false })
      expect(result).toEqual(mockItems)
    })

    it('should filter by project_id', async () => {
      setQueryResult({ data: [], error: null })

      await actionItemsApi.getActionItems({ project_id: 'project-123' })

      expect(mockEq).toHaveBeenCalledWith('project_id', 'project-123')
    })

    it('should filter by meeting_id', async () => {
      setQueryResult({ data: [], error: null })

      await actionItemsApi.getActionItems({ meeting_id: 'meeting-123' })

      expect(mockEq).toHaveBeenCalledWith('meeting_id', 'meeting-123')
    })

    it('should filter by single status', async () => {
      setQueryResult({ data: [], error: null })

      await actionItemsApi.getActionItems({ status: 'open' })

      expect(mockEq).toHaveBeenCalledWith('status', 'open')
    })

    it('should filter by multiple statuses', async () => {
      setQueryResult({ data: [], error: null })

      await actionItemsApi.getActionItems({ status: ['open', 'in_progress'] })

      expect(mockIn).toHaveBeenCalledWith('status', ['open', 'in_progress'])
    })

    it('should filter by priority', async () => {
      setQueryResult({ data: [], error: null })

      await actionItemsApi.getActionItems({ priority: 'high' })

      expect(mockEq).toHaveBeenCalledWith('priority', 'high')
    })

    it('should filter by category', async () => {
      setQueryResult({ data: [], error: null })

      await actionItemsApi.getActionItems({ category: 'safety' })

      expect(mockEq).toHaveBeenCalledWith('category', 'safety')
    })

    it('should filter by assigned_to', async () => {
      setQueryResult({ data: [], error: null })

      await actionItemsApi.getActionItems({ assigned_to: 'John' })

      expect(mockIlike).toHaveBeenCalledWith('assigned_to', '%John%')
    })

    it('should filter by assigned_company', async () => {
      setQueryResult({ data: [], error: null })

      await actionItemsApi.getActionItems({ assigned_company: 'ABC Corp' })

      expect(mockIlike).toHaveBeenCalledWith('assigned_company', '%ABC Corp%')
    })

    it('should filter by urgency_status', async () => {
      setQueryResult({ data: [], error: null })

      await actionItemsApi.getActionItems({ urgency_status: ['overdue', 'due_today'] })

      expect(mockIn).toHaveBeenCalledWith('urgency_status', ['overdue', 'due_today'])
    })

    it('should filter items with tasks', async () => {
      setQueryResult({ data: [], error: null })

      await actionItemsApi.getActionItems({ has_task: true })

      expect(mockNot).toHaveBeenCalledWith('task_id', 'is', null)
    })

    it('should filter items without tasks', async () => {
      setQueryResult({ data: [], error: null })

      await actionItemsApi.getActionItems({ has_task: false })

      expect(mockIs).toHaveBeenCalledWith('task_id', null)
    })

    it('should filter overdue_only items', async () => {
      setQueryResult({ data: [], error: null })

      await actionItemsApi.getActionItems({ overdue_only: true })

      expect(mockEq).toHaveBeenCalledWith('urgency_status', 'overdue')
    })

    it('should filter escalated_only items', async () => {
      setQueryResult({ data: [], error: null })

      await actionItemsApi.getActionItems({ escalated_only: true })

      expect(mockGt).toHaveBeenCalledWith('escalation_level', 0)
    })

    it('should support search by title and description', async () => {
      setQueryResult({ data: [], error: null })

      await actionItemsApi.getActionItems({ search: 'concrete' })

      expect(mockOr).toHaveBeenCalledWith('title.ilike.%concrete%,description.ilike.%concrete%')
    })

    it('should support pagination with limit', async () => {
      setQueryResult({ data: [], error: null })

      await actionItemsApi.getActionItems({ limit: 20 })

      expect(mockLimit).toHaveBeenCalledWith(20)
    })

    it('should support pagination with offset', async () => {
      setQueryResult({ data: [], error: null })

      await actionItemsApi.getActionItems({ offset: 10, limit: 20 })

      expect(mockRange).toHaveBeenCalledWith(10, 29)
    })

    it('should handle database errors', async () => {
      const mockError = { message: 'Database error' }
      setQueryResult({ data: null, error: mockError })

      await expect(actionItemsApi.getActionItems({})).rejects.toThrow('Failed to get action items: Database error')
    })

    it('should return empty array when no data', async () => {
      setQueryResult({ data: null, error: null })

      const result = await actionItemsApi.getActionItems({})

      expect(result).toEqual([])
    })
  })

  describe('getActionItem', () => {
    it('should get a single action item by ID', async () => {
      const mockItem = {
        id: 'item-123',
        title: 'Fix concrete pour',
        status: 'open',
        priority: 'high',
      }

      mockSingle.mockResolvedValue({ data: mockItem, error: null })

      const result = await actionItemsApi.getActionItem('item-123')

      expect(mockFrom).toHaveBeenCalledWith('action_items_with_context')
      expect(mockEq).toHaveBeenCalledWith('id', 'item-123')
      expect(mockSingle).toHaveBeenCalled()
      expect(result).toEqual(mockItem)
    })

    it('should return null when item not found (PGRST116)', async () => {
      mockSingle.mockResolvedValue({ data: null, error: { code: 'PGRST116' } })

      const result = await actionItemsApi.getActionItem('nonexistent')

      expect(result).toBeNull()
    })

    it('should throw on other database errors', async () => {
      const mockError = { message: 'Connection error', code: 'OTHER' }
      mockSingle.mockResolvedValue({ data: null, error: mockError })

      await expect(actionItemsApi.getActionItem('item-123')).rejects.toThrow('Failed to get action item')
    })
  })

  describe('createActionItem', () => {
    it('should create action item with required fields', async () => {
      const mockItem = {
        id: 'new-item',
        title: 'New task',
        status: 'open',
        priority: 'normal',
      }

      mockSingle.mockResolvedValue({ data: mockItem, error: null })

      const dto = {
        meeting_id: 'meeting-123',
        project_id: 'project-123',
        title: 'New task',
      }

      const result = await actionItemsApi.createActionItem(dto)

      expect(mockFrom).toHaveBeenCalledWith('meeting_action_items')
      expect(mockInsert).toHaveBeenCalled()

      const insertCall = mockInsert.mock.calls[0][0]
      expect(insertCall.meeting_id).toBe('meeting-123')
      expect(insertCall.project_id).toBe('project-123')
      expect(insertCall.title).toBe('New task')
      expect(insertCall.status).toBe('open')
      expect(insertCall.priority).toBe('normal')

      expect(result).toEqual(mockItem)
    })

    it('should create action item with all optional fields', async () => {
      mockSingle.mockResolvedValue({ data: {}, error: null })

      const dto = {
        meeting_id: 'meeting-123',
        project_id: 'project-123',
        title: 'Detailed task',
        description: 'Task description',
        assigned_to: 'John Doe',
        assigned_company: 'ABC Corp',
        due_date: '2025-01-30',
        priority: 'high' as const,
        category: 'safety',
        related_rfi_id: 'rfi-123',
        constraint_id: 'constraint-123',
        related_change_order_id: 'co-123',
      }

      await actionItemsApi.createActionItem(dto)

      const insertCall = mockInsert.mock.calls[0][0]
      expect(insertCall.description).toBe('Task description')
      expect(insertCall.assigned_to).toBe('John Doe')
      expect(insertCall.priority).toBe('high')
      expect(insertCall.related_rfi_id).toBe('rfi-123')
    })

    it('should handle creation errors', async () => {
      const mockError = { message: 'Validation failed' }
      mockSingle.mockResolvedValue({ data: null, error: mockError })

      const dto = {
        meeting_id: 'meeting-123',
        project_id: 'project-123',
        title: 'Test',
      }

      await expect(actionItemsApi.createActionItem(dto)).rejects.toThrow('Failed to create action item')
    })
  })

  describe('updateActionItem', () => {
    it('should update action item fields', async () => {
      const mockUpdated = { id: 'item-123', title: 'Updated title' }
      mockSingle.mockResolvedValue({ data: mockUpdated, error: null })

      const result = await actionItemsApi.updateActionItem('item-123', {
        title: 'Updated title',
        priority: 'high',
      })

      expect(mockFrom).toHaveBeenCalledWith('meeting_action_items')
      expect(mockUpdate).toHaveBeenCalled()
      expect(mockEq).toHaveBeenCalledWith('id', 'item-123')

      const updateCall = mockUpdate.mock.calls[0][0]
      expect(updateCall.title).toBe('Updated title')
      expect(updateCall.priority).toBe('high')
      expect(updateCall.updated_at).toBeDefined()

      expect(result).toEqual(mockUpdated)
    })

    it('should handle update errors', async () => {
      const mockError = { message: 'Update failed' }
      mockSingle.mockResolvedValue({ data: null, error: mockError })

      await expect(actionItemsApi.updateActionItem('item-123', { title: 'New' })).rejects.toThrow('Failed to update action item')
    })
  })

  describe('deleteActionItem', () => {
    it('should delete action item', async () => {
      mockEq.mockResolvedValue({ data: null, error: null })

      await actionItemsApi.deleteActionItem('item-123')

      expect(mockFrom).toHaveBeenCalledWith('meeting_action_items')
      expect(mockDelete).toHaveBeenCalled()
      expect(mockEq).toHaveBeenCalledWith('id', 'item-123')
    })

    it('should handle deletion errors', async () => {
      const mockError = { message: 'Deletion failed' }
      mockEq.mockResolvedValue({ data: null, error: mockError })

      await expect(actionItemsApi.deleteActionItem('item-123')).rejects.toThrow('Failed to delete action item')
    })
  })
})

describe('actionItemsApi - Status & Resolution', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFrom.mockReturnValue({ update: mockUpdate })
    mockUpdate.mockReturnValue({ eq: mockEq })
    mockEq.mockReturnValue({ select: mockSelect })
    mockSelect.mockReturnValue({ single: mockSingle })
  })

  describe('updateActionItemStatus', () => {
    it('should update status to in_progress', async () => {
      const mockUpdated = { id: 'item-123', status: 'in_progress' }
      mockSingle.mockResolvedValue({ data: mockUpdated, error: null })

      const result = await actionItemsApi.updateActionItemStatus('item-123', 'in_progress')

      const updateCall = mockUpdate.mock.calls[0][0]
      expect(updateCall.status).toBe('in_progress')
      expect(updateCall.updated_at).toBeDefined()
      expect(updateCall.resolution_type).toBeUndefined()
      expect(result).toEqual(mockUpdated)
    })

    it('should auto-set resolution when completing', async () => {
      mockSingle.mockResolvedValue({ data: {}, error: null })

      await actionItemsApi.updateActionItemStatus('item-123', 'completed')

      const updateCall = mockUpdate.mock.calls[0][0]
      expect(updateCall.status).toBe('completed')
      expect(updateCall.resolution_type).toBe('completed')
      expect(updateCall.resolved_at).toBeDefined()
    })

    it('should handle status update errors', async () => {
      const mockError = { message: 'Update failed' }
      mockSingle.mockResolvedValue({ data: null, error: mockError })

      await expect(actionItemsApi.updateActionItemStatus('item-123', 'open')).rejects.toThrow('Failed to update status')
    })
  })

  describe('resolveActionItem', () => {
    it('should resolve item as completed', async () => {
      const mockResolved = { id: 'item-123', status: 'completed', resolution_type: 'completed' }
      mockSingle.mockResolvedValue({ data: mockResolved, error: null })

      const result = await actionItemsApi.resolveActionItem('item-123', {
        resolution_type: 'completed',
        resolution_notes: 'Task completed successfully',
      })

      const updateCall = mockUpdate.mock.calls[0][0]
      expect(updateCall.status).toBe('completed')
      expect(updateCall.resolution_type).toBe('completed')
      expect(updateCall.resolution_notes).toBe('Task completed successfully')
      expect(updateCall.resolved_at).toBeDefined()
      expect(result).toEqual(mockResolved)
    })

    it('should resolve item as deferred', async () => {
      mockSingle.mockResolvedValue({ data: {}, error: null })

      await actionItemsApi.resolveActionItem('item-123', {
        resolution_type: 'deferred',
        resolution_notes: 'Will address in next phase',
      })

      const updateCall = mockUpdate.mock.calls[0][0]
      expect(updateCall.status).toBe('deferred')
      expect(updateCall.resolution_type).toBe('deferred')
    })

    it('should handle resolution errors', async () => {
      const mockError = { message: 'Resolution failed' }
      mockSingle.mockResolvedValue({ data: null, error: mockError })

      await expect(
        actionItemsApi.resolveActionItem('item-123', { resolution_type: 'completed' })
      ).rejects.toThrow('Failed to resolve action item')
    })
  })
})

describe('actionItemsApi - Linking & Pipeline', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFrom.mockReturnValue({ update: mockUpdate })
    mockUpdate.mockReturnValue({ eq: mockEq })
    mockEq.mockReturnValue({ select: mockSelect })
    mockSelect.mockReturnValue({ single: mockSingle })
    mockRpc.mockResolvedValue({ data: null, error: null })
  })

  describe('linkActionItem', () => {
    it('should link to task', async () => {
      mockSingle.mockResolvedValue({ data: {}, error: null })

      await actionItemsApi.linkActionItem('item-123', {
        type: 'task',
        entity_id: 'task-123',
      })

      const updateCall = mockUpdate.mock.calls[0][0]
      expect(updateCall.task_id).toBe('task-123')
      expect(updateCall.updated_at).toBeDefined()
    })

    it('should link to RFI', async () => {
      mockSingle.mockResolvedValue({ data: {}, error: null })

      await actionItemsApi.linkActionItem('item-123', {
        type: 'rfi',
        entity_id: 'rfi-123',
      })

      const updateCall = mockUpdate.mock.calls[0][0]
      expect(updateCall.related_rfi_id).toBe('rfi-123')
    })

    it('should link to constraint', async () => {
      mockSingle.mockResolvedValue({ data: {}, error: null })

      await actionItemsApi.linkActionItem('item-123', {
        type: 'constraint',
        entity_id: 'constraint-123',
      })

      const updateCall = mockUpdate.mock.calls[0][0]
      expect(updateCall.constraint_id).toBe('constraint-123')
    })

    it('should link to change order', async () => {
      mockSingle.mockResolvedValue({ data: {}, error: null })

      await actionItemsApi.linkActionItem('item-123', {
        type: 'change_order',
        entity_id: 'co-123',
      })

      const updateCall = mockUpdate.mock.calls[0][0]
      expect(updateCall.related_change_order_id).toBe('co-123')
    })

    it('should handle linking errors', async () => {
      const mockError = { message: 'Link failed' }
      mockSingle.mockResolvedValue({ data: null, error: mockError })

      await expect(
        actionItemsApi.linkActionItem('item-123', { type: 'task', entity_id: 'task-123' })
      ).rejects.toThrow('Failed to link action item')
    })
  })

  describe('unlinkActionItem', () => {
    it('should unlink task', async () => {
      mockSingle.mockResolvedValue({ data: {}, error: null })

      await actionItemsApi.unlinkActionItem('item-123', 'task')

      const updateCall = mockUpdate.mock.calls[0][0]
      expect(updateCall.task_id).toBeNull()
    })

    it('should unlink RFI', async () => {
      mockSingle.mockResolvedValue({ data: {}, error: null })

      await actionItemsApi.unlinkActionItem('item-123', 'rfi')

      const updateCall = mockUpdate.mock.calls[0][0]
      expect(updateCall.related_rfi_id).toBeNull()
    })
  })

  describe('convertToTask', () => {
    it('should convert action item to task via RPC', async () => {
      mockRpc.mockResolvedValue({ data: 'new-task-id', error: null })

      const result = await actionItemsApi.convertToTask('item-123', 'user-123')

      expect(mockRpc).toHaveBeenCalledWith('convert_action_item_to_task', {
        p_action_item_id: 'item-123',
        p_created_by: 'user-123',
      })
      expect(result).toBe('new-task-id')
    })

    it('should handle conversion errors', async () => {
      const mockError = { message: 'Conversion failed' }
      mockRpc.mockResolvedValue({ data: null, error: mockError })

      await expect(actionItemsApi.convertToTask('item-123')).rejects.toThrow('Failed to convert to task')
    })
  })

  describe('carryoverActionItems', () => {
    it('should carryover all items from source meeting', async () => {
      mockRpc.mockResolvedValue({ data: 5, error: null })

      const result = await actionItemsApi.carryoverActionItems({
        source_meeting_id: 'meeting-old',
        target_meeting_id: 'meeting-new',
      })

      expect(mockRpc).toHaveBeenCalledWith('carryover_action_items', {
        p_source_meeting_id: 'meeting-old',
        p_target_meeting_id: 'meeting-new',
        p_action_item_ids: null,
      })
      expect(result).toBe(5)
    })

    it('should carryover specific items', async () => {
      mockRpc.mockResolvedValue({ data: 2, error: null })

      await actionItemsApi.carryoverActionItems({
        source_meeting_id: 'meeting-old',
        target_meeting_id: 'meeting-new',
        action_item_ids: ['item-1', 'item-2'],
      })

      expect(mockRpc).toHaveBeenCalledWith('carryover_action_items', {
        p_source_meeting_id: 'meeting-old',
        p_target_meeting_id: 'meeting-new',
        p_action_item_ids: ['item-1', 'item-2'],
      })
    })

    it('should handle carryover errors', async () => {
      const mockError = { message: 'Carryover failed' }
      mockRpc.mockResolvedValue({ data: null, error: mockError })

      await expect(
        actionItemsApi.carryoverActionItems({
          source_meeting_id: 'meeting-old',
          target_meeting_id: 'meeting-new',
        })
      ).rejects.toThrow('Failed to carry over action items')
    })
  })
})

describe('actionItemsApi - Reporting & Statistics', () => {
  // Shared mutable state for query results
  let queryResolvedValue = { data: [] as any[], error: null as any }

  const setQueryResult = (result: { data: any; error: any }) => {
    queryResolvedValue = result
  }

  beforeEach(() => {
    vi.clearAllMocks()
    queryResolvedValue = { data: [], error: null }

    // Create thenable chainable object
    const createChainable = () => {
      const chainable: any = {
        eq: mockEq,
        in: mockIn,
        gt: mockGt,
        neq: mockNeq,
        order: mockOrder,
        single: mockSingle,
        limit: mockLimit,
        select: mockSelect,
      }
      chainable.then = (resolve: (value: any) => any, reject?: (reason: any) => any) => {
        return Promise.resolve(queryResolvedValue).then(resolve, reject)
      }
      chainable.catch = (reject: (reason: any) => any) => {
        return Promise.resolve(queryResolvedValue).catch(reject)
      }
      return chainable
    }

    mockFrom.mockReturnValue({ select: mockSelect })
    mockSelect.mockImplementation(() => createChainable())
    mockEq.mockImplementation(() => createChainable())
    mockIn.mockImplementation(() => createChainable())
    mockGt.mockImplementation(() => createChainable())
    mockNeq.mockImplementation(() => createChainable())
    mockOrder.mockImplementation(() => createChainable())
    mockSingle.mockImplementation(() => createChainable())
    mockLimit.mockImplementation(() => createChainable())

    // Expose setQueryResult for tests
    ;(globalThis as any).setQueryResult = setQueryResult
  })

  describe('getProjectSummary', () => {
    it('should get project action item summary', async () => {
      const mockSummary = {
        project_id: 'project-123',
        total_items: 25,
        open_items: 10,
        in_progress_items: 8,
        completed_items: 5,
        deferred_items: 2,
      }

      setQueryResult({ data: mockSummary, error: null })

      const result = await actionItemsApi.getProjectSummary('project-123')

      expect(mockFrom).toHaveBeenCalledWith('action_item_summary_by_project')
      expect(mockEq).toHaveBeenCalledWith('project_id', 'project-123')
      expect(result).toEqual(mockSummary)
    })

    it('should return null when no summary found', async () => {
      setQueryResult({ data: null, error: { code: 'PGRST116' } })

      const result = await actionItemsApi.getProjectSummary('nonexistent')

      expect(result).toBeNull()
    })
  })

  describe('getItemsByAssignee', () => {
    it('should get items grouped by assignee', async () => {
      const mockGrouped = [
        { assigned_to: 'John Doe', open_items: 5, completed_items: 10 },
        { assigned_to: 'Jane Smith', open_items: 3, completed_items: 7 },
      ]

      setQueryResult({ data: mockGrouped, error: null })

      const result = await actionItemsApi.getItemsByAssignee('project-123')

      expect(mockFrom).toHaveBeenCalledWith('action_items_by_assignee')
      expect(mockOrder).toHaveBeenCalledWith('open_items', { ascending: false })
      expect(result).toEqual(mockGrouped)
    })
  })

  describe('getOverdueItems', () => {
    it('should get overdue items', async () => {
      const mockOverdue = [
        { id: '1', title: 'Overdue task 1', urgency_status: 'overdue', due_date: '2025-01-10' },
        { id: '2', title: 'Overdue task 2', urgency_status: 'overdue', due_date: '2025-01-12' },
      ]

      setQueryResult({ data: mockOverdue, error: null })

      const result = await actionItemsApi.getOverdueItems()

      expect(mockEq).toHaveBeenCalledWith('urgency_status', 'overdue')
      expect(mockOrder).toHaveBeenCalledWith('due_date', { ascending: true })
      expect(mockLimit).toHaveBeenCalledWith(50)
      expect(result).toEqual(mockOverdue)
    })

    it('should filter overdue by project', async () => {
      setQueryResult({ data: [], error: null })

      await actionItemsApi.getOverdueItems('project-123', 20)

      expect(mockEq).toHaveBeenCalledWith('project_id', 'project-123')
      expect(mockLimit).toHaveBeenCalledWith(20)
    })
  })

  describe('getItemsDueSoon', () => {
    it('should get items due today or soon', async () => {
      setQueryResult({ data: [], error: null })

      await actionItemsApi.getItemsDueSoon()

      expect(mockIn).toHaveBeenCalledWith('urgency_status', ['due_today', 'due_soon'])
      expect(mockLimit).toHaveBeenCalledWith(50)
    })
  })

  describe('getEscalatedItems', () => {
    it('should get escalated items', async () => {
      const mockEscalated = [
        { id: '1', title: 'Escalated task', escalation_level: 2, status: 'open' },
      ]

      setQueryResult({ data: mockEscalated, error: null })

      const result = await actionItemsApi.getEscalatedItems()

      expect(mockGt).toHaveBeenCalledWith('escalation_level', 0)
      expect(mockNeq).toHaveBeenCalledWith('status', 'completed')
      expect(result).toEqual(mockEscalated)
    })
  })

  describe('getStatusCounts', () => {
    it('should count items by status', async () => {
      const mockData = [
        { status: 'open' },
        { status: 'open' },
        { status: 'in_progress' },
        { status: 'completed' },
        { status: 'completed' },
        { status: 'completed' },
      ]

      setQueryResult({ data: mockData, error: null })

      const result = await actionItemsApi.getStatusCounts('project-123')

      expect(result).toEqual({
        open: 2,
        in_progress: 1,
        completed: 3,
        deferred: 0,
      })
    })

    it('should handle empty project', async () => {
      setQueryResult({ data: [], error: null })

      const result = await actionItemsApi.getStatusCounts('empty-project')

      expect(result).toEqual({
        open: 0,
        in_progress: 0,
        completed: 0,
        deferred: 0,
      })
    })
  })
})

describe('actionItemsApi - Escalation System', () => {
  // Shared mutable state for query results
  let queryResolvedValue = { data: null as any, error: null as any }
  let singleCallCount = 0
  let singleResults: Array<{ data: any; error: any }> = []

  const setQueryResult = (result: { data: any; error: any }) => {
    queryResolvedValue = result
  }

  const setSingleResults = (results: Array<{ data: any; error: any }>) => {
    singleResults = results
    singleCallCount = 0
  }

  beforeEach(() => {
    vi.clearAllMocks()
    queryResolvedValue = { data: null, error: null }
    singleResults = []
    singleCallCount = 0

    // Create thenable chainable object
    const createChainable = () => {
      const chainable: any = {
        eq: mockEq,
        in: mockIn,
        select: mockSelect,
        single: mockSingle,
        update: mockUpdate,
      }
      chainable.then = (resolve: (value: any) => any, reject?: (reason: any) => any) => {
        return Promise.resolve(queryResolvedValue).then(resolve, reject)
      }
      chainable.catch = (reject: (reason: any) => any) => {
        return Promise.resolve(queryResolvedValue).catch(reject)
      }
      return chainable
    }

    mockFrom.mockReturnValue({
      select: mockSelect,
      update: mockUpdate,
    })
    mockSelect.mockImplementation(() => createChainable())
    mockEq.mockImplementation(() => createChainable())
    mockIn.mockImplementation(() => createChainable())
    mockUpdate.mockImplementation(() => createChainable())
    mockSingle.mockImplementation(() => {
      if (singleResults.length > 0) {
        const result = singleResults[singleCallCount] || singleResults[singleResults.length - 1]
        singleCallCount++
        return Promise.resolve(result)
      }
      return Promise.resolve(queryResolvedValue)
    })
  })

  describe('calculateEscalationLevel', () => {
    it('should return level 0 for items not overdue', () => {
      expect(actionItemsApi.calculateEscalationLevel(0)).toBe(0)
      expect(actionItemsApi.calculateEscalationLevel(2)).toBe(0)
    })

    it('should return level 1 for 3+ days overdue', () => {
      expect(actionItemsApi.calculateEscalationLevel(3)).toBe(1)
      expect(actionItemsApi.calculateEscalationLevel(5)).toBe(1)
    })

    it('should return level 2 for 7+ days overdue', () => {
      expect(actionItemsApi.calculateEscalationLevel(7)).toBe(2)
      expect(actionItemsApi.calculateEscalationLevel(10)).toBe(2)
    })

    it('should return level 3 for 14+ days overdue', () => {
      expect(actionItemsApi.calculateEscalationLevel(14)).toBe(3)
      expect(actionItemsApi.calculateEscalationLevel(20)).toBe(3)
    })

    it('should use custom config', () => {
      const customConfig = {
        level1Days: 1,
        level2Days: 3,
        level3Days: 7,
        sendEmail: true,
        sendInApp: true,
      }

      expect(actionItemsApi.calculateEscalationLevel(2, customConfig)).toBe(1)
      expect(actionItemsApi.calculateEscalationLevel(5, customConfig)).toBe(2)
      expect(actionItemsApi.calculateEscalationLevel(10, customConfig)).toBe(3)
    })
  })

  describe('escalateActionItem', () => {
    it('should escalate item to next level', async () => {
      // Mock getActionItem (first call) and update (second call)
      const mockItem = { id: 'item-123', escalation_level: 1 }
      setSingleResults([
        { data: mockItem, error: null },
        { data: { ...mockItem, escalation_level: 2 }, error: null },
      ])

      await actionItemsApi.escalateActionItem('item-123', 'user-123', 'manager-id', 'Critical issue')

      const updateCall = mockUpdate.mock.calls[0][0]
      expect(updateCall.escalation_level).toBe(2)
      expect(updateCall.escalated_to).toBe('manager-id')
      expect(updateCall.escalated_at).toBeDefined()
    })

    it('should handle not found item', async () => {
      setQueryResult({ data: null, error: null })

      await expect(
        actionItemsApi.escalateActionItem('nonexistent', 'user-123')
      ).rejects.toThrow('Action item not found')
    })
  })

  describe('getEscalationStats', () => {
    it('should calculate escalation statistics', async () => {
      const mockItems = [
        { escalation_level: 0, due_date: '2025-01-10' }, // 13 days overdue
        { escalation_level: 0, due_date: '2025-01-15' }, // 8 days overdue
        { escalation_level: 1, due_date: '2025-01-18' }, // 5 days overdue
        { escalation_level: 2, due_date: '2025-01-12' }, // 11 days overdue
        { escalation_level: 3, due_date: '2025-01-05' }, // 18 days overdue
      ]

      setQueryResult({ data: mockItems, error: null })

      const result = await actionItemsApi.getEscalationStats('project-123')

      expect(result.level0).toBe(2)
      expect(result.level1).toBe(1)
      expect(result.level2).toBe(1)
      expect(result.level3).toBe(1)
      expect(result.totalEscalated).toBe(3)
      expect(result.avgDaysOverdue).toBeGreaterThan(0)
    })

    it('should query all projects when no projectId', async () => {
      setQueryResult({ data: [], error: null })

      await actionItemsApi.getEscalationStats()

      expect(mockEq).not.toHaveBeenCalledWith('project_id', expect.anything())
    })
  })
})
