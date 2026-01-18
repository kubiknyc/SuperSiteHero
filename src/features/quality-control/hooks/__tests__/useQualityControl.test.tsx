/**
 * Unit Tests for Quality Control Hooks
 * Tests all query and mutation hooks for NCR and QC Inspection workflows
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useNCRs,
  useNCR,
  useNCRHistory,
  useCreateNCR,
  useUpdateNCR,
  useDeleteNCR,
  useTransitionNCRStatus,
  useStartNCRInvestigation,
  useStartCorrectiveAction,
  useSubmitNCRForVerification,
  useVerifyNCR,
  useCloseNCR,
  useReopenNCR,
  useInspections,
  useInspection,
  useInspectionChecklistItems,
  useCreateInspection,
  useUpdateInspection,
  useDeleteInspection,
  useStartInspection,
  useCompleteInspection,
  useCancelInspection,
  useUpdateChecklistItem,
  useBatchUpdateChecklistItems,
  useProjectQCStats,
  useNCRSummaryByStatus,
  useNCRSummaryBySeverity,
  qualityControlKeys,
} from '../useQualityControl';

import {
  NCRStatus,
  NCRSeverity,
  NCRCategory,
  NCRType,
  InspectionType,
  InspectionStatus,
  InspectionCategory,
} from '@/types/quality-control';

import type {
  NonConformanceReport,
  NCRHistory as NCRHistoryType,
  QCInspection,
  QCChecklistItem,
  ProjectQCStats,
  NCRSummaryByStatus,
  NCRSummaryBySeverity,
  NCRFilters,
  InspectionFilters,
  CreateNCRDTO,
  UpdateNCRDTO,
  CreateInspectionDTO,
  UpdateInspectionDTO,
} from '@/types/quality-control';

// ============================================================================
// Mocks
// ============================================================================

const mockQualityControlApi = vi.hoisted(() => ({
  ncr: {
    getNCRs: vi.fn(),
    getNCR: vi.fn(),
    getNCRHistory: vi.fn(),
    createNCR: vi.fn(),
    updateNCR: vi.fn(),
    deleteNCR: vi.fn(),
    transitionStatus: vi.fn(),
    startInvestigation: vi.fn(),
    startCorrectiveAction: vi.fn(),
    submitForVerification: vi.fn(),
    verifyAndClose: vi.fn(),
    closeNCR: vi.fn(),
    reopenNCR: vi.fn(),
  },
  inspections: {
    getInspections: vi.fn(),
    getInspection: vi.fn(),
    getChecklistItems: vi.fn(),
    createInspection: vi.fn(),
    updateInspection: vi.fn(),
    deleteInspection: vi.fn(),
    startInspection: vi.fn(),
    completeInspection: vi.fn(),
    cancelInspection: vi.fn(),
    updateChecklistItem: vi.fn(),
    batchUpdateChecklistItems: vi.fn(),
  },
  stats: {
    getProjectQCStats: vi.fn(),
    getNCRSummaryByStatus: vi.fn(),
    getNCRSummaryBySeverity: vi.fn(),
  },
}));

vi.mock('@/lib/api/services/quality-control', () => ({
  qualityControlApi: mockQualityControlApi,
}));

// Mock toast
const mockToast = vi.fn();
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));

// ============================================================================
// Test Data Factories
// ============================================================================

function createMockNCR(overrides?: Partial<NonConformanceReport>): NonConformanceReport {
  return {
    id: 'ncr-123',
    project_id: 'project-123',
    company_id: 'company-123',
    ncr_number: 1001,
    title: 'Test NCR',
    description: 'Test NCR description',
    category: NCRCategory.WORKMANSHIP,
    severity: NCRSeverity.MAJOR,
    ncr_type: NCRType.INTERNAL,
    location: 'Building A - Floor 2',
    spec_section: '03 30 00',
    drawing_reference: 'A-101',
    cost_code_id: 'cost-code-123',
    responsible_party_type: null,
    responsible_subcontractor_id: null,
    responsible_user_id: null,
    status: NCRStatus.OPEN,
    priority: 'high',
    root_cause_category: null,
    root_cause_description: null,
    five_whys_analysis: null,
    corrective_action: null,
    corrective_action_due_date: null,
    corrective_action_completed_date: null,
    corrective_action_by: null,
    preventive_action: null,
    preventive_action_implemented: false,
    verification_required: true,
    verification_method: null,
    verified_by: null,
    verified_at: null,
    verification_notes: null,
    cost_impact: false,
    cost_impact_amount: null,
    schedule_impact: false,
    schedule_impact_days: null,
    safety_impact: false,
    disposition: null,
    disposition_notes: null,
    disposition_approved_by: null,
    disposition_approved_at: null,
    photo_urls: [],
    document_urls: [],
    date_identified: new Date().toISOString(),
    date_closed: null,
    created_by: 'user-123',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
    ...overrides,
  };
}

function createMockNCRHistory(overrides?: Partial<NCRHistoryType>): NCRHistoryType {
  return {
    id: 'history-123',
    ncr_id: 'ncr-123',
    action: 'Status changed',
    previous_status: NCRStatus.OPEN,
    new_status: NCRStatus.UNDER_REVIEW,
    previous_values: null,
    new_values: null,
    notes: 'Started investigation',
    changed_by: 'user-123',
    changed_at: new Date().toISOString(),
    ...overrides,
  };
}

function createMockInspection(overrides?: Partial<QCInspection>): QCInspection {
  return {
    id: 'inspection-123',
    project_id: 'project-123',
    company_id: 'company-123',
    inspection_number: 501,
    title: 'Foundation Inspection',
    description: 'Pre-pour inspection of foundation',
    inspection_type: InspectionType.PRE_WORK,
    category: InspectionCategory.STRUCTURAL,
    location: 'Building A - Foundation',
    spec_section: '03 30 00',
    drawing_reference: 'S-101',
    cost_code_id: 'cost-code-123',
    daily_report_id: null,
    work_order_id: null,
    inspection_date: new Date().toISOString(),
    inspector_id: 'user-123',
    witness_required: false,
    witness_id: null,
    checklist_template_id: 'template-123',
    checklist_response_id: null,
    status: InspectionStatus.PENDING,
    pass_fail_items: null,
    overall_result: null,
    ncr_required: false,
    ncr_id: null,
    reinspection_required: false,
    reinspection_date: null,
    reinspection_id: null,
    inspector_signature: null,
    inspector_signed_at: null,
    witness_signature: null,
    witness_signed_at: null,
    notes: null,
    photo_urls: [],
    document_urls: [],
    created_by: 'user-123',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
    ...overrides,
  };
}

function createMockChecklistItem(overrides?: Partial<QCChecklistItem>): QCChecklistItem {
  return {
    id: 'item-123',
    inspection_id: 'inspection-123',
    item_number: 1,
    description: 'Check rebar spacing',
    spec_reference: '03 30 00.1',
    acceptance_criteria: 'Spacing within 1/4"',
    result: null,
    deviation_noted: false,
    deviation_description: null,
    required_value: '12"',
    actual_value: null,
    tolerance: '± 1/4"',
    within_tolerance: null,
    notes: null,
    photo_urls: [],
    sort_order: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

function createMockProjectQCStats(overrides?: Partial<ProjectQCStats>): ProjectQCStats {
  return {
    project_id: 'project-123',
    total_ncrs: 15,
    open_ncrs: 5,
    critical_ncrs: 2,
    closed_ncrs: 10,
    avg_days_to_close: 7.5,
    total_inspections: 25,
    completed_inspections: 20,
    passed_inspections: 18,
    failed_inspections: 2,
    inspection_pass_rate: 90,
    ...overrides,
  };
}

function createMockNCRSummaryByStatus(
  overrides?: Partial<NCRSummaryByStatus>
): NCRSummaryByStatus {
  return {
    project_id: 'project-123',
    status: NCRStatus.OPEN,
    count: 5,
    ...overrides,
  };
}

function createMockNCRSummaryBySeverity(
  overrides?: Partial<NCRSummaryBySeverity>
): NCRSummaryBySeverity {
  return {
    project_id: 'project-123',
    severity: NCRSeverity.MAJOR,
    count: 8,
    ...overrides,
  };
}

// ============================================================================
// Test Utilities
// ============================================================================

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

function createWrapper() {
  const queryClient = createTestQueryClient();

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

// ============================================================================
// NCR Query Hook Tests
// ============================================================================

describe('useNCRs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch NCRs with filters', async () => {
    const mockNCRs = [createMockNCR(), createMockNCR({ id: 'ncr-456' })];
    const filters: NCRFilters = { projectId: 'project-123' };

    mockQualityControlApi.ncr.getNCRs.mockResolvedValue(mockNCRs);

    const { result } = renderHook(() => useNCRs(filters), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockNCRs);
    expect(mockQualityControlApi.ncr.getNCRs).toHaveBeenCalledWith(filters);
  });

  it('should not fetch when projectId is missing', () => {
    const filters: NCRFilters = { projectId: '' };

    const { result } = renderHook(() => useNCRs(filters), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(false);
    expect(mockQualityControlApi.ncr.getNCRs).not.toHaveBeenCalled();
  });

  it('should filter by status', async () => {
    const mockNCRs = [createMockNCR({ status: NCRStatus.OPEN })];
    const filters: NCRFilters = {
      projectId: 'project-123',
      status: NCRStatus.OPEN,
    };

    mockQualityControlApi.ncr.getNCRs.mockResolvedValue(mockNCRs);

    const { result } = renderHook(() => useNCRs(filters), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockQualityControlApi.ncr.getNCRs).toHaveBeenCalledWith(filters);
  });

  it('should handle fetch error', async () => {
    const error = new Error('Failed to fetch NCRs');
    const filters: NCRFilters = { projectId: 'project-123' };

    mockQualityControlApi.ncr.getNCRs.mockRejectedValue(error);

    const { result } = renderHook(() => useNCRs(filters), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual(error);
  });
});

describe('useNCR', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch single NCR by id', async () => {
    const mockNCR = createMockNCR();

    mockQualityControlApi.ncr.getNCR.mockResolvedValue(mockNCR);

    const { result } = renderHook(() => useNCR('ncr-123'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockNCR);
    expect(mockQualityControlApi.ncr.getNCR).toHaveBeenCalledWith('ncr-123');
  });

  it('should not fetch when id is undefined', () => {
    const { result } = renderHook(() => useNCR(undefined), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(false);
    expect(mockQualityControlApi.ncr.getNCR).not.toHaveBeenCalled();
  });

  it('should handle error when NCR not found', async () => {
    const error = new Error('NCR not found');

    mockQualityControlApi.ncr.getNCR.mockRejectedValue(error);

    const { result } = renderHook(() => useNCR('non-existent'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual(error);
  });
});

describe('useNCRHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch NCR history', async () => {
    const mockHistory = [
      createMockNCRHistory(),
      createMockNCRHistory({
        id: 'history-456',
        previous_status: NCRStatus.UNDER_REVIEW,
        new_status: NCRStatus.CORRECTIVE_ACTION,
      }),
    ];

    mockQualityControlApi.ncr.getNCRHistory.mockResolvedValue(mockHistory);

    const { result } = renderHook(() => useNCRHistory('ncr-123'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockHistory);
    expect(mockQualityControlApi.ncr.getNCRHistory).toHaveBeenCalledWith('ncr-123');
  });

  it('should not fetch when ncrId is undefined', () => {
    const { result } = renderHook(() => useNCRHistory(undefined), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(false);
    expect(mockQualityControlApi.ncr.getNCRHistory).not.toHaveBeenCalled();
  });
});

// ============================================================================
// NCR CRUD Mutation Tests
// ============================================================================

describe('useCreateNCR', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create NCR', async () => {
    const dto: CreateNCRDTO = {
      project_id: 'project-123',
      company_id: 'company-123',
      title: 'New NCR',
      description: 'Test description',
      severity: NCRSeverity.MAJOR,
    };

    const mockNCR = createMockNCR(dto);
    mockQualityControlApi.ncr.createNCR.mockResolvedValue(mockNCR);

    const { result } = renderHook(() => useCreateNCR(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync(dto);

    expect(mockQualityControlApi.ncr.createNCR).toHaveBeenCalledWith(dto);
  });

  it('should show success toast after creation', async () => {
    const dto: CreateNCRDTO = {
      project_id: 'project-123',
      company_id: 'company-123',
      title: 'New NCR',
      severity: NCRSeverity.MAJOR,
    };

    const mockNCR = createMockNCR({ ...dto, ncr_number: 1001 });
    mockQualityControlApi.ncr.createNCR.mockResolvedValue(mockNCR);

    const { result } = renderHook(() => useCreateNCR(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync(dto);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'NCR created',
        description: 'NCR #1001 has been created.',
      });
    });
  });

  it('should invalidate queries after creation', async () => {
    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const dto: CreateNCRDTO = {
      project_id: 'project-123',
      company_id: 'company-123',
      title: 'New NCR',
      severity: NCRSeverity.MAJOR,
    };

    const mockNCR = createMockNCR(dto);
    mockQualityControlApi.ncr.createNCR.mockResolvedValue(mockNCR);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useCreateNCR(), { wrapper });

    await result.current.mutateAsync(dto);

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: qualityControlKeys.ncrLists() });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: qualityControlKeys.stats() });
    });
  });

  it('should show error toast on failure', async () => {
    const error = new Error('Failed to create NCR');
    mockQualityControlApi.ncr.createNCR.mockRejectedValue(error);

    const { result } = renderHook(() => useCreateNCR(), {
      wrapper: createWrapper(),
    });

    await expect(result.current.mutateAsync({} as CreateNCRDTO)).rejects.toThrow();

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Failed to create NCR',
        variant: 'destructive',
      });
    });
  });
});

describe('useUpdateNCR', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should update NCR', async () => {
    const dto: UpdateNCRDTO = {
      title: 'Updated NCR',
      description: 'Updated description',
    };

    const mockNCR = createMockNCR({ id: 'ncr-123', ...dto });
    mockQualityControlApi.ncr.updateNCR.mockResolvedValue(mockNCR);

    const { result } = renderHook(() => useUpdateNCR(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync({ id: 'ncr-123', dto });

    expect(mockQualityControlApi.ncr.updateNCR).toHaveBeenCalledWith('ncr-123', dto);
  });

  it('should invalidate queries after update', async () => {
    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const dto: UpdateNCRDTO = { title: 'Updated NCR' };
    const mockNCR = createMockNCR({ id: 'ncr-123', ...dto });
    mockQualityControlApi.ncr.updateNCR.mockResolvedValue(mockNCR);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useUpdateNCR(), { wrapper });

    await result.current.mutateAsync({ id: 'ncr-123', dto });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: qualityControlKeys.ncrLists() });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: qualityControlKeys.ncrDetail('ncr-123') });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: qualityControlKeys.stats() });
    });
  });
});

describe('useDeleteNCR', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should delete NCR', async () => {
    mockQualityControlApi.ncr.deleteNCR.mockResolvedValue(undefined);

    const { result } = renderHook(() => useDeleteNCR(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync('ncr-123');

    expect(mockQualityControlApi.ncr.deleteNCR).toHaveBeenCalledWith('ncr-123');
  });

  it('should show success toast after deletion', async () => {
    mockQualityControlApi.ncr.deleteNCR.mockResolvedValue(undefined);

    const { result } = renderHook(() => useDeleteNCR(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync('ncr-123');

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'NCR deleted',
        description: 'Non-conformance report has been deleted.',
      });
    });
  });
});

// ============================================================================
// NCR Workflow Mutation Tests
// ============================================================================

describe('useTransitionNCRStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should transition NCR status', async () => {
    const mockNCR = createMockNCR({ status: NCRStatus.UNDER_REVIEW });
    mockQualityControlApi.ncr.transitionStatus.mockResolvedValue(mockNCR);

    const { result } = renderHook(() => useTransitionNCRStatus(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync({
      id: 'ncr-123',
      status: NCRStatus.UNDER_REVIEW,
      notes: 'Starting investigation',
    });

    expect(mockQualityControlApi.ncr.transitionStatus).toHaveBeenCalledWith(
      'ncr-123',
      NCRStatus.UNDER_REVIEW,
      'Starting investigation'
    );
  });

  it('should show status change toast', async () => {
    const mockNCR = createMockNCR({ status: NCRStatus.UNDER_REVIEW });
    mockQualityControlApi.ncr.transitionStatus.mockResolvedValue(mockNCR);

    const { result } = renderHook(() => useTransitionNCRStatus(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync({
      id: 'ncr-123',
      status: NCRStatus.UNDER_REVIEW,
    });

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Status updated',
        description: 'NCR status changed to under review.',
      });
    });
  });
});

describe('useStartNCRInvestigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should start investigation', async () => {
    const mockNCR = createMockNCR({
      status: NCRStatus.UNDER_REVIEW,
      ncr_number: 1001,
    });
    mockQualityControlApi.ncr.startInvestigation.mockResolvedValue(mockNCR);

    const { result } = renderHook(() => useStartNCRInvestigation(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync('ncr-123');

    expect(mockQualityControlApi.ncr.startInvestigation).toHaveBeenCalledWith('ncr-123');
  });

  it('should show investigation started toast', async () => {
    const mockNCR = createMockNCR({ ncr_number: 1001 });
    mockQualityControlApi.ncr.startInvestigation.mockResolvedValue(mockNCR);

    const { result } = renderHook(() => useStartNCRInvestigation(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync('ncr-123');

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Investigation started',
        description: 'NCR #1001 is now under investigation.',
      });
    });
  });
});

describe('useStartCorrectiveAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should start corrective action', async () => {
    const mockNCR = createMockNCR({
      status: NCRStatus.CORRECTIVE_ACTION,
      ncr_number: 1001,
    });
    mockQualityControlApi.ncr.startCorrectiveAction.mockResolvedValue(mockNCR);

    const { result } = renderHook(() => useStartCorrectiveAction(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync({
      id: 'ncr-123',
      action: 'Rework concrete pour',
    });

    expect(mockQualityControlApi.ncr.startCorrectiveAction).toHaveBeenCalledWith(
      'ncr-123',
      'Rework concrete pour'
    );
  });
});

describe('useSubmitNCRForVerification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should submit NCR for verification', async () => {
    const mockNCR = createMockNCR({
      status: NCRStatus.VERIFICATION,
      ncr_number: 1001,
    });
    mockQualityControlApi.ncr.submitForVerification.mockResolvedValue(mockNCR);

    const { result } = renderHook(() => useSubmitNCRForVerification(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync('ncr-123');

    expect(mockQualityControlApi.ncr.submitForVerification).toHaveBeenCalledWith('ncr-123');
  });
});

describe('useVerifyNCR', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should verify and close NCR', async () => {
    const mockNCR = createMockNCR({
      status: NCRStatus.RESOLVED,
      ncr_number: 1001,
    });
    mockQualityControlApi.ncr.verifyAndClose.mockResolvedValue(mockNCR);

    const { result } = renderHook(() => useVerifyNCR(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync({
      id: 'ncr-123',
      notes: 'Verification complete',
    });

    expect(mockQualityControlApi.ncr.verifyAndClose).toHaveBeenCalledWith(
      'ncr-123',
      'Verification complete'
    );
  });
});

describe('useCloseNCR', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should close NCR', async () => {
    const mockNCR = createMockNCR({
      status: NCRStatus.CLOSED,
      ncr_number: 1001,
    });
    mockQualityControlApi.ncr.closeNCR.mockResolvedValue(mockNCR);

    const { result } = renderHook(() => useCloseNCR(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync({
      id: 'ncr-123',
      disposition: 'Use as is',
    });

    expect(mockQualityControlApi.ncr.closeNCR).toHaveBeenCalledWith('ncr-123', 'Use as is');
  });
});

describe('useReopenNCR', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should reopen NCR', async () => {
    const mockNCR = createMockNCR({
      status: NCRStatus.OPEN,
      ncr_number: 1001,
    });
    mockQualityControlApi.ncr.reopenNCR.mockResolvedValue(mockNCR);

    const { result } = renderHook(() => useReopenNCR(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync({
      id: 'ncr-123',
      reason: 'Issue found during final inspection',
    });

    expect(mockQualityControlApi.ncr.reopenNCR).toHaveBeenCalledWith(
      'ncr-123',
      'Issue found during final inspection'
    );
  });
});

// ============================================================================
// Inspection Query Hook Tests
// ============================================================================

describe('useInspections', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch inspections with filters', async () => {
    const mockInspections = [createMockInspection(), createMockInspection({ id: 'inspection-456' })];
    const filters: InspectionFilters = { projectId: 'project-123' };

    mockQualityControlApi.inspections.getInspections.mockResolvedValue(mockInspections);

    const { result } = renderHook(() => useInspections(filters), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockInspections);
    expect(mockQualityControlApi.inspections.getInspections).toHaveBeenCalledWith(filters);
  });

  it('should not fetch when projectId is missing', () => {
    const filters: InspectionFilters = { projectId: '' };

    const { result } = renderHook(() => useInspections(filters), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(false);
    expect(mockQualityControlApi.inspections.getInspections).not.toHaveBeenCalled();
  });
});

describe('useInspection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch single inspection by id', async () => {
    const mockInspection = createMockInspection();

    mockQualityControlApi.inspections.getInspection.mockResolvedValue(mockInspection);

    const { result } = renderHook(() => useInspection('inspection-123'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockInspection);
    expect(mockQualityControlApi.inspections.getInspection).toHaveBeenCalledWith('inspection-123');
  });

  it('should not fetch when id is undefined', () => {
    const { result } = renderHook(() => useInspection(undefined), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(false);
    expect(mockQualityControlApi.inspections.getInspection).not.toHaveBeenCalled();
  });
});

describe('useInspectionChecklistItems', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch checklist items for inspection', async () => {
    const mockItems = [
      createMockChecklistItem(),
      createMockChecklistItem({ id: 'item-456', item_number: 2 }),
    ];

    mockQualityControlApi.inspections.getChecklistItems.mockResolvedValue(mockItems);

    const { result } = renderHook(() => useInspectionChecklistItems('inspection-123'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockItems);
    expect(mockQualityControlApi.inspections.getChecklistItems).toHaveBeenCalledWith('inspection-123');
  });

  it('should not fetch when inspectionId is undefined', () => {
    const { result } = renderHook(() => useInspectionChecklistItems(undefined), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(false);
    expect(mockQualityControlApi.inspections.getChecklistItems).not.toHaveBeenCalled();
  });
});

// ============================================================================
// Inspection CRUD Mutation Tests
// ============================================================================

describe('useCreateInspection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create inspection', async () => {
    const dto: CreateInspectionDTO = {
      project_id: 'project-123',
      company_id: 'company-123',
      title: 'Foundation Inspection',
      inspection_type: InspectionType.PRE_WORK,
    };

    const mockInspection = createMockInspection(dto);
    mockQualityControlApi.inspections.createInspection.mockResolvedValue(mockInspection);

    const { result } = renderHook(() => useCreateInspection(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync(dto);

    expect(mockQualityControlApi.inspections.createInspection).toHaveBeenCalledWith(dto);
  });

  it('should show success toast after creation', async () => {
    const dto: CreateInspectionDTO = {
      project_id: 'project-123',
      company_id: 'company-123',
      title: 'Foundation Inspection',
      inspection_type: InspectionType.PRE_WORK,
    };

    const mockInspection = createMockInspection(dto);
    mockQualityControlApi.inspections.createInspection.mockResolvedValue(mockInspection);

    const { result } = renderHook(() => useCreateInspection(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync(dto);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Inspection created',
        description: 'Foundation Inspection has been scheduled.',
      });
    });
  });
});

describe('useUpdateInspection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should update inspection', async () => {
    const dto: UpdateInspectionDTO = {
      title: 'Updated Inspection',
      notes: 'Updated notes',
    };

    const mockInspection = createMockInspection({ id: 'inspection-123', ...dto });
    mockQualityControlApi.inspections.updateInspection.mockResolvedValue(mockInspection);

    const { result } = renderHook(() => useUpdateInspection(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync({ id: 'inspection-123', dto });

    expect(mockQualityControlApi.inspections.updateInspection).toHaveBeenCalledWith('inspection-123', dto);
  });
});

describe('useDeleteInspection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should delete inspection', async () => {
    mockQualityControlApi.inspections.deleteInspection.mockResolvedValue(undefined);

    const { result } = renderHook(() => useDeleteInspection(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync('inspection-123');

    expect(mockQualityControlApi.inspections.deleteInspection).toHaveBeenCalledWith('inspection-123');
  });
});

// ============================================================================
// Inspection Workflow Mutation Tests
// ============================================================================

describe('useStartInspection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should start inspection', async () => {
    const mockInspection = createMockInspection({
      status: InspectionStatus.IN_PROGRESS,
      title: 'Foundation Inspection',
    });
    mockQualityControlApi.inspections.startInspection.mockResolvedValue(mockInspection);

    const { result } = renderHook(() => useStartInspection(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync('inspection-123');

    expect(mockQualityControlApi.inspections.startInspection).toHaveBeenCalledWith('inspection-123');
  });

  it('should show inspection started toast', async () => {
    const mockInspection = createMockInspection({ title: 'Foundation Inspection' });
    mockQualityControlApi.inspections.startInspection.mockResolvedValue(mockInspection);

    const { result } = renderHook(() => useStartInspection(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync('inspection-123');

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Inspection started',
        description: 'Foundation Inspection is now in progress.',
      });
    });
  });
});

describe('useCompleteInspection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should complete inspection with pass result', async () => {
    const mockInspection = createMockInspection({
      overall_result: 'pass',
      title: 'Foundation Inspection',
    });
    mockQualityControlApi.inspections.completeInspection.mockResolvedValue(mockInspection);

    const { result } = renderHook(() => useCompleteInspection(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync({
      id: 'inspection-123',
      result: 'pass',
      notes: 'All items passed',
    });

    expect(mockQualityControlApi.inspections.completeInspection).toHaveBeenCalledWith(
      'inspection-123',
      'pass',
      'All items passed'
    );
  });

  it('should show success toast for passed inspection', async () => {
    const mockInspection = createMockInspection({
      overall_result: 'pass',
      title: 'Foundation Inspection',
    });
    mockQualityControlApi.inspections.completeInspection.mockResolvedValue(mockInspection);

    const { result } = renderHook(() => useCompleteInspection(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync({ id: 'inspection-123', result: 'pass' });

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Inspection completed',
        description: 'Foundation Inspection has passed.',
        variant: 'default',
      });
    });
  });

  it('should show destructive toast for failed inspection', async () => {
    const mockInspection = createMockInspection({
      overall_result: 'fail',
      title: 'Foundation Inspection',
    });
    mockQualityControlApi.inspections.completeInspection.mockResolvedValue(mockInspection);

    const { result } = renderHook(() => useCompleteInspection(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync({ id: 'inspection-123', result: 'fail' });

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Inspection completed',
        description: 'Foundation Inspection has failed.',
        variant: 'destructive',
      });
    });
  });
});

describe('useCancelInspection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should cancel inspection', async () => {
    const mockInspection = createMockInspection({
      status: InspectionStatus.CANCELLED,
      title: 'Foundation Inspection',
    });
    mockQualityControlApi.inspections.cancelInspection.mockResolvedValue(mockInspection);

    const { result } = renderHook(() => useCancelInspection(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync({
      id: 'inspection-123',
      reason: 'Weather delay',
    });

    expect(mockQualityControlApi.inspections.cancelInspection).toHaveBeenCalledWith(
      'inspection-123',
      'Weather delay'
    );
  });
});

// ============================================================================
// Checklist Item Mutation Tests
// ============================================================================

describe('useUpdateChecklistItem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should update checklist item', async () => {
    const mockItem = createMockChecklistItem({
      id: 'item-123',
      inspection_id: 'inspection-123',
      result: 'pass',
    });
    mockQualityControlApi.inspections.updateChecklistItem.mockResolvedValue(mockItem);

    const { result } = renderHook(() => useUpdateChecklistItem(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync({
      id: 'item-123',
      status: 'pass',
      notes: 'Meets criteria',
    });

    expect(mockQualityControlApi.inspections.updateChecklistItem).toHaveBeenCalledWith(
      'item-123',
      'pass',
      'Meets criteria'
    );
  });

  it('should invalidate checklist items query', async () => {
    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const mockItem = createMockChecklistItem({
      inspection_id: 'inspection-123',
    });
    mockQualityControlApi.inspections.updateChecklistItem.mockResolvedValue(mockItem);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useUpdateChecklistItem(), { wrapper });

    await result.current.mutateAsync({ id: 'item-123', status: 'pass' });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: qualityControlKeys.checklistItems('inspection-123'),
      });
    });
  });
});

describe('useBatchUpdateChecklistItems', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should batch update checklist items', async () => {
    const updates = [
      { id: 'item-1', status: 'pass' as const, notes: 'OK' },
      { id: 'item-2', status: 'fail' as const, notes: 'Issue found' },
    ];

    const mockItems = [
      createMockChecklistItem({ id: 'item-1', inspection_id: 'inspection-123' }),
      createMockChecklistItem({ id: 'item-2', inspection_id: 'inspection-123' }),
    ];

    mockQualityControlApi.inspections.batchUpdateChecklistItems.mockResolvedValue(mockItems);

    const { result } = renderHook(() => useBatchUpdateChecklistItems(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync(updates);

    expect(mockQualityControlApi.inspections.batchUpdateChecklistItems).toHaveBeenCalledWith(updates);
  });

  it('should show success toast after batch update', async () => {
    const mockItems = [
      createMockChecklistItem({ inspection_id: 'inspection-123' }),
      createMockChecklistItem({ inspection_id: 'inspection-123' }),
    ];

    mockQualityControlApi.inspections.batchUpdateChecklistItems.mockResolvedValue(mockItems);

    const { result } = renderHook(() => useBatchUpdateChecklistItems(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync([
      { id: 'item-1', status: 'pass' },
      { id: 'item-2', status: 'pass' },
    ]);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Checklist updated',
        description: '2 items have been updated.',
      });
    });
  });
});

// ============================================================================
// Statistics Hook Tests
// ============================================================================

describe('useProjectQCStats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch project QC stats', async () => {
    const mockStats = createMockProjectQCStats();

    mockQualityControlApi.stats.getProjectQCStats.mockResolvedValue(mockStats);

    const { result } = renderHook(() => useProjectQCStats('project-123'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockStats);
    expect(mockQualityControlApi.stats.getProjectQCStats).toHaveBeenCalledWith('project-123');
  });

  it('should not fetch when projectId is undefined', () => {
    const { result } = renderHook(() => useProjectQCStats(undefined), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(false);
    expect(mockQualityControlApi.stats.getProjectQCStats).not.toHaveBeenCalled();
  });

  it('should use 5 minute stale time', async () => {
    const mockStats = createMockProjectQCStats();

    mockQualityControlApi.stats.getProjectQCStats.mockResolvedValue(mockStats);

    const queryClient = createTestQueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useProjectQCStats('project-123'), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Second call should use cache
    const { result: result2 } = renderHook(() => useProjectQCStats('project-123'), {
      wrapper,
    });

    await waitFor(() => expect(result2.current.isSuccess).toBe(true));

    // Should only be called once due to cache
    expect(mockQualityControlApi.stats.getProjectQCStats).toHaveBeenCalledTimes(1);
  });
});

describe('useNCRSummaryByStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch NCR summary by status', async () => {
    const mockSummary = [
      createMockNCRSummaryByStatus({ status: NCRStatus.OPEN, count: 5 }),
      createMockNCRSummaryByStatus({ status: NCRStatus.CLOSED, count: 10 }),
    ];

    mockQualityControlApi.stats.getNCRSummaryByStatus.mockResolvedValue(mockSummary);

    const { result } = renderHook(() => useNCRSummaryByStatus('project-123'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockSummary);
    expect(mockQualityControlApi.stats.getNCRSummaryByStatus).toHaveBeenCalledWith('project-123');
  });

  it('should not fetch when projectId is undefined', () => {
    const { result } = renderHook(() => useNCRSummaryByStatus(undefined), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(false);
    expect(mockQualityControlApi.stats.getNCRSummaryByStatus).not.toHaveBeenCalled();
  });
});

describe('useNCRSummaryBySeverity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch NCR summary by severity', async () => {
    const mockSummary = [
      createMockNCRSummaryBySeverity({ severity: NCRSeverity.CRITICAL, count: 2 }),
      createMockNCRSummaryBySeverity({ severity: NCRSeverity.MAJOR, count: 8 }),
      createMockNCRSummaryBySeverity({ severity: NCRSeverity.MINOR, count: 5 }),
    ];

    mockQualityControlApi.stats.getNCRSummaryBySeverity.mockResolvedValue(mockSummary);

    const { result } = renderHook(() => useNCRSummaryBySeverity('project-123'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockSummary);
    expect(mockQualityControlApi.stats.getNCRSummaryBySeverity).toHaveBeenCalledWith('project-123');
  });

  it('should not fetch when projectId is undefined', () => {
    const { result } = renderHook(() => useNCRSummaryBySeverity(undefined), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(false);
    expect(mockQualityControlApi.stats.getNCRSummaryBySeverity).not.toHaveBeenCalled();
  });
});

// ============================================================================
// Query Keys Tests
// ============================================================================

describe('qualityControlKeys', () => {
  it('should generate correct NCR query keys', () => {
    const filters: NCRFilters = { projectId: 'project-123', status: NCRStatus.OPEN };

    expect(qualityControlKeys.all).toEqual(['quality-control']);
    expect(qualityControlKeys.ncrs()).toEqual(['quality-control', 'ncr']);
    expect(qualityControlKeys.ncrLists()).toEqual(['quality-control', 'ncr', 'list']);
    expect(qualityControlKeys.ncrList(filters)).toEqual([
      'quality-control',
      'ncr',
      'list',
      filters,
    ]);
    expect(qualityControlKeys.ncrDetail('ncr-123')).toEqual([
      'quality-control',
      'ncr',
      'detail',
      'ncr-123',
    ]);
    expect(qualityControlKeys.ncrHistory('ncr-123')).toEqual([
      'quality-control',
      'ncr',
      'history',
      'ncr-123',
    ]);
  });

  it('should generate correct inspection query keys', () => {
    const filters: InspectionFilters = { projectId: 'project-123' };

    expect(qualityControlKeys.inspections()).toEqual(['quality-control', 'inspection']);
    expect(qualityControlKeys.inspectionLists()).toEqual(['quality-control', 'inspection', 'list']);
    expect(qualityControlKeys.inspectionList(filters)).toEqual([
      'quality-control',
      'inspection',
      'list',
      filters,
    ]);
    expect(qualityControlKeys.inspectionDetail('inspection-123')).toEqual([
      'quality-control',
      'inspection',
      'detail',
      'inspection-123',
    ]);
    expect(qualityControlKeys.checklistItems('inspection-123')).toEqual([
      'quality-control',
      'inspection',
      'checklist',
      'inspection-123',
    ]);
  });

  it('should generate correct stats query keys', () => {
    expect(qualityControlKeys.stats()).toEqual(['quality-control', 'stats']);
    expect(qualityControlKeys.projectStats('project-123')).toEqual([
      'quality-control',
      'stats',
      'project',
      'project-123',
    ]);
    expect(qualityControlKeys.ncrSummaryByStatus('project-123')).toEqual([
      'quality-control',
      'stats',
      'ncr-status',
      'project-123',
    ]);
    expect(qualityControlKeys.ncrSummaryBySeverity('project-123')).toEqual([
      'quality-control',
      'stats',
      'ncr-severity',
      'project-123',
    ]);
  });
});
