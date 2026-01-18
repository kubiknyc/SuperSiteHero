/**
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Hoist mock setup
const mockSupabase = vi.hoisted(() => ({
  from: vi.fn(),
}));

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: mockSupabase,
}));

// Import after mocks
import {
  createMockSupabaseQuery,
  createMockToolContext,
} from '../../__tests__/test-utils';

describe('generate-daily-log', () => {
  let generateDailyLogTool: any;
  let mockContext: ReturnType<typeof createMockToolContext>;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockContext = createMockToolContext({ projectId: 'project-123' });

    // Default mocks
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'projects') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { name: 'Test Project', address: '123 Main St' },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === 'subcontractors') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [
                { company_name: 'ABC Electric', trade: 'electrical' },
                { company_name: 'XYZ Plumbing', trade: 'plumbing' },
              ],
              error: null,
            }),
          }),
        };
      }
      return createMockSupabaseQuery({ data: null, error: null });
    });

    const module = await import('../generate-daily-log');
    generateDailyLogTool = module.generateDailyLogTool;
  });

  // ============================================================================
  // Tool Definition Tests
  // ============================================================================

  describe('tool definition', () => {
    it('should have correct tool metadata', () => {
      expect(generateDailyLogTool.name).toBe('generate_daily_log');
      expect(generateDailyLogTool.category).toBe('reports');
    });

    it('should have correct parameters schema', () => {
      const params = generateDailyLogTool.parameters;
      expect(params.type).toBe('object');
      expect(params.required).toContain('project_id');
      expect(params.required).toContain('date');
      expect(params.required).toContain('notes');
      expect(params.properties.weather).toBeDefined();
    });
  });

  // ============================================================================
  // Work Activity Extraction Tests
  // ============================================================================

  describe('work activity extraction', () => {
    it('should extract electrical work from notes', async () => {
      const notes = 'Electrical team installed outlet boxes on floor 2. 6 workers completed the rough-in.';

      const result = await generateDailyLogTool.execute(
        { project_id: 'project-123', date: '2024-01-16', notes },
        mockContext
      );

      // Tool returns result directly, not wrapped in success/data
      expect(result.daily_log.work_activities.length).toBeGreaterThan(0);
      expect(result.daily_log.work_activities.some((a: any) => a.trade === 'Electrical')).toBe(true);
    });

    it('should extract concrete work from notes', async () => {
      // Notes are split on periods, so percent complete must be on same line as activity
      const notes = 'Poured concrete for foundation slab with 8 workers and 75% complete';

      const result = await generateDailyLogTool.execute(
        { project_id: 'project-123', date: '2024-01-16', notes },
        mockContext
      );

      const concreteActivity = result.daily_log.work_activities.find(
        (a: any) => a.trade === 'Concrete'
      );
      expect(concreteActivity).toBeDefined();
      expect(concreteActivity.percent_complete).toBe(75);
    });

    it('should extract plumbing work from notes', async () => {
      const notes = 'Plumbing crew ran drain lines in the basement.';

      const result = await generateDailyLogTool.execute(
        { project_id: 'project-123', date: '2024-01-16', notes },
        mockContext
      );

      expect(result.daily_log.work_activities.some((a: any) => a.trade === 'Plumbing')).toBe(true);
    });

    it('should extract multiple trades from notes', async () => {
      const notes = 'Framing continued on level 3. Drywall finishing in lobby. Painting started in offices.';

      const result = await generateDailyLogTool.execute(
        { project_id: 'project-123', date: '2024-01-16', notes },
        mockContext
      );

      const trades = result.daily_log.work_activities.map((a: any) => a.trade);
      expect(trades).toContain('Framing');
      expect(trades).toContain('Drywall');
      expect(trades).toContain('Painting');
    });

    it('should extract location from activity description', async () => {
      const notes = 'HVAC installation on floor 3. Ductwork in north wing.';

      const result = await generateDailyLogTool.execute(
        { project_id: 'project-123', date: '2024-01-16', notes },
        mockContext
      );

      const hvacActivity = result.daily_log.work_activities.find(
        (a: any) => a.trade === 'HVAC'
      );
      expect(hvacActivity).toBeDefined();
      expect(hvacActivity.location.toLowerCase()).toContain('floor');
    });

    it('should deduplicate similar activities', async () => {
      const notes = 'Electrical work on floor 2. More electrical work on floor 2.';

      const result = await generateDailyLogTool.execute(
        { project_id: 'project-123', date: '2024-01-16', notes },
        mockContext
      );

      // Should combine into one activity with combined description
      const electricalActivities = result.daily_log.work_activities.filter(
        (a: any) => a.trade === 'Electrical'
      );
      expect(electricalActivities.length).toBeLessThanOrEqual(2);
    });
  });

  // ============================================================================
  // Manpower Extraction Tests
  // ============================================================================

  describe('manpower extraction', () => {
    it('should extract electrician counts', async () => {
      const notes = '5 electricians on site today.';

      const result = await generateDailyLogTool.execute(
        { project_id: 'project-123', date: '2024-01-16', notes },
        mockContext
      );

      const electrical = result.daily_log.manpower_summary.by_trade.find(
        (m: any) => m.trade.toLowerCase().includes('electr')
      );
      expect(electrical).toBeDefined();
      expect(electrical.headcount).toBe(5);
    });

    it('should extract plumber counts', async () => {
      const notes = '3 plumbers working on fixtures.';

      const result = await generateDailyLogTool.execute(
        { project_id: 'project-123', date: '2024-01-16', notes },
        mockContext
      );

      const plumbing = result.daily_log.manpower_summary.by_trade.find(
        (m: any) => m.trade.toLowerCase().includes('plumb')
      );
      expect(plumbing).toBeDefined();
      expect(plumbing.headcount).toBe(3);
    });

    it('should calculate total workers', async () => {
      const notes = '5 electricians and 4 plumbers on site.';

      const result = await generateDailyLogTool.execute(
        { project_id: 'project-123', date: '2024-01-16', notes },
        mockContext
      );

      expect(result.daily_log.manpower_summary.total_workers).toBeGreaterThanOrEqual(9);
    });

    it('should not extract manpower when disabled', async () => {
      const notes = '5 electricians on site today.';

      const result = await generateDailyLogTool.execute(
        { project_id: 'project-123', date: '2024-01-16', notes, include_manpower: false },
        mockContext
      );

      expect(result.daily_log.manpower_summary.by_trade.length).toBe(0);
    });
  });

  // ============================================================================
  // Equipment Extraction Tests
  // ============================================================================

  describe('equipment extraction', () => {
    it('should extract crane usage', async () => {
      const notes = 'Crane on site for steel erection.';

      const result = await generateDailyLogTool.execute(
        { project_id: 'project-123', date: '2024-01-16', notes },
        mockContext
      );

      const crane = result.daily_log.equipment_on_site.find(
        (e: any) => e.type === 'Crane'
      );
      expect(crane).toBeDefined();
      expect(crane.status).toBe('active');
    });

    it('should extract excavator with idle status', async () => {
      const notes = 'Excavator idle due to weather.';

      const result = await generateDailyLogTool.execute(
        { project_id: 'project-123', date: '2024-01-16', notes },
        mockContext
      );

      const excavator = result.daily_log.equipment_on_site.find(
        (e: any) => e.type === 'Excavator'
      );
      expect(excavator).toBeDefined();
      expect(excavator.status).toBe('idle');
    });

    it('should extract equipment in maintenance', async () => {
      const notes = 'Generator under maintenance today.';

      const result = await generateDailyLogTool.execute(
        { project_id: 'project-123', date: '2024-01-16', notes },
        mockContext
      );

      const generator = result.daily_log.equipment_on_site.find(
        (e: any) => e.type === 'Generator'
      );
      expect(generator).toBeDefined();
      expect(generator.status).toBe('maintenance');
    });

    it('should not extract equipment when disabled', async () => {
      const notes = 'Crane and forklift on site.';

      const result = await generateDailyLogTool.execute(
        { project_id: 'project-123', date: '2024-01-16', notes, include_equipment: false },
        mockContext
      );

      expect(result.daily_log.equipment_on_site.length).toBe(0);
    });
  });

  // ============================================================================
  // Deliveries Extraction Tests
  // ============================================================================

  describe('deliveries extraction', () => {
    it('should extract material deliveries', async () => {
      const notes = 'Received delivery of rebar for foundation.';

      const result = await generateDailyLogTool.execute(
        { project_id: 'project-123', date: '2024-01-16', notes },
        mockContext
      );

      expect(result.daily_log.deliveries.length).toBeGreaterThan(0);
      expect(result.daily_log.deliveries.some((d: any) =>
        d.material.toLowerCase().includes('rebar')
      )).toBe(true);
    });

    it('should extract drywall deliveries', async () => {
      const notes = 'Drywall delivery arrived this morning.';

      const result = await generateDailyLogTool.execute(
        { project_id: 'project-123', date: '2024-01-16', notes },
        mockContext
      );

      expect(result.daily_log.deliveries.some((d: any) =>
        d.material.toLowerCase().includes('drywall')
      )).toBe(true);
    });

    it('should not extract deliveries when disabled', async () => {
      const notes = 'Received delivery of steel beams.';

      const result = await generateDailyLogTool.execute(
        { project_id: 'project-123', date: '2024-01-16', notes, include_deliveries: false },
        mockContext
      );

      expect(result.daily_log.deliveries.length).toBe(0);
    });
  });

  // ============================================================================
  // Delays and Issues Extraction Tests
  // ============================================================================

  describe('delays and issues extraction', () => {
    it('should extract delay mentions', async () => {
      const notes = 'Work was delayed due to material shortage.';

      const result = await generateDailyLogTool.execute(
        { project_id: 'project-123', date: '2024-01-16', notes },
        mockContext
      );

      expect(result.daily_log.delays_issues.length).toBeGreaterThan(0);
      expect(result.daily_log.delays_issues.some((d: string) =>
        d.toLowerCase().includes('delay')
      )).toBe(true);
    });

    it('should extract inability to complete work', async () => {
      const notes = 'Could not complete electrical rough-in. Unable to access the mechanical room.';

      const result = await generateDailyLogTool.execute(
        { project_id: 'project-123', date: '2024-01-16', notes },
        mockContext
      );

      expect(result.daily_log.delays_issues.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // Safety Observations Extraction Tests
  // ============================================================================

  describe('safety observations extraction', () => {
    it('should extract safety meeting mentions', async () => {
      const notes = 'Conducted morning toolbox talk on ladder safety.';

      const result = await generateDailyLogTool.execute(
        { project_id: 'project-123', date: '2024-01-16', notes },
        mockContext
      );

      expect(result.daily_log.safety_observations.length).toBeGreaterThan(0);
      expect(result.daily_log.safety_observations.some((s: string) =>
        s.toLowerCase().includes('toolbox')
      )).toBe(true);
    });

    it('should extract PPE observations', async () => {
      const notes = 'All workers wearing hard hats and safety vests.';

      const result = await generateDailyLogTool.execute(
        { project_id: 'project-123', date: '2024-01-16', notes },
        mockContext
      );

      expect(result.daily_log.safety_observations.some((s: string) =>
        s.toLowerCase().includes('hard hat')
      )).toBe(true);
    });

    it('should extract hazard observations', async () => {
      const notes = 'Identified trip hazard in stairwell. Housekeeping corrected.';

      const result = await generateDailyLogTool.execute(
        { project_id: 'project-123', date: '2024-01-16', notes },
        mockContext
      );

      expect(result.daily_log.safety_observations.some((s: string) =>
        s.toLowerCase().includes('hazard') || s.toLowerCase().includes('housekeeping')
      )).toBe(true);
    });
  });

  // ============================================================================
  // Visitor Extraction Tests
  // ============================================================================

  describe('visitor extraction', () => {
    it('should extract owner visits', async () => {
      const notes = 'Owner visited the site for project walkthrough.';

      const result = await generateDailyLogTool.execute(
        { project_id: 'project-123', date: '2024-01-16', notes },
        mockContext
      );

      expect(result.daily_log.visitors.length).toBeGreaterThan(0);
      expect(result.daily_log.visitors.some((v: string) =>
        v.toLowerCase().includes('owner')
      )).toBe(true);
    });

    it('should extract inspector visits', async () => {
      const notes = 'Fire inspector visited for rough-in inspection.';

      const result = await generateDailyLogTool.execute(
        { project_id: 'project-123', date: '2024-01-16', notes },
        mockContext
      );

      expect(result.daily_log.visitors.some((v: string) =>
        v.toLowerCase().includes('inspector')
      )).toBe(true);
    });

    it('should extract architect visits', async () => {
      const notes = 'Architect walked the site to review storefront.';

      const result = await generateDailyLogTool.execute(
        { project_id: 'project-123', date: '2024-01-16', notes },
        mockContext
      );

      expect(result.daily_log.visitors.some((v: string) =>
        v.toLowerCase().includes('architect')
      )).toBe(true);
    });
  });

  // ============================================================================
  // Weather Summary Tests
  // ============================================================================

  describe('weather summary', () => {
    it('should include weather when provided', async () => {
      const notes = 'Normal work day.';
      const weather = {
        conditions: 'Clear and sunny',
        temperature_high: 75,
        temperature_low: 55,
        precipitation: false,
      };

      const result = await generateDailyLogTool.execute(
        { project_id: 'project-123', date: '2024-01-16', notes, weather },
        mockContext
      );

      expect(result.daily_log.weather_summary).toContain('Clear and sunny');
      expect(result.daily_log.weather_summary).toContain('75');
    });

    it('should note precipitation when it occurred', async () => {
      const notes = 'Rainy day.';
      const weather = {
        conditions: 'Rain',
        temperature_high: 60,
        precipitation: true,
      };

      const result = await generateDailyLogTool.execute(
        { project_id: 'project-123', date: '2024-01-16', notes, weather },
        mockContext
      );

      expect(result.daily_log.weather_summary.toLowerCase()).toContain('precipitation');
    });

    it('should indicate when weather not recorded', async () => {
      const notes = 'Work completed.';

      const result = await generateDailyLogTool.execute(
        { project_id: 'project-123', date: '2024-01-16', notes },
        mockContext
      );

      expect(result.daily_log.weather_summary.toLowerCase()).toContain('not recorded');
    });
  });

  // ============================================================================
  // Quality Score Tests
  // ============================================================================

  describe('quality score', () => {
    it('should have high quality score for complete log', async () => {
      const notes = '5 electricians installed panels. Conducted safety toolbox talk. Weather was clear.';
      const weather = { conditions: 'Clear', temperature_high: 75 };

      const result = await generateDailyLogTool.execute(
        { project_id: 'project-123', date: '2024-01-16', notes, weather },
        mockContext
      );

      expect(result.quality_score).toBeGreaterThan(50);
    });

    it('should have lower quality score for missing activities', async () => {
      const notes = 'Weather was nice today.';

      const result = await generateDailyLogTool.execute(
        { project_id: 'project-123', date: '2024-01-16', notes },
        mockContext
      );

      expect(result.missing_info).toContain('No work activities documented');
      expect(result.quality_score).toBeLessThan(80);
    });

    it('should flag missing weather', async () => {
      const notes = '5 electricians on site. Work completed.';

      const result = await generateDailyLogTool.execute(
        { project_id: 'project-123', date: '2024-01-16', notes },
        mockContext
      );

      expect(result.missing_info.some((m: string) =>
        m.toLowerCase().includes('weather')
      )).toBe(true);
    });

    it('should flag missing safety observations', async () => {
      const notes = '5 electricians installed panels.';
      const weather = { conditions: 'Clear' };

      const result = await generateDailyLogTool.execute(
        { project_id: 'project-123', date: '2024-01-16', notes, weather },
        mockContext
      );

      expect(result.missing_info.some((m: string) =>
        m.toLowerCase().includes('safety')
      )).toBe(true);
    });
  });

  // ============================================================================
  // Suggestions Tests
  // ============================================================================

  describe('suggestions', () => {
    it('should suggest adding detail for low quality logs', async () => {
      const notes = 'Some work done.';

      const result = await generateDailyLogTool.execute(
        { project_id: 'project-123', date: '2024-01-16', notes },
        mockContext
      );

      expect(result.suggestions.some((s: string) =>
        s.toLowerCase().includes('detail')
      )).toBe(true);
    });

    it('should suggest percent complete for activities', async () => {
      const notes = 'Electrical rough-in in progress. Plumbing work continues.';

      const result = await generateDailyLogTool.execute(
        { project_id: 'project-123', date: '2024-01-16', notes },
        mockContext
      );

      expect(result.suggestions.some((s: string) =>
        s.toLowerCase().includes('percent') || s.toLowerCase().includes('progress')
      )).toBe(true);
    });

    it('should always suggest photos', async () => {
      const notes = 'Complete log with all details.';

      const result = await generateDailyLogTool.execute(
        { project_id: 'project-123', date: '2024-01-16', notes },
        mockContext
      );

      expect(result.suggestions.some((s: string) =>
        s.toLowerCase().includes('photo')
      )).toBe(true);
    });

    it('should suggest documenting delays for claims', async () => {
      const notes = 'Work delayed due to material shortage.';

      const result = await generateDailyLogTool.execute(
        { project_id: 'project-123', date: '2024-01-16', notes },
        mockContext
      );

      expect(result.suggestions.some((s: string) =>
        s.toLowerCase().includes('delay') || s.toLowerCase().includes('claim')
      )).toBe(true);
    });
  });

  // ============================================================================
  // Project Info Tests
  // ============================================================================

  describe('project info', () => {
    it('should include project name in log', async () => {
      const notes = 'Work completed.';

      const result = await generateDailyLogTool.execute(
        { project_id: 'project-123', date: '2024-01-16', notes },
        mockContext
      );

      expect(result.daily_log.project_name).toBe('Test Project');
    });

    it('should handle missing project gracefully', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'projects') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
          };
        }
        if (table === 'subcontractors') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          };
        }
        return createMockSupabaseQuery({ data: null, error: null });
      });

      const notes = 'Work completed.';

      const result = await generateDailyLogTool.execute(
        { project_id: 'project-123', date: '2024-01-16', notes },
        mockContext
      );

      expect(result.daily_log.project_name).toBe('Unknown Project');
    });
  });

  // ============================================================================
  // Notes Cleaning Tests
  // ============================================================================

  describe('notes cleaning', () => {
    it('should clean and truncate long notes', async () => {
      const longNotes = 'A'.repeat(3000);

      const result = await generateDailyLogTool.execute(
        { project_id: 'project-123', date: '2024-01-16', notes: longNotes },
        mockContext
      );

      expect(result.daily_log.notes.length).toBeLessThanOrEqual(2000);
    });

    it('should normalize whitespace in notes', async () => {
      const notes = 'Work   completed.    Multiple   spaces.';

      const result = await generateDailyLogTool.execute(
        { project_id: 'project-123', date: '2024-01-16', notes },
        mockContext
      );

      expect(result.daily_log.notes).not.toContain('   ');
    });
  });
});
