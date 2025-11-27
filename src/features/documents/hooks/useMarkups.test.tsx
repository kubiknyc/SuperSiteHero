// File: /src/features/documents/hooks/useMarkups.test.tsx
// Tests for document markups React Query hooks

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { markupsApi } from '@/lib/api/services/markups'
import {
  useDocumentMarkups,
  useMarkup,
  useCreateMarkup,
  useUpdateMarkup,
  useDeleteMarkup,
  useBatchCreateMarkups,
  useBatchDeleteMarkups,
} from './useMarkups'

// Mock the markups API
vi.mock('@/lib/api/services/markups', () => ({
  markupsApi: {
    getDocumentMarkups: vi.fn(),
    getMarkup: vi.fn(),
    createMarkup: vi.fn(),
    updateMarkup: vi.fn(),
    deleteMarkup: vi.fn(),
    batchCreateMarkups: vi.fn(),
    batchDeleteMarkups: vi.fn(),
  },
}))

// Mock the auth context
vi.mock('@/lib/auth/AuthContext', () => ({
  useAuth: () => ({
    userProfile: { id: 'user-1', email: 'test@example.com' },
  }),
}))

// Helper to create a wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('useMarkups Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('useDocumentMarkups', () => {
    it('should fetch markups for a document', async () => {
      const mockMarkups = [
        {
          id: 'markup-1',
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
          created_at: '2024-01-01T00:00:00Z',
          updated_at: null,
          deleted_at: null,
        },
      ]

      vi.mocked(markupsApi.getDocumentMarkups).mockResolvedValue(mockMarkups)

      const { result } = renderHook(() => useDocumentMarkups('doc-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(markupsApi.getDocumentMarkups).toHaveBeenCalledWith('doc-1', undefined)
      expect(result.current.data).toEqual(mockMarkups)
    })

    it('should fetch markups with page number filter', async () => {
      const mockMarkups = [
        {
          id: 'markup-1',
          document_id: 'doc-1',
          project_id: 'proj-1',
          page_number: 2,
          markup_type: 'rectangle' as const,
          markup_data: { x: 50, y: 50, width: 100, height: 100, stroke: '#00FF00', strokeWidth: 3 },
          is_shared: true,
          shared_with_roles: null,
          related_to_id: null,
          related_to_type: null,
          created_by: 'user-1',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: null,
          deleted_at: null,
        },
      ]

      vi.mocked(markupsApi.getDocumentMarkups).mockResolvedValue(mockMarkups)

      const { result } = renderHook(() => useDocumentMarkups('doc-1', 2), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(markupsApi.getDocumentMarkups).toHaveBeenCalledWith('doc-1', 2)
      expect(result.current.data).toEqual(mockMarkups)
    })

    it('should not fetch if documentId is undefined', () => {
      const { result } = renderHook(() => useDocumentMarkups(undefined), {
        wrapper: createWrapper(),
      })

      expect(markupsApi.getDocumentMarkups).not.toHaveBeenCalled()
      expect(result.current.data).toBeUndefined()
    })
  })

  describe('useMarkup', () => {
    it('should fetch a single markup', async () => {
      const mockMarkup = {
        id: 'markup-1',
        document_id: 'doc-1',
        project_id: 'proj-1',
        page_number: 1,
        markup_type: 'text' as const,
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

      vi.mocked(markupsApi.getMarkup).mockResolvedValue(mockMarkup)

      const { result } = renderHook(() => useMarkup('markup-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(markupsApi.getMarkup).toHaveBeenCalledWith('markup-1')
      expect(result.current.data).toEqual(mockMarkup)
    })

    it('should not fetch if markupId is undefined', () => {
      const { result } = renderHook(() => useMarkup(undefined), {
        wrapper: createWrapper(),
      })

      expect(markupsApi.getMarkup).not.toHaveBeenCalled()
      expect(result.current.data).toBeUndefined()
    })
  })

  describe('useCreateMarkup', () => {
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
      }

      const mockCreatedMarkup = {
        ...newMarkup,
        id: 'markup-1',
        created_by: 'user-1',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: null,
        deleted_at: null,
      }

      vi.mocked(markupsApi.createMarkup).mockResolvedValue(mockCreatedMarkup)

      const { result } = renderHook(() => useCreateMarkup(), {
        wrapper: createWrapper(),
      })

      result.current.mutate(newMarkup)

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(markupsApi.createMarkup).toHaveBeenCalledWith({
        ...newMarkup,
        created_by: 'user-1',
      })
      expect(result.current.data).toEqual(mockCreatedMarkup)
    })
  })

  describe('useUpdateMarkup', () => {
    it('should update an existing markup', async () => {
      const updates = {
        id: 'markup-1',
        markup_data: { x: 150, y: 150, stroke: '#00FF00', strokeWidth: 3 },
      }

      const mockUpdatedMarkup = {
        id: 'markup-1',
        document_id: 'doc-1',
        project_id: 'proj-1',
        page_number: 1,
        markup_type: 'arrow' as const,
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

      vi.mocked(markupsApi.updateMarkup).mockResolvedValue(mockUpdatedMarkup)

      const { result } = renderHook(() => useUpdateMarkup(), {
        wrapper: createWrapper(),
      })

      result.current.mutate(updates)

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(markupsApi.updateMarkup).toHaveBeenCalledWith('markup-1', {
        markup_data: { x: 150, y: 150, stroke: '#00FF00', strokeWidth: 3 },
      })
      expect(result.current.data).toEqual(mockUpdatedMarkup)
    })
  })

  describe('useDeleteMarkup', () => {
    it('should delete a markup', async () => {
      vi.mocked(markupsApi.deleteMarkup).mockResolvedValue(undefined)

      const { result } = renderHook(() => useDeleteMarkup(), {
        wrapper: createWrapper(),
      })

      result.current.mutate('markup-1')

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(markupsApi.deleteMarkup).toHaveBeenCalledWith('markup-1')
    })
  })

  describe('useBatchCreateMarkups', () => {
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
        },
      ]

      const mockCreatedMarkups = markups.map((m, i) => ({
        ...m,
        id: `markup-${i + 1}`,
        created_by: 'user-1',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: null,
        deleted_at: null,
      }))

      vi.mocked(markupsApi.batchCreateMarkups).mockResolvedValue(mockCreatedMarkups)

      const { result } = renderHook(() => useBatchCreateMarkups(), {
        wrapper: createWrapper(),
      })

      result.current.mutate(markups)

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(markupsApi.batchCreateMarkups).toHaveBeenCalledWith(
        markups.map(m => ({ ...m, created_by: 'user-1' }))
      )
      expect(result.current.data).toEqual(mockCreatedMarkups)
    })
  })

  describe('useBatchDeleteMarkups', () => {
    it('should delete multiple markups', async () => {
      vi.mocked(markupsApi.batchDeleteMarkups).mockResolvedValue(undefined)

      const { result } = renderHook(() => useBatchDeleteMarkups(), {
        wrapper: createWrapper(),
      })

      const markupIds = ['markup-1', 'markup-2']
      result.current.mutate(markupIds)

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(markupsApi.batchDeleteMarkups).toHaveBeenCalledWith(markupIds)
    })
  })
})
