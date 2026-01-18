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
  expectSuccess,
  expectError,
} from '../../__tests__/test-utils';

describe('flag-rejection-risk', () => {
  let flagRejectionRiskTool: any;
  let mockContext: ReturnType<typeof createMockToolContext>;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockContext = createMockToolContext({ projectId: 'project-123' });
    // Dynamic import to ensure mocks are applied
    const module = await import('../flag-rejection-risk');
    flagRejectionRiskTool = module.flagRejectionRiskTool;
  });

  // ============================================================================
  // Tool Definition Tests
  // ============================================================================

  describe('tool definition', () => {
    it('should have correct tool metadata', () => {
      expect(flagRejectionRiskTool.name).toBe('flag_rejection_risk');
      expect(flagRejectionRiskTool.displayName).toBe('Flag Rejection Risk');
      expect(flagRejectionRiskTool.category).toBe('action');
      expect(flagRejectionRiskTool.requiresConfirmation).toBe(false);
    });

    it('should have correct parameters schema', () => {
      const params = flagRejectionRiskTool.parameters;
      expect(params.type).toBe('object');
      expect(params.required).toContain('project_id');
      expect(params.required).toContain('item_type');
      expect(params.required).toContain('item_id');
      expect(params.properties.item_type.enum).toContain('change_order');
      expect(params.properties.item_type.enum).toContain('invoice');
      expect(params.properties.item_type.enum).toContain('submittal');
      expect(params.properties.item_type.enum).toContain('rfi');
    });

    it('should have estimated token count', () => {
      expect(flagRejectionRiskTool.estimatedTokens).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // Change Order Analysis Tests
  // ============================================================================

  describe('change order analysis', () => {
    it('should analyze change order with complete data (low risk)', async () => {
      const changeOrder = {
        id: 'co-123',
        title: 'HVAC System Upgrade',
        description: 'Complete HVAC system replacement',
        amount: 25000,
        cost_breakdown: { labor: 15000, materials: 10000 },
        scope_description: 'Full scope of work defined',
        attachments: ['doc1.pdf', 'doc2.pdf'],
        schedule_impact: '2 weeks delay',
        signatures: ['sig1', 'sig2'],
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'change_orders') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: changeOrder, error: null }),
              }),
            }),
          };
        }
        if (table === 'workflow_items') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({ data: [], error: null }),
                }),
              }),
            }),
          };
        }
        if (table === 'projects') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { budget: 1000000, contingency_remaining: 100000 },
                  error: null,
                }),
              }),
            }),
          };
        }
        return createMockSupabaseQuery({ data: null, error: null });
      });

      const result = await flagRejectionRiskTool.execute(
        { project_id: 'project-123', item_type: 'change_order', item_id: 'co-123' },
        mockContext
      );

      expectSuccess(result);
      expect(result.data.item_type).toBe('change_order');
      expect(result.data.rejection_probability).toBeLessThan(0.5);
      expect(result.data.risk_level).toBe('low');
    });

    it('should flag high risk when cost breakdown is missing', async () => {
      const changeOrder = {
        id: 'co-123',
        title: 'HVAC System Upgrade',
        amount: 25000,
        // Missing: cost_breakdown, scope_description, attachments
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'change_orders') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: changeOrder, error: null }),
              }),
            }),
          };
        }
        if (table === 'workflow_items') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({ data: [], error: null }),
                }),
              }),
            }),
          };
        }
        if (table === 'projects') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { budget: 1000000, contingency_remaining: 100000 },
                  error: null,
                }),
              }),
            }),
          };
        }
        return createMockSupabaseQuery({ data: null, error: null });
      });

      const result = await flagRejectionRiskTool.execute(
        { project_id: 'project-123', item_type: 'change_order', item_id: 'co-123' },
        mockContext
      );

      expectSuccess(result);
      expect(result.data.rejection_reasons.some((r: any) => r.reason.includes('cost breakdown'))).toBe(true);
    });

    it('should flag risk when change order exceeds contingency', async () => {
      const changeOrder = {
        id: 'co-123',
        title: 'Major Change',
        amount: 150000, // Exceeds contingency of 100000
        cost_breakdown: { labor: 100000, materials: 50000 },
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'change_orders') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: changeOrder, error: null }),
              }),
            }),
          };
        }
        if (table === 'workflow_items') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({ data: [], error: null }),
                }),
              }),
            }),
          };
        }
        if (table === 'projects') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { budget: 1000000, contingency_remaining: 100000 },
                  error: null,
                }),
              }),
            }),
          };
        }
        return createMockSupabaseQuery({ data: null, error: null });
      });

      const result = await flagRejectionRiskTool.execute(
        { project_id: 'project-123', item_type: 'change_order', item_id: 'co-123' },
        mockContext
      );

      expectSuccess(result);
      expect(result.data.rejection_reasons.some((r: any) =>
        r.reason.includes('contingency') || r.reason.includes('budget')
      )).toBe(true);
    });
  });

  // ============================================================================
  // Invoice Analysis Tests
  // ============================================================================

  describe('invoice analysis', () => {
    it('should analyze invoice with complete data', async () => {
      const invoice = {
        id: 'inv-123',
        invoice_number: 'INV-001',
        vendor_name: 'ABC Contractors',
        amount: 50000,
        backup_docs: ['doc1.pdf'],
        work_verified: true,
        lien_waiver: 'waiver.pdf',
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'invoices') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: invoice, error: null }),
              }),
            }),
          };
        }
        if (table === 'workflow_items') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({ data: [], error: null }),
                }),
              }),
            }),
          };
        }
        if (table === 'projects') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { budget: 1000000 }, error: null }),
              }),
            }),
          };
        }
        return createMockSupabaseQuery({ data: null, error: null });
      });

      const result = await flagRejectionRiskTool.execute(
        { project_id: 'project-123', item_type: 'invoice', item_id: 'inv-123' },
        mockContext
      );

      expectSuccess(result);
      expect(result.data.item_type).toBe('invoice');
      expect(result.data.item_description).toContain('INV-001');
    });

    it('should flag risk when lien waiver is missing', async () => {
      const invoice = {
        id: 'inv-123',
        invoice_number: 'INV-001',
        vendor_name: 'ABC Contractors',
        amount: 50000,
        // Missing: lien_waiver, backup_docs
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'invoices') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: invoice, error: null }),
              }),
            }),
          };
        }
        if (table === 'workflow_items') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({ data: [], error: null }),
                }),
              }),
            }),
          };
        }
        if (table === 'projects') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { budget: 1000000 }, error: null }),
              }),
            }),
          };
        }
        return createMockSupabaseQuery({ data: null, error: null });
      });

      const result = await flagRejectionRiskTool.execute(
        { project_id: 'project-123', item_type: 'invoice', item_id: 'inv-123' },
        mockContext
      );

      expectSuccess(result);
      expect(result.data.rejection_reasons.some((r: any) => r.reason.includes('lien waiver'))).toBe(true);
    });
  });

  // ============================================================================
  // Submittal Analysis Tests
  // ============================================================================

  describe('submittal analysis', () => {
    it('should analyze submittal with complete data', async () => {
      const submittal = {
        id: 'sub-123',
        number: 'SUB-001',
        title: 'Concrete Mix Design',
        technical_data: 'Detailed specs',
        spec_section: '03 30 00',
        certifications: ['cert1.pdf'],
        samples: ['sample1.jpg'],
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'submittals') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: submittal, error: null }),
              }),
            }),
          };
        }
        if (table === 'workflow_items') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({ data: [], error: null }),
                }),
              }),
            }),
          };
        }
        if (table === 'projects') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { budget: 1000000 }, error: null }),
              }),
            }),
          };
        }
        return createMockSupabaseQuery({ data: null, error: null });
      });

      const result = await flagRejectionRiskTool.execute(
        { project_id: 'project-123', item_type: 'submittal', item_id: 'sub-123' },
        mockContext
      );

      expectSuccess(result);
      expect(result.data.item_type).toBe('submittal');
      expect(result.data.item_description).toContain('SUB-001');
    });

    it('should flag missing spec section reference', async () => {
      const submittal = {
        id: 'sub-123',
        number: 'SUB-001',
        title: 'Concrete Mix Design',
        // Missing: spec_section, technical_data
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'submittals') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: submittal, error: null }),
              }),
            }),
          };
        }
        if (table === 'workflow_items') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({ data: [], error: null }),
                }),
              }),
            }),
          };
        }
        if (table === 'projects') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { budget: 1000000 }, error: null }),
              }),
            }),
          };
        }
        return createMockSupabaseQuery({ data: null, error: null });
      });

      const result = await flagRejectionRiskTool.execute(
        { project_id: 'project-123', item_type: 'submittal', item_id: 'sub-123' },
        mockContext
      );

      expectSuccess(result);
      // Should have recommendation for spec section
      const hasSpecRecommendation = result.data.recommendations.some((r: any) =>
        r.action.toLowerCase().includes('spec section')
      );
      expect(hasSpecRecommendation).toBe(true);
    });
  });

  // ============================================================================
  // RFI Analysis Tests
  // ============================================================================

  describe('rfi analysis', () => {
    it('should analyze RFI with complete data', async () => {
      const rfi = {
        id: 'rfi-123',
        number: 'RFI-001',
        subject: 'Foundation Detail Clarification',
        question: 'What is the required rebar spacing?',
        drawing_refs: ['A-101', 'S-201'],
        location: 'Building A, Level 2',
        impact: 'May delay foundation pour',
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'rfis') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: rfi, error: null }),
              }),
            }),
          };
        }
        if (table === 'workflow_items') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({ data: [], error: null }),
                }),
              }),
            }),
          };
        }
        if (table === 'projects') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { budget: 1000000 }, error: null }),
              }),
            }),
          };
        }
        return createMockSupabaseQuery({ data: null, error: null });
      });

      const result = await flagRejectionRiskTool.execute(
        { project_id: 'project-123', item_type: 'rfi', item_id: 'rfi-123' },
        mockContext
      );

      expectSuccess(result);
      expect(result.data.item_type).toBe('rfi');
      expect(result.data.item_description).toContain('RFI-001');
    });

    it('should flag risk when question is unclear', async () => {
      const rfi = {
        id: 'rfi-123',
        number: 'RFI-001',
        subject: 'Question',
        // Missing: question, drawing_refs, location
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'rfis') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: rfi, error: null }),
              }),
            }),
          };
        }
        if (table === 'workflow_items') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({ data: [], error: null }),
                }),
              }),
            }),
          };
        }
        if (table === 'projects') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { budget: 1000000 }, error: null }),
              }),
            }),
          };
        }
        return createMockSupabaseQuery({ data: null, error: null });
      });

      const result = await flagRejectionRiskTool.execute(
        { project_id: 'project-123', item_type: 'rfi', item_id: 'rfi-123' },
        mockContext
      );

      expectSuccess(result);
      expect(result.data.rejection_reasons.some((r: any) =>
        r.reason.toLowerCase().includes('unclear') || r.reason.toLowerCase().includes('ambiguous')
      )).toBe(true);
    });
  });

  // ============================================================================
  // Payment Application Analysis Tests
  // ============================================================================

  describe('payment application analysis', () => {
    it('should analyze payment application', async () => {
      const payApp = {
        id: 'pay-123',
        application_number: 'PA-001',
        amount: 100000,
        sov_match: true,
        certified_payroll: 'payroll.pdf',
        inspection_complete: true,
        stored_materials: 'materials.pdf',
        progress_photos: ['photo1.jpg', 'photo2.jpg'],
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'payment_applications') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: payApp, error: null }),
              }),
            }),
          };
        }
        if (table === 'workflow_items') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({ data: [], error: null }),
                }),
              }),
            }),
          };
        }
        if (table === 'projects') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { budget: 1000000 }, error: null }),
              }),
            }),
          };
        }
        return createMockSupabaseQuery({ data: null, error: null });
      });

      const result = await flagRejectionRiskTool.execute(
        { project_id: 'project-123', item_type: 'payment_application', item_id: 'pay-123' },
        mockContext
      );

      expectSuccess(result);
      expect(result.data.item_type).toBe('payment_application');
      expect(result.data.item_description).toContain('PA-001');
    });
  });

  // ============================================================================
  // Purchase Order Analysis Tests
  // ============================================================================

  describe('purchase order analysis', () => {
    it('should analyze purchase order', async () => {
      const po = {
        id: 'po-123',
        po_number: 'PO-001',
        amount: 25000,
        quotes: ['quote1.pdf', 'quote2.pdf'],
        vendor_approved: true,
        specifications: 'Detailed specs',
        delivery_schedule: '2 weeks',
        insurance_docs: 'insurance.pdf',
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'purchase_orders') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: po, error: null }),
              }),
            }),
          };
        }
        if (table === 'workflow_items') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({ data: [], error: null }),
                }),
              }),
            }),
          };
        }
        if (table === 'projects') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { budget: 1000000 }, error: null }),
              }),
            }),
          };
        }
        return createMockSupabaseQuery({ data: null, error: null });
      });

      const result = await flagRejectionRiskTool.execute(
        { project_id: 'project-123', item_type: 'purchase_order', item_id: 'po-123' },
        mockContext
      );

      expectSuccess(result);
      expect(result.data.item_type).toBe('purchase_order');
      expect(result.data.item_description).toContain('PO-001');
    });

    it('should flag large purchase relative to budget', async () => {
      const po = {
        id: 'po-123',
        po_number: 'PO-001',
        amount: 150000, // 15% of budget
        quotes: ['quote1.pdf'],
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'purchase_orders') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: po, error: null }),
              }),
            }),
          };
        }
        if (table === 'workflow_items') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({ data: [], error: null }),
                }),
              }),
            }),
          };
        }
        if (table === 'projects') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { budget: 1000000 }, error: null }),
              }),
            }),
          };
        }
        return createMockSupabaseQuery({ data: null, error: null });
      });

      const result = await flagRejectionRiskTool.execute(
        { project_id: 'project-123', item_type: 'purchase_order', item_id: 'po-123' },
        mockContext
      );

      expectSuccess(result);
      expect(result.data.rejection_reasons.some((r: any) =>
        r.reason.toLowerCase().includes('budget') || r.reason.toLowerCase().includes('large')
      )).toBe(true);
    });
  });

  // ============================================================================
  // Historical Context Tests
  // ============================================================================

  describe('historical context', () => {
    it('should calculate rejection rate from historical data', async () => {
      const historicalItems = [
        { id: '1', status: 'approved', created_at: new Date().toISOString() },
        { id: '2', status: 'rejected', created_at: new Date().toISOString() },
        { id: '3', status: 'approved', created_at: new Date().toISOString() },
        { id: '4', status: 'rejected', created_at: new Date().toISOString() },
        { id: '5', status: 'approved', created_at: new Date().toISOString() },
      ];

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'change_orders') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'co-123', title: 'Test', amount: 10000 },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'workflow_items') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({ data: historicalItems, error: null }),
                }),
              }),
            }),
          };
        }
        if (table === 'projects') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { budget: 1000000 }, error: null }),
              }),
            }),
          };
        }
        return createMockSupabaseQuery({ data: null, error: null });
      });

      const result = await flagRejectionRiskTool.execute(
        { project_id: 'project-123', item_type: 'change_order', item_id: 'co-123' },
        mockContext
      );

      expectSuccess(result);
      expect(result.data.historical_context.total_similar_items).toBe(5);
      expect(result.data.historical_context.rejection_rate).toBe(0.4); // 2/5
    });

    it('should use default rejection rate when no history', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'change_orders') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'co-123', title: 'Test', amount: 10000 },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'workflow_items') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({ data: [], error: null }),
                }),
              }),
            }),
          };
        }
        if (table === 'projects') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { budget: 1000000 }, error: null }),
              }),
            }),
          };
        }
        return createMockSupabaseQuery({ data: null, error: null });
      });

      const result = await flagRejectionRiskTool.execute(
        { project_id: 'project-123', item_type: 'change_order', item_id: 'co-123' },
        mockContext
      );

      expectSuccess(result);
      // Default rejection rate is 0.2 (20%)
      expect(result.data.historical_context.rejection_rate).toBe(0.2);
    });
  });

  // ============================================================================
  // Risk Level Tests
  // ============================================================================

  describe('risk level calculation', () => {
    it('should return low risk for probability < 0.3', async () => {
      const changeOrder = {
        id: 'co-123',
        title: 'Complete Change Order',
        amount: 10000,
        cost_breakdown: { labor: 5000, materials: 5000 },
        scope_description: 'Full scope',
        attachments: ['doc.pdf'],
        schedule_impact: 'None',
        signatures: ['sig1'],
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'change_orders') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: changeOrder, error: null }),
              }),
            }),
          };
        }
        if (table === 'workflow_items') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({ data: [], error: null }),
                }),
              }),
            }),
          };
        }
        if (table === 'projects') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { budget: 1000000, contingency_remaining: 500000 },
                  error: null,
                }),
              }),
            }),
          };
        }
        return createMockSupabaseQuery({ data: null, error: null });
      });

      const result = await flagRejectionRiskTool.execute(
        { project_id: 'project-123', item_type: 'change_order', item_id: 'co-123' },
        mockContext
      );

      expectSuccess(result);
      expect(result.data.risk_level).toBe('low');
    });

    it('should return high risk for probability >= 0.6', async () => {
      // Minimal change order with many missing fields
      const changeOrder = {
        id: 'co-123',
        title: 'Incomplete',
        amount: 200000, // Exceeds contingency
        // Missing all required fields
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'change_orders') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: changeOrder, error: null }),
              }),
            }),
          };
        }
        if (table === 'workflow_items') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({
                    // High historical rejection rate
                    data: Array(10).fill({ status: 'rejected', created_at: new Date().toISOString() }),
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'projects') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { budget: 1000000, contingency_remaining: 50000 }, // CO exceeds contingency
                  error: null,
                }),
              }),
            }),
          };
        }
        return createMockSupabaseQuery({ data: null, error: null });
      });

      const result = await flagRejectionRiskTool.execute(
        { project_id: 'project-123', item_type: 'change_order', item_id: 'co-123' },
        mockContext
      );

      expectSuccess(result);
      expect(result.data.risk_level).toBe('high');
    });
  });

  // ============================================================================
  // Recommendations Tests
  // ============================================================================

  describe('recommendations', () => {
    it('should generate recommendations for missing requirements', async () => {
      const changeOrder = {
        id: 'co-123',
        title: 'Test CO',
        amount: 10000,
        // Missing required fields
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'change_orders') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: changeOrder, error: null }),
              }),
            }),
          };
        }
        if (table === 'workflow_items') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({ data: [], error: null }),
                }),
              }),
            }),
          };
        }
        if (table === 'projects') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { budget: 1000000 }, error: null }),
              }),
            }),
          };
        }
        return createMockSupabaseQuery({ data: null, error: null });
      });

      const result = await flagRejectionRiskTool.execute(
        { project_id: 'project-123', item_type: 'change_order', item_id: 'co-123' },
        mockContext
      );

      expectSuccess(result);
      expect(result.data.recommendations.length).toBeGreaterThan(0);
      expect(result.data.recommendations.some((r: any) =>
        r.action.toLowerCase().includes('cost breakdown')
      )).toBe(true);
    });

    it('should prioritize high priority recommendations first', async () => {
      const changeOrder = {
        id: 'co-123',
        title: 'Test CO',
        amount: 10000,
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'change_orders') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: changeOrder, error: null }),
              }),
            }),
          };
        }
        if (table === 'workflow_items') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({ data: [], error: null }),
                }),
              }),
            }),
          };
        }
        if (table === 'projects') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { budget: 1000000 }, error: null }),
              }),
            }),
          };
        }
        return createMockSupabaseQuery({ data: null, error: null });
      });

      const result = await flagRejectionRiskTool.execute(
        { project_id: 'project-123', item_type: 'change_order', item_id: 'co-123' },
        mockContext
      );

      expectSuccess(result);
      // First recommendations should be high priority
      if (result.data.recommendations.length > 1) {
        const priorities = result.data.recommendations.map((r: any) => r.priority);
        const highIndex = priorities.indexOf('high');
        const lowIndex = priorities.indexOf('low');
        if (highIndex !== -1 && lowIndex !== -1) {
          expect(highIndex).toBeLessThan(lowIndex);
        }
      }
    });

    it('should recommend pre-submission review for high risk items', async () => {
      const changeOrder = {
        id: 'co-123',
        title: 'Risky CO',
        amount: 200000,
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'change_orders') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: changeOrder, error: null }),
              }),
            }),
          };
        }
        if (table === 'workflow_items') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({
                    data: Array(10).fill({ status: 'rejected', created_at: new Date().toISOString() }),
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'projects') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { budget: 1000000, contingency_remaining: 50000 },
                  error: null,
                }),
              }),
            }),
          };
        }
        return createMockSupabaseQuery({ data: null, error: null });
      });

      const result = await flagRejectionRiskTool.execute(
        { project_id: 'project-123', item_type: 'change_order', item_id: 'co-123' },
        mockContext
      );

      expectSuccess(result);
      expect(result.data.recommendations.some((r: any) =>
        r.action.toLowerCase().includes('pre-submission') || r.action.toLowerCase().includes('review')
      )).toBe(true);
    });
  });

  // ============================================================================
  // Missing Requirements Tests
  // ============================================================================

  describe('missing requirements', () => {
    it('should identify blocking compliance requirements', async () => {
      const invoice = {
        id: 'inv-123',
        invoice_number: 'INV-001',
        vendor_name: 'Test Vendor',
        amount: 50000,
        // Missing lien_waiver (compliance requirement)
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'invoices') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: invoice, error: null }),
              }),
            }),
          };
        }
        if (table === 'workflow_items') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({ data: [], error: null }),
                }),
              }),
            }),
          };
        }
        if (table === 'projects') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { budget: 1000000 }, error: null }),
              }),
            }),
          };
        }
        return createMockSupabaseQuery({ data: null, error: null });
      });

      const result = await flagRejectionRiskTool.execute(
        { project_id: 'project-123', item_type: 'invoice', item_id: 'inv-123' },
        mockContext
      );

      expectSuccess(result);
      const blockingReqs = result.data.missing_requirements.filter((r: any) => r.impact === 'blocking');
      expect(blockingReqs.length).toBeGreaterThan(0);
    });

    it('should categorize missing requirements correctly', async () => {
      const changeOrder = {
        id: 'co-123',
        title: 'Test CO',
        amount: 10000,
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'change_orders') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: changeOrder, error: null }),
              }),
            }),
          };
        }
        if (table === 'workflow_items') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({ data: [], error: null }),
                }),
              }),
            }),
          };
        }
        if (table === 'projects') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { budget: 1000000 }, error: null }),
              }),
            }),
          };
        }
        return createMockSupabaseQuery({ data: null, error: null });
      });

      const result = await flagRejectionRiskTool.execute(
        { project_id: 'project-123', item_type: 'change_order', item_id: 'co-123' },
        mockContext
      );

      expectSuccess(result);
      // Check that requirements have valid categories
      for (const req of result.data.missing_requirements) {
        expect(['documentation', 'information', 'approval', 'compliance']).toContain(req.category);
        expect(['blocking', 'significant', 'minor']).toContain(req.impact);
      }
    });
  });

  // ============================================================================
  // Output Formatting Tests
  // ============================================================================

  describe('formatOutput', () => {
    it('should format output with error status for high risk', () => {
      const output = {
        item_type: 'change_order',
        item_id: 'co-123',
        item_description: 'Test Change Order',
        rejection_probability: 0.75,
        risk_level: 'high' as const,
        rejection_reasons: [{ reason: 'Missing docs', frequency: 0.5, severity: 'high', description: 'Test' }],
        missing_requirements: [{ requirement: 'Cost breakdown', category: 'documentation', impact: 'blocking', recommendation: 'Add it' }],
        recommendations: [{ priority: 'high', action: 'Add docs', expected_impact: 'Reduce risk', effort: 'medium' }],
        historical_context: { total_similar_items: 10, rejection_rate: 0.3, avg_rejections_before_approval: 1.5, common_revision_count: 2 },
      };

      const formatted = flagRejectionRiskTool.formatOutput(output);

      expect(formatted.title).toBe('Rejection Risk Analysis');
      expect(formatted.status).toBe('error');
      expect(formatted.icon).toBe('alert-triangle');
      expect(formatted.summary).toContain('75%');
      expect(formatted.summary).toContain('high');
    });

    it('should format output with warning status for medium risk', () => {
      const output = {
        item_type: 'change_order',
        item_id: 'co-123',
        item_description: 'Test',
        rejection_probability: 0.45,
        risk_level: 'medium' as const,
        rejection_reasons: [],
        missing_requirements: [],
        recommendations: [],
        historical_context: { total_similar_items: 5, rejection_rate: 0.2, avg_rejections_before_approval: 1, common_revision_count: 1 },
      };

      const formatted = flagRejectionRiskTool.formatOutput(output);

      expect(formatted.status).toBe('warning');
      expect(formatted.icon).toBe('alert-circle');
    });

    it('should format output with success status for low risk', () => {
      const output = {
        item_type: 'change_order',
        item_id: 'co-123',
        item_description: 'Test',
        rejection_probability: 0.15,
        risk_level: 'low' as const,
        rejection_reasons: [],
        missing_requirements: [],
        recommendations: [],
        historical_context: { total_similar_items: 5, rejection_rate: 0.1, avg_rejections_before_approval: 0.5, common_revision_count: 1 },
      };

      const formatted = flagRejectionRiskTool.formatOutput(output);

      expect(formatted.status).toBe('success');
      expect(formatted.icon).toBe('check-circle');
    });

    it('should include all details in formatted output', () => {
      const output = {
        item_type: 'change_order',
        item_id: 'co-123',
        item_description: 'Test',
        rejection_probability: 0.5,
        risk_level: 'medium' as const,
        rejection_reasons: [{ reason: 'Test', frequency: 0.3, severity: 'high', description: 'Test' }],
        missing_requirements: [{ requirement: 'Test', category: 'documentation', impact: 'blocking', recommendation: 'Test' }],
        recommendations: [{ priority: 'high', action: 'Test', expected_impact: 'Test', effort: 'low' }],
        historical_context: { total_similar_items: 5, rejection_rate: 0.2, avg_rejections_before_approval: 1, common_revision_count: 1 },
      };

      const formatted = flagRejectionRiskTool.formatOutput(output);

      expect(formatted.details).toContainEqual({ label: 'Risk Level', value: 'MEDIUM', type: 'badge' });
      expect(formatted.details).toContainEqual({ label: 'Rejection Probability', value: '50%', type: 'text' });
      expect(formatted.details).toContainEqual({ label: 'High Risk Factors', value: 1, type: 'text' });
      expect(formatted.details).toContainEqual({ label: 'Blocking Issues', value: 1, type: 'text' });
      expect(formatted.details).toContainEqual({ label: 'Recommendations', value: 1, type: 'text' });
    });
  });

  // ============================================================================
  // Error Handling Tests
  // ============================================================================

  describe('error handling', () => {
    it('should handle item not found gracefully', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'change_orders') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
          };
        }
        if (table === 'workflow_items') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({ data: [], error: null }),
                }),
              }),
            }),
          };
        }
        if (table === 'projects') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { budget: 1000000 }, error: null }),
              }),
            }),
          };
        }
        return createMockSupabaseQuery({ data: null, error: null });
      });

      const result = await flagRejectionRiskTool.execute(
        { project_id: 'project-123', item_type: 'change_order', item_id: 'nonexistent' },
        mockContext
      );

      expectSuccess(result);
      // Should still return a result with default description (falls back to "Unknown item" when no data)
      expect(result.data.item_description).toBe('Unknown item');
    });

    it('should handle table not existing gracefully', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'invoices') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockRejectedValue(new Error('Table not found')),
              }),
            }),
          };
        }
        if (table === 'workflow_items') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({ data: [], error: null }),
                }),
              }),
            }),
          };
        }
        if (table === 'projects') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { budget: 1000000 }, error: null }),
              }),
            }),
          };
        }
        return createMockSupabaseQuery({ data: null, error: null });
      });

      const result = await flagRejectionRiskTool.execute(
        { project_id: 'project-123', item_type: 'invoice', item_id: 'inv-123' },
        mockContext
      );

      expectSuccess(result);
      // Should fall back to default description
      expect(result.data.item_description).toContain('Invoice');
    });
  });
});
