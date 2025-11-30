/**
 * PhotoDetailDialog Component Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PhotoDetailDialog } from './PhotoDetailDialog'
import type { Photo } from '@/types/photo-management'

// Mock the hooks
vi.mock('../hooks/usePhotos', () => ({
  useUpdatePhoto: () => ({
    mutateAsync: vi.fn().mockResolvedValue({}),
  }),
}))

// Create mock photo data
const createMockPhoto = (overrides: Partial<Photo> = {}): Photo => ({
  id: 'photo-123',
  projectId: 'project-123',
  fileName: 'test-photo.jpg',
  fileUrl: 'https://example.com/photo.jpg',
  thumbnailUrl: 'https://example.com/thumb.jpg',
  category: 'progress',
  caption: 'Test photo caption',
  tags: ['construction', 'foundation'],
  capturedAt: '2025-01-15T10:00:00Z',
  createdAt: '2025-01-15T10:00:00Z',
  updatedAt: '2025-01-15T10:00:00Z',
  mimeType: 'image/jpeg',
  fileSize: 1024000,
  width: 1920,
  height: 1080,
  ...overrides,
})

function renderDialog(props: Partial<React.ComponentProps<typeof PhotoDetailDialog>> = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  const defaultProps = {
    photo: createMockPhoto(),
    isOpen: true,
    onClose: vi.fn(),
    ...props,
  }

  return render(
    <QueryClientProvider client={queryClient}>
      <PhotoDetailDialog {...defaultProps} />
    </QueryClientProvider>
  )
}

describe('PhotoDetailDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render dialog when open', () => {
      renderDialog()
      expect(screen.getByText('test-photo.jpg')).toBeInTheDocument()
    })

    it('should not render when closed', () => {
      renderDialog({ isOpen: false })
      expect(screen.queryByText('test-photo.jpg')).not.toBeInTheDocument()
    })

    it('should display the photo image', () => {
      renderDialog()
      const image = screen.getByRole('img')
      expect(image).toHaveAttribute('src', 'https://example.com/photo.jpg')
    })

    it('should display photo caption', () => {
      renderDialog()
      expect(screen.getByText('Test photo caption')).toBeInTheDocument()
    })

    it('should display photo category', () => {
      renderDialog()
      expect(screen.getByText('progress')).toBeInTheDocument()
    })

    it('should display photo tags', () => {
      renderDialog()
      expect(screen.getByText('construction')).toBeInTheDocument()
      expect(screen.getByText('foundation')).toBeInTheDocument()
    })
  })

  describe('Tabs', () => {
    it('should render Details and Metadata tabs', () => {
      renderDialog()
      expect(screen.getByRole('tab', { name: /details/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /metadata/i })).toBeInTheDocument()
    })

    it('should switch to metadata tab when clicked', async () => {
      const user = userEvent.setup()
      renderDialog()

      await user.click(screen.getByRole('tab', { name: /metadata/i }))
      expect(screen.getByText('File Information')).toBeInTheDocument()
    })
  })

  describe('File Information', () => {
    it('should display file size in metadata tab', async () => {
      const user = userEvent.setup()
      renderDialog()

      await user.click(screen.getByRole('tab', { name: /metadata/i }))
      expect(screen.getByText('1000.0 KB')).toBeInTheDocument()
    })

    it('should display mime type in metadata tab', async () => {
      const user = userEvent.setup()
      renderDialog()

      await user.click(screen.getByRole('tab', { name: /metadata/i }))
      expect(screen.getByText('image/jpeg')).toBeInTheDocument()
    })

    it('should display dimensions in metadata tab', async () => {
      const user = userEvent.setup()
      renderDialog()

      await user.click(screen.getByRole('tab', { name: /metadata/i }))
      expect(screen.getByText('1920 × 1080')).toBeInTheDocument()
    })
  })

  describe('GPS Information', () => {
    it('should display GPS coordinates when available', () => {
      renderDialog({
        photo: createMockPhoto({
          latitude: 40.7128,
          longitude: -74.006,
          gpsAccuracy: 10,
        }),
      })

      expect(screen.getByText(/40\.712800° N, 74\.006000° W/)).toBeInTheDocument()
      expect(screen.getByText('Accuracy: ±10m')).toBeInTheDocument()
    })

    it('should show Google Maps link when GPS available', () => {
      renderDialog({
        photo: createMockPhoto({
          latitude: 40.7128,
          longitude: -74.006,
        }),
      })

      expect(screen.getByText('View in Google Maps')).toBeInTheDocument()
    })
  })

  describe('Edit Mode', () => {
    it('should enter edit mode when edit button clicked', async () => {
      const user = userEvent.setup()
      renderDialog()

      await user.click(screen.getByRole('button', { name: /edit/i }))

      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    })

    it('should show textarea for caption in edit mode', async () => {
      const user = userEvent.setup()
      renderDialog()

      await user.click(screen.getByRole('button', { name: /edit/i }))
      expect(screen.getByPlaceholderText('Add a caption...')).toBeInTheDocument()
    })

    it('should cancel edit mode', async () => {
      const user = userEvent.setup()
      renderDialog()

      await user.click(screen.getByRole('button', { name: /edit/i }))
      await user.click(screen.getByRole('button', { name: /cancel/i }))

      expect(screen.queryByPlaceholderText('Add a caption...')).not.toBeInTheDocument()
    })
  })

  describe('Actions', () => {
    it('should render download button', () => {
      renderDialog()
      expect(screen.getByRole('button', { name: /download photo/i })).toBeInTheDocument()
    })

    it('should render delete button when onDelete provided', () => {
      renderDialog({ onDelete: vi.fn() })
      expect(screen.getByRole('button', { name: /delete photo/i })).toBeInTheDocument()
    })

    it('should not render delete button when onDelete not provided', () => {
      renderDialog({ onDelete: undefined })
      expect(screen.queryByRole('button', { name: /delete photo/i })).not.toBeInTheDocument()
    })

    it('should call onDelete when delete clicked', async () => {
      const user = userEvent.setup()
      const mockOnDelete = vi.fn()
      renderDialog({ onDelete: mockOnDelete })

      await user.click(screen.getByRole('button', { name: /delete photo/i }))
      expect(mockOnDelete).toHaveBeenCalled()
    })
  })

  describe('Image Controls', () => {
    it('should render zoom controls', () => {
      renderDialog()
      expect(screen.getByText('100%')).toBeInTheDocument()
    })
  })

  describe('No Caption Display', () => {
    it('should show "No caption" when caption is missing', () => {
      renderDialog({
        photo: createMockPhoto({ caption: undefined }),
      })

      expect(screen.getByText('No caption')).toBeInTheDocument()
    })
  })

  describe('No Tags Display', () => {
    it('should show "No tags" when tags are empty', () => {
      renderDialog({
        photo: createMockPhoto({ tags: [] }),
      })

      expect(screen.getByText('No tags')).toBeInTheDocument()
    })
  })
})
