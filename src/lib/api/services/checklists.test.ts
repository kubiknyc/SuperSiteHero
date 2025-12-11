// File: /src/lib/api/services/checklists.test.ts
// Tests for Checklists API service - aligned with actual Supabase implementation

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import { checklistsApi } from './checklists'

// Mock Supabase module
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}))

import { supabase } from '@/lib/supabase'

// Mock data factories
const createMockTemplate = (overrides = {}) => ({
  id: 'template-123',
  company_id: 'company-456',
  name: 'Safety Inspection',
  description: 'Daily safety inspection checklist',
  category: 'safety',
  template_level: 'project',
  is_system_template: false,
  tags: ['safety', 'daily'],
  instructions: 'Complete all items',
  estimated_duration_minutes: 30,
  scoring_enabled: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  deleted_at: null,
  ...overrides,
})

const createMockTemplateItem = (overrides = {}) => ({
  id: 'item-123',
  checklist_template_id: 'template-123',
  item_type: 'yes_no',
  label: 'Is PPE worn correctly?',
  description: 'Check all personal protective equipment',
  sort_order: 1,
  section: 'PPE Check',
  is_required: true,
  config: {},
  scoring_enabled: true,
  pass_fail_na_scoring: true,
  requires_photo: false,
  min_photos: 0,
  max_photos: 3,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  deleted_at: null,
  ...overrides,
})

const createMockExecution = (overrides = {}) => ({
  id: 'execution-123',
  project_id: 'project-456',
  checklist_template_id: 'template-123',
  name: 'Morning Safety Check',
  inspector_user_id: 'user-789',
  status: 'draft',
  category: 'safety',
  is_completed: false,
  location: 'Building A',
  notes: 'Regular inspection',
  submitted_at: null,
  completed_at: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  deleted_at: null,
  ...overrides,
})

const createMockResponse = (overrides = {}) => ({
  id: 'response-123',
  checklist_id: 'execution-123',
  checklist_template_item_id: 'item-123',
  response_value: 'pass',
  score_value: 'pass',
  notes: 'All good',
  photo_urls: [],
  sort_order: 1,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
})

// Helper to create a chainable mock for Supabase query builder
const createSupabaseMock = (resolveData: unknown, resolveError: unknown = null) => {
  const mockChain = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    contains: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: resolveData, error: resolveError }),
    then: vi.fn((onFulfilled) => Promise.resolve({ data: resolveData, error: resolveError }).then(onFulfilled)),
  }
  return mockChain
}

describe('checklistsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // =============================================
  // CHECKLIST TEMPLATES
  // =============================================

  describe('getTemplates', () => {
    it('should fetch all templates without filters', async () => {
      const mockTemplates = [createMockTemplate(), createMockTemplate({ id: 'template-456' })]
      const mockChain = createSupabaseMock(mockTemplates)
      vi.mocked(supabase.from).mockReturnValue(mockChain as never)

      const result = await checklistsApi.getTemplates()

      expect(supabase.from).toHaveBeenCalledWith('checklist_templates')
      expect(mockChain.select).toHaveBeenCalledWith('*')
      expect(mockChain.is).toHaveBeenCalledWith('deleted_at', null)
      expect(result).toEqual(mockTemplates)
    })

    it('should apply company_id filter', async () => {
      const mockChain = createSupabaseMock([])
      vi.mocked(supabase.from).mockReturnValue(mockChain as never)

      await checklistsApi.getTemplates({ company_id: 'company-123' })

      expect(mockChain.eq).toHaveBeenCalledWith('company_id', 'company-123')
    })

    it('should apply category filter', async () => {
      const mockChain = createSupabaseMock([])
      vi.mocked(supabase.from).mockReturnValue(mockChain as never)

      await checklistsApi.getTemplates({ category: 'safety' })

      expect(mockChain.eq).toHaveBeenCalledWith('category', 'safety')
    })

    it('should apply template_level filter', async () => {
      const mockChain = createSupabaseMock([])
      vi.mocked(supabase.from).mockReturnValue(mockChain as never)

      await checklistsApi.getTemplates({ template_level: 'project' })

      expect(mockChain.eq).toHaveBeenCalledWith('template_level', 'project')
    })

    it('should apply is_system_template filter', async () => {
      const mockChain = createSupabaseMock([])
      vi.mocked(supabase.from).mockReturnValue(mockChain as never)

      await checklistsApi.getTemplates({ is_system_template: true })

      expect(mockChain.eq).toHaveBeenCalledWith('is_system_template', true)
    })

    it('should apply tags filter', async () => {
      const mockChain = createSupabaseMock([])
      vi.mocked(supabase.from).mockReturnValue(mockChain as never)

      await checklistsApi.getTemplates({ tags: ['safety', 'daily'] })

      expect(mockChain.contains).toHaveBeenCalledWith('tags', ['safety', 'daily'])
    })

    it('should apply search filter', async () => {
      const mockChain = createSupabaseMock([])
      vi.mocked(supabase.from).mockReturnValue(mockChain as never)

      await checklistsApi.getTemplates({ search: 'safety' })

      expect(mockChain.or).toHaveBeenCalledWith('name.ilike.%safety%,description.ilike.%safety%')
    })

    it('should handle database error', async () => {
      const mockChain = createSupabaseMock(null, { message: 'Database error' })
      vi.mocked(supabase.from).mockReturnValue(mockChain as never)

      await expect(checklistsApi.getTemplates()).rejects.toThrow('Failed to fetch templates')
    })

    it('should return data as array when successful', async () => {
      const mockTemplates = [createMockTemplate()]
      const mockChain = createSupabaseMock(mockTemplates)
      vi.mocked(supabase.from).mockReturnValue(mockChain as never)

      const result = await checklistsApi.getTemplates()

      expect(result).toEqual(mockTemplates)
    })
  })

  describe('getTemplate', () => {
    it('should fetch single template by ID', async () => {
      const mockTemplate = createMockTemplate()
      const mockChain = createSupabaseMock(mockTemplate)
      vi.mocked(supabase.from).mockReturnValue(mockChain as never)

      const result = await checklistsApi.getTemplate('template-123')

      expect(supabase.from).toHaveBeenCalledWith('checklist_templates')
      expect(mockChain.eq).toHaveBeenCalledWith('id', 'template-123')
      expect(mockChain.single).toHaveBeenCalled()
      expect(result).toEqual(mockTemplate)
    })

    it('should handle database error', async () => {
      const mockChain = createSupabaseMock(null, { message: 'Not found' })
      vi.mocked(supabase.from).mockReturnValue(mockChain as never)

      await expect(checklistsApi.getTemplate('invalid-id')).rejects.toThrow('Failed to fetch template')
    })
  })

  describe('getTemplateWithItems', () => {
    it('should fetch template with items', async () => {
      const mockTemplate = createMockTemplate()
      const mockItems = [createMockTemplateItem(), createMockTemplateItem({ id: 'item-456' })]

      // First call for getTemplate, second for getTemplateItems
      const templateMock = createSupabaseMock(mockTemplate)
      const itemsMock = createSupabaseMock(mockItems)

      vi.mocked(supabase.from)
        .mockReturnValueOnce(templateMock as never)
        .mockReturnValueOnce(itemsMock as never)

      const result = await checklistsApi.getTemplateWithItems('template-123')

      expect(result).toEqual({
        ...mockTemplate,
        template_items: mockItems,
      })
    })

    it('should handle error when template not found', async () => {
      const mockChain = createSupabaseMock(null, { message: 'Not found' })
      vi.mocked(supabase.from).mockReturnValue(mockChain as never)

      await expect(checklistsApi.getTemplateWithItems('invalid-id')).rejects.toThrow('Failed to fetch template')
    })
  })

  describe('createTemplate', () => {
    it('should create new template', async () => {
      const mockTemplate = createMockTemplate()
      const mockChain = createSupabaseMock(mockTemplate)
      vi.mocked(supabase.from).mockReturnValue(mockChain as never)

      const createData = {
        company_id: 'company-456',
        name: 'Safety Inspection',
        description: 'Daily safety inspection checklist',
        category: 'safety',
        template_level: 'project' as const,
      }

      const result = await checklistsApi.createTemplate(createData)

      expect(supabase.from).toHaveBeenCalledWith('checklist_templates')
      expect(mockChain.insert).toHaveBeenCalled()
      expect(result).toEqual(mockTemplate)
    })

    it('should handle insert error', async () => {
      const mockChain = createSupabaseMock(null, { message: 'Insert failed' })
      vi.mocked(supabase.from).mockReturnValue(mockChain as never)

      await expect(
        checklistsApi.createTemplate({ company_id: 'company-123', name: 'Test' })
      ).rejects.toThrow('Failed to create template')
    })
  })

  describe('updateTemplate', () => {
    it('should update template', async () => {
      const mockTemplate = createMockTemplate({ name: 'Updated Name' })
      const mockChain = createSupabaseMock(mockTemplate)
      vi.mocked(supabase.from).mockReturnValue(mockChain as never)

      const result = await checklistsApi.updateTemplate('template-123', { name: 'Updated Name' })

      expect(supabase.from).toHaveBeenCalledWith('checklist_templates')
      expect(mockChain.update).toHaveBeenCalled()
      expect(mockChain.eq).toHaveBeenCalledWith('id', 'template-123')
      expect(result).toEqual(mockTemplate)
    })

    it('should handle update error', async () => {
      const mockChain = createSupabaseMock(null, { message: 'Update failed' })
      vi.mocked(supabase.from).mockReturnValue(mockChain as never)

      await expect(
        checklistsApi.updateTemplate('template-123', { name: 'Test' })
      ).rejects.toThrow('Failed to update template')
    })
  })

  describe('deleteTemplate', () => {
    it('should soft delete template', async () => {
      const mockChain = createSupabaseMock(null)
      // For delete, we need to handle the chain differently - no single() call
      mockChain.then = vi.fn((onFulfilled) => Promise.resolve({ data: null, error: null }).then(onFulfilled))
      vi.mocked(supabase.from).mockReturnValue(mockChain as never)

      await checklistsApi.deleteTemplate('template-123')

      expect(supabase.from).toHaveBeenCalledWith('checklist_templates')
      expect(mockChain.update).toHaveBeenCalled()
      expect(mockChain.eq).toHaveBeenCalledWith('id', 'template-123')
    })

    it('should handle delete error', async () => {
      const mockChain = createSupabaseMock(null, { message: 'Delete failed' })
      mockChain.then = vi.fn((onFulfilled) => Promise.resolve({ data: null, error: { message: 'Delete failed' } }).then(onFulfilled))
      vi.mocked(supabase.from).mockReturnValue(mockChain as never)

      await expect(checklistsApi.deleteTemplate('template-123')).rejects.toThrow('Failed to delete template')
    })
  })

  describe('duplicateTemplate', () => {
    it('should duplicate template with items', async () => {
      const originalTemplate = createMockTemplate()
      const originalItems = [createMockTemplateItem()]
      const newTemplate = createMockTemplate({ id: 'new-template-123', name: 'Copy of Safety' })

      // Setup mocks for: getTemplate, getTemplateItems, insert new template, insert items
      const getTemplateMock = createSupabaseMock(originalTemplate)
      const getItemsMock = createSupabaseMock(originalItems)
      const insertTemplateMock = createSupabaseMock(newTemplate)
      const insertItemsMock = createSupabaseMock([])
      insertItemsMock.then = vi.fn((onFulfilled) => Promise.resolve({ data: [], error: null }).then(onFulfilled))

      vi.mocked(supabase.from)
        .mockReturnValueOnce(getTemplateMock as never)
        .mockReturnValueOnce(getItemsMock as never)
        .mockReturnValueOnce(insertTemplateMock as never)
        .mockReturnValueOnce(insertItemsMock as never)

      const result = await checklistsApi.duplicateTemplate('template-123', 'Copy of Safety')

      expect(result).toEqual(newTemplate)
    })

    it('should handle duplication error', async () => {
      const mockChain = createSupabaseMock(null, { message: 'Not found' })
      vi.mocked(supabase.from).mockReturnValue(mockChain as never)

      await expect(
        checklistsApi.duplicateTemplate('invalid-id', 'Copy')
      ).rejects.toThrow('Failed to fetch template')
    })
  })

  // =============================================
  // CHECKLIST TEMPLATE ITEMS
  // =============================================

  describe('getTemplateItems', () => {
    it('should fetch template items', async () => {
      const mockItems = [createMockTemplateItem(), createMockTemplateItem({ id: 'item-456' })]
      const mockChain = createSupabaseMock(mockItems)
      vi.mocked(supabase.from).mockReturnValue(mockChain as never)

      const result = await checklistsApi.getTemplateItems('template-123')

      expect(supabase.from).toHaveBeenCalledWith('checklist_template_items')
      expect(mockChain.eq).toHaveBeenCalledWith('checklist_template_id', 'template-123')
      expect(result).toEqual(mockItems)
    })

    it('should handle database error', async () => {
      const mockChain = createSupabaseMock(null, { message: 'Database error' })
      vi.mocked(supabase.from).mockReturnValue(mockChain as never)

      await expect(checklistsApi.getTemplateItems('template-123')).rejects.toThrow('Failed to fetch template items')
    })
  })

  describe('createTemplateItem', () => {
    it('should create template item', async () => {
      const mockItem = createMockTemplateItem()
      const mockChain = createSupabaseMock(mockItem)
      vi.mocked(supabase.from).mockReturnValue(mockChain as never)

      const createData = {
        checklist_template_id: 'template-123',
        item_type: 'yes_no' as const,
        label: 'Is PPE worn correctly?',
        sort_order: 1,
        is_required: true,
      }

      const result = await checklistsApi.createTemplateItem(createData)

      expect(supabase.from).toHaveBeenCalledWith('checklist_template_items')
      expect(mockChain.insert).toHaveBeenCalled()
      expect(result).toEqual(mockItem)
    })

    it('should handle insert error', async () => {
      const mockChain = createSupabaseMock(null, { message: 'Insert failed' })
      vi.mocked(supabase.from).mockReturnValue(mockChain as never)

      await expect(
        checklistsApi.createTemplateItem({
          checklist_template_id: 'template-123',
          item_type: 'yes_no',
          label: 'Test',
          sort_order: 1,
          is_required: true,
        })
      ).rejects.toThrow('Failed to create template item')
    })
  })

  describe('updateTemplateItem', () => {
    it('should update template item', async () => {
      const mockItem = createMockTemplateItem({ label: 'Updated Label' })
      const mockChain = createSupabaseMock(mockItem)
      vi.mocked(supabase.from).mockReturnValue(mockChain as never)

      const result = await checklistsApi.updateTemplateItem('item-123', { label: 'Updated Label' })

      expect(supabase.from).toHaveBeenCalledWith('checklist_template_items')
      expect(mockChain.update).toHaveBeenCalled()
      expect(mockChain.eq).toHaveBeenCalledWith('id', 'item-123')
      expect(result).toEqual(mockItem)
    })

    it('should handle update error', async () => {
      const mockChain = createSupabaseMock(null, { message: 'Update failed' })
      vi.mocked(supabase.from).mockReturnValue(mockChain as never)

      await expect(
        checklistsApi.updateTemplateItem('item-123', { label: 'Test' })
      ).rejects.toThrow('Failed to update template item')
    })
  })

  describe('deleteTemplateItem', () => {
    it('should soft delete template item', async () => {
      const mockChain = createSupabaseMock(null)
      mockChain.then = vi.fn((onFulfilled) => Promise.resolve({ data: null, error: null }).then(onFulfilled))
      vi.mocked(supabase.from).mockReturnValue(mockChain as never)

      await checklistsApi.deleteTemplateItem('item-123')

      expect(supabase.from).toHaveBeenCalledWith('checklist_template_items')
      expect(mockChain.update).toHaveBeenCalled()
      expect(mockChain.eq).toHaveBeenCalledWith('id', 'item-123')
    })

    it('should handle delete error', async () => {
      const mockChain = createSupabaseMock(null, { message: 'Delete failed' })
      mockChain.then = vi.fn((onFulfilled) => Promise.resolve({ data: null, error: { message: 'Delete failed' } }).then(onFulfilled))
      vi.mocked(supabase.from).mockReturnValue(mockChain as never)

      await expect(checklistsApi.deleteTemplateItem('item-123')).rejects.toThrow('Failed to delete template item')
    })
  })

  describe('reorderTemplateItems', () => {
    it('should reorder multiple items', async () => {
      const mockChain = createSupabaseMock(null)
      mockChain.then = vi.fn((onFulfilled) => Promise.resolve({ data: null, error: null }).then(onFulfilled))
      vi.mocked(supabase.from).mockReturnValue(mockChain as never)

      const items = [
        { id: 'item-123', sort_order: 2 },
        { id: 'item-456', sort_order: 1 },
      ]

      await checklistsApi.reorderTemplateItems(items)

      expect(supabase.from).toHaveBeenCalledWith('checklist_template_items')
      expect(supabase.from).toHaveBeenCalledTimes(2)
    })

    it('should handle empty array', async () => {
      await checklistsApi.reorderTemplateItems([])

      expect(supabase.from).not.toHaveBeenCalled()
    })

    it('should handle error during reorder', async () => {
      const mockChain = createSupabaseMock(null, { message: 'Update failed' })
      mockChain.then = vi.fn((onFulfilled) => Promise.resolve({ data: null, error: { message: 'Update failed' } }).then(onFulfilled))
      vi.mocked(supabase.from).mockReturnValue(mockChain as never)

      await expect(
        checklistsApi.reorderTemplateItems([{ id: 'item-123', sort_order: 1 }])
      ).rejects.toThrow('Failed to reorder template items')
    })
  })

  // =============================================
  // CHECKLIST EXECUTIONS
  // =============================================

  describe('getExecutions', () => {
    it('should fetch all executions without filters', async () => {
      const mockExecutions = [createMockExecution(), createMockExecution({ id: 'execution-456' })]
      const mockChain = createSupabaseMock(mockExecutions)
      vi.mocked(supabase.from).mockReturnValue(mockChain as never)

      const result = await checklistsApi.getExecutions()

      expect(supabase.from).toHaveBeenCalledWith('checklists')
      expect(mockChain.select).toHaveBeenCalledWith('*')
      expect(result).toEqual(mockExecutions)
    })

    it('should apply project_id filter', async () => {
      const mockChain = createSupabaseMock([])
      vi.mocked(supabase.from).mockReturnValue(mockChain as never)

      await checklistsApi.getExecutions({ project_id: 'project-123' })

      expect(mockChain.eq).toHaveBeenCalledWith('project_id', 'project-123')
    })

    it('should apply status filter', async () => {
      const mockChain = createSupabaseMock([])
      vi.mocked(supabase.from).mockReturnValue(mockChain as never)

      await checklistsApi.getExecutions({ status: 'in_progress' })

      expect(mockChain.eq).toHaveBeenCalledWith('status', 'in_progress')
    })

    it('should apply category filter', async () => {
      const mockChain = createSupabaseMock([])
      vi.mocked(supabase.from).mockReturnValue(mockChain as never)

      await checklistsApi.getExecutions({ category: 'safety' })

      expect(mockChain.eq).toHaveBeenCalledWith('category', 'safety')
    })

    it('should apply inspector_user_id filter', async () => {
      const mockChain = createSupabaseMock([])
      vi.mocked(supabase.from).mockReturnValue(mockChain as never)

      await checklistsApi.getExecutions({ inspector_user_id: 'user-123' })

      expect(mockChain.eq).toHaveBeenCalledWith('inspector_user_id', 'user-123')
    })

    it('should apply is_completed filter', async () => {
      const mockChain = createSupabaseMock([])
      vi.mocked(supabase.from).mockReturnValue(mockChain as never)

      await checklistsApi.getExecutions({ is_completed: true })

      expect(mockChain.eq).toHaveBeenCalledWith('is_completed', true)
    })

    it('should apply date_from filter', async () => {
      const mockChain = createSupabaseMock([])
      vi.mocked(supabase.from).mockReturnValue(mockChain as never)

      await checklistsApi.getExecutions({ date_from: '2024-01-01' })

      expect(mockChain.gte).toHaveBeenCalledWith('created_at', '2024-01-01')
    })

    it('should apply date_to filter', async () => {
      const mockChain = createSupabaseMock([])
      vi.mocked(supabase.from).mockReturnValue(mockChain as never)

      await checklistsApi.getExecutions({ date_to: '2024-12-31' })

      expect(mockChain.lte).toHaveBeenCalledWith('created_at', '2024-12-31')
    })

    it('should handle database error', async () => {
      const mockChain = createSupabaseMock(null, { message: 'Database error' })
      vi.mocked(supabase.from).mockReturnValue(mockChain as never)

      await expect(checklistsApi.getExecutions()).rejects.toThrow('Failed to fetch executions')
    })
  })

  describe('getExecution', () => {
    it('should fetch single execution by ID', async () => {
      const mockExecution = createMockExecution()
      const mockChain = createSupabaseMock(mockExecution)
      vi.mocked(supabase.from).mockReturnValue(mockChain as never)

      const result = await checklistsApi.getExecution('execution-123')

      expect(supabase.from).toHaveBeenCalledWith('checklists')
      expect(mockChain.eq).toHaveBeenCalledWith('id', 'execution-123')
      expect(result).toEqual(mockExecution)
    })

    it('should handle error', async () => {
      const mockChain = createSupabaseMock(null, { message: 'Not found' })
      vi.mocked(supabase.from).mockReturnValue(mockChain as never)

      await expect(checklistsApi.getExecution('invalid-id')).rejects.toThrow('Failed to fetch execution')
    })
  })

  describe('getExecutionWithResponses', () => {
    it('should fetch execution with responses', async () => {
      const mockExecution = createMockExecution()
      const mockResponses = [createMockResponse(), createMockResponse({ id: 'response-456' })]

      const executionMock = createSupabaseMock(mockExecution)
      const responsesMock = createSupabaseMock(mockResponses)

      vi.mocked(supabase.from)
        .mockReturnValueOnce(executionMock as never)
        .mockReturnValueOnce(responsesMock as never)

      const result = await checklistsApi.getExecutionWithResponses('execution-123')

      expect(result).toEqual({
        ...mockExecution,
        responses: mockResponses,
      })
    })

    it('should handle error when execution not found', async () => {
      const mockChain = createSupabaseMock(null, { message: 'Not found' })
      vi.mocked(supabase.from).mockReturnValue(mockChain as never)

      await expect(checklistsApi.getExecutionWithResponses('invalid-id')).rejects.toThrow('Failed to fetch execution')
    })
  })

  describe('createExecution', () => {
    it('should create new execution with defaults', async () => {
      const mockExecution = createMockExecution()
      const mockChain = createSupabaseMock(mockExecution)
      vi.mocked(supabase.from).mockReturnValue(mockChain as never)

      const createData = {
        project_id: 'project-456',
        name: 'Morning Safety Check',
        checklist_template_id: 'template-123',
      }

      const result = await checklistsApi.createExecution(createData)

      expect(supabase.from).toHaveBeenCalledWith('checklists')
      expect(mockChain.insert).toHaveBeenCalled()
      expect(result).toEqual(mockExecution)
    })

    it('should handle insert error', async () => {
      const mockChain = createSupabaseMock(null, { message: 'Insert failed' })
      vi.mocked(supabase.from).mockReturnValue(mockChain as never)

      await expect(
        checklistsApi.createExecution({ project_id: 'project-123', name: 'Test' })
      ).rejects.toThrow('Failed to create execution')
    })
  })

  describe('updateExecution', () => {
    it('should update execution', async () => {
      const mockExecution = createMockExecution({ status: 'in_progress' })
      const mockChain = createSupabaseMock(mockExecution)
      vi.mocked(supabase.from).mockReturnValue(mockChain as never)

      const result = await checklistsApi.updateExecution('execution-123', { status: 'in_progress' })

      expect(supabase.from).toHaveBeenCalledWith('checklists')
      expect(mockChain.update).toHaveBeenCalled()
      expect(mockChain.eq).toHaveBeenCalledWith('id', 'execution-123')
      expect(result).toEqual(mockExecution)
    })

    it('should handle update error', async () => {
      const mockChain = createSupabaseMock(null, { message: 'Update failed' })
      vi.mocked(supabase.from).mockReturnValue(mockChain as never)

      await expect(
        checklistsApi.updateExecution('execution-123', { status: 'in_progress' })
      ).rejects.toThrow('Failed to update execution')
    })
  })

  describe('submitExecution', () => {
    it('should submit execution with timestamps', async () => {
      const mockExecution = createMockExecution({
        status: 'submitted',
        is_completed: true,
      })
      const mockChain = createSupabaseMock(mockExecution)
      vi.mocked(supabase.from).mockReturnValue(mockChain as never)

      const result = await checklistsApi.submitExecution('execution-123')

      expect(supabase.from).toHaveBeenCalledWith('checklists')
      expect(mockChain.update).toHaveBeenCalled()
      expect(result).toEqual(mockExecution)
    })

    it('should handle submit error', async () => {
      const mockChain = createSupabaseMock(null, { message: 'Submit failed' })
      vi.mocked(supabase.from).mockReturnValue(mockChain as never)

      await expect(checklistsApi.submitExecution('execution-123')).rejects.toThrow('Failed to submit execution')
    })
  })

  describe('deleteExecution', () => {
    it('should soft delete execution', async () => {
      const mockChain = createSupabaseMock(null)
      mockChain.then = vi.fn((onFulfilled) => Promise.resolve({ data: null, error: null }).then(onFulfilled))
      vi.mocked(supabase.from).mockReturnValue(mockChain as never)

      await checklistsApi.deleteExecution('execution-123')

      expect(supabase.from).toHaveBeenCalledWith('checklists')
      expect(mockChain.update).toHaveBeenCalled()
      expect(mockChain.eq).toHaveBeenCalledWith('id', 'execution-123')
    })

    it('should handle delete error', async () => {
      const mockChain = createSupabaseMock(null, { message: 'Delete failed' })
      mockChain.then = vi.fn((onFulfilled) => Promise.resolve({ data: null, error: { message: 'Delete failed' } }).then(onFulfilled))
      vi.mocked(supabase.from).mockReturnValue(mockChain as never)

      await expect(checklistsApi.deleteExecution('execution-123')).rejects.toThrow('Failed to delete execution')
    })
  })

  // =============================================
  // CHECKLIST RESPONSES
  // =============================================

  describe('getResponses', () => {
    it('should fetch responses for execution', async () => {
      const mockResponses = [createMockResponse(), createMockResponse({ id: 'response-456' })]
      const mockChain = createSupabaseMock(mockResponses)
      vi.mocked(supabase.from).mockReturnValue(mockChain as never)

      const result = await checklistsApi.getResponses('execution-123')

      expect(supabase.from).toHaveBeenCalledWith('checklist_responses')
      expect(mockChain.eq).toHaveBeenCalledWith('checklist_id', 'execution-123')
      expect(result).toEqual(mockResponses)
    })

    it('should handle database error', async () => {
      const mockChain = createSupabaseMock(null, { message: 'Database error' })
      vi.mocked(supabase.from).mockReturnValue(mockChain as never)

      await expect(checklistsApi.getResponses('execution-123')).rejects.toThrow('Failed to fetch responses')
    })
  })

  describe('createResponse', () => {
    it('should create response', async () => {
      const mockResponse = createMockResponse()
      const mockChain = createSupabaseMock(mockResponse)
      vi.mocked(supabase.from).mockReturnValue(mockChain as never)

      const createData = {
        checklist_id: 'execution-123',
        checklist_template_item_id: 'item-123',
        response_value: 'pass',
      }

      const result = await checklistsApi.createResponse(createData)

      expect(supabase.from).toHaveBeenCalledWith('checklist_responses')
      expect(mockChain.insert).toHaveBeenCalled()
      expect(result).toEqual(mockResponse)
    })

    it('should handle insert error', async () => {
      const mockChain = createSupabaseMock(null, { message: 'Insert failed' })
      vi.mocked(supabase.from).mockReturnValue(mockChain as never)

      await expect(
        checklistsApi.createResponse({
          checklist_id: 'execution-123',
          checklist_template_item_id: 'item-123',
          response_value: 'pass',
        })
      ).rejects.toThrow('Failed to create response')
    })
  })

  describe('updateResponse', () => {
    it('should update response', async () => {
      const mockResponse = createMockResponse({ response_value: 'fail' })
      const mockChain = createSupabaseMock(mockResponse)
      vi.mocked(supabase.from).mockReturnValue(mockChain as never)

      const result = await checklistsApi.updateResponse('response-123', { response_value: 'fail' })

      expect(supabase.from).toHaveBeenCalledWith('checklist_responses')
      expect(mockChain.update).toHaveBeenCalled()
      expect(mockChain.eq).toHaveBeenCalledWith('id', 'response-123')
      expect(result).toEqual(mockResponse)
    })

    it('should handle update error', async () => {
      const mockChain = createSupabaseMock(null, { message: 'Update failed' })
      vi.mocked(supabase.from).mockReturnValue(mockChain as never)

      await expect(
        checklistsApi.updateResponse('response-123', { response_value: 'pass' })
      ).rejects.toThrow('Failed to update response')
    })
  })

  describe('deleteResponse', () => {
    it('should delete response', async () => {
      const mockChain = createSupabaseMock(null)
      mockChain.then = vi.fn((onFulfilled) => Promise.resolve({ data: null, error: null }).then(onFulfilled))
      vi.mocked(supabase.from).mockReturnValue(mockChain as never)

      await checklistsApi.deleteResponse('response-123')

      expect(supabase.from).toHaveBeenCalledWith('checklist_responses')
      expect(mockChain.delete).toHaveBeenCalled()
      expect(mockChain.eq).toHaveBeenCalledWith('id', 'response-123')
    })

    it('should handle delete error', async () => {
      const mockChain = createSupabaseMock(null, { message: 'Delete failed' })
      mockChain.then = vi.fn((onFulfilled) => Promise.resolve({ data: null, error: { message: 'Delete failed' } }).then(onFulfilled))
      vi.mocked(supabase.from).mockReturnValue(mockChain as never)

      await expect(checklistsApi.deleteResponse('response-123')).rejects.toThrow('Failed to delete response')
    })
  })

  describe('batchCreateResponses', () => {
    it('should batch create responses', async () => {
      const mockResponses = [createMockResponse(), createMockResponse({ id: 'response-456' })]
      const mockChain = createSupabaseMock(mockResponses)
      // For batch insert, we don't use single()
      mockChain.then = vi.fn((onFulfilled) => Promise.resolve({ data: mockResponses, error: null }).then(onFulfilled))
      vi.mocked(supabase.from).mockReturnValue(mockChain as never)

      const responsesData = [
        { checklist_id: 'execution-123', checklist_template_item_id: 'item-1', response_value: 'pass' },
        { checklist_id: 'execution-123', checklist_template_item_id: 'item-2', response_value: 'fail' },
      ]

      const result = await checklistsApi.batchCreateResponses(responsesData)

      expect(supabase.from).toHaveBeenCalledWith('checklist_responses')
      expect(mockChain.insert).toHaveBeenCalled()
      expect(result).toEqual(mockResponses)
    })

    it('should handle batch insert error', async () => {
      const mockChain = createSupabaseMock(null, { message: 'Batch insert failed' })
      mockChain.then = vi.fn((onFulfilled) => Promise.resolve({ data: null, error: { message: 'Batch insert failed' } }).then(onFulfilled))
      vi.mocked(supabase.from).mockReturnValue(mockChain as never)

      await expect(
        checklistsApi.batchCreateResponses([
          { checklist_id: 'execution-123', checklist_template_item_id: 'item-1', response_value: 'pass' },
        ])
      ).rejects.toThrow('Failed to batch create responses')
    })
  })

  // =============================================
  // SCORING & STATISTICS
  // =============================================

  describe('getExecutionScore', () => {
    it('should calculate execution score from responses', async () => {
      const mockResponses = [
        createMockResponse({ score_value: 'pass' }),
        createMockResponse({ id: 'r2', score_value: 'pass' }),
        createMockResponse({ id: 'r3', score_value: 'fail' }),
        createMockResponse({ id: 'r4', score_value: 'na' }),
      ]
      const mockChain = createSupabaseMock(mockResponses)
      vi.mocked(supabase.from).mockReturnValue(mockChain as never)

      const result = await checklistsApi.getExecutionScore('execution-123')

      expect(result.pass_count).toBe(2)
      expect(result.fail_count).toBe(1)
      expect(result.na_count).toBe(1)
      expect(result.total_count).toBe(4)
      // pass_percentage = (2 / 3) * 100 = 66.67
      expect(result.pass_percentage).toBeCloseTo(66.67, 1)
    })

    it('should return zero scores when no responses', async () => {
      const mockChain = createSupabaseMock([])
      vi.mocked(supabase.from).mockReturnValue(mockChain as never)

      const result = await checklistsApi.getExecutionScore('execution-123')

      expect(result).toEqual({
        pass_count: 0,
        fail_count: 0,
        na_count: 0,
        total_count: 0,
        pass_percentage: 0,
      })
    })

    it('should handle all NA responses', async () => {
      const mockResponses = [
        createMockResponse({ score_value: 'na' }),
        createMockResponse({ id: 'r2', score_value: 'na' }),
      ]
      const mockChain = createSupabaseMock(mockResponses)
      vi.mocked(supabase.from).mockReturnValue(mockChain as never)

      const result = await checklistsApi.getExecutionScore('execution-123')

      expect(result.pass_count).toBe(0)
      expect(result.fail_count).toBe(0)
      expect(result.na_count).toBe(2)
      expect(result.pass_percentage).toBe(0)
    })
  })
})
