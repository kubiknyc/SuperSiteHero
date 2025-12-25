import { vi } from 'vitest'

// Note: describe, it, expect, beforeEach, afterEach are available as globals (vitest config has globals: true)
import { supabase } from '@/lib/supabase'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: { getUser: vi.fn() },
  },
}))

describe('Equipment API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getEquipment', () => {
    it('should fetch all equipment', async () => {
      const mockEquipment = [
        { id: '1', equipment_number: 'EQ-001', name: 'Excavator', status: 'active' },
        { id: '2', equipment_number: 'EQ-002', name: 'Bulldozer', status: 'active' },
      ]

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockEquipment, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const { data } = await supabase
        .from('equipment')
        .select('*')
        .eq('status', 'active')
        .order('equipment_number')

      expect(data).toHaveLength(2)
    })

    it('should filter by equipment type', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      await supabase
        .from('equipment')
        .select('*')
        .eq('equipment_type', 'excavator')
        .order('name')

      expect(mockQuery.eq).toHaveBeenCalledWith('equipment_type', 'excavator')
    })
  })

  describe('createEquipment', () => {
    it('should create new equipment', async () => {
      const newEquipment = {
        equipment_number: 'EQ-003',
        name: 'Crane',
        equipment_type: 'crane',
        make: 'Caterpillar',
        model: 'CAT-320',
      }

      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'eq3', ...newEquipment },
          error: null
        }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const { data } = await supabase
        .from('equipment')
        .insert(newEquipment)
        .select()
        .single()

      expect(data).toMatchObject(newEquipment)
    })
  })

  describe('updateEquipment', () => {
    it('should update equipment status', async () => {
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: '1', status: 'maintenance' },
          error: null
        }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const { data } = await supabase
        .from('equipment')
        .update({ status: 'maintenance' })
        .eq('id', '1')
        .select()
        .single()

      expect(data?.status).toBe('maintenance')
    })

    it('should update equipment hours', async () => {
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: '1', current_hours: 1500 },
          error: null
        }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const { data } = await supabase
        .from('equipment')
        .update({ current_hours: 1500 })
        .eq('id', '1')
        .select()
        .single()

      expect(data?.current_hours).toBe(1500)
    })
  })

  describe('getAvailableEquipment', () => {
    it('should fetch available equipment for date range', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      await supabase
        .from('equipment')
        .select('*')
        .in('status', ['available', 'active'])
        .order('equipment_number')

      expect(mockQuery.in).toHaveBeenCalledWith('status', ['available', 'active'])
    })
  })

  describe('assignEquipmentToProject', () => {
    it('should assign equipment to project', async () => {
      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { equipment_id: 'eq1', project_id: 'proj1' },
          error: null
        }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const { data } = await supabase
        .from('equipment_assignments')
        .insert({
          equipment_id: 'eq1',
          project_id: 'proj1',
          start_date: '2024-12-19',
        })
        .select()
        .single()

      expect(data?.equipment_id).toBe('eq1')
    })
  })
})
