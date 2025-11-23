// File: /src/lib/api/services/workflows.test.ts
// Test suite for workflows API service

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { workflowsApi } from './workflows'
import * as apiClientModule from '../client'

// Mock the API client
vi.mock('../client', () => ({
  apiClient: {
    select: vi.fn(),
    selectOne: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}))

describe('workflowsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getWorkflowItemsByProject', () => {
    it('should fetch workflow items for a project', async () => {
      const mockItems = [
        {
          id: '1',
          project_id: 'proj-1',
          workflow_type_id: 'rfi',
          title: 'RFI #1',
          status: 'open',
          priority: 'high',
          description: 'Test RFI',
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
          deleted_at: null,
          assignees: [],
          closed_date: null,
          cost_impact: null,
          discipline: null,
          due_date: null,
          more_information: null,
          number: null,
          opened_date: null,
          raised_by: null,
          reference_number: 'RFI-001',
          resolution: null,
          schedule_impact: null,
          created_by: null,
        },
      ]

      vi.mocked(apiClientModule.apiClient.select).mockResolvedValue(mockItems)

      const result = await workflowsApi.getWorkflowItemsByProject('proj-1')

      expect(result).toEqual(mockItems)
      expect(apiClientModule.apiClient.select).toHaveBeenCalledWith(
        'workflow_items',
        expect.objectContaining({
          filters: expect.arrayContaining([
            expect.objectContaining({ column: 'project_id', operator: 'eq', value: 'proj-1' }),
          ]),
        })
      )
    })

    it('should throw error for missing project ID', async () => {
      await expect(workflowsApi.getWorkflowItemsByProject('')).rejects.toThrow('Project ID is required')
    })

    it('should filter by workflow type if provided', async () => {
      vi.mocked(apiClientModule.apiClient.select).mockResolvedValue([])

      await workflowsApi.getWorkflowItemsByProject('proj-1', 'rfi')

      expect(apiClientModule.apiClient.select).toHaveBeenCalledWith(
        'workflow_items',
        expect.objectContaining({
          filters: expect.arrayContaining([
            expect.objectContaining({ column: 'workflow_type_id', operator: 'eq', value: 'rfi' }),
          ]),
        })
      )
    })
  })

  describe('getWorkflowItem', () => {
    it('should fetch a single workflow item', async () => {
      const mockItem = {
        id: '1',
        project_id: 'proj-1',
        workflow_type_id: 'rfi',
        title: 'RFI #1',
        status: 'open',
        priority: 'high',
        description: null,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
        deleted_at: null,
        assignees: [],
        closed_date: null,
        cost_impact: null,
        discipline: null,
        due_date: null,
        more_information: null,
        number: null,
        opened_date: null,
        raised_by: null,
        reference_number: null,
        resolution: null,
        schedule_impact: null,
        created_by: null,
      }

      vi.mocked(apiClientModule.apiClient.selectOne).mockResolvedValue(mockItem)

      const result = await workflowsApi.getWorkflowItem('1')

      expect(result).toEqual(mockItem)
      expect(apiClientModule.apiClient.selectOne).toHaveBeenCalledWith('workflow_items', '1')
    })

    it('should throw error for missing item ID', async () => {
      await expect(workflowsApi.getWorkflowItem('')).rejects.toThrow('Workflow item ID is required')
    })
  })

  describe('createWorkflowItem', () => {
    it('should create a new workflow item', async () => {
      const newItem = {
        project_id: 'proj-1',
        workflow_type_id: 'rfi',
        title: 'New RFI',
        status: 'open',
        priority: 'normal',
        description: null,
        assignees: null,
        closed_date: null,
        cost_impact: null,
        discipline: null,
        due_date: null,
        more_information: null,
        number: null,
        opened_date: null,
        raised_by: null,
        reference_number: null,
        resolution: null,
        schedule_impact: null,
        created_by: null,
        deleted_at: null,
      }

      const createdItem = { id: '1', created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z', ...newItem }

      vi.mocked(apiClientModule.apiClient.insert).mockResolvedValue(createdItem)

      const result = await workflowsApi.createWorkflowItem(newItem)

      expect(result).toEqual(createdItem)
      expect(apiClientModule.apiClient.insert).toHaveBeenCalledWith('workflow_items', expect.objectContaining(newItem))
    })

    it('should throw error for missing project ID', async () => {
      await expect(
        workflowsApi.createWorkflowItem({
          project_id: '',
          workflow_type_id: 'rfi',
          title: 'Test',
        } as any)
      ).rejects.toThrow('Project ID is required')
    })

    it('should throw error for missing workflow type ID', async () => {
      await expect(
        workflowsApi.createWorkflowItem({
          project_id: 'proj-1',
          workflow_type_id: '',
          title: 'Test',
        } as any)
      ).rejects.toThrow('Workflow type ID is required')
    })
  })

  describe('updateWorkflowItem', () => {
    it('should update a workflow item', async () => {
      const updates = { title: 'Updated Title', status: 'in_progress' }
      const updatedItem = { id: '1', ...updates, created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z', project_id: 'proj-1', workflow_type_id: 'rfi' }

      vi.mocked(apiClientModule.apiClient.update).mockResolvedValue(updatedItem)

      const result = await workflowsApi.updateWorkflowItem('1', updates)

      expect(result).toEqual(updatedItem)
      expect(apiClientModule.apiClient.update).toHaveBeenCalledWith('workflow_items', '1', updates)
    })

    it('should throw error for missing item ID', async () => {
      await expect(workflowsApi.updateWorkflowItem('', {})).rejects.toThrow('Workflow item ID is required')
    })
  })

  describe('deleteWorkflowItem', () => {
    it('should delete a workflow item', async () => {
      vi.mocked(apiClientModule.apiClient.delete).mockResolvedValue(undefined)

      await workflowsApi.deleteWorkflowItem('1')

      expect(apiClientModule.apiClient.delete).toHaveBeenCalledWith('workflow_items', '1')
    })

    it('should throw error for missing item ID', async () => {
      await expect(workflowsApi.deleteWorkflowItem('')).rejects.toThrow('Workflow item ID is required')
    })
  })

  describe('updateWorkflowItemStatus', () => {
    it('should update workflow item status', async () => {
      const updatedItem = { id: '1', status: 'approved', created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z', project_id: 'proj-1', workflow_type_id: 'rfi', title: 'Test' }

      vi.mocked(apiClientModule.apiClient.update).mockResolvedValue(updatedItem)

      const result = await workflowsApi.updateWorkflowItemStatus('1', 'approved')

      expect(result).toEqual(updatedItem)
      expect(apiClientModule.apiClient.update).toHaveBeenCalledWith('workflow_items', '1', { status: 'approved' })
    })

    it('should throw error for missing item ID', async () => {
      await expect(workflowsApi.updateWorkflowItemStatus('', 'approved')).rejects.toThrow('Workflow item ID is required')
    })
  })

  describe('getWorkflowTypes', () => {
    it('should fetch workflow types for a company', async () => {
      const mockTypes = [
        {
          id: 'rfi',
          company_id: 'comp-1',
          name_singular: 'RFI',
          name_plural: 'RFIs',
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
          deleted_at: null,
          prefix: 'RFI',
          is_default: true,
          is_active: true,
          is_custom: false,
          has_cost_impact: false,
          has_schedule_impact: false,
          requires_approval: false,
          statuses: null,
          priorities: null,
        },
      ]

      vi.mocked(apiClientModule.apiClient.select).mockResolvedValue(mockTypes)

      const result = await workflowsApi.getWorkflowTypes('comp-1')

      expect(result).toEqual(mockTypes)
    })

    it('should throw error for missing company ID', async () => {
      await expect(workflowsApi.getWorkflowTypes('')).rejects.toThrow('Company ID is required')
    })
  })

  describe('searchWorkflowItems', () => {
    it('should search workflow items by title', async () => {
      const mockItems = [
        {
          id: '1',
          title: 'RFI about roof',
          reference_number: 'RFI-001',
          description: 'Need clarification',
          project_id: 'proj-1',
          workflow_type_id: 'rfi',
          status: 'open',
          priority: 'high',
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
          deleted_at: null,
          assignees: [],
          closed_date: null,
          cost_impact: null,
          discipline: null,
          due_date: null,
          more_information: null,
          number: null,
          opened_date: null,
          raised_by: null,
          resolution: null,
          schedule_impact: null,
          created_by: null,
        },
      ]

      vi.mocked(apiClientModule.apiClient.select).mockResolvedValue(mockItems)

      const result = await workflowsApi.searchWorkflowItems('proj-1', 'roof')

      expect(result).toEqual(mockItems)
    })

    it('should throw error for missing project ID', async () => {
      await expect(workflowsApi.searchWorkflowItems('', 'query')).rejects.toThrow('Project ID is required')
    })
  })
})
