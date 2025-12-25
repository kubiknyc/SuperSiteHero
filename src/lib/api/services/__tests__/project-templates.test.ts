import { vi } from 'vitest'

// Note: describe, it, expect, beforeEach, afterEach are available as globals (vitest config has globals: true)
import { supabase } from '@/lib/supabase'
import * as projectTemplates from '../project-templates'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn(),
    },
  },
}))

describe('Project Templates API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getTemplates', () => {
    it('should fetch templates with filters', async () => {
      const mockTemplates = [
        { id: '1', name: 'Residential Template', category: 'residential' },
        { id: '2', name: 'Commercial Template', category: 'commercial' },
      ]

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockTemplates, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await projectTemplates.getTemplates({ company_id: 'company-1' })

      expect(result).toHaveLength(2)
      expect(result[0].name).toBe('Residential Template')
    })

    it('should filter by category', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      await projectTemplates.getTemplates({
        company_id: 'company-1',
        category: 'residential',
      })

      expect(mockQuery.eq).toHaveBeenCalledWith('category', 'residential')
    })
  })

  describe('getTemplate', () => {
    it('should fetch single template', async () => {
      const mockTemplate = { id: '1', name: 'Residential Template' }

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockTemplate, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await projectTemplates.getTemplate('1')

      expect(result?.name).toBe('Residential Template')
    })
  })

  describe('createTemplate', () => {
    it('should create new template', async () => {
      const mockUser = { user: { id: 'user-1' } }
      vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: mockUser } as any)

      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: '1' }, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await projectTemplates.createTemplate({
        company_id: 'company-1',
        name: 'New Template',
        category: 'residential',
      })

      expect(result.id).toBe('1')
    })
  })

  describe('updateTemplate', () => {
    it('should update template', async () => {
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: '1' }, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      await projectTemplates.updateTemplate('1', { name: 'Updated' })

      expect(mockQuery.update).toHaveBeenCalled()
    })
  })

  describe('deleteTemplate', () => {
    it('should soft delete template', async () => {
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      await projectTemplates.deleteTemplate('1')

      expect(mockQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({ deleted_at: expect.any(String) })
      )
    })
  })

  describe('applyTemplateToProject', () => {
    it('should apply template settings to project', async () => {
      const mockTemplate = {
        id: '1',
        default_settings: { setting1: 'value1' },
        workflow_configurations: [{ workflow: 'RFI', enabled: true }],
      }

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockTemplate, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await projectTemplates.applyTemplateToProject('template-1', 'project-1')

      expect(result.success).toBe(true)
      expect(result.appliedSettings).toEqual({ setting1: 'value1' })
    })
  })

  describe('duplicateTemplate', () => {
    it('should duplicate template', async () => {
      const mockTemplate = {
        id: '1',
        name: 'Original',
        company_id: 'company-1',
        category: 'residential',
      }

      const mockUser = { user: { id: 'user-1' } }
      vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: mockUser } as any)

      const mockSelectQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockTemplate, error: null }),
      }

      const mockInsertQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: '2' }, error: null }),
      }

      let callCount = 0
      vi.mocked(supabase.from).mockImplementation(() => {
        callCount++
        return (callCount === 1 ? mockSelectQuery : mockInsertQuery) as any
      })

      const result = await projectTemplates.duplicateTemplate('1', 'Copy')

      expect(result.id).toBe('2')
    })
  })

  describe('getSystemTemplates', () => {
    it('should fetch system templates', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      await projectTemplates.getSystemTemplates()

      expect(mockQuery.eq).toHaveBeenCalledWith('is_system_template', true)
    })
  })
})
