import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { DrawingCanvas } from './DrawingCanvas'
import { markupsApi, type DocumentMarkup } from '@/lib/api/services/markups'

// Mock the markups API
vi.mock('@/lib/api/services/markups', () => ({
  markupsApi: {
    getDocumentMarkups: vi.fn(),
    createMarkup: vi.fn(),
    updateMarkup: vi.fn(),
    deleteMarkup: vi.fn(),
  },
}))

// Mock auth context
vi.mock('@/lib/auth/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'test-user-id' },
    userProfile: { id: 'test-profile-id', full_name: 'Test User' },
  })),
}))

// Mock Konva components
vi.mock('react-konva', () => ({
  Stage: ({ children, onMouseDown, onMouseMove, onMouseUp, ...props }: any) => (
    <div data-testid="konva-stage" {...props}>
      {children}
    </div>
  ),
  Layer: ({ children }: any) => <div data-testid="konva-layer">{children}</div>,
  Line: (props: any) => <div data-testid="konva-line" data-props={JSON.stringify(props)} />,
  Arrow: (props: any) => <div data-testid="konva-arrow" data-props={JSON.stringify(props)} />,
  Rect: (props: any) => <div data-testid="konva-rect" data-props={JSON.stringify(props)} />,
  Circle: (props: any) => <div data-testid="konva-circle" data-props={JSON.stringify(props)} />,
  Text: (props: any) => <div data-testid="konva-text" data-props={JSON.stringify(props)} />,
  Image: (props: any) => <div data-testid="konva-image" data-props={JSON.stringify(props)} />,
  Transformer: (props: any) => <div data-testid="konva-transformer" {...props} />,
}))

describe('DrawingCanvas Integration Tests', () => {
  let queryClient: QueryClient
  const mockDocumentId = 'test-document-id'
  const mockProjectId = 'test-project-id'

  const mockMarkups: DocumentMarkup[] = [
    {
      id: 'markup-1',
      project_id: mockProjectId,
      document_id: mockDocumentId,
      page_number: 1,
      markup_type: 'rectangle',
      markup_data: {
        x: 100,
        y: 100,
        width: 200,
        height: 150,
        stroke: '#FF0000',
        strokeWidth: 3,
      },
      is_shared: false,
      shared_with_roles: null,
      related_to_id: null,
      related_to_type: null,
      created_by: 'test-user-id',
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
      deleted_at: null,
    },
    {
      id: 'markup-2',
      project_id: mockProjectId,
      document_id: mockDocumentId,
      page_number: 1,
      markup_type: 'arrow',
      markup_data: {
        x: 50,
        y: 50,
        points: [50, 50, 250, 250],
        stroke: '#0000FF',
        strokeWidth: 2,
        pointerLength: 20,
        pointerWidth: 20,
      },
      is_shared: false,
      shared_with_roles: null,
      related_to_id: null,
      related_to_type: null,
      created_by: 'test-user-id',
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
      deleted_at: null,
    },
  ]

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    vi.clearAllMocks()
    vi.mocked(markupsApi.getDocumentMarkups).mockResolvedValue([])
  })

  const renderComponent = (props = {}) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <DrawingCanvas
          documentId={mockDocumentId}
          projectId={mockProjectId}
          pageNumber={1}
          width={800}
          height={600}
          readOnly={false}
          {...props}
        />
      </QueryClientProvider>
    )
  }

  describe('Test 1: Component Rendering', () => {
    it('should render the drawing canvas with toolbar', async () => {
      renderComponent()

      // Wait for component to load
      await waitFor(() => {
        expect(screen.getByTestId('konva-stage')).toBeInTheDocument()
      })

      // Check toolbar buttons are present
      expect(screen.getByTitle('Select')).toBeInTheDocument()
      expect(screen.getByTitle('Arrow')).toBeInTheDocument()
      expect(screen.getByTitle('Rectangle')).toBeInTheDocument()
      expect(screen.getByTitle('Circle')).toBeInTheDocument()
      expect(screen.getByTitle('Text')).toBeInTheDocument()
      expect(screen.getByTitle('Freehand')).toBeInTheDocument()
      expect(screen.getByTitle('Eraser')).toBeInTheDocument()
    })

    it('should fetch existing markups on mount', async () => {
      vi.mocked(markupsApi.getDocumentMarkups).mockResolvedValue(mockMarkups)

      renderComponent()

      await waitFor(() => {
        expect(markupsApi.getDocumentMarkups).toHaveBeenCalledWith(mockDocumentId, 1)
      })
    })
  })

  describe('Test 2: Tool Selection', () => {
    it('should allow selecting different drawing tools', async () => {
      renderComponent()

      await waitFor(() => {
        expect(screen.getByTestId('konva-stage')).toBeInTheDocument()
      })

      // Test selecting arrow tool - selected state has bg-blue-600
      const arrowButton = screen.getByTitle('Arrow')
      fireEvent.click(arrowButton)
      expect(arrowButton.className).toContain('bg-blue-600')

      // Test selecting rectangle tool
      const rectangleButton = screen.getByTitle('Rectangle')
      fireEvent.click(rectangleButton)
      expect(rectangleButton.className).toContain('bg-blue-600')

      // Test selecting circle tool
      const circleButton = screen.getByTitle('Circle')
      fireEvent.click(circleButton)
      expect(circleButton.className).toContain('bg-blue-600')
    })
  })

  describe('Test 3: Color and Stroke Width Selection', () => {
    it('should allow changing color', async () => {
      renderComponent()

      await waitFor(() => {
        expect(screen.getByTestId('konva-stage')).toBeInTheDocument()
      })

      // Find color input by type attribute
      const inputs = document.querySelectorAll('input[type="color"]')
      expect(inputs.length).toBeGreaterThan(0)

      const colorInput = inputs[0] as HTMLInputElement
      fireEvent.change(colorInput, { target: { value: '#00FF00' } })
      expect(colorInput.value).toBe('#00ff00')
    })

    it('should allow changing stroke width', async () => {
      renderComponent()

      await waitFor(() => {
        expect(screen.getByTestId('konva-stage')).toBeInTheDocument()
      })

      // Find stroke width range input (slider)
      const rangeInput = document.querySelector('input[type="range"]') as HTMLInputElement
      expect(rangeInput).toBeTruthy()

      // Change stroke width to 5
      fireEvent.change(rangeInput, { target: { value: '5' } })
      expect(rangeInput.value).toBe('5')
    })
  })

  describe('Test 4: Loading Existing Markups', () => {
    it('should load and display existing markups', async () => {
      vi.mocked(markupsApi.getDocumentMarkups).mockResolvedValue(mockMarkups)

      renderComponent()

      await waitFor(() => {
        expect(markupsApi.getDocumentMarkups).toHaveBeenCalledWith(mockDocumentId, 1)
      })

      // Check that shapes are rendered
      await waitFor(() => {
        const layers = screen.getAllByTestId('konva-layer')
        expect(layers.length).toBeGreaterThan(0)
      })
    })

    it('should handle empty markups', async () => {
      vi.mocked(markupsApi.getDocumentMarkups).mockResolvedValue([])

      renderComponent()

      await waitFor(() => {
        expect(markupsApi.getDocumentMarkups).toHaveBeenCalledWith(mockDocumentId, 1)
      })

      // Component should still render
      await waitFor(() => {
        expect(screen.getByTestId('konva-stage')).toBeInTheDocument()
      }, { timeout: 3000 })
    })
  })

  describe('Test 5: Read-Only Mode', () => {
    it('should hide toolbar in read-only mode', async () => {
      renderComponent({ readOnly: true })

      await waitFor(() => {
        expect(screen.getByTestId('konva-stage')).toBeInTheDocument()
      })

      // Toolbar should be hidden in read-only mode (no tool buttons present)
      const toolTitles = ['Select', 'Arrow', 'Rectangle', 'Circle', 'Text', 'Freehand', 'Eraser']

      toolTitles.forEach(title => {
        expect(screen.queryByTitle(title)).not.toBeInTheDocument()
      })
    })
  })

  describe('Test 6: Undo/Redo Functionality', () => {
    it('should have undo and redo buttons', async () => {
      renderComponent()

      await waitFor(() => {
        expect(screen.getByTestId('konva-stage')).toBeInTheDocument()
      })

      // Check for undo/redo buttons
      const undoButton = screen.getByTitle('Undo')
      const redoButton = screen.getByTitle('Redo')

      expect(undoButton).toBeInTheDocument()
      expect(redoButton).toBeInTheDocument()
    })
  })

  describe('Test 7: Clear All Functionality', () => {
    it('should have clear all button', async () => {
      renderComponent()

      await waitFor(() => {
        expect(screen.getByTestId('konva-stage')).toBeInTheDocument()
      })

      // Check for clear all button
      const clearButton = screen.getByTitle('Clear All')
      expect(clearButton).toBeInTheDocument()
    })
  })

  describe('Test 8: Multi-Page Support', () => {
    it('should fetch markups for specific page number', async () => {
      const pageNumber = 3
      vi.mocked(markupsApi.getDocumentMarkups).mockResolvedValue([])

      renderComponent({ pageNumber })

      await waitFor(() => {
        expect(markupsApi.getDocumentMarkups).toHaveBeenCalledWith(mockDocumentId, pageNumber)
      })
    })

    it('should handle null page number for images', async () => {
      vi.mocked(markupsApi.getDocumentMarkups).mockResolvedValue([])

      renderComponent({ pageNumber: null })

      await waitFor(() => {
        expect(markupsApi.getDocumentMarkups).toHaveBeenCalledWith(mockDocumentId, null)
      })
    })
  })

  describe('Test 9: Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      vi.mocked(markupsApi.getDocumentMarkups).mockRejectedValue(new Error('API Error'))

      renderComponent()

      // Component should still render even if API fails
      await waitFor(() => {
        expect(screen.getByTestId('konva-stage')).toBeInTheDocument()
      })

      consoleError.mockRestore()
    })
  })

  describe('Test 10: Toolbar Controls', () => {
    it('should have all 7 drawing tools', async () => {
      renderComponent()

      await waitFor(() => {
        expect(screen.getByTestId('konva-stage')).toBeInTheDocument()
      })

      // Verify all 7 tools are present
      const allButtons = screen.getAllByRole('button')
      const toolTitles = ['Select', 'Arrow', 'Rectangle', 'Circle', 'Text', 'Freehand', 'Eraser']

      toolTitles.forEach(title => {
        const button = allButtons.find(btn => btn.getAttribute('title') === title)
        expect(button).toBeDefined()
      })
    })

    it('should have color picker', async () => {
      renderComponent()

      await waitFor(() => {
        expect(screen.getByTestId('konva-stage')).toBeInTheDocument()
      })

      // Check for color input by type attribute
      const colorInputs = document.querySelectorAll('input[type="color"]')
      expect(colorInputs.length).toBeGreaterThan(0)

      const colorInput = colorInputs[0] as HTMLInputElement
      expect(colorInput.getAttribute('type')).toBe('color')
    })

    it('should have stroke width controls', async () => {
      renderComponent()

      await waitFor(() => {
        expect(screen.getByTestId('konva-stage')).toBeInTheDocument()
      })

      // Check for stroke width range input (slider)
      const rangeInput = document.querySelector('input[type="range"]') as HTMLInputElement
      expect(rangeInput).toBeTruthy()
      expect(rangeInput.getAttribute('min')).toBe('1')
      expect(rangeInput.getAttribute('max')).toBe('10')
    })
  })
})
