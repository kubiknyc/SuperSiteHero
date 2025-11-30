/**
 * Client Portal Hooks Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { createWrapper } from '@/__tests__/utils/TestProviders'
import {
  useClientProjects,
  useClientProject,
  useClientDashboardStats,
  useClientPortalSettings,
  useClientRFIs,
  useClientChangeOrders,
  useClientDocuments,
  useClientPhotos,
  useClientSchedule,
  clientPortalKeys,
} from './useClientPortal'

// Mock the API service
vi.mock('@/lib/api/services/client-portal', () => ({
  clientPortalApi: {
    getClientProjects: vi.fn(),
    getClientProject: vi.fn(),
    getClientDashboardStats: vi.fn(),
    getPortalSettings: vi.fn(),
    updatePortalSettings: vi.fn(),
    getClientRFIs: vi.fn(),
    getClientChangeOrders: vi.fn(),
    getClientDocuments: vi.fn(),
    getClientPhotos: vi.fn(),
    getClientSchedule: vi.fn(),
    inviteClient: vi.fn(),
  },
}))

import { clientPortalApi } from '@/lib/api/services/client-portal'

describe('Client Portal Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ============================================
  // Query Keys
  // ============================================

  describe('clientPortalKeys', () => {
    it('should generate correct keys for all endpoints', () => {
      expect(clientPortalKeys.all).toEqual(['client-portal'])
      expect(clientPortalKeys.projects()).toEqual(['client-portal', 'projects'])
      expect(clientPortalKeys.project('proj-1')).toEqual(['client-portal', 'project', 'proj-1'])
      expect(clientPortalKeys.stats()).toEqual(['client-portal', 'stats'])
      expect(clientPortalKeys.settings('proj-1')).toEqual(['client-portal', 'settings', 'proj-1'])
      expect(clientPortalKeys.rfis('proj-1')).toEqual(['client-portal', 'rfis', 'proj-1'])
      expect(clientPortalKeys.changeOrders('proj-1')).toEqual(['client-portal', 'change-orders', 'proj-1'])
      expect(clientPortalKeys.documents('proj-1')).toEqual(['client-portal', 'documents', 'proj-1'])
      expect(clientPortalKeys.photos('proj-1')).toEqual(['client-portal', 'photos', 'proj-1'])
      expect(clientPortalKeys.schedule('proj-1')).toEqual(['client-portal', 'schedule', 'proj-1'])
    })
  })

  // ============================================
  // useClientProjects
  // ============================================

  describe('useClientProjects', () => {
    it('should fetch projects successfully', async () => {
      const mockProjects = [
        { id: 'proj-1', name: 'Project 1' },
        { id: 'proj-2', name: 'Project 2' },
      ]
      vi.mocked(clientPortalApi.getClientProjects).mockResolvedValue(mockProjects)

      const { result } = renderHook(() => useClientProjects(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual(mockProjects)
      expect(clientPortalApi.getClientProjects).toHaveBeenCalledTimes(1)
    })

    it('should handle fetch error', async () => {
      vi.mocked(clientPortalApi.getClientProjects).mockRejectedValue(new Error('Fetch failed'))

      const { result } = renderHook(() => useClientProjects(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(result.current.error).toBeDefined()
    })
  })

  // ============================================
  // useClientProject
  // ============================================

  describe('useClientProject', () => {
    it('should fetch a single project', async () => {
      const mockProject = { id: 'proj-1', name: 'Test Project' }
      vi.mocked(clientPortalApi.getClientProject).mockResolvedValue(mockProject)

      const { result } = renderHook(() => useClientProject('proj-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual(mockProject)
      expect(clientPortalApi.getClientProject).toHaveBeenCalledWith('proj-1')
    })

    it('should not fetch when projectId is undefined', () => {
      const { result } = renderHook(() => useClientProject(undefined), {
        wrapper: createWrapper(),
      })

      expect(result.current.isLoading).toBe(false)
      expect(result.current.fetchStatus).toBe('idle')
      expect(clientPortalApi.getClientProject).not.toHaveBeenCalled()
    })
  })

  // ============================================
  // useClientDashboardStats
  // ============================================

  describe('useClientDashboardStats', () => {
    it('should fetch dashboard stats', async () => {
      const mockStats = {
        total_projects: 5,
        active_projects: 3,
        completed_projects: 2,
        open_rfis: 10,
        pending_change_orders: 4,
        upcoming_milestones: 6,
      }
      vi.mocked(clientPortalApi.getClientDashboardStats).mockResolvedValue(mockStats)

      const { result } = renderHook(() => useClientDashboardStats(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual(mockStats)
    })
  })

  // ============================================
  // useClientPortalSettings
  // ============================================

  describe('useClientPortalSettings', () => {
    it('should fetch portal settings', async () => {
      const mockSettings = {
        id: 'settings-1',
        project_id: 'proj-1',
        show_budget: false,
        show_schedule: true,
      }
      vi.mocked(clientPortalApi.getPortalSettings).mockResolvedValue(mockSettings)

      const { result } = renderHook(() => useClientPortalSettings('proj-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual(mockSettings)
    })

    it('should not fetch when projectId is undefined', () => {
      const { result } = renderHook(() => useClientPortalSettings(undefined), {
        wrapper: createWrapper(),
      })

      expect(result.current.fetchStatus).toBe('idle')
    })
  })

  // ============================================
  // useClientRFIs
  // ============================================

  describe('useClientRFIs', () => {
    it('should fetch RFIs for a project', async () => {
      const mockRFIs = [
        { id: 'rfi-1', title: 'RFI 1', status: 'open' },
        { id: 'rfi-2', title: 'RFI 2', status: 'closed' },
      ]
      vi.mocked(clientPortalApi.getClientRFIs).mockResolvedValue(mockRFIs)

      const { result } = renderHook(() => useClientRFIs('proj-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual(mockRFIs)
      expect(clientPortalApi.getClientRFIs).toHaveBeenCalledWith('proj-1')
    })

    it('should not fetch when disabled', () => {
      const { result } = renderHook(() => useClientRFIs('proj-1', { enabled: false }), {
        wrapper: createWrapper(),
      })

      expect(result.current.fetchStatus).toBe('idle')
    })
  })

  // ============================================
  // useClientChangeOrders
  // ============================================

  describe('useClientChangeOrders', () => {
    it('should fetch change orders for a project', async () => {
      const mockCOs = [
        { id: 'co-1', title: 'CO 1', status: 'approved' },
        { id: 'co-2', title: 'CO 2', status: 'pending' },
      ]
      vi.mocked(clientPortalApi.getClientChangeOrders).mockResolvedValue(mockCOs)

      const { result } = renderHook(() => useClientChangeOrders('proj-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual(mockCOs)
    })

    it('should not fetch when projectId is undefined', () => {
      const { result } = renderHook(() => useClientChangeOrders(undefined), {
        wrapper: createWrapper(),
      })

      expect(result.current.fetchStatus).toBe('idle')
    })
  })

  // ============================================
  // useClientDocuments
  // ============================================

  describe('useClientDocuments', () => {
    it('should fetch documents for a project', async () => {
      const mockDocs = [
        { id: 'doc-1', name: 'Document 1', category: 'drawing' },
        { id: 'doc-2', name: 'Document 2', category: 'submittal' },
      ]
      vi.mocked(clientPortalApi.getClientDocuments).mockResolvedValue(mockDocs)

      const { result } = renderHook(() => useClientDocuments('proj-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual(mockDocs)
    })
  })

  // ============================================
  // useClientPhotos
  // ============================================

  describe('useClientPhotos', () => {
    it('should fetch photos for a project', async () => {
      const mockPhotos = [
        { id: 'photo-1', photo_url: 'url1', caption: 'Photo 1' },
        { id: 'photo-2', photo_url: 'url2', caption: 'Photo 2' },
      ]
      vi.mocked(clientPortalApi.getClientPhotos).mockResolvedValue(mockPhotos)

      const { result } = renderHook(() => useClientPhotos('proj-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual(mockPhotos)
    })
  })

  // ============================================
  // useClientSchedule
  // ============================================

  describe('useClientSchedule', () => {
    it('should fetch schedule for a project', async () => {
      const mockSchedule = [
        { id: 'item-1', task_name: 'Foundation', percent_complete: 100 },
        { id: 'item-2', task_name: 'Framing', percent_complete: 50 },
      ]
      vi.mocked(clientPortalApi.getClientSchedule).mockResolvedValue(mockSchedule)

      const { result } = renderHook(() => useClientSchedule('proj-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual(mockSchedule)
    })

    it('should not fetch when disabled via options', () => {
      const { result } = renderHook(() => useClientSchedule('proj-1', { enabled: false }), {
        wrapper: createWrapper(),
      })

      expect(result.current.fetchStatus).toBe('idle')
    })
  })
})
