// File: /src/lib/api/services/punch-lists.test.ts
// Test suite for punch lists API service

import { vi } from 'vitest'

// Note: describe, it, expect, beforeEach, afterEach are available as globals (vitest config has globals: true)
import { punchListsApi } from './punch-lists'
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

// Mock supabase for searchPunchItems (which uses supabase directly)
const mockSupabaseChain = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  is: vi.fn().mockReturnThis(),
  or: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockResolvedValue({ data: [], error: null }),
  single: vi.fn().mockResolvedValue({ data: null, error: null }),
}

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => mockSupabaseChain),
  },
}))

describe('punchListsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getPunchItemsByProject', () => {
    it('should fetch punch items for a project', async () => {
      const mockItems = [
        {
          id: '1',
          project_id: 'proj-1',
          title: 'Fix ceiling crack',
          status: 'open',
          priority: 'high',
          description: 'Ceiling drywall has a crack',
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
          deleted_at: null,
          trade: 'Drywall',
          building: 'A',
          floor: '3',
          room: '301',
          area: 'North wall',
          location_notes: null,
          due_date: null,
          number: null,
          subcontractor_id: null,
          assigned_to: null,
          completed_date: null,
          verified_date: null,
          marked_complete_by: null,
          marked_complete_at: null,
          verified_by: null,
          verified_at: null,
          rejection_notes: null,
          created_by: null,
        },
      ]

      vi.mocked(apiClientModule.apiClient.select).mockResolvedValue(mockItems)

      const result = await punchListsApi.getPunchItemsByProject('proj-1')

      expect(result).toEqual(mockItems)
      expect(apiClientModule.apiClient.select).toHaveBeenCalledWith(
        'punch_items',
        expect.objectContaining({
          filters: expect.arrayContaining([
            expect.objectContaining({ column: 'project_id', operator: 'eq', value: 'proj-1' }),
            expect.objectContaining({ column: 'deleted_at', operator: 'eq', value: null }),
          ]),
        })
      )
    })

    it('should throw error for missing project ID', async () => {
      await expect(punchListsApi.getPunchItemsByProject('')).rejects.toThrow('Project ID is required')
    })
  })

  describe('getPunchItem', () => {
    it('should fetch a single punch item', async () => {
      const mockItem = {
        id: '1',
        project_id: 'proj-1',
        title: 'Fix ceiling crack',
        status: 'open',
        priority: 'high',
        description: null,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
        deleted_at: null,
        trade: 'Drywall',
        building: null,
        floor: null,
        room: null,
        area: null,
        location_notes: null,
        due_date: null,
        number: null,
        subcontractor_id: null,
        assigned_to: null,
        completed_date: null,
        verified_date: null,
        marked_complete_by: null,
        marked_complete_at: null,
        verified_by: null,
        verified_at: null,
        rejection_notes: null,
        created_by: null,
      }

      vi.mocked(apiClientModule.apiClient.selectOne).mockResolvedValue(mockItem)

      const result = await punchListsApi.getPunchItem('1')

      expect(result).toEqual(mockItem)
      expect(apiClientModule.apiClient.selectOne).toHaveBeenCalledWith('punch_items', '1')
    })

    it('should throw error for missing item ID', async () => {
      await expect(punchListsApi.getPunchItem('')).rejects.toThrow('Punch item ID is required')
    })
  })

  describe('createPunchItem', () => {
    it('should create a new punch item', async () => {
      const newItem = {
        project_id: 'proj-1',
        title: 'New punch item',
        trade: 'Electrical',
        status: 'open',
        priority: 'normal',
        description: null,
        building: null,
        floor: null,
        room: null,
        area: null,
        location_notes: null,
        due_date: null,
        number: null,
        subcontractor_id: null,
        assigned_to: null,
        completed_date: null,
        verified_date: null,
        rejection_notes: null,
        created_by: null,
        created_at: null,
        deleted_at: null,
        marked_complete_by: null,
        marked_complete_at: null,
        verified_by: null,
        verified_at: null,
      }

      const createdItem = {
        ...newItem,
        id: '1',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      }

      vi.mocked(apiClientModule.apiClient.insert).mockResolvedValue(createdItem)

      const result = await punchListsApi.createPunchItem(newItem)

      expect(result).toEqual(createdItem)
    })

    it('should throw error for missing project ID', async () => {
      await expect(
        punchListsApi.createPunchItem({
          project_id: '',
          title: 'Test',
          trade: 'Test',
        } as any)
      ).rejects.toThrow('Project ID is required')
    })
  })

  describe('updatePunchItem', () => {
    it('should update a punch item', async () => {
      const updates = { status: 'completed', title: 'Updated' }
      const updatedItem = { id: '1', ...updates, created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z', project_id: 'proj-1', trade: 'Test' }

      vi.mocked(apiClientModule.apiClient.update).mockResolvedValue(updatedItem)

      const result = await punchListsApi.updatePunchItem('1', updates)

      expect(result).toEqual(updatedItem)
      expect(apiClientModule.apiClient.update).toHaveBeenCalledWith('punch_items', '1', updates)
    })

    it('should throw error for missing item ID', async () => {
      await expect(punchListsApi.updatePunchItem('', {})).rejects.toThrow('Punch item ID is required')
    })
  })

  describe('deletePunchItem', () => {
    it('should delete a punch item via soft delete', async () => {
      vi.mocked(apiClientModule.apiClient.update).mockResolvedValue({} as any)

      await punchListsApi.deletePunchItem('1')

      expect(apiClientModule.apiClient.update).toHaveBeenCalledWith(
        'punch_items',
        '1',
        expect.objectContaining({
          deleted_at: expect.any(String),
        })
      )
    })

    it('should throw error for missing item ID', async () => {
      await expect(punchListsApi.deletePunchItem('')).rejects.toThrow('Punch item ID is required')
    })
  })

  describe('updatePunchItemStatus', () => {
    it('should update status to completed with tracking', async () => {
      const updatedItem = {
        id: '1',
        status: 'completed',
        marked_complete_by: 'user-1',
        marked_complete_at: expect.any(String),
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
        project_id: 'proj-1',
        title: 'Test',
        trade: 'Test',
      }

      vi.mocked(apiClientModule.apiClient.update).mockResolvedValue(updatedItem as any)

      const result = await punchListsApi.updatePunchItemStatus('1', 'completed', 'user-1')

      expect(result).toEqual(updatedItem)
      expect(apiClientModule.apiClient.update).toHaveBeenCalledWith(
        'punch_items',
        '1',
        expect.objectContaining({
          status: 'completed',
          marked_complete_by: 'user-1',
        })
      )
    })

    it('should update status to verified with tracking', async () => {
      const updatedItem = {
        id: '1',
        status: 'verified',
        verified_by: 'user-1',
        verified_at: expect.any(String),
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
        project_id: 'proj-1',
        title: 'Test',
        trade: 'Test',
      }

      vi.mocked(apiClientModule.apiClient.update).mockResolvedValue(updatedItem as any)

      const result = await punchListsApi.updatePunchItemStatus('1', 'verified', 'user-1')

      expect(result).toEqual(updatedItem)
      expect(apiClientModule.apiClient.update).toHaveBeenCalledWith(
        'punch_items',
        '1',
        expect.objectContaining({
          status: 'verified',
          verified_by: 'user-1',
        })
      )
    })

    it('should throw error for missing item ID', async () => {
      await expect(punchListsApi.updatePunchItemStatus('', 'completed')).rejects.toThrow('Punch item ID is required')
    })
  })

  describe('searchPunchItems', () => {
    it('should search punch items by title', async () => {
      const mockItems = [
        {
          id: '1',
          project_id: 'proj-1',
          title: 'Fix ceiling crack',
          trade: 'Drywall',
          status: 'open',
          priority: 'high',
          description: null,
          number: null,
          area: null,
          due_date: null,
          building: null,
          floor: null,
          room: null,
        },
      ]

      // Configure supabase mock chain to return mock items
      mockSupabaseChain.limit.mockResolvedValueOnce({ data: mockItems, error: null })

      const result = await punchListsApi.searchPunchItems('proj-1', 'ceiling')

      expect(result).toEqual(mockItems)
    })

    it('should throw error for missing project ID', async () => {
      await expect(punchListsApi.searchPunchItems('', 'query')).rejects.toThrow('Project ID is required')
    })
  })
})
