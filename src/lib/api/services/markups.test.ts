// File: /src/lib/api/services/markups.test.ts
// Tests for document markups API service

import { vi } from 'vitest'

// Note: describe, it, expect, beforeEach, afterEach are available as globals (vitest config has globals: true)
import { markupsApi } from './markups'
import { apiClient } from '../client'
import { ApiErrorClass } from '../errors'

// Mock the apiClient
vi.mock('../client', () => ({
  apiClient: {
    select: vi.fn(),
    selectOne: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    insertMany: vi.fn(),
  },
}))

// Mock Supabase for getDocumentMarkups
const mockSupabaseChain = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  is: vi.fn().mockReturnThis(),
  order: vi.fn().mockResolvedValue({ data: [], error: null }),
}

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => mockSupabaseChain),
  },
}))

describe('Markups API Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset supabase mock chain
    mockSupabaseChain.select.mockReturnThis()
    mockSupabaseChain.eq.mockReturnThis()
    mockSupabaseChain.is.mockReturnThis()
    mockSupabaseChain.order.mockResolvedValue({ data: [], error: null })
  })

  describe('getDocumentMarkups', () => {
    it('should fetch markups for a document', async () => {
      const mockMarkups = [
        {
          id: 'markup-1',
          document_id: 'doc-1',
          project_id: 'proj-1',
          page_number: 1,
          markup_type: 'arrow',
          markup_data: { x: 100, y: 100, stroke: '#FF0000', strokeWidth: 2 },
          is_shared: true,
          shared_with_roles: null,
          related_to_id: null,
          related_to_type: null,
          created_by: 'user-1',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: null,
          deleted_at: null,
          creator: { id: 'user-1', full_name: 'Test User', email: 'test@example.com' },
        },
      ]

      mockSupabaseChain.order.mockResolvedValue({ data: mockMarkups, error: null })

      const result = await markupsApi.getDocumentMarkups('doc-1')

      expect(result).toEqual(mockMarkups)
    })

    it('should filter markups by page number', async () => {
      const mockMarkups = [
        {
          id: 'markup-1',
          document_id: 'doc-1',
          project_id: 'proj-1',
          page_number: 2,
          markup_type: 'rectangle',
          markup_data: { x: 50, y: 50, width: 100, height: 100, stroke: '#00FF00', strokeWidth: 3 },
          is_shared: true,
          shared_with_roles: null,
          related_to_id: null,
          related_to_type: null,
          created_by: 'user-1',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: null,
          deleted_at: null,
          creator: null,
        },
      ]

      // Mock order to return chainable object that also resolves
      const chainable = {
        ...mockSupabaseChain,
        then: (resolve: Function) => resolve({ data: mockMarkups, error: null }),
      }
      mockSupabaseChain.order.mockReturnValue(chainable)

      const result = await markupsApi.getDocumentMarkups('doc-1', 2)

      expect(mockSupabaseChain.eq).toHaveBeenCalledWith('document_id', 'doc-1')
      expect(result).toEqual(mockMarkups)
    })

    it('should return empty array when no markups exist', async () => {
      mockSupabaseChain.order.mockResolvedValue({ data: [], error: null })

      const result = await markupsApi.getDocumentMarkups('doc-1')

      expect(result).toEqual([])
    })

    it('should throw error if document ID is missing', async () => {
      await expect(markupsApi.getDocumentMarkups('')).rejects.toThrow(ApiErrorClass)
    })
  })

  describe('getMarkup', () => {
    it('should fetch a single markup by ID', async () => {
      const mockMarkup = {
        id: 'markup-1',
        document_id: 'doc-1',
        project_id: 'proj-1',
        page_number: 1,
        markup_type: 'text',
        markup_data: { x: 100, y: 100, text: 'Note', fill: '#000000' },
        is_shared: true,
        shared_with_roles: null,
        related_to_id: null,
        related_to_type: null,
        created_by: 'user-1',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: null,
        deleted_at: null,
      }

      vi.mocked(apiClient.selectOne).mockResolvedValue(mockMarkup)

      const result = await markupsApi.getMarkup('markup-1')

      expect(apiClient.selectOne).toHaveBeenCalledWith('document_markups', 'markup-1')
      expect(result).toEqual(mockMarkup)
    })

    it('should throw error if markup ID is missing', async () => {
      await expect(markupsApi.getMarkup('')).rejects.toThrow(ApiErrorClass)
    })
  })

  describe('createMarkup', () => {
    it('should create a new markup', async () => {
      const newMarkup = {
        document_id: 'doc-1',
        project_id: 'proj-1',
        page_number: 1,
        markup_type: 'arrow' as const,
        markup_data: { x: 100, y: 100, stroke: '#FF0000', strokeWidth: 2 },
        is_shared: true,
        shared_with_roles: null,
        related_to_id: null,
        related_to_type: null,
        created_by: 'user-1',
      }

      const mockCreatedMarkup = {
        ...newMarkup,
        id: 'markup-1',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: null,
        deleted_at: null,
      }

      vi.mocked(apiClient.insert).mockResolvedValue(mockCreatedMarkup)

      const result = await markupsApi.createMarkup(newMarkup)

      expect(apiClient.insert).toHaveBeenCalledWith('document_markups', newMarkup)
      expect(result).toEqual(mockCreatedMarkup)
    })

    it('should throw error if document ID is missing', async () => {
      const invalidMarkup = {
        document_id: '',
        project_id: 'proj-1',
        page_number: 1,
        markup_type: 'arrow' as const,
        markup_data: { x: 100, y: 100, stroke: '#FF0000', strokeWidth: 2 },
        is_shared: true,
        shared_with_roles: null,
        related_to_id: null,
        related_to_type: null,
        created_by: 'user-1',
      }

      await expect(markupsApi.createMarkup(invalidMarkup)).rejects.toThrow(ApiErrorClass)
    })

    it('should throw error if project ID is missing', async () => {
      const invalidMarkup = {
        document_id: 'doc-1',
        project_id: '',
        page_number: 1,
        markup_type: 'arrow' as const,
        markup_data: { x: 100, y: 100, stroke: '#FF0000', strokeWidth: 2 },
        is_shared: true,
        shared_with_roles: null,
        related_to_id: null,
        related_to_type: null,
        created_by: 'user-1',
      }

      await expect(markupsApi.createMarkup(invalidMarkup)).rejects.toThrow(ApiErrorClass)
    })

    it('should throw error if markup type is missing', async () => {
      const invalidMarkup = {
        document_id: 'doc-1',
        project_id: 'proj-1',
        page_number: 1,
        markup_type: '' as any,
        markup_data: { x: 100, y: 100, stroke: '#FF0000', strokeWidth: 2 },
        is_shared: true,
        shared_with_roles: null,
        related_to_id: null,
        related_to_type: null,
        created_by: 'user-1',
      }

      await expect(markupsApi.createMarkup(invalidMarkup)).rejects.toThrow(ApiErrorClass)
    })

    it('should throw error if markup data is missing', async () => {
      const invalidMarkup = {
        document_id: 'doc-1',
        project_id: 'proj-1',
        page_number: 1,
        markup_type: 'arrow' as const,
        markup_data: null as any,
        is_shared: true,
        shared_with_roles: null,
        related_to_id: null,
        related_to_type: null,
        created_by: 'user-1',
      }

      await expect(markupsApi.createMarkup(invalidMarkup)).rejects.toThrow(ApiErrorClass)
    })
  })

  describe('updateMarkup', () => {
    it('should update an existing markup', async () => {
      const updates = {
        markup_data: { x: 150, y: 150, stroke: '#00FF00', strokeWidth: 3 },
      }

      const mockUpdatedMarkup = {
        id: 'markup-1',
        document_id: 'doc-1',
        project_id: 'proj-1',
        page_number: 1,
        markup_type: 'arrow',
        markup_data: { x: 150, y: 150, stroke: '#00FF00', strokeWidth: 3 },
        is_shared: true,
        shared_with_roles: null,
        related_to_id: null,
        related_to_type: null,
        created_by: 'user-1',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
        deleted_at: null,
      }

      vi.mocked(apiClient.update).mockResolvedValue(mockUpdatedMarkup)

      const result = await markupsApi.updateMarkup('markup-1', updates)

      expect(apiClient.update).toHaveBeenCalledWith('document_markups', 'markup-1', updates)
      expect(result).toEqual(mockUpdatedMarkup)
    })

    it('should throw error if markup ID is missing', async () => {
      await expect(markupsApi.updateMarkup('', {})).rejects.toThrow(ApiErrorClass)
    })
  })

  describe('deleteMarkup', () => {
    it('should soft delete a markup', async () => {
      vi.mocked(apiClient.delete).mockResolvedValue(undefined)

      await markupsApi.deleteMarkup('markup-1')

      expect(apiClient.delete).toHaveBeenCalledWith('document_markups', 'markup-1')
    })

    it('should throw error if markup ID is missing', async () => {
      await expect(markupsApi.deleteMarkup('')).rejects.toThrow(ApiErrorClass)
    })
  })

  describe('batchCreateMarkups', () => {
    it('should create multiple markups', async () => {
      const markups = [
        {
          document_id: 'doc-1',
          project_id: 'proj-1',
          page_number: 1,
          markup_type: 'arrow' as const,
          markup_data: { x: 100, y: 100, stroke: '#FF0000', strokeWidth: 2 },
          is_shared: true,
          shared_with_roles: null,
          related_to_id: null,
          related_to_type: null,
          created_by: 'user-1',
        },
        {
          document_id: 'doc-1',
          project_id: 'proj-1',
          page_number: 1,
          markup_type: 'rectangle' as const,
          markup_data: { x: 200, y: 200, width: 100, height: 100, stroke: '#00FF00', strokeWidth: 2 },
          is_shared: true,
          shared_with_roles: null,
          related_to_id: null,
          related_to_type: null,
          created_by: 'user-1',
        },
      ]

      const mockCreatedMarkups = markups.map((m, i) => ({
        ...m,
        id: `markup-${i + 1}`,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: null,
        deleted_at: null,
      }))

      vi.mocked(apiClient.insertMany).mockResolvedValue(mockCreatedMarkups)

      const result = await markupsApi.batchCreateMarkups(markups)

      expect(apiClient.insertMany).toHaveBeenCalledWith('document_markups', markups)
      expect(result).toEqual(mockCreatedMarkups)
    })

    it('should throw error if markups array is empty', async () => {
      await expect(markupsApi.batchCreateMarkups([])).rejects.toThrow(ApiErrorClass)
    })

    it('should throw error if any markup is missing required fields', async () => {
      const invalidMarkups = [
        {
          document_id: '',
          project_id: 'proj-1',
          page_number: 1,
          markup_type: 'arrow' as const,
          markup_data: { x: 100, y: 100, stroke: '#FF0000', strokeWidth: 2 },
          is_shared: true,
          shared_with_roles: null,
          related_to_id: null,
          related_to_type: null,
          created_by: 'user-1',
        },
      ]

      await expect(markupsApi.batchCreateMarkups(invalidMarkups)).rejects.toThrow(ApiErrorClass)
    })
  })

  describe('batchDeleteMarkups', () => {
    it('should delete multiple markups', async () => {
      vi.mocked(apiClient.delete).mockResolvedValue(undefined)

      await markupsApi.batchDeleteMarkups(['markup-1', 'markup-2'])

      expect(apiClient.delete).toHaveBeenCalledTimes(2)
      expect(apiClient.delete).toHaveBeenCalledWith('document_markups', 'markup-1')
      expect(apiClient.delete).toHaveBeenCalledWith('document_markups', 'markup-2')
    })

    it('should throw error if markup IDs array is empty', async () => {
      await expect(markupsApi.batchDeleteMarkups([])).rejects.toThrow(ApiErrorClass)
    })
  })
})
