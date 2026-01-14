import { vi } from 'vitest'

// Note: describe, it, expect, beforeEach, afterEach are available as globals (vitest config has globals: true)
import { supabase } from '@/lib/supabase'
import * as reportBuilder from '../report-builder'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn(),
    },
  },
  supabase: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn(),
    },
  },
}))

describe('Report Builder API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getReportTemplates', () => {
    it('should fetch report templates with filters', async () => {
      const mockTemplates = [
        { id: '1', name: 'Daily Report', data_source: 'daily_reports' },
        { id: '2', name: 'RFI Report', data_source: 'rfis' },
      ]

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockResolvedValue({ data: mockTemplates, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await reportBuilder.getReportTemplates({ company_id: 'company-1' })

      expect(result).toHaveLength(2)
    })

    it('should filter by data source', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      await reportBuilder.getReportTemplates({
        company_id: 'company-1',
        data_source: 'daily_reports',
      })

      expect(mockQuery.eq).toHaveBeenCalledWith('data_source', 'daily_reports')
    })
  })

  describe('getReportTemplate', () => {
    it('should fetch single template with relations', async () => {
      const mockTemplate = {
        id: '1',
        name: 'Daily Report',
        fields: [{ id: 'f1', field_name: 'date' }],
        filters: [],
        sorting: [],
        grouping: [],
      }

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockTemplate, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await reportBuilder.getReportTemplate('1')

      expect(result?.name).toBe('Daily Report')
      expect(result?.fields).toHaveLength(1)
    })

    it('should return null when not found', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await reportBuilder.getReportTemplate('999')

      expect(result).toBeNull()
    })
  })

  describe('createReportTemplate', () => {
    it('should create new template', async () => {
      const mockUser = { user: { id: 'user-1' } }
      vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: mockUser } as any)

      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: '1' }, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await reportBuilder.createReportTemplate({
        company_id: 'company-1',
        name: 'New Template',
        data_source: 'daily_reports',
      })

      expect(result.id).toBe('1')
    })
  })

  describe('updateReportTemplate', () => {
    it('should update template', async () => {
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: '1' }, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      await reportBuilder.updateReportTemplate('1', { name: 'Updated' })

      expect(mockQuery.update).toHaveBeenCalled()
    })
  })

  describe('deleteReportTemplate', () => {
    it('should soft delete template', async () => {
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      await reportBuilder.deleteReportTemplate('1')

      expect(mockQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({ deleted_at: expect.any(String) })
      )
    })
  })

  describe('duplicateReportTemplate', () => {
    it('should duplicate template with all relations', async () => {
      const mockTemplate = {
        id: '1',
        name: 'Original',
        company_id: 'company-1',
        data_source: 'daily_reports',
        fields: [{ field_name: 'date', display_name: 'Date' }],
        filters: [],
        sorting: [],
        grouping: [],
      }

      const mockUser = { user: { id: 'user-1' } }
      vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: mockUser } as any)

      let callCount = 0
      vi.mocked(supabase.from).mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            is: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockTemplate, error: null }),
          } as any
        }
        if (callCount === 2) {
          return {
            insert: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { id: '2' }, error: null }),
          } as any
        }
        return {
          delete: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          insert: vi.fn().mockReturnThis(),
          select: vi.fn().mockResolvedValue({ data: [], error: null }),
        } as any
      })

      const result = await reportBuilder.duplicateReportTemplate('1', 'Copy')

      expect(result.id).toBe('2')
    })
  })

  describe('setTemplateFields', () => {
    it('should replace template fields', async () => {
      const mockFields = [
        { field_name: 'date', display_name: 'Date', field_type: 'date' },
        { field_name: 'title', display_name: 'Title', field_type: 'text' },
      ]

      const mockDeleteQuery = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      }

      const mockInsertQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({ data: mockFields, error: null }),
      }

      let callCount = 0
      vi.mocked(supabase.from).mockImplementation(() => {
        callCount++
        return (callCount === 1 ? mockDeleteQuery : mockInsertQuery) as any
      })

      const result = await reportBuilder.setTemplateFields('template-1', mockFields)

      expect(result).toHaveLength(2)
    })
  })
})
