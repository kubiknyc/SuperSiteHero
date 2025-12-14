/**
 * Tests for Lien Waiver Reminder Service
 * CRITICAL: These tests ensure automated reminders and escalations work correctly
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  lienWaiverReminderService,
  DEFAULT_REMINDER_CONFIG,
  type WaiverReminderConfig,
  type EscalationLevel,
} from './lien-waiver-reminders'
import { supabase } from '@/lib/supabase'
import { sendEmail } from '@/lib/email/email-service'

// Mock dependencies
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

vi.mock('@/lib/email/email-service', () => ({
  sendEmail: vi.fn().mockResolvedValue({ success: true }),
}))

vi.mock('@/lib/email/templates', () => ({
  generateLienWaiverReminderEmail: vi.fn(() => ({
    html: '<html>Reminder</html>',
    text: 'Reminder text',
  })),
  generateLienWaiverOverdueEmail: vi.fn(() => ({
    html: '<html>Overdue</html>',
    text: 'Overdue text',
  })),
}))

vi.mock('@/lib/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}))

describe('lienWaiverReminderService', () => {
  const mockConfig: WaiverReminderConfig = {
    ...DEFAULT_REMINDER_CONFIG,
    sendEmail: true,
    sendInApp: true,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Mock environment variable
    vi.stubEnv('VITE_APP_URL', 'https://test.supersitehero.com')
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  describe('getWaiversNeedingReminders', () => {
    it('should fetch waivers needing reminders within threshold', async () => {
      const mockWaivers = [
        {
          id: 'lw-1',
          waiver_number: 'LW-001',
          due_date: '2025-12-15',
          status: 'pending',
          project: { id: 'p1', name: 'Project A', project_number: 'PA-001' },
          subcontractor: { id: 's1', company_name: 'Acme Inc', contact_email: 'acme@test.com' },
        },
        {
          id: 'lw-2',
          waiver_number: 'LW-002',
          due_date: '2025-12-20',
          status: 'sent',
          project: { id: 'p2', name: 'Project B', project_number: 'PB-002' },
          subcontractor: { id: 's2', company_name: 'Beta Corp', contact_email: 'beta@test.com' },
        },
      ]

      const selectMock = vi.fn().mockReturnThis()
      const eqMock = vi.fn().mockReturnThis()
      const inMock = vi.fn().mockReturnThis()
      const notMock = vi.fn().mockReturnThis()
      const lteMock = vi.fn().mockReturnThis()
      const isMock = vi.fn().mockReturnThis()
      const orderMock = vi.fn().mockResolvedValue({ data: mockWaivers, error: null })

      vi.mocked(supabase.from).mockReturnValue({
        select: selectMock,
      } as any)

      selectMock.mockReturnValue({ eq: eqMock })
      eqMock.mockReturnValue({ in: inMock })
      inMock.mockReturnValue({ not: notMock })
      notMock.mockReturnValue({ lte: lteMock })
      lteMock.mockReturnValue({ is: isMock })
      isMock.mockReturnValue({ order: orderMock })

      const result = await lienWaiverReminderService.getWaiversNeedingReminders('comp-123', mockConfig)

      expect(result).toEqual(mockWaivers)
      expect(supabase.from).toHaveBeenCalledWith('lien_waivers')
    })

    it('should handle errors when fetching waivers', async () => {
      const selectMock = vi.fn().mockReturnThis()
      const eqMock = vi.fn().mockReturnThis()
      const inMock = vi.fn().mockReturnThis()
      const notMock = vi.fn().mockReturnThis()
      const lteMock = vi.fn().mockReturnThis()
      const isMock = vi.fn().mockReturnThis()
      const orderMock = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      })

      vi.mocked(supabase.from).mockReturnValue({
        select: selectMock,
      } as any)

      selectMock.mockReturnValue({ eq: eqMock })
      eqMock.mockReturnValue({ in: inMock })
      inMock.mockReturnValue({ not: notMock })
      notMock.mockReturnValue({ lte: lteMock })
      lteMock.mockReturnValue({ is: isMock })
      isMock.mockReturnValue({ order: orderMock })

      await expect(
        lienWaiverReminderService.getWaiversNeedingReminders('comp-123', mockConfig)
      ).rejects.toThrow()
    })
  })

  describe('getOverdueWaivers', () => {
    it('should fetch only overdue waivers', async () => {
      const today = new Date().toISOString().split('T')[0]
      const mockOverdueWaivers = [
        {
          id: 'lw-1',
          waiver_number: 'LW-001',
          due_date: '2025-12-01',
          status: 'pending',
          project: { id: 'p1', name: 'Project A' },
        },
      ]

      const selectMock = vi.fn().mockReturnThis()
      const eqMock = vi.fn().mockReturnThis()
      const inMock = vi.fn().mockReturnThis()
      const notMock = vi.fn().mockReturnThis()
      const ltMock = vi.fn().mockReturnThis()
      const isMock = vi.fn().mockReturnThis()
      const orderMock = vi.fn().mockResolvedValue({ data: mockOverdueWaivers, error: null })

      vi.mocked(supabase.from).mockReturnValue({
        select: selectMock,
      } as any)

      selectMock.mockReturnValue({ eq: eqMock })
      eqMock.mockReturnValue({ in: inMock })
      inMock.mockReturnValue({ not: notMock })
      notMock.mockReturnValue({ lt: ltMock })
      ltMock.mockReturnValue({ is: isMock })
      isMock.mockReturnValue({ order: orderMock })

      const result = await lienWaiverReminderService.getOverdueWaivers('comp-123')

      expect(result).toEqual(mockOverdueWaivers)
    })
  })

  describe('getProjectManagerEmail', () => {
    it('should return PM email when found', async () => {
      const mockPM = {
        users: {
          id: 'user-123',
          email: 'pm@test.com',
          full_name: 'John Manager',
        },
      }

      const selectMock = vi.fn().mockReturnThis()
      const eqMock = vi.fn().mockReturnThis()
      const inMock = vi.fn().mockReturnThis()
      const limitMock = vi.fn().mockReturnThis()
      const singleMock = vi.fn().mockResolvedValue({ data: mockPM, error: null })

      vi.mocked(supabase.from).mockReturnValue({
        select: selectMock,
      } as any)

      selectMock.mockReturnValue({ eq: eqMock })
      eqMock.mockReturnValue({ in: inMock })
      inMock.mockReturnValue({ limit: limitMock })
      limitMock.mockReturnValue({ single: singleMock })

      const result = await lienWaiverReminderService.getProjectManagerEmail('proj-123')

      expect(result).toEqual({
        email: 'pm@test.com',
        name: 'John Manager',
      })
    })

    it('should return null when PM not found', async () => {
      const selectMock = vi.fn().mockReturnThis()
      const eqMock = vi.fn().mockReturnThis()
      const inMock = vi.fn().mockReturnThis()
      const limitMock = vi.fn().mockReturnThis()
      const singleMock = vi.fn().mockResolvedValue({ data: null, error: null })

      vi.mocked(supabase.from).mockReturnValue({
        select: selectMock,
      } as any)

      selectMock.mockReturnValue({ eq: eqMock })
      eqMock.mockReturnValue({ in: inMock })
      inMock.mockReturnValue({ limit: limitMock })
      limitMock.mockReturnValue({ single: singleMock })

      const result = await lienWaiverReminderService.getProjectManagerEmail('proj-123')

      expect(result).toBeNull()
    })
  })

  describe('sendWaiverReminder', () => {
    it('should send reminder email for upcoming due date', async () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 2)
      const dueDateStr = futureDate.toISOString().split('T')[0]

      const mockWaiver = {
        id: 'lw-1',
        waiver_number: 'LW-001',
        due_date: dueDateStr,
        through_date: '2025-12-01',
        payment_amount: 50000,
        waiver_type: 'conditional_progress',
        vendor_name: 'Test Vendor',
        sent_to_email: 'vendor@test.com',
        project_id: 'proj-123',
        reminder_sent_at: null,
        project: { id: 'proj-123', name: 'Test Project', project_number: 'TP-001' },
        subcontractor: { id: 's1', company_name: 'Test Sub', contact_email: 'sub@test.com' },
      }

      // Mock database operations
      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })

      const insertMock = vi.fn().mockResolvedValue({ error: null })

      const selectUserMock = vi.fn().mockReturnThis()
      const eqUserMock = vi.fn().mockReturnThis()
      const singleUserMock = vi.fn().mockResolvedValue({ data: { id: 'user-1' }, error: null })

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'lien_waivers') {
          return { update: updateMock } as any
        }
        if (table === 'lien_waiver_history') {
          return { insert: insertMock } as any
        }
        if (table === 'users') {
          return { select: selectUserMock } as any
        }
        if (table === 'notifications') {
          return { insert: insertMock } as any
        }
        return {} as any
      })

      selectUserMock.mockReturnValue({ eq: eqUserMock })
      eqUserMock.mockReturnValue({ single: singleUserMock })

      const result = await lienWaiverReminderService.sendWaiverReminder(
        mockWaiver as any,
        'second',
        mockConfig
      )

      expect(result.success).toBe(true)
      expect(result.waiverId).toBe('lw-1')
      expect(result.escalationLevel).toBe('second')
      expect(sendEmail).toHaveBeenCalled()
    })

    it('should send overdue reminder and escalate to PM', async () => {
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 5) // 5 days overdue
      const dueDateStr = pastDate.toISOString().split('T')[0]

      const mockWaiver = {
        id: 'lw-1',
        waiver_number: 'LW-001',
        due_date: dueDateStr,
        through_date: '2025-12-01',
        payment_amount: 50000,
        waiver_type: 'unconditional_progress',
        vendor_name: 'Test Vendor',
        sent_to_email: 'vendor@test.com',
        claimant_name: 'Claimant',
        project_id: 'proj-123',
        reminder_sent_at: null,
        project: { id: 'proj-123', name: 'Test Project', project_number: 'TP-001' },
        subcontractor: { id: 's1', company_name: 'Test Sub', contact_email: 'sub@test.com' },
      }

      // Mock PM lookup
      const mockPM = {
        users: {
          id: 'pm-1',
          email: 'pm@test.com',
          full_name: 'Project Manager',
        },
      }

      const selectPMMock = vi.fn().mockReturnThis()
      const eqPMMock = vi.fn().mockReturnThis()
      const inPMMock = vi.fn().mockReturnThis()
      const limitPMMock = vi.fn().mockReturnThis()
      const singlePMMock = vi.fn().mockResolvedValue({ data: mockPM, error: null })

      // Mock other database operations
      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })

      const insertMock = vi.fn().mockResolvedValue({ error: null })

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'project_team_members') {
          return { select: selectPMMock } as any
        }
        if (table === 'lien_waivers') {
          return { update: updateMock } as any
        }
        if (table === 'lien_waiver_history' || table === 'notifications') {
          return { insert: insertMock } as any
        }
        if (table === 'users') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { id: 'user-1' }, error: null }),
              }),
            }),
          } as any
        }
        return {} as any
      })

      selectPMMock.mockReturnValue({ eq: eqPMMock })
      eqPMMock.mockReturnValue({ in: inPMMock })
      inPMMock.mockReturnValue({ limit: limitPMMock })
      limitPMMock.mockReturnValue({ single: singlePMMock })

      const result = await lienWaiverReminderService.sendWaiverReminder(
        mockWaiver as any,
        'overdue',
        mockConfig
      )

      expect(result.success).toBe(true)
      expect(sendEmail).toHaveBeenCalledTimes(2) // Once to vendor, once to PM
    })

    it('should fail gracefully when no recipient email found', async () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 2)
      const dueDateStr = futureDate.toISOString().split('T')[0]

      const mockWaiver = {
        id: 'lw-1',
        waiver_number: 'LW-001',
        due_date: dueDateStr,
        through_date: '2025-12-01',
        payment_amount: 50000,
        waiver_type: 'conditional_progress',
        vendor_name: 'Test Vendor',
        sent_to_email: null,
        project_id: 'proj-123',
        reminder_sent_at: null,
        project: { id: 'proj-123', name: 'Test Project', project_number: 'TP-001' },
        subcontractor: null,
      }

      // Mock PM lookup - also returns null
      const selectPMMock = vi.fn().mockReturnThis()

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'project_team_members') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                in: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({ data: null, error: null }),
                  }),
                }),
              }),
            }),
          } as any
        }
        return {} as any
      })

      const result = await lienWaiverReminderService.sendWaiverReminder(
        mockWaiver as any,
        'first',
        mockConfig
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe('No recipient email found')
    })

    it('should handle email sending errors', async () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 2)
      const dueDateStr = futureDate.toISOString().split('T')[0]

      const mockWaiver = {
        id: 'lw-1',
        waiver_number: 'LW-001',
        due_date: dueDateStr,
        through_date: '2025-12-01',
        payment_amount: 50000,
        waiver_type: 'conditional_progress',
        vendor_name: 'Test Vendor',
        sent_to_email: 'vendor@test.com',
        project_id: 'proj-123',
        reminder_sent_at: null,
        project: { id: 'proj-123', name: 'Test Project', project_number: 'TP-001' },
        subcontractor: { id: 's1', company_name: 'Test Sub', contact_email: 'sub@test.com' },
      }

      // Mock email failure
      vi.mocked(sendEmail).mockRejectedValueOnce(new Error('Email service error'))

      const result = await lienWaiverReminderService.sendWaiverReminder(
        mockWaiver as any,
        'first',
        mockConfig
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe('Email service error')
    })
  })

  describe('processReminders', () => {
    it('should process batch of reminders successfully', async () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 2)
      const dueDateStr = futureDate.toISOString().split('T')[0]

      const mockWaivers = [
        {
          id: 'lw-1',
          waiver_number: 'LW-001',
          due_date: dueDateStr,
          through_date: '2025-12-01',
          payment_amount: 50000,
          waiver_type: 'conditional_progress',
          vendor_name: 'Vendor 1',
          sent_to_email: 'vendor1@test.com',
          project_id: 'proj-123',
          reminder_sent_at: null,
          project: { id: 'proj-123', name: 'Project A', project_number: 'PA-001' },
          subcontractor: { id: 's1', company_name: 'Sub 1', contact_email: 'sub1@test.com' },
        },
        {
          id: 'lw-2',
          waiver_number: 'LW-002',
          due_date: dueDateStr,
          through_date: '2025-12-01',
          payment_amount: 30000,
          waiver_type: 'unconditional_progress',
          vendor_name: 'Vendor 2',
          sent_to_email: 'vendor2@test.com',
          project_id: 'proj-123',
          reminder_sent_at: null,
          project: { id: 'proj-123', name: 'Project A', project_number: 'PA-001' },
          subcontractor: { id: 's2', company_name: 'Sub 2', contact_email: 'sub2@test.com' },
        },
      ]

      // Mock getWaiversNeedingReminders
      vi.spyOn(lienWaiverReminderService, 'getWaiversNeedingReminders').mockResolvedValue(
        mockWaivers as any
      )

      // Mock sendWaiverReminder
      vi.spyOn(lienWaiverReminderService, 'sendWaiverReminder').mockResolvedValue({
        waiverId: 'lw-1',
        waiverNumber: 'LW-001',
        escalationLevel: 'second',
        recipientEmail: 'vendor@test.com',
        success: true,
      })

      const result = await lienWaiverReminderService.processReminders('comp-123', mockConfig)

      expect(result.processedCount).toBe(2)
      expect(result.sentCount).toBe(2)
      expect(result.failedCount).toBe(0)
      expect(result.skippedCount).toBe(0)
    })

    it('should skip waivers without due dates', async () => {
      const mockWaivers = [
        {
          id: 'lw-1',
          waiver_number: 'LW-001',
          due_date: null,
          project: { id: 'proj-123', name: 'Project A' },
        },
      ]

      vi.spyOn(lienWaiverReminderService, 'getWaiversNeedingReminders').mockResolvedValue(
        mockWaivers as any
      )

      const result = await lienWaiverReminderService.processReminders('comp-123', mockConfig)

      expect(result.processedCount).toBe(1)
      expect(result.sentCount).toBe(0)
      expect(result.skippedCount).toBe(1)
    })

    it('should handle partial failures in batch', async () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 2)
      const dueDateStr = futureDate.toISOString().split('T')[0]

      const mockWaivers = [
        {
          id: 'lw-1',
          waiver_number: 'LW-001',
          due_date: dueDateStr,
          through_date: '2025-12-01',
          payment_amount: 50000,
          waiver_type: 'conditional_progress',
          vendor_name: 'Vendor 1',
          sent_to_email: 'vendor1@test.com',
          project_id: 'proj-123',
          reminder_sent_at: null,
          project: { id: 'proj-123', name: 'Project A' },
        },
        {
          id: 'lw-2',
          waiver_number: 'LW-002',
          due_date: dueDateStr,
          through_date: '2025-12-01',
          payment_amount: 30000,
          waiver_type: 'unconditional_progress',
          vendor_name: 'Vendor 2',
          sent_to_email: null,
          project_id: 'proj-123',
          reminder_sent_at: null,
          project: { id: 'proj-123', name: 'Project A' },
        },
      ]

      vi.spyOn(lienWaiverReminderService, 'getWaiversNeedingReminders').mockResolvedValue(
        mockWaivers as any
      )

      vi.spyOn(lienWaiverReminderService, 'sendWaiverReminder')
        .mockResolvedValueOnce({
          waiverId: 'lw-1',
          waiverNumber: 'LW-001',
          escalationLevel: 'second',
          recipientEmail: 'vendor1@test.com',
          success: true,
        })
        .mockResolvedValueOnce({
          waiverId: 'lw-2',
          waiverNumber: 'LW-002',
          escalationLevel: 'second',
          recipientEmail: 'none',
          success: false,
          error: 'No recipient email found',
        })

      const result = await lienWaiverReminderService.processReminders('comp-123', mockConfig)

      expect(result.processedCount).toBe(2)
      expect(result.sentCount).toBe(1)
      expect(result.failedCount).toBe(1)
    })
  })

  describe('getReminderStats', () => {
    it('should calculate reminder statistics correctly', async () => {
      const today = new Date()
      const mockWaivers = [
        { due_date: new Date(today.getTime() - 86400000 * 5).toISOString().split('T')[0], status: 'pending' }, // 5 days overdue
        { due_date: new Date(today.getTime() + 86400000 * 1).toISOString().split('T')[0], status: 'pending' }, // Due in 1 day
        { due_date: new Date(today.getTime() + 86400000 * 2).toISOString().split('T')[0], status: 'sent' }, // Due in 2 days
        { due_date: new Date(today.getTime() + 86400000 * 5).toISOString().split('T')[0], status: 'pending' }, // Due in 5 days
        { due_date: new Date(today.getTime() - 86400000 * 10).toISOString().split('T')[0], status: 'pending' }, // 10 days overdue
      ]

      const selectMock = vi.fn().mockReturnThis()
      const eqMock = vi.fn().mockReturnThis()
      const inMock = vi.fn().mockReturnThis()
      const notMock = vi.fn().mockReturnThis()
      const isMock = vi.fn().mockResolvedValue({ data: mockWaivers, error: null })

      vi.mocked(supabase.from).mockReturnValue({
        select: selectMock,
      } as any)

      selectMock.mockReturnValue({ eq: eqMock })
      eqMock.mockReturnValue({ in: inMock })
      inMock.mockReturnValue({ not: notMock })
      notMock.mockReturnValue({ is: isMock })

      const stats = await lienWaiverReminderService.getReminderStats('comp-123')

      expect(stats.totalPending).toBe(5)
      expect(stats.overdue).toBe(2)
      expect(stats.oldestOverdueDays).toBe(10)
      expect(stats.dueWithin1Day).toBe(1)
      expect(stats.dueWithin3Days).toBe(1)
      expect(stats.dueWithin7Days).toBe(1)
    })

    it('should handle empty waiver list', async () => {
      const selectMock = vi.fn().mockReturnThis()
      const eqMock = vi.fn().mockReturnThis()
      const inMock = vi.fn().mockReturnThis()
      const notMock = vi.fn().mockReturnThis()
      const isMock = vi.fn().mockResolvedValue({ data: [], error: null })

      vi.mocked(supabase.from).mockReturnValue({
        select: selectMock,
      } as any)

      selectMock.mockReturnValue({ eq: eqMock })
      eqMock.mockReturnValue({ in: inMock })
      inMock.mockReturnValue({ not: notMock })
      notMock.mockReturnValue({ is: isMock })

      const stats = await lienWaiverReminderService.getReminderStats('comp-123')

      expect(stats.totalPending).toBe(0)
      expect(stats.overdue).toBe(0)
      expect(stats.oldestOverdueDays).toBe(0)
    })
  })
})
