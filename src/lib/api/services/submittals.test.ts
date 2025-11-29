/**
 * Submittals API Service Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { submittalsApi } from './submittals'
import { apiClient } from '../client'

// Mock Supabase chain
const mockSupabaseChain = {
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  ilike: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  single: vi.fn().mockReturnThis(),
  then: vi.fn(function(this: any, onFulfilled: any) {
    return Promise.resolve({ data: [], error: null }).then(onFulfilled)
  }),
}

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => mockSupabaseChain),
  },
}))

vi.mock('../client', () => ({
  apiClient: {
    select: vi.fn(),
    selectOne: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}))

describe('submittalsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset Supabase mock chain
    mockSupabaseChain.select.mockReturnThis()
    mockSupabaseChain.insert.mockReturnThis()
    mockSupabaseChain.update.mockReturnThis()
    mockSupabaseChain.delete.mockReturnThis()
    mockSupabaseChain.eq.mockReturnThis()
    mockSupabaseChain.ilike.mockReturnThis()
    mockSupabaseChain.order.mockReturnThis()
    mockSupabaseChain.limit.mockReturnThis()
    mockSupabaseChain.single.mockReturnThis()
    mockSupabaseChain.then.mockImplementation(function(this: any, onFulfilled: any) {
      return Promise.resolve({ data: [], error: null }).then(onFulfilled)
    })
    // Reset API client mocks
    vi.mocked(apiClient).select.mockResolvedValue([])
    vi.mocked(apiClient).selectOne.mockResolvedValue({} as any)
    vi.mocked(apiClient).insert.mockResolvedValue({} as any)
    vi.mocked(apiClient).update.mockResolvedValue({} as any)
    vi.mocked(apiClient).delete.mockResolvedValue(undefined)
  })

  describe('getSubmittalWorkflowType', () => {
    const mockWorkflowType = {
      id: 'workflow-type-1',
      name_singular: 'Submittal',
      prefix: 'SUB',
      company_id: 'company-1',
    }

    it('should fetch Submittal workflow type for a company', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: mockWorkflowType, error: null }).then(onFulfilled)
      )

      const result = await submittalsApi.getSubmittalWorkflowType('company-1')

      expect(result.id).toBe('workflow-type-1')
      expect(result.name_singular).toBe('Submittal')
      expect(mockSupabaseChain.eq).toHaveBeenCalledWith('company_id', 'company-1')
      expect(mockSupabaseChain.ilike).toHaveBeenCalledWith('name_singular', 'Submittal')
    })

    it('should throw error when Submittal type not found', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: null, error: null }).then(onFulfilled)
      )

      await expect(submittalsApi.getSubmittalWorkflowType('company-1')).rejects.toThrow(
        'Submittal workflow type not configured for this company'
      )
    })

    it('should handle database errors gracefully', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: null, error: { message: 'Database error' } }).then(onFulfilled)
      )

      await expect(submittalsApi.getSubmittalWorkflowType('company-1')).rejects.toThrow()
    })
  })

  describe('getProjectSubmittals', () => {
    const mockSubmittals = [
      {
        id: 'submittal-1',
        project_id: 'proj-1',
        workflow_type_id: 'workflow-type-1',
        title: 'Structural Steel Submittal',
        status: 'submitted',
        number: 1,
      },
      {
        id: 'submittal-2',
        project_id: 'proj-1',
        workflow_type_id: 'workflow-type-1',
        title: 'HVAC Equipment Submittal',
        status: 'approved',
        number: 2,
      },
    ]

    it('should fetch all submittals for a project', async () => {
      vi.mocked(apiClient).select.mockResolvedValue(mockSubmittals)

      const result = await submittalsApi.getProjectSubmittals('proj-1', 'workflow-type-1')

      expect(result).toHaveLength(2)
      expect(result[0].id).toBe('submittal-1')
      expect(apiClient.select).toHaveBeenCalledWith(
        'workflow_items',
        expect.objectContaining({
          filters: expect.arrayContaining([
            { column: 'project_id', operator: 'eq', value: 'proj-1' },
            { column: 'workflow_type_id', operator: 'eq', value: 'workflow-type-1' },
          ]),
        })
      )
    })

    it('should apply custom query options', async () => {
      vi.mocked(apiClient).select.mockResolvedValue(mockSubmittals)

      await submittalsApi.getProjectSubmittals('proj-1', 'workflow-type-1', {
        filters: [{ column: 'status', operator: 'eq', value: 'submitted' }],
        orderBy: { column: 'number', ascending: true },
      })

      expect(apiClient.select).toHaveBeenCalledWith(
        'workflow_items',
        expect.objectContaining({
          filters: expect.arrayContaining([
            { column: 'status', operator: 'eq', value: 'submitted' },
            { column: 'project_id', operator: 'eq', value: 'proj-1' },
            { column: 'workflow_type_id', operator: 'eq', value: 'workflow-type-1' },
          ]),
          orderBy: { column: 'number', ascending: true },
        })
      )
    })

    it('should handle API client errors gracefully', async () => {
      vi.mocked(apiClient).select.mockRejectedValue(new Error('API error'))

      await expect(
        submittalsApi.getProjectSubmittals('proj-1', 'workflow-type-1')
      ).rejects.toThrow()
    })
  })

  describe('getSubmittal', () => {
    const mockSubmittal = {
      id: 'submittal-1',
      project_id: 'proj-1',
      title: 'Structural Steel Submittal',
      status: 'submitted',
      number: 1,
    }

    it('should fetch a single submittal by ID', async () => {
      vi.mocked(apiClient).selectOne.mockResolvedValue(mockSubmittal)

      const result = await submittalsApi.getSubmittal('submittal-1')

      expect(result.id).toBe('submittal-1')
      expect(result.title).toBe('Structural Steel Submittal')
      expect(apiClient.selectOne).toHaveBeenCalledWith('workflow_items', 'submittal-1')
    })

    it('should handle API client errors gracefully', async () => {
      vi.mocked(apiClient).selectOne.mockRejectedValue(new Error('Not found'))

      await expect(submittalsApi.getSubmittal('nonexistent')).rejects.toThrow()
    })
  })

  describe('createSubmittal', () => {
    const createInput = {
      project_id: 'proj-1',
      workflow_type_id: 'workflow-type-1',
      title: 'New Submittal',
      description: 'Need approval for...',
      priority: 'normal',
      raised_by: 'user-1',
      created_by: 'user-1',
      assignees: ['user-2'],
    }

    const createdSubmittal = {
      id: 'submittal-new',
      ...createInput,
      number: 3,
      status: 'draft',
      created_at: '2025-01-27T10:00:00Z',
      updated_at: '2025-01-27T10:00:00Z',
    }

    it('should create a new submittal', async () => {
      // First call gets last item number
      mockSupabaseChain.then.mockImplementationOnce((onFulfilled) =>
        Promise.resolve({ data: { number: 2 }, error: null }).then(onFulfilled)
      )

      vi.mocked(apiClient).insert.mockResolvedValue(createdSubmittal)

      const result = await submittalsApi.createSubmittal(createInput as any)

      expect(result.id).toBe('submittal-new')
      expect(result.number).toBe(3)
      expect(result.status).toBe('draft')
      expect(apiClient.insert).toHaveBeenCalledWith(
        'workflow_items',
        expect.objectContaining({
          ...createInput,
          number: 3,
          status: 'draft',
        })
      )
    })

    it('should start numbering at 1 when no previous submittals exist', async () => {
      mockSupabaseChain.then.mockImplementationOnce((onFulfilled) =>
        Promise.resolve({ data: null, error: null }).then(onFulfilled)
      )

      vi.mocked(apiClient).insert.mockResolvedValue({ ...createdSubmittal, number: 1 })

      await submittalsApi.createSubmittal(createInput as any)

      expect(apiClient.insert).toHaveBeenCalledWith(
        'workflow_items',
        expect.objectContaining({ number: 1 })
      )
    })

    it('should throw error when project_id is missing', async () => {
      const invalidInput = { ...createInput, project_id: '' } as any

      await expect(submittalsApi.createSubmittal(invalidInput)).rejects.toThrow(
        'Project ID is required'
      )
    })

    it('should throw error when workflow_type_id is missing', async () => {
      const invalidInput = { ...createInput, workflow_type_id: '' } as any

      await expect(submittalsApi.createSubmittal(invalidInput)).rejects.toThrow(
        'Workflow type ID is required'
      )
    })

    it('should throw error when title is missing', async () => {
      const invalidInput = { ...createInput, title: '' } as any

      await expect(submittalsApi.createSubmittal(invalidInput)).rejects.toThrow(
        'Submittal title is required'
      )
    })

    it('should handle database errors gracefully', async () => {
      // Mock getting last number succeeds
      mockSupabaseChain.then.mockImplementationOnce((onFulfilled) =>
        Promise.resolve({ data: { number: 2 }, error: null }).then(onFulfilled)
      )

      // But insert fails
      vi.mocked(apiClient).insert.mockRejectedValueOnce(new Error('Database error'))

      await expect(submittalsApi.createSubmittal(createInput as any)).rejects.toThrow()
    })
  })

  describe('updateSubmittal', () => {
    const updatedSubmittal = {
      id: 'submittal-1',
      title: 'Updated Submittal Title',
      status: 'reviewed',
      priority: 'high',
    }

    it('should update a submittal', async () => {
      vi.mocked(apiClient).update.mockResolvedValue(updatedSubmittal)

      const result = await submittalsApi.updateSubmittal('submittal-1', {
        title: 'Updated Submittal Title',
        priority: 'high',
      })

      expect(result.title).toBe('Updated Submittal Title')
      expect(result.priority).toBe('high')
      expect(apiClient.update).toHaveBeenCalledWith(
        'workflow_items',
        'submittal-1',
        expect.objectContaining({
          title: 'Updated Submittal Title',
          priority: 'high',
        })
      )
    })

    it('should handle API client errors gracefully', async () => {
      vi.mocked(apiClient).update.mockRejectedValue(new Error('Update failed'))

      await expect(submittalsApi.updateSubmittal('submittal-1', {})).rejects.toThrow()
    })
  })

  describe('deleteSubmittal', () => {
    it('should delete a submittal', async () => {
      vi.mocked(apiClient).delete.mockResolvedValue(undefined)

      await submittalsApi.deleteSubmittal('submittal-1')

      expect(apiClient.delete).toHaveBeenCalledWith('workflow_items', 'submittal-1')
    })

    it('should handle API client errors gracefully', async () => {
      vi.mocked(apiClient).delete.mockRejectedValue(new Error('Delete failed'))

      await expect(submittalsApi.deleteSubmittal('submittal-1')).rejects.toThrow()
    })
  })

  describe('updateSubmittalStatus', () => {
    const updatedSubmittal = {
      id: 'submittal-1',
      status: 'approved',
      updated_at: '2025-01-27T10:00:00Z',
    }

    it('should update submittal status', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: updatedSubmittal, error: null }).then(onFulfilled)
      )

      const result = await submittalsApi.updateSubmittalStatus('submittal-1', 'approved')

      expect(result.status).toBe('approved')
      expect(mockSupabaseChain.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'approved',
          updated_at: expect.any(String),
        })
      )
      expect(mockSupabaseChain.eq).toHaveBeenCalledWith('id', 'submittal-1')
    })

    it('should handle database errors gracefully', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: null, error: { message: 'Database error' } }).then(onFulfilled)
      )

      await expect(submittalsApi.updateSubmittalStatus('submittal-1', 'approved')).rejects.toThrow()
    })
  })

  describe('updateSubmittalProcurementStatus', () => {
    const updatedProcurement = {
      id: 'procurement-1',
      procurement_status: 'ordered',
      updated_at: '2025-01-27T10:00:00Z',
    }

    it('should update procurement status', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: updatedProcurement, error: null }).then(onFulfilled)
      )

      const result = await submittalsApi.updateSubmittalProcurementStatus('procurement-1', 'ordered')

      expect(result.procurement_status).toBe('ordered')
      expect(mockSupabaseChain.update).toHaveBeenCalledWith(
        expect.objectContaining({
          procurement_status: 'ordered',
          updated_at: expect.any(String),
        })
      )
      expect(mockSupabaseChain.eq).toHaveBeenCalledWith('id', 'procurement-1')
    })

    it('should handle database errors gracefully', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: null, error: { message: 'Database error' } }).then(onFulfilled)
      )

      await expect(
        submittalsApi.updateSubmittalProcurementStatus('procurement-1', 'ordered')
      ).rejects.toThrow()
    })
  })

  describe('createSubmittalProcurement', () => {
    const procurementInput = {
      submittal_id: 'submittal-1',
      vendor_id: 'vendor-1',
      procurement_status: 'pending',
      quantity: 100,
      unit_price: 50.00,
    }

    const createdProcurement = {
      id: 'procurement-new',
      ...procurementInput,
      created_at: '2025-01-27T10:00:00Z',
      updated_at: '2025-01-27T10:00:00Z',
    }

    it('should create a procurement record', async () => {
      vi.mocked(apiClient).insert.mockResolvedValue(createdProcurement)

      const result = await submittalsApi.createSubmittalProcurement(procurementInput as any)

      expect(result.id).toBe('procurement-new')
      expect(result.procurement_status).toBe('pending')
      expect(apiClient.insert).toHaveBeenCalledWith('submittal_procurement', procurementInput)
    })

    it('should handle API client errors gracefully', async () => {
      vi.mocked(apiClient).insert.mockRejectedValue(new Error('Insert failed'))

      await expect(
        submittalsApi.createSubmittalProcurement(procurementInput as any)
      ).rejects.toThrow()
    })
  })
})
