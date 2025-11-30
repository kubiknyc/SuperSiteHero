/**
 * PhotoOrganizerPage Tests
 *
 * Tests the main photo organization page functionality.
 * Note: Some UI components (Select, etc.) are difficult to test in isolation
 * due to Radix UI context requirements. These tests focus on core functionality.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { Photo } from '@/types/photo-management'

// Mock MediaDevices API before importing component
const mockGetUserMedia = vi.fn()
const mockEnumerateDevices = vi.fn().mockResolvedValue([])
Object.defineProperty(navigator, 'mediaDevices', {
  value: {
    getUserMedia: mockGetUserMedia,
    enumerateDevices: mockEnumerateDevices,
  },
  writable: true,
  configurable: true,
})

Object.defineProperty(navigator, 'geolocation', {
  value: {
    getCurrentPosition: vi.fn(),
  },
  writable: true,
  configurable: true,
})

// Mock Radix UI Select to avoid context issues
vi.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange }: any) => (
    <div data-testid="select" data-value={value}>
      {children}
    </div>
  ),
  SelectTrigger: ({ children, className }: any) => (
    <button className={className} type="button">
      {children}
    </button>
  ),
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children, value }: any) => (
    <div data-value={value}>{children}</div>
  ),
  SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
}))

// Mock photo data
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

// Mock data
const mockPhotos: Photo[] = []
const mockStats = {
  totalPhotos: 0,
  photosToday: 0,
  photosThisWeek: 0,
  photosWithGps: 0,
  storageUsedBytes: 0,
}
const mockFilterOptions = {
  categories: ['progress', 'issue', 'safety'],
  tags: [],
  buildings: [],
  floors: [],
}

// Mock the hooks
vi.mock('../hooks/usePhotos', () => ({
  usePhotos: vi.fn(() => ({
    data: mockPhotos,
    isLoading: false,
    error: null,
  })),
  usePhotoStats: vi.fn(() => ({
    data: mockStats,
    isLoading: false,
  })),
  usePhotoFilterOptions: vi.fn(() => ({
    data: mockFilterOptions,
  })),
  useDeletePhoto: vi.fn(() => ({ mutate: vi.fn() })),
  useBulkDeletePhotos: vi.fn(() => ({ mutateAsync: vi.fn() })),
  useCreatePhoto: vi.fn(() => ({ mutateAsync: vi.fn() })),
}))

// Import after mocking
import { PhotoOrganizerPage } from './PhotoOrganizerPage'
import * as usePhotosModule from '../hooks/usePhotos'

function renderPage(projectId = 'project-123') {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/projects/${projectId}/photos`]}>
        <Routes>
          <Route path="/projects/:projectId/photos" element={<PhotoOrganizerPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('PhotoOrganizerPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPhotos.length = 0
    Object.assign(mockStats, {
      totalPhotos: 0,
      photosToday: 0,
      photosThisWeek: 0,
      photosWithGps: 0,
      storageUsedBytes: 0,
    })
  })

  describe('No Project', () => {
    it('should show message when no project selected', () => {
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      })

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/photos']}>
            <Routes>
              <Route path="/photos" element={<PhotoOrganizerPage />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      )

      expect(screen.getByText('No project selected')).toBeInTheDocument()
    })
  })

  describe('Page Header', () => {
    it('should display page title', () => {
      renderPage()
      expect(screen.getByText('Photos')).toBeInTheDocument()
    })

    it('should display page description', () => {
      renderPage()
      expect(
        screen.getByText('Capture, organize, and manage project photos')
      ).toBeInTheDocument()
    })

    it('should display action buttons', () => {
      renderPage()
      expect(screen.getByText('Capture')).toBeInTheDocument()
      expect(screen.getByText('Upload')).toBeInTheDocument()
      expect(screen.getByText('New Collection')).toBeInTheDocument()
    })
  })

  describe('Stats Cards', () => {
    it('should display stats cards', () => {
      Object.assign(mockStats, {
        totalPhotos: 150,
        photosToday: 12,
        photosThisWeek: 45,
        photosWithGps: 120,
        storageUsedBytes: 1024 * 1024 * 500,
      })

      renderPage()

      expect(screen.getByText('Total Photos')).toBeInTheDocument()
      expect(screen.getByText('150')).toBeInTheDocument()
      expect(screen.getByText('Today')).toBeInTheDocument()
      expect(screen.getByText('12')).toBeInTheDocument()
      expect(screen.getByText('This Week')).toBeInTheDocument()
      expect(screen.getByText('45')).toBeInTheDocument()
      // "With GPS" may appear multiple times (stats + filter), so use getAllByText
      const gpsLabels = screen.getAllByText('With GPS')
      expect(gpsLabels.length).toBeGreaterThan(0)
      expect(screen.getByText('120')).toBeInTheDocument()
    })

    it('should show loading skeletons when stats loading', () => {
      vi.mocked(usePhotosModule.usePhotoStats).mockReturnValue({
        data: undefined,
        isLoading: true,
      } as any)

      const { container } = renderPage()
      const skeletons = container.querySelectorAll('.animate-pulse')
      expect(skeletons.length).toBeGreaterThan(0)
    })
  })

  describe('Search', () => {
    it('should render search input', () => {
      renderPage()
      expect(screen.getByPlaceholderText('Search photos...')).toBeInTheDocument()
    })

    it('should update search query on input', async () => {
      const user = userEvent.setup()
      renderPage()

      const searchInput = screen.getByPlaceholderText('Search photos...')
      await user.type(searchInput, 'foundation')

      expect(searchInput).toHaveValue('foundation')
    })
  })

  describe('View Mode Tabs', () => {
    it('should display all view mode tabs', () => {
      renderPage()

      expect(screen.getByRole('tab', { name: /grid/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /timeline/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /location/i })).toBeInTheDocument()
    })

    it('should default to grid view', () => {
      renderPage()

      const gridTab = screen.getByRole('tab', { name: /grid/i })
      // Tab is selected by default - check it exists and is accessible
      expect(gridTab).toBeInTheDocument()
      // Radix UI uses aria-selected for active state
      expect(gridTab).toHaveAttribute('aria-selected', 'true')
    })
  })

  describe('Loading State', () => {
    it('should show loading skeletons when photos loading', () => {
      vi.mocked(usePhotosModule.usePhotos).mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      } as any)

      const { container } = renderPage()
      const skeletons = container.querySelectorAll('.animate-pulse')
      expect(skeletons.length).toBeGreaterThan(0)
    })
  })

  describe('Error State', () => {
    it('should show error message when fetch fails', () => {
      vi.mocked(usePhotosModule.usePhotos).mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Failed to fetch'),
      } as any)

      renderPage()

      expect(screen.getByText('Failed to load photos')).toBeInTheDocument()
    })

    it('should show retry button on error', () => {
      vi.mocked(usePhotosModule.usePhotos).mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Failed to fetch'),
      } as any)

      renderPage()

      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
    })
  })

  describe('Empty State', () => {
    it('should show empty state when no photos', () => {
      vi.mocked(usePhotosModule.usePhotos).mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
      } as any)

      renderPage()

      expect(screen.getByText('No Photos Yet')).toBeInTheDocument()
    })

    it('should show capture and upload buttons in empty state', () => {
      vi.mocked(usePhotosModule.usePhotos).mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
      } as any)

      renderPage()

      // Look for text content in buttons
      expect(screen.getByText('Capture Photo')).toBeInTheDocument()
      expect(screen.getByText('Upload Photos')).toBeInTheDocument()
    })
  })

  describe('Photo Display', () => {
    it('should render photos when they exist', () => {
      const photos = [
        createMockPhoto({ id: '1', fileName: 'photo1.jpg' }),
        createMockPhoto({ id: '2', fileName: 'photo2.jpg' }),
      ]

      vi.mocked(usePhotosModule.usePhotos).mockReturnValue({
        data: photos,
        isLoading: false,
        error: null,
      } as any)

      renderPage()

      const images = screen.getAllByRole('img')
      expect(images.length).toBeGreaterThanOrEqual(2)
    })
  })
})
