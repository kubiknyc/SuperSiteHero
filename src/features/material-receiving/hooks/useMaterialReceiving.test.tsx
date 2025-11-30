/**
 * useMaterialReceiving Hooks Tests
 *
 * Tests for React Query hooks for material receiving functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type {
  MaterialReceivedWithDetails,
  MaterialReceivedPhoto,
  MaterialReceivingStats,
} from '@/types/material-receiving'

// Mock the API service
vi.mock('@/lib/api/services/material-receiving', () => ({
  materialReceivingApi: {
    getMaterialReceipts: vi.fn().mockResolvedValue([]),
    getMaterialReceipt: vi.fn().mockResolvedValue(null),
    createMaterialReceipt: vi.fn().mockResolvedValue({}),
    updateMaterialReceipt: vi.fn().mockResolvedValue({}),
    deleteMaterialReceipt: vi.fn().mockResolvedValue(undefined),
    updateStatus: vi.fn().mockResolvedValue({}),
    updateCondition: vi.fn().mockResolvedValue({}),
    getPhotos: vi.fn().mockResolvedValue([]),
    addPhoto: vi.fn().mockResolvedValue({}),
    uploadPhoto: vi.fn().mockResolvedValue({}),
    updatePhoto: vi.fn().mockResolvedValue({}),
    deletePhoto: vi.fn().mockResolvedValue(undefined),
    getStats: vi.fn().mockResolvedValue({}),
    getVendors: vi.fn().mockResolvedValue([]),
    getStorageLocations: vi.fn().mockResolvedValue([]),
    linkToSubmittal: vi.fn().mockResolvedValue({}),
    unlinkFromSubmittal: vi.fn().mockResolvedValue({}),
  },
}))

// Mock toast
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}))

// Import after mocking
import {
  useMaterialReceipts,
  useMaterialReceipt,
  useMaterialPhotos,
  useMaterialReceivingStats,
  useMaterialVendors,
  useMaterialStorageLocations,
  useCreateMaterialReceipt,
  useUpdateMaterialReceipt,
  useDeleteMaterialReceipt,
  useUpdateMaterialStatus,
  useUpdateMaterialCondition,
  useUploadMaterialPhoto,
  useDeleteMaterialPhoto,
  useLinkToSubmittal,
  materialReceivingKeys,
} from './useMaterialReceiving'
import { materialReceivingApi } from '@/lib/api/services/material-receiving'

const mockApi = vi.mocked(materialReceivingApi)

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
const createMockMaterial = (overrides: Partial<MaterialReceivedWithDetails> = {}): MaterialReceivedWithDetails => ({
  id: 'mat-123',
  project_id: 'proj-456',
  delivery_date: '2025-01-15',
  delivery_time: '10:30',
  delivery_ticket_number: 'DT-001',
  material_description: 'Test Material',
  quantity: '100',
  unit: 'EA',
  vendor: 'Test Vendor',
  vendor_contact: 'Contact Person',
  submittal_procurement_id: null,
  daily_report_delivery_id: null,
  storage_location: 'Warehouse A',
  po_number: 'PO-001',
  received_by: 'user-123',
  inspected_by: null,
  inspected_at: null,
  condition: 'good',
  condition_notes: null,
  status: 'received',
  notes: null,
  created_at: '2025-01-15T10:30:00Z',
  updated_at: '2025-01-15T10:30:00Z',
  created_by: 'user-456',
  deleted_at: null,
  received_by_name: 'Jane Doe',
  received_by_email: 'jane@example.com',
  inspected_by_name: null,
  inspected_by_email: null,
  created_by_name: 'Admin',
  project_name: 'Test Project',
  project_number: 'TP-001',
  submittal_id: null,
  submittal_number: null,
  submittal_title: null,
  daily_report_id: null,
  daily_report_date: null,
  photo_count: 0,
  ...overrides,
})

const createMockPhoto = (overrides: Partial<MaterialReceivedPhoto> = {}): MaterialReceivedPhoto => ({
  id: 'photo-123',
  material_received_id: 'mat-123',
  photo_url: 'https://example.com/photo.jpg',
  thumbnail_url: 'https://example.com/thumb.jpg',
  caption: 'Test photo',
  photo_type: 'delivery',
  taken_at: '2025-01-15T10:30:00Z',
  taken_by: 'user-123',
  latitude: null,
  longitude: null,
  created_at: '2025-01-15T10:30:00Z',
  created_by: 'user-123',
  deleted_at: null,
  ...overrides,
})

const createMockStats = (): MaterialReceivingStats => ({
  total_deliveries: 50,
  this_week: 10,
  this_month: 25,
  pending_inspection: 5,
  with_issues: 3,
  by_status: {
    received: 15,
    inspected: 10,
    stored: 20,
    issued: 3,
    returned: 2,
  },
  by_condition: {
    good: 45,
    damaged: 2,
    partial: 2,
    rejected: 1,
  },
  unique_vendors: 12,
})

describe('materialReceivingKeys', () => {
  it('should generate correct query keys', () => {
    expect(materialReceivingKeys.all).toEqual(['material-receiving'])
    expect(materialReceivingKeys.lists()).toEqual(['material-receiving', 'list'])
    expect(materialReceivingKeys.detail('mat-123')).toEqual(['material-receiving', 'detail', 'mat-123'])
    expect(materialReceivingKeys.photos('mat-123')).toEqual(['material-receiving', 'photos', 'mat-123'])
    expect(materialReceivingKeys.stats('proj-456')).toEqual(['material-receiving', 'stats', 'proj-456'])
    expect(materialReceivingKeys.vendors('proj-456')).toEqual(['material-receiving', 'vendors', 'proj-456'])
    expect(materialReceivingKeys.storageLocations('proj-456')).toEqual(['material-receiving', 'storage-locations', 'proj-456'])
  })
})

describe('Query Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('useMaterialReceipts', () => {
    it('should fetch material receipts for a project', async () => {
      const mockMaterials = [createMockMaterial(), createMockMaterial({ id: 'mat-456' })]
      mockApi.getMaterialReceipts.mockResolvedValueOnce(mockMaterials)

      const { result } = renderHook(
        () => useMaterialReceipts({ projectId: 'proj-456' }),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockMaterials)
      expect(mockApi.getMaterialReceipts).toHaveBeenCalledWith({ projectId: 'proj-456' })
    })

    it('should not fetch when projectId is empty', () => {
      const { result } = renderHook(
        () => useMaterialReceipts({ projectId: '' }),
        { wrapper: createWrapper() }
      )

      expect(result.current.fetchStatus).toBe('idle')
      expect(mockApi.getMaterialReceipts).not.toHaveBeenCalled()
    })
  })

  describe('useMaterialReceipt', () => {
    it('should fetch a single material receipt', async () => {
      const mockMaterial = createMockMaterial()
      mockApi.getMaterialReceipt.mockResolvedValueOnce(mockMaterial)

      const { result } = renderHook(
        () => useMaterialReceipt('mat-123'),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockMaterial)
      expect(mockApi.getMaterialReceipt).toHaveBeenCalledWith('mat-123')
    })

    it('should not fetch when id is undefined', () => {
      const { result } = renderHook(
        () => useMaterialReceipt(undefined),
        { wrapper: createWrapper() }
      )

      expect(result.current.fetchStatus).toBe('idle')
      expect(mockApi.getMaterialReceipt).not.toHaveBeenCalled()
    })
  })

  describe('useMaterialPhotos', () => {
    it('should fetch photos for a material receipt', async () => {
      const mockPhotos = [createMockPhoto(), createMockPhoto({ id: 'photo-456' })]
      mockApi.getPhotos.mockResolvedValueOnce(mockPhotos)

      const { result } = renderHook(
        () => useMaterialPhotos('mat-123'),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockPhotos)
      expect(mockApi.getPhotos).toHaveBeenCalledWith('mat-123')
    })
  })

  describe('useMaterialReceivingStats', () => {
    it('should fetch stats for a project', async () => {
      const mockStats = createMockStats()
      mockApi.getStats.mockResolvedValueOnce(mockStats)

      const { result } = renderHook(
        () => useMaterialReceivingStats('proj-456'),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockStats)
      expect(mockApi.getStats).toHaveBeenCalledWith('proj-456')
    })
  })

  describe('useMaterialVendors', () => {
    it('should fetch unique vendors for a project', async () => {
      const mockVendors = ['ABC Supply', 'XYZ Materials', 'Test Vendor']
      mockApi.getVendors.mockResolvedValueOnce(mockVendors)

      const { result } = renderHook(
        () => useMaterialVendors('proj-456'),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockVendors)
      expect(mockApi.getVendors).toHaveBeenCalledWith('proj-456')
    })
  })

  describe('useMaterialStorageLocations', () => {
    it('should fetch unique storage locations for a project', async () => {
      const mockLocations = ['Warehouse A', 'Warehouse B', 'Yard']
      mockApi.getStorageLocations.mockResolvedValueOnce(mockLocations)

      const { result } = renderHook(
        () => useMaterialStorageLocations('proj-456'),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockLocations)
      expect(mockApi.getStorageLocations).toHaveBeenCalledWith('proj-456')
    })
  })
})

describe('Mutation Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('useCreateMaterialReceipt', () => {
    it('should create a material receipt', async () => {
      const newMaterial = createMockMaterial()
      mockApi.createMaterialReceipt.mockResolvedValueOnce(newMaterial)

      const { result } = renderHook(
        () => useCreateMaterialReceipt(),
        { wrapper: createWrapper() }
      )

      await result.current.mutateAsync({
        project_id: 'proj-456',
        delivery_date: '2025-01-15',
        material_description: 'New Material',
      })

      expect(mockApi.createMaterialReceipt).toHaveBeenCalledWith({
        project_id: 'proj-456',
        delivery_date: '2025-01-15',
        material_description: 'New Material',
      })
    })
  })

  describe('useUpdateMaterialReceipt', () => {
    it('should update a material receipt', async () => {
      const updatedMaterial = createMockMaterial({ material_description: 'Updated Material' })
      mockApi.updateMaterialReceipt.mockResolvedValueOnce(updatedMaterial)

      const { result } = renderHook(
        () => useUpdateMaterialReceipt(),
        { wrapper: createWrapper() }
      )

      await result.current.mutateAsync({
        id: 'mat-123',
        dto: { material_description: 'Updated Material' },
      })

      expect(mockApi.updateMaterialReceipt).toHaveBeenCalledWith('mat-123', {
        material_description: 'Updated Material',
      })
    })
  })

  describe('useDeleteMaterialReceipt', () => {
    it('should delete a material receipt', async () => {
      mockApi.deleteMaterialReceipt.mockResolvedValueOnce(undefined)

      const { result } = renderHook(
        () => useDeleteMaterialReceipt(),
        { wrapper: createWrapper() }
      )

      await result.current.mutateAsync({ id: 'mat-123', projectId: 'proj-456' })

      expect(mockApi.deleteMaterialReceipt).toHaveBeenCalledWith('mat-123')
    })
  })

  describe('useUpdateMaterialStatus', () => {
    it('should update material status', async () => {
      const updatedMaterial = createMockMaterial({ status: 'inspected' })
      mockApi.updateStatus.mockResolvedValueOnce(updatedMaterial)

      const { result } = renderHook(
        () => useUpdateMaterialStatus(),
        { wrapper: createWrapper() }
      )

      await result.current.mutateAsync({
        id: 'mat-123',
        status: 'inspected',
        inspectedBy: 'user-789',
      })

      expect(mockApi.updateStatus).toHaveBeenCalledWith('mat-123', 'inspected', 'user-789')
    })
  })

  describe('useUpdateMaterialCondition', () => {
    it('should update material condition', async () => {
      const updatedMaterial = createMockMaterial({ condition: 'damaged' })
      mockApi.updateCondition.mockResolvedValueOnce(updatedMaterial)

      const { result } = renderHook(
        () => useUpdateMaterialCondition(),
        { wrapper: createWrapper() }
      )

      await result.current.mutateAsync({
        id: 'mat-123',
        condition: 'damaged',
        notes: 'Box was crushed',
      })

      expect(mockApi.updateCondition).toHaveBeenCalledWith('mat-123', 'damaged', 'Box was crushed')
    })
  })

  describe('useUploadMaterialPhoto', () => {
    it('should upload a photo', async () => {
      const mockPhoto = createMockPhoto()
      mockApi.uploadPhoto.mockResolvedValueOnce(mockPhoto)

      const { result } = renderHook(
        () => useUploadMaterialPhoto(),
        { wrapper: createWrapper() }
      )

      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' })

      await result.current.mutateAsync({
        materialReceivedId: 'mat-123',
        file: mockFile,
        metadata: { caption: 'Test upload' },
      })

      expect(mockApi.uploadPhoto).toHaveBeenCalledWith('mat-123', mockFile, { caption: 'Test upload' })
    })
  })

  describe('useDeleteMaterialPhoto', () => {
    it('should delete a photo', async () => {
      mockApi.deletePhoto.mockResolvedValueOnce(undefined)

      const { result } = renderHook(
        () => useDeleteMaterialPhoto(),
        { wrapper: createWrapper() }
      )

      await result.current.mutateAsync({ id: 'photo-123', materialReceivedId: 'mat-123' })

      expect(mockApi.deletePhoto).toHaveBeenCalledWith('photo-123')
    })
  })

  describe('useLinkToSubmittal', () => {
    it('should link material to submittal', async () => {
      const linkedMaterial = createMockMaterial({ submittal_procurement_id: 'sub-789' })
      mockApi.linkToSubmittal.mockResolvedValueOnce(linkedMaterial)

      const { result } = renderHook(
        () => useLinkToSubmittal(),
        { wrapper: createWrapper() }
      )

      await result.current.mutateAsync({
        id: 'mat-123',
        submittalProcurementId: 'sub-789',
      })

      expect(mockApi.linkToSubmittal).toHaveBeenCalledWith('mat-123', 'sub-789')
    })
  })
})
