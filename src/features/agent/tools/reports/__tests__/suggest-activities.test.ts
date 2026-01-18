/**
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Hoist mock setup
const mockSupabase = vi.hoisted(() => ({
  from: vi.fn(),
}));

const mockGetWeatherForProject = vi.hoisted(() => vi.fn());
const mockAnalyzeWeatherImpact = vi.hoisted(() => vi.fn());

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: mockSupabase,
}));

// Mock weather service
vi.mock('@/features/daily-reports/services/weatherApiService', () => ({
  getWeatherForProject: mockGetWeatherForProject,
  analyzeWeatherImpact: mockAnalyzeWeatherImpact,
}));

// Import after mocks
import {
  createMockSupabaseQuery,
  createMockToolContext,
  expectSuccess,
} from '../../__tests__/test-utils';

describe('suggest-activities', () => {
  let suggestActivitiesTool: any;
  let mockContext: ReturnType<typeof createMockToolContext>;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockContext = createMockToolContext({ projectId: 'project-123' });
    mockGetWeatherForProject.mockResolvedValue(null);
    mockAnalyzeWeatherImpact.mockReturnValue({ severity: 'none' });
    const module = await import('../suggest-activities');
    suggestActivitiesTool = module.suggestActivitiesTool;
  });

  // ============================================================================
  // Tool Definition Tests
  // ============================================================================

  describe('tool definition', () => {
    it('should have correct tool metadata', () => {
      expect(suggestActivitiesTool.name).toBe('suggest_activities');
      expect(suggestActivitiesTool.displayName).toBe('Suggest Daily Activities');
      expect(suggestActivitiesTool.category).toBe('report');
      expect(suggestActivitiesTool.requiresConfirmation).toBe(false);
    });

    it('should have correct parameters schema', () => {
      const params = suggestActivitiesTool.parameters;
      expect(params.type).toBe('object');
      expect(params.required).toContain('project_id');
      expect(params.required).toContain('date');
      expect(params.properties.include_yesterday.type).toBe('boolean');
      expect(params.properties.consider_weather.type).toBe('boolean');
    });

    it('should have estimated token count', () => {
      expect(suggestActivitiesTool.estimatedTokens).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // Scheduled Activities Tests
  // ============================================================================

  describe('scheduled activities', () => {
    it('should return scheduled activities for the date', async () => {
      const scheduleActivities = [
        {
          id: 'act-1',
          activity_id: 'ACT-001',
          name: 'Electrical rough-in floor 2',
          planned_start: '2024-01-16',
          planned_finish: '2024-01-20',
          percent_complete: 50,
          status: 'in_progress',
          is_critical: true,
          subcontractor_id: 'sub-1',
          subcontractors: { company_name: 'ABC Electric', trade: 'Electrical' },
        },
        {
          id: 'act-2',
          activity_id: 'ACT-002',
          name: 'Plumbing installation',
          planned_start: '2024-01-15',
          planned_finish: '2024-01-18',
          percent_complete: 30,
          status: 'in_progress',
          is_critical: false,
          subcontractor_id: 'sub-2',
          subcontractors: { company_name: 'XYZ Plumbing', trade: 'Plumbing' },
        },
      ];

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'schedule_activities') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                lte: vi.fn().mockReturnValue({
                  gte: vi.fn().mockReturnValue({
                    neq: vi.fn().mockReturnValue({
                      order: vi.fn().mockReturnValue({
                        order: vi.fn().mockReturnValue({
                          limit: vi.fn().mockResolvedValue({ data: scheduleActivities, error: null }),
                        }),
                      }),
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'daily_reports') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: null, error: null }),
                }),
              }),
            }),
          };
        }
        return createMockSupabaseQuery({ data: null, error: null });
      });

      const result = await suggestActivitiesTool.execute(
        { project_id: 'project-123', date: '2024-01-16' },
        mockContext
      );

      expectSuccess(result);
      expect(result.data.scheduled_activities.length).toBe(2);
      expect(result.data.scheduled_activities[0].name).toBe('Electrical rough-in floor 2');
      expect(result.data.scheduled_activities[0].expected_trades).toContain('Electrical');
    });

    it('should extract trades from activity names when subcontractor missing', async () => {
      const scheduleActivities = [
        {
          id: 'act-1',
          activity_id: 'ACT-001',
          name: 'Concrete pour for foundation',
          planned_start: '2024-01-16',
          planned_finish: '2024-01-16',
          status: 'pending',
          is_critical: false,
          subcontractors: null,
        },
      ];

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'schedule_activities') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                lte: vi.fn().mockReturnValue({
                  gte: vi.fn().mockReturnValue({
                    neq: vi.fn().mockReturnValue({
                      order: vi.fn().mockReturnValue({
                        order: vi.fn().mockReturnValue({
                          limit: vi.fn().mockResolvedValue({ data: scheduleActivities, error: null }),
                        }),
                      }),
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'daily_reports') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: null, error: null }),
                }),
              }),
            }),
          };
        }
        return createMockSupabaseQuery({ data: null, error: null });
      });

      const result = await suggestActivitiesTool.execute(
        { project_id: 'project-123', date: '2024-01-16' },
        mockContext
      );

      expectSuccess(result);
      expect(result.data.scheduled_activities[0].expected_trades).toContain('Concrete');
    });

    it('should estimate manpower based on activity type', async () => {
      const scheduleActivities = [
        {
          id: 'act-1',
          name: 'Concrete pour',
          planned_start: '2024-01-16',
          planned_finish: '2024-01-16',
          status: 'pending',
          is_critical: false,
        },
        {
          id: 'act-2',
          name: 'Electrical work',
          planned_start: '2024-01-16',
          planned_finish: '2024-01-16',
          status: 'pending',
          is_critical: false,
        },
      ];

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'schedule_activities') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                lte: vi.fn().mockReturnValue({
                  gte: vi.fn().mockReturnValue({
                    neq: vi.fn().mockReturnValue({
                      order: vi.fn().mockReturnValue({
                        order: vi.fn().mockReturnValue({
                          limit: vi.fn().mockResolvedValue({ data: scheduleActivities, error: null }),
                        }),
                      }),
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'daily_reports') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: null, error: null }),
                }),
              }),
            }),
          };
        }
        return createMockSupabaseQuery({ data: null, error: null });
      });

      const result = await suggestActivitiesTool.execute(
        { project_id: 'project-123', date: '2024-01-16' },
        mockContext
      );

      expectSuccess(result);
      // Concrete pour should have more workers than electrical
      const concretePour = result.data.scheduled_activities.find((a: any) => a.name === 'Concrete pour');
      const electrical = result.data.scheduled_activities.find((a: any) => a.name === 'Electrical work');
      expect(concretePour.expected_manpower).toBe(8);
      expect(electrical.expected_manpower).toBe(4);
    });
  });

  // ============================================================================
  // Carryover Activities Tests
  // ============================================================================

  describe('carryover activities', () => {
    it('should include carryover from previous day', async () => {
      const yesterdayReport = {
        id: 'report-1',
        work_planned: 'Complete framing in Building A\nStart drywall installation',
        issues: 'Material delay',
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'schedule_activities') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                lte: vi.fn().mockReturnValue({
                  gte: vi.fn().mockReturnValue({
                    neq: vi.fn().mockReturnValue({
                      order: vi.fn().mockReturnValue({
                        order: vi.fn().mockReturnValue({
                          limit: vi.fn().mockResolvedValue({ data: [], error: null }),
                        }),
                      }),
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'daily_reports') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: yesterdayReport, error: null }),
                }),
              }),
            }),
          };
        }
        return createMockSupabaseQuery({ data: null, error: null });
      });

      const result = await suggestActivitiesTool.execute(
        { project_id: 'project-123', date: '2024-01-16', include_yesterday: true },
        mockContext
      );

      expectSuccess(result);
      expect(result.data.carryover_activities.length).toBe(2);
      expect(result.data.carryover_activities[0].yesterday_progress).toBe('Carried over from previous day');
    });

    it('should not include carryover when include_yesterday is false', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'schedule_activities') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                lte: vi.fn().mockReturnValue({
                  gte: vi.fn().mockReturnValue({
                    neq: vi.fn().mockReturnValue({
                      order: vi.fn().mockReturnValue({
                        order: vi.fn().mockReturnValue({
                          limit: vi.fn().mockResolvedValue({ data: [], error: null }),
                        }),
                      }),
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'daily_reports') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: null, error: null }),
                }),
              }),
            }),
          };
        }
        return createMockSupabaseQuery({ data: null, error: null });
      });

      const result = await suggestActivitiesTool.execute(
        { project_id: 'project-123', date: '2024-01-16', include_yesterday: false },
        mockContext
      );

      expectSuccess(result);
      expect(result.data.carryover_activities.length).toBe(0);
    });
  });

  // ============================================================================
  // Weather Impact Tests
  // ============================================================================

  describe('weather impact', () => {
    it('should flag weather-sensitive activities in rain', async () => {
      const scheduleActivities = [
        { id: 'act-1', name: 'Concrete pour', status: 'pending', is_critical: false },
        { id: 'act-2', name: 'Roofing installation', status: 'pending', is_critical: false },
        { id: 'act-3', name: 'Interior electrical', status: 'pending', is_critical: false },
      ];

      mockGetWeatherForProject.mockResolvedValue({
        conditions: 'Rain',
        temperature: 55,
        humidity: 90,
        windSpeed: 15,
      });
      mockAnalyzeWeatherImpact.mockReturnValue({ severity: 'moderate' });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'schedule_activities') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                lte: vi.fn().mockReturnValue({
                  gte: vi.fn().mockReturnValue({
                    neq: vi.fn().mockReturnValue({
                      order: vi.fn().mockReturnValue({
                        order: vi.fn().mockReturnValue({
                          limit: vi.fn().mockResolvedValue({ data: scheduleActivities, error: null }),
                        }),
                      }),
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'daily_reports') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: null, error: null }),
                }),
              }),
            }),
          };
        }
        return createMockSupabaseQuery({ data: null, error: null });
      });

      const result = await suggestActivitiesTool.execute(
        { project_id: 'project-123', date: '2024-01-16', consider_weather: true },
        mockContext
      );

      expectSuccess(result);
      expect(result.data.weather_adjusted.length).toBe(2); // concrete and roofing
      expect(result.data.weather_adjusted.some((a: any) => a.name.includes('Concrete'))).toBe(true);
      expect(result.data.weather_adjusted.some((a: any) => a.name.includes('Roofing'))).toBe(true);
    });

    it('should provide alternative suggestions for weather-impacted activities', async () => {
      const scheduleActivities = [
        { id: 'act-1', name: 'Exterior painting', status: 'pending', is_critical: false },
      ];

      mockGetWeatherForProject.mockResolvedValue({ conditions: 'Rain', humidity: 95 });
      mockAnalyzeWeatherImpact.mockReturnValue({ severity: 'moderate' });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'schedule_activities') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                lte: vi.fn().mockReturnValue({
                  gte: vi.fn().mockReturnValue({
                    neq: vi.fn().mockReturnValue({
                      order: vi.fn().mockReturnValue({
                        order: vi.fn().mockReturnValue({
                          limit: vi.fn().mockResolvedValue({ data: scheduleActivities, error: null }),
                        }),
                      }),
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'daily_reports') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: null, error: null }),
                }),
              }),
            }),
          };
        }
        return createMockSupabaseQuery({ data: null, error: null });
      });

      const result = await suggestActivitiesTool.execute(
        { project_id: 'project-123', date: '2024-01-16' },
        mockContext
      );

      expectSuccess(result);
      const paintingImpact = result.data.weather_adjusted.find((a: any) =>
        a.name.includes('painting')
      );
      expect(paintingImpact).toBeDefined();
      expect(paintingImpact.alternative_suggestion).toBeDefined();
    });

    it('should not check weather when consider_weather is false', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'schedule_activities') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                lte: vi.fn().mockReturnValue({
                  gte: vi.fn().mockReturnValue({
                    neq: vi.fn().mockReturnValue({
                      order: vi.fn().mockReturnValue({
                        order: vi.fn().mockReturnValue({
                          limit: vi.fn().mockResolvedValue({ data: [], error: null }),
                        }),
                      }),
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'daily_reports') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: null, error: null }),
                }),
              }),
            }),
          };
        }
        return createMockSupabaseQuery({ data: null, error: null });
      });

      const result = await suggestActivitiesTool.execute(
        { project_id: 'project-123', date: '2024-01-16', consider_weather: false },
        mockContext
      );

      expectSuccess(result);
      expect(mockGetWeatherForProject).not.toHaveBeenCalled();
      expect(result.data.weather_adjusted.length).toBe(0);
    });
  });

  // ============================================================================
  // Priority Suggestions Tests
  // ============================================================================

  describe('priority suggestions', () => {
    it('should prioritize critical path activities', async () => {
      const scheduleActivities = [
        { id: 'act-1', name: 'Critical task', is_critical: true, status: 'pending' },
        { id: 'act-2', name: 'Normal task', is_critical: false, status: 'pending' },
      ];

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'schedule_activities') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                lte: vi.fn().mockReturnValue({
                  gte: vi.fn().mockReturnValue({
                    neq: vi.fn().mockReturnValue({
                      order: vi.fn().mockReturnValue({
                        order: vi.fn().mockReturnValue({
                          limit: vi.fn().mockResolvedValue({ data: scheduleActivities, error: null }),
                        }),
                      }),
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'daily_reports') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: null, error: null }),
                }),
              }),
            }),
          };
        }
        return createMockSupabaseQuery({ data: null, error: null });
      });

      const result = await suggestActivitiesTool.execute(
        { project_id: 'project-123', date: '2024-01-16' },
        mockContext
      );

      expectSuccess(result);
      expect(result.data.suggested_priorities.some((p: string) =>
        p.toLowerCase().includes('critical')
      )).toBe(true);
    });

    it('should suggest completing carryover items', async () => {
      const yesterdayReport = {
        id: 'report-1',
        work_planned: 'Task 1\nTask 2\nTask 3',
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'schedule_activities') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                lte: vi.fn().mockReturnValue({
                  gte: vi.fn().mockReturnValue({
                    neq: vi.fn().mockReturnValue({
                      order: vi.fn().mockReturnValue({
                        order: vi.fn().mockReturnValue({
                          limit: vi.fn().mockResolvedValue({ data: [], error: null }),
                        }),
                      }),
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'daily_reports') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: yesterdayReport, error: null }),
                }),
              }),
            }),
          };
        }
        return createMockSupabaseQuery({ data: null, error: null });
      });

      const result = await suggestActivitiesTool.execute(
        { project_id: 'project-123', date: '2024-01-16' },
        mockContext
      );

      expectSuccess(result);
      expect(result.data.suggested_priorities.some((p: string) =>
        p.toLowerCase().includes('carryover')
      )).toBe(true);
    });

    it('should include default priority when nothing special', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'schedule_activities') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                lte: vi.fn().mockReturnValue({
                  gte: vi.fn().mockReturnValue({
                    neq: vi.fn().mockReturnValue({
                      order: vi.fn().mockReturnValue({
                        order: vi.fn().mockReturnValue({
                          limit: vi.fn().mockResolvedValue({ data: [], error: null }),
                        }),
                      }),
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'daily_reports') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: null, error: null }),
                }),
              }),
            }),
          };
        }
        return createMockSupabaseQuery({ data: null, error: null });
      });

      const result = await suggestActivitiesTool.execute(
        { project_id: 'project-123', date: '2024-01-16' },
        mockContext
      );

      expectSuccess(result);
      expect(result.data.suggested_priorities.length).toBeGreaterThan(0);
      expect(result.data.suggested_priorities[0]).toContain('Proceed with scheduled activities');
    });
  });

  // ============================================================================
  // Output Formatting Tests
  // ============================================================================

  describe('formatOutput', () => {
    it('should format output correctly', () => {
      const output = {
        scheduled_activities: [
          { activity_id: 'act-1', name: 'Task 1', expected_trades: ['Electrical'], expected_manpower: 4, dependencies_met: true },
        ],
        carryover_activities: [
          { activity_id: 'carry-1', name: 'Carryover 1', percent_complete: 50, yesterday_progress: 'Started' },
        ],
        weather_adjusted: [],
        suggested_priorities: ['Focus on critical path'],
      };

      const formatted = suggestActivitiesTool.formatOutput(output);

      expect(formatted.title).toBe('Activity Suggestions');
      expect(formatted.status).toBe('success');
      expect(formatted.summary).toContain('1 scheduled');
      expect(formatted.summary).toContain('1 carryover');
    });

    it('should show warning status when weather impacts exist', () => {
      const output = {
        scheduled_activities: [],
        carryover_activities: [],
        weather_adjusted: [
          { activity_id: 'act-1', name: 'Roofing', reason: 'Rain expected', alternative_suggestion: 'Interior work' },
        ],
        suggested_priorities: [],
      };

      const formatted = suggestActivitiesTool.formatOutput(output);

      expect(formatted.status).toBe('warning');
    });
  });
});
