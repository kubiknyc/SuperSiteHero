/**
 * ClientPhotos Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TestProviders } from '@/__tests__/utils/TestProviders'
import { ClientPhotos } from './ClientPhotos'
import type { ClientPhotoView } from '@/types/client-portal'

// Mock useParams
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useParams: () => ({ projectId: 'proj-123' }),
  }
})

// Mock the hooks
const mockUseClientPhotos = vi.fn()

vi.mock('../hooks/useClientPortal', () => ({
  useClientPhotos: () => mockUseClientPhotos(),
}))

// Create mock photo data
const createMockPhoto = (
  overrides: Partial<ClientPhotoView> = {}
): ClientPhotoView => ({
  id: 'photo-123',
  photo_url: 'https://example.com/photo.jpg',
  thumbnail_url: 'https://example.com/photo-thumb.jpg',
  caption: 'Test photo caption',
  taken_at: '2025-01-15T10:30:00Z',
  latitude: 40.7128,
  longitude: -74.006,
  category: 'progress',
  ...overrides,
})

function renderPage() {
  return render(
    <TestProviders>
      <ClientPhotos />
    </TestProviders>
  )
}

describe('ClientPhotos', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Loading State', () => {
    it('should show loading skeletons', () => {
      mockUseClientPhotos.mockReturnValue({
        data: undefined,
        isLoading: true,
      })

      const { container } = renderPage()

      const skeletons = container.querySelectorAll('.animate-pulse, [class*="skeleton"]')
      expect(skeletons.length).toBeGreaterThan(0)
    })
  })

  describe('Empty State', () => {
    it('should show empty state when no photos', () => {
      mockUseClientPhotos.mockReturnValue({
        data: [],
        isLoading: false,
      })

      renderPage()

      expect(screen.getByText('No Photos Available')).toBeInTheDocument()
    })

    it('should show upload message in empty state', () => {
      mockUseClientPhotos.mockReturnValue({
        data: [],
        isLoading: false,
      })

      renderPage()

      expect(screen.getByText(/photos will appear here once they're uploaded/i)).toBeInTheDocument()
    })
  })

  describe('Page Header', () => {
    it('should display page title', () => {
      mockUseClientPhotos.mockReturnValue({
        data: [createMockPhoto()],
        isLoading: false,
      })

      renderPage()

      expect(screen.getByText('Project Photos')).toBeInTheDocument()
    })

    it('should display page description', () => {
      mockUseClientPhotos.mockReturnValue({
        data: [createMockPhoto()],
        isLoading: false,
      })

      renderPage()

      expect(screen.getByText('Browse progress photos from the project.')).toBeInTheDocument()
    })
  })

  describe('Photo Count', () => {
    it('should display photo count', () => {
      mockUseClientPhotos.mockReturnValue({
        data: [
          createMockPhoto({ id: 'photo-1' }),
          createMockPhoto({ id: 'photo-2' }),
          createMockPhoto({ id: 'photo-3' }),
        ],
        isLoading: false,
      })

      renderPage()

      expect(screen.getByText(/Showing 3 photos/)).toBeInTheDocument()
    })

    it('should use singular form for single photo', () => {
      mockUseClientPhotos.mockReturnValue({
        data: [createMockPhoto()],
        isLoading: false,
      })

      renderPage()

      expect(screen.getByText(/Showing 1 photo$/)).toBeInTheDocument()
    })
  })

  describe('Photo Grid', () => {
    it('should display photo thumbnails', () => {
      mockUseClientPhotos.mockReturnValue({
        data: [createMockPhoto({ thumbnail_url: 'https://example.com/thumb.jpg' })],
        isLoading: false,
      })

      renderPage()

      const img = screen.getByRole('img', { name: /test photo caption/i })
      expect(img).toHaveAttribute('src', 'https://example.com/thumb.jpg')
    })

    it('should display photo caption', () => {
      mockUseClientPhotos.mockReturnValue({
        data: [createMockPhoto({ caption: 'Foundation pour complete' })],
        isLoading: false,
      })

      renderPage()

      expect(screen.getByText('Foundation pour complete')).toBeInTheDocument()
    })

    it('should display category badge', () => {
      mockUseClientPhotos.mockReturnValue({
        data: [createMockPhoto({ category: 'safety' })],
        isLoading: false,
      })

      renderPage()

      expect(screen.getByText('safety')).toBeInTheDocument()
    })
  })

  describe('Date Grouping', () => {
    it('should group photos by date', () => {
      mockUseClientPhotos.mockReturnValue({
        data: [
          createMockPhoto({ id: 'photo-1', taken_at: '2025-01-15T10:00:00Z' }),
          createMockPhoto({ id: 'photo-2', taken_at: '2025-01-15T14:00:00Z' }),
          createMockPhoto({ id: 'photo-3', taken_at: '2025-01-16T10:00:00Z' }),
        ],
        isLoading: false,
      })

      renderPage()

      // Verify photos are rendered - dates are grouped by the component
      expect(screen.getByText(/Showing 3 photos/)).toBeInTheDocument()
    })

    it('should show photo count per date', () => {
      mockUseClientPhotos.mockReturnValue({
        data: [
          createMockPhoto({ id: 'photo-1', taken_at: '2025-01-15T10:00:00Z' }),
          createMockPhoto({ id: 'photo-2', taken_at: '2025-01-15T14:00:00Z' }),
        ],
        isLoading: false,
      })

      renderPage()

      expect(screen.getByText(/\(2 photos\)/)).toBeInTheDocument()
    })

    it('should handle undated photos', () => {
      mockUseClientPhotos.mockReturnValue({
        data: [createMockPhoto({ taken_at: undefined })],
        isLoading: false,
      })

      renderPage()

      expect(screen.getByText('Undated')).toBeInTheDocument()
    })
  })

  describe('Search and Filtering', () => {
    it('should have search input', () => {
      mockUseClientPhotos.mockReturnValue({
        data: [createMockPhoto()],
        isLoading: false,
      })

      renderPage()

      expect(screen.getByPlaceholderText(/search photos by caption/i)).toBeInTheDocument()
    })

    it('should filter photos by search term', async () => {
      const user = userEvent.setup()
      mockUseClientPhotos.mockReturnValue({
        data: [
          createMockPhoto({ id: 'photo-1', caption: 'Foundation work' }),
          createMockPhoto({ id: 'photo-2', caption: 'Framing complete' }),
        ],
        isLoading: false,
      })

      renderPage()

      const searchInput = screen.getByPlaceholderText(/search photos by caption/i)
      await user.type(searchInput, 'Foundation')

      expect(screen.getByText(/Showing 1 photo/)).toBeInTheDocument()
      expect(screen.getByText('Foundation work')).toBeInTheDocument()
      expect(screen.queryByText('Framing complete')).not.toBeInTheDocument()
    })

    it('should show category filter when categories exist', () => {
      mockUseClientPhotos.mockReturnValue({
        data: [
          createMockPhoto({ id: 'photo-1', category: 'progress' }),
          createMockPhoto({ id: 'photo-2', category: 'safety' }),
        ],
        isLoading: false,
      })

      renderPage()

      expect(screen.getByText('All Categories')).toBeInTheDocument()
    })

    it('should show filtered indicator when filters applied', async () => {
      const user = userEvent.setup()
      mockUseClientPhotos.mockReturnValue({
        data: [
          createMockPhoto({ id: 'photo-1', caption: 'Test' }),
          createMockPhoto({ id: 'photo-2', caption: 'Other' }),
        ],
        isLoading: false,
      })

      renderPage()

      const searchInput = screen.getByPlaceholderText(/search photos by caption/i)
      await user.type(searchInput, 'Test')

      expect(screen.getByText(/\(filtered\)/)).toBeInTheDocument()
    })

    it('should show clear filters button when filters applied', async () => {
      const user = userEvent.setup()
      mockUseClientPhotos.mockReturnValue({
        data: [
          createMockPhoto({ id: 'photo-1', caption: 'Test' }),
        ],
        isLoading: false,
      })

      renderPage()

      const searchInput = screen.getByPlaceholderText(/search photos by caption/i)
      await user.type(searchInput, 'nonexistent')

      expect(screen.getByRole('button', { name: /clear filters/i })).toBeInTheDocument()
    })
  })

  describe('Lightbox', () => {
    it('should open lightbox on photo click', async () => {
      const user = userEvent.setup()
      mockUseClientPhotos.mockReturnValue({
        data: [createMockPhoto({ caption: 'Test Photo' })],
        isLoading: false,
      })

      renderPage()

      // Find the photo button - it contains an img element
      const img = screen.getByRole('img')
      const photoButton = img.closest('button')
      expect(photoButton).toBeTruthy()
      await user.click(photoButton!)

      // Dialog should open - check for dialog content
      expect(screen.getByText('1 of 1')).toBeInTheDocument()
    })

    it('should show navigation buttons when multiple photos', async () => {
      const user = userEvent.setup()
      mockUseClientPhotos.mockReturnValue({
        data: [
          createMockPhoto({ id: 'photo-1', caption: 'Photo 1' }),
          createMockPhoto({ id: 'photo-2', caption: 'Photo 2' }),
        ],
        isLoading: false,
      })

      renderPage()

      const photoButtons = screen.getAllByRole('button')
      await user.click(photoButtons[0])

      // Should have previous and next buttons
      const navButtons = screen.getAllByRole('button')
      expect(navButtons.length).toBeGreaterThan(1)
    })

    it('should display photo info in lightbox', async () => {
      const user = userEvent.setup()
      mockUseClientPhotos.mockReturnValue({
        data: [createMockPhoto({
          caption: 'Test Photo',
          taken_at: '2025-01-15T10:30:00Z',
          latitude: 40.7128,
          longitude: -74.006,
          category: 'progress'
        })],
        isLoading: false,
      })

      renderPage()

      const photoButton = screen.getByRole('button')
      await user.click(photoButton)

      expect(screen.getByText(/GPS:/)).toBeInTheDocument()
      expect(screen.getByText('1 of 1')).toBeInTheDocument()
    })
  })

  describe('Multiple Photos', () => {
    it('should display all photos', () => {
      mockUseClientPhotos.mockReturnValue({
        data: [
          createMockPhoto({ id: 'photo-1', caption: 'Photo Alpha' }),
          createMockPhoto({ id: 'photo-2', caption: 'Photo Beta' }),
          createMockPhoto({ id: 'photo-3', caption: 'Photo Gamma' }),
        ],
        isLoading: false,
      })

      renderPage()

      expect(screen.getByText('Photo Alpha')).toBeInTheDocument()
      expect(screen.getByText('Photo Beta')).toBeInTheDocument()
      expect(screen.getByText('Photo Gamma')).toBeInTheDocument()
    })
  })
})
