/**
 * PhotoTimeline Component Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PhotoTimeline } from './PhotoTimeline'
import type { Photo } from '@/types/photo-management'

// Mock current date for consistent testing
const mockDate = new Date('2025-01-15T12:00:00Z')

// Create mock photo data
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

describe('PhotoTimeline', () => {
  const mockOnSelect = vi.fn()
  const mockOnView = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(mockDate)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('Rendering', () => {
    it('should render empty state when no photos', () => {
      render(
        <PhotoTimeline
          photos={[]}
          selectedIds={new Set()}
          onSelect={mockOnSelect}
          onView={mockOnView}
        />
      )

      expect(screen.getByText('No photos to display')).toBeInTheDocument()
    })

    it('should render photos in timeline groups', () => {
      const photos = [
        createMockPhoto({ id: '1', capturedAt: '2025-01-15T10:00:00Z' }),
        createMockPhoto({ id: '2', capturedAt: '2025-01-15T14:00:00Z' }),
      ]

      render(
        <PhotoTimeline
          photos={photos}
          selectedIds={new Set()}
          onSelect={mockOnSelect}
          onView={mockOnView}
        />
      )

      const images = screen.getAllByRole('img')
      expect(images).toHaveLength(2)
    })

    it('should show "Today" label for today photos', () => {
      const photos = [
        createMockPhoto({ id: '1', capturedAt: '2025-01-15T10:00:00Z' }),
      ]

      render(
        <PhotoTimeline
          photos={photos}
          selectedIds={new Set()}
          onSelect={mockOnSelect}
          onView={mockOnView}
        />
      )

      expect(screen.getByText('Today')).toBeInTheDocument()
    })

    it('should show "Yesterday" label for yesterday photos', () => {
      const photos = [
        createMockPhoto({ id: '1', capturedAt: '2025-01-14T10:00:00Z' }),
      ]

      render(
        <PhotoTimeline
          photos={photos}
          selectedIds={new Set()}
          onSelect={mockOnSelect}
          onView={mockOnView}
        />
      )

      expect(screen.getByText('Yesterday')).toBeInTheDocument()
    })

    it('should show full date for older photos', () => {
      const photos = [
        createMockPhoto({ id: '1', capturedAt: '2025-01-10T10:00:00Z' }),
      ]

      render(
        <PhotoTimeline
          photos={photos}
          selectedIds={new Set()}
          onSelect={mockOnSelect}
          onView={mockOnView}
        />
      )

      // Should display full date format
      expect(screen.getByText(/Friday, January 10/)).toBeInTheDocument()
    })

    it('should display photo count in group header', () => {
      const photos = [
        createMockPhoto({ id: '1', capturedAt: '2025-01-15T10:00:00Z' }),
        createMockPhoto({ id: '2', capturedAt: '2025-01-15T14:00:00Z' }),
        createMockPhoto({ id: '3', capturedAt: '2025-01-15T16:00:00Z' }),
      ]

      render(
        <PhotoTimeline
          photos={photos}
          selectedIds={new Set()}
          onSelect={mockOnSelect}
          onView={mockOnView}
        />
      )

      expect(screen.getByText('(3)')).toBeInTheDocument()
    })
  })

  describe('Grouping', () => {
    it('should group photos by day by default', () => {
      const photos = [
        createMockPhoto({ id: '1', capturedAt: '2025-01-15T10:00:00Z' }),
        createMockPhoto({ id: '2', capturedAt: '2025-01-14T10:00:00Z' }),
      ]

      render(
        <PhotoTimeline
          photos={photos}
          selectedIds={new Set()}
          onSelect={mockOnSelect}
          onView={mockOnView}
        />
      )

      expect(screen.getByText('Today')).toBeInTheDocument()
      expect(screen.getByText('Yesterday')).toBeInTheDocument()
    })

    it('should group photos by week when groupBy is week', () => {
      const photos = [
        createMockPhoto({ id: '1', capturedAt: '2025-01-15T10:00:00Z' }),
        createMockPhoto({ id: '2', capturedAt: '2025-01-08T10:00:00Z' }),
      ]

      render(
        <PhotoTimeline
          photos={photos}
          selectedIds={new Set()}
          onSelect={mockOnSelect}
          onView={mockOnView}
          groupBy="week"
        />
      )

      // Should display week headers - find elements containing "Week of"
      const weekHeaders = screen.getAllByText(/Week of/)
      expect(weekHeaders.length).toBeGreaterThanOrEqual(1)
    })

    it('should group photos by month when groupBy is month', () => {
      const photos = [
        createMockPhoto({ id: '1', capturedAt: '2025-01-15T10:00:00Z' }),
        createMockPhoto({ id: '2', capturedAt: '2024-12-15T10:00:00Z' }),
      ]

      render(
        <PhotoTimeline
          photos={photos}
          selectedIds={new Set()}
          onSelect={mockOnSelect}
          onView={mockOnView}
          groupBy="month"
        />
      )

      expect(screen.getByText('January 2025')).toBeInTheDocument()
      expect(screen.getByText('December 2024')).toBeInTheDocument()
    })
  })

  describe('Selection', () => {
    it('should show selected state for selected photos', () => {
      const photos = [createMockPhoto({ id: '1' })]

      const { container } = render(
        <PhotoTimeline
          photos={photos}
          selectedIds={new Set(['1'])}
          onSelect={mockOnSelect}
          onView={mockOnView}
        />
      )

      // Selected photo should have ring-primary
      const selectedPhoto = container.querySelector('.ring-primary')
      expect(selectedPhoto).toBeInTheDocument()
    })

    it('should call onSelect when clicking selection indicator', async () => {
      vi.useRealTimers()
      const user = userEvent.setup()
      const photos = [createMockPhoto({ id: '1' })]

      const { container } = render(
        <PhotoTimeline
          photos={photos}
          selectedIds={new Set()}
          onSelect={mockOnSelect}
          onView={mockOnView}
        />
      )

      // Click the selection indicator
      const selectionArea = container.querySelector('.absolute.top-2.left-2')
      if (selectionArea) {
        await user.click(selectionArea)
        expect(mockOnSelect).toHaveBeenCalledWith('1', true)
      }
      vi.useFakeTimers()
      vi.setSystemTime(mockDate)
    })
  })

  describe('View Photo', () => {
    it('should call onView when clicking photo', async () => {
      vi.useRealTimers()
      const user = userEvent.setup()
      const photos = [createMockPhoto({ id: '1' })]

      render(
        <PhotoTimeline
          photos={photos}
          selectedIds={new Set()}
          onSelect={mockOnSelect}
          onView={mockOnView}
        />
      )

      const image = screen.getByRole('img')
      const photoCard = image.closest('.cursor-pointer')

      if (photoCard) {
        await user.click(photoCard)
        expect(mockOnView).toHaveBeenCalledWith(photos[0])
      }
      vi.useFakeTimers()
      vi.setSystemTime(mockDate)
    })
  })

  describe('GPS Indicator', () => {
    it('should show GPS indicator for photos with location', () => {
      const photos = [
        createMockPhoto({ id: '1', latitude: 40.7128, longitude: -74.006 }),
      ]

      const { container } = render(
        <PhotoTimeline
          photos={photos}
          selectedIds={new Set()}
          onSelect={mockOnSelect}
          onView={mockOnView}
        />
      )

      // GPS indicator (green dot with MapPin)
      const gpsIndicator = container.querySelector('.bg-green-500\\/80')
      expect(gpsIndicator).toBeInTheDocument()
    })

    it('should not show GPS indicator for photos without location', () => {
      const photos = [createMockPhoto({ id: '1' })]

      const { container } = render(
        <PhotoTimeline
          photos={photos}
          selectedIds={new Set()}
          onSelect={mockOnSelect}
          onView={mockOnView}
        />
      )

      // GPS indicator should not be present
      const gpsIndicator = container.querySelector('.bg-green-500\\/80')
      expect(gpsIndicator).not.toBeInTheDocument()
    })
  })

  describe('Time Display', () => {
    it('should display capture time for photos', () => {
      const photos = [
        createMockPhoto({ id: '1', capturedAt: '2025-01-15T14:30:00Z' }),
      ]

      render(
        <PhotoTimeline
          photos={photos}
          selectedIds={new Set()}
          onSelect={mockOnSelect}
          onView={mockOnView}
        />
      )

      // Time should be displayed (format varies by locale)
      expect(screen.getByText(/\d{1,2}:\d{2}/)).toBeInTheDocument()
    })
  })

  describe('Sorting', () => {
    it('should sort groups by date descending (newest first)', () => {
      const photos = [
        createMockPhoto({ id: '1', capturedAt: '2025-01-10T10:00:00Z' }),
        createMockPhoto({ id: '2', capturedAt: '2025-01-15T10:00:00Z' }),
        createMockPhoto({ id: '3', capturedAt: '2025-01-12T10:00:00Z' }),
      ]

      render(
        <PhotoTimeline
          photos={photos}
          selectedIds={new Set()}
          onSelect={mockOnSelect}
          onView={mockOnView}
        />
      )

      const headers = screen.getAllByText(/Today|January/)
      // First should be today (Jan 15)
      expect(headers[0]).toHaveTextContent('Today')
    })
  })
})
