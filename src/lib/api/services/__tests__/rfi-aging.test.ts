import { vi } from 'vitest'

// Note: describe, it, expect, beforeEach, afterEach are available as globals (vitest config has globals: true)
import { supabase } from '@/lib/supabase'
import { rfiAgingService } from '../rfi-aging'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn(),
    },
  },
}))

vi.mock('@/lib/email/email-service', () => ({
  sendEmail: vi.fn(),
}))

vi.mock('@/lib/email/templates/rfi-aging-alert', () => ({
  generateRFIAgingAlertEmail: vi.fn(() => ({ html: '<html>Alert</html>', text: 'Alert' })),
  generateRFIOverdueEmail: vi.fn(() => ({ html: '<html>Overdue</html>', text: 'Overdue' })),
  generateRFIAgingSummaryEmail: vi.fn(() => ({ html: '<html>Summary</html>', text: 'Summary' })),
}))

describe('RFI Aging Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getRFIsNeedingAlerts', () => {
    it('should fetch RFIs needing alerts', async () => {
      const mockRFIs = [
        { id: '1', due_date: '2024-01-20', status: 'pending' },
        { id: '2', due_date: '2024-01-21', status: 'submitted' },
      ]

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockRFIs, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await rfiAgingService.getRFIsNeedingAlerts('project-1', 'workflow-1')

      expect(result).toHaveLength(2)
    })
  })

  describe('getOverdueRFIs', () => {
    it('should fetch overdue RFIs', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        lt: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      await rfiAgingService.getOverdueRFIs('project-1', 'workflow-1')

      expect(mockQuery.lt).toHaveBeenCalled()
    })
  })

  describe('sendRFIAgingAlert', () => {
    it('should send aging alert', async () => {
      const mockRFI = {
        id: '1',
        number: 1,
        title: 'Test RFI',
        due_date: '2024-01-20',
        project_id: 'project-1',
        raised_by: 'user-1',
        assignees: ['user-2'],
        project: { name: 'Test Project' },
      }

      const mockUser = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'user-2', email: 'user@example.com', full_name: 'John Doe' },
          error: null,
        }),
      }

      const mockNotifInsert = {
        insert: vi.fn().mockResolvedValue({ error: null }),
      }

      const mockUpdate = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      }

      let callCount = 0
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        callCount++
        if (table === 'profiles') {return mockUser as any}
        if (table === 'notifications') {return mockNotifInsert as any}
        return mockUpdate as any
      })

      const result = await rfiAgingService.sendRFIAgingAlert(mockRFI as any, 'warning')

      expect(result.success).toBe(true)
    })
  })

  describe('processAlerts', () => {
    it('should process all pending alerts', async () => {
      const mockRFIs = [
        { id: '1', due_date: '2024-01-20', number: 1, title: 'RFI 1', assignees: ['user-1'], project_id: 'project-1' },
      ]

      const mockUser = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'user-1', email: 'user@example.com', full_name: 'John' },
          error: null,
        }),
      }

      let callCount = 0
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        callCount++
        if (table === 'workflow_items') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            not: vi.fn().mockReturnThis(),
            lte: vi.fn().mockReturnThis(),
            is: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: mockRFIs, error: null }),
          } as any
        }
        if (table === 'profiles') {return mockUser as any}
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ error: null }),
        } as any
      })

      const result = await rfiAgingService.processAlerts('project-1', 'workflow-1')

      expect(result.processedCount).toBeGreaterThan(0)
    })
  })

  describe('getAgingStats', () => {
    it('should calculate aging statistics', async () => {
      const mockRFIs = [
        { id: '1', due_date: '2024-01-10', priority: 'high', created_at: '2024-01-01', status: 'pending' },
        { id: '2', due_date: '2024-01-25', priority: 'normal', created_at: '2024-01-02', status: 'submitted' },
      ]

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValue({ data: mockRFIs, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await rfiAgingService.getAgingStats('project-1', 'workflow-1')

      expect(result.totalOpen).toBe(2)
      expect(result.byPriority.high).toBe(1)
      expect(result.byPriority.normal).toBe(1)
    })
  })

  describe('sendDigestSummary', () => {
    it('should send digest summary when items need attention', async () => {
      const mockStats = {
        total_open: 10,
        overdue_count: 3,
        due_today_count: 2,
        due_this_week_count: 5,
      }

      const mockRFIs = [
        { id: '1', number: 1, title: 'Overdue RFI', due_date: '2024-01-10' },
      ]

      const mockProject = { name: 'Test Project' }

      let callCount = 0
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        callCount++
        if (table === 'projects') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockProject, error: null }),
          } as any
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          not: vi.fn().mockReturnThis(),
          lt: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: mockRFIs, error: null }),
        } as any
      })

      // Mock getAgingStats
      rfiAgingService.getAgingStats = vi.fn().mockResolvedValue({
        overdueCount: 3,
        dueTodayCount: 2,
        dueThisWeekCount: 5,
      })

      rfiAgingService.getOverdueRFIs = vi.fn().mockResolvedValue(mockRFIs)

      const result = await rfiAgingService.sendDigestSummary(
        'project-1',
        'workflow-1',
        'pm@example.com',
        'Project Manager'
      )

      expect(result).toBe(true)
    })

    it('should not send when no items need attention', async () => {
      rfiAgingService.getAgingStats = vi.fn().mockResolvedValue({
        overdueCount: 0,
        dueTodayCount: 0,
        dueThisWeekCount: 0,
      })

      const result = await rfiAgingService.sendDigestSummary(
        'project-1',
        'workflow-1',
        'pm@example.com',
        'PM'
      )

      expect(result).toBe(false)
    })
  })
})
