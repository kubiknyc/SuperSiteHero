/**
 * Tests for Safety Checklist Generator Tool
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockToolContext } from '../../__tests__/test-utils';

// Hoist the mock
const mockCreateTool = vi.hoisted(() => vi.fn((config) => config));

vi.mock('../../registry', () => ({
  createTool: mockCreateTool,
}));

describe('generateSafetyChecklistTool', () => {
  let generateSafetyChecklistTool: any;
  let mockContext: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockContext = createMockToolContext({ projectId: 'project-123' });

    // Dynamic import to get fresh module with mocks
    const module = await import('../generate-checklist');
    generateSafetyChecklistTool = module.generateSafetyChecklistTool;
  });

  // ==========================================================================
  // Tool Definition Tests
  // ==========================================================================

  describe('Tool Definition', () => {
    it('should have correct name and category', () => {
      expect(generateSafetyChecklistTool.name).toBe('generate_safety_checklist');
      expect(generateSafetyChecklistTool.category).toBe('safety');
    });

    it('should have required parameters defined', () => {
      const { parameters } = generateSafetyChecklistTool;
      expect(parameters.required).toContain('work_type');
      expect(parameters.properties.work_type).toBeDefined();
      expect(parameters.properties.location).toBeDefined();
      expect(parameters.properties.weather_conditions).toBeDefined();
      expect(parameters.properties.special_hazards).toBeDefined();
      expect(parameters.properties.include_ppe).toBeDefined();
      expect(parameters.properties.include_permits).toBeDefined();
    });

    it('should have a description', () => {
      expect(generateSafetyChecklistTool.description).toContain('safety checklist');
    });
  });

  // ==========================================================================
  // Excavation Work Type Tests
  // ==========================================================================

  describe('Excavation Work Type', () => {
    it('should generate excavation-specific checklist items', async () => {
      const result = await generateSafetyChecklistTool.execute(
        { work_type: 'excavation' },
        mockContext
      );

      expect(result.work_type).toBe('excavation');
      expect(result.checklist_title).toContain('Excavation');

      // Should have excavation-specific items
      const excavationItems = result.items.filter(
        (item: any) => item.category === 'Excavation Safety'
      );
      expect(excavationItems.length).toBeGreaterThan(0);

      // Check for key excavation safety items
      const itemTexts = result.items.map((i: any) => i.item);
      expect(itemTexts).toContain('Verify utility locates completed (call 811)');
      expect(itemTexts).toContain('Competent person inspection of excavation');
    });

    it('should include shoring requirements for deep excavations', async () => {
      const result = await generateSafetyChecklistTool.execute(
        { work_type: 'excavation' },
        mockContext
      );

      const itemTexts = result.items.map((i: any) => i.item);
      expect(itemTexts.some((t: string) => t.includes('shoring') || t.includes('trench boxes'))).toBe(true);
    });

    it('should require excavation permit', async () => {
      const result = await generateSafetyChecklistTool.execute(
        { work_type: 'excavation', include_permits: true },
        mockContext
      );

      expect(result.required_permits).toContain('Excavation permit');
      expect(result.required_permits).toContain('Utility locate confirmation (811)');
    });
  });

  // ==========================================================================
  // Roofing Work Type Tests
  // ==========================================================================

  describe('Roofing Work Type', () => {
    it('should generate roofing-specific checklist items', async () => {
      const result = await generateSafetyChecklistTool.execute(
        { work_type: 'roofing' },
        mockContext
      );

      expect(result.work_type).toBe('roofing');

      const fallItems = result.items.filter(
        (item: any) => item.category === 'Fall Protection'
      );
      expect(fallItems.length).toBeGreaterThan(0);

      const itemTexts = result.items.map((i: any) => i.item);
      expect(itemTexts.some((t: string) => t.includes('warning lines'))).toBe(true);
    });

    it('should include fire safety for hot work on roofs', async () => {
      const result = await generateSafetyChecklistTool.execute(
        { work_type: 'roofing' },
        mockContext
      );

      const itemTexts = result.items.map((i: any) => i.item);
      expect(itemTexts.some((t: string) => t.includes('Fire extinguisher'))).toBe(true);
    });
  });

  // ==========================================================================
  // Electrical Work Type Tests
  // ==========================================================================

  describe('Electrical Work Type', () => {
    it('should generate electrical-specific checklist items', async () => {
      const result = await generateSafetyChecklistTool.execute(
        { work_type: 'electrical' },
        mockContext
      );

      const electricalItems = result.items.filter(
        (item: any) => item.category === 'Electrical Safety'
      );
      expect(electricalItems.length).toBeGreaterThan(0);

      const itemTexts = result.items.map((i: any) => i.item);
      expect(itemTexts).toContain('Verify lockout/tagout procedures followed');
      expect(itemTexts).toContain('Test for absence of voltage');
    });

    it('should require electrical PPE', async () => {
      const result = await generateSafetyChecklistTool.execute(
        { work_type: 'electrical', include_ppe: true },
        mockContext
      );

      expect(result.ppe_requirements).toContain('Voltage-rated gloves');
      expect(result.ppe_requirements.some((p: string) => p.includes('Arc flash') || p.includes('arc-rated'))).toBe(true);
    });

    it('should require electrical permits', async () => {
      const result = await generateSafetyChecklistTool.execute(
        { work_type: 'electrical', include_permits: true },
        mockContext
      );

      expect(result.required_permits).toContain('Electrical work permit');
      expect(result.required_permits).toContain('Lockout/Tagout authorization');
    });
  });

  // ==========================================================================
  // Concrete Work Type Tests
  // ==========================================================================

  describe('Concrete Work Type', () => {
    it('should generate concrete-specific checklist items', async () => {
      const result = await generateSafetyChecklistTool.execute(
        { work_type: 'concrete' },
        mockContext
      );

      const concreteItems = result.items.filter(
        (item: any) => item.category === 'Concrete Safety'
      );
      expect(concreteItems.length).toBeGreaterThan(0);

      const itemTexts = result.items.map((i: any) => i.item);
      expect(itemTexts.some((t: string) => t.includes('rubber boots'))).toBe(true);
      expect(itemTexts.some((t: string) => t.includes('Eye wash'))).toBe(true);
    });

    it('should require concrete-specific PPE', async () => {
      const result = await generateSafetyChecklistTool.execute(
        { work_type: 'concrete', include_ppe: true },
        mockContext
      );

      expect(result.ppe_requirements).toContain('Rubber boots');
      expect(result.ppe_requirements).toContain('Chemical-resistant gloves');
    });
  });

  // ==========================================================================
  // Demolition Work Type Tests
  // ==========================================================================

  describe('Demolition Work Type', () => {
    it('should generate demolition-specific checklist items', async () => {
      const result = await generateSafetyChecklistTool.execute(
        { work_type: 'demolition' },
        mockContext
      );

      const demolitionItems = result.items.filter(
        (item: any) => item.category === 'Demolition Safety'
      );
      expect(demolitionItems.length).toBeGreaterThan(0);

      const itemTexts = result.items.map((i: any) => i.item);
      expect(itemTexts).toContain('Engineering survey completed');
      expect(itemTexts).toContain('Utilities disconnected and capped');
      expect(itemTexts).toContain('Hazmat survey (asbestos, lead)');
    });

    it('should require demolition permits', async () => {
      const result = await generateSafetyChecklistTool.execute(
        { work_type: 'demolition', include_permits: true },
        mockContext
      );

      expect(result.required_permits).toContain('Demolition permit');
      expect(result.required_permits).toContain('Hazmat clearance');
    });
  });

  // ==========================================================================
  // Steel Erection Work Type Tests
  // ==========================================================================

  describe('Steel Erection Work Type', () => {
    it('should generate steel erection-specific checklist items', async () => {
      const result = await generateSafetyChecklistTool.execute(
        { work_type: 'steel erection' },
        mockContext
      );

      const steelItems = result.items.filter(
        (item: any) => item.category === 'Steel Erection'
      );
      expect(steelItems.length).toBeGreaterThan(0);

      const itemTexts = result.items.map((i: any) => i.item);
      expect(itemTexts.some((t: string) => t.includes('Anchor bolts'))).toBe(true);
      expect(itemTexts.some((t: string) => t.includes('Crane inspection'))).toBe(true);
      expect(itemTexts.some((t: string) => t.includes('100% tie-off'))).toBe(true);
    });
  });

  // ==========================================================================
  // Welding Work Type Tests
  // ==========================================================================

  describe('Welding Work Type', () => {
    it('should generate welding/hot work-specific checklist items', async () => {
      const result = await generateSafetyChecklistTool.execute(
        { work_type: 'welding' },
        mockContext
      );

      const hotWorkItems = result.items.filter(
        (item: any) => item.category === 'Hot Work'
      );
      expect(hotWorkItems.length).toBeGreaterThan(0);

      const itemTexts = result.items.map((i: any) => i.item);
      expect(itemTexts).toContain('Hot work permit obtained');
      expect(itemTexts).toContain('Fire watch assigned');
      expect(itemTexts.some((t: string) => t.includes('ventilation'))).toBe(true);
    });

    it('should require welding PPE', async () => {
      const result = await generateSafetyChecklistTool.execute(
        { work_type: 'welding', include_ppe: true },
        mockContext
      );

      expect(result.ppe_requirements.some((p: string) => p.includes('Welding helmet'))).toBe(true);
      expect(result.ppe_requirements.some((p: string) => p.includes('welding gloves'))).toBe(true);
      expect(result.ppe_requirements.some((p: string) => p.includes('Flame-resistant'))).toBe(true);
    });

    it('should require hot work permit', async () => {
      const result = await generateSafetyChecklistTool.execute(
        { work_type: 'welding', include_permits: true },
        mockContext
      );

      expect(result.required_permits).toContain('Hot work permit');
    });
  });

  // ==========================================================================
  // Location-Based Items Tests
  // ==========================================================================

  describe('Location-Based Items', () => {
    it('should add fall protection items for elevated locations', async () => {
      const result = await generateSafetyChecklistTool.execute(
        { work_type: 'concrete', location: 'elevated platform' },
        mockContext
      );

      const fallItems = result.items.filter(
        (item: any) => item.category === 'Fall Protection'
      );
      expect(fallItems.length).toBeGreaterThan(0);
    });

    it('should add scaffold-specific items for scaffold locations', async () => {
      const result = await generateSafetyChecklistTool.execute(
        { work_type: 'concrete', location: 'scaffold' },
        mockContext
      );

      const itemTexts = result.items.map((i: any) => i.item);
      expect(itemTexts.some((t: string) => t.includes('Scaffold inspection'))).toBe(true);
    });

    it('should add confined space items for confined locations', async () => {
      const result = await generateSafetyChecklistTool.execute(
        { work_type: 'excavation', location: 'confined space vault' },
        mockContext
      );

      const confinedItems = result.items.filter(
        (item: any) => item.category === 'Confined Space'
      );
      expect(confinedItems.length).toBeGreaterThan(0);

      const itemTexts = result.items.map((i: any) => i.item);
      expect(itemTexts).toContain('Confined space permit obtained');
      expect(itemTexts).toContain('Atmospheric testing completed');
      expect(itemTexts.some((t: string) => t.includes('Attendant'))).toBe(true);
    });

    it('should require confined space PPE', async () => {
      // Use 'confined space' location which triggers the confined space PPE logic
      const result = await generateSafetyChecklistTool.execute(
        { work_type: 'welding', location: 'confined space tank', include_ppe: true },
        mockContext
      );

      // Confined space PPE includes Supplied air respirator, Gas detector/monitor, and Retrieval system
      expect(result.ppe_requirements.some((p: string) =>
        p.toLowerCase().includes('respirator') || p.toLowerCase().includes('air')
      )).toBe(true);
      expect(result.ppe_requirements.some((p: string) =>
        p.includes('Gas detector') || p.includes('monitor') || p.includes('Retrieval')
      )).toBe(true);
    });

    it('should require confined space permit', async () => {
      const result = await generateSafetyChecklistTool.execute(
        { work_type: 'concrete', location: 'vault', include_permits: true },
        mockContext
      );

      expect(result.required_permits).toContain('Confined space entry permit');
    });
  });

  // ==========================================================================
  // Weather Conditions Tests
  // ==========================================================================

  describe('Weather Conditions', () => {
    it('should add heat safety items for hot weather', async () => {
      const result = await generateSafetyChecklistTool.execute(
        { work_type: 'roofing', weather_conditions: 'hot summer day' },
        mockContext
      );

      const heatItems = result.items.filter(
        (item: any) => item.category === 'Heat Safety'
      );
      expect(heatItems.length).toBeGreaterThan(0);

      expect(result.weather_considerations.length).toBeGreaterThan(0);
      expect(result.weather_considerations.some((c: string) => c.includes('water') || c.includes('hydration'))).toBe(true);
    });

    it('should add cold safety items for cold weather', async () => {
      const result = await generateSafetyChecklistTool.execute(
        { work_type: 'concrete', weather_conditions: 'cold winter' },
        mockContext
      );

      const coldItems = result.items.filter(
        (item: any) => item.category === 'Cold Safety'
      );
      expect(coldItems.length).toBeGreaterThan(0);

      expect(result.weather_considerations.some((c: string) => c.includes('hypothermia') || c.includes('frostbite'))).toBe(true);
    });

    it('should add rain/storm safety items', async () => {
      const result = await generateSafetyChecklistTool.execute(
        { work_type: 'electrical', weather_conditions: 'rain expected' },
        mockContext
      );

      const weatherItems = result.items.filter(
        (item: any) => item.category === 'Weather Safety'
      );
      expect(weatherItems.length).toBeGreaterThan(0);

      expect(result.weather_considerations.some((c: string) => c.includes('Lightning') || c.includes('slip'))).toBe(true);
    });

    it('should add wind safety items', async () => {
      const result = await generateSafetyChecklistTool.execute(
        { work_type: 'steel erection', weather_conditions: 'windy' },
        mockContext
      );

      const windItems = result.items.filter(
        (item: any) => item.category === 'Wind Safety'
      );
      expect(windItems.length).toBeGreaterThan(0);

      const itemTexts = result.items.map((i: any) => i.item);
      expect(itemTexts.some((t: string) => t.includes('crane') && t.includes('wind'))).toBe(true);
    });
  });

  // ==========================================================================
  // Special Hazards Tests
  // ==========================================================================

  describe('Special Hazards', () => {
    it('should add asbestos items when asbestos hazard specified', async () => {
      const result = await generateSafetyChecklistTool.execute(
        { work_type: 'demolition', special_hazards: ['asbestos'] },
        mockContext
      );

      const hazmatItems = result.items.filter(
        (item: any) => item.category === 'Hazmat'
      );
      expect(hazmatItems.length).toBeGreaterThan(0);

      const itemTexts = result.items.map((i: any) => i.item);
      expect(itemTexts.some((t: string) => t.includes('Asbestos abatement'))).toBe(true);
      expect(itemTexts.some((t: string) => t.includes('Containment'))).toBe(true);
    });

    it('should add lead safety items when lead hazard specified', async () => {
      const result = await generateSafetyChecklistTool.execute(
        { work_type: 'demolition', special_hazards: ['lead paint'] },
        mockContext
      );

      const itemTexts = result.items.map((i: any) => i.item);
      expect(itemTexts.some((t: string) => t.includes('Lead exposure'))).toBe(true);
      expect(itemTexts.some((t: string) => t.includes('Decontamination'))).toBe(true);
    });

    it('should add silica safety items when silica hazard specified', async () => {
      const result = await generateSafetyChecklistTool.execute(
        { work_type: 'concrete', special_hazards: ['silica dust'] },
        mockContext
      );

      const itemTexts = result.items.map((i: any) => i.item);
      expect(itemTexts.some((t: string) => t.includes('Silica exposure'))).toBe(true);
      expect(itemTexts.some((t: string) => t.includes('Wet cutting'))).toBe(true);
    });

    it('should handle multiple hazards', async () => {
      const result = await generateSafetyChecklistTool.execute(
        { work_type: 'demolition', special_hazards: ['asbestos', 'lead', 'silica'] },
        mockContext
      );

      const hazmatItems = result.items.filter(
        (item: any) => item.category === 'Hazmat'
      );
      expect(hazmatItems.length).toBeGreaterThanOrEqual(6); // At least 2 items per hazard
    });
  });

  // ==========================================================================
  // PPE Requirements Tests
  // ==========================================================================

  describe('PPE Requirements', () => {
    it('should include base PPE for all work types', async () => {
      const result = await generateSafetyChecklistTool.execute(
        { work_type: 'concrete', include_ppe: true },
        mockContext
      );

      expect(result.ppe_requirements).toContain('Hard hat (ANSI Z89.1)');
      expect(result.ppe_requirements).toContain('Safety glasses (ANSI Z87.1)');
      expect(result.ppe_requirements.some((p: string) => p.includes('High-visibility vest'))).toBe(true);
      expect(result.ppe_requirements.some((p: string) => p.includes('Safety-toe boots'))).toBe(true);
    });

    it('should exclude PPE when include_ppe is false', async () => {
      const result = await generateSafetyChecklistTool.execute(
        { work_type: 'excavation', include_ppe: false },
        mockContext
      );

      expect(result.ppe_requirements).toHaveLength(0);
    });

    it('should add fall protection PPE for elevated locations', async () => {
      const result = await generateSafetyChecklistTool.execute(
        { work_type: 'roofing', location: 'roof', include_ppe: true },
        mockContext
      );

      expect(result.ppe_requirements.some((p: string) => p.includes('harness'))).toBe(true);
      expect(result.ppe_requirements.some((p: string) => p.includes('lanyard'))).toBe(true);
    });
  });

  // ==========================================================================
  // Permit Requirements Tests
  // ==========================================================================

  describe('Permit Requirements', () => {
    it('should include default authorization for unknown work types', async () => {
      const result = await generateSafetyChecklistTool.execute(
        { work_type: 'general labor', include_permits: true },
        mockContext
      );

      expect(result.required_permits).toContain('Standard work authorization');
    });

    it('should exclude permits when include_permits is false', async () => {
      const result = await generateSafetyChecklistTool.execute(
        { work_type: 'excavation', include_permits: false },
        mockContext
      );

      expect(result.required_permits).toHaveLength(0);
    });

    it('should require crane permits for crane work', async () => {
      const result = await generateSafetyChecklistTool.execute(
        { work_type: 'crane lift', include_permits: true },
        mockContext
      );

      expect(result.required_permits.some((p: string) => p.includes('Crane') || p.includes('lift'))).toBe(true);
    });
  });

  // ==========================================================================
  // Emergency Contacts Tests
  // ==========================================================================

  describe('Emergency Contacts', () => {
    it('should always include emergency contacts', async () => {
      const result = await generateSafetyChecklistTool.execute(
        { work_type: 'excavation' },
        mockContext
      );

      expect(result.emergency_contacts.length).toBeGreaterThan(0);
      expect(result.emergency_contacts.some((c: any) => c.role.includes('Safety'))).toBe(true);
      expect(result.emergency_contacts.some((c: any) => c.role.includes('911'))).toBe(true);
    });
  });

  // ==========================================================================
  // Toolbox Talk Topics Tests
  // ==========================================================================

  describe('Toolbox Talk Topics', () => {
    it('should generate relevant toolbox topics', async () => {
      const result = await generateSafetyChecklistTool.execute(
        { work_type: 'excavation' },
        mockContext
      );

      expect(result.toolbox_talk_topics.length).toBeGreaterThan(0);
      expect(result.toolbox_talk_topics.length).toBeLessThanOrEqual(5);
      expect(result.toolbox_talk_topics.some((t: string) => t.includes('Trench'))).toBe(true);
    });

    it('should include stop work authority topic', async () => {
      const result = await generateSafetyChecklistTool.execute(
        { work_type: 'concrete' },
        mockContext
      );

      expect(result.toolbox_talk_topics.some((t: string) => t.includes('Stop Work'))).toBe(true);
    });

    it('should include incident reporting topic', async () => {
      const result = await generateSafetyChecklistTool.execute(
        { work_type: 'roofing' },
        mockContext
      );

      expect(result.toolbox_talk_topics.some((t: string) => t.includes('Incident') || t.includes('near-miss'))).toBe(true);
    });

    it('should include silica topic when silica hazard present', async () => {
      const result = await generateSafetyChecklistTool.execute(
        { work_type: 'concrete', special_hazards: ['silica'] },
        mockContext
      );

      expect(result.toolbox_talk_topics.some((t: string) => t.includes('Silica'))).toBe(true);
    });
  });

  // ==========================================================================
  // Checklist Item Properties Tests
  // ==========================================================================

  describe('Checklist Item Properties', () => {
    it('should have valid priority values', async () => {
      const result = await generateSafetyChecklistTool.execute(
        { work_type: 'excavation' },
        mockContext
      );

      const validPriorities = ['required', 'recommended', 'conditional'];
      for (const item of result.items) {
        expect(validPriorities).toContain(item.priority);
      }
    });

    it('should have valid frequency values', async () => {
      const result = await generateSafetyChecklistTool.execute(
        { work_type: 'excavation' },
        mockContext
      );

      const validFrequencies = ['once', 'daily', 'continuous'];
      for (const item of result.items) {
        expect(validFrequencies).toContain(item.frequency);
      }
    });

    it('should include notes for conditional items', async () => {
      const result = await generateSafetyChecklistTool.execute(
        { work_type: 'electrical' },
        mockContext
      );

      const conditionalItems = result.items.filter(
        (item: any) => item.priority === 'conditional'
      );

      for (const item of conditionalItems) {
        expect(item.notes).toBeDefined();
      }
    });
  });

  // ==========================================================================
  // Common Items Tests
  // ==========================================================================

  describe('Common Items', () => {
    it('should include pre-work items for all work types', async () => {
      const result = await generateSafetyChecklistTool.execute(
        { work_type: 'concrete' },
        mockContext
      );

      const preWorkItems = result.items.filter(
        (item: any) => item.category === 'Pre-Work'
      );
      expect(preWorkItems.length).toBeGreaterThan(0);

      const itemTexts = result.items.map((i: any) => i.item);
      expect(itemTexts.some((t: string) => t.includes('Job Hazard Analysis') || t.includes('JHA'))).toBe(true);
      expect(itemTexts.some((t: string) => t.includes('toolbox talk'))).toBe(true);
    });

    it('should include housekeeping items for all work types', async () => {
      const result = await generateSafetyChecklistTool.execute(
        { work_type: 'roofing' },
        mockContext
      );

      const housekeepingItems = result.items.filter(
        (item: any) => item.category === 'Housekeeping'
      );
      expect(housekeepingItems.length).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // Output Format Tests
  // ==========================================================================

  describe('Output Format', () => {
    it('should format checklist title correctly', async () => {
      const result = await generateSafetyChecklistTool.execute(
        { work_type: 'excavation' },
        mockContext
      );

      expect(result.checklist_title).toBe('Safety Checklist: Excavation');
    });

    it('should capitalize work type in title', async () => {
      const result = await generateSafetyChecklistTool.execute(
        { work_type: 'ROOFING' },
        mockContext
      );

      expect(result.checklist_title).toBe('Safety Checklist: Roofing');
    });
  });

  // ==========================================================================
  // Edge Cases Tests
  // ==========================================================================

  describe('Edge Cases', () => {
    it('should handle unknown work type with common items only', async () => {
      const result = await generateSafetyChecklistTool.execute(
        { work_type: 'unknown work type' },
        mockContext
      );

      expect(result.items.length).toBeGreaterThan(0);
      expect(result.checklist_title).toContain('Unknown work type');
    });

    it('should handle empty special hazards array', async () => {
      const result = await generateSafetyChecklistTool.execute(
        { work_type: 'excavation', special_hazards: [] },
        mockContext
      );

      expect(result.items.length).toBeGreaterThan(0);
    });

    it('should handle missing optional parameters', async () => {
      const result = await generateSafetyChecklistTool.execute(
        { work_type: 'concrete' },
        mockContext
      );

      expect(result).toBeDefined();
      expect(result.items.length).toBeGreaterThan(0);
      expect(result.ppe_requirements.length).toBeGreaterThan(0); // Default is include_ppe: true
    });

    it('should handle case-insensitive work types', async () => {
      const lowerResult = await generateSafetyChecklistTool.execute(
        { work_type: 'excavation' },
        mockContext
      );

      const upperResult = await generateSafetyChecklistTool.execute(
        { work_type: 'EXCAVATION' },
        mockContext
      );

      // Should have same number of excavation-specific items
      const lowerExcavation = lowerResult.items.filter(
        (i: any) => i.category === 'Excavation Safety'
      ).length;
      const upperExcavation = upperResult.items.filter(
        (i: any) => i.category === 'Excavation Safety'
      ).length;

      expect(lowerExcavation).toBe(upperExcavation);
    });
  });
});
