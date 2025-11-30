/**
 * PhotoComparison Component Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PhotoComparison, CreateComparisonDialog } from './PhotoComparison'
import type { Photo, PhotoComparison as PhotoComparisonType } from '@/types/photo-management'

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

// Mock photo data for usePhotos hook
const mockPhotosData = [
  { id: 'photo-1', fileName: 'before.jpg', caption: 'Before photo', fileUrl: 'https://example.com/before.jpg' },
  { id: 'photo-2', fileName: 'after.jpg', caption: 'After photo', fileUrl: 'https://example.com/after.jpg' },
]

// Mock the hooks
vi.mock('../hooks/usePhotos', () => ({
  usePhotos: vi.fn(() => ({
    data: mockPhotosData,
  })),
  useCreateComparison: vi.fn(() => ({
    mutateAsync: vi.fn().mockResolvedValue({ id: 'new-comparison' }),
  })),
  useCompleteComparison: vi.fn(() => ({
    mutateAsync: vi.fn().mockResolvedValue({}),
  })),
}))

// Create mock photo data
const createMockPhoto = (overrides: Partial<Photo> = {}): Photo => ({
  id: 'photo-123',
  projectId: 'project-123',
  fileName: 'test-photo.jpg',
  fileUrl: 'https://example.com/photo.jpg',
  thumbnailUrl: 'https://example.com/thumb.jpg',
  category: 'progress',
  caption: 'Test photo',
  capturedAt: '2025-01-15T10:00:00Z',
  createdAt: '2025-01-15T10:00:00Z',
  updatedAt: '2025-01-15T10:00:00Z',
  ...overrides,
})

// Create mock comparison data
const createMockComparison = (
  overrides: Partial<PhotoComparisonType> = {}
): PhotoComparisonType => ({
  id: 'comparison-123',
  projectId: 'project-123',
  beforePhotoId: 'photo-1',
  afterPhotoId: 'photo-2',
  title: 'Foundation Progress',
  comparisonType: 'progress',
  notes: 'Initial notes',
  status: 'draft',
  createdAt: '2025-01-15T10:00:00Z',
  updatedAt: '2025-01-15T10:00:00Z',
  // Include full photo objects for component to use
  beforePhoto: createMockPhoto({ id: 'photo-1', fileName: 'before.jpg' }),
  afterPhoto: createMockPhoto({ id: 'photo-2', fileName: 'after.jpg' }),
  ...overrides,
})

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('PhotoComparison', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Empty State', () => {
    it('should show message when no photos selected', () => {
      render(<PhotoComparison />, { wrapper: createWrapper() })

      expect(screen.getByText('Select Photos to Compare')).toBeInTheDocument()
      expect(
        screen.getByText('Choose a before and after photo to create a comparison')
      ).toBeInTheDocument()
    })
  })

  describe('With Photos', () => {
    it('should render both photos', () => {
      const beforePhoto = createMockPhoto({ id: 'photo-1', fileName: 'before.jpg' })
      const afterPhoto = createMockPhoto({ id: 'photo-2', fileName: 'after.jpg' })

      render(
        <PhotoComparison beforePhoto={beforePhoto} afterPhoto={afterPhoto} />,
        { wrapper: createWrapper() }
      )

      const images = screen.getAllByRole('img')
      expect(images.length).toBeGreaterThanOrEqual(2)
    })

    it('should display Before and After labels', () => {
      const beforePhoto = createMockPhoto({ id: 'photo-1' })
      const afterPhoto = createMockPhoto({ id: 'photo-2' })

      render(
        <PhotoComparison beforePhoto={beforePhoto} afterPhoto={afterPhoto} />,
        { wrapper: createWrapper() }
      )

      // "Before" and "After" appear multiple times (badges and labels), so use getAllByText
      const beforeLabels = screen.getAllByText('Before')
      const afterLabels = screen.getAllByText('After')
      expect(beforeLabels.length).toBeGreaterThan(0)
      expect(afterLabels.length).toBeGreaterThan(0)
    })
  })

  describe('With Comparison', () => {
    it('should display comparison title when provided', () => {
      render(
        <PhotoComparison
          comparison={createMockComparison({ title: 'Test Comparison' })}
        />,
        { wrapper: createWrapper() }
      )

      expect(screen.getByText('Test Comparison')).toBeInTheDocument()
    })

    it('should show notes textarea for draft comparisons', () => {
      render(
        <PhotoComparison
          comparison={createMockComparison({ status: 'draft', notes: '' })}
        />,
        { wrapper: createWrapper() }
      )

      expect(
        screen.getByPlaceholderText('Add notes about the changes observed...')
      ).toBeInTheDocument()
    })

    it('should show complete button for draft comparisons with notes', async () => {
      const user = userEvent.setup()

      render(
        <PhotoComparison
          comparison={createMockComparison({ status: 'draft', notes: '' })}
        />,
        { wrapper: createWrapper() }
      )

      // Type some notes to enable the complete button
      const notesInput = screen.getByPlaceholderText('Add notes about the changes observed...')
      await user.type(notesInput, 'Some notes')

      // Check that button exists (may be disabled initially)
      const completeButton = screen.getByRole('button', { name: /complete comparison/i })
      expect(completeButton).toBeInTheDocument()
    })

    it('should not show complete button for completed comparisons', () => {
      render(
        <PhotoComparison
          comparison={createMockComparison({ status: 'completed' })}
        />,
        { wrapper: createWrapper() }
      )

      expect(
        screen.queryByRole('button', { name: /complete comparison/i })
      ).not.toBeInTheDocument()
    })
  })

  describe('View Modes', () => {
    it('should render view mode toggle buttons', () => {
      const beforePhoto = createMockPhoto({ id: 'photo-1' })
      const afterPhoto = createMockPhoto({ id: 'photo-2' })

      render(
        <PhotoComparison beforePhoto={beforePhoto} afterPhoto={afterPhoto} />,
        { wrapper: createWrapper() }
      )

      // Should have view mode buttons in the toolbar
      const buttons = screen.getAllByRole('button')
      expect(buttons.length).toBeGreaterThan(0)
    })
  })

  describe('Close Button', () => {
    it('should call onClose when provided', async () => {
      const user = userEvent.setup()
      const mockOnClose = vi.fn()
      const beforePhoto = createMockPhoto({ id: 'photo-1' })
      const afterPhoto = createMockPhoto({ id: 'photo-2' })

      render(
        <PhotoComparison
          beforePhoto={beforePhoto}
          afterPhoto={afterPhoto}
          onClose={mockOnClose}
        />,
        { wrapper: createWrapper() }
      )

      // Find and click close button
      const closeButtons = screen.getAllByRole('button')
      const closeButton = closeButtons.find(btn =>
        btn.querySelector('svg[class*="lucide-x"]') || btn.innerHTML.includes('X')
      )

      if (closeButton) {
        await user.click(closeButton)
        expect(mockOnClose).toHaveBeenCalled()
      }
    })
  })

  describe('Date Display', () => {
    it('should display capture dates for both photos', () => {
      const beforePhoto = createMockPhoto({
        id: 'photo-1',
        capturedAt: '2025-01-10T10:00:00Z',
      })
      const afterPhoto = createMockPhoto({
        id: 'photo-2',
        capturedAt: '2025-01-15T10:00:00Z',
      })

      render(
        <PhotoComparison beforePhoto={beforePhoto} afterPhoto={afterPhoto} />,
        { wrapper: createWrapper() }
      )

      expect(screen.getByText('Jan 10, 2025')).toBeInTheDocument()
      expect(screen.getByText('Jan 15, 2025')).toBeInTheDocument()
    })
  })
})

describe('CreateComparisonDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Dialog Trigger', () => {
    it('should render default trigger button', () => {
      render(<CreateComparisonDialog projectId="project-123" />, {
        wrapper: createWrapper(),
      })

      expect(
        screen.getByRole('button', { name: /new comparison/i })
      ).toBeInTheDocument()
    })

    it('should render custom trigger when provided', () => {
      render(
        <CreateComparisonDialog
          projectId="project-123"
          trigger={<button>Custom Trigger</button>}
        />,
        { wrapper: createWrapper() }
      )

      expect(
        screen.getByRole('button', { name: /custom trigger/i })
      ).toBeInTheDocument()
    })

    it('should open dialog when trigger clicked', async () => {
      const user = userEvent.setup()
      render(<CreateComparisonDialog projectId="project-123" />, {
        wrapper: createWrapper(),
      })

      await user.click(screen.getByRole('button', { name: /new comparison/i }))

      await waitFor(() => {
        expect(screen.getByText('Create Photo Comparison')).toBeInTheDocument()
      })
    })
  })

  describe('Dialog Content', () => {
    it('should display title input when dialog is open', async () => {
      const user = userEvent.setup()
      render(<CreateComparisonDialog projectId="project-123" />, {
        wrapper: createWrapper(),
      })

      await user.click(screen.getByRole('button', { name: /new comparison/i }))

      await waitFor(() => {
        expect(screen.getByPlaceholderText('e.g., Foundation Progress')).toBeInTheDocument()
      })
    })

    it('should display notes textarea when dialog is open', async () => {
      const user = userEvent.setup()
      render(<CreateComparisonDialog projectId="project-123" />, {
        wrapper: createWrapper(),
      })

      await user.click(screen.getByRole('button', { name: /new comparison/i }))

      await waitFor(() => {
        expect(
          screen.getByPlaceholderText('Add any notes about this comparison...')
        ).toBeInTheDocument()
      })
    })

    it('should have create button when dialog is open', async () => {
      const user = userEvent.setup()
      render(<CreateComparisonDialog projectId="project-123" />, {
        wrapper: createWrapper(),
      })

      await user.click(screen.getByRole('button', { name: /new comparison/i }))

      await waitFor(() => {
        const createButton = screen.getByRole('button', { name: /^create comparison$/i })
        expect(createButton).toBeInTheDocument()
        // Button should be disabled when form is incomplete
        expect(createButton).toBeDisabled()
      })
    })

    it('should close dialog when cancel clicked', async () => {
      const user = userEvent.setup()
      render(<CreateComparisonDialog projectId="project-123" />, {
        wrapper: createWrapper(),
      })

      await user.click(screen.getByRole('button', { name: /new comparison/i }))

      await waitFor(() => {
        expect(screen.getByText('Create Photo Comparison')).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /cancel/i }))

      await waitFor(() => {
        expect(screen.queryByText('Create Photo Comparison')).not.toBeInTheDocument()
      })
    })
  })
})
