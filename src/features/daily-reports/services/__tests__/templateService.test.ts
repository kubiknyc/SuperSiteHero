/**
 * Template Service Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getTemplatesForProject,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  createTemplateFromReport,
  applyTemplate,
  copyFromPreviousDay,
} from '../templateService';
import type {
  DailyReportTemplate,
  WorkforceEntryV2,
  EquipmentEntryV2,
} from '@/types/daily-reports-v2';

// Mock supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('templateService', () => {
  let mockSupabase: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const { supabase } = await import('@/lib/supabase');
    mockSupabase = supabase;
  });

  describe('getTemplatesForProject', () => {
    it('should fetch templates for a project', async () => {
      const mockTemplates: DailyReportTemplate[] = [
        {
          id: 'template-1',
          project_id: 'proj-1',
          user_id: 'user-1',
          name: 'Standard Crew',
          description: 'Standard weekday crew configuration',
          is_default: false,
          workforce_template: [],
          equipment_template: [],
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
        },
      ];

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          or: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: mockTemplates, error: null }),
          }),
        }),
      });

      const result = await getTemplatesForProject('proj-1');
      expect(result).toEqual(mockTemplates);
      expect(mockSupabase.from).toHaveBeenCalledWith('daily_report_templates');
    });

    it('should handle errors', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          or: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: null,
              error: new Error('Database error'),
            }),
          }),
        }),
      });

      await expect(getTemplatesForProject('proj-1')).rejects.toThrow();
    });

    it('should return empty array when no templates found', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          or: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      });

      const result = await getTemplatesForProject('proj-1');
      expect(result).toEqual([]);
    });
  });

  describe('getTemplate', () => {
    it('should fetch a single template by ID', async () => {
      const mockTemplate: DailyReportTemplate = {
        id: 'template-1',
        project_id: 'proj-1',
        user_id: 'user-1',
        name: 'Test Template',
        is_default: false,
        workforce_template: [],
        equipment_template: [],
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockTemplate, error: null }),
          }),
        }),
      });

      const result = await getTemplate('template-1');
      expect(result).toEqual(mockTemplate);
    });

    it('should return null when template not found', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: new Error('Not found'),
            }),
          }),
        }),
      });

      const result = await getTemplate('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('createTemplate', () => {
    it('should create a new template', async () => {
      const newTemplate = {
        project_id: 'proj-1',
        user_id: 'user-1',
        name: 'New Template',
        is_default: false,
        workforce_template: [],
        equipment_template: [],
      };

      const createdTemplate: DailyReportTemplate = {
        id: 'template-new',
        ...newTemplate,
        created_at: '2025-01-27T00:00:00Z',
        updated_at: '2025-01-27T00:00:00Z',
      };

      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: createdTemplate, error: null }),
          }),
        }),
      });

      const result = await createTemplate(newTemplate);
      expect(result).toEqual(createdTemplate);
      expect(mockSupabase.from).toHaveBeenCalledWith('daily_report_templates');
    });

    it('should handle creation errors', async () => {
      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: new Error('Insert failed'),
            }),
          }),
        }),
      });

      await expect(
        createTemplate({
          project_id: 'proj-1',
          user_id: 'user-1',
          name: 'Test',
          is_default: false,
          workforce_template: [],
          equipment_template: [],
        })
      ).rejects.toThrow();
    });
  });

  describe('updateTemplate', () => {
    it('should update an existing template', async () => {
      const updates = {
        name: 'Updated Template',
        description: 'New description',
      };

      const updatedTemplate: DailyReportTemplate = {
        id: 'template-1',
        project_id: 'proj-1',
        user_id: 'user-1',
        ...updates,
        is_default: false,
        workforce_template: [],
        equipment_template: [],
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-27T00:00:00Z',
      };

      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: updatedTemplate, error: null }),
            }),
          }),
        }),
      });

      const result = await updateTemplate('template-1', updates);
      expect(result.name).toBe('Updated Template');
      expect(result.description).toBe('New description');
    });
  });

  describe('deleteTemplate', () => {
    it('should delete a template', async () => {
      mockSupabase.from.mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      });

      await expect(deleteTemplate('template-1')).resolves.not.toThrow();
    });

    it('should handle deletion errors', async () => {
      mockSupabase.from.mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: new Error('Delete failed') }),
        }),
      });

      await expect(deleteTemplate('template-1')).rejects.toThrow();
    });
  });

  describe('createTemplateFromReport', () => {
    it('should create template from report data', async () => {
      const workforce: WorkforceEntryV2[] = [
        {
          id: 'wf-1',
          daily_report_id: 'report-1',
          entry_type: 'company_crew',
          company_name: 'ABC Construction',
          trade: 'Carpentry',
          worker_count: 5,
          hours_worked: 8,
          work_area: 'Level 3',
          cost_code: 'CC-001',
          created_at: '2025-01-27T00:00:00Z',
        },
      ];

      const equipment: EquipmentEntryV2[] = [
        {
          id: 'eq-1',
          daily_report_id: 'report-1',
          equipment_type: 'Excavator',
          equipment_id: 'EXC-001',
          quantity: 1,
          owner_type: 'owned',
          hours_used: 8,
          operator_name: 'John Doe',
          work_area: 'Site A',
          cost_code: 'CC-002',
          created_at: '2025-01-27T00:00:00Z',
        },
      ];

      const createdTemplate: DailyReportTemplate = {
        id: 'template-new',
        project_id: 'proj-1',
        user_id: 'user-1',
        name: 'From Report',
        is_default: false,
        workforce_template: [
          {
            entry_type: 'company_crew',
            company_name: 'ABC Construction',
            trade: 'Carpentry',
            worker_count: 5,
            hours_worked: 8,
            work_area: 'Level 3',
            cost_code: 'CC-001',
          },
        ],
        equipment_template: [
          {
            equipment_type: 'Excavator',
            equipment_id: 'EXC-001',
            owner_type: 'owned',
            hours_used: 8,
            operator_name: 'John Doe',
            work_area: 'Site A',
            cost_code: 'CC-002',
          },
        ],
        created_at: '2025-01-27T00:00:00Z',
        updated_at: '2025-01-27T00:00:00Z',
      };

      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: createdTemplate, error: null }),
          }),
        }),
      });

      const result = await createTemplateFromReport(
        'From Report',
        'proj-1',
        workforce,
        equipment
      );

      expect(result.workforce_template).toHaveLength(1);
      expect(result.equipment_template).toHaveLength(1);
      // Should not include IDs
      expect(result.workforce_template[0]).not.toHaveProperty('id');
      expect(result.equipment_template[0]).not.toHaveProperty('id');
    });
  });

  describe('applyTemplate', () => {
    it('should apply template to get workforce and equipment entries', () => {
      const template: DailyReportTemplate = {
        id: 'template-1',
        project_id: 'proj-1',
        user_id: 'user-1',
        name: 'Test Template',
        is_default: false,
        workforce_template: [
          {
            entry_type: 'company_crew',
            company_name: 'ABC Construction',
            trade: 'Carpentry',
            worker_count: 5,
          },
        ],
        equipment_template: [
          {
            equipment_type: 'Excavator',
            owner_type: 'owned',
          },
        ],
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };

      const result = applyTemplate(template);

      expect(result.workforce).toHaveLength(1);
      expect(result.workforce[0].entry_type).toBe('company_crew');
      expect(result.workforce[0].company_name).toBe('ABC Construction');
      expect(result.workforce[0].hours_worked).toBe(8); // Default value

      expect(result.equipment).toHaveLength(1);
      expect(result.equipment[0].equipment_type).toBe('Excavator');
      expect(result.equipment[0].owner_type).toBe('owned');
      expect(result.equipment[0].hours_used).toBe(8); // Default value
    });

    it('should handle empty templates', () => {
      const template: DailyReportTemplate = {
        id: 'template-1',
        project_id: 'proj-1',
        user_id: 'user-1',
        name: 'Empty Template',
        is_default: false,
        workforce_template: [],
        equipment_template: [],
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };

      const result = applyTemplate(template);

      expect(result.workforce).toHaveLength(0);
      expect(result.equipment).toHaveLength(0);
    });

    it('should apply default values for missing fields', () => {
      const template: DailyReportTemplate = {
        id: 'template-1',
        project_id: 'proj-1',
        user_id: 'user-1',
        name: 'Minimal Template',
        is_default: false,
        workforce_template: [
          {
            company_name: 'Test Co',
          },
        ],
        equipment_template: [
          {
            equipment_type: 'Forklift',
          },
        ],
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };

      const result = applyTemplate(template);

      expect(result.workforce[0].entry_type).toBe('company_crew');
      expect(result.workforce[0].hours_worked).toBe(8);
      expect(result.equipment[0].owner_type).toBe('owned');
      expect(result.equipment[0].hours_used).toBe(8);
    });
  });

  describe('copyFromPreviousDay', () => {
    // Helper to create a chainable supabase mock
    const createChainableMock = (finalResult: { data: any; error: any }) => {
      const chain: any = {};
      chain.select = vi.fn(() => chain);
      chain.eq = vi.fn(() => chain);
      chain.single = vi.fn().mockResolvedValue(finalResult);
      // For direct data fetch (without single)
      chain.then = (resolve: any) => resolve(finalResult);
      return chain;
    };

    it('should copy workforce and equipment from previous day', async () => {
      const mockReport = { id: 'report-prev' };
      const mockWorkforce = [
        {
          id: 'wf-1',
          daily_report_id: 'report-prev',
          entry_type: 'company_crew',
          company_name: 'ABC Construction',
          trade: 'Carpentry',
          worker_count: 5,
          hours_worked: 8,
        },
      ];
      const mockEquipment = [
        {
          id: 'eq-1',
          daily_report_id: 'report-prev',
          equipment_type: 'Excavator',
          owner_type: 'owned',
          hours_used: 8,
        },
      ];

      // Track which table is being queried
      let callCount = 0;
      mockSupabase.from.mockImplementation((table: string) => {
        callCount++;
        if (table === 'daily_reports') {
          // Report fetch chain: from().select().eq().eq().single()
          return createChainableMock({ data: mockReport, error: null });
        } else if (table === 'daily_report_workforce') {
          // Workforce fetch: from().select().eq() -> returns array
          const chain: any = {};
          chain.select = vi.fn(() => chain);
          chain.eq = vi.fn().mockResolvedValue({ data: mockWorkforce, error: null });
          return chain;
        } else if (table === 'daily_report_equipment') {
          // Equipment fetch: from().select().eq() -> returns array
          const chain: any = {};
          chain.select = vi.fn(() => chain);
          chain.eq = vi.fn().mockResolvedValue({ data: mockEquipment, error: null });
          return chain;
        }
        return createChainableMock({ data: null, error: null });
      });

      const result = await copyFromPreviousDay('proj-1', '2025-01-28');

      expect(result).toBeDefined();
      expect(result?.workforce).toHaveLength(1);
      expect(result?.equipment).toHaveLength(1);
      // Should not include IDs
      expect(result?.workforce[0]).not.toHaveProperty('id');
      expect(result?.equipment[0]).not.toHaveProperty('id');
    });

    it('should return null when no previous day data exists', async () => {
      // Mock all calls to return not found for report
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'daily_reports') {
          return createChainableMock({ data: null, error: new Error('Not found') });
        }
        // For workforce/equipment tables, return empty (shouldn't reach here)
        const chain: any = {};
        chain.select = vi.fn(() => chain);
        chain.eq = vi.fn().mockResolvedValue({ data: [], error: null });
        return chain;
      });

      const result = await copyFromPreviousDay('proj-1', '2025-01-28');
      expect(result).toBeNull();
    });
  });
});
