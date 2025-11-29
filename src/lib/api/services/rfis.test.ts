/**
 * RFIs API Service Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { rfisApi } from './rfis'
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

describe('rfisApi', () => {
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

  describe('getRFIWorkflowType', () => {
    const mockWorkflowType = {
      id: 'workflow-type-1',
      name_singular: 'RFI',
      prefix: 'RFI',
      company_id: 'company-1',
    }

    it('should fetch RFI workflow type for a company', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: mockWorkflowType, error: null }).then(onFulfilled)
      )

      const result = await rfisApi.getRFIWorkflowType('company-1')

      expect(result.id).toBe('workflow-type-1')
      expect(result.name_singular).toBe('RFI')
      expect(mockSupabaseChain.eq).toHaveBeenCalledWith('company_id', 'company-1')
      expect(mockSupabaseChain.ilike).toHaveBeenCalledWith('name_singular', 'RFI')
    })

    it('should throw error when RFI type not found', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: null, error: null }).then(onFulfilled)
      )

      await expect(rfisApi.getRFIWorkflowType('company-1')).rejects.toThrow(
        'RFI workflow type not configured for this company'
      )
    })

    it('should handle database errors gracefully', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: null, error: { message: 'Database error' } }).then(onFulfilled)
      )

      await expect(rfisApi.getRFIWorkflowType('company-1')).rejects.toThrow()
    })
  })

  describe('getProjectRFIs', () => {
    const mockRFIs = [
      {
        id: 'rfi-1',
        project_id: 'proj-1',
        workflow_type_id: 'workflow-type-1',
        title: 'Clarification on Foundation Specs',
        status: 'open',
        number: 1,
      },
      {
        id: 'rfi-2',
        project_id: 'proj-1',
        workflow_type_id: 'workflow-type-1',
        title: 'Electrical Panel Location',
        status: 'answered',
        number: 2,
      },
    ]

    it('should fetch all RFIs for a project', async () => {
      vi.mocked(apiClient.select).mockResolvedValue(mockRFIs)

      const result = await rfisApi.getProjectRFIs('proj-1', 'workflow-type-1')

      expect(result).toHaveLength(2)
      expect(result[0].id).toBe('rfi-1')
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
      vi.mocked(apiClient.select).mockResolvedValue(mockRFIs)

      await rfisApi.getProjectRFIs('proj-1', 'workflow-type-1', {
        filters: [{ column: 'status', operator: 'eq', value: 'open' }],
        orderBy: { column: 'number', ascending: true },
      })

      expect(apiClient.select).toHaveBeenCalledWith(
        'workflow_items',
        expect.objectContaining({
          filters: expect.arrayContaining([
            { column: 'status', operator: 'eq', value: 'open' },
            { column: 'project_id', operator: 'eq', value: 'proj-1' },
            { column: 'workflow_type_id', operator: 'eq', value: 'workflow-type-1' },
          ]),
          orderBy: { column: 'number', ascending: true },
        })
      )
    })

    it('should handle API client errors gracefully', async () => {
      vi.mocked(apiClient.select).mockRejectedValue(new Error('API error'))

      await expect(rfisApi.getProjectRFIs('proj-1', 'workflow-type-1')).rejects.toThrow()
    })
  })

  describe('getRFI', () => {
    const mockRFI = {
      id: 'rfi-1',
      project_id: 'proj-1',
      title: 'Clarification on Foundation Specs',
      status: 'open',
      number: 1,
    }

    it('should fetch a single RFI by ID', async () => {
      vi.mocked(apiClient.selectOne).mockResolvedValue(mockRFI)

      const result = await rfisApi.getRFI('rfi-1')

      expect(result.id).toBe('rfi-1')
      expect(result.title).toBe('Clarification on Foundation Specs')
      expect(apiClient.selectOne).toHaveBeenCalledWith('workflow_items', 'rfi-1')
    })

    it('should handle API client errors gracefully', async () => {
      vi.mocked(apiClient.selectOne).mockRejectedValue(new Error('Not found'))

      await expect(rfisApi.getRFI('nonexistent')).rejects.toThrow()
    })
  })

  describe('createRFI', () => {
    const createInput = {
      project_id: 'proj-1',
      workflow_type_id: 'workflow-type-1',
      title: 'New RFI Question',
      description: 'Need clarification on...',
      priority: 'normal',
      raised_by: 'user-1',
      created_by: 'user-1',
      assignees: ['user-2'],
    }

    const createdRFI = {
      id: 'rfi-new',
      ...createInput,
      number: 3,
      status: 'draft',
      created_at: '2025-01-27T10:00:00Z',
      updated_at: '2025-01-27T10:00:00Z',
    }

    it('should create a new RFI', async () => {
      // First call gets last item number
      mockSupabaseChain.then.mockImplementationOnce((onFulfilled) =>
        Promise.resolve({ data: { number: 2 }, error: null }).then(onFulfilled)
      )

      vi.mocked(apiClient.insert).mockResolvedValue(createdRFI)

      const result = await rfisApi.createRFI(createInput as any)

      expect(result.id).toBe('rfi-new')
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

    it('should start numbering at 1 when no previous RFIs exist', async () => {
      mockSupabaseChain.then.mockImplementationOnce((onFulfilled) =>
        Promise.resolve({ data: null, error: null }).then(onFulfilled)
      )

      vi.mocked(apiClient.insert).mockResolvedValue({ ...createdRFI, number: 1 })

      await rfisApi.createRFI(createInput as any)

      expect(apiClient.insert).toHaveBeenCalledWith(
        'workflow_items',
        expect.objectContaining({ number: 1 })
      )
    })

    it('should throw error when project_id is missing', async () => {
      const invalidInput = { ...createInput, project_id: '' } as any

      await expect(rfisApi.createRFI(invalidInput)).rejects.toThrow('Project ID is required')
    })

    it('should throw error when workflow_type_id is missing', async () => {
      const invalidInput = { ...createInput, workflow_type_id: '' } as any

      await expect(rfisApi.createRFI(invalidInput)).rejects.toThrow(
        'Workflow type ID is required'
      )
    })

    it('should throw error when title is missing', async () => {
      const invalidInput = { ...createInput, title: '' } as any

      await expect(rfisApi.createRFI(invalidInput)).rejects.toThrow('RFI title is required')
    })

    it('should handle database errors gracefully', async () => {
      // Mock getting last number succeeds
      mockSupabaseChain.then.mockImplementationOnce((onFulfilled) =>
        Promise.resolve({ data: { number: 2 }, error: null }).then(onFulfilled)
      )

      // But insert fails
      vi.mocked(apiClient).insert.mockRejectedValueOnce(new Error('Database error'))

      await expect(rfisApi.createRFI(createInput as any)).rejects.toThrow()
    })
  })

  describe('updateRFI', () => {
    const updatedRFI = {
      id: 'rfi-1',
      title: 'Updated RFI Title',
      status: 'in_review',
      priority: 'high',
    }

    it('should update an RFI', async () => {
      vi.mocked(apiClient.update).mockResolvedValue(updatedRFI)

      const result = await rfisApi.updateRFI('rfi-1', {
        title: 'Updated RFI Title',
        priority: 'high',
      })

      expect(result.title).toBe('Updated RFI Title')
      expect(result.priority).toBe('high')
      expect(apiClient.update).toHaveBeenCalledWith(
        'workflow_items',
        'rfi-1',
        expect.objectContaining({
          title: 'Updated RFI Title',
          priority: 'high',
        })
      )
    })

    it('should throw error when RFI ID is missing', async () => {
      await expect(rfisApi.updateRFI('', {})).rejects.toThrow('RFI ID is required')
    })

    it('should handle API client errors gracefully', async () => {
      vi.mocked(apiClient.update).mockRejectedValue(new Error('Update failed'))

      await expect(rfisApi.updateRFI('rfi-1', {})).rejects.toThrow()
    })
  })

  describe('deleteRFI', () => {
    it('should delete an RFI', async () => {
      vi.mocked(apiClient.delete).mockResolvedValue(undefined)

      await rfisApi.deleteRFI('rfi-1')

      expect(apiClient.delete).toHaveBeenCalledWith('workflow_items', 'rfi-1')
    })

    it('should throw error when RFI ID is missing', async () => {
      await expect(rfisApi.deleteRFI('')).rejects.toThrow('RFI ID is required')
    })

    it('should handle API client errors gracefully', async () => {
      vi.mocked(apiClient.delete).mockRejectedValue(new Error('Delete failed'))

      await expect(rfisApi.deleteRFI('rfi-1')).rejects.toThrow()
    })
  })

  describe('updateRFIStatus', () => {
    const updatedRFI = {
      id: 'rfi-1',
      status: 'answered',
      updated_at: '2025-01-27T10:00:00Z',
    }

    it('should update RFI status', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: updatedRFI, error: null }).then(onFulfilled)
      )

      const result = await rfisApi.updateRFIStatus('rfi-1', 'answered')

      expect(result.status).toBe('answered')
      expect(mockSupabaseChain.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'answered',
          updated_at: expect.any(String),
        })
      )
      expect(mockSupabaseChain.eq).toHaveBeenCalledWith('id', 'rfi-1')
    })

    it('should handle database errors gracefully', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: null, error: { message: 'Database error' } }).then(onFulfilled)
      )

      await expect(rfisApi.updateRFIStatus('rfi-1', 'answered')).rejects.toThrow()
    })
  })

  describe('answerRFI', () => {
    const answeredRFI = {
      id: 'rfi-1',
      resolution: 'This is the answer to the RFI',
      status: 'answered',
      updated_at: '2025-01-27T10:00:00Z',
    }

    it('should add an answer to an RFI', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: answeredRFI, error: null }).then(onFulfilled)
      )

      const result = await rfisApi.answerRFI('rfi-1', 'This is the answer to the RFI')

      expect(result.resolution).toBe('This is the answer to the RFI')
      expect(mockSupabaseChain.update).toHaveBeenCalledWith(
        expect.objectContaining({
          resolution: 'This is the answer to the RFI',
          updated_at: expect.any(String),
        })
      )
      expect(mockSupabaseChain.eq).toHaveBeenCalledWith('id', 'rfi-1')
    })

    it('should update status when provided', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: answeredRFI, error: null }).then(onFulfilled)
      )

      await rfisApi.answerRFI('rfi-1', 'This is the answer', 'answered')

      expect(mockSupabaseChain.update).toHaveBeenCalledWith(
        expect.objectContaining({
          resolution: 'This is the answer',
          status: 'answered',
          updated_at: expect.any(String),
        })
      )
    })

    it('should not update status when not provided', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: answeredRFI, error: null }).then(onFulfilled)
      )

      await rfisApi.answerRFI('rfi-1', 'This is the answer')

      expect(mockSupabaseChain.update).toHaveBeenCalledWith(
        expect.not.objectContaining({ status: expect.anything() })
      )
    })

    it('should handle database errors gracefully', async () => {
      mockSupabaseChain.then.mockImplementation((onFulfilled) =>
        Promise.resolve({ data: null, error: { message: 'Database error' } }).then(onFulfilled)
      )

      await expect(rfisApi.answerRFI('rfi-1', 'Answer')).rejects.toThrow()
    })
  })
})