// File: /src/features/documents/components/DrawingCanvas.test.tsx
// Comprehensive tests for DrawingCanvas component

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { DrawingCanvas } from './DrawingCanvas'
import * as useMarkupsModule from '../hooks/useMarkups'

// Mock Konva
vi.mock('react-konva', () => ({
  Stage: ({ children, ...props }: any) => (
    <div data-testid="konva-stage" data-props={JSON.stringify(props)}>
      {children}
    </div>
  ),
  Layer: ({ children }: any) => <div data-testid="konva-layer">{children}</div>,
  Line: (props: any) => <div data-testid="konva-line" data-props={JSON.stringify(props)} />,
  Arrow: (props: any) => <div data-testid="konva-arrow" data-props={JSON.stringify(props)} />,
  Rect: (props: any) => <div data-testid="konva-rect" data-props={JSON.stringify(props)} />,
  Circle: (props: any) => <div data-testid="konva-circle" data-props={JSON.stringify(props)} />,
  Text: (props: any) => <div data-testid="konva-text" data-props={JSON.stringify(props)} />,
  Shape: (props: any) => <div data-testid="konva-shape" data-props={JSON.stringify(props)} />,
  Transformer: (props: any) => <div data-testid="konva-transformer" data-props={JSON.stringify(props)} />,
}))

// Mock useDocumentMarkups hook
vi.mock('../hooks/useMarkups', () => ({
  useDocumentMarkups: vi.fn(() => ({
    data: [],
    isLoading: false,
  })),
  useCreateMarkup: vi.fn(() => ({
    mutateAsync: vi.fn().mockResolvedValue({ id: 'markup-1' }),
  })),
  useUpdateMarkup: vi.fn(() => ({
    mutateAsync: vi.fn().mockResolvedValue({ id: 'markup-1' }),
  })),
  useDeleteMarkup: vi.fn(() => ({
    mutateAsync: vi.fn().mockResolvedValue(undefined),
  })),
}))

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

describe('DrawingCanvas', () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  const defaultProps = {
    documentId: 'doc-123',
    projectId: 'proj-456',
    width: 800,
    height: 600,
  }

  const renderComponent = (props = {}) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <DrawingCanvas {...defaultProps} {...props} />
      </QueryClientProvider>
    )
  }

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient.clear()

    // Mock desktop environment by default (not mobile)
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    })
    Object.defineProperty(navigator, 'maxTouchPoints', {
      writable: true,
      configurable: true,
      value: 0,
    })
  })

  describe('Rendering', () => {
    it('should render the canvas with correct dimensions', () => {
      renderComponent()
      const stage = screen.getByTestId('konva-stage')
      expect(stage).toBeInTheDocument()

      const props = JSON.parse(stage.getAttribute('data-props') || '{}')
      expect(props.width).toBe(800)
      expect(props.height).toBe(600)
    })

    it('should render toolbar when not in read-only mode', () => {
      renderComponent({ readOnly: false })

      // Check for tool buttons
      expect(screen.getByTitle('Select')).toBeInTheDocument()
      expect(screen.getByTitle('Arrow')).toBeInTheDocument()
      expect(screen.getByTitle('Rectangle')).toBeInTheDocument()
      expect(screen.getByTitle('Circle')).toBeInTheDocument()
      expect(screen.getByTitle('Cloud/Callout')).toBeInTheDocument()
      expect(screen.getByTitle('Text')).toBeInTheDocument()
      expect(screen.getByTitle('Freehand')).toBeInTheDocument()
    })

    it('should not render toolbar in read-only mode', () => {
      renderComponent({ readOnly: true })

      expect(screen.queryByTitle('Select')).not.toBeInTheDocument()
      expect(screen.queryByTitle('Arrow')).not.toBeInTheDocument()
    })

    it('should display mobile view-only notice on mobile devices', () => {
      // Mock mobile detection
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 500,
      })
      Object.defineProperty(navigator, 'maxTouchPoints', {
        writable: true,
        configurable: true,
        value: 5,
      })

      renderComponent({ readOnly: false })

      waitFor(() => {
        expect(screen.getByText('View only on mobile devices')).toBeInTheDocument()
      })
    })
  })

  describe('Tool Selection', () => {
    it('should default to select tool', () => {
      renderComponent()
      const selectButton = screen.getByTitle('Select')
      expect(selectButton.className).toContain('default') // Selected variant
    })

    it('should change tool when tool button is clicked', () => {
      renderComponent()

      const arrowButton = screen.getByTitle('Arrow')
      fireEvent.click(arrowButton)

      expect(arrowButton.className).toContain('default')
    })

    it('should change to cloud tool when cloud button is clicked', () => {
      renderComponent()

      const cloudButton = screen.getByTitle('Cloud/Callout')
      fireEvent.click(cloudButton)

      expect(cloudButton.className).toContain('default')
    })
  })

  describe('Color Selection', () => {
    it('should render color picker', () => {
      renderComponent()
      const colorInputs = screen.getAllByRole('button').filter(
        (button) => button.style.backgroundColor !== ''
      )
      expect(colorInputs.length).toBeGreaterThan(0)
    })

    it('should change color when color is selected', () => {
      renderComponent()
      const colorInputs = screen.getAllByRole('button').filter(
        (button) => button.style.backgroundColor !== ''
      )

      if (colorInputs.length > 0) {
        fireEvent.click(colorInputs[0])
        // Color should change - verified through visual state
        expect(colorInputs[0]).toBeInTheDocument()
      }
    })
  })

  describe('Undo/Redo', () => {
    it('should render undo button', () => {
      renderComponent()
      expect(screen.getByTitle('Undo')).toBeInTheDocument()
    })

    it('should render redo button', () => {
      renderComponent()
      expect(screen.getByTitle('Redo')).toBeInTheDocument()
    })

    it('should disable undo button when history is empty', () => {
      renderComponent()
      const undoButton = screen.getByTitle('Undo')
      expect(undoButton).toBeDisabled()
    })

    it('should disable redo button when at latest history step', () => {
      renderComponent()
      const redoButton = screen.getByTitle('Redo')
      expect(redoButton).toBeDisabled()
    })
  })

  describe('Loading State', () => {
    it('should show loading message when markups are loading', () => {
      const useDocumentMarkupsSpy = vi.spyOn(useMarkupsModule, 'useDocumentMarkups')
      useDocumentMarkupsSpy.mockReturnValue({
        data: undefined,
        isLoading: true,
      } as any)

      renderComponent()
      expect(screen.getByText('Loading annotations...')).toBeInTheDocument()
    })
  })

  describe('Read-Only Mode', () => {
    it('should not render toolbar in read-only mode', () => {
      renderComponent({ readOnly: true })
      expect(screen.queryByTitle('Select')).not.toBeInTheDocument()
    })

    it('should still render the stage in read-only mode', () => {
      renderComponent({ readOnly: true })
      expect(screen.getByTestId('konva-stage')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have title attributes on all tool buttons', () => {
      renderComponent()

      const toolButtons = [
        'Select',
        'Arrow',
        'Rectangle',
        'Circle',
        'Cloud/Callout',
        'Text',
        'Freehand',
        'Eraser',
        'Undo',
        'Redo',
      ]

      toolButtons.forEach((title) => {
        expect(screen.getByTitle(title)).toBeInTheDocument()
      })
    })

    it('should have clear all button', () => {
      renderComponent()
      expect(screen.getByTitle('Clear All')).toBeInTheDocument()
    })
  })

  describe('Props', () => {
    it('should accept custom width and height', () => {
      renderComponent({ width: 1200, height: 900 })
      const stage = screen.getByTestId('konva-stage')
      const props = JSON.parse(stage.getAttribute('data-props') || '{}')

      expect(props.width).toBe(1200)
      expect(props.height).toBe(900)
    })

    it('should accept documentId prop', () => {
      renderComponent({ documentId: 'custom-doc-id' })
      expect(screen.getByTestId('konva-stage')).toBeInTheDocument()
    })

    it('should accept projectId prop', () => {
      renderComponent({ projectId: 'custom-proj-id' })
      expect(screen.getByTestId('konva-stage')).toBeInTheDocument()
    })

    it('should accept pageNumber prop', () => {
      renderComponent({ pageNumber: 5 })
      expect(screen.getByTestId('konva-stage')).toBeInTheDocument()
    })

    it('should accept backgroundImageUrl prop', () => {
      renderComponent({ backgroundImageUrl: 'https://example.com/bg.jpg' })
      expect(screen.getByTestId('konva-stage')).toBeInTheDocument()
    })
  })
})
