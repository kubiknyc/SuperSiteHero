/**
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Hoist mock setup
const mockSupabase = vi.hoisted(() => ({
  from: vi.fn(),
}));

const mockGetWeatherForProject = vi.hoisted(() => vi.fn());

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: mockSupabase,
}));

// Mock weather service
vi.mock('@/features/daily-reports/services/weatherApiService', () => ({
  getWeatherForProject: mockGetWeatherForProject,
}));

// Import after mocks
import {
  createMockSupabaseQuery,
  createMockToolContext,
  expectSuccess,
} from '../../__tests__/test-utils';

describe('prefill-report', () => {
  let prefillReportTool: any;
  let mockContext: ReturnType<typeof createMockToolContext>;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockContext = createMockToolContext({ projectId: 'project-123' });
    mockGetWeatherForProject.mockResolvedValue(null);
    const module = await import('../prefill-report');
    prefillReportTool = module.prefillReportTool;
  });

  // ============================================================================
  // Tool Definition Tests
  // ============================================================================

  describe('tool definition', () => {
    it('should have correct tool metadata', () => {
      expect(prefillReportTool.name).toBe('prefill_report');
      expect(prefillReportTool.displayName).toBe('Pre-fill Daily Report');
      expect(prefillReportTool.category).toBe('report');
      expect(prefillReportTool.requiresConfirmation).toBe(false);
    });

    it('should have correct parameters schema', () => {
      const params = prefillReportTool.parameters;
      expect(params.type).toBe('object');
      expect(params.required).toContain('project_id');
      expect(params.required).toContain('date');
      expect(params.properties.include_sections.items.enum).toContain('manpower');
      expect(params.properties.include_sections.items.enum).toContain('equipment');
    });

    it('should have estimated token count', () => {
      expect(prefillReportTool.estimatedTokens).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // Basic Prefill Tests
  // ============================================================================

  describe('basic prefill', () => {
    it('should prefill from previous report', async () => {
      const previousReport = {
        id: 'report-1',
        report_date: '2024-01-15',
        work_completed: 'Electrical rough-in',
        work_planned: 'Continue electrical work\nStart HVAC installation',
        issues: 'Material shortage for panels',
        visitors: 'Owner visit scheduled',
      };

      const laborData = [
        { trade: 'Electrical', company: 'ABC Electric', headcount: 8, hours_worked: 8 },
        { trade: 'Plumbing', company: 'XYZ Plumbing', headcount: 4, hours_worked: 8 },
      ];

      const equipmentData = [
        { equipment_type: 'Forklift', quantity: 2, status: 'active' },
      ];

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'daily_reports') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                lt: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    limit: vi.fn().mockReturnValue({
                      single: vi.fn().mockResolvedValue({ data: previousReport, error: null }),
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'daily_report_labor') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: laborData, error: null }),
            }),
          };
        }
        if (table === 'daily_report_equipment') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: equipmentData, error: null }),
            }),
          };
        }
        if (table === 'schedule_activities') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                lte: vi.fn().mockReturnValue({
                  gte: vi.fn().mockReturnValue({
                    neq: vi.fn().mockReturnValue({
                      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        return createMockSupabaseQuery({ data: null, error: null });
      });

      const result = await prefillReportTool.execute(
        { project_id: 'project-123', date: '2024-01-16' },
        mockContext
      );

      expectSuccess(result);
      expect(result.data.prefilled_report.manpower.length).toBe(2);
      expect(result.data.prefilled_report.equipment.length).toBe(1);
      expect(result.data.prefilled_report.open_items).toContain('Material shortage for panels');
    });

    it('should handle no previous report', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'daily_reports') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                lt: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    limit: vi.fn().mockReturnValue({
                      single: vi.fn().mockResolvedValue({ data: null, error: null }),
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'schedule_activities') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                lte: vi.fn().mockReturnValue({
                  gte: vi.fn().mockReturnValue({
                    neq: vi.fn().mockReturnValue({
                      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        return createMockSupabaseQuery({ data: null, error: null });
      });

      const result = await prefillReportTool.execute(
        { project_id: 'project-123', date: '2024-01-16' },
        mockContext
      );

      expectSuccess(result);
      expect(result.data.prefilled_report.manpower).toEqual([]);
      expect(result.data.confidence_scores.manpower).toBeLessThan(0.5);
    });
  });

  // ============================================================================
  // Carryover Activities Tests
  // ============================================================================

  describe('carryover activities', () => {
    it('should carry over planned work as activities', async () => {
      const previousReport = {
        id: 'report-1',
        report_date: '2024-01-15',
        work_planned: 'Install electrical panels\nRun conduit to floor 2',
        issues: '',
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'daily_reports') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                lt: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    limit: vi.fn().mockReturnValue({
                      single: vi.fn().mockResolvedValue({ data: previousReport, error: null }),
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'daily_report_labor' || table === 'daily_report_equipment') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          };
        }
        if (table === 'schedule_activities') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                lte: vi.fn().mockReturnValue({
                  gte: vi.fn().mockReturnValue({
                    neq: vi.fn().mockReturnValue({
                      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        return createMockSupabaseQuery({ data: null, error: null });
      });

      const result = await prefillReportTool.execute(
        { project_id: 'project-123', date: '2024-01-16', include_sections: ['activities'] },
        mockContext
      );

      expectSuccess(result);
      expect(result.data.prefilled_report.work_activities.length).toBeGreaterThan(0);
      expect(result.data.prefilled_report.work_activities[0].carryover).toBe(true);
    });

    it('should extract trade from activity description', async () => {
      const previousReport = {
        id: 'report-1',
        report_date: '2024-01-15',
        work_planned: 'Concrete pour for foundation',
        issues: '',
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'daily_reports') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                lt: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    limit: vi.fn().mockReturnValue({
                      single: vi.fn().mockResolvedValue({ data: previousReport, error: null }),
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'daily_report_labor' || table === 'daily_report_equipment') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          };
        }
        if (table === 'schedule_activities') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                lte: vi.fn().mockReturnValue({
                  gte: vi.fn().mockReturnValue({
                    neq: vi.fn().mockReturnValue({
                      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        return createMockSupabaseQuery({ data: null, error: null });
      });

      const result = await prefillReportTool.execute(
        { project_id: 'project-123', date: '2024-01-16', include_sections: ['activities'] },
        mockContext
      );

      expectSuccess(result);
      expect(result.data.prefilled_report.work_activities[0].trade).toBe('Concrete');
    });
  });

  // ============================================================================
  // Schedule Integration Tests
  // ============================================================================

  describe('schedule integration', () => {
    it('should add scheduled activities when no previous labor data', async () => {
      const scheduleActivities = [
        {
          name: 'Electrical rough-in floor 2',
          subcontractor_id: 'sub-1',
          subcontractors: { company_name: 'ABC Electric', trade: 'Electrical' },
        },
        {
          name: 'Plumbing installation',
          subcontractor_id: 'sub-2',
          subcontractors: { company_name: 'XYZ Plumbing', trade: 'Plumbing' },
        },
      ];

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'daily_reports') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                lt: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    limit: vi.fn().mockReturnValue({
                      single: vi.fn().mockResolvedValue({ data: null, error: null }),
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'schedule_activities') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                lte: vi.fn().mockReturnValue({
                  gte: vi.fn().mockReturnValue({
                    neq: vi.fn().mockReturnValue({
                      limit: vi.fn().mockResolvedValue({ data: scheduleActivities, error: null }),
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        return createMockSupabaseQuery({ data: null, error: null });
      });

      const result = await prefillReportTool.execute(
        { project_id: 'project-123', date: '2024-01-16', include_sections: ['manpower'] },
        mockContext
      );

      expectSuccess(result);
      expect(result.data.prefilled_report.manpower.length).toBeGreaterThan(0);
      expect(result.data.prefilled_report.manpower[0].basis).toBe('schedule');
    });
  });

  // ============================================================================
  // Weather Integration Tests
  // ============================================================================

  describe('weather integration', () => {
    it('should include weather data when available', async () => {
      mockGetWeatherForProject.mockResolvedValue({
        conditions: 'Clear',
        temperature: 75,
        humidity: 45,
        windSpeed: 10,
        windDirection: 'NW',
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'daily_reports') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                lt: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    limit: vi.fn().mockReturnValue({
                      single: vi.fn().mockResolvedValue({ data: null, error: null }),
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'schedule_activities') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                lte: vi.fn().mockReturnValue({
                  gte: vi.fn().mockReturnValue({
                    neq: vi.fn().mockReturnValue({
                      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        return createMockSupabaseQuery({ data: null, error: null });
      });

      const result = await prefillReportTool.execute(
        { project_id: 'project-123', date: '2024-01-16' },
        mockContext
      );

      expectSuccess(result);
      expect(result.data.prefilled_report.weather).toBeDefined();
      expect(result.data.prefilled_report.weather?.conditions).toBe('Clear');
      expect(result.data.prefilled_report.weather?.temperature_high).toBe(75);
    });

    it('should add verification item when weather unavailable', async () => {
      mockGetWeatherForProject.mockResolvedValue(null);

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'daily_reports') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                lt: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    limit: vi.fn().mockReturnValue({
                      single: vi.fn().mockResolvedValue({ data: null, error: null }),
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'schedule_activities') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                lte: vi.fn().mockReturnValue({
                  gte: vi.fn().mockReturnValue({
                    neq: vi.fn().mockReturnValue({
                      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        return createMockSupabaseQuery({ data: null, error: null });
      });

      const result = await prefillReportTool.execute(
        { project_id: 'project-123', date: '2024-01-16' },
        mockContext
      );

      expectSuccess(result);
      expect(result.data.requires_verification).toContain('Add weather conditions manually');
    });
  });

  // ============================================================================
  // Confidence Score Tests
  // ============================================================================

  describe('confidence scores', () => {
    it('should have high confidence when using yesterday data', async () => {
      const laborData = [
        { trade: 'Electrical', company: 'ABC Electric', headcount: 8, hours_worked: 8 },
      ];

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'daily_reports') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                lt: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    limit: vi.fn().mockReturnValue({
                      single: vi.fn().mockResolvedValue({
                        data: { id: 'report-1', report_date: '2024-01-15' },
                        error: null,
                      }),
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'daily_report_labor') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: laborData, error: null }),
            }),
          };
        }
        if (table === 'daily_report_equipment') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          };
        }
        if (table === 'schedule_activities') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                lte: vi.fn().mockReturnValue({
                  gte: vi.fn().mockReturnValue({
                    neq: vi.fn().mockReturnValue({
                      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        return createMockSupabaseQuery({ data: null, error: null });
      });

      const result = await prefillReportTool.execute(
        { project_id: 'project-123', date: '2024-01-16' },
        mockContext
      );

      expectSuccess(result);
      expect(result.data.confidence_scores.manpower).toBe(0.9);
    });

    it('should have lower confidence when using schedule data', async () => {
      const scheduleActivities = [
        { name: 'Electrical work', subcontractors: { trade: 'Electrical' } },
      ];

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'daily_reports') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                lt: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    limit: vi.fn().mockReturnValue({
                      single: vi.fn().mockResolvedValue({ data: null, error: null }),
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'schedule_activities') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                lte: vi.fn().mockReturnValue({
                  gte: vi.fn().mockReturnValue({
                    neq: vi.fn().mockReturnValue({
                      limit: vi.fn().mockResolvedValue({ data: scheduleActivities, error: null }),
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        return createMockSupabaseQuery({ data: null, error: null });
      });

      const result = await prefillReportTool.execute(
        { project_id: 'project-123', date: '2024-01-16' },
        mockContext
      );

      expectSuccess(result);
      expect(result.data.confidence_scores.manpower).toBe(0.6);
    });
  });

  // ============================================================================
  // Output Formatting Tests
  // ============================================================================

  describe('formatOutput', () => {
    it('should format output with success status for high confidence', () => {
      const output = {
        prefilled_report: {
          date: '2024-01-16',
          weather: { conditions: 'Clear', temperature_high: 75, temperature_low: 55, humidity: 45, wind_speed: 10, wind_direction: 'NW' },
          work_activities: [{ trade: 'Electrical', description: 'Work', location: 'TBD', suggested_workers: 4, carryover: false }],
          manpower: [{ trade: 'Electrical', company: 'ABC', expected_headcount: 8, basis: 'yesterday' as const }],
          equipment: [],
          open_items: [],
        },
        confidence_scores: { manpower: 0.9, activities: 0.8, equipment: 0.8 },
        requires_verification: [],
      };

      const formatted = prefillReportTool.formatOutput(output);

      expect(formatted.title).toBe('Report Pre-filled');
      // avgConfidence = (0.9 + 0.8 + 0.8) / 3 = 0.833 > 0.7 = 'success'
      expect(formatted.status).toBe('success');
      expect(formatted.summary).toContain('1 activities');
      expect(formatted.summary).toContain('1 trades');
    });

    it('should format output with warning status for low confidence', () => {
      const output = {
        prefilled_report: {
          date: '2024-01-16',
          work_activities: [],
          manpower: [],
          equipment: [],
          open_items: [],
        },
        confidence_scores: { manpower: 0.3, activities: 0.4, equipment: 0.3 },
        requires_verification: ['Verify manpower'],
      };

      const formatted = prefillReportTool.formatOutput(output);

      expect(formatted.status).toBe('warning');
    });
  });
});
