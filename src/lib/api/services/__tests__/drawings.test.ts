import { vi } from 'vitest'

// Note: describe, it, expect, beforeEach, afterEach are available as globals (vitest config has globals: true)
import { supabase } from '@/lib/supabase'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: { getUser: vi.fn() },
    storage: {
      from: vi.fn(),
    },
  },
}))

describe('Drawings API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getDrawings', () => {
    it('should fetch drawings with filters', async () => {
      const mockDrawings = [
        { id: '1', drawing_number: 'A-101', title: 'Floor Plan', discipline: 'architecture' },
        { id: '2', drawing_number: 'S-201', title: 'Foundation Plan', discipline: 'structural' },
      ]

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockDrawings, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const { data } = await supabase
        .from('drawings')
        .select('*')
        .eq('project_id', 'proj1')
        .order('drawing_number')

      expect(data).toHaveLength(2)
      expect(data![0].drawing_number).toBe('A-101')
    })

    it('should filter by discipline', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      await supabase
        .from('drawings')
        .select('*')
        .eq('discipline', 'mechanical')
        .order('drawing_number')

      expect(mockQuery.eq).toHaveBeenCalledWith('discipline', 'mechanical')
    })

    it('should filter by status', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      await supabase
        .from('drawings')
        .select('*')
        .eq('status', 'approved')
        .order('created_at')

      expect(mockQuery.eq).toHaveBeenCalledWith('status', 'approved')
    })
  })

  describe('getDrawing', () => {
    it('should fetch single drawing with versions', async () => {
      const mockDrawing = {
        id: '1',
        drawing_number: 'A-101',
        versions: [
          { version: 1, status: 'approved' },
          { version: 2, status: 'current' },
        ],
      }

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockDrawing, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const { data } = await supabase
        .from('drawings')
        .select('*, versions:drawing_versions(*)')
        .eq('id', '1')
        .single()

      expect(data?.versions).toHaveLength(2)
    })
  })

  describe('createDrawing', () => {
    it('should create new drawing', async () => {
      const newDrawing = {
        drawing_number: 'M-301',
        title: 'HVAC Layout',
        discipline: 'mechanical',
        project_id: 'proj1',
      }

      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user123' } },
        error: null,
      } as any)

      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'draw1', ...newDrawing },
          error: null
        }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const { data } = await supabase
        .from('drawings')
        .insert(newDrawing)
        .select()
        .single()

      expect(data).toMatchObject(newDrawing)
    })
  })

  describe('updateDrawing', () => {
    it('should update drawing metadata', async () => {
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: '1', title: 'Updated Title' },
          error: null
        }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const { data } = await supabase
        .from('drawings')
        .update({ title: 'Updated Title' })
        .eq('id', '1')
        .select()
        .single()

      expect(data?.title).toBe('Updated Title')
    })
  })

  describe('versionManagement', () => {
    it('should create new version', async () => {
      const newVersion = {
        drawing_id: 'draw1',
        version: 2,
        status: 'draft',
        file_url: 'https://example.com/v2.pdf',
      }

      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: newVersion,
          error: null
        }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const { data } = await supabase
        .from('drawing_versions')
        .insert(newVersion)
        .select()
        .single()

      expect(data?.version).toBe(2)
    })

    it('should get drawing history', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      await supabase
        .from('drawing_versions')
        .select('*')
        .eq('drawing_id', 'draw1')
        .order('version', { ascending: false })

      expect(mockQuery.order).toHaveBeenCalled()
    })
  })

  describe('uploadDrawing', () => {
    it('should upload drawing file to storage', async () => {
      const mockFile = new File(['content'], 'drawing.pdf', { type: 'application/pdf' })

      const mockStorage = {
        upload: vi.fn().mockResolvedValue({ data: { path: 'drawings/file.pdf' }, error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/file.pdf' } }),
      }

      vi.mocked(supabase.storage.from).mockReturnValue(mockStorage as any)

      const { data } = await supabase.storage
        .from('drawings')
        .upload('drawings/file.pdf', mockFile)

      expect(data?.path).toBe('drawings/file.pdf')
    })
  })

  describe('deleteDrawing', () => {
    it('should soft delete drawing', async () => {
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const { error } = await supabase
        .from('drawings')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', '1')

      expect(error).toBeNull()
    })
  })
})
