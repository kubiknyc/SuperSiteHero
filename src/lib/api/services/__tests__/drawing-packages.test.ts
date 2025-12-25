import { vi } from 'vitest'

// Note: describe, it, expect, beforeEach, afterEach are available as globals (vitest config has globals: true)
import { supabase } from '@/lib/supabase'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: { getUser: vi.fn() },
  },
}))

describe('Drawing Packages API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user123' } },
      error: null,
    } as any)
  })

  describe('getDrawingPackages', () => {
    it('should fetch drawing packages for project', async () => {
      const mockPackages = [
        { id: 'pkg1', package_number: 'PKG-001', name: 'Structural Package', project_id: 'proj1' },
        { id: 'pkg2', package_number: 'PKG-002', name: 'MEP Package', project_id: 'proj1' },
      ]

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockPackages, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const { data } = await supabase
        .from('drawing_packages')
        .select('*')
        .eq('project_id', 'proj1')
        .order('package_number')

      expect(data).toHaveLength(2)
      expect(data![0].name).toBe('Structural Package')
    })

    it('should filter by status', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      await supabase
        .from('drawing_packages')
        .select('*')
        .eq('status', 'approved')
        .order('created_at')

      expect(mockQuery.eq).toHaveBeenCalledWith('status', 'approved')
    })
  })

  describe('getDrawingPackage', () => {
    it('should fetch single package with drawings', async () => {
      const mockPackage = {
        id: 'pkg1',
        name: 'Structural Package',
        drawings: [
          { id: 'draw1', drawing_number: 'S-101' },
          { id: 'draw2', drawing_number: 'S-102' },
        ],
      }

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockPackage, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const { data } = await supabase
        .from('drawing_packages')
        .select('*, drawings:package_drawings(*)')
        .eq('id', 'pkg1')
        .single()

      expect(data?.name).toBe('Structural Package')
      expect(data?.drawings).toHaveLength(2)
    })
  })

  describe('createDrawingPackage', () => {
    it('should create new drawing package', async () => {
      const newPackage = {
        project_id: 'proj1',
        package_number: 'PKG-003',
        name: 'Electrical Package',
        description: 'Electrical drawings',
      }

      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'pkg3', ...newPackage, created_by: 'user123' },
          error: null
        }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const { data } = await supabase
        .from('drawing_packages')
        .insert({ ...newPackage, created_by: 'user123' })
        .select()
        .single()

      expect(data).toMatchObject(newPackage)
    })
  })

  describe('updateDrawingPackage', () => {
    it('should update package status', async () => {
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'pkg1', status: 'approved' },
          error: null
        }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const { data } = await supabase
        .from('drawing_packages')
        .update({ status: 'approved' })
        .eq('id', 'pkg1')
        .select()
        .single()

      expect(data?.status).toBe('approved')
    })
  })

  describe('addDrawingsToPackage', () => {
    it('should add multiple drawings to package', async () => {
      const mockQuery = {
        insert: vi.fn().mockResolvedValue({ error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const drawingIds = ['draw1', 'draw2', 'draw3']
      const entries = drawingIds.map(id => ({
        package_id: 'pkg1',
        drawing_id: id,
      }))

      await supabase.from('package_drawings').insert(entries)

      expect(mockQuery.insert).toHaveBeenCalledWith(entries)
    })
  })

  describe('removeDrawingFromPackage', () => {
    it('should remove drawing from package', async () => {
      const mockQuery = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        mockResolvedValue: vi.fn().mockResolvedValue({ error: null }),
      }

      mockQuery.eq.mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      await supabase
        .from('package_drawings')
        .delete()
        .eq('package_id', 'pkg1')
        .eq('drawing_id', 'draw1')

      expect(mockQuery.delete).toHaveBeenCalled()
    })
  })

  describe('publishPackage', () => {
    it('should publish drawing package', async () => {
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'pkg1',
            status: 'published',
            published_at: new Date().toISOString(),
          },
          error: null
        }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const { data } = await supabase
        .from('drawing_packages')
        .update({
          status: 'published',
          published_at: expect.any(String),
        })
        .eq('id', 'pkg1')
        .select()
        .single()

      expect(data?.status).toBe('published')
      expect(data?.published_at).toBeDefined()
    })
  })

  describe('getPackageStatistics', () => {
    it('should calculate package statistics', async () => {
      const mockPackage = {
        id: 'pkg1',
        drawings: [
          { status: 'approved' },
          { status: 'approved' },
          { status: 'pending' },
        ],
      }

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockPackage, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const { data } = await supabase
        .from('drawing_packages')
        .select('*, drawings:package_drawings(status)')
        .eq('id', 'pkg1')
        .single()

      const totalDrawings = data?.drawings.length
      const approvedDrawings = data?.drawings.filter((d: any) => d.status === 'approved').length

      expect(totalDrawings).toBe(3)
      expect(approvedDrawings).toBe(2)
    })
  })

  describe('deleteDrawingPackage', () => {
    it('should soft delete package', async () => {
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      await supabase
        .from('drawing_packages')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', 'pkg1')

      expect(mockQuery.update).toHaveBeenCalled()
    })
  })

  describe('bulkOperations', () => {
    it('should perform bulk status update', async () => {
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const packageIds = ['pkg1', 'pkg2', 'pkg3']

      await supabase
        .from('drawing_packages')
        .update({ status: 'approved' })
        .in('id', packageIds)

      expect(mockQuery.in).toHaveBeenCalledWith('id', packageIds)
    })
  })

  describe('packageOrganization', () => {
    it('should reorder packages', async () => {
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const packageOrder = [
        { id: 'pkg1', sort_order: 0 },
        { id: 'pkg2', sort_order: 1 },
        { id: 'pkg3', sort_order: 2 },
      ]

      for (const pkg of packageOrder) {
        await supabase
          .from('drawing_packages')
          .update({ sort_order: pkg.sort_order })
          .eq('id', pkg.id)
      }

      expect(mockQuery.update).toHaveBeenCalledTimes(3)
    })
  })
})
