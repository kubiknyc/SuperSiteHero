/**
 * Owner Invoice Hooks Tests
 * Comprehensive tests for useOwnerInvoices and related hooks
 *
 * Test Coverage:
 * - useOwnerInvoices: List fetching with filters
 * - useOwnerInvoice: Single invoice fetching
 * - useCreateOwnerInvoice: Mutation and cache invalidation
 * - useUpdateOwnerInvoice: Mutation and cache invalidation
 * - useDeleteOwnerInvoice: Mutation and cache invalidation
 * - useInvoiceLineItems: Line items fetching
 * - Cache invalidation patterns
 * - Query disabled states
 *
 * Total: 40+ test cases
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

// Import hooks to test
import {
  useOwnerInvoices,
  useOwnerInvoice,
  useProjectInvoices,
  useOwnerInvoiceWithDetails,
  useInvoiceLineItems,
  useInvoicePayments,
  useInvoiceStats,
  useInvoiceAgingReport,
  useCreateOwnerInvoice,
  useUpdateOwnerInvoice,
  useDeleteOwnerInvoice,
  useVoidOwnerInvoice,
  useSendOwnerInvoice,
  invoiceKeys,
} from '../useOwnerInvoices';

// Import test factories
import {
  createMockOwnerInvoice,
  createMockOwnerInvoices,
  createDraftInvoice,
  createSentInvoice,
  createOverdueInvoice,
  createPaidInvoice,
  createMockInvoiceWithDetails,
  createMockLineItem,
  createMockLineItems,
  createMockPayment,
  createMockPayments,
  createMockInvoiceStats,
  createEmptyInvoiceStats,
  createMockAgingReport,
  createMockDataResponse,
  createMockSingleResponse,
  createMockErrorResponse,
  TEST_INVOICES,
} from '@/__tests__/factories/ownerInvoice.factory';

import type {
  CreateOwnerInvoiceDTO,
  UpdateOwnerInvoiceDTO,
  OwnerInvoiceFilters,
} from '@/types/owner-invoice';

// ============================================================================
// Mocks
// ============================================================================

// Mock the ownerInvoicesApi service
const mockGetInvoices = vi.fn();
const mockGetInvoice = vi.fn();
const mockGetInvoiceWithDetails = vi.fn();
const mockCreateInvoice = vi.fn();
const mockUpdateInvoice = vi.fn();
const mockDeleteInvoice = vi.fn();
const mockVoidInvoice = vi.fn();
const mockSendInvoice = vi.fn();
const mockGetLineItems = vi.fn();
const mockGetPayments = vi.fn();
const mockGetInvoiceStats = vi.fn();
const mockGetAgingReport = vi.fn();

vi.mock('@/lib/api/services/owner-invoices', () => ({
  ownerInvoicesApi: {
    getInvoices: (...args: Parameters<typeof mockGetInvoices>) => mockGetInvoices(...args),
    getInvoice: (...args: Parameters<typeof mockGetInvoice>) => mockGetInvoice(...args),
    getInvoiceWithDetails: (...args: Parameters<typeof mockGetInvoiceWithDetails>) => mockGetInvoiceWithDetails(...args),
    createInvoice: (...args: Parameters<typeof mockCreateInvoice>) => mockCreateInvoice(...args),
    updateInvoice: (...args: Parameters<typeof mockUpdateInvoice>) => mockUpdateInvoice(...args),
    deleteInvoice: (...args: Parameters<typeof mockDeleteInvoice>) => mockDeleteInvoice(...args),
    voidInvoice: (...args: Parameters<typeof mockVoidInvoice>) => mockVoidInvoice(...args),
    sendInvoice: (...args: Parameters<typeof mockSendInvoice>) => mockSendInvoice(...args),
    getLineItems: (...args: Parameters<typeof mockGetLineItems>) => mockGetLineItems(...args),
    getPayments: (...args: Parameters<typeof mockGetPayments>) => mockGetPayments(...args),
    getInvoiceStats: (...args: Parameters<typeof mockGetInvoiceStats>) => mockGetInvoiceStats(...args),
    getAgingReport: (...args: Parameters<typeof mockGetAgingReport>) => mockGetAgingReport(...args),
  },
}));

// ============================================================================
// Test Setup
// ============================================================================

const createTestQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
    logger: {
      log: console.info,
      warn: console.warn,
      error: () => {},
    },
  });
};

interface WrapperProps {
  children: ReactNode;
}

const createWrapper = (queryClient: QueryClient) => {
  return function Wrapper({ children }: WrapperProps) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
};

// ============================================================================
// Tests
// ============================================================================

describe('Owner Invoice Hooks', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  // ==========================================================================
  // useOwnerInvoices Tests
  // ==========================================================================

  describe('useOwnerInvoices', () => {
    it('should return loading state initially', () => {
      mockGetInvoices.mockResolvedValue([]);

      const { result } = renderHook(() => useOwnerInvoices(), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeUndefined();
    });

    it('should fetch all invoices successfully', async () => {
      const mockInvoices = createMockOwnerInvoices(5);
      mockGetInvoices.mockResolvedValue(mockInvoices);

      const { result } = renderHook(() => useOwnerInvoices(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockInvoices);
      expect(mockGetInvoices).toHaveBeenCalledWith({});
    });

    it('should fetch invoices with filters', async () => {
      const mockInvoices = [createSentInvoice()];
      mockGetInvoices.mockResolvedValue(mockInvoices);

      const filters: OwnerInvoiceFilters = {
        projectId: 'project-123',
        status: 'sent',
      };

      const { result } = renderHook(() => useOwnerInvoices(filters), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockGetInvoices).toHaveBeenCalledWith(filters);
      expect(result.current.data).toEqual(mockInvoices);
    });

    it('should fetch invoices with multiple status filters', async () => {
      const mockInvoices = TEST_INVOICES.MIXED;
      mockGetInvoices.mockResolvedValue(mockInvoices);

      const filters: OwnerInvoiceFilters = {
        status: ['sent', 'overdue'],
      };

      const { result } = renderHook(() => useOwnerInvoices(filters), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockGetInvoices).toHaveBeenCalledWith(filters);
    });

    it('should fetch invoices with date range filters', async () => {
      const mockInvoices = createMockOwnerInvoices(3);
      mockGetInvoices.mockResolvedValue(mockInvoices);

      const filters: OwnerInvoiceFilters = {
        dateFrom: '2024-01-01',
        dateTo: '2024-12-31',
      };

      const { result } = renderHook(() => useOwnerInvoices(filters), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockGetInvoices).toHaveBeenCalledWith(filters);
    });

    it('should fetch invoices with search filter', async () => {
      const mockInvoices = [createMockOwnerInvoice({ invoiceNumber: 'INV-1234' })];
      mockGetInvoices.mockResolvedValue(mockInvoices);

      const filters: OwnerInvoiceFilters = {
        search: '1234',
      };

      const { result } = renderHook(() => useOwnerInvoices(filters), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockGetInvoices).toHaveBeenCalledWith(filters);
    });

    it('should handle empty invoice list', async () => {
      mockGetInvoices.mockResolvedValue([]);

      const { result } = renderHook(() => useOwnerInvoices(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([]);
    });

    it('should handle API errors', async () => {
      const error = new Error('Failed to fetch invoices');
      mockGetInvoices.mockRejectedValue(error);

      const { result } = renderHook(() => useOwnerInvoices(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(error);
    });

    it('should use correct query key structure', () => {
      const filters: OwnerInvoiceFilters = { projectId: 'project-123' };
      mockGetInvoices.mockResolvedValue([]);

      renderHook(() => useOwnerInvoices(filters), {
        wrapper: createWrapper(queryClient),
      });

      const queryState = queryClient.getQueryState(invoiceKeys.list(filters));
      expect(queryState).toBeDefined();
    });
  });

  // ==========================================================================
  // useProjectInvoices Tests
  // ==========================================================================

  describe('useProjectInvoices', () => {
    it('should fetch invoices for specific project', async () => {
      const projectId = 'project-123';
      const mockInvoices = createMockOwnerInvoices(3, { projectId });
      mockGetInvoices.mockResolvedValue(mockInvoices);

      const { result } = renderHook(() => useProjectInvoices(projectId), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockGetInvoices).toHaveBeenCalledWith({ projectId });
    });

    it('should not fetch when projectId is undefined', () => {
      const { result } = renderHook(() => useProjectInvoices(undefined), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current.fetchStatus).toBe('idle');
      expect(mockGetInvoices).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // useOwnerInvoice Tests
  // ==========================================================================

  describe('useOwnerInvoice', () => {
    it('should return loading state initially', () => {
      mockGetInvoice.mockResolvedValue(createMockOwnerInvoice());

      const { result } = renderHook(() => useOwnerInvoice('invoice-1'), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current.isLoading).toBe(true);
    });

    it('should fetch single invoice successfully', async () => {
      const mockInvoice = createMockOwnerInvoice({ id: 'invoice-123' });
      mockGetInvoice.mockResolvedValue(mockInvoice);

      const { result } = renderHook(() => useOwnerInvoice('invoice-123'), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockInvoice);
      expect(mockGetInvoice).toHaveBeenCalledWith('invoice-123');
    });

    it('should not fetch when id is undefined', () => {
      const { result } = renderHook(() => useOwnerInvoice(undefined), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current.fetchStatus).toBe('idle');
      expect(mockGetInvoice).not.toHaveBeenCalled();
    });

    it('should handle invoice not found', async () => {
      mockGetInvoice.mockResolvedValue(null);

      const { result } = renderHook(() => useOwnerInvoice('nonexistent'), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeNull();
    });

    it('should use correct query key', () => {
      const invoiceId = 'invoice-456';
      mockGetInvoice.mockResolvedValue(createMockOwnerInvoice());

      renderHook(() => useOwnerInvoice(invoiceId), {
        wrapper: createWrapper(queryClient),
      });

      const queryState = queryClient.getQueryState(invoiceKeys.detail(invoiceId));
      expect(queryState).toBeDefined();
    });
  });

  // ==========================================================================
  // useOwnerInvoiceWithDetails Tests
  // ==========================================================================

  describe('useOwnerInvoiceWithDetails', () => {
    it('should fetch invoice with all details', async () => {
      const mockInvoice = createMockInvoiceWithDetails({ id: 'invoice-123' });
      mockGetInvoiceWithDetails.mockResolvedValue(mockInvoice);

      const { result } = renderHook(() => useOwnerInvoiceWithDetails('invoice-123'), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockInvoice);
      expect(result.current.data?.lineItems).toBeDefined();
      expect(result.current.data?.payments).toBeDefined();
      expect(result.current.data?.project).toBeDefined();
    });

    it('should not fetch when id is undefined', () => {
      const { result } = renderHook(() => useOwnerInvoiceWithDetails(undefined), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current.fetchStatus).toBe('idle');
      expect(mockGetInvoiceWithDetails).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // useInvoiceLineItems Tests
  // ==========================================================================

  describe('useInvoiceLineItems', () => {
    it('should fetch line items for invoice', async () => {
      const invoiceId = 'invoice-123';
      const mockLineItems = createMockLineItems(5, { invoiceId });
      mockGetLineItems.mockResolvedValue(mockLineItems);

      const { result } = renderHook(() => useInvoiceLineItems(invoiceId), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockLineItems);
      expect(mockGetLineItems).toHaveBeenCalledWith(invoiceId);
    });

    it('should not fetch when invoiceId is undefined', () => {
      const { result } = renderHook(() => useInvoiceLineItems(undefined), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current.fetchStatus).toBe('idle');
      expect(mockGetLineItems).not.toHaveBeenCalled();
    });

    it('should use correct query key', () => {
      const invoiceId = 'invoice-789';
      mockGetLineItems.mockResolvedValue([]);

      renderHook(() => useInvoiceLineItems(invoiceId), {
        wrapper: createWrapper(queryClient),
      });

      const queryState = queryClient.getQueryState(invoiceKeys.lineItems(invoiceId));
      expect(queryState).toBeDefined();
    });
  });

  // ==========================================================================
  // useInvoicePayments Tests
  // ==========================================================================

  describe('useInvoicePayments', () => {
    it('should fetch payments for invoice', async () => {
      const invoiceId = 'invoice-123';
      const mockPayments = createMockPayments(3, { invoiceId });
      mockGetPayments.mockResolvedValue(mockPayments);

      const { result } = renderHook(() => useInvoicePayments(invoiceId), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockPayments);
      expect(mockGetPayments).toHaveBeenCalledWith(invoiceId);
    });

    it('should not fetch when invoiceId is undefined', () => {
      const { result } = renderHook(() => useInvoicePayments(undefined), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current.fetchStatus).toBe('idle');
      expect(mockGetPayments).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // useInvoiceStats Tests
  // ==========================================================================

  describe('useInvoiceStats', () => {
    it('should fetch invoice statistics', async () => {
      const mockStats = createMockInvoiceStats();
      mockGetInvoiceStats.mockResolvedValue(mockStats);

      const { result } = renderHook(() => useInvoiceStats(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockStats);
      expect(mockGetInvoiceStats).toHaveBeenCalledWith(undefined);
    });

    it('should fetch statistics for specific project', async () => {
      const projectId = 'project-123';
      const mockStats = createMockInvoiceStats();
      mockGetInvoiceStats.mockResolvedValue(mockStats);

      const { result } = renderHook(() => useInvoiceStats(projectId), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockGetInvoiceStats).toHaveBeenCalledWith(projectId);
    });

    it('should return empty stats when no invoices exist', async () => {
      const emptyStats = createEmptyInvoiceStats();
      mockGetInvoiceStats.mockResolvedValue(emptyStats);

      const { result } = renderHook(() => useInvoiceStats(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.draftCount).toBe(0);
      expect(result.current.data?.totalOutstanding).toBe(0);
    });
  });

  // ==========================================================================
  // useInvoiceAgingReport Tests
  // ==========================================================================

  describe('useInvoiceAgingReport', () => {
    it('should fetch aging report', async () => {
      const mockReport = createMockAgingReport();
      mockGetAgingReport.mockResolvedValue(mockReport);

      const { result } = renderHook(() => useInvoiceAgingReport(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockReport);
      expect(result.current.data?.items).toBeDefined();
      expect(result.current.data?.summary).toBeDefined();
    });

    it('should fetch aging report for specific project', async () => {
      const projectId = 'project-123';
      const mockReport = createMockAgingReport();
      mockGetAgingReport.mockResolvedValue(mockReport);

      const { result } = renderHook(() => useInvoiceAgingReport(projectId), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockGetAgingReport).toHaveBeenCalledWith(projectId);
    });
  });

  // ==========================================================================
  // useCreateOwnerInvoice Tests
  // ==========================================================================

  describe('useCreateOwnerInvoice', () => {
    it('should create invoice successfully', async () => {
      const newInvoice = createDraftInvoice({ id: 'new-invoice' });
      mockCreateInvoice.mockResolvedValue(newInvoice);

      const { result } = renderHook(() => useCreateOwnerInvoice(), {
        wrapper: createWrapper(queryClient),
      });

      const dto: CreateOwnerInvoiceDTO = {
        projectId: 'project-123',
        billToName: 'Test Client',
        billToCompany: 'Test Company',
      };

      result.current.mutate(dto);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockCreateInvoice).toHaveBeenCalledWith(dto);
      expect(result.current.data).toEqual(newInvoice);
    });

    it('should invalidate invoice lists after creation', async () => {
      const newInvoice = createDraftInvoice({ id: 'new-invoice' });
      mockCreateInvoice.mockResolvedValue(newInvoice);

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useCreateOwnerInvoice(), {
        wrapper: createWrapper(queryClient),
      });

      const dto: CreateOwnerInvoiceDTO = {
        projectId: 'project-123',
        billToName: 'Test Client',
      };

      result.current.mutate(dto);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: invoiceKeys.lists() });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: invoiceKeys.stats() });
    });

    it('should set query data for new invoice', async () => {
      const newInvoice = createDraftInvoice({ id: 'new-invoice-123' });
      mockCreateInvoice.mockResolvedValue(newInvoice);

      const setQueryDataSpy = vi.spyOn(queryClient, 'setQueryData');

      const { result } = renderHook(() => useCreateOwnerInvoice(), {
        wrapper: createWrapper(queryClient),
      });

      const dto: CreateOwnerInvoiceDTO = {
        projectId: 'project-123',
        billToName: 'Test Client',
      };

      result.current.mutate(dto);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(setQueryDataSpy).toHaveBeenCalledWith(
        invoiceKeys.detail(newInvoice.id),
        newInvoice
      );
    });

    it('should handle creation errors', async () => {
      const error = new Error('Failed to create invoice');
      mockCreateInvoice.mockRejectedValue(error);

      const { result } = renderHook(() => useCreateOwnerInvoice(), {
        wrapper: createWrapper(queryClient),
      });

      const dto: CreateOwnerInvoiceDTO = {
        projectId: 'project-123',
        billToName: 'Test Client',
      };

      result.current.mutate(dto);

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(error);
    });
  });

  // ==========================================================================
  // useUpdateOwnerInvoice Tests
  // ==========================================================================

  describe('useUpdateOwnerInvoice', () => {
    it('should update invoice successfully', async () => {
      const updatedInvoice = createSentInvoice({ id: 'invoice-123' });
      mockUpdateInvoice.mockResolvedValue(updatedInvoice);

      const { result } = renderHook(() => useUpdateOwnerInvoice(), {
        wrapper: createWrapper(queryClient),
      });

      const dto: UpdateOwnerInvoiceDTO = {
        billToName: 'Updated Client Name',
      };

      result.current.mutate({ id: 'invoice-123', dto });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockUpdateInvoice).toHaveBeenCalledWith('invoice-123', dto);
      expect(result.current.data).toEqual(updatedInvoice);
    });

    it('should invalidate queries after update', async () => {
      const updatedInvoice = createSentInvoice({ id: 'invoice-456' });
      mockUpdateInvoice.mockResolvedValue(updatedInvoice);

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useUpdateOwnerInvoice(), {
        wrapper: createWrapper(queryClient),
      });

      const dto: UpdateOwnerInvoiceDTO = {
        notes: 'Updated notes',
      };

      result.current.mutate({ id: 'invoice-456', dto });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: invoiceKeys.lists() });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: invoiceKeys.detail('invoice-456') });
    });

    it('should handle update errors', async () => {
      const error = new Error('Failed to update invoice');
      mockUpdateInvoice.mockRejectedValue(error);

      const { result } = renderHook(() => useUpdateOwnerInvoice(), {
        wrapper: createWrapper(queryClient),
      });

      result.current.mutate({ id: 'invoice-123', dto: {} });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(error);
    });
  });

  // ==========================================================================
  // useDeleteOwnerInvoice Tests
  // ==========================================================================

  describe('useDeleteOwnerInvoice', () => {
    it('should delete invoice successfully', async () => {
      mockDeleteInvoice.mockResolvedValue(undefined);

      const { result } = renderHook(() => useDeleteOwnerInvoice(), {
        wrapper: createWrapper(queryClient),
      });

      result.current.mutate('invoice-123');

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockDeleteInvoice).toHaveBeenCalledWith('invoice-123');
    });

    it('should invalidate queries after deletion', async () => {
      mockDeleteInvoice.mockResolvedValue(undefined);

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useDeleteOwnerInvoice(), {
        wrapper: createWrapper(queryClient),
      });

      result.current.mutate('invoice-456');

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: invoiceKeys.lists() });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: invoiceKeys.stats() });
    });

    it('should handle deletion errors', async () => {
      const error = new Error('Failed to delete invoice');
      mockDeleteInvoice.mockRejectedValue(error);

      const { result } = renderHook(() => useDeleteOwnerInvoice(), {
        wrapper: createWrapper(queryClient),
      });

      result.current.mutate('invoice-123');

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toEqual(error);
    });
  });

  // ==========================================================================
  // useVoidOwnerInvoice Tests
  // ==========================================================================

  describe('useVoidOwnerInvoice', () => {
    it('should void invoice successfully', async () => {
      const voidedInvoice = createMockOwnerInvoice({ id: 'invoice-123', status: 'void' });
      mockVoidInvoice.mockResolvedValue(voidedInvoice);

      const { result } = renderHook(() => useVoidOwnerInvoice(), {
        wrapper: createWrapper(queryClient),
      });

      result.current.mutate('invoice-123');

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockVoidInvoice).toHaveBeenCalledWith('invoice-123');
      expect(result.current.data?.status).toBe('void');
    });

    it('should invalidate queries after voiding', async () => {
      const voidedInvoice = createMockOwnerInvoice({ status: 'void' });
      mockVoidInvoice.mockResolvedValue(voidedInvoice);

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useVoidOwnerInvoice(), {
        wrapper: createWrapper(queryClient),
      });

      result.current.mutate('invoice-123');

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: invoiceKeys.lists() });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: invoiceKeys.stats() });
    });
  });

  // ==========================================================================
  // useSendOwnerInvoice Tests
  // ==========================================================================

  describe('useSendOwnerInvoice', () => {
    it('should send invoice successfully', async () => {
      const sentInvoice = createSentInvoice({ id: 'invoice-123' });
      mockSendInvoice.mockResolvedValue(sentInvoice);

      const { result } = renderHook(() => useSendOwnerInvoice(), {
        wrapper: createWrapper(queryClient),
      });

      result.current.mutate({ id: 'invoice-123', sentVia: 'email' });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockSendInvoice).toHaveBeenCalledWith('invoice-123', 'email');
      expect(result.current.data?.status).toBe('sent');
    });

    it('should send invoice without sentVia parameter', async () => {
      const sentInvoice = createSentInvoice({ id: 'invoice-456' });
      mockSendInvoice.mockResolvedValue(sentInvoice);

      const { result } = renderHook(() => useSendOwnerInvoice(), {
        wrapper: createWrapper(queryClient),
      });

      result.current.mutate({ id: 'invoice-456' });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockSendInvoice).toHaveBeenCalledWith('invoice-456', undefined);
    });

    it('should invalidate queries after sending', async () => {
      const sentInvoice = createSentInvoice();
      mockSendInvoice.mockResolvedValue(sentInvoice);

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useSendOwnerInvoice(), {
        wrapper: createWrapper(queryClient),
      });

      result.current.mutate({ id: 'invoice-789' });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: invoiceKeys.lists() });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: invoiceKeys.stats() });
    });
  });

  // ==========================================================================
  // Query Key Tests
  // ==========================================================================

  describe('invoiceKeys', () => {
    it('should generate correct query key for all invoices', () => {
      expect(invoiceKeys.all).toEqual(['owner-invoices']);
    });

    it('should generate correct query key for invoice lists', () => {
      expect(invoiceKeys.lists()).toEqual(['owner-invoices', 'list']);
    });

    it('should generate correct query key for filtered list', () => {
      const filters: OwnerInvoiceFilters = {
        projectId: 'project-123',
        status: 'sent',
      };
      expect(invoiceKeys.list(filters)).toEqual(['owner-invoices', 'list', filters]);
    });

    it('should generate correct query key for invoice details', () => {
      expect(invoiceKeys.detail('invoice-123')).toEqual(['owner-invoices', 'detail', 'invoice-123']);
    });

    it('should generate correct query key for line items', () => {
      expect(invoiceKeys.lineItems('invoice-456')).toEqual(['owner-invoices', 'lineItems', 'invoice-456']);
    });

    it('should generate correct query key for payments', () => {
      expect(invoiceKeys.payments('invoice-789')).toEqual(['owner-invoices', 'payments', 'invoice-789']);
    });

    it('should generate correct query key for stats', () => {
      expect(invoiceKeys.stats()).toEqual(['owner-invoices', 'stats', undefined]);
      expect(invoiceKeys.stats('project-123')).toEqual(['owner-invoices', 'stats', 'project-123']);
    });

    it('should generate correct query key for aging report', () => {
      expect(invoiceKeys.aging()).toEqual(['owner-invoices', 'aging', undefined]);
      expect(invoiceKeys.aging('project-456')).toEqual(['owner-invoices', 'aging', 'project-456']);
    });
  });
});
