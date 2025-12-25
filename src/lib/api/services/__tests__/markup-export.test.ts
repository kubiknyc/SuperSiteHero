import { vi } from 'vitest'

// Note: describe, it, expect, beforeEach, afterEach are available as globals (vitest config has globals: true)
import { supabase } from '@/lib/supabase'
import { markupExportService } from '../markup-export'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

vi.mock('../../errors', () => ({
  ApiErrorClass: class extends Error {
    constructor(config: { code: string; message: string }) {
      super(config.message)
      this.name = 'ApiErrorClass'
    }
  },
}))

describe('Markup Export Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getDrawingsWithMarkups', () => {
    it('should fetch drawings with markups', async () => {
      const mockDocuments = [
        { id: '1', name: 'Floor Plan', file_type: 'application/pdf' },
      ]

      const mockMarkups = [
        { id: 'm1', document_id: '1', markup_type: 'rectangle' },
        { id: 'm2', document_id: '1', markup_type: 'circle' },
      ]

      let callCount = 0
      vi.mocked(supabase.from).mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            is: vi.fn().mockReturnThis(),
            in: vi.fn().mockResolvedValue({ data: mockDocuments, error: null }),
          } as any
        }
        return {
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: mockMarkups, error: null }),
        } as any
      })

      const result = await markupExportService.getDrawingsWithMarkups('project-1')

      expect(result).toHaveLength(1)
      expect(result[0].markupCount).toBe(2)
    })
  })

  describe('exportMarkups', () => {
    it('should export markups as JSON', async () => {
      const mockDocuments = [
        {
          id: '1',
          name: 'Floor Plan',
          file_type: 'application/pdf',
          file_url: 'http://example.com/doc.pdf',
          file_name: 'doc.pdf',
          project_id: 'project-1',
        },
      ]

      const mockMarkups = [
        {
          id: 'm1',
          document_id: '1',
          markup_type: 'rectangle',
          markup_data: { x: 10, y: 10 },
          created_at: '2024-01-01',
        },
      ]

      let callCount = 0
      vi.mocked(supabase.from).mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            is: vi.fn().mockReturnThis(),
            in: vi.fn().mockResolvedValue({ data: mockDocuments, error: null }),
          } as any
        }
        return {
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: mockMarkups, error: null }),
        } as any
      })

      const result = await markupExportService.exportMarkups('project-1', {
        format: 'json',
        mode: 'data-only',
        includeMetadata: true,
        includeComments: false,
        selectedDrawingIds: [],
      })

      expect(result.success).toBe(true)
      expect(result.mimeType).toBe('application/json')
      expect(result.totalMarkups).toBe(1)
    })

    it('should return error when no drawings found', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await markupExportService.exportMarkups('project-1', {
        format: 'json',
        mode: 'data-only',
        includeMetadata: false,
        includeComments: false,
        selectedDrawingIds: [],
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('No drawings with markups found')
    })
  })

  describe('downloadResult', () => {
    it('should download result blob', () => {
      const mockBlob = new Blob(['test'], { type: 'application/json' })
      const mockResult = {
        success: true,
        blob: mockBlob,
        filename: 'test.json',
        mimeType: 'application/json',
        fileCount: 1,
        totalMarkups: 5,
      }

      const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url')
      const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})

      document.body.appendChild = vi.fn()
      document.body.removeChild = vi.fn()

      markupExportService.downloadResult(mockResult)

      expect(createObjectURLSpy).toHaveBeenCalledWith(mockBlob)
      expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url')
    })

    it('should throw error when no blob', () => {
      const mockResult = {
        success: false,
        filename: '',
        mimeType: '',
        fileCount: 0,
        totalMarkups: 0,
        error: 'No file',
      }

      expect(() => markupExportService.downloadResult(mockResult)).toThrow()
    })
  })
})
