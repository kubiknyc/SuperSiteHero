/**
 * useBulkMarkupExport Hook Tests
 *
 * Tests for bulk markup export functionality.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useBulkMarkupExport } from './useBulkMarkupExport'
import { markupExportService, type DrawingWithMarkups } from '@/lib/api/services/markup-export'

// Mock the markup export service
vi.mock('@/lib/api/services/markup-export', () => ({
  markupExportService: {
    getDrawingsWithMarkups: vi.fn(),
    exportMarkups: vi.fn(),
    downloadResult: vi.fn(),
  },
}))

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

// Create wrapper for React Query
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

// Mock data
const mockDrawings: DrawingWithMarkups[] = [
  {
    id: 'doc-1',
    name: 'Floor Plan A',
    file_url: 'https://example.com/doc1.png',
    file_name: 'floor-plan-a.png',
    file_type: 'image/png',
    project_id: 'project-1',
    markups: [
      {
        id: 'markup-1',
        document_id: 'doc-1',
        project_id: 'project-1',
        page_number: null,
        markup_type: 'rectangle',
        markup_data: { x: 100, y: 100, width: 200, height: 150 },
        is_shared: true,
        shared_with_roles: null,
        related_to_id: null,
        related_to_type: null,
        layer_id: null,
        color: '#FF0000',
        visible: true,
        author_name: 'John Doe',
        permission_level: null,
        shared_with_users: null,
        created_by: 'user-1',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: null,
        deleted_at: null,
      },
    ],
    markupCount: 1,
    selected: false,
  },
  {
    id: 'doc-2',
    name: 'Electrical Plan',
    file_url: 'https://example.com/doc2.png',
    file_name: 'electrical-plan.png',
    file_type: 'image/png',
    project_id: 'project-1',
    markups: [],
    markupCount: 0,
    selected: false,
  },
]

describe('useBulkMarkupExport', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(markupExportService.getDrawingsWithMarkups as ReturnType<typeof vi.fn>).mockResolvedValue(mockDrawings)
  })

  it('should fetch drawings on mount', async () => {
    const { result } = renderHook(() => useBulkMarkupExport('project-1'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(markupExportService.getDrawingsWithMarkups).toHaveBeenCalledWith('project-1')
    expect(result.current.drawings).toHaveLength(2)
  })

  it('should toggle drawing selection', async () => {
    const { result } = renderHook(() => useBulkMarkupExport('project-1'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // Initially no drawings selected
    expect(result.current.state.selectedDrawingIds).toHaveLength(0)

    // Toggle selection for first drawing
    act(() => {
      result.current.toggleDrawingSelection('doc-1')
    })

    expect(result.current.state.selectedDrawingIds).toContain('doc-1')
    expect(result.current.selectedDrawings).toHaveLength(1)

    // Toggle again to deselect
    act(() => {
      result.current.toggleDrawingSelection('doc-1')
    })

    expect(result.current.state.selectedDrawingIds).not.toContain('doc-1')
  })

  it('should select all drawings', async () => {
    const { result } = renderHook(() => useBulkMarkupExport('project-1'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    act(() => {
      result.current.selectAll()
    })

    expect(result.current.state.selectedDrawingIds).toHaveLength(2)
    expect(result.current.state.selectedDrawingIds).toContain('doc-1')
    expect(result.current.state.selectedDrawingIds).toContain('doc-2')
  })

  it('should select only drawings with markups', async () => {
    const { result } = renderHook(() => useBulkMarkupExport('project-1'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    act(() => {
      result.current.selectWithMarkups()
    })

    expect(result.current.state.selectedDrawingIds).toHaveLength(1)
    expect(result.current.state.selectedDrawingIds).toContain('doc-1')
    expect(result.current.state.selectedDrawingIds).not.toContain('doc-2')
  })

  it('should deselect all drawings', async () => {
    const { result } = renderHook(() => useBulkMarkupExport('project-1'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // First select all
    act(() => {
      result.current.selectAll()
    })

    // Then deselect all
    act(() => {
      result.current.selectNone()
    })

    expect(result.current.state.selectedDrawingIds).toHaveLength(0)
  })

  it('should update export format', async () => {
    const { result } = renderHook(() => useBulkMarkupExport('project-1'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // Default format is PNG
    expect(result.current.state.format).toBe('png')

    // Change to PDF
    act(() => {
      result.current.setFormat('pdf')
    })

    expect(result.current.state.format).toBe('pdf')

    // Change to JSON (should also set mode to data-only)
    act(() => {
      result.current.setFormat('json')
    })

    expect(result.current.state.format).toBe('json')
    expect(result.current.state.mode).toBe('data-only')
  })

  it('should update export mode', async () => {
    const { result } = renderHook(() => useBulkMarkupExport('project-1'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // Default mode is individual
    expect(result.current.state.mode).toBe('individual')

    // Change to merged
    act(() => {
      result.current.setMode('merged')
    })

    expect(result.current.state.mode).toBe('merged')
  })

  it('should update quality setting', async () => {
    const { result } = renderHook(() => useBulkMarkupExport('project-1'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // Default quality is medium
    expect(result.current.state.quality).toBe('medium')

    // Change to high
    act(() => {
      result.current.setQuality('high')
    })

    expect(result.current.state.quality).toBe('high')
  })

  it('should calculate summary correctly', async () => {
    const { result } = renderHook(() => useBulkMarkupExport('project-1'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.summary.totalDrawings).toBe(2)
    expect(result.current.summary.drawingsWithMarkups).toBe(1)
    expect(result.current.summary.totalMarkups).toBe(1)
    expect(result.current.summary.selectedCount).toBe(0)

    // Select one drawing
    act(() => {
      result.current.toggleDrawingSelection('doc-1')
    })

    expect(result.current.summary.selectedCount).toBe(1)
  })

  it('should validate export options', async () => {
    const { result } = renderHook(() => useBulkMarkupExport('project-1'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // No drawings selected - should be invalid
    expect(result.current.validation.valid).toBe(false)
    expect(result.current.validation.errors).toContain('No drawings selected for export')

    // Select drawing with markups
    act(() => {
      result.current.toggleDrawingSelection('doc-1')
    })

    expect(result.current.validation.valid).toBe(true)
    expect(result.current.validation.errors).toHaveLength(0)
  })

  it('should start export with selected drawings', async () => {
    const mockExportResult = {
      success: true,
      blob: new Blob(['test']),
      filename: 'export.zip',
      mimeType: 'application/zip',
      fileCount: 1,
      totalMarkups: 1,
    }

    ;(markupExportService.exportMarkups as ReturnType<typeof vi.fn>).mockResolvedValue(mockExportResult)

    const { result } = renderHook(() => useBulkMarkupExport('project-1'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // Select a drawing
    act(() => {
      result.current.toggleDrawingSelection('doc-1')
    })

    // Start export
    await act(async () => {
      await result.current.startExport()
    })

    expect(markupExportService.exportMarkups).toHaveBeenCalledWith(
      'project-1',
      expect.objectContaining({
        selectedDrawingIds: ['doc-1'],
        format: 'png',
        mode: 'individual',
      }),
      expect.any(Function)
    )

    expect(result.current.lastResult).toEqual(mockExportResult)
  })

  it('should reset state', async () => {
    const { result } = renderHook(() => useBulkMarkupExport('project-1'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // Make some changes
    act(() => {
      result.current.selectAll()
      result.current.setFormat('pdf')
      result.current.setMode('merged')
      result.current.setQuality('high')
    })

    // Reset
    act(() => {
      result.current.reset()
    })

    expect(result.current.state.selectedDrawingIds).toHaveLength(0)
    expect(result.current.state.format).toBe('png')
    expect(result.current.state.mode).toBe('individual')
    expect(result.current.state.quality).toBe('medium')
  })
})
