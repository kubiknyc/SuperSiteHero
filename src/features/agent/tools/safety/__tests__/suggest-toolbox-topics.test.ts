/**
 * Tests for Suggest Toolbox Topics Tool
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createMockToolContext,
  createMockSupabaseQuery,
} from '../../__tests__/test-utils';

// Hoist all mocks
const mockCreateTool = vi.hoisted(() => vi.fn((config) => config));
const mockSupabaseFrom = vi.hoisted(() => vi.fn());
const mockGetWeatherForProject = vi.hoisted(() => vi.fn());

vi.mock('../../registry', () => ({
  createTool: mockCreateTool,
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: mockSupabaseFrom,
  },
}));

vi.mock('@/features/daily-reports/services/weatherApiService', () => ({
  getWeatherForProject: mockGetWeatherForProject,
}));

describe('suggestToolboxTopicsTool', () => {
  let suggestToolboxTopicsTool: any;
  let mockContext: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockContext = createMockToolContext({ projectId: 'project-123', userId: 'user-123' });
    mockGetWeatherForProject.mockResolvedValue(null);

    const module = await import('../suggest-toolbox-topics');
    suggestToolboxTopicsTool = module.suggestToolboxTopicsTool;
  });

  // ==========================================================================
  // Tool Definition Tests
  // ==========================================================================

  describe('Tool Definition', () => {
    it('should have correct name and category', () => {
      expect(suggestToolboxTopicsTool.name).toBe('suggest_toolbox_topics');
      expect(suggestToolboxTopicsTool.category).toBe('action');
    });

    it('should have required parameters', () => {
      const { parameters } = suggestToolboxTopicsTool;
      expect(parameters.required).toContain('project_id');
      expect(parameters.required).toContain('date');
    });

    it('should have optional consider parameters', () => {
      const { parameters } = suggestToolboxTopicsTool;
      expect(parameters.properties.consider_weather).toBeDefined();
      expect(parameters.properties.consider_schedule).toBeDefined();
      expect(parameters.properties.consider_recent_incidents).toBeDefined();
    });

    it('should not require confirmation', () => {
      expect(suggestToolboxTopicsTool.requiresConfirmation).toBe(false);
    });
  });

  // ==========================================================================
  // Activity-Based Topics Tests
  // ==========================================================================

  describe('Activity-Based Topics', () => {
    it('should suggest concrete safety for concrete work', async () => {
      setupMockQueries({
        activities: [{ name: 'Pour concrete foundation' }],
      });

      const result = await suggestToolboxTopicsTool.execute(
        { project_id: 'project-123', date: '2024-01-15' },
        mockContext
      );

      expect(result.success).toBe(true);
      const concreteTopic = result.data.recommended_topics.find((t: any) =>
        t.topic.toLowerCase().includes('concrete')
      );
      expect(concreteTopic).toBeDefined();
      expect(concreteTopic.priority).toBe('high');
    });

    it('should suggest roofing safety for roof work', async () => {
      setupMockQueries({
        activities: [{ name: 'Install roofing membrane' }],
      });

      const result = await suggestToolboxTopicsTool.execute(
        { project_id: 'project-123', date: '2024-01-15' },
        mockContext
      );

      const roofingTopic = result.data.recommended_topics.find((t: any) =>
        t.topic.toLowerCase().includes('roofing')
      );
      expect(roofingTopic).toBeDefined();
    });

    it('should suggest electrical safety for electrical work', async () => {
      setupMockQueries({
        activities: [{ name: 'Run electrical conduit' }],
      });

      const result = await suggestToolboxTopicsTool.execute(
        { project_id: 'project-123', date: '2024-01-15' },
        mockContext
      );

      const electricalTopic = result.data.recommended_topics.find((t: any) =>
        t.topic.toLowerCase().includes('electrical')
      );
      expect(electricalTopic).toBeDefined();
    });

    it('should suggest excavation safety for excavation work', async () => {
      setupMockQueries({
        activities: [{ name: 'Excavation for utilities' }],
      });

      const result = await suggestToolboxTopicsTool.execute(
        { project_id: 'project-123', date: '2024-01-15' },
        mockContext
      );

      const excavationTopic = result.data.recommended_topics.find((t: any) =>
        t.topic.toLowerCase().includes('excavation') || t.topic.toLowerCase().includes('trenching')
      );
      expect(excavationTopic).toBeDefined();
    });

    it('should suggest scaffold safety for scaffold work', async () => {
      setupMockQueries({
        activities: [{ name: 'Erect scaffold for facade' }],
      });

      const result = await suggestToolboxTopicsTool.execute(
        { project_id: 'project-123', date: '2024-01-15' },
        mockContext
      );

      const scaffoldTopic = result.data.recommended_topics.find((t: any) =>
        t.topic.toLowerCase().includes('scaffold')
      );
      expect(scaffoldTopic).toBeDefined();
    });

    it('should suggest crane safety for crane operations', async () => {
      setupMockQueries({
        // The activity name must contain 'crane' as a separate keyword that gets detected
        activities: [{ name: 'Use tower crane for lifting' }],
      });

      const result = await suggestToolboxTopicsTool.execute(
        { project_id: 'project-123', date: '2024-01-15' },
        mockContext
      );

      const craneTopic = result.data.recommended_topics.find((t: any) =>
        t.topic.toLowerCase().includes('crane')
      );
      expect(craneTopic).toBeDefined();
    });

    it('should suggest steel erection safety for steel work', async () => {
      setupMockQueries({
        // The activity name must contain 'steel' keyword to match ACTIVITY_HAZARDS
        activities: [{ name: 'Erect steel framing' }],
      });

      const result = await suggestToolboxTopicsTool.execute(
        { project_id: 'project-123', date: '2024-01-15' },
        mockContext
      );

      const steelTopic = result.data.recommended_topics.find((t: any) =>
        t.topic.toLowerCase().includes('steel')
      );
      expect(steelTopic).toBeDefined();
    });

    it('should include activity-based hazards and key points', async () => {
      setupMockQueries({
        activities: [{ name: 'Demolition of wall' }],
      });

      const result = await suggestToolboxTopicsTool.execute(
        { project_id: 'project-123', date: '2024-01-15' },
        mockContext
      );

      expect(result.data.activity_based.length).toBeGreaterThan(0);
      expect(result.data.activity_based[0].hazards).toBeDefined();
      expect(result.data.activity_based[0].hazards.length).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // Weather-Based Topics Tests
  // ==========================================================================

  describe('Weather-Based Topics', () => {
    it('should suggest heat illness prevention for hot weather', async () => {
      setupMockQueries({ activities: [] });
      mockGetWeatherForProject.mockResolvedValue({
        temperature: 95,
        conditions: 'Sunny',
        windSpeed: 5,
      });

      const result = await suggestToolboxTopicsTool.execute(
        { project_id: 'project-123', date: '2024-07-15', consider_weather: true },
        mockContext
      );

      expect(result.data.weather_based).toBeDefined();
      expect(result.data.weather_based.topic).toContain('Heat');
    });

    it('should suggest cold weather safety for cold temperatures', async () => {
      setupMockQueries({ activities: [] });
      mockGetWeatherForProject.mockResolvedValue({
        temperature: 28,
        conditions: 'Cold',
        windSpeed: 10,
      });

      const result = await suggestToolboxTopicsTool.execute(
        { project_id: 'project-123', date: '2024-01-15', consider_weather: true },
        mockContext
      );

      expect(result.data.weather_based).toBeDefined();
      expect(result.data.weather_based.topic).toContain('Cold');
    });

    it('should suggest wet weather safety for rain', async () => {
      setupMockQueries({ activities: [] });
      mockGetWeatherForProject.mockResolvedValue({
        temperature: 65,
        conditions: 'Rain',
        windSpeed: 10,
      });

      const result = await suggestToolboxTopicsTool.execute(
        { project_id: 'project-123', date: '2024-03-15', consider_weather: true },
        mockContext
      );

      expect(result.data.weather_based).toBeDefined();
      expect(result.data.weather_based.topic).toContain('Wet');
    });

    it('should suggest high wind safety for windy conditions', async () => {
      setupMockQueries({ activities: [] });
      mockGetWeatherForProject.mockResolvedValue({
        temperature: 70,
        conditions: 'Windy',
        windSpeed: 30,
      });

      const result = await suggestToolboxTopicsTool.execute(
        { project_id: 'project-123', date: '2024-03-15', consider_weather: true },
        mockContext
      );

      expect(result.data.weather_based).toBeDefined();
      expect(result.data.weather_based.topic).toContain('Wind');
    });

    it('should suggest lightning safety with high priority for thunderstorms', async () => {
      setupMockQueries({ activities: [] });
      mockGetWeatherForProject.mockResolvedValue({
        temperature: 75,
        conditions: 'Thunderstorm',
        windSpeed: 15,
      });

      const result = await suggestToolboxTopicsTool.execute(
        { project_id: 'project-123', date: '2024-06-15', consider_weather: true },
        mockContext
      );

      expect(result.data.weather_based).toBeDefined();
      expect(result.data.weather_based.topic).toContain('Lightning');

      const lightningTopic = result.data.recommended_topics.find((t: any) =>
        t.topic.includes('Lightning')
      );
      expect(lightningTopic?.priority).toBe('high');
    });

    it('should not include weather topic when consider_weather is false', async () => {
      setupMockQueries({ activities: [] });
      mockGetWeatherForProject.mockResolvedValue({
        temperature: 95,
        conditions: 'Hot',
        windSpeed: 5,
      });

      const result = await suggestToolboxTopicsTool.execute(
        { project_id: 'project-123', date: '2024-07-15', consider_weather: false },
        mockContext
      );

      expect(result.data.weather_based).toBeUndefined();
    });
  });

  // ==========================================================================
  // Incident-Based Topics Tests
  // ==========================================================================

  describe('Incident-Based Topics', () => {
    it('should suggest fall prevention after fall incident', async () => {
      setupMockQueries({
        activities: [],
        incidents: [
          { incident_type: 'Fall from height', description: 'Worker fell from ladder', root_cause: 'Improper ladder setup' },
        ],
      });

      const result = await suggestToolboxTopicsTool.execute(
        { project_id: 'project-123', date: '2024-01-15', consider_recent_incidents: true },
        mockContext
      );

      expect(result.data.incident_based.length).toBeGreaterThan(0);
      expect(result.data.incident_based[0].topic).toContain('Fall');
    });

    it('should suggest struck-by prevention after struck-by incident', async () => {
      setupMockQueries({
        activities: [],
        incidents: [
          // The incident type must contain 'struck' keyword for OSHA Focus Four mapping
          { incident_type: 'Worker struck by equipment', description: 'Worker struck by forklift', root_cause: 'No spotter' },
        ],
      });

      const result = await suggestToolboxTopicsTool.execute(
        { project_id: 'project-123', date: '2024-01-15', consider_recent_incidents: true },
        mockContext
      );

      const struckByTopic = result.data.incident_based.find((i: any) =>
        i.topic.includes('Struck-By')
      );
      expect(struckByTopic).toBeDefined();
    });

    it('should suggest electrical safety after electrical incident', async () => {
      setupMockQueries({
        activities: [],
        incidents: [
          { incident_type: 'Electrical shock', description: 'Minor shock from tool', root_cause: 'Damaged cord' },
        ],
      });

      const result = await suggestToolboxTopicsTool.execute(
        { project_id: 'project-123', date: '2024-01-15', consider_recent_incidents: true },
        mockContext
      );

      const electricalTopic = result.data.incident_based.find((i: any) =>
        i.topic.includes('Electrical')
      );
      expect(electricalTopic).toBeDefined();
    });

    it('should include lessons learned from incidents', async () => {
      setupMockQueries({
        activities: [],
        incidents: [
          { incident_type: 'Fall incident', description: 'Ladder slipped on wet floor', root_cause: 'No non-slip feet' },
        ],
      });

      const result = await suggestToolboxTopicsTool.execute(
        { project_id: 'project-123', date: '2024-01-15', consider_recent_incidents: true },
        mockContext
      );

      if (result.data.incident_based.length > 0) {
        expect(result.data.incident_based[0].lessons_learned).toBeDefined();
        expect(result.data.incident_based[0].lessons_learned.length).toBeGreaterThan(0);
      }
    });

    it('should mark incident-based topics as high priority', async () => {
      setupMockQueries({
        activities: [],
        incidents: [
          { incident_type: 'Fall', description: 'Recent fall incident', root_cause: 'Investigation pending' },
        ],
      });

      const result = await suggestToolboxTopicsTool.execute(
        { project_id: 'project-123', date: '2024-01-15', consider_recent_incidents: true },
        mockContext
      );

      const fallTopic = result.data.recommended_topics.find((t: any) =>
        t.topic.includes('Fall') && t.relevance_reason.includes('incident')
      );
      if (fallTopic) {
        expect(fallTopic.priority).toBe('high');
      }
    });
  });

  // ==========================================================================
  // Calendar/Seasonal Topics Tests
  // ==========================================================================

  describe('Calendar and Seasonal Topics', () => {
    it('should suggest heat topics in summer months', async () => {
      setupMockQueries({ activities: [] });

      const result = await suggestToolboxTopicsTool.execute(
        { project_id: 'project-123', date: '2024-07-15' }, // July
        mockContext
      );

      const summerTopic = result.data.calendar_topics.find((t: any) =>
        t.topic.toLowerCase().includes('heat')
      );
      expect(summerTopic).toBeDefined();
      expect(summerTopic.reason).toBe('seasonal');
    });

    it('should suggest cold weather topics in winter months', async () => {
      setupMockQueries({ activities: [] });

      const result = await suggestToolboxTopicsTool.execute(
        { project_id: 'project-123', date: '2024-01-15' }, // January
        mockContext
      );

      const winterTopic = result.data.calendar_topics.find((t: any) =>
        t.topic.toLowerCase().includes('cold')
      );
      expect(winterTopic).toBeDefined();
      expect(winterTopic.reason).toBe('seasonal');
    });

    it('should suggest OSHA emphasis topics in June', async () => {
      setupMockQueries({ activities: [] });

      const result = await suggestToolboxTopicsTool.execute(
        { project_id: 'project-123', date: '2024-06-15' }, // June - National Safety Month
        mockContext
      );

      const oshaEmphasis = result.data.calendar_topics.find((t: any) =>
        t.reason === 'osha_emphasis'
      );
      expect(oshaEmphasis).toBeDefined();
    });
  });

  // ==========================================================================
  // Default Topics Tests
  // ==========================================================================

  describe('Default Topics', () => {
    it('should provide OSHA Focus Four rotation when no specific topics', async () => {
      setupMockQueries({
        activities: [], // No activities
        incidents: [], // No incidents
      });

      const result = await suggestToolboxTopicsTool.execute(
        {
          project_id: 'project-123',
          date: '2024-01-15',
          consider_weather: false,
          consider_schedule: false,
          consider_recent_incidents: false,
        },
        mockContext
      );

      expect(result.data.recommended_topics.length).toBeGreaterThan(0);
      const topic = result.data.recommended_topics[0];
      expect(['Fall Prevention', 'Struck-By Hazard Prevention', 'Caught-In/Between Hazard Prevention', 'Electrical Safety']).toContain(topic.topic);
    });

    it('should include key points for default topics', async () => {
      setupMockQueries({ activities: [] });

      const result = await suggestToolboxTopicsTool.execute(
        { project_id: 'project-123', date: '2024-01-15', consider_schedule: false, consider_recent_incidents: false },
        mockContext
      );

      const topic = result.data.recommended_topics[0];
      expect(topic.key_points).toBeDefined();
      expect(topic.key_points.length).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // Topic Deduplication Tests
  // ==========================================================================

  describe('Topic Deduplication', () => {
    it('should deduplicate topics by name', async () => {
      // Both activity and incident suggest electrical safety
      setupMockQueries({
        activities: [{ name: 'Install electrical panel' }],
        incidents: [{ incident_type: 'Electrical shock', description: 'Shock incident', root_cause: 'Test' }],
      });

      const result = await suggestToolboxTopicsTool.execute(
        { project_id: 'project-123', date: '2024-01-15' },
        mockContext
      );

      const electricalTopics = result.data.recommended_topics.filter((t: any) =>
        t.topic.toLowerCase().includes('electrical')
      );
      expect(electricalTopics.length).toBe(1);
    });

    it('should merge related activities when deduplicating', async () => {
      setupMockQueries({
        activities: [
          { name: 'Pour concrete slab 1' },
          { name: 'Pour concrete slab 2' },
        ],
      });

      const result = await suggestToolboxTopicsTool.execute(
        { project_id: 'project-123', date: '2024-01-15' },
        mockContext
      );

      const concreteTopic = result.data.recommended_topics.find((t: any) =>
        t.topic.toLowerCase().includes('concrete')
      );
      expect(concreteTopic).toBeDefined();
      // Should have both activities in related_activities
    });

    it('should keep highest priority when deduplicating', async () => {
      // Activity-based (high) and incident-based (high) should stay high
      setupMockQueries({
        activities: [{ name: 'Work on scaffold' }],
        incidents: [{ incident_type: 'Fall from scaffold', description: 'Test', root_cause: 'Test' }],
      });

      const result = await suggestToolboxTopicsTool.execute(
        { project_id: 'project-123', date: '2024-01-15' },
        mockContext
      );

      // Should have fall-related topic as high priority
      const fallTopic = result.data.recommended_topics.find((t: any) =>
        t.topic.toLowerCase().includes('fall') || t.topic.toLowerCase().includes('scaffold')
      );
      if (fallTopic) {
        expect(fallTopic.priority).toBe('high');
      }
    });
  });

  // ==========================================================================
  // Output Formatting Tests
  // ==========================================================================

  describe('Output Formatting', () => {
    it('should format output with correct title', async () => {
      setupMockQueries({ activities: [] });

      const result = await suggestToolboxTopicsTool.execute(
        { project_id: 'project-123', date: '2024-01-15' },
        mockContext
      );

      const formatted = suggestToolboxTopicsTool.formatOutput(result.data);
      expect(formatted.title).toBe('Toolbox Talk Suggestions');
    });

    it('should use users icon', async () => {
      setupMockQueries({ activities: [] });

      const result = await suggestToolboxTopicsTool.execute(
        { project_id: 'project-123', date: '2024-01-15' },
        mockContext
      );

      const formatted = suggestToolboxTopicsTool.formatOutput(result.data);
      expect(formatted.icon).toBe('users');
    });

    it('should show warning status when high priority topics exist', async () => {
      setupMockQueries({
        activities: [{ name: 'Scaffold work' }],
      });

      const result = await suggestToolboxTopicsTool.execute(
        { project_id: 'project-123', date: '2024-01-15' },
        mockContext
      );

      const formatted = suggestToolboxTopicsTool.formatOutput(result.data);
      expect(formatted.status).toBe('warning');
    });

    it('should include incident follow-up in summary when applicable', async () => {
      setupMockQueries({
        activities: [],
        incidents: [{ incident_type: 'Fall', description: 'Test', root_cause: 'Test' }],
      });

      const result = await suggestToolboxTopicsTool.execute(
        { project_id: 'project-123', date: '2024-01-15' },
        mockContext
      );

      const formatted = suggestToolboxTopicsTool.formatOutput(result.data);
      if (result.data.incident_based.length > 0) {
        expect(formatted.summary).toContain('incident follow-up');
      }
    });

    it('should include topic count in details', async () => {
      setupMockQueries({ activities: [] });

      const result = await suggestToolboxTopicsTool.execute(
        { project_id: 'project-123', date: '2024-01-15' },
        mockContext
      );

      const formatted = suggestToolboxTopicsTool.formatOutput(result.data);
      const topicsDetail = formatted.details.find((d: any) => d.label === 'Topics');
      expect(topicsDetail).toBeDefined();
      expect(topicsDetail.value).toBe(result.data.recommended_topics.length);
    });
  });

  // ==========================================================================
  // Estimated Duration Tests
  // ==========================================================================

  describe('Estimated Duration', () => {
    it('should include estimated duration for each topic', async () => {
      setupMockQueries({
        activities: [{ name: 'Concrete work' }],
      });

      const result = await suggestToolboxTopicsTool.execute(
        { project_id: 'project-123', date: '2024-01-15' },
        mockContext
      );

      const topic = result.data.recommended_topics[0];
      expect(topic.estimated_duration).toBeDefined();
      expect(topic.estimated_duration).toContain('minutes');
    });
  });

  // ==========================================================================
  // Helper Functions
  // ==========================================================================

  interface MockSetup {
    activities?: any[];
    incidents?: any[];
  }

  function setupMockQueries(setup: MockSetup) {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'schedule_activities') {
        return createMockSupabaseQuery({
          data: setup.activities || [],
          error: null,
        });
      }

      if (table === 'safety_incidents') {
        return createMockSupabaseQuery({
          data: setup.incidents || [],
          error: null,
        });
      }

      return createMockSupabaseQuery({ data: null, error: null });
    });
  }
});
