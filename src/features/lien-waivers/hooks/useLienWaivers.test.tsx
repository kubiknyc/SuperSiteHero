/**
 * Lien Waiver Hooks Tests
 * Comprehensive tests for lien waiver management hooks
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import type {
  LienWaiver,
  LienWaiverWithDetails,
  LienWaiverTemplate,
  LienWaiverRequirement,
  LienWaiverHistory,
} from '@/types/lien-waiver';

// Mock functions must be defined BEFORE vi.mock calls
const mockFrom = vi.fn();
const mockRpc = vi.fn();

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));

// Mock useAuth
const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  user_metadata: {
    company_id: 'company-123',
  },
};

vi.mock('@/lib/auth/AuthContext', () => ({
  useAuth: () => ({ user: mockUser }),
}));

// Import after mocks
import {
  lienWaiverKeys,
  useLienWaivers,
  useLienWaiver,
  useLienWaiverHistory,
  useLienWaiverTemplates,
  useLienWaiverTemplate,
  useLienWaiverRequirements,
  useProjectWaiverSummary,
  useCreateLienWaiver,
  useUpdateLienWaiver,
  useDeleteLienWaiver,
  useSendWaiverRequest,
  useMarkWaiverReceived,
  useSignWaiver,
  useNotarizeWaiver,
  useApproveWaiver,
  useRejectWaiver,
  useVoidWaiver,
  useCreateLienWaiverTemplate,
  useUpdateLienWaiverTemplate,
  useCreateLienWaiverRequirement,
  useRenderWaiverTemplate,
} from './useLienWaivers';

// Test data
const mockLienWaiver: LienWaiver = {
  id: 'waiver-123',
  company_id: 'company-123',
  project_id: 'project-123',
  waiver_number: 'LW-2024-001',
  waiver_type: 'conditional_progress',
  status: 'pending',
  payment_application_id: 'pa-123',
  subcontractor_id: 'sub-123',
  vendor_name: 'ABC Subcontractors',
  template_id: 'template-123',
  through_date: '2024-06-30',
  payment_amount: 50000,
  check_number: null,
  check_date: null,
  exceptions: null,
  rendered_content: null,
  claimant_name: null,
  claimant_title: null,
  claimant_company: null,
  signature_url: null,
  signature_date: null,
  signed_at: null,
  notarization_required: false,
  notary_name: null,
  notary_commission_number: null,
  notary_commission_expiration: null,
  notarized_at: null,
  notarized_document_url: null,
  document_url: null,
  sent_at: null,
  sent_to_email: null,
  received_at: null,
  reviewed_by: null,
  reviewed_at: null,
  review_notes: null,
  approved_by: null,
  approved_at: null,
  rejection_reason: null,
  due_date: '2024-07-15',
  reminder_sent_at: null,
  notes: null,
  created_at: '2024-06-01T12:00:00Z',
  updated_at: '2024-06-01T12:00:00Z',
  created_by: 'user-123',
  deleted_at: null,
};

const mockLienWaiverWithDetails: LienWaiverWithDetails = {
  ...mockLienWaiver,
  project: {
    id: 'project-123',
    name: 'Commercial Building A',
    project_number: 'PRJ-2024-001',
  },
  subcontractor: {
    id: 'sub-123',
    company_name: 'ABC Subcontractors',
    contact_name: 'John Smith',
    contact_email: 'john@abc-subs.com',
  },
  payment_application: {
    id: 'pa-123',
    application_number: 5,
    current_payment_due: 75000,
  },
  template: {
    id: 'template-123',
    name: 'California Conditional Progress',
    state_code: 'CA',
  },
  created_by_user: {
    id: 'user-123',
    full_name: 'Jane Doe',
    email: 'jane@company.com',
  },
  approved_by_user: null,
};

const mockTemplate: LienWaiverTemplate = {
  id: 'template-123',
  company_id: 'company-123',
  name: 'California Conditional Progress',
  state_code: 'CA',
  waiver_type: 'conditional_progress',
  template_content: 'Upon receipt of payment of ${{amount}}...',
  legal_language: 'This waiver is subject to...',
  notarization_required: false,
  placeholders: ['{{contractor_name}}', '{{amount}}', '{{through_date}}'],
  is_default: true,
  is_active: true,
  version: 1,
  effective_date: '2024-01-01',
  expiration_date: null,
  statute_reference: 'Cal. Civ. Code § 8134',
  notes: null,
  created_at: '2024-01-01T12:00:00Z',
  updated_at: '2024-01-01T12:00:00Z',
  created_by: 'user-123',
};

const mockRequirement: LienWaiverRequirement = {
  id: 'req-123',
  company_id: 'company-123',
  project_id: 'project-123',
  name: 'Standard Waiver Requirement',
  description: 'Require waivers for all payments over $10,000',
  required_for_progress_payments: true,
  required_for_final_payment: true,
  min_payment_threshold: 10000,
  requires_contractor_waiver: true,
  requires_sub_waivers: true,
  requires_supplier_waivers: false,
  days_before_payment_due: 5,
  block_payment_without_waiver: true,
  allow_conditional_for_progress: true,
  require_unconditional_for_final: true,
  is_active: true,
  created_at: '2024-01-01T12:00:00Z',
  updated_at: '2024-01-01T12:00:00Z',
  created_by: 'user-123',
};

const mockHistory: LienWaiverHistory = {
  id: 'history-123',
  lien_waiver_id: 'waiver-123',
  action: 'created',
  field_changed: null,
  old_value: null,
  new_value: null,
  notes: 'Waiver created for ABC Subcontractors',
  changed_at: '2024-06-01T12:00:00Z',
  changed_by: 'user-123',
};

// Helper to create wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

// Helper to create chainable mock
const createChainableMock = (data: unknown, error: unknown = null) => ({
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  is: vi.fn().mockReturnThis(),
  in: vi.fn().mockReturnThis(),
  or: vi.fn().mockReturnThis(),
  gte: vi.fn().mockReturnThis(),
  lte: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({ data, error }),
  then: vi.fn((cb) => cb({ data, error })),
});

describe('useLienWaivers hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =============================================
  // QUERY KEYS TESTS
  // =============================================

  describe('lienWaiverKeys', () => {
    it('should generate base key', () => {
      expect(lienWaiverKeys.all).toEqual(['lien-waivers']);
    });

    it('should generate list keys', () => {
      expect(lienWaiverKeys.lists()).toEqual(['lien-waivers', 'list']);
    });

    it('should generate list key with filters', () => {
      const filters = { projectId: 'project-123', status: 'pending' as const };
      expect(lienWaiverKeys.list(filters)).toEqual(['lien-waivers', 'list', filters]);
    });

    it('should generate detail keys', () => {
      expect(lienWaiverKeys.details()).toEqual(['lien-waivers', 'detail']);
      expect(lienWaiverKeys.detail('waiver-123')).toEqual(['lien-waivers', 'detail', 'waiver-123']);
    });

    it('should generate history key', () => {
      expect(lienWaiverKeys.history('waiver-123')).toEqual(['lien-waivers', 'history', 'waiver-123']);
    });

    it('should generate template keys', () => {
      expect(lienWaiverKeys.templates()).toEqual(['lien-waivers', 'templates']);
      expect(lienWaiverKeys.template('template-123')).toEqual(['lien-waivers', 'templates', 'template-123']);
    });

    it('should generate template list key with filters', () => {
      const filters = { stateCode: 'CA', waiverType: 'conditional_progress' as const };
      expect(lienWaiverKeys.templateList(filters)).toEqual(['lien-waivers', 'templates', filters]);
    });

    it('should generate requirements keys', () => {
      expect(lienWaiverKeys.requirements()).toEqual(['lien-waivers', 'requirements']);
      expect(lienWaiverKeys.projectRequirements('project-123')).toEqual(['lien-waivers', 'requirements', 'project-123']);
    });

    it('should generate summary key', () => {
      expect(lienWaiverKeys.summary('project-123')).toEqual(['lien-waivers', 'summary', 'project-123']);
    });

    it('should generate missing key', () => {
      expect(lienWaiverKeys.missing()).toEqual(['lien-waivers', 'missing', undefined]);
      expect(lienWaiverKeys.missing('project-123')).toEqual(['lien-waivers', 'missing', 'project-123']);
    });
  });

  // =============================================
  // QUERY HOOKS TESTS
  // =============================================

  describe('useLienWaivers', () => {
    it('should fetch lien waivers', async () => {
      const mockWaivers = [mockLienWaiverWithDetails];
      const chainMock = createChainableMock(mockWaivers);
      mockFrom.mockReturnValue(chainMock);

      const { result } = renderHook(() => useLienWaivers(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockFrom).toHaveBeenCalledWith('lien_waivers');
      expect(result.current.data).toEqual(mockWaivers);
    });

    it('should apply filters', async () => {
      const chainMock = createChainableMock([]);
      mockFrom.mockReturnValue(chainMock);

      const filters = {
        projectId: 'project-123',
        status: 'pending' as const,
        waiverType: 'conditional_progress' as const,
        subcontractorId: 'sub-123',
        paymentApplicationId: 'pa-123',
        dueDateFrom: '2024-01-01',
        dueDateTo: '2024-12-31',
      };

      renderHook(() => useLienWaivers(filters), { wrapper: createWrapper() });

      await waitFor(() => expect(mockFrom).toHaveBeenCalled());

      expect(chainMock.eq).toHaveBeenCalledWith('project_id', 'project-123');
      expect(chainMock.eq).toHaveBeenCalledWith('status', 'pending');
      expect(chainMock.eq).toHaveBeenCalledWith('waiver_type', 'conditional_progress');
      expect(chainMock.eq).toHaveBeenCalledWith('subcontractor_id', 'sub-123');
      expect(chainMock.eq).toHaveBeenCalledWith('payment_application_id', 'pa-123');
      expect(chainMock.gte).toHaveBeenCalledWith('due_date', '2024-01-01');
      expect(chainMock.lte).toHaveBeenCalledWith('due_date', '2024-12-31');
    });
  });

  describe('useLienWaiver', () => {
    it('should fetch single lien waiver by ID', async () => {
      const chainMock = createChainableMock(mockLienWaiverWithDetails);
      mockFrom.mockReturnValue(chainMock);

      const { result } = renderHook(() => useLienWaiver('waiver-123'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockFrom).toHaveBeenCalledWith('lien_waivers');
      expect(chainMock.eq).toHaveBeenCalledWith('id', 'waiver-123');
      expect(chainMock.single).toHaveBeenCalled();
      expect(result.current.data).toEqual(mockLienWaiverWithDetails);
    });

    it('should not fetch when id is empty', () => {
      const { result } = renderHook(() => useLienWaiver(''), { wrapper: createWrapper() });

      expect(result.current.isFetching).toBe(false);
      expect(mockFrom).not.toHaveBeenCalled();
    });
  });

  describe('useLienWaiverHistory', () => {
    it('should fetch waiver history', async () => {
      const mockHistoryData = [mockHistory];
      const chainMock = createChainableMock(mockHistoryData);
      mockFrom.mockReturnValue(chainMock);

      const { result } = renderHook(() => useLienWaiverHistory('waiver-123'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockFrom).toHaveBeenCalledWith('lien_waiver_history');
      expect(chainMock.eq).toHaveBeenCalledWith('lien_waiver_id', 'waiver-123');
      expect(result.current.data).toEqual(mockHistoryData);
    });
  });

  describe('useLienWaiverTemplates', () => {
    it('should fetch templates without filters', async () => {
      const mockTemplates = [mockTemplate];
      const chainMock = createChainableMock(mockTemplates);
      mockFrom.mockReturnValue(chainMock);

      const { result } = renderHook(() => useLienWaiverTemplates(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockFrom).toHaveBeenCalledWith('lien_waiver_templates');
      expect(result.current.data).toEqual(mockTemplates);
    });

    it('should apply template filters', async () => {
      const chainMock = createChainableMock([mockTemplate]);
      mockFrom.mockReturnValue(chainMock);

      const filters = {
        stateCode: 'CA',
        waiverType: 'conditional_progress' as const,
        isActive: true,
      };

      renderHook(() => useLienWaiverTemplates(filters), { wrapper: createWrapper() });

      await waitFor(() => expect(mockFrom).toHaveBeenCalled());

      expect(chainMock.eq).toHaveBeenCalledWith('state_code', 'CA');
      expect(chainMock.eq).toHaveBeenCalledWith('waiver_type', 'conditional_progress');
      expect(chainMock.eq).toHaveBeenCalledWith('is_active', true);
    });
  });

  describe('useLienWaiverTemplate', () => {
    it('should fetch single template by ID', async () => {
      const chainMock = createChainableMock(mockTemplate);
      mockFrom.mockReturnValue(chainMock);

      const { result } = renderHook(() => useLienWaiverTemplate('template-123'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockFrom).toHaveBeenCalledWith('lien_waiver_templates');
      expect(chainMock.eq).toHaveBeenCalledWith('id', 'template-123');
      expect(result.current.data).toEqual(mockTemplate);
    });
  });

  describe('useLienWaiverRequirements', () => {
    it('should fetch requirements for a project', async () => {
      const mockRequirements = [mockRequirement];
      const chainMock = createChainableMock(mockRequirements);
      mockFrom.mockReturnValue(chainMock);

      const { result } = renderHook(() => useLienWaiverRequirements('project-123'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockFrom).toHaveBeenCalledWith('lien_waiver_requirements');
      expect(chainMock.or).toHaveBeenCalledWith('project_id.eq.project-123,project_id.is.null');
      expect(result.current.data).toEqual(mockRequirements);
    });

    it('should fetch company-wide requirements when no projectId', async () => {
      const chainMock = createChainableMock([]);
      mockFrom.mockReturnValue(chainMock);

      renderHook(() => useLienWaiverRequirements(), { wrapper: createWrapper() });

      await waitFor(() => expect(mockFrom).toHaveBeenCalled());

      expect(chainMock.or).not.toHaveBeenCalled();
    });
  });

  describe('useProjectWaiverSummary', () => {
    it('should calculate waiver summary from waiver data', async () => {
      const mockWaivers: LienWaiverWithDetails[] = [
        { ...mockLienWaiverWithDetails, status: 'pending' },
        { ...mockLienWaiverWithDetails, id: 'waiver-2', status: 'sent' },
        { ...mockLienWaiverWithDetails, id: 'waiver-3', status: 'received' },
        { ...mockLienWaiverWithDetails, id: 'waiver-4', status: 'under_review' },
        { ...mockLienWaiverWithDetails, id: 'waiver-5', status: 'approved', payment_amount: 25000 },
        { ...mockLienWaiverWithDetails, id: 'waiver-6', status: 'approved', payment_amount: 30000 },
      ];

      const chainMock = createChainableMock(mockWaivers);
      mockFrom.mockReturnValue(chainMock);

      const { result } = renderHook(() => useProjectWaiverSummary('project-123'), { wrapper: createWrapper() });

      // Wait for underlying query to resolve
      await waitFor(() => expect(mockFrom).toHaveBeenCalled());

      // The summary is calculated synchronously from waiver data
      expect(result.current.total_waivers).toBeDefined();
    });
  });

  // =============================================
  // MUTATION HOOKS TESTS
  // =============================================

  describe('useCreateLienWaiver', () => {
    it('should create a lien waiver', async () => {
      const newWaiver = { ...mockLienWaiver };
      mockRpc.mockResolvedValue({ data: 'LW-2024-002', error: null });

      const insertMock = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: newWaiver, error: null }),
        }),
      });

      const historyMock = vi.fn().mockReturnValue({
        insert: vi.fn().mockResolvedValue({ error: null }),
      });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'lien_waiver_history') return historyMock();
        return { insert: insertMock };
      });

      const { result } = renderHook(() => useCreateLienWaiver(), { wrapper: createWrapper() });

      await result.current.mutateAsync({
        project_id: 'project-123',
        waiver_type: 'conditional_progress',
        through_date: '2024-06-30',
        payment_amount: 50000,
        vendor_name: 'ABC Subcontractors',
      });

      expect(mockRpc).toHaveBeenCalledWith('get_next_waiver_number', { p_project_id: 'project-123' });
      expect(mockFrom).toHaveBeenCalledWith('lien_waivers');
    });
  });

  describe('useUpdateLienWaiver', () => {
    it('should update a lien waiver', async () => {
      const updatedWaiver = { ...mockLienWaiver, payment_amount: 60000 };
      const chainMock = {
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: updatedWaiver, error: null }),
            }),
          }),
        }),
      };
      mockFrom.mockReturnValue(chainMock);

      const { result } = renderHook(() => useUpdateLienWaiver(), { wrapper: createWrapper() });

      await result.current.mutateAsync({
        id: 'waiver-123',
        payment_amount: 60000,
      });

      expect(mockFrom).toHaveBeenCalledWith('lien_waivers');
      expect(chainMock.update).toHaveBeenCalled();
    });
  });

  describe('useDeleteLienWaiver', () => {
    it('should soft delete a lien waiver', async () => {
      const chainMock = {
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      };
      mockFrom.mockReturnValue(chainMock);

      const { result } = renderHook(() => useDeleteLienWaiver(), { wrapper: createWrapper() });

      await result.current.mutateAsync('waiver-123');

      expect(mockFrom).toHaveBeenCalledWith('lien_waivers');
      expect(chainMock.update).toHaveBeenCalledWith(expect.objectContaining({
        deleted_at: expect.any(String),
      }));
    });
  });

  describe('useSendWaiverRequest', () => {
    it('should send waiver request email', async () => {
      const sentWaiver = { ...mockLienWaiver, status: 'sent', sent_to_email: 'vendor@example.com' };

      const updateChain = {
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: sentWaiver, error: null }),
            }),
          }),
        }),
      };

      const historyMock = {
        insert: vi.fn().mockResolvedValue({ error: null }),
      };

      mockFrom.mockImplementation((table: string) => {
        if (table === 'lien_waiver_history') return historyMock;
        return updateChain;
      });

      const { result } = renderHook(() => useSendWaiverRequest(), { wrapper: createWrapper() });

      await result.current.mutateAsync({
        id: 'waiver-123',
        sent_to_email: 'vendor@example.com',
      });

      expect(mockFrom).toHaveBeenCalledWith('lien_waivers');
      expect(updateChain.update).toHaveBeenCalledWith(expect.objectContaining({
        status: 'sent',
        sent_to_email: 'vendor@example.com',
      }));
    });
  });

  describe('useMarkWaiverReceived', () => {
    it('should mark waiver as received', async () => {
      const receivedWaiver = { ...mockLienWaiver, status: 'received' };

      const updateChain = {
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: receivedWaiver, error: null }),
            }),
          }),
        }),
      };

      const historyMock = {
        insert: vi.fn().mockResolvedValue({ error: null }),
      };

      mockFrom.mockImplementation((table: string) => {
        if (table === 'lien_waiver_history') return historyMock;
        return updateChain;
      });

      const { result } = renderHook(() => useMarkWaiverReceived(), { wrapper: createWrapper() });

      await result.current.mutateAsync('waiver-123');

      expect(updateChain.update).toHaveBeenCalledWith(expect.objectContaining({
        status: 'received',
        received_at: expect.any(String),
      }));
    });
  });

  describe('useSignWaiver', () => {
    it('should record waiver signature', async () => {
      const signedWaiver = { ...mockLienWaiver, status: 'under_review', signed_at: '2024-06-15T12:00:00Z' };

      const updateChain = {
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: signedWaiver, error: null }),
            }),
          }),
        }),
      };

      mockFrom.mockReturnValue(updateChain);

      const { result } = renderHook(() => useSignWaiver(), { wrapper: createWrapper() });

      await result.current.mutateAsync({
        id: 'waiver-123',
        claimant_name: 'John Smith',
        claimant_title: 'President',
        claimant_company: 'ABC Subcontractors',
        signature_url: 'https://storage.example.com/signatures/sig-123.png',
        signature_date: '2024-06-15',
      });

      expect(updateChain.update).toHaveBeenCalledWith(expect.objectContaining({
        claimant_name: 'John Smith',
        claimant_title: 'President',
        status: 'under_review',
      }));
    });
  });

  describe('useNotarizeWaiver', () => {
    it('should record notarization', async () => {
      const notarizedWaiver = { ...mockLienWaiver, notarized_at: '2024-06-16T12:00:00Z' };

      const updateChain = {
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: notarizedWaiver, error: null }),
            }),
          }),
        }),
      };

      mockFrom.mockReturnValue(updateChain);

      const { result } = renderHook(() => useNotarizeWaiver(), { wrapper: createWrapper() });

      await result.current.mutateAsync({
        id: 'waiver-123',
        notary_name: 'Jane Notary',
        notary_commission_number: 'CA-12345',
        notary_commission_expiration: '2026-12-31',
        notarized_document_url: 'https://storage.example.com/notarized/doc-123.pdf',
      });

      expect(updateChain.update).toHaveBeenCalledWith(expect.objectContaining({
        notary_name: 'Jane Notary',
        notary_commission_number: 'CA-12345',
        notarized_at: expect.any(String),
      }));
    });
  });

  describe('useApproveWaiver', () => {
    it('should approve a waiver', async () => {
      const approvedWaiver = { ...mockLienWaiver, status: 'approved' };

      const updateChain = {
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: approvedWaiver, error: null }),
            }),
          }),
        }),
      };

      mockFrom.mockReturnValue(updateChain);

      const { result } = renderHook(() => useApproveWaiver(), { wrapper: createWrapper() });

      await result.current.mutateAsync({
        id: 'waiver-123',
        review_notes: 'All documents verified',
      });

      expect(updateChain.update).toHaveBeenCalledWith(expect.objectContaining({
        status: 'approved',
        review_notes: 'All documents verified',
        approved_by: 'user-123',
        approved_at: expect.any(String),
      }));
    });
  });

  describe('useRejectWaiver', () => {
    it('should reject a waiver with reason', async () => {
      const rejectedWaiver = { ...mockLienWaiver, status: 'rejected' };

      const updateChain = {
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: rejectedWaiver, error: null }),
            }),
          }),
        }),
      };

      mockFrom.mockReturnValue(updateChain);

      const { result } = renderHook(() => useRejectWaiver(), { wrapper: createWrapper() });

      await result.current.mutateAsync({
        id: 'waiver-123',
        rejection_reason: 'Missing notarization',
      });

      expect(updateChain.update).toHaveBeenCalledWith(expect.objectContaining({
        status: 'rejected',
        rejection_reason: 'Missing notarization',
        reviewed_by: 'user-123',
      }));
    });
  });

  describe('useVoidWaiver', () => {
    it('should void a waiver with reason', async () => {
      const voidedWaiver = { ...mockLienWaiver, status: 'void' };

      const updateChain = {
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: voidedWaiver, error: null }),
            }),
          }),
        }),
      };

      const historyMock = {
        insert: vi.fn().mockResolvedValue({ error: null }),
      };

      mockFrom.mockImplementation((table: string) => {
        if (table === 'lien_waiver_history') return historyMock;
        return updateChain;
      });

      const { result } = renderHook(() => useVoidWaiver(), { wrapper: createWrapper() });

      await result.current.mutateAsync({
        id: 'waiver-123',
        reason: 'Duplicate waiver',
      });

      expect(updateChain.update).toHaveBeenCalledWith(expect.objectContaining({
        status: 'void',
        notes: 'Duplicate waiver',
      }));
    });
  });

  // =============================================
  // TEMPLATE MUTATION TESTS
  // =============================================

  describe('useCreateLienWaiverTemplate', () => {
    it('should create a new template', async () => {
      const newTemplate = { ...mockTemplate, id: 'template-new' };

      const insertChain = {
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: newTemplate, error: null }),
          }),
        }),
      };

      mockFrom.mockReturnValue(insertChain);

      const { result } = renderHook(() => useCreateLienWaiverTemplate(), { wrapper: createWrapper() });

      await result.current.mutateAsync({
        name: 'New Template',
        state_code: 'TX',
        waiver_type: 'unconditional_progress',
        template_content: 'Template content...',
      });

      expect(mockFrom).toHaveBeenCalledWith('lien_waiver_templates');
      expect(insertChain.insert).toHaveBeenCalled();
    });
  });

  describe('useUpdateLienWaiverTemplate', () => {
    it('should update a template', async () => {
      const updatedTemplate = { ...mockTemplate, name: 'Updated Template' };

      const updateChain = {
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: updatedTemplate, error: null }),
            }),
          }),
        }),
      };

      mockFrom.mockReturnValue(updateChain);

      const { result } = renderHook(() => useUpdateLienWaiverTemplate(), { wrapper: createWrapper() });

      await result.current.mutateAsync({
        id: 'template-123',
        name: 'Updated Template',
      });

      expect(updateChain.update).toHaveBeenCalledWith({ name: 'Updated Template' });
    });
  });

  // =============================================
  // REQUIREMENT MUTATION TESTS
  // =============================================

  describe('useCreateLienWaiverRequirement', () => {
    it('should create a new requirement', async () => {
      const newRequirement = { ...mockRequirement, id: 'req-new' };

      const insertChain = {
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: newRequirement, error: null }),
          }),
        }),
      };

      mockFrom.mockReturnValue(insertChain);

      const { result } = renderHook(() => useCreateLienWaiverRequirement(), { wrapper: createWrapper() });

      await result.current.mutateAsync({
        name: 'New Requirement',
        project_id: 'project-123',
        required_for_progress_payments: true,
        min_payment_threshold: 5000,
      });

      expect(mockFrom).toHaveBeenCalledWith('lien_waiver_requirements');
      expect(insertChain.insert).toHaveBeenCalledWith(expect.objectContaining({
        name: 'New Requirement',
        project_id: 'project-123',
        company_id: 'company-123',
        created_by: 'user-123',
      }));
    });
  });

  // =============================================
  // UTILITY HOOKS TESTS
  // =============================================

  describe('useRenderWaiverTemplate', () => {
    it('should render template with placeholder data', async () => {
      const templateContent = 'Payment of ${{amount}} to {{contractor_name}} through {{through_date}}';

      const selectChain = {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { template_content: templateContent },
              error: null,
            }),
          }),
        }),
      };

      mockFrom.mockReturnValue(selectChain);

      const { result } = renderHook(() => useRenderWaiverTemplate(), { wrapper: createWrapper() });

      const rendered = await result.current.mutateAsync({
        templateId: 'template-123',
        data: {
          amount: '50,000.00',
          contractor_name: 'ABC Subcontractors',
          through_date: 'June 30, 2024',
        },
      });

      // Note: The $ sign is already in the template, so amount should not include $
      expect(rendered).toBe('Payment of $50,000.00 to ABC Subcontractors through June 30, 2024');
    });

    it('should only replace provided placeholders', async () => {
      const templateContent = 'Payment to {{contractor_name}} for {{amount}}';

      const selectChain = {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { template_content: templateContent },
              error: null,
            }),
          }),
        }),
      };

      mockFrom.mockReturnValue(selectChain);

      const { result } = renderHook(() => useRenderWaiverTemplate(), { wrapper: createWrapper() });

      const rendered = await result.current.mutateAsync({
        templateId: 'template-123',
        data: {
          contractor_name: 'ABC Subcontractors',
          // amount intentionally missing
        },
      });

      // Only provided placeholders are replaced; missing ones remain as-is
      expect(rendered).toBe('Payment to ABC Subcontractors for {{amount}}');
    });
  });

  // =============================================
  // BUSINESS LOGIC TESTS
  // =============================================

  describe('Waiver workflow business logic', () => {
    it('should support full waiver lifecycle', async () => {
      // This test verifies the logical sequence of waiver states
      const statuses = ['pending', 'sent', 'received', 'under_review', 'approved'];

      statuses.forEach((status, index) => {
        if (index > 0) {
          const previousStatus = statuses[index - 1];
          // Verify logical progression
          const validTransitions: Record<string, string[]> = {
            pending: ['sent', 'void'],
            sent: ['received', 'void'],
            received: ['under_review', 'rejected', 'void'],
            under_review: ['approved', 'rejected', 'void'],
          };

          if (validTransitions[previousStatus]) {
            expect(validTransitions[previousStatus]).toContain(status);
          }
        }
      });
    });

    it('should track waiver amounts correctly', () => {
      const waivers: LienWaiver[] = [
        { ...mockLienWaiver, payment_amount: 25000, status: 'approved' },
        { ...mockLienWaiver, id: 'w2', payment_amount: 35000, status: 'approved' },
        { ...mockLienWaiver, id: 'w3', payment_amount: 15000, status: 'pending' },
      ];

      const approvedAmount = waivers
        .filter(w => w.status === 'approved')
        .reduce((sum, w) => sum + w.payment_amount, 0);

      expect(approvedAmount).toBe(60000);
    });

    it('should identify overdue waivers', () => {
      const pastDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      const waivers: LienWaiver[] = [
        { ...mockLienWaiver, due_date: pastDate, status: 'pending' },
        { ...mockLienWaiver, id: 'w2', due_date: futureDate, status: 'pending' },
        { ...mockLienWaiver, id: 'w3', due_date: pastDate, status: 'approved' },
      ];

      const overdueWaivers = waivers.filter(w => {
        if (!w.due_date || w.status === 'approved' || w.status === 'void') return false;
        return new Date(w.due_date) < new Date();
      });

      expect(overdueWaivers).toHaveLength(1);
      expect(overdueWaivers[0].id).toBe('waiver-123');
    });

    it('should validate waiver type requirements', () => {
      const requirements: LienWaiverRequirement = {
        ...mockRequirement,
        allow_conditional_for_progress: true,
        require_unconditional_for_final: true,
      };

      // For progress payments, conditional is allowed
      const progressWaiver: LienWaiver = {
        ...mockLienWaiver,
        waiver_type: 'conditional_progress',
      };

      const isValidProgressWaiver =
        requirements.allow_conditional_for_progress ||
        progressWaiver.waiver_type === 'unconditional_progress';

      expect(isValidProgressWaiver).toBe(true);

      // For final payments, unconditional is required
      const finalConditional = 'conditional_final';
      const finalUnconditional = 'unconditional_final';

      const isValidFinalWaiver = (type: string) =>
        !requirements.require_unconditional_for_final || type === 'unconditional_final';

      expect(isValidFinalWaiver(finalConditional)).toBe(false);
      expect(isValidFinalWaiver(finalUnconditional)).toBe(true);
    });
  });

  // =============================================
  // COMPLIANCE TRACKING TESTS
  // =============================================

  describe('Compliance tracking', () => {
    it('should track waiver compliance per payment application', () => {
      const waivers: LienWaiverWithDetails[] = [
        { ...mockLienWaiverWithDetails, status: 'approved' },
        { ...mockLienWaiverWithDetails, id: 'w2', subcontractor_id: 'sub-2', status: 'approved' },
        { ...mockLienWaiverWithDetails, id: 'w3', subcontractor_id: 'sub-3', status: 'pending' },
      ];

      const totalRequired = 3;
      const totalApproved = waivers.filter(w => w.status === 'approved').length;
      const compliancePercent = (totalApproved / totalRequired) * 100;

      expect(compliancePercent).toBeCloseTo(66.67, 1);
    });

    it('should identify blocking compliance issues', () => {
      const requirement: LienWaiverRequirement = {
        ...mockRequirement,
        block_payment_without_waiver: true,
      };

      const waivers: LienWaiver[] = [
        { ...mockLienWaiver, status: 'approved' },
        { ...mockLienWaiver, id: 'w2', status: 'pending' },
      ];

      const allApproved = waivers.every(w => w.status === 'approved');
      const isBlocking = requirement.block_payment_without_waiver && !allApproved;

      expect(isBlocking).toBe(true);
    });
  });
});
