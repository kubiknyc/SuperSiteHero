/**
 * usePhotos Hooks Tests
 *
 * Note: These tests focus on hook behavior. Full integration testing
 * should be done via component tests or E2E tests.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { Photo, PhotoCollection, PhotoComparison } from '@/types/photo-management'

// Mock the API service - export functions directly as the module does
vi.mock('@/lib/api/services/photo-management', () => ({
  getPhotos: vi.fn().mockResolvedValue([]),
  getPhoto: vi.fn().mockResolvedValue(null),
  createPhoto: vi.fn().mockResolvedValue({}),
  updatePhoto: vi.fn().mockResolvedValue({}),
  deletePhoto: vi.fn().mockResolvedValue(undefined),
  getPhotoStats: vi.fn().mockResolvedValue({}),
  getFilterOptions: vi.fn().mockResolvedValue({}),
  getPhotosNearLocation: vi.fn().mockResolvedValue([]),
  getLocationClusters: vi.fn().mockResolvedValue([]),
  getPhotoAnnotations: vi.fn().mockResolvedValue([]),
  getPhotoAccessLogs: vi.fn().mockResolvedValue([]),
  createAnnotation: vi.fn().mockResolvedValue({}),
  deleteAnnotation: vi.fn().mockResolvedValue(undefined),
  linkPhotoToEntity: vi.fn().mockResolvedValue({}),
  unlinkPhotoFromEntity: vi.fn().mockResolvedValue(undefined),
  bulkDeletePhotos: vi.fn().mockResolvedValue(undefined),
  getCollections: vi.fn().mockResolvedValue([]),
  getCollection: vi.fn().mockResolvedValue(null),
  createCollection: vi.fn().mockResolvedValue({}),
  updateCollection: vi.fn().mockResolvedValue({}),
  deleteCollection: vi.fn().mockResolvedValue(undefined),
  getCollectionPhotos: vi.fn().mockResolvedValue([]),
  addPhotoToCollection: vi.fn().mockResolvedValue(undefined),
  removePhotoFromCollection: vi.fn().mockResolvedValue(undefined),
  reorderCollectionPhotos: vi.fn().mockResolvedValue(undefined),
  getComparisons: vi.fn().mockResolvedValue([]),
  getComparison: vi.fn().mockResolvedValue(null),
  createComparison: vi.fn().mockResolvedValue({}),
  completeComparison: vi.fn().mockResolvedValue({}),
  deleteComparison: vi.fn().mockResolvedValue(undefined),
}))

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

// Import after mocking
import {
  usePhotos,
  usePhoto,
  usePhotoStats,
  useCreatePhoto,
  useUpdatePhoto,
  useDeletePhoto,
  useCollections,
  useCollection,
  useCreateCollection,
  useComparisons,
  useCreateComparison,
} from './usePhotos'
import * as photoApi from '@/lib/api/services/photo-management'

const mockApi = vi.mocked(photoApi)

// Create a wrapper with QueryClient
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  })

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
  }
}

// Mock data factories
const createMockPhoto = (overrides: Partial<Photo> = {}): Photo => ({
  id: 'photo-123',
  projectId: 'project-123',
  fileName: 'test-photo.jpg',
  fileUrl: 'https://example.com/photo.jpg',
  thumbnailUrl: 'https://example.com/thumb.jpg',
  category: 'progress',
  createdAt: '2025-01-15T10:00:00Z',
  updatedAt: '2025-01-15T10:00:00Z',
  ...overrides,
})

const createMockCollection = (
  overrides: Partial<PhotoCollection> = {}
): PhotoCollection => ({
  id: 'collection-123',
  projectId: 'project-123',
  name: 'Test Collection',
  description: 'Test description',
  photoCount: 5,
  createdAt: '2025-01-15T10:00:00Z',
  updatedAt: '2025-01-15T10:00:00Z',
  ...overrides,
})

describe('Photo Query Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('usePhotos', () => {
    it('should call getPhotos with filters', async () => {
      const mockPhotos = [
        createMockPhoto({ id: '1' }),
        createMockPhoto({ id: '2' }),
      ]
      mockApi.getPhotos.mockResolvedValueOnce(mockPhotos)

      const { result } = renderHook(
        () => usePhotos({ projectId: 'project-123' }),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(mockApi.getPhotos).toHaveBeenCalledWith({
        projectId: 'project-123',
      })
      expect(result.current.data).toEqual(mockPhotos)
    })

    it('should fetch with empty filters when projectId is missing', async () => {
      // The hook doesn't require projectId - it will fetch with whatever filters provided
      mockApi.getPhotos.mockResolvedValueOnce([])

      const { result } = renderHook(() => usePhotos({}), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      // It still calls getPhotos, just with empty filters
      expect(mockApi.getPhotos).toHaveBeenCalledWith({})
    })
  })

  describe('usePhoto', () => {
    it('should fetch single photo by ID', async () => {
      const mockPhoto = createMockPhoto({ id: 'photo-123' })
      mockApi.getPhoto.mockResolvedValueOnce(mockPhoto)

      const { result } = renderHook(() => usePhoto('photo-123'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(mockApi.getPhoto).toHaveBeenCalledWith('photo-123')
      expect(result.current.data).toEqual(mockPhoto)
    })

    it('should not fetch when ID is empty', () => {
      const { result } = renderHook(() => usePhoto(''), {
        wrapper: createWrapper(),
      })

      expect(mockApi.getPhoto).not.toHaveBeenCalled()
    })
  })

  describe('usePhotoStats', () => {
    it('should fetch photo statistics', async () => {
      const mockStats = {
        totalPhotos: 100,
        byCategory: { progress: 50, issue: 30, safety: 20 },
        byMonth: [],
        storageUsed: 1024000,
        photosWithGps: 80,
      }
      mockApi.getPhotoStats.mockResolvedValueOnce(mockStats)

      const { result } = renderHook(() => usePhotoStats('project-123'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockStats)
    })
  })
})

describe('Photo Mutation Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('useCreatePhoto', () => {
    it('should call createPhoto', async () => {
      const newPhoto = createMockPhoto({ id: 'new-photo' })
      mockApi.createPhoto.mockResolvedValueOnce(newPhoto)

      const { result } = renderHook(() => useCreatePhoto(), {
        wrapper: createWrapper(),
      })

      await result.current.mutateAsync({
        projectId: 'project-123',
        fileName: 'new-photo.jpg',
        fileUrl: 'https://example.com/new.jpg',
        category: 'progress',
      })

      expect(mockApi.createPhoto).toHaveBeenCalled()
    })
  })

  describe('useUpdatePhoto', () => {
    it('should call updatePhoto', async () => {
      const updatedPhoto = createMockPhoto({ caption: 'Updated' })
      mockApi.updatePhoto.mockResolvedValueOnce(updatedPhoto)

      const { result } = renderHook(() => useUpdatePhoto(), {
        wrapper: createWrapper(),
      })

      await result.current.mutateAsync({
        id: 'photo-123',
        dto: { caption: 'Updated' },
      })

      expect(mockApi.updatePhoto).toHaveBeenCalledWith('photo-123', {
        caption: 'Updated',
      })
    })
  })

  describe('useDeletePhoto', () => {
    it('should call deletePhoto', async () => {
      mockApi.deletePhoto.mockResolvedValueOnce(undefined)

      const { result } = renderHook(() => useDeletePhoto(), {
        wrapper: createWrapper(),
      })

      await result.current.mutateAsync('photo-123')

      expect(mockApi.deletePhoto).toHaveBeenCalledWith('photo-123')
    })
  })
})

describe('Collection Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('useCollections', () => {
    it('should fetch collections', async () => {
      const mockCollections = [
        createMockCollection({ id: '1' }),
        createMockCollection({ id: '2' }),
      ]
      mockApi.getCollections.mockResolvedValueOnce(mockCollections)

      const { result } = renderHook(
        () => useCollections({ projectId: 'project-123' }),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockCollections)
    })
  })

  describe('useCollection', () => {
    it('should fetch single collection', async () => {
      const mockCollection = createMockCollection({ id: 'collection-123' })
      mockApi.getCollection.mockResolvedValueOnce(mockCollection)

      const { result } = renderHook(() => useCollection('collection-123'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockCollection)
    })
  })

  describe('useCreateCollection', () => {
    it('should call createCollection', async () => {
      const newCollection = createMockCollection({ id: 'new-collection' })
      mockApi.createCollection.mockResolvedValueOnce(newCollection)

      const { result } = renderHook(() => useCreateCollection(), {
        wrapper: createWrapper(),
      })

      await result.current.mutateAsync({
        projectId: 'project-123',
        name: 'New Collection',
      })

      expect(mockApi.createCollection).toHaveBeenCalled()
    })
  })
})

describe('Comparison Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('useComparisons', () => {
    it('should fetch comparisons', async () => {
      const mockComparisons = [
        {
          id: '1',
          projectId: 'project-123',
          beforePhotoId: 'photo-1',
          afterPhotoId: 'photo-2',
          title: 'Test',
          comparisonType: 'progress' as const,
          status: 'draft' as const,
          createdAt: '2025-01-15T10:00:00Z',
          updatedAt: '2025-01-15T10:00:00Z',
        },
      ]
      mockApi.getComparisons.mockResolvedValueOnce(mockComparisons)

      const { result } = renderHook(
        () => useComparisons({ projectId: 'project-123' }),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockComparisons)
    })
  })

  describe('useCreateComparison', () => {
    it('should call createComparison', async () => {
      const newComparison = {
        id: 'new-comparison',
        projectId: 'project-123',
        beforePhotoId: 'photo-1',
        afterPhotoId: 'photo-2',
        title: 'New Comparison',
        comparisonType: 'progress' as const,
        status: 'draft' as const,
        createdAt: '2025-01-15T10:00:00Z',
        updatedAt: '2025-01-15T10:00:00Z',
      }
      mockApi.createComparison.mockResolvedValueOnce(newComparison)

      const { result } = renderHook(() => useCreateComparison(), {
        wrapper: createWrapper(),
      })

      await result.current.mutateAsync({
        projectId: 'project-123',
        beforePhotoId: 'photo-1',
        afterPhotoId: 'photo-2',
        title: 'New Comparison',
        comparisonType: 'progress',
      })

      expect(mockApi.createComparison).toHaveBeenCalled()
    })
  })
})
