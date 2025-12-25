import { vi } from 'vitest'

// Note: describe, it, expect, beforeEach, afterEach are available as globals (vitest config has globals: true)
import { supabase } from '@/lib/supabase'
import { equipmentDailyStatusApi, equipmentChecklistTemplatesApi } from '../equipment-daily-status'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: { getUser: vi.fn() },
    rpc: vi.fn(),
  },
}))

describe('Equipment Daily Status API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user123' } },
      error: null,
    } as any)
  })

  describe('getStatusByReport', () => {
    it('should fetch equipment status for daily report', async () => {
      const mockStatus = [
        { id: '1', equipment_id: 'eq1', daily_report_id: 'report1', status: 'operational' },
        { id: '2', equipment_id: 'eq2', daily_report_id: 'report1', status: 'down' },
      ]

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockStatus, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await equipmentDailyStatusApi.getStatusByReport('report1')

      expect(result).toHaveLength(2)
      expect(mockQuery.eq).toHaveBeenCalledWith('daily_report_id', 'report1')
    })
  })

  describe('createStatus', () => {
    it('should create equipment daily status', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user123' } },
        error: null,
      } as any)

      const mockUserQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { company_id: 'comp1' },
          error: null
        }),
      }

      const mockStatusQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'status1', equipment_id: 'eq1', status: 'not_checked' },
          error: null
        }),
      }

      vi.mocked(supabase.from)
        .mockReturnValueOnce(mockUserQuery as any)
        .mockReturnValueOnce(mockStatusQuery as any)

      const result = await equipmentDailyStatusApi.createStatus({
        equipment_id: 'eq1',
        daily_report_id: 'report1',
        project_id: 'proj1',
      })

      expect(result.id).toBe('status1')
    })

    it('should throw error when user company not found', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user123' } },
        error: null,
      } as any)

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: null
        }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      await expect(
        equipmentDailyStatusApi.createStatus({
          equipment_id: 'eq1',
          daily_report_id: 'report1',
          project_id: 'proj1',
        })
      ).rejects.toThrow('User company not found')
    })
  })

  describe('updateStatus', () => {
    it('should update equipment status', async () => {
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'status1', status: 'operational', hours_used: 8.5 },
          error: null
        }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await equipmentDailyStatusApi.updateStatus('status1', {
        status: 'operational',
        hours_used: 8.5,
      })

      expect(result.hours_used).toBe(8.5)
    })
  })

  describe('completeChecklist', () => {
    it('should complete equipment checklist', async () => {
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'status1',
            checklist_completed: true,
            requires_maintenance: true,
          },
          error: null
        }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await equipmentDailyStatusApi.completeChecklist('status1', {
        inspection_items: { engine: 'good', hydraulics: 'needs_attention' },
        status: 'operational',
        issues_found: 'Hydraulic leak detected',
        issue_severity: 'medium',
        requires_maintenance: true,
        maintenance_notes: 'Schedule hydraulic system check',
      })

      expect(result.checklist_completed).toBe(true)
      expect(result.requires_maintenance).toBe(true)
    })
  })

  describe('getSummary', () => {
    it('should get equipment summary for daily report', async () => {
      const mockSummary = {
        total_equipment: 10,
        operational: 8,
        down: 1,
        not_checked: 1,
      }

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: mockSummary,
        error: null,
      })

      const result = await equipmentDailyStatusApi.getSummary('report1')

      expect(result.total_equipment).toBe(10)
      expect(supabase.rpc).toHaveBeenCalledWith('get_daily_report_equipment_summary', {
        p_daily_report_id: 'report1',
      })
    })
  })

  describe('copyFromPreviousDay', () => {
    it('should copy equipment from previous day', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: 5,
        error: null,
      })

      const result = await equipmentDailyStatusApi.copyFromPreviousDay('report2', 'proj1')

      expect(result).toBe(5)
    })
  })

  describe('getMaintenanceAlerts', () => {
    it('should get maintenance alerts for project', async () => {
      const mockAlerts = [
        { equipment_id: 'eq1', alert_type: 'overdue', message: 'Maintenance overdue' },
      ]

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: mockAlerts,
        error: null,
      })

      const result = await equipmentDailyStatusApi.getMaintenanceAlerts('proj1')

      expect(result).toHaveLength(1)
    })
  })

  describe('batchCreateStatus', () => {
    it('should batch create equipment status entries', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user123' } },
        error: null,
      } as any)

      const mockUserQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { company_id: 'comp1' },
          error: null
        }),
      }

      const mockBatchQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({
          data: [
            { equipment_id: 'eq1', status: 'not_checked' },
            { equipment_id: 'eq2', status: 'not_checked' },
          ],
          error: null
        }),
      }

      vi.mocked(supabase.from)
        .mockReturnValueOnce(mockUserQuery as any)
        .mockReturnValueOnce(mockBatchQuery as any)

      const result = await equipmentDailyStatusApi.batchCreateStatus(
        'report1',
        'proj1',
        ['eq1', 'eq2']
      )

      expect(result).toHaveLength(2)
    })
  })
})

describe('Equipment Checklist Templates API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getTemplates', () => {
    it('should fetch active checklist templates', async () => {
      const mockTemplates = [
        { id: '1', name: 'Excavator Checklist', is_default: true },
        { id: '2', name: 'Crane Checklist', is_default: false },
      ]

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        mockResolvedValue: vi.fn().mockResolvedValue({ data: mockTemplates, error: null }),
      }

      mockQuery.order.mockReturnValue({
        ...mockQuery,
        order: vi.fn().mockResolvedValue({ data: mockTemplates, error: null }),
      })

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await equipmentChecklistTemplatesApi.getTemplates()

      expect(result).toBeDefined()
    })
  })

  describe('getTemplateForEquipmentType', () => {
    it('should get template for specific equipment type', async () => {
      const mockTemplate = {
        id: '1',
        name: 'Excavator Checklist',
        equipment_type: 'excavator',
        items: ['engine_check', 'hydraulics', 'tracks'],
      }

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockTemplate, error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      const result = await equipmentChecklistTemplatesApi.getTemplateForEquipmentType('excavator')

      expect(result?.equipment_type).toBe('excavator')
    })

    it('should fallback to default template if specific not found', async () => {
      const mockDefault = {
        id: '2',
        name: 'Default Checklist',
        equipment_type: null,
        is_default: true,
      }

      const mockQuery1 = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      }

      const mockQuery2 = {
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockDefault, error: null }),
      }

      vi.mocked(supabase.from)
        .mockReturnValueOnce(mockQuery1 as any)
        .mockReturnValueOnce(mockQuery2 as any)

      const result = await equipmentChecklistTemplatesApi.getTemplateForEquipmentType('unknown_type')

      expect(result?.is_default).toBe(true)
    })
  })

  describe('createTemplate', () => {
    it('should create new checklist template', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user123' } },
        error: null,
      } as any)

      const mockUserQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { company_id: 'comp1' },
          error: null
        }),
      }

      const mockTemplateQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'tmpl1', name: 'New Template' },
          error: null
        }),
      }

      vi.mocked(supabase.from)
        .mockReturnValueOnce(mockUserQuery as any)
        .mockReturnValueOnce(mockTemplateQuery as any)

      const result = await equipmentChecklistTemplatesApi.createTemplate({
        name: 'New Template',
        items: ['item1', 'item2'],
      })

      expect(result.name).toBe('New Template')
    })
  })

  describe('deleteTemplate', () => {
    it('should soft delete template by setting is_active to false', async () => {
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      }

      vi.mocked(supabase.from).mockReturnValue(mockQuery as any)

      await equipmentChecklistTemplatesApi.deleteTemplate('tmpl1')

      expect(mockQuery.update).toHaveBeenCalledWith({ is_active: false })
    })
  })
})
