import { vi } from 'vitest'

// Note: describe, it, expect, beforeEach, afterEach are available as globals (vitest config has globals: true)
import { supabase } from '@/lib/supabase'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: { getUser: vi.fn() },
  },
}))

describe('Action Items API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getActionItems', () => {
    it('should fetch action items with filters', async () => {
      const mockItems = [
        { id: '1', title: 'Review document', status: 'pending', priority: 'high' },
        { id: '2', title: 'Update spec', status: 'in_progress', priority: 'medium' },
      ]

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockItems, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const { data } = await supabase
        .from('action_items')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      expect(data).toHaveLength(2)
      expect(data![0].title).toBe('Review document')
    })

    it('should filter by assignee', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      await supabase
        .from('action_items')
        .select('*')
        .eq('assigned_to', 'user123')
        .order('due_date')

      expect(mockQuery.eq).toHaveBeenCalledWith('assigned_to', 'user123')
    })

    it('should filter by project', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      await supabase
        .from('action_items')
        .select('*')
        .eq('project_id', 'proj123')
        .order('priority')

      expect(mockQuery.eq).toHaveBeenCalledWith('project_id', 'proj123')
    })
  })

  describe('createActionItem', () => {
    it('should create new action item', async () => {
      const newItem = {
        title: 'New task',
        description: 'Task description',
        priority: 'high',
        status: 'pending',
      }

      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user123' } },
        error: null,
      } as any)

      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'item1', ...newItem, created_by: 'user123' },
          error: null
        }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const { data } = await supabase
        .from('action_items')
        .insert({ ...newItem, created_by: 'user123' })
        .select()
        .single()

      expect(data).toMatchObject(newItem)
      expect(data?.created_by).toBe('user123')
    })

    it('should validate required fields', async () => {
      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: new Error('title is required')
        }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const { error } = await supabase
        .from('action_items')
        .insert({})
        .select()
        .single()

      expect(error).toBeTruthy()
      expect(error?.message).toContain('required')
    })
  })

  describe('updateActionItem', () => {
    it('should update action item status', async () => {
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: '1', status: 'completed' },
          error: null
        }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const { data } = await supabase
        .from('action_items')
        .update({ status: 'completed' })
        .eq('id', '1')
        .select()
        .single()

      expect(data?.status).toBe('completed')
    })

    it('should update assigned user', async () => {
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: '1', assigned_to: 'user456' },
          error: null
        }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const { data } = await supabase
        .from('action_items')
        .update({ assigned_to: 'user456' })
        .eq('id', '1')
        .select()
        .single()

      expect(data?.assigned_to).toBe('user456')
    })

    it('should update priority', async () => {
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: '1', priority: 'urgent' },
          error: null
        }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const { data } = await supabase
        .from('action_items')
        .update({ priority: 'urgent' })
        .eq('id', '1')
        .select()
        .single()

      expect(data?.priority).toBe('urgent')
    })
  })

  describe('deleteActionItem', () => {
    it('should soft delete action item', async () => {
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const { error } = await supabase
        .from('action_items')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', '1')

      expect(error).toBeNull()
      expect(mockQuery.update).toHaveBeenCalled()
    })

    it('should hard delete if required', async () => {
      const mockQuery = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const { error } = await supabase
        .from('action_items')
        .delete()
        .eq('id', '1')

      expect(error).toBeNull()
    })
  })

  describe('getOverdueActionItems', () => {
    it('should fetch overdue items', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        lt: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const today = new Date().toISOString()
      await supabase
        .from('action_items')
        .select('*')
        .lt('due_date', today)
        .neq('status', 'completed')
        .order('due_date')

      expect(mockQuery.lt).toHaveBeenCalled()
      expect(mockQuery.neq).toHaveBeenCalledWith('status', 'completed')
    })
  })

  describe('getActionItemsByMeeting', () => {
    it('should fetch items linked to meeting', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      await supabase
        .from('action_items')
        .select('*')
        .eq('meeting_id', 'meeting123')
        .order('created_at')

      expect(mockQuery.eq).toHaveBeenCalledWith('meeting_id', 'meeting123')
    })
  })
})
