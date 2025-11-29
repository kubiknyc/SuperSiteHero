// File: /src/lib/api/services/checklists.test.ts
// Comprehensive tests for Checklists API service
// Phase: Testing - Checklists feature coverage

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { checklistsApi } from './checklists'
import { apiClient } from '../client'
import { ApiErrorClass } from '../errors'
import { supabase } from '@/lib/supabase'

// Mock dependencies
vi.mock('../client', () => ({
  apiClient: {
    select: vi.fn(),
    selectOne: vi.fn(),
    insert: vi.fn(),
    insertMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}))

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
  notes: 'All good',
  photo_urls: [],
  sort_order: 1,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
})

// Helper to create thenable mock chain
const createMockSupabaseChain = (resolveWith: { data: unknown; error: unknown }) => {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    contains: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    then: vi.fn(function (this: unknown, onFulfilled: (value: unknown) => unknown) {
      return Promise.resolve(resolveWith).then(onFulfilled)
    }),
  }
  return chain
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
      const mockChain = createMockSupabaseChain({ data: mockTemplates, error: null })
      vi.mocked(supabase.from).mockReturnValue(mockChain as never)

      const result = await checklistsApi.getTemplates()

      expect(supabase.from).toHaveBeenCalledWith('checklist_templates')
      expect(mockChain.select).toHaveBeenCalledWith('*')
      expect(mockChain.is).toHaveBeenCalledWith('deleted_at', null)
      expect(result).toEqual(mockTemplates)
    })

    it('should apply company_id filter', async () => {
      const mockChain = createMockSupabaseChain({ data: [], error: null })
      vi.mocked(supabase.from).mockReturnValue(mockChain as never)

      await checklistsApi.getTemplates({ company_id: 'company-123' })

      expect(mockChain.eq).toHaveBeenCalledWith('company_id', 'company-123')
    })

    it('should apply category filter', async () => {
      const mockChain = createMockSupabaseChain({ data: [], error: null })
      vi.mocked(supabase.from).mockReturnValue(mockChain as never)

      await checklistsApi.getTemplates({ category: 'safety' })

      expect(mockChain.eq).toHaveBeenCalledWith('category', 'safety')
    })

    it('should apply template_level filter', async () => {
      const mockChain = createMockSupabaseChain({ data: [], error: null })
      vi.mocked(supabase.from).mockReturnValue(mockChain as never)

      await checklistsApi.getTemplates({ template_level: 'project' })

      expect(mockChain.eq).toHaveBeenCalledWith('template_level', 'project')
    })

    it('should apply is_system_template filter', async () => {
      const mockChain = createMockSupabaseChain({ data: [], error: null })
      vi.mocked(supabase.from).mockReturnValue(mockChain as never)

      await checklistsApi.getTemplates({ is_system_template: true })

      expect(mockChain.eq).toHaveBeenCalledWith('is_system_template', true)
    })

    it('should apply tags filter', async () => {
      const mockChain = createMockSupabaseChain({ data: [], error: null })
      vi.mocked(supabase.from).mockReturnValue(mockChain as never)

      await checklistsApi.getTemplates({ tags: ['safety', 'daily'] })

      expect(mockChain.contains).toHaveBeenCalledWith('tags', ['safety', 'daily'])
    })

    it('should apply search filter', async () => {
      const mockChain = createMockSupabaseChain({ data: [], error: null })
      vi.mocked(supabase.from).mockReturnValue(mockChain as never)

      await checklistsApi.getTemplates({ search: 'safety' })

      expect(mockChain.or).toHaveBeenCalledWith('name.ilike.%safety%,description.ilike.%safety%')
    })

    it('should handle database error', async () => {
      const mockChain = createMockSupabaseChain({
        data: null,
        error: { message: 'Database error' },
      })
      vi.mocked(supabase.from).mockReturnValue(mockChain as never)

      await expect(checklistsApi.getTemplates()).rejects.toThrow(ApiErrorClass)
    })

    it('should return empty array when no data', async () => {
      const mockChain = createMockSupabaseChain({ data: null, error: null })
      vi.mocked(supabase.from).mockReturnValue(mockChain as never)

      const result = await checklistsApi.getTemplates()

      expect(result).toEqual([])
    })
  })

  describe('getTemplate', () => {
    it('should fetch single template by ID', async () => {
      const mockTemplate = createMockTemplate()
      vi.mocked(apiClient.selectOne).mockResolvedValue(mockTemplate)

      const result = await checklistsApi.getTemplate('template-123')

      expect(apiClient.selectOne).toHaveBeenCalledWith('checklist_templates', 'template-123')
      expect(result).toEqual(mockTemplate)
    })

    it('should throw error when template ID is missing', async () => {
      await expect(checklistsApi.getTemplate('')).rejects.toThrow(ApiErrorClass)
    })

    it('should handle API error', async () => {
      vi.mocked(apiClient.selectOne).mockRejectedValue(new Error('Not found'))

      await expect(checklistsApi.getTemplate('invalid-id')).rejects.toThrow(ApiErrorClass)
    })
  })

  describe('getTemplateWithItems', () => {
    it('should fetch template with nested items', async () => {
      const mockTemplateWithItems = {
        ...createMockTemplate(),
        template_items: [createMockTemplateItem(), createMockTemplateItem({ id: 'item-456' })],
      }
      const mockChain = createMockSupabaseChain({ data: mockTemplateWithItems, error: null })
      vi.mocked(supabase.from).mockReturnValue(mockChain as never)

      const result = await checklistsApi.getTemplateWithItems('template-123')

      expect(supabase.from).toHaveBeenCalledWith('checklist_templates')
      expect(mockChain.select).toHaveBeenCalledWith(
        expect.stringContaining('template_items:checklist_template_items(*)')
      )
      expect(result).toEqual(mockTemplateWithItems)
    })

    it('should throw error when template ID is missing', async () => {
      await expect(checklistsApi.getTemplateWithItems('')).rejects.toThrow(ApiErrorClass)
    })

    it('should throw error when template not found', async () => {
      const mockChain = createMockSupabaseChain({ data: null, error: null })
      vi.mocked(supabase.from).mockReturnValue(mockChain as never)

      await expect(checklistsApi.getTemplateWithItems('invalid-id')).rejects.toThrow(ApiErrorClass)
    })

    it('should handle database error', async () => {
      const mockChain = createMockSupabaseChain({
        data: null,
        error: { message: 'Database error' },
      })
      vi.mocked(supabase.from).mockReturnValue(mockChain as never)

      await expect(checklistsApi.getTemplateWithItems('template-123')).rejects.toThrow(ApiErrorClass)
    })
  })

  describe('createTemplate', () => {
    it('should create new template', async () => {
      const mockTemplate = createMockTemplate()
      vi.mocked(apiClient.insert).mockResolvedValue(mockTemplate)

      const createData = {
        company_id: 'company-456',
        name: 'Safety Inspection',
        description: 'Daily safety inspection checklist',
        category: 'safety',
        template_level: 'project' as const,
      }

      const result = await checklistsApi.createTemplate(createData)

      expect(apiClient.insert).toHaveBeenCalledWith('checklist_templates', createData)
      expect(result).toEqual(mockTemplate)
    })

    it('should throw error when name is missing', async () => {
      await expect(
        checklistsApi.createTemplate({ company_id: 'company-123', name: '' })
      ).rejects.toThrow(ApiErrorClass)
    })

    it('should handle API error', async () => {
      vi.mocked(apiClient.insert).mockRejectedValue(new Error('Insert failed'))

      await expect(
        checklistsApi.createTemplate({ company_id: 'company-123', name: 'Test' })
      ).rejects.toThrow(ApiErrorClass)
    })
  })

  describe('updateTemplate', () => {
    it('should update template', async () => {
      const mockTemplate = createMockTemplate({ name: 'Updated Name' })
      vi.mocked(apiClient.update).mockResolvedValue(mockTemplate)

      const result = await checklistsApi.updateTemplate('template-123', { name: 'Updated Name' })

      expect(apiClient.update).toHaveBeenCalledWith('checklist_templates', 'template-123', {
        name: 'Updated Name',
      })
      expect(result).toEqual(mockTemplate)
    })

    it('should throw error when template ID is missing', async () => {
      await expect(checklistsApi.updateTemplate('', { name: 'Test' })).rejects.toThrow(ApiErrorClass)
    })

    it('should handle API error', async () => {
      vi.mocked(apiClient.update).mockRejectedValue(new Error('Update failed'))

      await expect(
        checklistsApi.updateTemplate('template-123', { name: 'Test' })
      ).rejects.toThrow(ApiErrorClass)
    })
  })

  describe('deleteTemplate', () => {
    it('should delete template', async () => {
      vi.mocked(apiClient.delete).mockResolvedValue(undefined)

      await checklistsApi.deleteTemplate('template-123')

      expect(apiClient.delete).toHaveBeenCalledWith('checklist_templates', 'template-123')
    })

    it('should throw error when template ID is missing', async () => {
      await expect(checklistsApi.deleteTemplate('')).rejects.toThrow(ApiErrorClass)
    })

    it('should handle API error', async () => {
      vi.mocked(apiClient.delete).mockRejectedValue(new Error('Delete failed'))

      await expect(checklistsApi.deleteTemplate('template-123')).rejects.toThrow(ApiErrorClass)
    })
  })

  describe('duplicateTemplate', () => {
    it('should duplicate template with items', async () => {
      const originalTemplate = {
        ...createMockTemplate(),
        template_items: [createMockTemplateItem()],
      }
      const newTemplate = createMockTemplate({ id: 'new-template-123', name: 'Copy of Safety' })
      const newItem = createMockTemplateItem({ id: 'new-item-123', checklist_template_id: 'new-template-123' })

      // Mock getTemplateWithItems
      const mockChain = createMockSupabaseChain({ data: originalTemplate, error: null })
      vi.mocked(supabase.from).mockReturnValue(mockChain as never)

      // Mock createTemplate and createTemplateItem
      vi.mocked(apiClient.insert)
        .mockResolvedValueOnce(newTemplate)
        .mockResolvedValueOnce(newItem)

      const result = await checklistsApi.duplicateTemplate('template-123', 'Copy of Safety')

      expect(result).toEqual(newTemplate)
      expect(apiClient.insert).toHaveBeenCalledTimes(2)
    })

    it('should duplicate template without items', async () => {
      const originalTemplate = {
        ...createMockTemplate(),
        template_items: [],
      }
      const newTemplate = createMockTemplate({ id: 'new-template-123', name: 'Copy of Safety' })

      const mockChain = createMockSupabaseChain({ data: originalTemplate, error: null })
      vi.mocked(supabase.from).mockReturnValue(mockChain as never)

      vi.mocked(apiClient.insert).mockResolvedValueOnce(newTemplate)

      const result = await checklistsApi.duplicateTemplate('template-123', 'Copy of Safety')

      expect(result).toEqual(newTemplate)
      expect(apiClient.insert).toHaveBeenCalledTimes(1)
    })

    it('should handle error during duplication', async () => {
      const mockChain = createMockSupabaseChain({
        data: null,
        error: { message: 'Not found' },
      })
      vi.mocked(supabase.from).mockReturnValue(mockChain as never)

      await expect(
        checklistsApi.duplicateTemplate('invalid-id', 'Copy')
      ).rejects.toThrow(ApiErrorClass)
    })
  })

  // =============================================
  // CHECKLIST TEMPLATE ITEMS
  // =============================================

  describe('getTemplateItems', () => {
    it('should fetch template items', async () => {
      const mockItems = [createMockTemplateItem(), createMockTemplateItem({ id: 'item-456' })]
      const mockChain = createMockSupabaseChain({ data: mockItems, error: null })
      vi.mocked(supabase.from).mockReturnValue(mockChain as never)

      const result = await checklistsApi.getTemplateItems('template-123')

      expect(supabase.from).toHaveBeenCalledWith('checklist_template_items')
      expect(mockChain.eq).toHaveBeenCalledWith('checklist_template_id', 'template-123')
      expect(result).toEqual(mockItems)
    })

    it('should throw error when template ID is missing', async () => {
      await expect(checklistsApi.getTemplateItems('')).rejects.toThrow(ApiErrorClass)
    })

    it('should handle database error', async () => {
      const mockChain = createMockSupabaseChain({
        data: null,
        error: { message: 'Database error' },
      })
      vi.mocked(supabase.from).mockReturnValue(mockChain as never)

      await expect(checklistsApi.getTemplateItems('template-123')).rejects.toThrow(ApiErrorClass)
    })

    it('should return empty array when no items', async () => {
      const mockChain = createMockSupabaseChain({ data: null, error: null })
      vi.mocked(supabase.from).mockReturnValue(mockChain as never)

      const result = await checklistsApi.getTemplateItems('template-123')

      expect(result).toEqual([])
    })
  })

  describe('createTemplateItem', () => {
    it('should create template item', async () => {
      const mockItem = createMockTemplateItem()
      vi.mocked(apiClient.insert).mockResolvedValue(mockItem)

      const createData = {
        checklist_template_id: 'template-123',
        item_type: 'yes_no' as const,
        label: 'Is PPE worn correctly?',
        sort_order: 1,
        is_required: true,
      }

      const result = await checklistsApi.createTemplateItem(createData)

      expect(apiClient.insert).toHaveBeenCalledWith('checklist_template_items', createData)
      expect(result).toEqual(mockItem)
    })

    it('should throw error when template ID is missing', async () => {
      await expect(
        checklistsApi.createTemplateItem({
          checklist_template_id: '',
          item_type: 'yes_no',
          label: 'Test',
          sort_order: 1,
          is_required: true,
        })
      ).rejects.toThrow(ApiErrorClass)
    })

    it('should throw error when label is missing', async () => {
      await expect(
        checklistsApi.createTemplateItem({
          checklist_template_id: 'template-123',
          item_type: 'yes_no',
          label: '',
          sort_order: 1,
          is_required: true,
        })
      ).rejects.toThrow(ApiErrorClass)
    })

    it('should handle API error', async () => {
      vi.mocked(apiClient.insert).mockRejectedValue(new Error('Insert failed'))

      await expect(
        checklistsApi.createTemplateItem({
          checklist_template_id: 'template-123',
          item_type: 'yes_no',
          label: 'Test',
          sort_order: 1,
          is_required: true,
        })
      ).rejects.toThrow(ApiErrorClass)
    })
  })

  describe('updateTemplateItem', () => {
    it('should update template item', async () => {
      const mockItem = createMockTemplateItem({ label: 'Updated Label' })
      vi.mocked(apiClient.update).mockResolvedValue(mockItem)

      const result = await checklistsApi.updateTemplateItem('item-123', { label: 'Updated Label' })

      expect(apiClient.update).toHaveBeenCalledWith('checklist_template_items', 'item-123', {
        label: 'Updated Label',
      })
      expect(result).toEqual(mockItem)
    })

    it('should throw error when item ID is missing', async () => {
      await expect(
        checklistsApi.updateTemplateItem('', { label: 'Test' })
      ).rejects.toThrow(ApiErrorClass)
    })

    it('should handle API error', async () => {
      vi.mocked(apiClient.update).mockRejectedValue(new Error('Update failed'))

      await expect(
        checklistsApi.updateTemplateItem('item-123', { label: 'Test' })
      ).rejects.toThrow(ApiErrorClass)
    })
  })

  describe('deleteTemplateItem', () => {
    it('should delete template item', async () => {
      vi.mocked(apiClient.delete).mockResolvedValue(undefined)

      await checklistsApi.deleteTemplateItem('item-123')

      expect(apiClient.delete).toHaveBeenCalledWith('checklist_template_items', 'item-123')
    })

    it('should throw error when item ID is missing', async () => {
      await expect(checklistsApi.deleteTemplateItem('')).rejects.toThrow(ApiErrorClass)
    })

    it('should handle API error', async () => {
      vi.mocked(apiClient.delete).mockRejectedValue(new Error('Delete failed'))

      await expect(checklistsApi.deleteTemplateItem('item-123')).rejects.toThrow(ApiErrorClass)
    })
  })

  describe('reorderTemplateItems', () => {
    it('should reorder multiple items', async () => {
      const mockItem1 = createMockTemplateItem({ sort_order: 2 })
      const mockItem2 = createMockTemplateItem({ id: 'item-456', sort_order: 1 })
      vi.mocked(apiClient.update).mockResolvedValueOnce(mockItem1).mockResolvedValueOnce(mockItem2)

      const items = [
        { id: 'item-123', sort_order: 2 },
        { id: 'item-456', sort_order: 1 },
      ]

      await checklistsApi.reorderTemplateItems(items)

      expect(apiClient.update).toHaveBeenCalledTimes(2)
      expect(apiClient.update).toHaveBeenCalledWith('checklist_template_items', 'item-123', {
        sort_order: 2,
      })
      expect(apiClient.update).toHaveBeenCalledWith('checklist_template_items', 'item-456', {
        sort_order: 1,
      })
    })

    it('should handle empty array', async () => {
      await checklistsApi.reorderTemplateItems([])

      expect(apiClient.update).not.toHaveBeenCalled()
    })

    it('should handle error during reorder', async () => {
      vi.mocked(apiClient.update).mockRejectedValue(new Error('Update failed'))

      await expect(
        checklistsApi.reorderTemplateItems([{ id: 'item-123', sort_order: 1 }])
      ).rejects.toThrow(ApiErrorClass)
    })
  })

  // =============================================
  // CHECKLIST EXECUTIONS
  // =============================================

  describe('getExecutions', () => {
    it('should fetch all executions without filters', async () => {
      const mockExecutions = [createMockExecution(), createMockExecution({ id: 'execution-456' })]
      const mockChain = createMockSupabaseChain({ data: mockExecutions, error: null })
      vi.mocked(supabase.from).mockReturnValue(mockChain as never)

      const result = await checklistsApi.getExecutions()

      expect(supabase.from).toHaveBeenCalledWith('checklists')
      expect(mockChain.select).toHaveBeenCalledWith('*')
      expect(result).toEqual(mockExecutions)
    })

    it('should apply project_id filter', async () => {
      const mockChain = createMockSupabaseChain({ data: [], error: null })
      vi.mocked(supabase.from).mockReturnValue(mockChain as never)

      await checklistsApi.getExecutions({ project_id: 'project-123' })

      expect(mockChain.eq).toHaveBeenCalledWith('project_id', 'project-123')
    })

    it('should apply status filter', async () => {
      const mockChain = createMockSupabaseChain({ data: [], error: null })
      vi.mocked(supabase.from).mockReturnValue(mockChain as never)

      await checklistsApi.getExecutions({ status: 'in_progress' })

      expect(mockChain.eq).toHaveBeenCalledWith('status', 'in_progress')
    })

    it('should apply category filter', async () => {
      const mockChain = createMockSupabaseChain({ data: [], error: null })
      vi.mocked(supabase.from).mockReturnValue(mockChain as never)

      await checklistsApi.getExecutions({ category: 'safety' })

      expect(mockChain.eq).toHaveBeenCalledWith('category', 'safety')
    })

    it('should apply inspector_user_id filter', async () => {
      const mockChain = createMockSupabaseChain({ data: [], error: null })
      vi.mocked(supabase.from).mockReturnValue(mockChain as never)

      await checklistsApi.getExecutions({ inspector_user_id: 'user-123' })

      expect(mockChain.eq).toHaveBeenCalledWith('inspector_user_id', 'user-123')
    })

    it('should apply is_completed filter', async () => {
      const mockChain = createMockSupabaseChain({ data: [], error: null })
      vi.mocked(supabase.from).mockReturnValue(mockChain as never)

      await checklistsApi.getExecutions({ is_completed: true })

      expect(mockChain.eq).toHaveBeenCalledWith('is_completed', true)
    })

    it('should apply date_from filter', async () => {
      const mockChain = createMockSupabaseChain({ data: [], error: null })
      vi.mocked(supabase.from).mockReturnValue(mockChain as never)

      await checklistsApi.getExecutions({ date_from: '2024-01-01' })

      expect(mockChain.gte).toHaveBeenCalledWith('created_at', '2024-01-01')
    })

    it('should apply date_to filter', async () => {
      const mockChain = createMockSupabaseChain({ data: [], error: null })
      vi.mocked(supabase.from).mockReturnValue(mockChain as never)

      await checklistsApi.getExecutions({ date_to: '2024-12-31' })

      expect(mockChain.lte).toHaveBeenCalledWith('created_at', '2024-12-31')
    })

    it('should handle database error', async () => {
      const mockChain = createMockSupabaseChain({
        data: null,
        error: { message: 'Database error' },
      })
      vi.mocked(supabase.from).mockReturnValue(mockChain as never)

      await expect(checklistsApi.getExecutions()).rejects.toThrow(ApiErrorClass)
    })

    it('should return empty array when no data', async () => {
      const mockChain = createMockSupabaseChain({ data: null, error: null })
      vi.mocked(supabase.from).mockReturnValue(mockChain as never)

      const result = await checklistsApi.getExecutions()

      expect(result).toEqual([])
    })
  })

  describe('getExecution', () => {
    it('should fetch single execution by ID', async () => {
      const mockExecution = createMockExecution()
      vi.mocked(apiClient.selectOne).mockResolvedValue(mockExecution)

      const result = await checklistsApi.getExecution('execution-123')

      expect(apiClient.selectOne).toHaveBeenCalledWith('checklists', 'execution-123')
      expect(result).toEqual(mockExecution)
    })

    it('should throw error when execution ID is missing', async () => {
      await expect(checklistsApi.getExecution('')).rejects.toThrow(ApiErrorClass)
    })

    it('should handle API error', async () => {
      vi.mocked(apiClient.selectOne).mockRejectedValue(new Error('Not found'))

      await expect(checklistsApi.getExecution('invalid-id')).rejects.toThrow(ApiErrorClass)
    })
  })

  describe('getExecutionWithResponses', () => {
    it('should fetch execution with nested responses', async () => {
      const mockExecutionWithResponses = {
        ...createMockExecution(),
        responses: [createMockResponse(), createMockResponse({ id: 'response-456' })],
      }
      const mockChain = createMockSupabaseChain({ data: mockExecutionWithResponses, error: null })
      vi.mocked(supabase.from).mockReturnValue(mockChain as never)

      const result = await checklistsApi.getExecutionWithResponses('execution-123')

      expect(supabase.from).toHaveBeenCalledWith('checklists')
      expect(mockChain.select).toHaveBeenCalledWith(
        expect.stringContaining('responses:checklist_responses(*)')
      )
      expect(result).toEqual(mockExecutionWithResponses)
    })

    it('should throw error when execution ID is missing', async () => {
      await expect(checklistsApi.getExecutionWithResponses('')).rejects.toThrow(ApiErrorClass)
    })

    it('should throw error when execution not found', async () => {
      const mockChain = createMockSupabaseChain({ data: null, error: null })
      vi.mocked(supabase.from).mockReturnValue(mockChain as never)

      await expect(checklistsApi.getExecutionWithResponses('invalid-id')).rejects.toThrow(
        ApiErrorClass
      )
    })

    it('should handle database error', async () => {
      const mockChain = createMockSupabaseChain({
        data: null,
        error: { message: 'Database error' },
      })
      vi.mocked(supabase.from).mockReturnValue(mockChain as never)

      await expect(checklistsApi.getExecutionWithResponses('execution-123')).rejects.toThrow(
        ApiErrorClass
      )
    })
  })

  describe('createExecution', () => {
    it('should create new execution with defaults', async () => {
      const mockExecution = createMockExecution()
      vi.mocked(apiClient.insert).mockResolvedValue(mockExecution)

      const createData = {
        project_id: 'project-456',
        name: 'Morning Safety Check',
        checklist_template_id: 'template-123',
      }

      const result = await checklistsApi.createExecution(createData)

      expect(apiClient.insert).toHaveBeenCalledWith('checklists', {
        ...createData,
        status: 'draft',
        is_completed: false,
      })
      expect(result).toEqual(mockExecution)
    })

    it('should throw error when project ID is missing', async () => {
      await expect(
        checklistsApi.createExecution({ project_id: '', name: 'Test' })
      ).rejects.toThrow(ApiErrorClass)
    })

    it('should throw error when name is missing', async () => {
      await expect(
        checklistsApi.createExecution({ project_id: 'project-123', name: '' })
      ).rejects.toThrow(ApiErrorClass)
    })

    it('should handle API error', async () => {
      vi.mocked(apiClient.insert).mockRejectedValue(new Error('Insert failed'))

      await expect(
        checklistsApi.createExecution({ project_id: 'project-123', name: 'Test' })
      ).rejects.toThrow(ApiErrorClass)
    })
  })

  describe('updateExecution', () => {
    it('should update execution', async () => {
      const mockExecution = createMockExecution({ status: 'in_progress' })
      vi.mocked(apiClient.update).mockResolvedValue(mockExecution)

      const result = await checklistsApi.updateExecution('execution-123', { status: 'in_progress' })

      expect(apiClient.update).toHaveBeenCalledWith('checklists', 'execution-123', {
        status: 'in_progress',
      })
      expect(result).toEqual(mockExecution)
    })

    it('should throw error when execution ID is missing', async () => {
      await expect(
        checklistsApi.updateExecution('', { status: 'in_progress' })
      ).rejects.toThrow(ApiErrorClass)
    })

    it('should handle API error', async () => {
      vi.mocked(apiClient.update).mockRejectedValue(new Error('Update failed'))

      await expect(
        checklistsApi.updateExecution('execution-123', { status: 'in_progress' })
      ).rejects.toThrow(ApiErrorClass)
    })
  })

  describe('submitExecution', () => {
    it('should submit execution with timestamps', async () => {
      const mockExecution = createMockExecution({
        status: 'submitted',
        is_completed: true,
        submitted_at: expect.any(String),
        completed_at: expect.any(String),
      })
      vi.mocked(apiClient.update).mockResolvedValue(mockExecution)

      const result = await checklistsApi.submitExecution('execution-123')

      expect(apiClient.update).toHaveBeenCalledWith('checklists', 'execution-123', {
        status: 'submitted',
        is_completed: true,
        submitted_at: expect.any(String),
        completed_at: expect.any(String),
      })
      expect(result).toEqual(mockExecution)
    })

    it('should throw error when execution ID is missing', async () => {
      await expect(checklistsApi.submitExecution('')).rejects.toThrow(ApiErrorClass)
    })

    it('should handle API error', async () => {
      vi.mocked(apiClient.update).mockRejectedValue(new Error('Submit failed'))

      await expect(checklistsApi.submitExecution('execution-123')).rejects.toThrow(ApiErrorClass)
    })
  })

  describe('deleteExecution', () => {
    it('should delete execution', async () => {
      vi.mocked(apiClient.delete).mockResolvedValue(undefined)

      await checklistsApi.deleteExecution('execution-123')

      expect(apiClient.delete).toHaveBeenCalledWith('checklists', 'execution-123')
    })

    it('should throw error when execution ID is missing', async () => {
      await expect(checklistsApi.deleteExecution('')).rejects.toThrow(ApiErrorClass)
    })

    it('should handle API error', async () => {
      vi.mocked(apiClient.delete).mockRejectedValue(new Error('Delete failed'))

      await expect(checklistsApi.deleteExecution('execution-123')).rejects.toThrow(ApiErrorClass)
    })
  })

  // =============================================
  // CHECKLIST RESPONSES
  // =============================================

  describe('getResponses', () => {
    it('should fetch responses for execution', async () => {
      const mockResponses = [createMockResponse(), createMockResponse({ id: 'response-456' })]
      const mockChain = createMockSupabaseChain({ data: mockResponses, error: null })
      vi.mocked(supabase.from).mockReturnValue(mockChain as never)

      const result = await checklistsApi.getResponses('execution-123')

      expect(supabase.from).toHaveBeenCalledWith('checklist_responses')
      expect(mockChain.eq).toHaveBeenCalledWith('checklist_id', 'execution-123')
      expect(result).toEqual(mockResponses)
    })

    it('should throw error when execution ID is missing', async () => {
      await expect(checklistsApi.getResponses('')).rejects.toThrow(ApiErrorClass)
    })

    it('should handle database error', async () => {
      const mockChain = createMockSupabaseChain({
        data: null,
        error: { message: 'Database error' },
      })
      vi.mocked(supabase.from).mockReturnValue(mockChain as never)

      await expect(checklistsApi.getResponses('execution-123')).rejects.toThrow(ApiErrorClass)
    })

    it('should return empty array when no responses', async () => {
      const mockChain = createMockSupabaseChain({ data: null, error: null })
      vi.mocked(supabase.from).mockReturnValue(mockChain as never)

      const result = await checklistsApi.getResponses('execution-123')

      expect(result).toEqual([])
    })
  })

  describe('createResponse', () => {
    it('should create response', async () => {
      const mockResponse = createMockResponse()
      vi.mocked(apiClient.insert).mockResolvedValue(mockResponse)

      const createData = {
        checklist_id: 'execution-123',
        checklist_template_item_id: 'item-123',
        response_value: 'pass',
      }

      const result = await checklistsApi.createResponse(createData)

      expect(apiClient.insert).toHaveBeenCalledWith('checklist_responses', createData)
      expect(result).toEqual(mockResponse)
    })

    it('should throw error when execution ID is missing', async () => {
      await expect(
        checklistsApi.createResponse({
          checklist_id: '',
          checklist_template_item_id: 'item-123',
          response_value: 'pass',
        })
      ).rejects.toThrow(ApiErrorClass)
    })

    it('should handle API error', async () => {
      vi.mocked(apiClient.insert).mockRejectedValue(new Error('Insert failed'))

      await expect(
        checklistsApi.createResponse({
          checklist_id: 'execution-123',
          checklist_template_item_id: 'item-123',
          response_value: 'pass',
        })
      ).rejects.toThrow(ApiErrorClass)
    })
  })

  describe('updateResponse', () => {
    it('should update response', async () => {
      const mockResponse = createMockResponse({ response_value: 'fail' })
      vi.mocked(apiClient.update).mockResolvedValue(mockResponse)

      const result = await checklistsApi.updateResponse('response-123', { response_value: 'fail' })

      expect(apiClient.update).toHaveBeenCalledWith('checklist_responses', 'response-123', {
        response_value: 'fail',
      })
      expect(result).toEqual(mockResponse)
    })

    it('should throw error when response ID is missing', async () => {
      await expect(
        checklistsApi.updateResponse('', { response_value: 'pass' })
      ).rejects.toThrow(ApiErrorClass)
    })

    it('should handle API error', async () => {
      vi.mocked(apiClient.update).mockRejectedValue(new Error('Update failed'))

      await expect(
        checklistsApi.updateResponse('response-123', { response_value: 'pass' })
      ).rejects.toThrow(ApiErrorClass)
    })
  })

  describe('deleteResponse', () => {
    it('should delete response', async () => {
      const mockChain = createMockSupabaseChain({ data: null, error: null })
      vi.mocked(supabase.from).mockReturnValue(mockChain as never)

      await checklistsApi.deleteResponse('response-123')

      expect(supabase.from).toHaveBeenCalledWith('checklist_responses')
      expect(mockChain.delete).toHaveBeenCalled()
      expect(mockChain.eq).toHaveBeenCalledWith('id', 'response-123')
    })

    it('should throw error when response ID is missing', async () => {
      await expect(checklistsApi.deleteResponse('')).rejects.toThrow(ApiErrorClass)
    })

    it('should handle database error', async () => {
      const mockChain = createMockSupabaseChain({
        data: null,
        error: { message: 'Delete failed' },
      })
      vi.mocked(supabase.from).mockReturnValue(mockChain as never)

      await expect(checklistsApi.deleteResponse('response-123')).rejects.toThrow(ApiErrorClass)
    })
  })

  describe('batchCreateResponses', () => {
    it('should batch create responses', async () => {
      const mockResponses = [createMockResponse(), createMockResponse({ id: 'response-456' })]
      vi.mocked(apiClient.insertMany).mockResolvedValue(mockResponses)

      const responsesData = [
        { checklist_id: 'execution-123', checklist_template_item_id: 'item-1', response_value: 'pass' },
        { checklist_id: 'execution-123', checklist_template_item_id: 'item-2', response_value: 'fail' },
      ]

      const result = await checklistsApi.batchCreateResponses(responsesData)

      expect(apiClient.insertMany).toHaveBeenCalledWith('checklist_responses', responsesData)
      expect(result).toEqual(mockResponses)
    })

    it('should throw error when responses array is empty', async () => {
      await expect(checklistsApi.batchCreateResponses([])).rejects.toThrow(ApiErrorClass)
    })

    it('should handle API error', async () => {
      vi.mocked(apiClient.insertMany).mockRejectedValue(new Error('Batch insert failed'))

      await expect(
        checklistsApi.batchCreateResponses([
          { checklist_id: 'execution-123', checklist_template_item_id: 'item-1', response_value: 'pass' },
        ])
      ).rejects.toThrow(ApiErrorClass)
    })
  })

  // =============================================
  // SCORING & STATISTICS
  // =============================================

  describe('getExecutionScore', () => {
    it('should calculate execution score via RPC', async () => {
      const mockScore = {
        pass_count: 8,
        fail_count: 2,
        na_count: 1,
        total_count: 11,
        pass_percentage: 72.73,
      }
      const mockRpc = vi.fn().mockResolvedValue({ data: [mockScore], error: null })
      vi.mocked(supabase.from).mockReturnValue({ rpc: mockRpc } as never)
      // Also mock the rpc method directly on supabase
      ;(supabase as unknown as { rpc: typeof mockRpc }).rpc = mockRpc

      const result = await checklistsApi.getExecutionScore('execution-123')

      expect(mockRpc).toHaveBeenCalledWith('calculate_checklist_score', {
        checklist_uuid: 'execution-123',
      })
      expect(result).toEqual(mockScore)
    })

    it('should throw error when execution ID is missing', async () => {
      await expect(checklistsApi.getExecutionScore('')).rejects.toThrow(ApiErrorClass)
    })

    it('should return default scores when no data', async () => {
      const mockRpc = vi.fn().mockResolvedValue({ data: [], error: null })
      ;(supabase as unknown as { rpc: typeof mockRpc }).rpc = mockRpc

      const result = await checklistsApi.getExecutionScore('execution-123')

      expect(result).toEqual({
        pass_count: 0,
        fail_count: 0,
        na_count: 0,
        total_count: 0,
        pass_percentage: 0,
      })
    })

    it('should handle RPC error', async () => {
      const mockRpc = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'RPC failed' },
      })
      ;(supabase as unknown as { rpc: typeof mockRpc }).rpc = mockRpc

      await expect(checklistsApi.getExecutionScore('execution-123')).rejects.toThrow(ApiErrorClass)
    })

    it('should return default scores when data is null', async () => {
      const mockRpc = vi.fn().mockResolvedValue({ data: null, error: null })
      ;(supabase as unknown as { rpc: typeof mockRpc }).rpc = mockRpc

      const result = await checklistsApi.getExecutionScore('execution-123')

      expect(result).toEqual({
        pass_count: 0,
        fail_count: 0,
        na_count: 0,
        total_count: 0,
        pass_percentage: 0,
      })
    })
  })
})
