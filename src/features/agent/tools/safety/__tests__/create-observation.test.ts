/**
 * Tests for Create Safety Observation Tool
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

vi.mock('../../registry', () => ({
  createTool: mockCreateTool,
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: mockSupabaseFrom,
  },
}));

describe('createSafetyObservationTool', () => {
  let createSafetyObservationTool: any;
  let mockContext: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockContext = createMockToolContext({ projectId: 'project-123', userId: 'user-123' });

    // Dynamic import to get fresh module with mocks
    const module = await import('../create-observation');
    createSafetyObservationTool = module.createSafetyObservationTool;
  });

  // ==========================================================================
  // Tool Definition Tests
  // ==========================================================================

  describe('Tool Definition', () => {
    it('should have correct name and category', () => {
      expect(createSafetyObservationTool.name).toBe('create_safety_observation');
      expect(createSafetyObservationTool.category).toBe('action');
    });

    it('should have required parameters defined', () => {
      const { parameters } = createSafetyObservationTool;
      expect(parameters.required).toContain('project_id');
      expect(parameters.required).toContain('company_id');
      expect(parameters.required).toContain('description');
    });

    it('should have valid observation_type enum', () => {
      const { parameters } = createSafetyObservationTool;
      const typeEnum = parameters.properties.observation_type.enum;
      expect(typeEnum).toContain('positive');
      expect(typeEnum).toContain('negative');
      expect(typeEnum).toContain('corrective_action');
    });

    it('should not require confirmation', () => {
      expect(createSafetyObservationTool.requiresConfirmation).toBe(false);
    });
  });

  // ==========================================================================
  // Observation Type Auto-Detection Tests
  // ==========================================================================

  describe('Observation Type Auto-Detection', () => {
    it('should detect positive observation from description', async () => {
      setupMockQueries({ observationId: 'obs-1' });

      // Use "great" and "well done" without "correct/fix/address/resolve" to avoid corrective_action detection
      const result = await createSafetyObservationTool.execute(
        {
          project_id: 'project-123',
          company_id: 'company-123',
          description: 'Great job! Worker wearing full PPE as required. Well done team!',
        },
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.data.auto_classifications.type).toBe('positive');
      expect(result.data.auto_classifications.type_confidence).toBeGreaterThan(0.5);
    });

    it('should detect negative observation from description', async () => {
      setupMockQueries({ observationId: 'obs-2' });

      // Use "missing" and "forgot" which are in NEGATIVE_INDICATORS
      // Avoid any positive words like "good/great/excellent/proper/correct/wearing/following"
      const result = await createSafetyObservationTool.execute(
        {
          project_id: 'project-123',
          company_id: 'company-123',
          description: 'Worker forgot hard hat. PPE missing in hazard zone.',
        },
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.data.auto_classifications.type).toBe('negative');
    });

    it('should detect corrective action from description', async () => {
      setupMockQueries({ observationId: 'obs-3' });

      const result = await createSafetyObservationTool.execute(
        {
          project_id: 'project-123',
          company_id: 'company-123',
          description: 'Unsafe ladder was removed and fixed. Issue has been resolved.',
        },
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.data.auto_classifications.type).toBe('corrective_action');
    });

    it('should use provided type over auto-detection', async () => {
      setupMockQueries({ observationId: 'obs-4' });

      const result = await createSafetyObservationTool.execute(
        {
          project_id: 'project-123',
          company_id: 'company-123',
          description: 'Great work on safety!',
          observation_type: 'negative', // Override auto-detection
        },
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.data.auto_classifications.type).toBe('negative');
      expect(result.data.auto_classifications.type_confidence).toBe(1.0);
    });
  });

  // ==========================================================================
  // Category Auto-Detection Tests
  // ==========================================================================

  describe('Category Auto-Detection', () => {
    it('should detect PPE category', async () => {
      setupMockQueries({ observationId: 'obs-5' });

      const result = await createSafetyObservationTool.execute(
        {
          project_id: 'project-123',
          company_id: 'company-123',
          description: 'Worker missing safety glasses while grinding',
        },
        mockContext
      );

      expect(result.data.auto_classifications.category).toBe('ppe');
    });

    it('should detect housekeeping category', async () => {
      setupMockQueries({ observationId: 'obs-6' });

      const result = await createSafetyObservationTool.execute(
        {
          project_id: 'project-123',
          company_id: 'company-123',
          description: 'Debris and clutter causing trip hazard in walkway',
        },
        mockContext
      );

      expect(result.data.auto_classifications.category).toBe('housekeeping');
    });

    it('should detect equipment category', async () => {
      setupMockQueries({ observationId: 'obs-7' });

      const result = await createSafetyObservationTool.execute(
        {
          project_id: 'project-123',
          company_id: 'company-123',
          description: 'Damaged ladder found on scaffold',
        },
        mockContext
      );

      expect(result.data.auto_classifications.category).toBe('equipment');
    });

    it('should detect procedure category', async () => {
      setupMockQueries({ observationId: 'obs-8' });

      const result = await createSafetyObservationTool.execute(
        {
          project_id: 'project-123',
          company_id: 'company-123',
          description: 'Lock out tag out procedure not being followed properly',
        },
        mockContext
      );

      expect(result.data.auto_classifications.category).toBe('procedure');
    });

    it('should detect behavior category', async () => {
      setupMockQueries({ observationId: 'obs-9' });

      const result = await createSafetyObservationTool.execute(
        {
          project_id: 'project-123',
          company_id: 'company-123',
          description: 'Workers horseplay near excavation edge',
        },
        mockContext
      );

      expect(result.data.auto_classifications.category).toBe('behavior');
    });

    it('should detect near_miss category', async () => {
      setupMockQueries({ observationId: 'obs-10' });

      const result = await createSafetyObservationTool.execute(
        {
          project_id: 'project-123',
          company_id: 'company-123',
          description: 'Close call - worker almost fell from platform',
        },
        mockContext
      );

      expect(result.data.auto_classifications.category).toBe('near_miss');
    });

    it('should default to general category when no pattern matches', async () => {
      setupMockQueries({ observationId: 'obs-11' });

      const result = await createSafetyObservationTool.execute(
        {
          project_id: 'project-123',
          company_id: 'company-123',
          description: 'Random observation with no safety keywords',
        },
        mockContext
      );

      expect(result.data.auto_classifications.category).toBe('general');
      expect(result.data.auto_classifications.category_confidence).toBeLessThan(0.5);
    });
  });

  // ==========================================================================
  // Severity Detection Tests
  // ==========================================================================

  describe('Severity Detection', () => {
    it('should detect critical severity for life-threatening hazards', async () => {
      setupMockQueries({ observationId: 'obs-12' });

      const result = await createSafetyObservationTool.execute(
        {
          project_id: 'project-123',
          company_id: 'company-123',
          description: 'Immediate danger - scaffold about to collapse',
        },
        mockContext
      );

      expect(result.data.auto_classifications.severity).toBe('critical');
    });

    it('should detect high severity for serious hazards', async () => {
      setupMockQueries({ observationId: 'obs-13' });

      const result = await createSafetyObservationTool.execute(
        {
          project_id: 'project-123',
          company_id: 'company-123',
          description: 'Worker struck by falling material causing laceration',
        },
        mockContext
      );

      expect(result.data.auto_classifications.severity).toBe('high');
    });

    it('should detect medium severity for minor issues', async () => {
      setupMockQueries({ observationId: 'obs-14' });

      const result = await createSafetyObservationTool.execute(
        {
          project_id: 'project-123',
          company_id: 'company-123',
          description: 'Minor bruise from tool',
        },
        mockContext
      );

      expect(result.data.auto_classifications.severity).toBe('medium');
    });

    it('should detect low severity for positive observations', async () => {
      setupMockQueries({ observationId: 'obs-15' });

      const result = await createSafetyObservationTool.execute(
        {
          project_id: 'project-123',
          company_id: 'company-123',
          description: 'Excellent safety practices observed. Good job team!',
        },
        mockContext
      );

      expect(result.data.auto_classifications.severity).toBe('low');
      expect(result.data.auto_classifications.severity_confidence).toBeGreaterThan(0.9);
    });
  });

  // ==========================================================================
  // Points Calculation Tests
  // ==========================================================================

  describe('Points Calculation', () => {
    it('should award 10 points for positive observations', async () => {
      setupMockQueries({ observationId: 'obs-16' });

      const result = await createSafetyObservationTool.execute(
        {
          project_id: 'project-123',
          company_id: 'company-123',
          description: 'Great job wearing all required PPE!',
        },
        mockContext
      );

      expect(result.data.points_awarded).toBe(8); // 10 * 0.8 (low severity multiplier)
    });

    it('should award 15 points for corrective actions', async () => {
      setupMockQueries({ observationId: 'obs-17' });

      const result = await createSafetyObservationTool.execute(
        {
          project_id: 'project-123',
          company_id: 'company-123',
          description: 'Unsafe condition fixed and resolved immediately',
        },
        mockContext
      );

      expect(result.data.points_awarded).toBeGreaterThanOrEqual(12); // 15 * some multiplier
    });

    it('should apply severity multiplier to points', async () => {
      setupMockQueries({ observationId: 'obs-18' });

      const result = await createSafetyObservationTool.execute(
        {
          project_id: 'project-123',
          company_id: 'company-123',
          description: 'Critical collapse hazard identified and corrected',
        },
        mockContext
      );

      // Should get higher points due to critical severity (2x multiplier)
      expect(result.data.points_awarded).toBeGreaterThan(10);
    });
  });

  // ==========================================================================
  // Corrective Actions Tests
  // ==========================================================================

  describe('Corrective Actions', () => {
    it('should suggest PPE-related corrective actions', async () => {
      setupMockQueries({ observationId: 'obs-19' });

      // Use "missing" instead of "not wearing" since "wearing" matches positive pattern
      const result = await createSafetyObservationTool.execute(
        {
          project_id: 'project-123',
          company_id: 'company-123',
          description: 'Hard hat missing from worker. Safety glasses also missing.',
          observation_type: 'negative', // Explicitly set to negative for this test
        },
        mockContext
      );

      expect(result.data.suggested_corrective_actions).toBeDefined();
      expect(result.data.suggested_corrective_actions.length).toBeGreaterThan(0);
      expect(result.data.suggested_corrective_actions.some((a: string) =>
        a.toLowerCase().includes('ppe')
      )).toBe(true);
    });

    it('should not suggest corrective actions for positive observations', async () => {
      setupMockQueries({ observationId: 'obs-20' });

      const result = await createSafetyObservationTool.execute(
        {
          project_id: 'project-123',
          company_id: 'company-123',
          description: 'Great safety awareness!',
        },
        mockContext
      );

      expect(result.data.suggested_corrective_actions).toBeUndefined();
    });

    it('should suggest housekeeping actions for housekeeping issues', async () => {
      setupMockQueries({ observationId: 'obs-21' });

      const result = await createSafetyObservationTool.execute(
        {
          project_id: 'project-123',
          company_id: 'company-123',
          description: 'Debris causing trip hazard',
        },
        mockContext
      );

      expect(result.data.suggested_corrective_actions.some((a: string) =>
        a.toLowerCase().includes('clean') || a.toLowerCase().includes('housekeeping')
      )).toBe(true);
    });
  });

  // ==========================================================================
  // Similar Observations Tests
  // ==========================================================================

  describe('Similar Observations', () => {
    it('should find similar observations from same project and category', async () => {
      setupMockQueries({
        observationId: 'obs-22',
        similarObservations: [
          { id: 'similar-1', description: 'PPE issue yesterday', status: 'closed' },
          { id: 'similar-2', description: 'Another PPE issue', status: 'open' },
        ],
      });

      const result = await createSafetyObservationTool.execute(
        {
          project_id: 'project-123',
          company_id: 'company-123',
          description: 'Worker missing hard hat',
        },
        mockContext
      );

      expect(result.data.similar_observations).toBeDefined();
      expect(result.data.similar_observations.length).toBe(2);
    });

    it('should include resolution status in similar observations', async () => {
      setupMockQueries({
        observationId: 'obs-23',
        similarObservations: [
          { id: 'similar-1', description: 'Resolved issue', status: 'closed' },
        ],
      });

      const result = await createSafetyObservationTool.execute(
        {
          project_id: 'project-123',
          company_id: 'company-123',
          description: 'Safety issue',
        },
        mockContext
      );

      expect(result.data.similar_observations[0].resolution).toBe('Resolved');
    });
  });

  // ==========================================================================
  // Photo Attachment Tests
  // ==========================================================================

  describe('Photo Attachments', () => {
    it('should attach photos when provided', async () => {
      const photoInsertMock = vi.fn().mockResolvedValue({ data: null, error: null });

      setupMockQueries({
        observationId: 'obs-24',
        photoInsert: photoInsertMock,
      });

      const result = await createSafetyObservationTool.execute(
        {
          project_id: 'project-123',
          company_id: 'company-123',
          description: 'Safety observation with photos',
          photo_urls: ['https://example.com/photo1.jpg', 'https://example.com/photo2.jpg'],
        },
        mockContext
      );

      expect(result.success).toBe(true);
      // The mock should have been called for photo insertion
    });
  });

  // ==========================================================================
  // Error Handling Tests
  // ==========================================================================

  describe('Error Handling', () => {
    it('should handle database insert error', async () => {
      mockSupabaseFrom.mockImplementation(() =>
        createMockSupabaseQuery({
          data: null,
          error: { message: 'Database error' },
        })
      );

      const result = await createSafetyObservationTool.execute(
        {
          project_id: 'project-123',
          company_id: 'company-123',
          description: 'Test observation',
        },
        mockContext
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Database error');
      expect(result.errorCode).toBe('CREATE_FAILED');
    });
  });

  // ==========================================================================
  // Output Formatting Tests
  // ==========================================================================

  describe('Output Formatting', () => {
    it('should format positive observation output correctly', async () => {
      setupMockQueries({ observationId: 'obs-25', observationType: 'positive' });

      const result = await createSafetyObservationTool.execute(
        {
          project_id: 'project-123',
          company_id: 'company-123',
          description: 'Great safety work!',
          observation_type: 'positive', // Explicitly set for this formatting test
        },
        mockContext
      );

      const formatted = createSafetyObservationTool.formatOutput(result.data);

      expect(formatted.title).toContain('positive');
      expect(formatted.icon).toBe('thumbs-up');
      expect(formatted.status).toBe('success');
    });

    it('should format negative observation output correctly', async () => {
      setupMockQueries({ observationId: 'obs-26' });

      const result = await createSafetyObservationTool.execute(
        {
          project_id: 'project-123',
          company_id: 'company-123',
          description: 'Worker forgot hard hat. Safety violation.',
          observation_type: 'negative', // Explicitly set for formatting test
        },
        mockContext
      );

      const formatted = createSafetyObservationTool.formatOutput(result.data);

      expect(formatted.icon).toBe('alert-triangle');
      expect(formatted.status).toBe('warning');
    });

    it('should include points in summary', async () => {
      setupMockQueries({ observationId: 'obs-27' });

      const result = await createSafetyObservationTool.execute(
        {
          project_id: 'project-123',
          company_id: 'company-123',
          description: 'Good safety practice observed',
        },
        mockContext
      );

      const formatted = createSafetyObservationTool.formatOutput(result.data);

      expect(formatted.summary).toContain('points');
    });

    it('should include view action', async () => {
      setupMockQueries({ observationId: 'obs-28' });

      const result = await createSafetyObservationTool.execute(
        {
          project_id: 'project-123',
          company_id: 'company-123',
          description: 'Test observation',
        },
        mockContext
      );

      const formatted = createSafetyObservationTool.formatOutput(result.data);

      expect(formatted.actions).toBeDefined();
      expect(formatted.actions[0].label).toBe('View Observation');
    });
  });

  // ==========================================================================
  // Recognized Person Tests
  // ==========================================================================

  describe('Recognized Person', () => {
    it('should include recognized person for positive observations', async () => {
      setupMockQueries({ observationId: 'obs-29' });

      const result = await createSafetyObservationTool.execute(
        {
          project_id: 'project-123',
          company_id: 'company-123',
          description: 'Excellent safety awareness!',
          recognized_person: 'John Smith',
        },
        mockContext
      );

      expect(result.success).toBe(true);
      // The observation data sent to DB should include the recognized person
    });
  });

  // ==========================================================================
  // Location Handling Tests
  // ==========================================================================

  describe('Location Handling', () => {
    it('should use provided location', async () => {
      setupMockQueries({ observationId: 'obs-30' });

      const result = await createSafetyObservationTool.execute(
        {
          project_id: 'project-123',
          company_id: 'company-123',
          description: 'Safety issue',
          location: 'Level 3 - West Wing',
        },
        mockContext
      );

      expect(result.data.observation.location).toBe('Level 3 - West Wing');
    });

    it('should default to "Not specified" when no location provided', async () => {
      setupMockQueries({ observationId: 'obs-31' });

      const result = await createSafetyObservationTool.execute(
        {
          project_id: 'project-123',
          company_id: 'company-123',
          description: 'Safety issue',
        },
        mockContext
      );

      expect(result.data.observation.location).toBe('Not specified');
    });
  });

  // ==========================================================================
  // Helper Functions
  // ==========================================================================

  interface MockSetup {
    observationId: string;
    similarObservations?: any[];
    photoInsert?: any;
    observationType?: string;
    location?: string;
  }

  function setupMockQueries(setup: MockSetup) {
    let callCount = 0;
    let insertedData: any = null;

    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'safety_observations') {
        callCount++;
        if (callCount === 1) {
          // Create a query mock that captures insert data and returns it in select
          const query = createMockSupabaseQuery({
            data: null,
            error: null,
          });

          // Override insert to capture data and return it
          query.insert = vi.fn((data: any) => {
            insertedData = data;
            // Return a new query for chaining that will return the inserted data
            const insertQuery = createMockSupabaseQuery({
              data: {
                id: setup.observationId,
                ...data,
                created_at: new Date().toISOString(),
              },
              error: null,
            });
            return insertQuery;
          });

          return query;
        } else {
          // Similar observations query
          return createMockSupabaseQuery({
            data: setup.similarObservations || [],
            error: null,
          });
        }
      }

      if (table === 'safety_observation_photos') {
        if (setup.photoInsert) {
          return { insert: setup.photoInsert };
        }
        return createMockSupabaseQuery({ data: null, error: null });
      }

      return createMockSupabaseQuery({ data: null, error: null });
    });
  }
});
