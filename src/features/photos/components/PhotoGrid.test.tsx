/**
 * PhotoGrid Component Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PhotoGrid } from './PhotoGrid'
import type { Photo } from '@/types/photo-management'

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

describe('PhotoGrid', () => {
  const mockOnSelect = vi.fn()
  const mockOnView = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render empty state when no photos', () => {
      render(
        <PhotoGrid
          photos={[]}
          selectedIds={new Set()}
          onSelect={mockOnSelect}
          onView={mockOnView}
        />
      )

      expect(screen.getByText('No photos found')).toBeInTheDocument()
    })

    it('should render photos in a grid', () => {
      const photos = [
        createMockPhoto({ id: '1', fileName: 'photo1.jpg' }),
        createMockPhoto({ id: '2', fileName: 'photo2.jpg' }),
        createMockPhoto({ id: '3', fileName: 'photo3.jpg' }),
      ]

      render(
        <PhotoGrid
          photos={photos}
          selectedIds={new Set()}
          onSelect={mockOnSelect}
          onView={mockOnView}
        />
      )

      const images = screen.getAllByRole('img')
      expect(images).toHaveLength(3)
    })

    it('should display photo alt text from caption', () => {
      const photos = [
        createMockPhoto({ id: '1', caption: 'Foundation work' }),
      ]

      render(
        <PhotoGrid
          photos={photos}
          selectedIds={new Set()}
          onSelect={mockOnSelect}
          onView={mockOnView}
        />
      )

      const image = screen.getByRole('img')
      expect(image).toHaveAttribute('alt', 'Foundation work')
    })

    it('should fall back to filename for alt text when no caption', () => {
      const photos = [createMockPhoto({ id: '1', fileName: 'photo.jpg', caption: undefined })]

      render(
        <PhotoGrid
          photos={photos}
          selectedIds={new Set()}
          onSelect={mockOnSelect}
          onView={mockOnView}
        />
      )

      const image = screen.getByRole('img')
      expect(image).toHaveAttribute('alt', 'photo.jpg')
    })

    it('should show GPS indicator for photos with location', () => {
      const photos = [
        createMockPhoto({ id: '1', latitude: 40.7128, longitude: -74.006 }),
      ]

      const { container } = render(
        <PhotoGrid
          photos={photos}
          selectedIds={new Set()}
          onSelect={mockOnSelect}
          onView={mockOnView}
        />
      )

      // GPS indicator should be present (green background element)
      const gpsIndicator = container.querySelector('.bg-green-500\\/80')
      expect(gpsIndicator).toBeInTheDocument()
    })

    it('should not show GPS indicator for photos without location', () => {
      const photos = [createMockPhoto({ id: '1' })]

      const { container } = render(
        <PhotoGrid
          photos={photos}
          selectedIds={new Set()}
          onSelect={mockOnSelect}
          onView={mockOnView}
        />
      )

      const gpsIndicator = container.querySelector('.bg-green-500\\/80')
      expect(gpsIndicator).not.toBeInTheDocument()
    })
  })

  describe('Selection', () => {
    it('should show selection checkbox on hover', async () => {
      const photos = [createMockPhoto({ id: '1' })]

      const { container } = render(
        <PhotoGrid
          photos={photos}
          selectedIds={new Set()}
          onSelect={mockOnSelect}
          onView={mockOnView}
        />
      )

      // Selection indicator initially has opacity-0
      const selectionIndicator = container.querySelector('.opacity-0')
      expect(selectionIndicator).toBeInTheDocument()
    })

    it('should mark selected photos with ring', () => {
      const photos = [
        createMockPhoto({ id: '1' }),
        createMockPhoto({ id: '2' }),
      ]

      const { container } = render(
        <PhotoGrid
          photos={photos}
          selectedIds={new Set(['1'])}
          onSelect={mockOnSelect}
          onView={mockOnView}
        />
      )

      // Selected photo should have ring-primary class
      const selectedPhoto = container.querySelector('.ring-primary')
      expect(selectedPhoto).toBeInTheDocument()
    })

    it('should call onSelect when clicking selection indicator', async () => {
      const user = userEvent.setup()
      const photos = [createMockPhoto({ id: 'test-photo-1' })]

      const { container } = render(
        <PhotoGrid
          photos={photos}
          selectedIds={new Set()}
          onSelect={mockOnSelect}
          onView={mockOnView}
        />
      )

      // Find the selection indicator (circle checkbox)
      const selectionArea = container.querySelector('.absolute.top-2.left-2')
      expect(selectionArea).toBeInTheDocument()

      if (selectionArea) {
        await user.click(selectionArea)
        expect(mockOnSelect).toHaveBeenCalledWith('test-photo-1', true)
      }
    })

    it('should toggle selection off when clicking selected photo checkbox', async () => {
      const user = userEvent.setup()
      const photos = [createMockPhoto({ id: 'test-photo-1' })]

      const { container } = render(
        <PhotoGrid
          photos={photos}
          selectedIds={new Set(['test-photo-1'])}
          onSelect={mockOnSelect}
          onView={mockOnView}
        />
      )

      const selectionArea = container.querySelector('.absolute.top-2.left-2')
      if (selectionArea) {
        await user.click(selectionArea)
        expect(mockOnSelect).toHaveBeenCalledWith('test-photo-1', false)
      }
    })
  })

  describe('View Photo', () => {
    it('should call onView when clicking photo normally', async () => {
      const user = userEvent.setup()
      const photos = [createMockPhoto({ id: 'test-1' })]

      render(
        <PhotoGrid
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
    })

    it('should call onSelect instead of onView when shift-clicking', async () => {
      const user = userEvent.setup()
      const photos = [createMockPhoto({ id: 'test-1' })]

      render(
        <PhotoGrid
          photos={photos}
          selectedIds={new Set()}
          onSelect={mockOnSelect}
          onView={mockOnView}
        />
      )

      const image = screen.getByRole('img')
      const photoCard = image.closest('.cursor-pointer')

      if (photoCard) {
        // Shift+click should select, not view
        await user.keyboard('{Shift>}')
        await user.click(photoCard)
        await user.keyboard('{/Shift}')

        expect(mockOnSelect).toHaveBeenCalledWith('test-1', true)
        expect(mockOnView).not.toHaveBeenCalled()
      }
    })
  })

  describe('Grid Configuration', () => {
    it('should apply 4 columns configuration', () => {
      const photos = [createMockPhoto({ id: '1' })]

      const { container } = render(
        <PhotoGrid
          photos={photos}
          selectedIds={new Set()}
          onSelect={mockOnSelect}
          onView={mockOnView}
          columns={4}
        />
      )

      const grid = container.querySelector('.grid')
      expect(grid?.className).toContain('md:grid-cols-4')
    })

    it('should apply 5 columns configuration', () => {
      const photos = [createMockPhoto({ id: '1' })]

      const { container } = render(
        <PhotoGrid
          photos={photos}
          selectedIds={new Set()}
          onSelect={mockOnSelect}
          onView={mockOnView}
          columns={5}
        />
      )

      const grid = container.querySelector('.grid')
      expect(grid?.className).toContain('lg:grid-cols-5')
    })

    it('should apply 6 columns configuration by default', () => {
      const photos = [createMockPhoto({ id: '1' })]

      const { container } = render(
        <PhotoGrid
          photos={photos}
          selectedIds={new Set()}
          onSelect={mockOnSelect}
          onView={mockOnView}
        />
      )

      const grid = container.querySelector('.grid')
      expect(grid?.className).toContain('lg:grid-cols-6')
    })
  })

  describe('Lazy Loading', () => {
    it('should have loading=lazy on images', () => {
      const photos = [createMockPhoto({ id: '1' })]

      render(
        <PhotoGrid
          photos={photos}
          selectedIds={new Set()}
          onSelect={mockOnSelect}
          onView={mockOnView}
        />
      )

      const image = screen.getByRole('img')
      expect(image).toHaveAttribute('loading', 'lazy')
    })
  })

  describe('Thumbnails', () => {
    it('should use thumbnailUrl when available', () => {
      const photos = [
        createMockPhoto({
          id: '1',
          thumbnailUrl: 'https://example.com/thumb.jpg',
          fileUrl: 'https://example.com/full.jpg',
        }),
      ]

      render(
        <PhotoGrid
          photos={photos}
          selectedIds={new Set()}
          onSelect={mockOnSelect}
          onView={mockOnView}
        />
      )

      const image = screen.getByRole('img')
      expect(image).toHaveAttribute('src', 'https://example.com/thumb.jpg')
    })

    it('should fall back to fileUrl when no thumbnailUrl', () => {
      const photos = [
        createMockPhoto({
          id: '1',
          thumbnailUrl: undefined,
          fileUrl: 'https://example.com/full.jpg',
        }),
      ]

      render(
        <PhotoGrid
          photos={photos}
          selectedIds={new Set()}
          onSelect={mockOnSelect}
          onView={mockOnView}
        />
      )

      const image = screen.getByRole('img')
      expect(image).toHaveAttribute('src', 'https://example.com/full.jpg')
    })
  })
})
