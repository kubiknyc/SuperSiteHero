/**
 * Approval Workflows API Service Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { approvalWorkflowsApi } from './approval-workflows'

// Mock Supabase
const mockSupabaseChain = {
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: vi.fn().mockReturnThis(),
  order: vi.fn().mockResolvedValue({ data: [], error: null }),
}

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => mockSupabaseChain),
  },
}))

describe('approvalWorkflowsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset mock chain
    mockSupabaseChain.select.mockReturnThis()
    mockSupabaseChain.insert.mockReturnThis()
    mockSupabaseChain.update.mockReturnThis()
    mockSupabaseChain.delete.mockReturnThis()
    mockSupabaseChain.eq.mockReturnThis()
    mockSupabaseChain.single.mockReturnThis()
    mockSupabaseChain.order.mockResolvedValue({ data: [], error: null })
  })

  describe('getWorkflows', () => {
    const mockWorkflows = [
      {
        id: 'wf-1',
        name: 'Document Approval',
        description: 'Standard document approval process',
        company_id: 'comp-1',
        workflow_type: 'document',
        is_active: true,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
        steps: [
          {
            id: 'step-1',
            workflow_id: 'wf-1',
            step_order: 2,
            name: 'Final Review',
            approver_type: 'user',
            approver_ids: ['user-2'],
            required_approvals: 1,
            allow_delegation: false,
            auto_approve_after_days: null,
            created_at: '2025-01-01T00:00:00Z',
          },
          {
            id: 'step-2',
            workflow_id: 'wf-1',
            step_order: 1,
            name: 'Initial Review',
            approver_type: 'user',
            approver_ids: ['user-1'],
            required_approvals: 1,
            allow_delegation: true,
            auto_approve_after_days: 7,
            created_at: '2025-01-01T00:00:00Z',
          },
        ],
      },
    ]

    it('should fetch workflows for a company', async () => {
      mockSupabaseChain.order.mockResolvedValue({ data: mockWorkflows, error: null })

      const result = await approvalWorkflowsApi.getWorkflows({ company_id: 'comp-1' })

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Document Approval')
    })

    it('should sort steps by step_order', async () => {
      mockSupabaseChain.order.mockResolvedValue({ data: mockWorkflows, error: null })

      const result = await approvalWorkflowsApi.getWorkflows({ company_id: 'comp-1' })

      expect(result[0].steps![0].step_order).toBe(1)
      expect(result[0].steps![0].name).toBe('Initial Review')
      expect(result[0].steps![1].step_order).toBe(2)
      expect(result[0].steps![1].name).toBe('Final Review')
    })

    it('should throw error for missing company ID', async () => {
      await expect(approvalWorkflowsApi.getWorkflows({ company_id: '' }))
        .rejects.toThrow('Company ID is required')
    })

    it('should filter by workflow type', async () => {
      mockSupabaseChain.order.mockResolvedValue({ data: [], error: null })

      await approvalWorkflowsApi.getWorkflows({
        company_id: 'comp-1',
        workflow_type: 'submittal',
      })

      expect(mockSupabaseChain.eq).toHaveBeenCalledWith('workflow_type', 'submittal')
    })

    it('should filter by is_active status', async () => {
      mockSupabaseChain.order.mockResolvedValue({ data: [], error: null })

      await approvalWorkflowsApi.getWorkflows({
        company_id: 'comp-1',
        is_active: true,
      })

      expect(mockSupabaseChain.eq).toHaveBeenCalledWith('is_active', true)
    })
  })

  describe('getWorkflow', () => {
    const mockWorkflow = {
      id: 'wf-1',
      name: 'Document Approval',
      description: null,
      company_id: 'comp-1',
      workflow_type: 'document',
      is_active: true,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
      steps: [
        {
          id: 'step-1',
          workflow_id: 'wf-1',
          step_order: 1,
          name: 'Review',
          approver_type: 'user',
          approver_ids: ['user-1'],
          required_approvals: 1,
          allow_delegation: false,
          auto_approve_after_days: null,
          created_at: '2025-01-01T00:00:00Z',
        },
      ],
    }

    it('should fetch a single workflow', async () => {
      mockSupabaseChain.single.mockResolvedValue({ data: mockWorkflow, error: null })

      const result = await approvalWorkflowsApi.getWorkflow('wf-1')

      expect(result.id).toBe('wf-1')
      expect(result.name).toBe('Document Approval')
    })

    it('should throw error for missing workflow ID', async () => {
      await expect(approvalWorkflowsApi.getWorkflow(''))
        .rejects.toThrow('Workflow ID is required')
    })

    it('should throw error when workflow not found', async () => {
      mockSupabaseChain.single.mockResolvedValue({ data: null, error: null })

      await expect(approvalWorkflowsApi.getWorkflow('non-existent'))
        .rejects.toThrow('Approval workflow not found')
    })
  })

  describe('createWorkflow', () => {
    const createInput = {
      name: 'New Workflow',
      description: 'Test workflow',
      company_id: 'comp-1',
      workflow_type: 'rfi' as const,
      steps: [
        {
          step_order: 1,
          name: 'Step 1',
          approver_ids: ['user-1'],
        },
      ],
    }

    const createdWorkflow = {
      id: 'wf-new',
      name: 'New Workflow',
      description: 'Test workflow',
      company_id: 'comp-1',
      workflow_type: 'rfi',
      is_active: true,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
    }

    const createdSteps = [
      {
        id: 'step-new',
        workflow_id: 'wf-new',
        step_order: 1,
        name: 'Step 1',
        approver_type: 'user',
        approver_ids: ['user-1'],
        required_approvals: 1,
        allow_delegation: false,
        auto_approve_after_days: null,
        created_at: '2025-01-01T00:00:00Z',
      },
    ]

    it('should create a workflow with steps', async () => {
      mockSupabaseChain.single.mockResolvedValue({ data: createdWorkflow, error: null })
      mockSupabaseChain.select.mockResolvedValue({ data: createdSteps, error: null })

      const result = await approvalWorkflowsApi.createWorkflow(createInput)

      expect(result.id).toBe('wf-new')
      expect(result.name).toBe('New Workflow')
    })

    it('should throw error for missing company ID', async () => {
      await expect(approvalWorkflowsApi.createWorkflow({
        ...createInput,
        company_id: '',
      })).rejects.toThrow('Company ID is required')
    })

    it('should throw error for missing name', async () => {
      await expect(approvalWorkflowsApi.createWorkflow({
        ...createInput,
        name: '',
      })).rejects.toThrow('Workflow name is required')
    })

    it('should throw error for missing workflow type', async () => {
      await expect(approvalWorkflowsApi.createWorkflow({
        ...createInput,
        workflow_type: '' as any,
      })).rejects.toThrow('Workflow type is required')
    })

    it('should throw error for empty steps', async () => {
      await expect(approvalWorkflowsApi.createWorkflow({
        ...createInput,
        steps: [],
      })).rejects.toThrow('At least one approval step is required')
    })
  })

  describe('updateWorkflow', () => {
    it('should update workflow fields', async () => {
      const mockUpdatedWorkflow = {
        id: 'wf-1',
        name: 'Updated Name',
        description: 'Updated description',
        company_id: 'comp-1',
        workflow_type: 'document',
        is_active: true,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-02T00:00:00Z',
        steps: [],
      }

      mockSupabaseChain.eq.mockResolvedValue({ error: null })
      mockSupabaseChain.single.mockResolvedValue({ data: mockUpdatedWorkflow, error: null })

      const result = await approvalWorkflowsApi.updateWorkflow('wf-1', {
        name: 'Updated Name',
        description: 'Updated description',
      })

      expect(result.name).toBe('Updated Name')
    })

    it('should throw error for missing workflow ID', async () => {
      await expect(approvalWorkflowsApi.updateWorkflow('', { name: 'Test' }))
        .rejects.toThrow('Workflow ID is required')
    })
  })

  describe('deleteWorkflow', () => {
    it('should soft delete a workflow', async () => {
      mockSupabaseChain.eq.mockResolvedValue({ error: null })

      await approvalWorkflowsApi.deleteWorkflow('wf-1')

      expect(mockSupabaseChain.update).toHaveBeenCalledWith({ is_active: false })
    })

    it('should throw error for missing workflow ID', async () => {
      await expect(approvalWorkflowsApi.deleteWorkflow(''))
        .rejects.toThrow('Workflow ID is required')
    })
  })

  describe('duplicateWorkflow', () => {
    const existingWorkflow = {
      id: 'wf-1',
      name: 'Original',
      description: 'Original workflow',
      company_id: 'comp-1',
      workflow_type: 'document',
      is_active: true,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
      steps: [
        {
          id: 'step-1',
          workflow_id: 'wf-1',
          step_order: 1,
          name: 'Review',
          approver_type: 'user',
          approver_ids: ['user-1'],
          required_approvals: 1,
          allow_delegation: false,
          auto_approve_after_days: null,
          created_at: '2025-01-01T00:00:00Z',
        },
      ],
    }

    it('should throw error for missing workflow ID', async () => {
      await expect(approvalWorkflowsApi.duplicateWorkflow('', 'Copy'))
        .rejects.toThrow('Workflow ID is required')
    })

    it('should throw error for missing new name', async () => {
      mockSupabaseChain.single.mockResolvedValue({ data: existingWorkflow, error: null })

      await expect(approvalWorkflowsApi.duplicateWorkflow('wf-1', ''))
        .rejects.toThrow('New workflow name is required')
    })
  })

  describe('getActiveWorkflowsByType', () => {
    it('should fetch active workflows by type', async () => {
      const mockWorkflows = [
        {
          id: 'wf-1',
          name: 'Document Approval',
          company_id: 'comp-1',
          workflow_type: 'document',
          is_active: true,
          steps: [],
        },
      ]

      mockSupabaseChain.order.mockResolvedValue({ data: mockWorkflows, error: null })

      const result = await approvalWorkflowsApi.getActiveWorkflowsByType('comp-1', 'document')

      expect(result).toHaveLength(1)
      expect(mockSupabaseChain.eq).toHaveBeenCalledWith('workflow_type', 'document')
      expect(mockSupabaseChain.eq).toHaveBeenCalledWith('is_active', true)
    })
  })
})
